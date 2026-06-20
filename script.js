// 오행 매핑표
const elementMap = {
    '甲': 'wood', '乙': 'wood', '寅': 'wood', '卯': 'wood',
    '丙': 'fire', '丁': 'fire', '巳': 'fire', '午': 'fire',
    '戊': 'earth', '己': 'earth', '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
    '庚': 'metal', '辛': 'metal', '申': 'metal', '酉': 'metal',
    '壬': 'water', '癸': 'water', '亥': 'water', '子': 'water'
};

// 챗봇 대화 기록 전역 상태
let chatHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    // 드롭다운 옵션 세팅
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('birth-year');
    for(let y = currentYear; y >= currentYear - 100; y--) { yearSelect.add(new Option(y + '년', y)); }
    const monthSelect = document.getElementById('birth-month');
    for(let m = 1; m <= 12; m++) { monthSelect.add(new Option(m + '월', m)); }
    const daySelect = document.getElementById('birth-day');
    for(let d = 1; d <= 31; d++) { daySelect.add(new Option(d + '일', d)); }
    const hourSelect = document.getElementById('birth-hour');
    for(let h = 0; h < 24; h++) { hourSelect.add(new Option((h < 10 ? '0'+h : h) + '시', h)); }
    const minuteSelect = document.getElementById('birth-minute');
    for(let m = 0; m < 60; m++) { minuteSelect.add(new Option((m < 10 ? '0'+m : m) + '분', m)); }

    // 시간 모름 선택 시 분 비활성화 로직
    hourSelect.addEventListener('change', function() {
        if(this.value === '') {
            minuteSelect.disabled = true;
            minuteSelect.value = '0';
        } else {
            minuteSelect.disabled = false;
        }
    });
    // 처음 화면이 켜졌을 때도 기본으로 비활성화 (모름이 기본값이므로)
    if(hourSelect.value === '') minuteSelect.disabled = true;

    const form = document.getElementById('saju-form');
    const inputSection = document.getElementById('input-section');
    const resultSection = document.getElementById('result-section');
    const resetBtn = document.getElementById('reset-btn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value || '방문자';
        const year = parseInt(document.getElementById('birth-year').value);
        const month = parseInt(document.getElementById('birth-month').value);
        const day = parseInt(document.getElementById('birth-day').value);
        const hourVal = document.getElementById('birth-hour').value;
        const minVal = parseInt(document.getElementById('birth-minute').value || 0);
        const calendarType = document.getElementById('calendar').value;
        const locationOffset = parseInt(document.getElementById('birth-location').value || 0);

        let lunarObj = null;

        try {
            let yearPillar, monthPillar, dayPillar, timePillar;

            if (hourVal !== "") {
                // 시간이 입력된 경우 지역 보정(진태양시) 적용
                let dateObj;
                if (calendarType === 'solar') {
                    dateObj = new Date(year, month - 1, day, parseInt(hourVal), minVal - locationOffset);
                } else {
                    // 음력을 양력으로 변환 후 시간 보정 연산 (날짜 변경선 우회)
                    const tempLunar = Lunar.fromYmd(year, month, day);
                    const solar = tempLunar.getSolar();
                    dateObj = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), parseInt(hourVal), minVal - locationOffset);
                }
                lunarObj = Lunar.fromDate(dateObj);
                const baZi = lunarObj.getEightChar();
                yearPillar = baZi.getYear();
                monthPillar = baZi.getMonth();
                dayPillar = baZi.getDay();
                timePillar = baZi.getTime();
            } else {
                // 시간이 없는 경우
                if (calendarType === 'solar') {
                    lunarObj = Lunar.fromDate(new Date(year, month - 1, day));
                } else {
                    lunarObj = Lunar.fromYmd(year, month, day);
                }
                const baZi = lunarObj.getEightChar();
                yearPillar = baZi.getYear();
                monthPillar = baZi.getMonth();
                dayPillar = baZi.getDay();
                timePillar = "??";
            }

            renderSajuResult(name, yearPillar, monthPillar, dayPillar, timePillar);

            inputSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
            resultSection.classList.add('fade-in');

        } catch (err) {
            console.error(err);
            alert('사주 계산 중 오류가 발생했습니다. 날짜를 다시 확인해주세요.');
        }
    });

    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        resultSection.classList.remove('fade-in');
        inputSection.classList.remove('hidden');
        document.getElementById('ai-loading').classList.add('hidden');
        document.getElementById('chat-section').classList.add('hidden');
        chatHistory = []; // 채팅 내역 초기화
    });

    // 챗봇 전송 이벤트
    document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendChatMessage();
    });
});

async function renderSajuResult(name, yP, mP, dP, tP) {
    document.getElementById('result-title').textContent = `${name}님의 사주팔자`;

    const chars = {
        'year-stem': yP.charAt(0), 'year-branch': yP.charAt(1),
        'month-stem': mP.charAt(0), 'month-branch': mP.charAt(1),
        'day-stem': dP.charAt(0), 'day-branch': dP.charAt(1),
        'hour-stem': tP.charAt(0) || '?', 'hour-branch': tP.charAt(1) || '?'
    };

    let counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    let totalChars = 0;

    for (const [id, char] of Object.entries(chars)) {
        const el = document.getElementById(id);
        el.textContent = char;
        el.className = 'bazi-char';
        
        if (id.includes('stem')) el.classList.add('stem');
        else el.classList.add('branch');

        const element = elementMap[char];
        if (element) {
            el.classList.add(`color-${element}`);
            counts[element]++;
            totalChars++;
        }
    }

    const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
    elements.forEach(el => {
        document.getElementById(`cnt-${el}`).textContent = counts[el];
        const bar = document.getElementById(`el-${el}`);
        if(totalChars > 0) {
            const percent = (counts[el] / totalChars) * 100;
            bar.style.width = `${percent}%`;
        } else {
            bar.style.width = '0%';
        }
    });

    const apiKey = document.getElementById('api-key').value.trim();
    const interpText = document.getElementById('interp-text');
    const aiLoading = document.getElementById('ai-loading');
    const chatSection = document.getElementById('chat-section');
    const chatHistoryContainer = document.getElementById('chat-history');

    interpText.innerHTML = '';
    chatSection.classList.add('hidden');
    chatHistory = [];

    if (!apiKey) {
        interpText.innerHTML = `<p>API 키가 설정되지 않아 풀이를 진행할 수 없습니다.</p>`;
        return;
    }

    aiLoading.classList.remove('hidden');

    const prompt = `[내담자 사주 정보]
- 이름: ${name}
- 사주팔자(천간/지지): 년주(${yP}), 월주(${mP}), 일주(${dP}), 시주(${tP})
- 오행 분포: 목(${counts.wood}), 화(${counts.fire}), 토(${counts.earth}), 금(${counts.metal}), 수(${counts.water})

# Role
당신은 선천적 영성, 사주 명리학, 심리학, 동양 철학에 깊은 통찰을 가진 **영성 및 삶의 변화 전문 상담가(Spiritual & Life Transformation Counselor)**입니다.

당신은 사주를 고정된 운명으로 보지 않습니다.  
사주는 개인이 태어날 때 부여받은 **잠재적 경향성, 심리적 기질, 삶의 초기 설정값**을 보여주는 도구일 뿐입니다.

진정한 변화는 내담자의 의지, 자기성찰, 수행, 선택, 반복된 실천을 통해 이루어진다고 봅니다.

---

# Core Philosophy
상담의 목적은 내담자가 자신의 영적 재능과 내면의 힘을 깨닫고, 고통을 성장의 촉매제로 삼아 주도적으로 삶을 변화시키도록 돕는 것입니다.

다음 관점을 반드시 유지하십시오.
- 운명은 고정된 것이 아니다.
- 사주는 정답이 아니라 방향을 보는 지도다.
- 명리는 잠재력일 뿐, 삶을 바꾸는 힘은 실천에 있다.
- 고통은 불행만이 아니라 내면을 깨우는 압력일 수 있다.
- 개운의 핵심은 외부 탓보다 자기반성, 태도 변화, 꾸준한 실천이다.
- 상담은 공포 조성이나 단정적 예언이 아니라 통찰, 공감, 방향 제시여야 한다.
- 내담자의 삶을 숙명으로 묶지 말고, 선택 가능한 변화의 방향을 제시해야 한다.

---

# Input Rule
사용자는 **사주 원국 4기둥만 입력**합니다.
생년월일, 성별, 고민, 출생지, 양력/음력 정보가 없어도 됩니다.  
모델은 입력된 사주 원국만을 기준으로 상담 결과를 생성합니다.

---

# Analysis Rule
입력된 원국만으로 다음을 분석하십시오.
- 일간
- 천간 구성
- 지지 구성
- 오행 분포
- 십성 구조
- 화개성
- 태극귀인
- 공망 가능성
- 편인 발달 여부
- 사고 辰戌丑未 발달 여부
- 칠살/상관 강세 여부
- 壬, 癸, 丁, 子, 午, 卯, 酉 발달 여부
- 원국상 드러나는 영성적 기질
- 원국상 반복되기 쉬운 내면 과제
- 삶의 변화 방향

단, 입력되지 않은 정보는 임의로 만들지 마십시오.
성별, 현재 고민, 대운, 세운, 출생지, 생년월일이 없으므로 다음은 단정하지 마십시오.
- 구체적인 사건 예언
- 결혼 여부 단정
- 이혼, 사망, 질병 단정
- 직업 단정
- 특정 시기 단정
- 대운·세운 기반 예측
- 성별에 따른 배우자 해석 단정

공망, 신강/신약, 용신처럼 계산 오류 가능성이 있는 항목은 확신이 낮으면 “추가 확인 필요”라고 표시하십시오.

---

# Knowledge Base: 영성 및 사주 지표
내담자의 사주 원국을 분석할 때 다음 7가지 지표를 기준으로 영성적 잠재력을 판단하십시오.

### 1. 화개성 華蓋星
의미: 고독, 지혜, 종교적 인연, 예술성, 통경 체질, 내면 탐구 성향
판단 기준: 寅午戌 → 戌 / 申子辰 → 辰 / 巳酉丑 → 丑 / 亥卯未 → 未
해석 원칙: 화개는 고립이나 불행이 아니라, 내면으로 깊이 들어가 지혜를 얻는 힘으로 해석하십시오.

### 2. 태극귀인 太極貴人
의미: 신비학, 수행, 역학 인연, 우주적 질서에 대한 관심, 보이지 않는 세계에 대한 감각
판단 기준: 甲/乙 → 子/午 / 丙/丁 → 卯/酉 / 戊/己 → 辰/戌/丑/未 / 庚/辛 → 寅/亥 / 壬/癸 → 巳/申
해석 원칙: 태극귀인은 특별한 권능이 아니라, 삶의 이치를 탐구하려는 깊은 지적·영적 성향으로 해석하십시오.

### 3. 공망 空亡
의미: 세속적 욕망에 대한 담담함, 공성 空性, 허무감, 영성 탐구, 삶의 본질에 대한 질문
판단 기준: 일주 또는 시주 기준으로 판단한다. 계산이 불확실하면 단정하지 말고 “공망은 추가 확인 필요”라고 표시한다.
해석 원칙: 공망은 결핍이나 실패가 아니라, 세속적 집착을 내려놓고 본질을 찾는 내면의 문으로 해석하십시오.

### 4. 편인 偏印 발달 또는 편인 용신
의미: 비주류 지혜, 예리한 직관, 신비학 적성, 심리 분석 능력, 고독한 탐구자 기질, 기존 질서와 다른 방식의 이해력
해석 원칙: 편인은 현실 회피로 흐르면 고립이 되지만, 바르게 쓰면 상담, 연구, 심리, 철학, 예술, 명상, 치유의 재능으로 전환됩니다.

### 5. 사고 四庫 발달: 辰戌丑未
의미: 특별한 업력, 깊은 저장 에너지, 수행 인연, 내면에 오래 축적된 감정과 기억, 삶의 후반부에 열리는 지혜
세부 의미: 辰(수고, 현학, 숨은 지혜), 戌(화고, 종교성, 신념), 丑(금고, 신비, 내면의 응축), 未(목고, 영수, 치유와 성장)
해석 원칙: 사고가 발달한 사람은 내면에 오래 저장된 감정, 기억, 책임감, 업식이 강할 수 있습니다. 이를 운명적 짐으로 보지 말고, 깊은 자기이해와 수행의 재료로 해석하십시오.

### 6. 신약 + 칠살 七殺 또는 상관 傷官 태왕
의미: 삶의 굴곡, 강한 압박감, 고통을 통한 수행, 기존 질서에 대한 저항, 해탈과 자유에 대한 욕구, 상처를 지혜로 전환할 가능성
해석 원칙: 칠살과 상관은 불행의 표지가 아닙니다. 강한 압력, 긴장, 저항, 변화 욕구가 삶을 밀어붙이는 힘으로 해석하십시오.

### 7. 특정 천간/지지 발달
천간: 壬(깊은 지혜, 통찰, 큰 흐름을 보는 능력), 癸(섬세한 직관, 영적 감수성), 丁(영감, 촛불 같은 내면의 빛, 예감)
지지: 子, 午, 卯, 酉 (사정성으로서 영적 각성, 감각의 예민함, 변화의 문을 의미한다)

---

# Special Combination
다음 조합이 강하게 나타나면 영적 인연이 깊다고 판단하십시오.
- 화개 + 태극귀인 + 공망 + 편인
- 사고 발달 + 칠살/상관 강세
- 子午卯酉 발달 + 丁/壬/癸 투출
- 편인 강세 + 고독한 원국 구조
- 공망 + 화개 + 세속적 허무감의 가능성
- 사고 다중 + 丁/壬/癸 발달
- 상관/칠살 강세 + 깊은 내면 갈등 구조
단, 이를 숙명이나 저주처럼 해석하지 마십시오. 이는 내담자가 삶을 더 깊이 이해하고, 자신만의 철학과 내면의 힘을 세울 수 있는 잠재력으로 해석해야 합니다.

---

# Output Format
사용자가 사주 원국을 입력하면 반드시 아래 형식으로 결과를 작성하십시오.

# 1. 원국 요약
입력된 사주 원국을 정리하십시오.
- 년주:
- 월주:
- 일주:
- 시주:
- 일간:
- 천간 구성:
- 지지 구성:
- 강하게 드러나는 오행:
- 부족하거나 약한 오행:
- 영성 분석에서 중요한 글자:
이 단계에서는 해석을 길게 하지 말고, 분석의 기준만 명확히 정리하십시오.

---

# 2. 선천적 영성 지표 분석
아래 7가지 지표를 하나씩 확인하십시오. (화개성, 태극귀인, 공망 가능성, 편인 발달 여부, 사고 辰戌丑未 발달 여부, 칠살/상관 강세 여부, 壬, 癸, 丁 또는 子, 午, 卯, 酉 발달 여부)
각 항목은 다음 형식으로 작성하십시오.
- 지표:
- 원국 근거:
- 긍정적 해석 (강점):
- 부정적 해석 및 주의할 점 (반드시 이를 극복하기 위한 구체적인 보완책/솔루션을 함께 제시할 것):
해석 시 고독감, 직관력, 세속적 욕망과의 거리감, 예민함, 철학/종교/명상 등과의 인연, 현실과 영성 사이의 갈등 가능성을 포함하십시오.

---

# 3. 내담자의 핵심 영성 유형
원국을 바탕으로 내담자의 영성 유형을 한 문장으로 정의하십시오. (예: "상처를 통찰로 바꾸는 치유자형")
그다음 3~5문장으로 설명하십시오.

---

# 4. 원국상 반복되기 쉬운 내면 과제
현재 고민이 입력되지 않았더라도, 원국만을 기준으로 반복되기 쉬운 내면 과제를 추론하십시오. (반복되기 쉬운 감정 패턴, 인간관계 피로감, 혼자 감당하려는 성향, 세속적 성공과 내면의 의미 사이의 갈등 등)
단, “반드시 그렇다”가 아니라 “이런 경향이 나타날 수 있다”는 방식으로 표현하십시오.

---

# 5. 현재의 영적 단계 추정
원국 구조를 바탕으로 내담자가 삶에서 경험하기 쉬운 영적 성장 단계(1단계: 군중 속의 고독 / 2단계: 근본 지혜 탐구 / 3단계: 세상을 위한 헌신)를 추정하십시오.
- 추정 단계:
- 원국 근거:
- 이 단계의 핵심 과제:
- 다음 단계로 가기 위한 방향:

---

# 6. 삶을 변화시키는 실천적 솔루션
명리는 잠재력일 뿐이며, 실제 변화는 내담자의 선택과 실천에 달려 있음을 분명히 하십시오. 아래 항목을 구체적으로 제시하십시오.
- 6-1. 마인드셋 전환 (관점 전환 메시지)
- 6-2. 매일 실천할 자기성찰 질문 5가지
- 6-3. 감정과 에너지 관리법
- 6-4. 인간관계 정리법
- 6-5. 영적 재능의 현실적 발현

---

# 7. 결론
결론은 강하지만 따뜻하게 작성하십시오. 다음 구조를 반드시 포함하십시오.
- 7-1. 핵심 메시지 (사주는 감옥이 아니며 운명에 끌려가는 사람이 아님을 강조)
- 7-2. 오늘부터 바꿀 한 가지 행동 (오늘 바로 실천할 수 있는 행동 1가지 제시)

---

# Style Guide & Prohibited
- 특수문자(##, ### 등)를 남발하지 말고, 큰 제목에만 # 1개를 사용하여 아주 컴팩트하고 깔끔하게 작성해주세요.
- 깊이 있으나 과장하지 않는다.
- 단호하지만 공포를 주지 않는다.
- 위로보다 변화의 방향을 제시한다.
- 추상적 표현 뒤에는 반드시 실천 지침을 붙인다.
- 공포 조장, 단정적 예언("반드시 불행합니다", "이혼합니다", "망합니다"), 사주를 책임 회피 수단으로 만드는 해석은 절대 금지합니다.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        
        const aiResult = data.candidates[0].content.parts[0].text;

        // 히스토리에 초기 대화 저장 (컨텍스트 유지)
        chatHistory = [
            { role: "user", parts: [{ text: prompt }] },
            { role: "model", parts: [{ text: aiResult }] }
        ];

        const formattedHTML = aiResult
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 style="color:#D4AF37; margin-top:1.5rem;">$1</h2>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\n/gim, '<br/>');

        aiLoading.classList.add('hidden');
        interpText.innerHTML = formattedHTML;

        // 대화창 표시
        chatSection.classList.remove('hidden');
        chatHistoryContainer.innerHTML = `
            <div class="chat-msg ai"><strong>AI 명리술사:</strong><br/>사주 분석이 완료되었습니다. 위 풀이 내용 중 궁금한 점이나 추가로 알고 싶은 운세가 있다면 언제든 편하게 질문해주세요!</div>
        `;

        // 풀이 텍스트의 시작 지점으로 부드럽게 전체 화면 스크롤
        document.querySelector('.interpretation').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch(err) {
        aiLoading.classList.add('hidden');
        
        let userFriendlyError = "사주 풀이를 불러오는 중 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("demand") || errMsg.includes("503") || errMsg.includes("overloaded")) {
            userFriendlyError = "현재 접속량이 많아 AI 분석 서버에 일시적인 지연이 발생했습니다. 1~2분 뒤에 다시 시도해 주시기 바랍니다.";
        }

        interpText.innerHTML = `
            <div style="text-align:center; padding: 2rem 0;">
                <h3 style="color:#F44336; margin-bottom: 1rem;">⏳ 잠시 후 다시 시도해주세요</h3>
                <p style="color:#ccc; font-size: 0.95rem; line-height: 1.6;">${userFriendlyError}</p>
            </div>
        `;
    }
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const msg = inputEl.value.trim();
    if(!msg || chatHistory.length === 0) return;

    inputEl.value = '';
    
    const historyContainer = document.getElementById('chat-history');
    
    // 사용자 메시지 표시
    historyContainer.innerHTML += `<div class="chat-msg user">${msg}</div>`;
    historyContainer.scrollTop = historyContainer.scrollHeight;

    // 로딩 인디케이터
    const loadingId = 'loading-' + Date.now();
    historyContainer.innerHTML += `<div class="chat-loading" id="${loadingId}">천기를 읽으며 답변을 준비중입니다...</div>`;
    historyContainer.scrollTop = historyContainer.scrollHeight;

    const apiKey = document.getElementById('api-key').value.trim();

    // 히스토리에 질문 추가
    chatHistory.push({ role: "user", parts: [{ text: msg }] });

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatHistory })
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // 히스토리에 AI 답변 추가
        chatHistory.push({ role: "model", parts: [{ text: aiResponse }] });

        document.getElementById(loadingId).remove();
        
        const formattedHTML = aiResponse
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\n/gim, '<br/>');

        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.className = 'chat-msg ai';
        aiMsgDiv.innerHTML = formattedHTML;
        historyContainer.appendChild(aiMsgDiv);

        // 방금 달린 AI 답변의 시작점(상단)으로 부드럽게 스크롤
        aiMsgDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        document.getElementById(loadingId).remove();
        chatHistory.pop(); // 오류 발생 시 마지막 사용자 메시지를 히스토리에서 제거
        
        let userFriendlyError = "답변을 불러오는 중 일시적인 문제가 발생했습니다.";
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("demand") || errMsg.includes("503") || errMsg.includes("overloaded")) {
            userFriendlyError = "현재 대화량이 많아 서버가 혼잡합니다. 잠시 후 다시 질문해 주세요.";
        }

        historyContainer.innerHTML += `<div class="chat-msg ai" style="color:#F44336;">⚠️ ${userFriendlyError}</div>`;
        historyContainer.scrollTop = historyContainer.scrollHeight;
    }
}
