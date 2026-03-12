import os
import re
import logging
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_chroma import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_classic.retrievers import EnsembleRetriever, BM25Retriever

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("rag_porduction_test.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# [환경 설정]
DOC_PATH = r"F:\2025_진행업무\정책서"
DB_PATH = "./csap_hybrid_db"

template = """너는 CSAP(클라우드 서비스 보안인증) 전문 분석관이야.
제공된 문서 내용을 바탕으로 질문에 대해 '실무적이고 구체적인' 답변을 작성해줘.

[지시사항]
1. 반드시 제공된 '문서 내용'에서만 정보를 추출할 것.
2. 조항 번호나 정확한 명칭이 언급되어 있다면 누락 없이 답변에 포함할 것.
3. 답변의 신뢰도를 위해 각 정보의 끝에 (파일명)을 기재할 것.
4. 만약 문서에 정보가 부족하다면 억지로 답변하지 말고 "제공된 문서에서 관련 내용을 찾을 수 없습니다."라고 말할 것.

[문서 내용]
{context}

[질문]
{question}

답변:"""

prompt = PromptTemplate(template=template, input_variables=["context", "question"])


def advanced_clean_text(text):
    """문서의 구조 기호들을 최대한 살리며 노이즈만 제거"""
    if not text:
        return ""
    # 불렛포인트(●, ■, -) 및 구조 기호 보존
    text = re.sub(r"[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ.,?!\(\)\[\]\:\-\*·○□■▶]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def main():
    embeddings = OllamaEmbeddings(model="bge-m3")

    # 1. 문서 로드 및 전처리
    all_docs = []
    if not os.path.exists(DOC_PATH):
        logger.error(f"❌ 경로 부재: {DOC_PATH}")
        return

    logger.info("📂 문서 로딩 및 전처리 시작...")
    for root, _, files in os.walk(DOC_PATH):
        for file in files:
            if file.endswith(".pdf") and not file.startswith("~$"):
                try:
                    loader = PyPDFLoader(os.path.join(root, file))
                    pages = loader.load()
                    for p in pages:
                        p.page_content = advanced_clean_text(p.page_content)
                        p.metadata["source"] = file
                    all_docs.extend(pages)
                except Exception as e:
                    logger.error(f"❌ {file} 로드 실패: {e}")

    if not all_docs:
        logger.error("❌ 로드된 문서가 없습니다.")
        return

    # 2. 정밀 청킹 (정책서 최적화 - 1500자)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500, chunk_overlap=300, separators=["\n\n", "\n", " ", ""]
    )
    splits = splitter.split_documents(all_docs)
    logger.info(f"📦 분할 완료: {len(splits)}개 조각")

    # 3. 하이브리드 리트리버 구성
    # A. 벡터 리트리버 (Chroma)
    vectorstore = Chroma.from_documents(
        documents=splits, embedding=embeddings, persist_directory=DB_PATH
    )
    vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    # B. 키워드 리트리버 (BM25) - 정확한 조항 번호/단어 매칭
    bm25_retriever = BM25Retriever.from_documents(splits)
    bm25_retriever.k = 5

    # C. 앙상블 리트리버 (Vector 60% + BM25 40% 가중치 결합)
    ensemble_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, vector_retriever], weights=[0.4, 0.6]
    )

    # 4. 질의응답 엔진 (EXAONE 3.5 적용)
    llm = ChatOllama(model="exaone3.5:7.8b", temperature=0)
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=ensemble_retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True,
    )

    print("\n" + "=" * 50)
    print("🛡️  AEGIS 하이브리드 지능형 정책 비서 가동")
    print("   (키워드 정밀 매칭 + 의미 기반 검색 통합 버전)")
    print("=" * 50)

    while True:
        q = input("\n질문 > ").strip()
        if not q or q.lower() in ["exit", "quit"]:
            break

        try:
            logger.info(f"🔍 하이브리드 분석 중: {q}")
            res = qa_chain.invoke({"query": q})

            print(f"\n[AI 상세 답변]:\n{res['result']}")

            print("\n[참조된 원본 조각 상위 3개]")
            for i, doc in enumerate(res["source_documents"][:3], 1):
                print(f"{i}. [{doc.metadata['source']}] {doc.page_content[:150]}...")

        except Exception as e:
            print(f"❌ 오류 발생: {e}")


if __name__ == "__main__":
    main()
