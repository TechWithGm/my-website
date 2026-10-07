const latestPosts = [
  ["UPSC Civil Services Prelims 2025 – Admit Card Released","28 Sep 2025"],
  ["Bihar Police Constable Recruitment 2025 – Apply Online","27 Sep 2025"],
  ["SSC GD Constable Result 2025 – Check Now","26 Sep 2025"],
  ["JEE Main 2025 Session 2 Result – Download Score Card","25 Sep 2025"],
  ["PM Kisan 20th Installment – Beneficiary List Released","24 Sep 2025"],
  ["Bihar Board Exam 2025 – Latest Important Notice","22 Sep 2025"]
];

const latestList = document.getElementById("latestList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");

function renderPosts(posts = latestPosts) {
  latestList.innerHTML = "";
  posts.forEach(([title, date]) => {
    const item = document.createElement("div");
    item.className = "latest-item";
    item.innerHTML = `<span class="title">${title}</span><span class="date">${date}</span>`;
    latestList.appendChild(item);
  });
}

function getSearchText(element) {
  const values = [
    element.textContent,
    element.getAttribute("title"),
    element.getAttribute("aria-label"),
    element.getAttribute("data-search"),
    element.getAttribute("data-keywords"),
    element.getAttribute("alt")
  ];

  element.querySelectorAll("a[title], a[aria-label]").forEach((link) => {
    values.push(link.getAttribute("title"), link.getAttribute("aria-label"));
  });

  return values.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function getSearchContext(element) {
  const section = element.closest(".update-card, .side-card, .promo, .hero, .about, .footer-grid > div, nav");
  if (!section || section === element) return "";

  const heading = section.querySelector("h1, h2, h3, h4, h5, h6, .card-head, .side-title, .eyebrow");
  return heading ? heading.textContent.trim() : "";
}

function getSearchIndex() {
  const candidates = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, a, button, img[alt], .card-head, .side-title, .latest-item, [data-search], [data-keywords]"
  );

  return Array.from(candidates)
    .filter((element) => {
      if (element.closest("li") && element.tagName === "A") return false;
      if (element.tagName === "A" && element.querySelector("li")) return false;
      return true;
    })
    .map((element) => {
      const text = getSearchText(element);
      const context = getSearchContext(element);
      return { element, text, context, searchableText: `${context} ${text}`.toLocaleLowerCase() };
    })
    .filter(({ text }) => text.length > 0);
}

function highlightText(container, text, terms) {
  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const expression = new RegExp(`(${escapedTerms.join("|")})`, "gi");

  text.split(expression).forEach((part) => {
    if (terms.some((term) => part.toLocaleLowerCase() === term)) {
      const mark = document.createElement("mark");
      mark.textContent = part;
      container.appendChild(mark);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });
}

function makeSnippet(text, terms) {
  const lowerText = text.toLocaleLowerCase();
  const matchPositions = terms
    .map((term) => lowerText.indexOf(term))
    .filter((position) => position >= 0);
  if (!matchPositions.length) return text.slice(0, 140);

  const start = Math.max(0, Math.min(...matchPositions) - 45);
  const end = Math.min(text.length, start + 140);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function showSearchResults() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  searchResults.replaceChildren();
  searchResults.hidden = !query;
  if (!query) return;

  const terms = query.split(/\s+/).filter(Boolean);
  const matches = getSearchIndex().filter(({ searchableText }) =>
    terms.every((term) => searchableText.includes(term))
  );

  if (!matches.length) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "search-empty";
    emptyMessage.textContent = "No results found";
    searchResults.appendChild(emptyMessage);
    return;
  }

  matches.forEach(({ element, text, context }) => {
    const result = document.createElement("button");
    result.className = "search-result";
    result.type = "button";
    result.setAttribute("role", "option");

    const title = document.createElement("strong");
    highlightText(title, text.slice(0, 90), terms);
    result.appendChild(title);

    const snippet = makeSnippet(`${context ? `${context} · ` : ""}${text}`, terms);
    if (snippet.toLocaleLowerCase() !== text.slice(0, 90).toLocaleLowerCase()) {
      const description = document.createElement("small");
      highlightText(description, snippet, terms);
      result.appendChild(description);
    }

    result.addEventListener("click", () => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      searchResults.hidden = true;
    });
    searchResults.appendChild(result);
  });
}

searchInput.addEventListener("input", showSearchResults);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    showSearchResults();
  } else if (event.key === "Escape") {
    searchInput.value = "";
    showSearchResults();
  }
});
searchBtn.addEventListener("click", showSearchResults);

menuBtn.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

const moreToggle = document.getElementById("moreToggle");
const moreMenu = document.getElementById("moreMenu");
const navigationViews = new Set([
  "home",
  "jobs",
  "results",
  "admit",
  "admission",
  "scholarship",
  "yojana",
  "bihar",
  "career",
  "latest-news",
  "important-links",
  "popular-searches",
  "about",
  "about-us",
  "contact-us",
  "terms-and-conditions"
]);

function setNavigationView(view) {
  const selectedView = navigationViews.has(view) ? view : "home";
  const homeSectionViews = ["about-us", "contact-us", "terms-and-conditions"];
  const activeView = homeSectionViews.includes(selectedView) ? "home" : selectedView;
  document.body.dataset.navView = activeView;

  document.querySelectorAll(".nav-inner [data-nav-view]").forEach((link) => {
    const isActive = link.dataset.navView === selectedView;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const moreIsActive = ["latest-news", "important-links", "popular-searches", "about", "about-us", "contact-us", "terms-and-conditions"].includes(selectedView);
  moreToggle.classList.toggle("is-active", moreIsActive);
  moreMenu.hidden = true;
  moreToggle.setAttribute("aria-expanded", "false");
}

document.querySelectorAll(".nav-inner [data-nav-view]").forEach((link) => {
  link.addEventListener("click", () => {
    setNavigationView(link.dataset.navView);
    mainNav.classList.remove("open");
  });
});

moreToggle.addEventListener("click", () => {
  const isExpanded = moreToggle.getAttribute("aria-expanded") === "true";
  moreMenu.hidden = isExpanded;
  moreToggle.setAttribute("aria-expanded", String(!isExpanded));
});

window.addEventListener("hashchange", () => {
  setNavigationView(window.location.hash.slice(1));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-right")) searchResults.hidden = true;
});

renderPosts();
setNavigationView(window.location.hash.slice(1));
