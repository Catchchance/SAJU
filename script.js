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

    const prompt = `당신은 20년 경력의 날카롭고 통찰력 있는 명리학 최고 권위자입니다.
다음은 내담자의 사주 정보입니다.
- 이름: ${name}
- 사주팔자(천간/지지): 년주(${yP}), 월주(${mP}), 일주(${dP}), 시주(${tP})
- 오행 분포: 목(${counts.wood}), 화(${counts.fire}), 토(${counts.earth}), 금(${counts.metal}), 수(${counts.water})
- 현재 연도: ${new Date().getFullYear()}년

[풀이 가이드라인]
1. 무조건 긍정적이고 좋은 말만 하지 마십시오. 오행의 불균형이나 사주상 취약점(부족한 기운, 충돌하는 기운 등)을 객관적이고 냉정하게 분석해 신뢰도를 높이세요.
2. 풀이 내용에 '조심해야 할 점(건강, 재물 손실, 인간관계 갈등 등)'과 이를 극복하기 위한 '현실적인 조언'을 반드시 포함하세요.
3. 전문 용어는 알기 쉽게 비유를 들어 설명해주고, 총 분량은 최소 1000자 이상으로 매우 상세하게 작성해주세요.

위 가이드라인을 바탕으로 아래의 카테고리에 맞춰 사주를 풀이해주세요.
1. 🌟 총평 및 본질적 성향 (타고난 우주의 기운과 냉정한 장단점)
2. 💰 재물운 (돈의 흐름, 재물 손실 주의점, 유리한 투자 방향)
3. 💼 직장/사업운 (가장 잘 맞는 직업적 적성, 사회생활에서 주의할 점)
4. ❤️ 애정/대인관계운 (연애 성향, 피해야 할 인연과 귀인을 만나는 법)
5. 🩺 건강운 (오행의 불균형을 통한 취약 질환 및 구체적인 예방/관리법)
6. 🛤️ 향후 5년의 대운 흐름과 현재의 과제 (현재 ${new Date().getFullYear()}년 기준으로 향후 5년의 운세 흐름을 예측하고, 지금 당장 준비하고 행동해야 할 실질적인 조언)

마크다운 형식(##, ###, **강조**)을 사용하여 시각적으로 아름답게 작성해주세요.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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
        interpText.innerHTML = `
            <h3 style="color:red;">❌ AI 풀이 로딩 실패</h3>
            <p>API 연동 중 오류가 발생했습니다.</p>
            <p style="font-size:0.8rem;color:#888;">상세 오류: ${err.message}</p>
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
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
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
        historyContainer.innerHTML += `<div class="chat-msg ai" style="color:red;">답변을 불러오는 중 오류가 발생했습니다: ${err.message}</div>`;
        historyContainer.scrollTop = historyContainer.scrollHeight;
    }
}
