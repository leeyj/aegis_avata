import os
import re
import logging
import json
from datetime import datetime

# LangChain 관련 임포트
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_chroma import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_classic.retrievers import EnsembleRetriever, BM25Retriever

# [경로 설정 - 모든 데이터는 test/RAG/ 내부에서 관리]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# ⛔ 주의: DOC_PATH는 실제 문서가 있는 절대 경로를 사용해야 함
DOC_PATH = r"F:\2025_진행업무\정책서"
DB_PATH = os.path.join(BASE_DIR, "v3_hybrid_db")
LOG_PATH = os.path.join(BASE_DIR, "rag_v3_analysis.log")

# 로그 설정 (test/RAG 내부에 생성)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_PATH, encoding="utf-8"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# [CSAP 최적화 프롬프트]
# NotebookLM처럼 풍부한 맥락과 수치를 추출하도록 유도
template = """너는 대한민국 CSAP(클라우드 서비스 보안인증) 평가 및 정책 분석 전문가야.
질문에 대해 아래 제공된 '문서 내용'을 바탕으로 **매우 상세하고 정확하게** 답변해줘.

[답변 가이드라인]
1. **정량적 데이터 강조**: 보관 기간(예: 1년), 암호화 알고리즘(예: AES256), 주기(예: 매월 1회) 등 문서에 포함된 모든 수치와 기술적 사양을 빠짐없이 언급할 것.
2. **단계별 절차화**: 프로세스에 대한 질문인 경우 1단계, 2단계 등 순서대로 정리하여 답변할 것.
3. **근거 명시**: 각 정보가 포함된 파일명을 문장 끝에 (파일명) 형태로 적을 것.
4. **맥락 유지**: 질문과 관련된 직접적인 답변뿐만 아니라, 해당 정책의 목적이나 전제 조건이 문서에 있다면 함께 설명할 것.
5. **무결성**: 문서에 없는 내용을 추측해서 쓰지 말 것.

[문서 내용]
{context}

[질문]
{question}

답변:"""

prompt = PromptTemplate(template=template, input_variables=["context", "question"])


def clean_text_v3(text):
    """표(Table) 구조와 수치를 보존하기 위한 정밀 정제"""
    if not text:
        return ""
    # 유니코드 깨짐 등 제어 문자만 제거, 구조 기호(#, -, *, :, .) 및 수치는 철저히 보존
    text = "".join(ch for ch in text if ch.isprintable())
    # 과도한 공백은 하나로 줄이되, 문단 구분은 유지
    text = re.sub(r"  +", " ", text)
    return text.strip()


def main():
    logger.info("🚀 RAG v3 (Hybrid Context) 가동 시작")

    embeddings = OllamaEmbeddings(model="bge-m3")

    # 1. 문서 로드 (PDF 기반)
    all_docs = []
    if not os.path.exists(DOC_PATH):
        logger.error(f"❌ 문서 경로(DOC_PATH)를 찾을 수 없습니다: {DOC_PATH}")
        return

    logger.info(f"📂 '{DOC_PATH}'에서 PDF 스캔 중...")
    for root, _, files in os.walk(DOC_PATH):
        for file in files:
            if file.lower().endswith(".pdf") and not file.startswith("~$"):
                try:
                    loader = PyPDFLoader(os.path.join(root, file))
                    pages = loader.load()
                    for p in pages:
                        p.page_content = clean_text_v3(p.page_content)
                        p.metadata["source"] = file
                    all_docs.extend(pages)
                except Exception as e:
                    logger.error(f"❌ {file} 로드 실패: {e}")

    if not all_docs:
        logger.error("❌ 로드된 문서가 없습니다. 종료합니다.")
        return

    # 2. 하이브리드 전략을 위한 다중 청킹
    # - Vector용: 작은 단위로 정밀하게 (800 / 100)
    # - Context용: 큰 단위로 맥락 파악 (2000 / 400) -> 이번엔 하이브리드 효과를 위해 1500으로 단일화
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500, chunk_overlap=300, separators=["\n\n", "\n", ".", " ", ""]
    )
    splits = splitter.split_documents(all_docs)
    logger.info(f"📦 총 {len(splits)}개의 지식 블록이 생성되었습니다.")

    # 3. 하이브리드 리트리버 구축 (Vector + BM25)
    # ⛔ 먄약 rank_bm25가 설치되지 않았다면 이 부분에서 에러가 발생할 수 있습니다.
    logger.info("🧠 벡터 및 키워드 인덱싱 중 (Hybrid Engine)...")

    # A. Vector Store (Chroma)
    # ⛔ DB_PATH도 test/RAG/ 내부임
    vectorstore = Chroma.from_documents(
        documents=splits, embedding=embeddings, persist_directory=DB_PATH
    )
    vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    # B. BM25 (Exact Keyword Match)
    try:
        bm25_retriever = BM25Retriever.from_documents(splits)
        bm25_retriever.k = 5
        logger.info("✅ BM25 리트리버 생성 완료")
    except ImportError:
        logger.error("❌ rank_bm25가 설치되지 않았습니다. 벡터 전용으로 동작합니다.")
        bm25_retriever = None

    # C. 앙상블 결합
    if bm25_retriever:
        retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, vector_retriever],
            weights=[0.3, 0.7],  # 벡터 의미 검색에 조금 더 가중치
        )
    else:
        retriever = vector_retriever

    # 4. 질의응답 (EXAONE 3.5 적용)
    llm = ChatOllama(model="exaone3.5:7.8b", temperature=0)
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True,
    )

    print("\n" + "=" * 60)
    print("🛡️  AEGIS v3: CSAP 하이브리드 지식 통찰 엔진 (NotebookLM 급 지향)")
    print(f"📍 데이터 저장: {DB_PATH}")
    print("=" * 60)

    while True:
        q = input("\n질문 > ").strip()
        if not q or q.lower() in ["exit", "quit"]:
            break

        try:
            start_time = datetime.now()
            logger.info(f"🔍 질의 실행: {q}")

            res = qa_chain.invoke({"query": q})

            print(f"\n[AI 통찰 답변]:\n{res['result']}")

            # 참조 문서 시각화 개선
            print("\n[근거 문서 조각]")
            sources = set()
            for doc in res["source_documents"]:
                sources.add(doc.metadata["source"])
            for s in list(sources)[:5]:
                print(f"- {s}")

            end_time = datetime.now()
            logger.info(f"✨ 처리 완료 (소요시간: {end_time - start_time})")

        except Exception as e:
            print(f"❌ 분석 중 오류 발생: {e}")
            logger.exception("분석 오류 상세:")


if __name__ == "__main__":
    main()
