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

  // 2. 텍스트 파서 (직접 복사해온 텍스트 파싱)
  parseRawText(rawText) {
    const lines = rawText.split("\n");
    const items = [];
    let monthlyPremium = 0;
    let renewalPremium = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 보험료 감지
      if (trimmed.includes("보험료") && trimmed.includes("원")) {
        const numMatch = trimmed.match(/(\d[\d,]*)\s*원/);
        if (numMatch) {
          const val = parseInt(numMatch[1].replace(/,/g, ""), 10);
          if (trimmed.includes("갱신") && !trimmed.includes("보장보험료")) {
            renewalPremium = val;
          } else if (!monthlyPremium && val > 10000) {
            monthlyPremium = val;
          }
        }
      }

      // 담보 라인 파싱 (금액이 포함된 라인)
      const amtMatch = trimmed.match(/(\d[\d,]*)\s*원/);
      if (amtMatch) {
        const amount = parseInt(amtMatch[1].replace(/,/g, ""), 10);
        // 담보명 추출 (금액 앞부분)
        const namePart = trimmed.split(/(\d[\d,]*)\s*원/)[0].trim();
        const isRenewal = trimmed.includes("갱신") || trimmed.includes("전기납");

        if (namePart && amount >= 10000) {
          items.push({
            name: namePart,
            amount: amount,
            term: trimmed.includes("100세") ? "100세" : "80세",
            pay: trimmed.includes("전기납") ? "전기납" : "20년납",
            isRenewal: isRenewal
          });
        }
      }
    });

    return {
      title: "📋 직접 입력한 보험 증권",
      age: 40,
      gender: "M",
      monthlyPremium: monthlyPremium || 60000,
      renewalPremium: renewalPremium,
      items: items
    };
  }
}
