#!/bin/bash

echo "[AEGIS] Starting Core Security Compilation (Linux/Render)..."

# 1. 필수 라이브러리 체크
if ! python3 -c "import Cython" &> /dev/null; then
    echo "[INFO] Cython is not installed. Installing now..."
    pip install Cython
fi

# 2. 기존 바이너리 및 임시 파일 정리
echo "[AEGIS] Cleaning old binaries and build artifacts..."
rm -rf build
find . -name "*.so" -delete
find . -name "*.c" -delete

# 3. 컴파일 실행
echo "[AEGIS] Compiling extended core modules to .so..."
python3 setup_security.py build_ext --inplace

if [ $? -ne 0 ]; then
    echo "[ERROR] Compilation failed!"
    exit 1
fi

echo ""
echo "[AEGIS] Compilation Successful!"
echo "[List of generated binaries:]"
find . -name "*.so"

echo ""
echo "[AEGIS] Testing core binary integrity..."
# core_security 로딩 테스트
python3 -c "from core_security import get_salt; print('✅ Core Security Salt Check:', get_salt())"
if [ $? -ne 0 ]; then
    echo "[ERROR] core_security binary loading failed!"
    exit 1
fi

echo ""
echo "[AEGIS] All binary validations passed."
echo "[COMPLETED] All processes are finished."
