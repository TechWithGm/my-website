(() => {
  "use strict";

  const menuButton = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");
  const moreToggle = document.getElementById("moreToggle");
  const moreMenu = document.getElementById("moreMenu");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchBtn");
  const searchResults = document.getElementById("searchResults");
  const topButton = document.getElementById("topBtn");

  menuButton?.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  moreToggle?.addEventListener("click", () => {
    const open = moreToggle.getAttribute("aria-expanded") !== "true";
    moreMenu.hidden = !open;
    moreToggle.setAttribute("aria-expanded", String(open));
  });

  async function search() {
    const query = searchInput.value.trim();
    searchResults.replaceChildren();
    if (!query) {
      searchResults.hidden = true;
      return;
    }
    const status = document.createElement("div");
    status.className = "search-empty";
    status.textContent = "Searching articles…";
    searchResults.appendChild(status);
    searchResults.hidden = false;
    try {
      const response = await fetch(`/api/articles?q=${encodeURIComponent(query)}&limit=12`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Search request failed (${response.status}).`);
      const result = await response.json();
      searchResults.replaceChildren();
      if (!Array.isArray(result.data) || !result.data.length) {
        status.textContent = "No published articles found";
        searchResults.appendChild(status);
        return;
      }
      result.data.forEach((article) => {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = article.url;
        const title = document.createElement("strong");
        title.textContent = article.title;
        const info = document.createElement("small");
        info.textContent = [article.category, article.shortDescription].filter(Boolean).join(" · ");
        link.append(title, info);
        searchResults.appendChild(link);
      });
    } catch (error) {
      searchResults.replaceChildren();
      const message = document.createElement("div");
      message.className = "search-empty";
      message.textContent = "Search is temporarily unavailable.";
      searchResults.appendChild(message);
      console.error("Could not search published articles:", error);
    }
  }

  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchInput.searchTimer);
    searchInput.searchTimer = window.setTimeout(search, 180);
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      search();
    } else if (event.key === "Escape") {
      searchInput.value = "";
      searchResults.hidden = true;
    }
  });
  searchButton?.addEventListener("click", search);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".header-right")) searchResults.hidden = true;
    if (!event.target.closest(".more-nav")) {
      moreMenu.hidden = true;
      moreToggle.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("scroll", () => {
    topButton.style.display = window.scrollY > 300 ? "block" : "none";
  }, { passive: true });
  topButton?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();
