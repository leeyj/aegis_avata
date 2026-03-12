# -*- coding: utf-8 -*-
import sys
from types import ModuleType

# 1. 가짜 MeCab 모듈 생성 및 등록
class FakeMeCab:
    def Tagger(self, *args):
        return self
    def parse(self, text):
        return ""

fake_mecab_module = ModuleType("MeCab")
sys.modules["MeCab"] = fake_mecab_module
fake_mecab_module.Tagger = lambda *args: FakeMeCab()

import MeCab

# 2. 필수 함수 정의 (다른 모듈에서 호출하는 이름들)
def g2p(text, **kwargs):
    # 일본어 변환 요청 시 빈 결과 반환
    return [], [], []

def distribute_phone(phones, tones, word2ph):
    return []

# 3. 하단에 남아있을지 모를 호출부 방어 (더미 클래스/변수)
class Dummy:
    def from_pretrained(self, *args, **kwargs):
        return self
    def __call__(self, *args, **kwargs):
        return {}

AutoTokenizer = Dummy()
model_id = ""
tokenizer = Dummy()
_TAGGER = MeCab.Tagger()