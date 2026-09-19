// 🚨 보험 119 - 메인 애플리케이션 제어기 (App Controller)

document.addEventListener("DOMContentLoaded", () => {
  // 1. 위키 엔진 초기화
  const wiki = new HoguWiki("wikiListContainer");
  wiki.init();

  // 2. 6대 필수 생존 보험 및 함정 주계약 렌더링
  renderEssentialPolicies();

  // 3. 탭 전환 제어
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

      // 위키 탭으로 이동 시 재렌더링
      if (targetId === "tabWiki") {
        wiki.render();
      }
    });
  });

  // 4. 위키 카테고리 필터 칩 제어
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      wiki.setCategory(chip.dataset.category);
    });
  });

  // 5. 위키 검색창 실시간 검색
  const wikiSearchInput = document.getElementById("wikiSearchInput");
  if (wikiSearchInput) {
    wikiSearchInput.addEventListener("input", (e) => {
      wiki.setSearchQuery(e.target.value);
    });
  }
});

// 🛡️ 기본 메인 계약이 필수적인 6대 생존 보험 & 함정 4종 렌더링
function renderEssentialPolicies() {
  const coreContainer = document.getElementById("essentialCoreContainer");
  const trapContainer = document.getElementById("trapPoliciesContainer");

  // 1. 6대 필수 메인 계약
  if (coreContainer && typeof ESSENTIAL_CORE_POLICIES !== "undefined") {
    coreContainer.innerHTML = ESSENTIAL_CORE_POLICIES.map(item => `
      <div class="essential-card" id="${item.id}">
        <div class="essential-card-header">
          <span class="badge ${item.badgeClass}">${item.badge}</span>
          <span class="essential-who">${item.whoNeeds}</span>
        </div>
        <h4 class="essential-title">${item.title}</h4>

        <div class="disaster-box">
          <div class="disaster-label">🚨 이게 없으면 닥치는 인생 재앙:</div>
          <p class="disaster-text">${item.disasterScenario}</p>
        </div>

        <div class="core-setting-box">
          <div class="setting-label">🎯 필수 주계약 & 탑재 세팅법:</div>
          <p class="setting-text">${item.coreSetting}</p>
        </div>

        <div class="essential-footer">
          <div class="cost-tag">💳 <strong>적정 비용</strong>: ${item.targetCost}</div>
          <div class="eli10-sub">${item.eli10}</div>
        </div>
      </div>
    `).join("");
  }

  // 2. 절대 피해야 할 주계약 함정 4종
  if (trapContainer && typeof TRAP_POLICIES !== "undefined") {
    trapContainer.innerHTML = TRAP_POLICIES.map(item => `
      <div class="trap-card" id="${item.id}">
        <h4 class="trap-title">${item.title}</h4>
        
        <div class="trap-why-box">
          <span class="trap-label">⚠️ 왜 가입할수록 손해인가?</span>
          <p class="trap-why-text">${item.whyTrap}</p>
        </div>

        <div class="trap-solution-box">
          <span class="trap-solution-label">💡 똑똑한 대체 솔루션:</span>
          <p class="trap-solution-text">${item.solution}</p>
        </div>
      </div>
    `).join("");
  }
}
