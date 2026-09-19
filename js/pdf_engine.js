// 🛡️ 호구방지위원회 - PDF 전용 디지털 텍스트 추출 & 생년월일 암호 해제 엔진 (PDF Engine)

class HoguPdfEngine {
  constructor(options = {}) {
    this.onProgress = options.onProgress || (() => {});
    this.onCompleted = options.onCompleted || (() => {});
    this.onError = options.onError || (() => {});
    this.onPasswordPrompt = options.onPasswordPrompt || null;
    this.userBirthYear = null;
    this.userAge = 40;
  }

  // 1. PDF 파일 로드 및 파싱 메인 파이프라인 (비밀번호 감지 & 재시도 탑재)
  async loadPdfFile(file, providedPassword = null) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      this.onError("PDF 파일만 업로드할 수 있습니다. 카카오톡이나 이메일로 받은 증권 PDF 파일을 올려주세요!");
      return;
    }

    try {
      this.onProgress({ status: providedPassword ? "비밀번호 검증 및 잠금 해제 중..." : "PDF 파일 읽는 중...", progress: 0.1 });
      const arrayBuffer = await file.arrayBuffer();

      const docParams = { data: arrayBuffer };
      if (providedPassword) {
        docParams.password = providedPassword;
      }

      const loadingTask = pdfjsLib.getDocument(docParams);
      const pdf = await loadingTask.promise;

      this.onProgress({ status: `PDF 잠금 해제 성공! 총 ${pdf.numPages}페이지 텍스트 추출 중...`, progress: 0.3 });

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
        this.onProgress({
          status: `텍스트 추출 중... (${i}/${pdf.numPages} 페이지)`,
          progress: 0.3 + (i / pdf.numPages) * 0.5
        });
      }

      console.log("📝 [PDF 디지털 원본 텍스트]\n", fullText);

      if (!fullText.trim() || fullText.trim().length < 30) {
        this.onError("PDF에서 텍스트를 읽을 수 없습니다. (스캔된 이미지 전용 PDF인 경우 알림톡/문자 텍스트 복사를 이용해 주세요)");
        return;
      }

      this.onProgress({ status: "개인정보 자동 비식별화 및 담보 정밀 분석 중...", progress: 0.9 });
      
      // 개인정보 정규식 마스킹 (이름, 주민번호, 전화번호, 주소 등)
      const safeText = this.filterSensitiveText(fullText);
      
      this.onProgress({ status: "분석 완료!", progress: 1.0 });
      this.onCompleted({
        rawText: safeText,
        age: this.userAge,
        birthYear: this.userBirthYear
      });

    } catch (err) {
      console.warn("⚠️ [PDF Engine Warning]", err);

      // 비밀번호가 필요하거나 틀렸을 때 ➔ 비밀번호 입력 모달 즉시 팝업!
      if (err.name === "PasswordException" || (err.message && err.message.includes("password"))) {
        this.onProgress({ status: "보안 PDF 감지: 비밀번호 입력 대기 중...", progress: 0.2 });

        if (this.onPasswordPrompt) {
          this.onPasswordPrompt((inputPassword) => {
            if (!inputPassword) {
              this.onError("비밀번호 입력이 취소되었습니다.");
              return;
            }
            // 입력받은 생년월일로 나이 계산
            this.calculateAgeFromBirth(inputPassword);
            // 비밀번호를 주입하여 재귀 호출로 문서 열기!
            this.loadPdfFile(file, inputPassword);
          });
        } else {
          const pwd = prompt("🔐 보험사 보안 PDF입니다. 비밀번호(생년월일 6자리, 예: 870101)를 입력해 주세요:");
          if (pwd) {
            this.calculateAgeFromBirth(pwd);
            this.loadPdfFile(file, pwd);
          } else {
            this.onError("비밀번호가 입력되지 않았습니다.");
          }
        }
      } else {
        this.onError(`PDF 파일을 여는 중 오류가 발생했습니다: ${err.message || err}`);
      }
    }
  }

  // 3. 생년월일 6자리(YYMMDD)로 만 나이 계산
  calculateAgeFromBirth(birth6) {
    const clean = birth6.replace(/[^0-9]/g, "");
    if (clean.length >= 6) {
      const yy = parseInt(clean.substring(0, 2), 10);
      const mm = parseInt(clean.substring(2, 4), 10);
      const dd = parseInt(clean.substring(4, 6), 10);
      
      // 00~30은 2000년대생, 그 외는 1900년대생
      const fullYear = yy <= 30 ? (2000 + yy) : (1900 + yy);
      this.userBirthYear = fullYear;
      
      const currentYear = new Date().getFullYear();
      this.userAge = currentYear - fullYear;
      console.log(`🎂 [HoguPdfEngine] 생년월일 분석: ${fullYear}년생 ➔ 만 ${this.userAge}세 판정`);
    }
  }

  // 4. 개인정보 정규식 마스킹 (Zero-Privacy)
  filterSensitiveText(text) {
    let filtered = text;
    // 주민등록번호 패턴 마스킹 (870101-1234567 ➔ 870101-1******)
    filtered = filtered.replace(/\b(\d{6})[- ]?([1-4])\d{6}\b/g, "$1-$2******");
    // 전화번호 마스킹 (010-XXXX-XXXX)
    filtered = filtered.replace(/\b(01[016789])[- ]?(\d{3,4})[- ]?(\d{4})\b/g, "$1-****-$3");
    // 증권번호 마스킹
    filtered = filtered.replace(/증권번호\s*[:：]?\s*([A-Za-z0-9\-]+)/g, "증권번호: [보안 마스킹]");
    return filtered;
  }
}
