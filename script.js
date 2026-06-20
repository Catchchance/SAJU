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

    // 풀이 스타일 버튼 선택 로직
    const toneBtns = document.querySelectorAll('.tone-btn');
    const toneInput = document.getElementById('tone');

    toneBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toneBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            toneInput.value = btn.dataset.tone;
        });
    });

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
        const tone = document.getElementById('tone').value || 'normal';

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

            renderSajuResult(name, yearPillar, monthPillar, dayPillar, timePillar, tone);

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

async function renderSajuResult(name, yP, mP, dP, tP, tone = 'normal') {
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

    let toneInstruction = '';
    if (tone === 'harsh') {
        toneInstruction = "3. [직설적(팩트폭행) 모드] 어설픈 위로나 예쁜 포장은 일절 배제하세요. 내담자의 치부, 단점, 실패 가능성, 성격적 결함을 숨김없이 가장 차갑고 날카로운 언어로 뼈를 때리듯 지적하세요. 듣기 거북할 정도의 적나라한 팩트폭행을 가하여 내담자가 핑계 대지 못하고 정신을 번쩍 차리게 만드세요. 장점보다는 반드시 고쳐야 할 문제점 위주로 매섭게 질타하듯 분석해야 합니다.";
    } else if (tone === 'soft') {
        toneInstruction = "3. [희망적 모드] 단점과 한계는 최대한 긍정적이고 부드럽게 순화해서 표현하고, 내담자가 큰 위로와 희망, 자신감을 얻을 수 있도록 칭찬과 희망찬 말들 위주로 다정하게 풀이해주세요. 너무 무서운 말은 피해주세요.";
    } else {
        toneInstruction = "3. [객관적 모드] 단점과 주의할 점 역시 예쁘게 포장하지 않되, 전문가다운 정제된 언어로 날카롭게 짚어주세요.\n   - 단점 서술 예시: '성격이 나빠서 대못을 박는다' (X) -> '본인은 솔직하고 효율을 중시하지만, 직설적인 화법이 타인에게는 날카롭게 다가가 의도치 않은 마찰을 빚을 수 있으니 부드러운 표현 방식을 길러야 합니다.' (O)";
    }

    const prompt = `당신은 20년 경력의 명리학 최고 권위자입니다.
다음은 내담자의 사주 정보입니다.
- 이름: ${name}
- 사주팔자(천간/지지): 년주(${yP}), 월주(${mP}), 일주(${dP}), 시주(${tP})
- 오행 분포: 목(${counts.wood}), 화(${counts.fire}), 토(${counts.earth}), 금(${counts.metal}), 수(${counts.water})
- 현재 연도: ${new Date().getFullYear()}년

[풀이 가이드라인]
1. 사주 원국(천간/지지/오행)에 나타난 내용을 기반으로 전문적으로 분석하세요. 20년 경력 최고 권위자다운 무게감을 지키세요.
2. 추상적인 사주 용어만 나열하지 말고, 현실에서 어떻게 발현되는지 구체적이고 명확하게 서술하세요.
   - 강점 서술 예시: '머리가 좋습니다' (X) -> '핵심을 꿰뚫는 분석력이 뛰어나며, 남들이 보지 못하는 흐름을 읽어내는 전략적 사고가 발달했습니다.' (O)
${toneInstruction}
4. 단점 지적 혹은 아쉬운 점을 언급한 후에는 반드시 현실에서 바로 적용할 수 있는 구체적인 보완책(개운법)을 제시하세요.
5. 전문 용어는 알기 쉽게 비유를 들어 설명해주고, 총 분량은 최소 1000자 이상으로 상세하게 작성해주세요.
6. [말투/어미 통일] 모든 풀이의 어미는 반드시 '~합니다', '~입니다', '~하십시오' 등 정중하고 예의 바른 존댓말(하십시오체)로 완전히 통일하세요. 직설적이고 매서운 분석(팩트폭행)을 할 때에도 절대 '~한다', '~이다' 같은 반말이나 딱딱한 문어체 어미를 쓰지 말고 품격 있는 대면 상담의 경어체를 유지해야 합니다.

위 가이드라인을 바탕으로 아래의 카테고리에 맞춰 사주를 풀이해주세요.
# 🌟 총평 및 본질적 성향 (가장 두드러지는 성격의 특징과 현실적 분석)
# 💰 재물운 (돈이 새어나가는 구체적 패턴 및 재물 축적 방법)
# 💼 직장/사업운 (가장 잘 맞는 구체적 직업군, 사회생활에서 겪기 쉬운 문제)
# ❤️ 애정/대인관계운 (연애 패턴, 피해야 할 사람의 구체적 특징)
# 🩺 건강운 (오행 불균형으로 인한 취약 질환 및 관리법)
# 🛤️ 향후 5년의 흐름 (현재 ${new Date().getFullYear()}년 기준 구체적이고 현실적인 조언)

특수문자(##, ### 등)를 남발하지 말고, 각 카테고리 제목에만 # 1개를 사용하여 아주 컴팩트하고 세련되게 작성해주세요.`;

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
            .replace(/^#\s+(.*?)\s*\((.*?)\)\s*$/gim, '<h2 style="color:#FFDF00; font-size:1.5rem; margin-top:2rem; margin-bottom:1rem; border-bottom: 2px solid rgba(212, 175, 55, 0.4); padding-bottom:12px; line-height:1.3;">$1<span style="color:#aaaaaa; font-size:1rem; font-weight:400; display:block; margin-top:6px;">$2</span></h2>')
            .replace(/^#\s+(.*$)/gim, '<h2 style="color:#FFDF00; font-size:1.5rem; margin-top:2rem; margin-bottom:1rem; border-bottom: 2px solid rgba(212, 175, 55, 0.4); padding-bottom:8px;">$1</h2>')
            .replace(/^##+\s+(.*$)/gim, '<h3 style="color:#d4af37; margin-top:1.2rem; margin-bottom:0.5rem; font-size:1.2rem;">$1</h3>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#eeeeee;">$1</strong>')
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
                <p style="color:#666; font-size: 0.8rem; margin-top:1rem; word-break: break-all;">(디버그용 에러 원인: ${err.message})</p>
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
    
    // 사용자 메시지 표시 (XSS 방지를 위해 텍스트 이스케이프)
    const escapedMsg = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    historyContainer.innerHTML += `<div class="chat-msg user">${escapedMsg}</div>`;
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
