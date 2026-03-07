import os
from PIL import Image, ImageDraw, ImageFont
import datetime
import logging

logger = logging.getLogger(__name__)


class Visualizer:
    """
    AEGIS Visual Synthesis Engine
    데이터와 아바타 이미지를 합성하여 Glassmorphism 테마의 리포트 카드를 생성합니다.
    """

    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.avatar_dir = os.path.join(self.base_dir, "assets", "avatars")
        self.report_dir = os.path.join(self.base_dir, "assets", "reports")
        self.font_path = "C:\\Windows\\Fonts\\malgunbd.ttf"  # Malgun Gothic Bold

        # 캔버스 설정 (16:9 비율)
        self.width = 1200
        self.height = 675
        self.bg_color = (10, 10, 20, 255)  # Deep Dark Blue

    def create_report_card(
        self, title: str, content: str, emotion: str = "neutral"
    ) -> str:
        """
        리포트 이미지를 생성하고 파일 경로를 반환합니다.
        """
        try:
            # 1. 배경 생성
            img = Image.new("RGBA", (self.width, self.height), self.bg_color)
            draw = ImageDraw.Draw(img)

            # 은은한 포인트 조명 효과
            draw.ellipse([800, -100, 1300, 400], fill=(50, 50, 120, 50))

            # 2. 아바타 합성
            avatar_path = os.path.join(self.avatar_dir, f"{emotion}.png")
            if not os.path.exists(avatar_path):
                avatar_path = os.path.join(self.avatar_dir, "neutral.png")

            if os.path.exists(avatar_path):
                avatar = Image.open(avatar_path).convert("RGBA")

                # [NEW] 배경 투명화 처리
                # Midnight Blue 배경(#0A0A14)을 감지하여 알파 채널로 변환
                datas = avatar.getdata()
                new_data = []
                for item in datas:
                    # R < 20, G < 20, B < 35 정도의 어두운 색상은 배경으로 간주
                    if item[0] < 20 and item[1] < 20 and item[2] < 35:
                        new_data.append((0, 0, 0, 0))  # 완전 투명
                    else:
                        new_data.append(item)
                avatar.putdata(new_data)

                ratio = 580 / avatar.height
                avatar = avatar.resize(
                    (int(avatar.width * ratio), 580), Image.Resampling.LANCZOS
                )

                # 아바타 뒤에 은은한 글로우 효과 (격자무늬 보충용 다크 박스 제거)
                draw.ellipse([700, 150, 1100, 550], fill=(100, 100, 255, 30))

                img.alpha_composite(avatar, (620, 80))

            # 3. Glassmorphism 카드 베이스
            card_x, card_y = 50, 50
            card_w, card_h = 750, 575

            # 카드 그림자
            for i in range(3):
                draw.rounded_rectangle(
                    [card_x - i, card_y - i, card_x + card_w + i, card_y + card_h + i],
                    radius=25,
                    outline=(255, 255, 255, 10 - i * 3),
                )
            # 카드 바디 (더 불투명하게 조정하여 가독성 확보)
            draw.rounded_rectangle(
                [card_x, card_y, card_x + card_w, card_y + card_h],
                radius=25,
                fill=(30, 30, 45, 210),
                outline=(100, 100, 255, 120),
                width=2,
            )

            # 4. 텍스트 렌더링
            try:
                title_font = ImageFont.truetype(self.font_path, 50)
                body_font = ImageFont.truetype(self.font_path, 34)
                meta_font = ImageFont.truetype(self.font_path, 20)
            except Exception as e:
                logger.warning(f"Font load error: {e}")
                title_font = ImageFont.load_default()
                body_font = ImageFont.load_default()
                meta_font = ImageFont.load_default()

            # 제목 (쉐도우 + 메인)
            draw.text((102, 102), title, font=title_font, fill=(0, 0, 0, 150))
            draw.text((100, 100), title, font=title_font, fill=(160, 180, 255, 255))

            # 본문
            lines = content.split("\n")
            y_text = 200
            for line in lines:
                draw.text(
                    (101, y_text + 1), line, font=body_font, fill=(0, 0, 0, 120)
                )  # 쉐도우
                draw.text(
                    (100, y_text), line, font=body_font, fill=(240, 240, 255, 255)
                )
                y_text += 50

            # 하단 정보
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            draw.text(
                (100, 570),
                f"SIGNAL STATUS: OPTIMAL | {now_str}",
                font=meta_font,
                fill=(0, 255, 150, 180),
            )

            # 5. 저장
            filename = f"report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            output_path = os.path.join(self.report_dir, filename)
            img.save(output_path)

            return output_path

        except Exception as e:
            logger.error(f"Visualizer Error: {e}")
            return ""


visualizer = Visualizer()
