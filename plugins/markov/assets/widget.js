/**
 * Markov Chain "아무말 대잔치" 플러그인
 */
console.log("%c[Markov Plugin] Script Loaded and Evaluated!", "color: #00ff00; font-weight: bold;");
export default {
    init: async function (root, context) {
        console.log("%c[Markov Plugin] Initializing with root and context...", "color: #ff00ff; font-weight: bold;");
        console.log("[Markov Plugin] Context:", context);
        console.log("[Markov Plugin] Root:", root);

        // --- 1. 가짜 코퍼스 (아무말 대잔치용 Seed 데이터) ---
        // 인터넷 밈, 명언, 일상어 등을 섞어 둔 베이스 문장들
        const corpus = [
            "오늘 날씨는 라면 먹기에 딱 좋은 날씨입니다.",
            "코딩을 하다가 버그를 잡았더니 내 멘탈도 잡혔다.",
            "서버가 죽었습니다. 하지만 괜찮아요, 제 컴퓨터가 아니니까요.",
            "밤에 먹는 치킨은 0칼로리라는 학계의 정설이 있습니다.",
            "깃허브 잔디를 심다가 허리가 나갔습니다.",
            "이 코드는 왜 돌아가는지 묻지 마세요. 저도 모릅니다.",
            "커피는 생명수입니다. 커피가 없으면 코딩을 할 수 없어요.",
            "오늘은 월급날이 기가 막히게 멀리 있는 날이네요.",
            "오류와 버그는 절친한 친구입니다. 평생 함께하죠.",
            "개발자의 가장 큰 거짓말은 '거의 다 했어요' 입니다.",
            "파이썬은 달콤하지만 들여쓰기가 가혹합니다.",
            "자바스크립트는 내 마음을 너무 잘 알아서 마음대로 동작합니다.",
            "인생은 짧고, 빌드 시간은 너무 깁니다.",
            "저장(Ctrl+S)을 숨쉬듯이 하세요.",
            "아무것도 안 했는데 에러가 났습니다.",
            "재부팅하면 고쳐진다는 믿음을 가지세요.",
            "스택 오버플로우는 신입니다.",
            "이게 왜 되지? 싶으면 건드리지 마세요.",
            "안되면 될 때까지 하지 말고 스택 오버플로우를 검색하세요.",
            "모니터를 뚫어져라 쳐다보면 버그가 무서워서 도망갑니다.",
            "점심 메뉴 고르는 게 세상에서 제일 어려운 일입니다.",
            "퇴근하고 싶다. 출근하자마자 퇴근하고 싶다.",
            "내일의 나에게 이 코드를 맡기고 저는 이만 자러 갑니다.",
            "이거 어제는 분명히 잘 됐는데 오늘 왜 이러죠?",
            "기획서가 또 바뀌었네요. 제 인생도 바뀌고 싶습니다.",
            "백업 안 한 자에게는 자비란 없습니다.",
            "다이어트는 내일부터. 오늘은 일단 치킨을 먹읍시다.",
            "세상에 나쁜 코드는 없다. 내가 짠 코드만 빼고.",
            "이 버그는 기능입니다. 에러가 아니라 피쳐(Feature)입니다.",
            "잠은 죽어서 자는 거라고 누가 그랬죠? 전 살아서도 자고 싶습니다.",
            "이 함수는 너무 커서 모니터를 두 개 이어 붙여야 보입니다.",
            "고양이가 키보드를 밟고 지나가서 코드가 완성되었습니다.",
            "인공지능이 세상을 지배하기 전에 제 퇴근시간부터 지배했으면 좋겠습니다.",
            "팀장님, 그 기능은 무한의 시간이 주어져도 불가능합니다.",
            "저에게 디버깅이란 숨은그림찾기와 같습니다. 정답 없는 숨은그림찾기.",
            "아침에 일어나는 건 언제나 새롭게 힘듭니다.",
            "통장이 텅장으로 진화하는 과정은 언제나 신비롭습니다.",
            "오늘은 왠지 운수가 좋은 날일 것 같았는데 역시나 에러가 터졌네요.",
            "마감 기한은 항상 제 상상보다 빠릅니다.",
            "내가 쓴 주석을 다음 날 보면 암호문 같습니다.",
            "우주선 발사도 이것보단 버그가 적을 겁니다.",
            "로컬에서는 잘 되는데요? 참 신기한 일이죠.",
            "서버비가 밀려서 AWS가 화가 났나 봅니다.",
            "오픈소스 생태계 만세! 남의 코드가 최고입니다.",
            "에러 로그를 읽기 싫어서 그냥 엔터를 쳐봅니다.",
            "저는 오늘부터 키보드 대신 마우스만 쓰기로 결심했습니다.",
            "이건 하드웨어 문제입니다. 램을 늘려주세요.",
            "치킨은 살 안 쪄요. 내가 찌죠.",
            "집에 가고 싶은 마음을 담아 커밋 메시지를 작성합니다.",
            "코테 공부를 하느니 차라리 농사를 짓겠습니다.",
            "세상은 요지경이고 내 코드는 스파게티입니다.",
            "전적으로 저를 믿으셔야 합니다 어머니.",
            "럭키비키잖아! 완전 럭키비키야!",
            "원영적 사고로 생각하면 모든 게 다 축복이에요.",
            "맞다이로 들어와! 맞다이 기자회견 시작합니다.",
            "폭룡적이다... 이 분위기 정말 폭룡적이야.",
            "갓생 살자고 다짐만 세 번째입니다.",
            "킹받네 진짜. 와, 진짜 킹받는다!",
            "갑분싸... 방금 그 농담 때문에 분위기가 싸해졌어요.",
            "알잘딱깔센 하게 해주세요. 알아서 잘 딱 깔끔하고 센스 있게!",
            "머선 129? 이게 도대체 머선 129?",
            "중요한 건 꺾이지 않는 마음입니다.",
            "사바사라서 제 코드가 안 돌아가는 걸 수도 있어요.",
            "현타 오네요. 코딩 시작한 지 10시간째입니다.",
            "스불재... 스스로 불러온 재앙입니다. 제 코드가요.",
            "느좋? 느낌 좋다! 오늘 코딩 잘 될 것 같아.",
            "감다살? 감 다 살아있네! 제 실력이요.",
            "감다뒤... 감 다 뒤졌습니다. 저 버그 하나에 3시간 썼어요.",
            "테무인간처럼 일하고 싶지 않아요. 퀄리티가 중요합니다.",
            "어린 송아지가 제일 연하고 맛있어! 야, 먹어버린 거 아니에요?",
            "찹쌀떡 메밀묵 삽니다! 야, 산대요 팔아야 되는데!",
            "난 선생이고 넌 학생이야! 아니, 난 선생이고 넌 교장이야!",
            "내 마음속에 저장! 도장 쾅쾅!",
            "안녕하세요! 굿 잡! 도장 쾅쾅!",
            "양치질을 하나요? 치약 맛있다!",
            "빨간 맛! 궁금해 허니!",
            "무엇이든 물어보세요! 아, 진짜 물었어요!",
            "조랭이 떡이 연상되네요. 저건 잘 짜야지 코미디입니다.",
            "여러분 저 결혼합니다! 누가 봐도 못 할 것 같은데!",
            "비행기 날아간다! 슈웅! 근데 제 코드도 같이 날아갔어요.",
            "이모카세 가고 싶다. 배고파요.",
            "텍스트힙이 제 유일한 생존 전략입니다.",
            "헬시플레저를 추구하지만 저녁은 마라탕입니다.",
            "껄무새처럼 후회하지 말고 지금 당장 커밋하세요.",
            "범접할 수 없는 아우라가 제 에러 로그에서 느껴집니다.",
            "손절미하고 싶은 버그가 또 발견되었어요.",
            "바플릭스 보면서 밥 먹는 게 제 유일한 낙입니다.",
            "어쩌라고? 저쩌라고? 팁탭탭!",
            "문이 열리네요. 그대가 들어오죠. 근데 왜 에러가 같이 오죠?"
        ];

        // --- 2. 초간단 마르코프 체인 생성기 ---
        // 텍스트를 어절 단위로 쪼개 확률 빈도를 만들 수도 있지만,
        // 어색함(아무말)을 극대화하기 위해 글자 단위 바이그램(Bi-gram)을 만듭니다.
        const chain = {};
        for (const sentence of corpus) {
            const tokens = sentence.split(" ");
            for (let i = 0; i < tokens.length - 1; i++) {
                const current = tokens[i];
                const next = tokens[i + 1];
                if (!chain[current]) chain[current] = [];
                chain[current].push(next);
            }
        }
        console.log("[Markov Plugin] Bi-gram Chain built. Key count:", Object.keys(chain).length);

        const generateMarkovText = () => {
            console.log("[Markov Plugin] Generating text...");
            // 시작 단어 무작위 선택
            const startWords = Object.keys(chain);
            let word = startWords[Math.floor(Math.random() * startWords.length)];
            let result = [word];

            // 3~8 단어로 이루어진 문장 생성
            const len = Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < len; i++) {
                const nextWords = chain[word];
                if (!nextWords || nextWords.length === 0) break;
                word = nextWords[Math.floor(Math.random() * nextWords.length)];
                result.push(word);
            }
            const final = result.join(" ") + (Math.random() > 0.5 ? "!" : ".");
            console.log("[Markov Plugin] Result:", final);
            return final;
        };

        // --- 3. Live2D 상호작용 (아바타 콕콕 찌르기) ---
        let pokeCount = 0;
        let lastPokeTime = 0;

        // [v4.0] Context API 기반 시스템 이벤트 수신 (Iframe 격리 대응)
        context.onSystemEvent('MODEL_HIT', (event) => {
            const now = Date.now();
            if (now - lastPokeTime < 800) { // Iframe 브릿지 지연 고려하여 약간 여유 있게
                pokeCount++;
                context.log(`[Markov] Poke Chain! count: ${pokeCount}`);
                console.log(`[Markov] Poke Chain! count: ${pokeCount}`);
            } else {
                pokeCount = 1;
            }
            lastPokeTime = now;

            // 3번 이상 연속 클릭하면 아무말 시작
            if (pokeCount >= 3) {
                context.log("[Markov] TRIPLE POKE TRIGGERED!");
                const nonsense = generateMarkovText();

                // v4.0 표준 API 사용 (PLAY_MOTION 핸들러 추가됨)
                context.playMotion('touch_body');
                context.speak(nonsense);

                pokeCount = 0; // 초기화
            }
        });

        console.log("%c[Markov Plugin] Initialization Complete. Try clicking the avatar 3 times!", "color: #2def2d; font-weight: bold;");
    },

    destroy: function () {
        console.log("[Markov Plugin] Destroyed");
    }
};
