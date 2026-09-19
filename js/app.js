// 🛡️ 호구방지위원회 - 메인 애플리케이션 제어기 (App Controller)

document.addEventListener("DOMContentLoaded", () => {
  const analyzer = new HoguAnalyzer();
  const wiki = new HoguWiki("wikiListContainer");
  wiki.init();

  // 1. 탭 전환 제어
  const navTabs = document.querySelectorAll(".subnav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.tab;
      navTabs.forEach(t => t.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // 2. 위키 카테고리 필터 칩 제어
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      wiki.setCategory(chip.dataset.category);
    });
  });

  // 위키 검색창 실시간 검색
  const wikiSearchInput = document.getElementById("wikiSearchInput");
  if (wikiSearchInput) {
    wikiSearchInput.addEventListener("input", (e) => {
      wiki.setSearchQuery(e.target.value);
    });
  }

  // 3. 파일 업로드 및 Zero-Privacy 마스킹 OCR 연동
  const privacyCanvas = document.getElementById("privacyCanvas");
  const maskingStudio = document.getElementById("maskingStudio");
  const ocrProgressBox = document.getElementById("ocrProgressBox");
  const ocrStatusText = document.getElementById("ocrStatusText");
  const ocrPercentText = document.getElementById("ocrPercentText");
  const ocrProgressBarFill = document.getElementById("ocrProgressBarFill");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const btnSelectFile = document.getElementById("btnSelectFile");
  const btnClearMasks = document.getElementById("btnClearMasks");
  const btnRunOCR = document.getElementById("btnRunOCR");

  const ocr = new HoguOCR({
    canvas: privacyCanvas,
    onProgress: (p) => {
      if (ocrProgressBox) ocrProgressBox.style.display = "block";
      if (ocrStatusText) ocrStatusText.textContent = p.status;
      const pct = Math.floor(p.progress * 100);
      if (ocrPercentText) ocrPercentText.textContent = `${pct}%`;
      if (ocrProgressBarFill) ocrProgressBarFill.style.width = `${pct}%`;
    },
    onCompleted: (extractedText) => {
      if (ocrProgressBox) ocrProgressBox.style.display = "none";
      if (maskingStudio) maskingStudio.style.display = "none";
      
      console.log("✅ [OCR 완료 텍스트]", extractedText);
      
      // 추출된 텍스트를 텍스트 입력창에 자동으로 채우고 아코디언 열기!
      const rawTextInput = document.getElementById("rawTextInput");
      const detailsEl = document.querySelector(".raw-input-details");
      if (rawTextInput) rawTextInput.value = extractedText;
      if (detailsEl) detailsEl.open = true;

      // 추출된 텍스트로 파싱 및 분석 실행
      const parsedPolicy = analyzer.parseRawText(extractedText);
      if (parsedPolicy.items.length === 0) {
        alert("⚠️ 텍스트는 판독되었으나 특약/금액을 자동으로 분리하지 못했습니다.\n아래 텍스트 입력창에 추출된 내용을 확인하시고 [텍스트로 호구 등급 판독하기]를 눌러보세요!");
      } else {
        runAnalysis(parsedPolicy);
      }
    },
    onError: (errMsg) => {
      if (ocrProgressBox) ocrProgressBox.style.display = "none";
      alert(errMsg);
    }
  });

  // 파일 선택 버튼
  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener("click", () => fileInput.click());
  }

  // 드롭존 클릭
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", (e) => {
      if (e.target !== btnSelectFile) fileInput.click();
    });

    // 드래그 앤 드롭 이벤트
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        handleIncomingFile(e.dataTransfer.files[0]);
      }
    });
  }

  // 파일 인풋 변경
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleIncomingFile(e.target.files[0]);
      }
    });
  }

  async function handleIncomingFile(file) {
    if (maskingStudio) maskingStudio.style.display = "block";
    maskingStudio.scrollIntoView({ behavior: "smooth" });
    await ocr.loadFile(file);
  }

  // 마스킹 초기화
  if (btnClearMasks) {
    btnClearMasks.addEventListener("click", () => ocr.clearMasks());
  }

  // 마스킹 완료 & OCR 판독 실행
  if (btnRunOCR) {
    btnRunOCR.addEventListener("click", async () => {
      await ocr.runOCR();
    });
  }

  // 4. 1초 원클릭 샘플 테스트 버튼 제어
  const btnSampleUser = document.getElementById("btnSampleUser");
  const btnSampleMother = document.getElementById("btnSampleMother");

  if (btnSampleUser) {
    btnSampleUser.addEventListener("click", () => {
      runAnalysis(HOGU_RULES.sampleData.user_sample);
    });
  }

  if (btnSampleMother) {
    btnSampleMother.addEventListener("click", () => {
      runAnalysis(HOGU_RULES.sampleData.mother_sample);
    });
  }

  // 5. 직접 텍스트 붙여넣기 분석
  const btnAnalyzeText = document.getElementById("btnAnalyzeText");
  const rawTextInput = document.getElementById("rawTextInput");

  if (btnAnalyzeText && rawTextInput) {
    btnAnalyzeText.addEventListener("click", () => {
      const text = rawTextInput.value.trim();
      if (!text) {
        alert("보험 증권 텍스트를 입력해 주세요!");
        return;
      }
      const parsedPolicy = analyzer.parseRawText(text);
      runAnalysis(parsedPolicy);
    });
  }

  // 6. 분석 실행 및 결과 화면 렌더링
  function runAnalysis(policy) {
    const result = analyzer.analyzePolicy(policy);
    renderResult(result, policy);

    // 결과 화면으로 스크롤 이동
    const resultContainer = document.getElementById("analysisResultContainer");
    if (resultContainer) {
      resultContainer.style.display = "block";
      resultContainer.scrollIntoView({ behavior: "smooth" });
    }
  }

  // 6. 결과 화면 렌더링 함수
  function renderResult(res, rawPolicy) {
    // 호구 등급 도장
    const stampEl = document.getElementById("stampBadge");
    if (stampEl) {
      stampEl.className = `hogu-stamp ${res.stampClass}`;
      stampEl.innerHTML = `${res.icon} ${res.grade}`;
    }

    // 점수 표시
    const scoreValEl = document.getElementById("scoreValue");
    if (scoreValEl) scoreValEl.textContent = res.score;

    const scoreFillEl = document.getElementById("scoreBarFill");
    if (scoreFillEl) {
      scoreFillEl.style.width = `${res.score}%`;
      scoreFillEl.style.backgroundColor = res.score >= 80 ? "#10B981" : (res.score >= 50 ? "#F59E0B" : "#EF4444");
    }

    // 사이다 요약 & 추천
    const summaryEl = document.getElementById("resSummaryText");
    if (summaryEl) summaryEl.textContent = res.summary;

    const recEl = document.getElementById("resRecText");
    if (recEl) recEl.textContent = res.recommendation;

    // 칭찬 vs 경고 박스
    const praisesList = document.getElementById("praisesList");
    if (praisesList) {
      praisesList.innerHTML = res.praises.length > 0 
        ? res.praises.map(p => `<li>${p}</li>`).join("")
        : `<li>특별히 뛰어난 알짜 보장이 부족합니다.</li>`;
    }

    const warningsList = document.getElementById("warningsList");
    if (warningsList) {
      warningsList.innerHTML = res.warnings.length > 0
        ? res.warnings.map(w => `<li>${w}</li>`).join("")
        : `<li>특별한 눈탱이나 시한폭탄 특약이 발견되지 않았습니다.</li>`;
    }

    // 다이어트 처방전
    const dietContainer = document.getElementById("dietPrescriptionBox");
    if (dietContainer) {
      if (res.dietRecommendations.length > 0) {
        dietContainer.innerHTML = `
          <div class="diet-header">
            <h3>✂️ 다이어트 처방전: 이것만 빼도 돈이 굳습니다!</h3>
            <div class="savings-badge">
              매달 <strong>${res.monthlySavingsEst.toLocaleString()}원</strong> 절약 (치킨 <strong>${res.chickenCount}마리</strong> 값!)
            </div>
          </div>
          <ul class="diet-list">
            ${res.dietRecommendations.map(d => `
              <li class="diet-item">
                <div class="diet-item-main">
                  <span class="diet-name">${d.name}</span>
                  <span class="diet-action badge-bubble">${d.action}</span>
                </div>
                <p class="diet-reason">${d.reason}</p>
                <span class="diet-sub-saving">예상 절약액: 월 약 ${d.saveEst.toLocaleString()}원</span>
              </li>
            `).join("")}
          </ul>
        `;
      } else {
        dietContainer.innerHTML = `
          <div class="diet-header">
            <h3>🎉 완벽합니다!</h3>
            <p>빼야 할 낭비 특약이 없습니다. 지금 세팅 그대로 유지하세요!</p>
          </div>
        `;
      }
    }

    // 전수 담보 테이블
    const tableBody = document.getElementById("damBoTableBody");
    if (tableBody) {
      tableBody.innerHTML = rawPolicy.items.map(item => {
        let tag = "일반";
        let tagClass = "badge-neutral";
        const amtStr = item.amount ? item.amount.toLocaleString() + "원" : "0원";

        if (item.name.includes("암진단비") || item.name.includes("뇌혈관") || item.name.includes("허혈성") || item.name.includes("입원의료비")) {
          tag = "알짜 보물";
          tagClass = "badge-gold";
        } else if (item.isRenewal || item.name.includes("갱신")) {
          tag = "🚨 시한폭탄";
          tagClass = "badge-danger";
        } else if (item.name.includes("골절") || item.name.includes("화상") || item.name.includes("깁스") || item.name.includes("피부")) {
          tag = "과자값 특약";
          tagClass = "badge-bubble";
        }

        return `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${amtStr}</td>
            <td>${item.term || "-"}</td>
            <td>${item.pay || "-"}</td>
            <td><span class="badge ${tagClass}">${tag}</span></td>
          </tr>
        `;
      }).join("");
    }
  }
});
