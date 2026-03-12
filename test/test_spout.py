import SpoutGL
import time


def run_test():
    print("\n" + "=" * 50)
    print("  Spout2 Connection Diagnostic Tool")
    print("=" * 50)

    # 1. 수신기 초기화
    try:
        receiver = SpoutGL.SpoutReceiver()
        print("[SUCCESS] SpoutGL 라이브러리 로드 성공")
    except Exception as e:
        print(f"[FAIL] SpoutGL 초기화 실패: {e}")
        return

    # 2. 시스템의 모든 소스 검색
    print("\n[*] 시스템에서 발견된 Spout 소스 목록:")
    found_vts = False
    # getSenderName 등의 메서드는 loop를 통해 확인해야 함
    for i in range(10):
        try:
            name = receiver.getSenderName(i)
            if name:
                print(f"  - {name}")
                if "VTube" in name or "VTS" in name:
                    found_vts = True
            else:
                if i == 0:
                    print(
                        "  (발견된 소스가 없습니다. VTube Studio의 Spout 출력을 켜주세요.)"
                    )
                break
        except:
            break

    # 3. VTubeStudioSpout 시범 연결
    target = "VTubeStudioSpout"
    print(f"\n[*] '{target}' 연결 테스트 시작...")
    receiver.setReceiverName(target)

    # 잠시 대기 (데이터 수신 시간을 벌어줍니다)
    time.sleep(1)

    width = receiver.getSenderWidth()
    height = receiver.getSenderHeight()
    connected = receiver.isConnected()

    if width > 0:
        print(f"[SUCCESS] 연결 성공!")
        print(f"  - 해상도: {width}x{height}")
        print(
            f"  - 상태: {'Connected' if connected else 'Not Connected (but data found)'}"
        )
    else:
        print(f"[FAIL] 연결 실패. 소스 '{target}'를 찾을 수 없거나 데이터가 없습니다.")
        print("  - VTube Studio 설정에서 'Spout2 활성화'가 켜져 있는지 확인하세요.")

    print("\n" + "=" * 50 + "\n")


if __name__ == "__main__":
    run_test()
