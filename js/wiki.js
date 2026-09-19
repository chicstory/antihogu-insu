// 🛡️ 호구방지위원회 - 보험 ELI10 위키 & 시너지 백과 (Wiki Engine)

class HoguWiki {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.items = (typeof WIKI_ITEMS !== "undefined") ? WIKI_ITEMS : [];
    this.currentCategory = "all";
    this.searchQuery = "";
  }

  init() {
    this.render();
  }

  setCategory(cat) {
    this.currentCategory = cat;
    this.render();
  }

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.render();
  }

  formatMarkdown(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  getFilteredItems() {
    return this.items.filter(item => {
      // 카테고리 필터
      let matchCat = false;
      if (this.currentCategory === "all") {
        matchCat = true;
      } else if (this.currentCategory === "brain_heart") {
        matchCat = item.category === "brain" || item.category === "heart";
      } else if (this.currentCategory === "life_pension") {
        matchCat = item.category === "life_pension" || item.category === "death";
      } else {
        matchCat = item.category === this.currentCategory;
      }

      // 검색어 필터 (제목, 10살비유, 영업비밀, 시너지콤보, 행동지침 통합 검색)
      const q = this.searchQuery;
      const matchQuery = !q || 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.eli10 && item.eli10.toLowerCase().includes(q)) ||
        (item.whyAgentsPush && item.whyAgentsPush.toLowerCase().includes(q)) ||
        (item.synergy && item.synergy.toLowerCase().includes(q)) ||
        (item.actionGuide && item.actionGuide.toLowerCase().includes(q)) ||
        (item.stats && item.stats.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }

  render() {
    if (!this.container) return;
    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="empty-wiki">
          <div class="empty-icon">🔍</div>
          <p class="empty-title">검색 결과가 없습니다.</p>
          <p class="empty-sub">다른 검색어를 입력하거나 상단 카테고리 칩을 눌러보세요!</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(item => {
      const badgeClass = item.badge === "gold" ? "badge-gold" : (item.badge === "bubble" ? "badge-bubble" : "badge-select");
      
      const synergyHtml = item.synergy ? `
        <div class="wiki-synergy-box">
          <div class="synergy-label">⭐ 다른 계약과의 시너지 콤보</div>
          <div class="synergy-content">${this.formatMarkdown(item.synergy)}</div>
        </div>
      ` : "";

      const whyHtml = item.whyAgentsPush ? `
        <div class="wiki-why-box">
          <span class="why-label">🕵️‍♂️ 설계사가 넣는 진짜 이유:</span>
          <span class="why-text">${item.whyAgentsPush}</span>
        </div>
      ` : "";

      const actionHtml = item.actionGuide ? `
        <div class="wiki-action-box">
          <span class="action-label">✂️ 사이다 행동 지침:</span>
          <span class="action-text">${item.actionGuide}</span>
        </div>
      ` : "";

      return `
        <article class="wiki-card" id="wiki-${item.id}">
          <div class="wiki-card-header">
            <h3 class="wiki-title">${item.title}</h3>
            <span class="badge ${badgeClass}">${item.badgeText}</span>
          </div>
          
          <div class="wiki-eli10-box">
            <span class="eli10-tag">🐥 10살 눈높이 1줄 비유</span>
            <p class="eli10-text">${item.eli10}</p>
          </div>

          ${whyHtml}
          ${synergyHtml}
          ${actionHtml}

          <div class="wiki-stats-box">
            <span class="stats-icon">📊</span>
            <span class="stats-text">${item.stats}</span>
          </div>
        </article>
      `;
    }).join("");
  }
}

