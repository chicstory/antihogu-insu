// 🛡️ 호구방지위원회 - 증권 분석 & 호구 등급 판독 엔진 (Analyzer Engine)

class HoguAnalyzer {
  constructor() {
    this.rules = HOGU_RULES;
  }

  // 1. 증권 데이터 정밀 분석
  analyzePolicy(policy) {
    let score = 70; // 기본 시작 점수
    const warnings = [];
    const praises = [];
    const dietRecommendations = [];
    let monthlySavingsEst = 0;

    let cancerAmount = 0;
    let brainVascularAmount = 0;
    let brainStrokeAmount = 0;
    let brainHemorrhageAmount = 0;
    let heartIschemicAmount = 0;
    let silbiHospitalAmount = 0;
    let deathTotal = 0;
    let hasRenewalBomb = false;
    let bubbleCount = 0;

    // 아이템 전수 검사
    policy.items.forEach(item => {
      const name = item.name;
      const amt = item.amount || 0;

      // 암 진단비 체크
      if (name.includes("암진단비") && !name.includes("고액") && !name.includes("유사")) {
        cancerAmount += amt;
      }
      // 뇌 관련 체크
      if (name.includes("뇌혈관질환")) brainVascularAmount += amt;
      if (name.includes("뇌졸중")) brainStrokeAmount += amt;
      if (name.includes("뇌출혈")) brainHemorrhageAmount += amt;

      // 심장 관련 체크
      if (name.includes("허혈성")) heartIschemicAmount += amt;

      // 실손 체크
      if (name.includes("입원의료비") || name.includes("의료실비")) {
        silbiHospitalAmount = Math.max(silbiHospitalAmount, amt);
      }

      // 사망 체크
      if (name.includes("사망")) {
        deathTotal += amt;
        if (item.isRenewal || name.includes("갱신")) {
          hasRenewalBomb = true;
          warnings.push("🚨 **갱신형 질병사망 시한폭탄 발견!** 나이 들수록 보험료가 수직 폭등합니다.");
          dietRecommendations.push({
            name: item.name,
            reason: "나이 들면 보험료가 폭등하는 갱신형 전기납. 살아있을 때 병원비도 안 줌.",
            action: "즉시 삭제 1순위",
            saveEst: policy.renewalPremium || 8400
          });
          monthlySavingsEst += (policy.renewalPremium || 8400);
          score -= 30;
        } else if (amt >= 40000000) {
          dietRecommendations.push({
            name: item.name,
            reason: "불필요하게 과다 책정된 비갱신 사망보험금. 매달 보험료 갉아먹는 주범.",
            action: "최소 감액 또는 삭제 권고",
            saveEst: 15000
          });
          monthlySavingsEst += 15000;
          score -= 10;
        }
      }

      // 푼돈 과자값 특약 체크
      if (name.includes("골절") || name.includes("화상") || name.includes("깁스") || name.includes("피부질환") || name.includes("강력범죄") || name.includes("교통사고부상")) {
        bubbleCount++;
        dietRecommendations.push({
          name: item.name,
          reason: "10만~20만 원 푼돈 보상. 이미 실손보험에서 다 나오므로 매달 과자값 낭비.",
          action: "삭제 권고",
          saveEst: 1500
        });
        monthlySavingsEst += 1500;
      }

      // 중복 수술비 체크
      if ((name.includes("수술비") && !name.includes("인공관절") && !name.includes("상해수술비")) || name.includes("직접치료입원비")) {
        bubbleCount++;
        dietRecommendations.push({
          name: item.name,
          reason: "30만~50만 원 푼돈 보조. 실손보험에서 수술비 전액 나오므로 중복 불필요.",
          action: "삭제 권고",
          saveEst: 3000
        });
        monthlySavingsEst += 3000;
      }
    });

    // 2. 핵심 3대 진단비 평가
    if (cancerAmount >= 50000000) {
      praises.push("✅ **암 진단비 5,000만 원 확보**: 1~2년 소득 공백을 완벽하게 방어합니다.");
      score += 15;
    } else if (cancerAmount >= 30000000) {
      praises.push("👍 **암 진단비 3,000만 원**: 기본적인 1년 생활비 방어선이 구축되어 있습니다.");
      score += 5;
    } else if (cancerAmount > 0 && cancerAmount <= 10000000) {
      warnings.push("⚠️ **암 진단비 부족(1,000만 원 이하)**: 암 걸리면 생활비로 쓸 돈이 턱없이 부족합니다.");
      score -= 20;
    } else if (cancerAmount === 0) {
      warnings.push("🚨 **암 진단비 0원 (치명적 구멍)**: 암에 걸렸을 때 일 못하는 소득 단절을 막을 방법이 없습니다!");
      score -= 25;
    }

    // 뇌혈관 평가
    const totalBrain = brainVascularAmount + brainStrokeAmount;
    if (brainVascularAmount >= 20000000 || totalBrain >= 20000000) {
      praises.push("✅ **뇌혈관질환 2,000만 원 완벽 탑재**: 뇌경색(80%)까지 든든하게 전신 커버!");
      score += 15;
    } else if (brainHemorrhageAmount > 0 && brainVascularAmount === 0 && brainStrokeAmount === 0) {
      warnings.push("❌ **뇌출혈 10% 쪽박 방패만 보유**: 뇌경색(80%)으로 쓰러지면 0원 나옵니다. 뇌혈관질환으로 교체 필수!");
      score -= 15;
    }

    // 실손 평가
    if (silbiHospitalAmount >= 30000000) {
      praises.push("👑 **100% 구실손(전설의 보물) 보유**: 병원비 영수증 가져가면 전액 다 물어주는 최강의 방패!");
      score += 15;
    }

    // 푼돈 특약 감점
    if (bubbleCount >= 5) {
      warnings.push(`💸 **푼돈 조미료 특약 ${bubbleCount}개 도배**: 10만~20만 원 받자고 매달 생돈을 낭비하고 있습니다.`);
      score -= 15;
    }

    // 최종 점수 범위 보정 (0~100점)
    score = Math.max(10, Math.min(100, score));

    // 호구 등급 판정
    const gradeObj = this.rules.hoguGrades.find(g => score >= g.minScore) || this.rules.hoguGrades[3];

    // 치킨 환산
    const chickenCount = Math.floor(monthlySavingsEst / 20000);

    return {
      policyTitle: policy.title,
      age: policy.age,
      gender: policy.gender,
      monthlyPremium: policy.monthlyPremium,
      score,
      grade: gradeObj.grade,
      icon: gradeObj.icon,
      stampClass: gradeObj.stampClass,
      summary: gradeObj.summary,
      recommendation: gradeObj.recommendation,
      praises,
      warnings,
      dietRecommendations,
      monthlySavingsEst,
      chickenCount,
      metrics: {
        cancer: cancerAmount,
        brain: totalBrain || brainHemorrhageAmount,
        heart: heartIschemicAmount,
        silbi: silbiHospitalAmount,
        death: deathTotal,
        hasRenewalBomb
      }
    };
  }

  // 2. 텍스트 파서 (OCR 텍스트 및 다양한 형식 지원 초강력 스마트 파서)
  parseRawText(rawText) {
    if (!rawText || !rawText.trim()) {
      return {
        title: "📋 빈 증권",
        age: 40,
        gender: "M",
        monthlyPremium: 0,
        renewalPremium: 0,
        items: []
      };
    }

    const lines = rawText.split("\n");
    const items = [];
    let monthlyPremium = 0;
    let renewalPremium = 0;

    // 한국어 금액 환산 헬퍼 (예: "5,000만", "1억", "10,000,000", "5000만원" 등)
    const parseAmount = (str) => {
      if (!str) return 0;
      const clean = str.replace(/[, \s]/g, "");

      // "1억" 단위
      if (clean.includes("억")) {
        const parts = clean.split("억");
        const eok = parseFloat(parts[0]) || 1;
        const rest = parts[1] ? parseAmount(parts[1]) : 0;
        return (eok * 100000000) + rest;
      }
      // "천만" 또는 "만" 단위
      if (clean.includes("천만")) {
        const val = parseFloat(clean.replace("천만", "").replace("원", "")) || 1;
        return val * 10000000;
      }
      if (clean.includes("만")) {
        const val = parseFloat(clean.replace("만", "").replace("원", "")) || 1;
        return val * 10000;
      }
      // "천원" 단위 (예: 10,000천원 = 1천만 원)
      if (clean.includes("천원")) {
        const val = parseFloat(clean.replace("천원", "")) || 1;
        return val * 1000;
      }
      // 순수 숫자 (예: 10000000)
      const numOnly = parseInt(clean.replace(/[^0-9]/g, ""), 10);
      return isNaN(numOnly) ? 0 : numOnly;
    };

    // 주요 담보 키워드 사전
    const KNOWN_KEYWORDS = [
      "일반암진단비", "암진단비", "유사암진단비", "고액치료비암", "고액암",
      "뇌혈관질환진단비", "뇌혈관질환", "뇌혈관", "뇌졸중진단비", "뇌졸중", "뇌출혈진단비", "뇌출혈",
      "허혈성심장질환진단비", "허혈성심장", "허혈성", "급성심근경색증진단비", "급성심근경색",
      "질병입원의료비", "상해입원의료비", "질병통원의료비", "상해통원의료비", "상해의료실비",
      "질병사망", "일반상해사망", "상해사망", "상해후유장해", "질병후유장해",
      "골절진단비", "화상진단비", "깁스치료비", "피부질환수술비", "인공관절수술비",
      "질병수술비", "16대질병수술비", "상해수술비", "암수술비", "암직접치료입원비",
      "표적항암약물허가치료비", "양성뇌종양진단비"
    ];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const cleanNoSpace = trimmed.replace(/\s+/g, "");

      // 1) 보험료 감지
      if (cleanNoSpace.includes("보험료")) {
        const amtCandidate = trimmed.match(/(\d[\d,]*\s*(?:만|천|억)?\s*원?)/);
        if (amtCandidate) {
          const val = parseAmount(amtCandidate[0]);
          if (cleanNoSpace.includes("갱신") && !cleanNoSpace.includes("보장보험료")) {
            renewalPremium = val;
          } else if (!monthlyPremium && val >= 10000 && val <= 1000000) {
            monthlyPremium = val;
          }
        }
      }

      // 2) 담보 매칭 (알려진 키워드가 줄 안에 있는지 검사)
      for (const kw of KNOWN_KEYWORDS) {
        // 공백 오타 허용 매칭 (예: "암 진 단 비" ➔ "암진단비")
        if (cleanNoSpace.includes(kw)) {
          // 금액 패턴 찾기 (숫자 + 콤마 + 단위)
          const matches = trimmed.match(/(\d[\d,.]*\s*(?:억|천만|천|만)?\s*원?)/g);
          if (matches) {
            // 유효한 금액(1만 원 이상) 추출
            for (const m of matches) {
              const parsedAmt = parseAmount(m);
              if (parsedAmt >= 10000) {
                const isRenewal = cleanNoSpace.includes("갱신") || cleanNoSpace.includes("전기납");
                const is100Age = cleanNoSpace.includes("100세");

                // 중복 방지 (이미 들어간 담보인지 확인)
                const exists = items.some(it => it.name === kw && it.amount === parsedAmt);
                if (!exists) {
                  items.push({
                    name: kw,
                    amount: parsedAmt,
                    term: is100Age ? "100세" : "80세",
                    pay: isRenewal ? "전기납" : "20년납",
                    isRenewal: isRenewal
                  });
                }
                break;
              }
            }
          }
          break; // 한 줄에서 하나의 담보 매칭 성공 시 다음 줄로
        }
      }

      // 3) 일반 패턴 매칭 (특약명 + 금액 형식)
      if (!items.some(it => trimmed.includes(it.name))) {
        const generalMatch = trimmed.match(/^([가-힣A-Za-z0-9\(\)\s]{2,20})\s+([0-9,]+(?:\s*원|\s*만원|\s*천원|\s*억)?)/);
        if (generalMatch) {
          const nameCandidate = generalMatch[1].trim();
          const amtCandidate = parseAmount(generalMatch[2]);
          if (amtCandidate >= 10000 && !nameCandidate.includes("합계") && !nameCandidate.includes("보험료")) {
            items.push({
              name: nameCandidate,
              amount: amtCandidate,
              term: "80세",
              pay: "20년납",
              isRenewal: trimmed.includes("갱신") || trimmed.includes("전기납")
            });
          }
        }
      }
    });

    return {
      title: "📋 판독 완료된 보험 증권",
      age: 40,
      gender: "M",
      monthlyPremium: monthlyPremium || 60000,
      renewalPremium: renewalPremium,
      items: items
    };
  }
}
