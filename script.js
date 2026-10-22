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
const contactForm = document.getElementById("contactForm");
const contactApiUrl =
  window.location.protocol === "file:"
    ? "http://localhost:5000/api/contact"
    : "/api/contact";
const siteContentApiUrl = contactApiUrl.replace(/\/api\/contact$/, "/api/site-content");
const articleSearchApiUrl = siteContentApiUrl.replace(/\/api\/site-content$/, "/api/articles");
const knownSiteCategoryIds = new Set([
  "jobs", "results", "admit", "admission", "scholarship", "yojana",
  "bihar", "career", "latest-news", "important-links", "popular-searches"
]);

async function submitContactForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const resultElement = form.querySelector("#contactResult");
  const payload = Object.fromEntries(new FormData(form).entries());

  submitButton.disabled = true;
  resultElement.textContent = "जानकारी भेजी जा रही है...";

  try {
    const response = await fetch(contactApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      resultElement.textContent = result.message || "जानकारी सेव नहीं हो सकी। कृपया दोबारा प्रयास करें।";
      return;
    }

    resultElement.textContent = "आपकी जानकारी सेव हो गई है";
    form.reset();
  } catch (error) {
    resultElement.textContent = "सर्वर से संपर्क नहीं हो सका। कृपया बाद में दोबारा प्रयास करें।";
  } finally {
    submitButton.disabled = false;
  }
}

contactForm.addEventListener("submit", submitContactForm);

function renderPosts(posts = latestPosts) {
  latestList.innerHTML = "";
  posts.forEach(([title, date]) => {
    const item = document.createElement("div");
    item.className = "latest-item";
    item.innerHTML = `<span class="title">${title}</span><span class="date">${date}</span>`;
    latestList.appendChild(item);
  });
}

function appendSafeLink(container, { title, url = "", displayDate = "", description = "", keywords = "", isArticle = false }) {
  const link = document.createElement("a");
  link.textContent = title;
  link.href = url || "#";
  if (keywords) link.dataset.keywords = keywords;
  if (isArticle) link.dataset.articleLink = "true";
  if (/^https?:\/\//i.test(url)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (isArticle) {
      link.target = "_self";
      link.rel = "";
    }
  }
  if (displayDate) {
    const date = document.createElement("small");
    date.textContent = displayDate;
    link.appendChild(date);
  }
  if (description) link.title = description;
  container.appendChild(link);
}

function renderManagedCategory(category, items) {
  if (category.id === "latest-updates") {
    latestList.replaceChildren();
    items.forEach((post) => {
      const item = document.createElement(post.url ? "a" : "div");
      item.className = "latest-item";
      if (post.url) {
        item.href = post.url;
        if (post.keywords) item.dataset.keywords = post.keywords;
        if (post.isArticle) item.dataset.articleLink = "true";
        if (/^https?:\/\//i.test(post.url)) {
          item.target = "_blank";
          item.rel = "noopener noreferrer";
          if (post.isArticle) {
            item.target = "_self";
            item.rel = "";
          }
        }
      }
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = post.title;
      const date = document.createElement("span");
      date.className = "date";
      date.textContent = post.displayDate;
      item.append(title, date);
      latestList.appendChild(item);
    });
    return;
  }

  const cardGrid = document.querySelector(".card-grid");
  let card = Array.from(cardGrid.querySelectorAll(":scope > [data-managed-category]"))
    .find((element) => element.dataset.managedCategory === category.id);
  if (!card) {
    card = Array.from(cardGrid.children).find((element) => element.id === category.id);
  }
  if (!card && category.homeVisible) {
    card = document.createElement("article");
    card.id = category.id;
    card.dataset.managedCategory = category.id;
    card.dataset.homeVisible = String(category.homeVisible);
    card.className = `update-card ${category.color}-card`;
    card.dataset.navView = category.id;
    const heading = document.createElement("div");
    heading.className = "card-head";
    const title = document.createElement("span");
    heading.appendChild(title);
    const footer = document.createElement("div");
    footer.className = "card-footer";
    const viewAll = document.createElement("a");
    viewAll.className = "card-more-link";
    viewAll.textContent = "View All →";
    footer.appendChild(viewAll);
    const list = document.createElement("ul");
    list.className = "post-list";
    card.append(heading, list, footer);
    cardGrid.appendChild(card);
  }
  if (card) {
    card.dataset.managedCategory = category.id;
    card.dataset.homeVisible = String(category.homeVisible);
    card.hidden = !category.homeVisible;
  }

  const sideCard = document.querySelector(`.right-sidebar [data-nav-view="${category.id}"]`);
  const container = card?.querySelector(".post-list") || (category.homeVisible ? null : sideCard);
  if (!container) return;

  if (container.classList.contains("post-list")) {
    const title = card.querySelector(".card-head span");
    if (title) title.textContent = `${category.icon} ${category.name}`;
    const viewAll = card.querySelector(".card-footer a");
    if (viewAll && category.url) {
      viewAll.href = category.url;
      viewAll.textContent = "View All →";
    }
    container.replaceChildren();
    items.forEach((post) => {
      const entry = document.createElement("li");
      if (post.url) appendSafeLink(entry, post);
      else entry.textContent = post.title;
      if (post.description) entry.title = post.description;
      container.appendChild(entry);
    });
    return;
  }

  Array.from(container.querySelectorAll("a")).forEach((link) => link.remove());
  items.forEach((post) => appendSafeLink(container, post));
}

function bindNavigationLink(link) {
  if (link.dataset.navigationBound) return;
  link.dataset.navigationBound = "true";
  link.addEventListener("click", () => {
    setNavigationView(link.dataset.navView);
    mainNav.classList.remove("open");
  });
}

function renderManagedNavigation(categories, pages) {
  const moreMenu = document.getElementById("moreMenu");
  const pageNames = new Map(pages.map((page) => [page.slug, page.title]));
  moreMenu.querySelectorAll("[data-nav-view]").forEach((link) => {
    const title = pageNames.get(link.dataset.navView);
    if (title) link.textContent = title;
  });

  categories.forEach((category) => {
    const existing = document.querySelector(
      `.nav-inner [data-nav-view="${category.id}"], .more-menu [data-nav-view="${category.id}"]`
    );
    if (!category.navVisible) {
      if (existing) existing.hidden = true;
      return;
    }
    if (existing) {
      existing.hidden = false;
      existing.textContent = `${category.icon} ${category.name}`;
      return;
    }
    const link = document.createElement("a");
    link.href = category.url;
    link.textContent = `${category.icon} ${category.name}`;
    moreMenu.appendChild(link);
  });

  categories.forEach(({ id }) => navigationViews.add(id));
  document.querySelectorAll(".nav-inner [data-nav-view], .more-menu [data-nav-view]")
    .forEach(bindNavigationLink);
}

function applyManagedPages(pages) {
  pages.forEach((page) => {
    if (!page.isCustomized) return;
    const section = document.querySelector(`[data-page-view="${page.slug}"]`);
    if (!section) return;
    const card = section.querySelector(".page-card");
    const eyebrow = card.querySelector(".page-eyebrow");
    card.replaceChildren();
    if (eyebrow) card.appendChild(eyebrow);
    const heading = document.createElement("h1");
    heading.textContent = page.title;
    card.appendChild(heading);
    if (page.intro) {
      const intro = document.createElement("p");
      intro.textContent = page.intro;
      card.appendChild(intro);
    }
    if (page.body) {
      page.body.split(/\n\s*\n/).filter(Boolean).forEach((paragraph) => {
        const body = document.createElement("p");
        body.textContent = paragraph;
        card.appendChild(body);
      });
    }
    if (page.slug !== "contact-us") return;

    const form = document.createElement("form");
    form.className = "contact-form";
    form.id = "contactForm";
    form.action = "#";
    form.method = "post";
    [
      ["Name", "contactName", "name", "text", "name"],
      ["Email", "contactEmail", "email", "email", "email"]
    ].forEach(([labelText, id, name, type, autocomplete]) => {
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = labelText;
      const input = document.createElement("input");
      input.id = id;
      input.name = name;
      input.type = type;
      input.autocomplete = autocomplete;
      input.required = true;
      form.append(label, input);
    });
    const messageLabel = document.createElement("label");
    messageLabel.htmlFor = "contactMessage";
    messageLabel.textContent = "Message";
    const messageInput = document.createElement("textarea");
    messageInput.id = "contactMessage";
    messageInput.name = "message";
    messageInput.rows = 6;
    messageInput.required = true;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit";
    const result = document.createElement("p");
    result.className = "form-notice";
    result.id = "contactResult";
    result.setAttribute("role", "status");
    result.setAttribute("aria-live", "polite");
    form.append(messageLabel, messageInput, submit, result);
    card.appendChild(form);
    form.addEventListener("submit", submitContactForm);
  });
}

function homepageHref(value, fallback = "#") {
  if (typeof value !== "string") return fallback;
  const href = value.trim();
  if (/^https:\/\//i.test(href) || /^mailto:[^\s]+$/i.test(href)
    || /^\/(?!\/)/.test(href) || /^#[a-z0-9_-]+$/i.test(href)) {
    return href;
  }
  return fallback;
}

function renderHomepageLinks(container, links, className = "") {
  if (!container || !Array.isArray(links)) return;
  const heading = container.querySelector(":scope > .side-title");
  container.replaceChildren();
  if (heading) container.appendChild(heading);
  links.forEach((item) => {
    if (!item || typeof item.title !== "string") return;
    if (item.title.trim().toLowerCase() === "customer login"
      || (typeof item.url === "string" && /^\/customer-portal(?:\/|$)/i.test(item.url.trim()))) return;
    const href = homepageHref(item.url, "");
    const link = document.createElement(href ? "a" : "span");
    link.textContent = item.title;
    if (href) link.href = href;
    if (className) link.className = className;
    if (href && /^https:\/\//i.test(link.href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    if (container.tagName === "UL") {
      const entry = document.createElement("li");
      entry.appendChild(link);
      container.appendChild(entry);
    } else {
      container.appendChild(link);
    }
  });
}

function renderHomepageSocials(container, links) {
  if (!container || !Array.isArray(links)) return;
  container.replaceChildren();
  links.forEach((item) => {
    if (!item || typeof item.label !== "string") return;
    const href = homepageHref(item.url, "");
    const link = document.createElement(href ? "a" : "span");
    const network = item.label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
    link.className = `social-link ${network}`;
    link.setAttribute("aria-label", item.label);
    link.title = item.label;
    link.textContent = item.label.slice(0, 1).toLocaleUpperCase();
    if (href) link.href = href;
    if (href && /^https:\/\//i.test(link.href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    container.appendChild(link);
  });
}

function applyHomepageContent(settings) {
  if (!settings || typeof settings !== "object") return;
  const branding = settings.branding || {};
  document.querySelectorAll(".brand h1, .footer-brand h2").forEach((element) => {
    const name = typeof branding.name === "string" ? branding.name.trim() : "";
    if (!name) return;
    const words = name.split(/\s+/);
    element.replaceChildren(document.createTextNode(`${words.slice(0, -1).join(" ")} `));
    const accent = document.createElement("span");
    accent.textContent = words[words.length - 1];
    element.appendChild(accent);
  });
  document.querySelectorAll(".brand p, .footer-brand p").forEach((element) => {
    if (typeof branding.tagline === "string") element.textContent = branding.tagline;
  });
  if (typeof branding.pageTitle === "string") document.title = branding.pageTitle;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && typeof branding.metaDescription === "string") {
    metaDescription.content = branding.metaDescription;
  }
  document.querySelectorAll(".brand-logo").forEach((image) => {
    image.src = homepageHref(branding.logoUrl, image.getAttribute("src"));
    if (typeof branding.logoAlt === "string") image.alt = branding.logoAlt;
  });
  const miniLinks = document.querySelector(".mini-links");
  if (miniLinks && Array.isArray(branding.highlights)) {
    miniLinks.replaceChildren();
    branding.highlights.forEach((text, index) => {
      if (typeof text !== "string") return;
      if (index) {
        const separator = document.createElement("span");
        separator.textContent = "|";
        miniLinks.appendChild(separator);
      }
      const item = document.createElement("span");
      item.textContent = text;
      miniLinks.appendChild(item);
    });
  }
  const navigation = settings.navigation || {};
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchBtn");
  const menuButton = document.getElementById("menuBtn");
  const homeLink = document.querySelector(".nav-inner [data-nav-view='home']");
  const bhoomiNavLink = document.querySelector(".nav-inner [data-nav-view='bihar-bhoomi']");
  const moreToggle = document.getElementById("moreToggle");
  if (searchInput) {
    if (typeof navigation.searchPlaceholder === "string") searchInput.placeholder = navigation.searchPlaceholder;
    if (typeof navigation.searchLabel === "string") searchInput.setAttribute("aria-label", navigation.searchLabel);
  }
  if (searchButton) {
    if (typeof navigation.searchButtonLabel === "string") searchButton.textContent = navigation.searchButtonLabel;
    if (typeof navigation.searchLabel === "string") searchButton.setAttribute("aria-label", navigation.searchLabel);
  }
  if (menuButton && typeof navigation.menuLabel === "string") menuButton.setAttribute("aria-label", navigation.menuLabel);
  if (homeLink) {
    if (typeof navigation.homeLabel === "string") homeLink.textContent = navigation.homeLabel;
    homeLink.href = homepageHref(navigation.homeUrl, homeLink.href);
  }
  if (bhoomiNavLink) {
    if (typeof navigation.bhoomiLabel === "string") bhoomiNavLink.textContent = navigation.bhoomiLabel;
    bhoomiNavLink.href = homepageHref(navigation.bhoomiUrl, bhoomiNavLink.href);
  }
  if (moreToggle && typeof navigation.moreLabel === "string") moreToggle.textContent = navigation.moreLabel;
  if (Array.isArray(navigation.moreLinks)) {
    navigation.moreLinks.forEach((item) => {
      if (!item || typeof item.view !== "string") return;
      const link = Array.from(document.querySelectorAll(".more-menu [data-nav-view]"))
        .find((candidate) => candidate.dataset.navView === item.view);
      if (!link) return;
      if (typeof item.title === "string") link.textContent = item.title;
      link.href = homepageHref(item.url, link.href);
    });
  }

  const hero = settings.hero || {};
  const heroRoot = document.querySelector(".hero-blue");
  if (heroRoot) {
    const eyebrow = heroRoot.querySelector(".eyebrow");
    const title = heroRoot.querySelector("h2");
    const subtitle = heroRoot.querySelector("p");
    const button = heroRoot.querySelector(".yellow-btn");
    if (eyebrow && typeof hero.eyebrow === "string") eyebrow.textContent = hero.eyebrow;
    if (title && typeof hero.title === "string") title.textContent = hero.title;
    if (subtitle && typeof hero.subtitle === "string") subtitle.textContent = hero.subtitle;
    if (button) {
      if (typeof hero.buttonLabel === "string") button.textContent = hero.buttonLabel;
      button.href = homepageHref(hero.buttonUrl);
    }
  }
  const heroInfo = document.querySelector(".hero-info");
  if (heroInfo && Array.isArray(hero.trustPoints)) {
    heroInfo.querySelectorAll("p").forEach((paragraph, index) => {
      paragraph.hidden = typeof hero.trustPoints[index] !== "string";
      if (!paragraph.hidden) paragraph.textContent = `✓ ${hero.trustPoints[index]}`;
    });
  }

  const bhoomiCard = settings.biharBhoomiCard || {};
  const bhoomiRoot = document.querySelector(".home-bhoomi-card");
  if (bhoomiRoot) {
    const badge = bhoomiRoot.querySelector(".new-badge");
    const title = bhoomiRoot.querySelector(".home-bhoomi-copy strong");
    const description = bhoomiRoot.querySelector(".home-bhoomi-copy > span");
    const button = bhoomiRoot.querySelector(".home-bhoomi-cta");
    if (badge && typeof bhoomiCard.badge === "string") badge.textContent = bhoomiCard.badge;
    if (title && typeof bhoomiCard.title === "string") title.textContent = bhoomiCard.title;
    if (description && typeof bhoomiCard.description === "string") description.textContent = bhoomiCard.description;
    bhoomiRoot.href = homepageHref(bhoomiCard.url, "#bihar-bhoomi");
    if (button && typeof bhoomiCard.buttonLabel === "string") {
      button.replaceChildren(document.createTextNode(bhoomiCard.buttonLabel));
      const arrow = document.createElement("b");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      button.appendChild(arrow);
    }
  }

  const aadhaar = settings.aadhaarServices || {};
  const aadhaarRoot = document.querySelector(".aadhaar-services-card");
  if (aadhaarRoot) {
    const title = aadhaarRoot.querySelector(".side-title");
    if (title && typeof aadhaar.title === "string") title.textContent = aadhaar.title;
    renderHomepageLinks(aadhaarRoot.querySelector(".post-list"), aadhaar.items);
  }

  const promos = Array.isArray(settings.promos) ? settings.promos : [];
  [document.querySelector(".left-sidebar .promo"), document.querySelector(".right-sidebar .promo")]
    .forEach((promo, index) => {
      const content = promos[index];
      if (!promo || !content) return;
      const icon = promo.querySelector(".promo-icon");
      const title = promo.querySelector("h3");
      const button = promo.querySelector(".yellow-btn");
      if (icon && typeof content.icon === "string") icon.textContent = content.icon;
      if (title && typeof content.title === "string") title.textContent = content.title;
      if (button) {
        if (typeof content.buttonLabel === "string") button.textContent = content.buttonLabel;
        button.href = homepageHref(content.buttonUrl);
      }
    });

  const socials = settings.socialLinks;
  renderHomepageSocials(document.querySelector(".left-sidebar .socials"), socials);
  const footerSocials = settings.footer?.socialLinks || socials;
  renderHomepageSocials(document.querySelector(".footer-socials"), footerSocials);

  const rtps = settings.rtps || {};
  const rtpsRoot = document.querySelector(".rtps-services-card");
  if (rtpsRoot) {
    const title = rtpsRoot.querySelector(".card-head > span");
    if (title && typeof rtps.title === "string") title.textContent = rtps.title;
    const list = rtpsRoot.querySelector(":scope > .post-list");
    if (list && Array.isArray(rtps.services)) {
      const legacyIds = ["caste", "residential", "income", "conduct", "ncl", "track", "download"];
      const legacyServices = Array.from(list.children, (entry, index) => {
        const label = entry.querySelector(".certificate-service-toggle, a") || entry;
        return {
          id: entry.dataset.legacyId || entry.dataset.certificateId || legacyIds[index],
          title: label.textContent.trim(),
          links: Array.from(entry.querySelectorAll("a"), (link) => link.href),
        };
      });
      const legacyOffsets = new Map();
      const getLegacyService = (service) => {
        const id = typeof service.id === "string" && service.id.startsWith("ncl-") ? "ncl" : service.id;
        return legacyServices.find((legacy) => legacy.id === id)
          || legacyServices.find((legacy) => legacy.title === service.title);
      };
      list.replaceChildren();
      rtps.services.forEach((service, index) => {
        if (!service || typeof service.title !== "string") return;
        const entry = document.createElement("li");
        if (typeof service.id === "string") {
          entry.dataset.certificateId = service.id;
          entry.dataset.legacyId = service.id.startsWith("ncl-") ? "ncl" : service.id;
        }
        const options = Array.isArray(service.options) ? service.options : [];
        const legacyService = getLegacyService(service);
        let legacyOffset = legacyOffsets.get(legacyService) || 0;
        if (options.length) {
          entry.className = "certificate-service-menu";
          const dropdownId = `homepageRtpsDropdown${index}`;
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "certificate-service-toggle";
          toggle.textContent = service.title;
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-haspopup", "true");
          toggle.setAttribute("aria-controls", dropdownId);
          const dropdown = document.createElement("div");
          dropdown.id = dropdownId;
          dropdown.className = "certificate-service-dropdown";
          options.forEach((option) => {
            const optionTitle = typeof option === "string" ? option : option?.title;
            const optionUrl = typeof option === "object" && option ? option.url : "";
            const fallback = legacyService?.links[legacyOffset++] || "#";
            if (typeof optionTitle !== "string") return;
            const link = document.createElement("a");
            link.textContent = optionTitle;
            link.href = homepageHref(optionUrl, fallback);
            link.dataset.certificateService = "";
            if (/^https:\/\//i.test(link.href)) {
              link.target = "_blank";
              link.rel = "noopener noreferrer";
            }
            dropdown.appendChild(link);
          });
          if (legacyService) legacyOffsets.set(legacyService, legacyOffset);
          entry.append(toggle, dropdown);
        } else if ((typeof service.url === "string" && service.url.trim()) || legacyService?.links[0]) {
          const link = document.createElement("a");
          link.textContent = service.title;
          link.href = homepageHref(service.url, legacyService?.links[0] || "#");
          link.dataset.certificateService = "";
          if (/^https:\/\//i.test(link.href)) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
          entry.appendChild(link);
          if (legacyService) legacyOffsets.set(legacyService, 1);
        } else {
          entry.textContent = service.title;
        }
        list.appendChild(entry);
      });
    }
  }

  const about = settings.about || {};
  const aboutRoot = document.querySelector(".about");
  if (aboutRoot) {
    const title = aboutRoot.querySelector("h2");
    const description = aboutRoot.querySelector(":scope > div > p");
    const slogan = aboutRoot.querySelector(".about-slogan");
    if (title && typeof about.title === "string") title.textContent = about.title;
    if (description && typeof about.description === "string") description.textContent = about.description;
    if (slogan && typeof about.slogan === "string") slogan.textContent = about.slogan;
    const points = aboutRoot.querySelector(".about-points");
    if (points && Array.isArray(about.points)) {
      points.replaceChildren();
      about.points.forEach((text) => {
        if (typeof text !== "string") return;
        const paragraph = document.createElement("p");
        paragraph.textContent = `✓ ${text}`;
        points.appendChild(paragraph);
      });
    }
  }

  const bhoomiPage = settings.bhoomiPage || {};
  const bhoomiRootPage = document.querySelector(".bhoomi-page");
  if (bhoomiRootPage) {
    const textFields = [
      [".bhoomi-eyebrow", "eyebrow"],
      [".bhoomi-hero > .new-badge", "badge"],
      ["#bhoomiTitle", "title"],
      [".bhoomi-hero > p", "description"],
      [".bhoomi-notice", "notice"],
      [".bhoomi-help-link", "helpLabel"],
      ["#bhoomiPopularTitle", "popularTitle"],
      [".bhoomi-popular .bhoomi-section-heading > div > span", "popularEyebrow"],
      ["#bhoomiDirectoryTitle", "directoryTitle"],
      [".bhoomi-directory .bhoomi-section-heading > div > span", "directoryEyebrow"],
      ["#bhoomiSearch", "searchPlaceholder"],
      ["#bhoomiEmpty", "emptyMessage"],
      [".bhoomi-support h2", "supportTitle"],
      [".bhoomi-support p", "supportDescription"],
      [".bhoomi-support > a", "supportLinkLabel"],
      [".bhoomi-modal-head .bhoomi-eyebrow", "modalEyebrow"],
      [".bhoomi-modal-content > h3:first-of-type", "modalPreparationTitle"],
      [".bhoomi-modal-content > p:nth-of-type(2)", "modalPreparationText"],
      [".bhoomi-modal-content > h3:nth-of-type(2)", "modalProcessTitle"],
      [".bhoomi-modal-warning", "modalWarning"],
      ["#bhoomiModalLink", "modalOpenLabel"],
    ];
    textFields.forEach(([selector, key]) => {
      const element = bhoomiRootPage.querySelector(selector)
        || document.querySelector(`.bhoomi-modal ${selector}`);
      if (!element || typeof bhoomiPage[key] !== "string") return;
      if (key === "searchPlaceholder") element.placeholder = bhoomiPage[key];
      else element.textContent = bhoomiPage[key];
    });
    const helpLink = bhoomiRootPage.querySelector(".bhoomi-help-link");
    const bhoomiSearch = document.getElementById("bhoomiSearch");
    const modalClose = document.getElementById("bhoomiModalClose");
    const supportLink = document.querySelector(".bhoomi-support > a");
    const modalLink = document.getElementById("bhoomiModalLink");
    if (helpLink) helpLink.href = homepageHref(bhoomiPage.helpUrl, helpLink.href);
    if (bhoomiSearch && typeof bhoomiPage.searchLabel === "string") {
      bhoomiSearch.setAttribute("aria-label", bhoomiPage.searchLabel);
    }
    if (modalClose && typeof bhoomiPage.modalCloseLabel === "string") {
      modalClose.setAttribute("aria-label", bhoomiPage.modalCloseLabel);
    }
    if (supportLink) supportLink.href = homepageHref(bhoomiPage.helpUrl, supportLink.href);
    if (modalLink) modalLink.textContent = typeof bhoomiPage.modalOpenLabel === "string"
      ? bhoomiPage.modalOpenLabel
      : modalLink.textContent;
    const process = document.querySelector(".bhoomi-modal-content ol");
    if (process && Array.isArray(bhoomiPage.modalProcess)) {
      process.replaceChildren();
      bhoomiPage.modalProcess.forEach((text) => {
        if (typeof text !== "string") return;
        const item = document.createElement("li");
        item.textContent = text;
        process.appendChild(item);
      });
    }
  }
  if (Array.isArray(settings.bhoomiServices)) {
    bhoomiServices = settings.bhoomiServices
      .filter((service) => service && typeof service.id === "string" && typeof service.title === "string")
      .map((service) => ({
        id: service.id,
        icon: typeof service.icon === "string" ? service.icon : "",
        title: service.title,
        description: typeof service.description === "string" ? service.description : "",
        category: typeof service.category === "string" ? service.category : "other",
        categoryName: typeof service.categoryName === "string" ? service.categoryName : "Other",
        href: homepageHref(service.href, ""),
        keywords: typeof service.keywords === "string" ? service.keywords : "",
      }));
    const categorySelect = document.getElementById("bhoomiCategory");
    const categoryValues = new Map(bhoomiServices.map((service) => [service.category, service.categoryName]));
    if (categorySelect) {
      const selected = categorySelect.value;
      categorySelect.replaceChildren();
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "सभी श्रेणियाँ";
      categorySelect.appendChild(allOption);
      categoryValues.forEach((label, value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        categorySelect.appendChild(option);
      });
      if (categoryValues.has(selected)) categorySelect.value = selected;
    }
    const featured = document.getElementById("bhoomiFeatured");
    if (featured) {
      featured.replaceChildren(...bhoomiServices.slice(0, 4).map((service) => createBhoomiServiceCard(service, true)));
    }
    if (typeof renderBhoomiServices === "function") renderBhoomiServices();
  }

  const pagesContent = settings.pages || {};
  const aboutPage = pagesContent.aboutUs || {};
  const aboutPageCard = document.querySelector("#about-us .page-card");
  if (aboutPageCard) {
    const eyebrow = aboutPageCard.querySelector(".page-eyebrow");
    if (eyebrow && typeof aboutPage.eyebrow === "string") eyebrow.textContent = aboutPage.eyebrow;
    const title = aboutPageCard.querySelector("h1");
    if (title && typeof aboutPage.title === "string") title.textContent = aboutPage.title;
    const intro = aboutPageCard.querySelector("p");
    if (intro && typeof aboutPage.intro === "string") intro.textContent = aboutPage.intro;
    const listTitle = aboutPageCard.querySelector("h2");
    if (listTitle && typeof aboutPage.listTitle === "string") listTitle.textContent = aboutPage.listTitle;
    const list = aboutPageCard.querySelector(".page-list");
    if (list && Array.isArray(aboutPage.points)) {
      list.replaceChildren();
      aboutPage.points.forEach((text) => {
        if (typeof text !== "string") return;
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
      });
    }
    const closing = aboutPageCard.querySelectorAll("p")[1];
    if (closing && typeof aboutPage.closing === "string") closing.textContent = aboutPage.closing;
  }
  const contactPage = pagesContent.contact || {};
  const contactPageRoot = document.querySelector("#contact-us .page-card");
  if (contactPageRoot) {
    const eyebrow = contactPageRoot.querySelector(".page-eyebrow");
    const title = contactPageRoot.querySelector("h1");
    const intro = contactPageRoot.querySelector("p");
    if (eyebrow && typeof contactPage.eyebrow === "string") eyebrow.textContent = contactPage.eyebrow;
    if (title && typeof contactPage.title === "string") title.textContent = contactPage.title;
    if (intro && typeof contactPage.intro === "string") intro.textContent = contactPage.intro;
    [["contactName", "nameLabel"], ["contactEmail", "emailLabel"], ["contactMessage", "messageLabel"]]
      .forEach(([id, key]) => {
        const label = contactPageRoot.querySelector(`label[for="${id}"]`);
        if (label && typeof contactPage[key] === "string") label.textContent = contactPage[key];
      });
    const submit = contactPageRoot.querySelector("button[type='submit']");
    if (submit && typeof contactPage.submitLabel === "string") submit.textContent = contactPage.submitLabel;
  }
  const termsPage = pagesContent.terms || {};
  const termsCard = document.querySelector("#terms-and-conditions .page-card");
  if (termsCard) {
    const eyebrow = termsCard.querySelector(".page-eyebrow");
    if (eyebrow && typeof termsPage.eyebrow === "string") eyebrow.textContent = termsPage.eyebrow;
    termsCard.replaceChildren(...(eyebrow ? [eyebrow] : []));
    if (typeof termsPage.title === "string") {
      const title = document.createElement("h1");
      title.textContent = termsPage.title;
      termsCard.appendChild(title);
    }
    if (typeof termsPage.intro === "string") {
      const intro = document.createElement("p");
      intro.textContent = termsPage.intro;
      termsCard.appendChild(intro);
    }
    if (Array.isArray(termsPage.sections)) {
      termsPage.sections.forEach((section) => {
        if (!section || typeof section.title !== "string" || typeof section.body !== "string") return;
        const heading = document.createElement("h2");
        heading.textContent = section.title;
        const body = document.createElement("p");
        body.textContent = section.body;
        termsCard.append(heading, body);
      });
    }
  }

  const sidebar = settings.rightSidebar || {};
  const latestNews = document.querySelector(".right-sidebar .news-side");
  if (latestNews) {
    const title = latestNews.querySelector(".side-title");
    if (title && typeof sidebar.latestNewsTitle === "string") title.textContent = sidebar.latestNewsTitle;
    Array.from(latestNews.children).forEach((child) => {
      if (!child.classList.contains("side-title")) child.remove();
    });
    if (Array.isArray(sidebar.latestNews)) {
      sidebar.latestNews.forEach((item) => {
        if (!item || typeof item.title !== "string") return;
        const link = document.createElement("a");
        link.textContent = item.title;
        const href = homepageHref(item.url, "");
        if (href) link.href = href;
        if (typeof item.displayDate === "string" && item.displayDate) {
          const date = document.createElement("small");
          date.textContent = item.displayDate;
          link.appendChild(date);
        }
        if (href && /^https:\/\//i.test(link.href)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        latestNews.appendChild(link);
      });
    }
  }
  const important = document.querySelector(".right-sidebar [data-nav-view='important-links']");
  if (important) {
    const title = important.querySelector(".side-title");
    if (title && typeof sidebar.importantLinksTitle === "string") title.textContent = sidebar.importantLinksTitle;
    const links = Array.isArray(sidebar.importantLinks)
      ? sidebar.importantLinks.filter((item) => item && typeof item.title === "string").map((item) => ({ ...item, title: `${item.title} ›` }))
      : sidebar.importantLinks;
    renderHomepageLinks(important, links);
  }
  const popular = document.querySelector(".right-sidebar [data-nav-view='popular-searches']");
  if (popular) {
    const title = popular.querySelector(".side-title");
    if (title && typeof sidebar.popularSearchesTitle === "string") title.textContent = sidebar.popularSearchesTitle;
    const links = Array.isArray(sidebar.popularSearches)
      ? sidebar.popularSearches.filter((item) => item && typeof item.title === "string").map((item) => ({ ...item, title: `› ${item.title}` }))
      : sidebar.popularSearches;
    renderHomepageLinks(popular, links);
  }

  const footer = settings.footer || {};
  const footerTagline = document.querySelector(".footer-brand p");
  if (footerTagline && typeof footer.tagline === "string") footerTagline.textContent = footer.tagline;
  const footerGroups = Array.from(document.querySelectorAll(".footer-grid > div"));
  const quick = footerGroups[1];
  const pages = footerGroups[2];
  const socialsColumn = footerGroups[3];
  const subscribe = footerGroups[4];
  [[quick, footer.quickLinksTitle, footer.quickLinks], [pages, footer.importantPagesTitle, footer.importantPages]]
    .forEach(([column, heading, links]) => {
      if (!column) return;
      const title = column.querySelector("h3");
      if (title && typeof heading === "string") title.textContent = heading;
      renderHomepageLinks(column, links);
    });
  if (socialsColumn) {
    const title = socialsColumn.querySelector("h3");
    if (title && typeof footer.socialTitle === "string") title.textContent = footer.socialTitle;
  }
  if (subscribe) {
    const title = subscribe.querySelector("h3");
    const input = subscribe.querySelector("input");
    const button = subscribe.querySelector("button");
    if (title && typeof footer.subscribeTitle === "string") title.textContent = footer.subscribeTitle;
    if (input && typeof footer.emailPlaceholder === "string") input.placeholder = footer.emailPlaceholder;
    if (button && typeof footer.subscribeButtonLabel === "string") button.textContent = footer.subscribeButtonLabel;
  }
  const copyright = document.querySelector(".copyright .container");
  if (copyright) {
    const spans = copyright.querySelectorAll("span");
    if (spans[0] && typeof footer.copyright === "string") spans[0].textContent = `© ${new Date().getFullYear()} ${footer.copyright}`;
    if (spans[1] && typeof footer.motto === "string") spans[1].textContent = footer.motto;
  }
}

async function loadManagedSiteContent() {
  try {
    const response = await fetch(siteContentApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Site content request failed (${response.status}).`);
    const result = await response.json();
    const content = result.data;
    if (!content || !Array.isArray(content.categories) || !Array.isArray(content.items)) {
      throw new Error("The site content response is invalid.");
    }

    const { categories, items, pages, settings } = content;
    const categoryIds = new Set(categories.map((category) => category.id));
    knownSiteCategoryIds.forEach((id) => {
      if (categoryIds.has(id)) return;
      document.querySelectorAll(`[data-nav-view="${id}"]`).forEach((element) => {
        element.hidden = true;
      });
      const staleCard = Array.from(document.querySelectorAll(".card-grid > article"))
        .find((element) => element.id === id);
      if (staleCard) staleCard.hidden = true;
    });
    applyHomepageContent(settings);

    renderManagedNavigation(categories, pages || []);
    applyManagedPages(pages || []);
    categories.forEach((category) => {
      const existingCard = Array.from(document.querySelectorAll(".card-grid > article"))
        .find((element) => element.id === category.id);
      if (existingCard) {
        existingCard.dataset.managedCategory = category.id;
        existingCard.dataset.homeVisible = String(category.homeVisible);
      }
      const categoryItems = items.filter((item) => item.categoryId === category.id);
      if (categoryItems.length || category.managedContent) {
        renderManagedCategory(category, categoryItems);
      }
    });
    const cardGrid = document.querySelector(".card-grid");
    categories
      .filter((category) => category.homeVisible)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .forEach((category) => {
        const card = Array.from(cardGrid.children).find((element) => element.id === category.id);
        if (card) cardGrid.appendChild(card);
      });
    setNavigationView(window.location.hash.slice(1));
  } catch (error) {
    console.error("Could not load managed site content:", error);
  }
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
  element.querySelectorAll("a[data-keywords], a[data-search]").forEach((link) => {
    values.push(link.dataset.keywords, link.dataset.search);
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

let searchRequestId = 0;
let searchDebounce;

async function showSearchResults() {
  const rawQuery = searchInput.value.trim();
  const query = rawQuery.toLocaleLowerCase();
  const requestId = ++searchRequestId;
  searchResults.replaceChildren();
  searchResults.hidden = !query;
  if (!query) return;

  const terms = query.split(/\s+/).filter(Boolean);
  const matches = getSearchIndex().filter(({ searchableText }) =>
    terms.every((term) => searchableText.includes(term))
  );

  matches.forEach(({ element, text, context }) => {
    const articleLink = element.matches("a[data-article-link]")
      ? element
      : element.querySelector("a[data-article-link]");
    const result = document.createElement(articleLink ? "a" : "button");
    result.className = "search-result";
    if (articleLink) {
      result.href = articleLink.href;
    } else {
      result.type = "button";
      result.setAttribute("role", "option");
    }

    const title = document.createElement("strong");
    highlightText(title, text.slice(0, 90), terms);
    result.appendChild(title);

    const snippet = makeSnippet(`${context ? `${context} · ` : ""}${text}`, terms);
    if (snippet.toLocaleLowerCase() !== text.slice(0, 90).toLocaleLowerCase()) {
      const description = document.createElement("small");
      highlightText(description, snippet, terms);
      result.appendChild(description);
    }

    if (!articleLink) {
      result.addEventListener("click", () => {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        searchResults.hidden = true;
      });
    }
    searchResults.appendChild(result);
  });

  if (!matches.length) {
    const loading = document.createElement("div");
    loading.className = "search-empty";
    loading.textContent = "Searching published articles…";
    searchResults.appendChild(loading);
  }

  try {
    const response = await fetch(`${articleSearchApiUrl}?q=${encodeURIComponent(rawQuery)}&limit=12`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Article search request failed (${response.status}).`);
    const result = await response.json();
    if (requestId !== searchRequestId || searchInput.value.trim() !== rawQuery) return;

    const existingUrls = new Set(Array.from(searchResults.querySelectorAll("a.search-result"), (link) => link.href));
    (Array.isArray(result.data) ? result.data : []).forEach((article) => {
      if (!article.url || existingUrls.has(article.url)) return;
      const link = document.createElement("a");
      link.className = "search-result";
      link.href = article.url;
      const title = document.createElement("strong");
      highlightText(title, article.title, terms);
      const description = document.createElement("small");
      const summary = [article.category, article.shortDescription].filter(Boolean).join(" · ");
      highlightText(description, summary, terms);
      link.append(title, description);
      searchResults.appendChild(link);
      existingUrls.add(article.url);
    });
    if (!searchResults.querySelector(".search-result")) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "search-empty";
      emptyMessage.textContent = "No results found";
      searchResults.replaceChildren(emptyMessage);
    }
  } catch (error) {
    if (requestId !== searchRequestId || searchInput.value.trim() !== rawQuery) return;
    console.error("Could not search published articles:", error);
    if (!searchResults.querySelector(".search-result")) {
      const unavailable = document.createElement("div");
      unavailable.className = "search-empty";
      unavailable.textContent = "Search is temporarily unavailable.";
      searchResults.replaceChildren(unavailable);
    }
  }
}

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchDebounce);
  searchDebounce = window.setTimeout(showSearchResults, 180);
});
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    window.clearTimeout(searchDebounce);
    showSearchResults();
  } else if (event.key === "Escape") {
    searchInput.value = "";
    window.clearTimeout(searchDebounce);
    showSearchResults();
  }
});
searchBtn.addEventListener("click", showSearchResults);

menuBtn.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
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
  "bihar-bhoomi",
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
  const customCard = Array.from(document.querySelectorAll(".card-grid > [data-managed-category]"))
    .find((card) => card.dataset.managedCategory === selectedView);
  document.querySelectorAll(".card-grid > [data-managed-category]").forEach((card) => {
    card.style.display = customCard
      ? card === customCard ? "block" : "none"
      : "";
  });

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

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const toggle = target?.closest(".certificate-service-toggle");
  if (toggle) {
    const menu = toggle.closest(".certificate-service-menu");
    const isOpen = menu.classList.toggle("is-open");
    menu.parentElement.querySelectorAll(".certificate-service-menu").forEach((sibling) => {
      if (sibling === menu) return;
      sibling.classList.remove("is-open");
      sibling.querySelector(".certificate-service-toggle")?.setAttribute("aria-expanded", "false");
    });
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) {
      menu.querySelectorAll(".certificate-level-option.is-open").forEach((option) => {
        option.classList.remove("is-open");
        option.querySelector(".certificate-level-toggle")?.setAttribute("aria-expanded", "false");
      });
    }
    return;
  }

  const levelToggle = target?.closest(".certificate-level-toggle");
  if (levelToggle) {
    const option = levelToggle.closest(".certificate-level-option");
    const menu = levelToggle.closest(".certificate-service-menu");
    const isOpen = option.classList.toggle("is-open");
    menu.querySelectorAll(".certificate-level-option").forEach((sibling) => {
      if (sibling === option) return;
      sibling.classList.remove("is-open");
      sibling.querySelector(".certificate-level-toggle")?.setAttribute("aria-expanded", "false");
    });
    levelToggle.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  const serviceLink = target?.closest("[data-certificate-service]");
  if (serviceLink?.getAttribute("href") === "#") {
    event.preventDefault();
  }
  if (!target?.closest(".certificate-service-menu")) {
    document.querySelectorAll(".certificate-service-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      menu.querySelector(".certificate-service-toggle")?.setAttribute("aria-expanded", "false");
    });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".certificate-service-menu.is-open").forEach((menu) => {
    const openLevel = menu.querySelector(".certificate-level-option.is-open");
    if (openLevel) {
      openLevel.classList.remove("is-open");
      const levelToggle = openLevel.querySelector(".certificate-level-toggle");
      levelToggle?.setAttribute("aria-expanded", "false");
      levelToggle?.focus();
      return;
    }
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    const toggle = menu.querySelector(".certificate-service-toggle");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.focus();
  });
});

window.addEventListener("hashchange", () => {
  setNavigationView(window.location.hash.slice(1));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-right")) searchResults.hidden = true;
});

renderPosts();
setNavigationView(window.location.hash.slice(1));
loadManagedSiteContent();

let bhoomiServices = [
  {
    id: "portal",
    icon: "🏛",
    title: "Bihar Bhumi Official Portal",
    description: "राजस्व एवं भूमि सुधार विभाग, बिहार सरकार का आधिकारिक भूमि सेवा पोर्टल।",
    category: "records",
    categoryName: "जमीन का रिकॉर्ड",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/",
    keywords: "official portal बिहार भूमि विभाग"
  },
  {
    id: "apna-khata",
    icon: "📒",
    title: "अपना खाता / जमाबंदी पंजी देखें",
    description: "ऑनलाइन जमाबंदी पंजी खोजने और जमीन के खाते का रिकॉर्ड देखने के लिए।",
    category: "records",
    categoryName: "जमीन का रिकॉर्ड",
    href: "https://emutation.bihar.gov.in/biharBhumireport/ViewJamabandi.aspx",
    keywords: "apna khata jamabandi khata register"
  },
  {
    id: "jamabandi",
    icon: "📄",
    title: "जमाबंदी विवरण देखें",
    description: "जिला और क्षेत्र चुनकर उपलब्ध जमाबंदी विवरण आधिकारिक पोर्टल पर देखें।",
    category: "records",
    categoryName: "जमीन का रिकॉर्ड",
    href: "https://emutation.bihar.gov.in/biharBhumireport/ViewJamabandi.aspx",
    keywords: "jamabandi details record"
  },
  {
    id: "khata-khesra",
    icon: "🔎",
    title: "खेसरा एवं खाता संख्या से रिकॉर्ड खोजें",
    description: "खाता और खेसरा से संबंधित भूमि रिकॉर्ड खोजने के लिए आधिकारिक जमाबंदी सेवा खोलें।",
    category: "records",
    categoryName: "जमीन का रिकॉर्ड",
    href: "https://emutation.bihar.gov.in/biharBhumireport/ViewJamabandi.aspx",
    keywords: "khesra khasra khata land record search"
  },
  {
    id: "mutation-apply",
    icon: "📝",
    title: "दाखिल-खारिज (Mutation) आवेदन",
    description: "बिहार भूमि पोर्टल के नागरिक लॉगिन से दाखिल-खारिज आवेदन शुरू करें।",
    category: "applications",
    categoryName: "आवेदन एवं स्थिति",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/UserLogin.aspx",
    keywords: "mutation दाखिल खारिज apply application"
  },
  {
    id: "mutation-status",
    icon: "📍",
    title: "दाखिल-खारिज आवेदन की स्थिति",
    description: "आवेदन की प्रगति देखने के लिए आधिकारिक म्यूटेशन स्थिति पेज खोलें।",
    category: "applications",
    categoryName: "आवेदन एवं स्थिति",
    href: "https://emutation.bihar.gov.in/biharBhumireport/MutationStatusNew.aspx",
    keywords: "mutation status track application"
  },
  {
    id: "land-tax",
    icon: "💳",
    title: "भू-लगान ऑनलाइन भुगतान",
    description: "आधिकारिक भू-लगान पोर्टल पर जमीन का लगान देखें और भुगतान करें।",
    category: "revenue",
    categoryName: "लगान एवं नक्शा",
    href: "https://www.bhulagan.bihar.gov.in/",
    keywords: "bhu lagan land tax payment"
  },
  {
    id: "lagan-receipt",
    icon: "🧾",
    title: "भू-लगान स्थिति एवं रसीद",
    description: "भुगतान की स्थिति जाँचें और उपलब्ध होने पर आधिकारिक पोर्टल से रसीद प्राप्त करें।",
    category: "revenue",
    categoryName: "लगान एवं नक्शा",
    href: "https://www.bhulagan.bihar.gov.in/",
    keywords: "payment status receipt failed transaction"
  },
  {
    id: "lpc",
    icon: "📜",
    title: "LPC (भूमि कब्जा प्रमाणपत्र)",
    description: "LPC आवेदन के लिए नागरिक लॉगिन और आवेदन स्थिति के लिए आधिकारिक सेवा खोलें।",
    category: "applications",
    categoryName: "आवेदन एवं स्थिति",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/UserLogin.aspx",
    keywords: "lpc land possession certificate"
  },
  {
    id: "map",
    icon: "🗺️",
    title: "भू-नक्शा / जमीन का नक्शा",
    description: "बिहार के भू-मानचित्र देखने के लिए राजस्व एवं भूमि अभिलेख निदेशालय का पोर्टल।",
    category: "revenue",
    categoryName: "लगान एवं नक्शा",
    href: "https://bhunaksha.bihar.gov.in/10/index.jsp",
    keywords: "bhu naksha land map survey"
  },
  {
    id: "parimarjan",
    icon: "✏️",
    title: "परिमार्जन प्लस (जमाबंदी सुधार)",
    description: "जमाबंदी से संबंधित सुधार के लिए बिहार सरकार का परिमार्जन प्लस पोर्टल।",
    category: "applications",
    categoryName: "आवेदन एवं स्थिति",
    href: "https://parimarjanplus.bihar.gov.in/ParimarjanNew/userDashboard.aspx",
    keywords: "parimarjan plus correction jamabandi sudhar"
  },
  {
    id: "online-applications",
    icon: "📲",
    title: "ऑनलाइन आवेदन एवं आवेदन स्थिति",
    description: "भूमि सेवाओं के आवेदन और स्थिति के लिए आधिकारिक बिहार भूमि पोर्टल पर जाएँ।",
    category: "applications",
    categoryName: "आवेदन एवं स्थिति",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/",
    keywords: "online application status track"
  },
  {
    id: "land-disputes",
    icon: "⚖️",
    title: "भूमि विवाद से संबंधित सेवाएँ",
    description: "राजस्व न्यायालय की उपलब्ध वाद-सूची और भूमि विवाद से संबंधित सेवाएँ देखें।",
    category: "courts",
    categoryName: "विवाद एवं न्यायालय",
    href: "https://emutation.bihar.gov.in/biharBhumireport/View_Cause_List",
    keywords: "land dispute cause list objection"
  },
  {
    id: "revenue-courts",
    icon: "🏢",
    title: "राजस्व न्यायालय सेवाएँ",
    description: "राजस्व न्यायालय प्रबंधन प्रणाली (RCMS) का आधिकारिक पोर्टल खोलें।",
    category: "courts",
    categoryName: "विवाद एवं न्यायालय",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/RCMS/RCMSDefault.aspx",
    keywords: "revenue court rcms tribunal"
  },
  {
    id: "orders-notices",
    icon: "📢",
    title: "जमीन संबंधी आम सूचना एवं नवीनतम जानकारी",
    description: "बिहार भूमि पोर्टल पर उपलब्ध दाखिल-खारिज की आम सूचनाएँ देखें।",
    category: "notices",
    categoryName: "आदेश एवं सूचनाएँ",
    href: "https://biharbhumi.bihar.gov.in/Biharbhumi/MutationReport.aspx",
    keywords: "orders notices latest information mutation report"
  }
];

const bhoomiFeatured = document.getElementById("bhoomiFeatured");
const bhoomiServicesContainer = document.getElementById("bhoomiServices");
const bhoomiSearch = document.getElementById("bhoomiSearch");
const bhoomiCategory = document.getElementById("bhoomiCategory");
const bhoomiCount = document.getElementById("bhoomiCount");
const bhoomiEmpty = document.getElementById("bhoomiEmpty");
const bhoomiPopularSection = document.getElementById("bhoomiPopularSection");
const bhoomiModal = document.getElementById("bhoomiModal");
const bhoomiModalTitle = document.getElementById("bhoomiModalTitle");
const bhoomiModalDescription = document.getElementById("bhoomiModalDescription");
const bhoomiModalLink = document.getElementById("bhoomiModalLink");

function createBhoomiServiceCard(service, featured = false) {
  const card = document.createElement("article");
  card.className = "bhoomi-service-card";
  card.dataset.serviceId = service.id;

  const category = document.createElement("span");
  category.className = "bhoomi-service-category";
  category.textContent = service.categoryName;

  const top = document.createElement("div");
  top.className = "bhoomi-service-top";
  const icon = document.createElement("span");
  icon.className = "bhoomi-service-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = service.icon;
  const title = document.createElement("h3");
  title.textContent = service.title;
  top.append(icon, title);

  const description = document.createElement("p");
  description.textContent = service.description;

  const actions = document.createElement("div");
  actions.className = "bhoomi-service-actions";
  if (service.href) {
    const open = document.createElement("a");
    open.className = "bhoomi-open-button";
    open.href = homepageHref(service.href);
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "Open Service ↗";
    actions.appendChild(open);
  } else {
    const unavailable = document.createElement("span");
    unavailable.className = "bhoomi-link-unavailable";
    unavailable.textContent = "Official Link Coming Soon";
    actions.appendChild(unavailable);
  }

  const details = document.createElement("button");
  details.className = "bhoomi-details-button";
  details.type = "button";
  details.dataset.bhoomiDetails = service.id;
  details.textContent = "जानकारी";
  actions.appendChild(details);
  card.append(category, top, description, actions);
  if (featured) card.classList.add("bhoomi-featured-card");
  return card;
}

function renderBhoomiServices() {
  const query = bhoomiSearch.value.trim().toLocaleLowerCase();
  const category = bhoomiCategory.value;
  const filtered = bhoomiServices.filter((service) => {
    const matchesCategory = category === "all" || service.category === category;
    const searchable = `${service.title} ${service.description} ${service.categoryName} ${service.keywords}`.toLocaleLowerCase();
    return matchesCategory && (!query || searchable.includes(query));
  });

  bhoomiServicesContainer.replaceChildren(...filtered.map((service) => createBhoomiServiceCard(service)));
  bhoomiCount.textContent = `${filtered.length} सेवाएँ`;
  bhoomiEmpty.hidden = filtered.length !== 0;
  bhoomiPopularSection.hidden = Boolean(query) || category !== "all";
}

function showBhoomiServiceDetails(serviceId) {
  const service = bhoomiServices.find((item) => item.id === serviceId);
  if (!service) return;
  bhoomiModalTitle.textContent = service.title;
  bhoomiModalDescription.textContent = service.description;
  if (service.href) {
    bhoomiModalLink.href = homepageHref(service.href);
    bhoomiModalLink.hidden = false;
  } else {
    bhoomiModalLink.removeAttribute("href");
    bhoomiModalLink.hidden = true;
  }
  bhoomiModal.showModal();
}

bhoomiServices.slice(0, 4).forEach((service) => {
  bhoomiFeatured.appendChild(createBhoomiServiceCard(service, true));
});
renderBhoomiServices();
bhoomiSearch.addEventListener("input", renderBhoomiServices);
bhoomiCategory.addEventListener("change", renderBhoomiServices);
bhoomiServicesContainer.addEventListener("click", (event) => {
  const detailsButton = event.target.closest("[data-bhoomi-details]");
  if (detailsButton) showBhoomiServiceDetails(detailsButton.dataset.bhoomiDetails);
});
bhoomiFeatured.addEventListener("click", (event) => {
  const detailsButton = event.target.closest("[data-bhoomi-details]");
  if (detailsButton) showBhoomiServiceDetails(detailsButton.dataset.bhoomiDetails);
});
document.getElementById("bhoomiModalClose").addEventListener("click", () => bhoomiModal.close());
bhoomiModal.addEventListener("click", (event) => {
  if (event.target === bhoomiModal) bhoomiModal.close();
});
