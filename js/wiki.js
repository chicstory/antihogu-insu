// 🛡️ 호구방지위원회 - 보험 ELI10 위키 (Wiki Engine)

class HoguWiki {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.items = WIKI_ITEMS;
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

  getFilteredItems() {
    return this.items.filter(item => {
      // 카테고리 필터
      const matchCat = this.currentCategory === "all" || item.category === this.currentCategory;
      // 검색어 필터
      const matchQuery = !this.searchQuery || 
        item.title.toLowerCase().includes(this.searchQuery) ||
        item.eli10.toLowerCase().includes(this.searchQuery) ||
        item.detail.toLowerCase().includes(this.searchQuery);
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
          <p>검색 결과가 없습니다. 다른 단어로 검색해 보세요!</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(item => {
      const badgeClass = item.badge === "gold" ? "badge-gold" : (item.badge === "bubble" ? "badge-bubble" : "badge-select");
      return `
        <article class="wiki-card" id="wiki-${item.id}">
          <div class="wiki-card-header">
            <h3 class="wiki-title">${item.title}</h3>
            <span class="badge ${badgeClass}">${item.badgeText}</span>
          </div>
          
          <div class="wiki-eli10-box">
            <span class="eli10-tag">🐥 10살도 아는 한 줄 비유</span>
            <p class="eli10-text">${item.eli10}</p>
          </div>

          <div class="wiki-detail">
            <p>${item.detail}</p>
          </div>

          <div class="wiki-stats">
            <span class="stats-icon">📊</span>
            <span class="stats-text">${item.stats}</span>
          </div>
        </article>
      `;
    }).join("");
  }
}
