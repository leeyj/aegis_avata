import os
import re
import logging
import olefile
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_chroma import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader,
    TextLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("rag_processing.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# [환경 설정]
# AEGIS 통합 시 settings.json에서 가져오도록 확장 예정
DOC_PATH = r"F:\2025_진행업무\정책서"
DB_PATH = "./csap_rag_db"

# [개선된 프롬프트] - 지시사항 명확화 및 근거 강조
template = """너는 CSAP(클라우드 서비스 보안인증) 사후평가 증적 자료를 전문적으로 분석하는 AI 비서야.
제공된 문서 내용을 바탕으로 질문에 정확하게 답변해줘.

[규칙]
1. 답변은 반드시 제공된 '문서 내용'에 근거할 것. (모르는 내용은 모른다고 답변)
2. 각 문장 끝에는 해당 내용이 포함된 (파일명)을 명시할 것.
3. 관련 법령이나 조항 번호(예: 1.1.2)가 있다면 반드시 포함할 것.
4. 마지막에 '참조 문서' 섹션을 만들어 파일명들을 리스트로 출력할 것.

[문서 내용]
{context}

[질문]
{question}

답변:"""

prompt = PromptTemplate(template=template, input_variables=["context", "question"])


def clean_text(text):
    """
    [개선] 문장 구조를 파괴하지 않도록 정제 규칙 완화
    - 정책서의 핵심인 불렛포인트, 번호, 절 구분을 보존함
    """
    if not text:
        return ""
    # 1. 출력 가능한 문자 + 주요 문장 부호 보존
    # 보존 대상: 한글, 영문, 숫자, 주요 부호(- : . * / ( ) [ ] ,)
    cleaned = re.sub(r"[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s\-\:\.\*\/\(\)\[\]\,]", " ", text)
    # 2. 과도한 공백 및 줄바꿈 압축
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def extract_hwp_text(file_path):
    """HWP PrvText 추출 (임시 방식, 향후 hwp5r 등으로 업그레이드 권장)"""
    try:
        with olefile.OleFileIO(file_path) as f:
            if "PrvText" in f.listdir():
                return f.openstream("PrvText").read().decode("utf-16")
    except Exception as e:
        logger.warning(f"⚠️ HWP 파싱 실패 ({os.path.basename(file_path)}): {e}")
        return ""
    return ""


def load_document(file_path):
    ext = os.path.splitext(file_path)[-1].lower()
    fname = os.path.basename(file_path)
    if fname.startswith("._") or fname.startswith("~$"):
        return []

    try:
        if ext == ".pdf":
            data = PyPDFLoader(file_path).load()
        elif ext == ".docx":
            data = UnstructuredWordDocumentLoader(file_path).load()
        elif ext == ".pptx":
            data = UnstructuredPowerPointLoader(file_path).load()
        elif ext == ".hwp":
            text = extract_hwp_text(file_path)
            if not text:
                return []
            data = [Document(page_content=text, metadata={"source": fname})]
        elif ext == ".txt":
            data = TextLoader(file_path, encoding="utf-8").load()
        else:
            return []

        if data:
            for d in data:
                d.page_content = clean_text(d.page_content)
                d.metadata["source"] = fname
                d.metadata["full_path"] = file_path  # 추후 옵시디언 Deep Link 연동용
            return data
    except Exception as e:
        logger.error(f"❌ [로드실패] {fname}: {e}")
    return []


def main():
    # [개선] 성능이 검증된 bge-m3 임베딩 사용
    embeddings = OllamaEmbeddings(model="bge-m3")

    # DB 초기화 및 로드
    vectorstore = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
    try:
        res = vectorstore.get()
        existing_files = (
            {m["source"] for m in res["metadatas"]} if res["metadatas"] else set()
        )
        logger.info(f"💾 기존 DB 로드됨. 인덱싱된 파일 수: {len(existing_files)}")
    except:
        existing_files = set()
        logger.info("🆕 새로운 벡터 DB를 생성합니다.")

    # 문서 스캔 및 인덱싱
    new_docs = []
    if not os.path.exists(DOC_PATH):
        logger.error(f"❌ 문서 경로를 찾을 수 없습니다: {DOC_PATH}")
        return

    for root, _, files in os.walk(DOC_PATH):
        for file in files:
            if file in existing_files or file.startswith("~$"):
                continue
            path = os.path.join(root, file)
            docs = load_document(path)
            if docs:
                new_docs.extend(docs)
                logger.info(f"📄 새 문서 로드 완료: {file}")

    if new_docs:
        # [개선] 청크 사이즈 확장을 통한 문맥 보존 (500 -> 1200)
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200, chunk_overlap=200, add_start_index=True
        )
        splits = splitter.split_documents(new_docs)
        logger.info(f"📦 총 {len(splits)}개 데이터 조각(Chunks)으로 분할되었습니다.")

        # 배치 처리 (안정성)
        batch_size = 10
        for i in range(0, len(splits), batch_size):
            batch = splits[i : i + batch_size]
            try:
                vectorstore.add_documents(batch)
                logger.info(f"✅ 배치 처리 중... ({i + len(batch)}/{len(splits)})")
            except Exception as e:
                logger.error(f"⚠️ 배치 처리 에러 발생. 일부 조각을 건너뜁니다: {e}")

    # 질의응답 (RAG)
    # [개선] 답변 능력이 뛰어난 EXAONE 3.5 모델 활용
    llm = ChatOllama(model="exaone3.5:7.8b", temperature=0)

    # [개선] Retriever 설정 최적화 (k=7, 점수 기반 필터링 고려 가능)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 7})

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True,
    )

    print("\n" + "=" * 50)
    print("🛡️  AEGIS CSAP 지능형 정책 비서 가동")
    print("=" * 50)
    print("💬 질문을 입력하세요 (exit 종료)")

    while True:
        q = input("\n질문 > ").strip()
        if not q or q.lower() in ["exit", "quit"]:
            break

        try:
            logger.info(f"🔍 질의 분석 중: {q}")
            res = qa_chain.invoke({"query": q})

            print(f"\n[AI 상세 답변]:\n{res['result']}")

            # 참조 문서 확인용 별도 출력
            # print("\n[참조 소스 정보]")
            # for doc in res['source_documents'][:3]:
            #     print(f"- {doc.metadata['source']} (Page: {doc.metadata.get('page', 'N/A')})")

        except Exception as e:
            print(f"❌ 질문 처리 중 오류 발생: {e}")


if __name__ == "__main__":
    main()
