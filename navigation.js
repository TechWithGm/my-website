(() => {
  "use strict";

  const navInner = document.querySelector(".nav-inner");
  const primaryLinks = document.querySelector(".nav-primary-links");
  const overflow = document.querySelector(".nav-more");
  const menu = document.querySelector(".nav-more-menu");
  const toggle = document.querySelector(".nav-more-toggle");
  if (!navInner || !primaryLinks || !overflow || !menu || !toggle) return;

  const links = [
    ...primaryLinks.querySelectorAll(":scope > a"),
    ...menu.querySelectorAll(":scope > a")
  ];

  function distributeLinks() {
    links.forEach((link) => primaryLinks.appendChild(link));
    menu.replaceChildren();
    overflow.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;

    const gap = Number.parseFloat(getComputedStyle(primaryLinks).columnGap) || 0;
    const linkWidths = links.map((link) => link.getBoundingClientRect().width);
    const totalWidth = linkWidths.reduce((total, width) => total + width + gap, 0) - gap;
    if (totalWidth <= navInner.clientWidth) return;

    overflow.hidden = false;
    const availableWidth = Math.max(0, navInner.clientWidth - overflow.getBoundingClientRect().width - 8);
    let usedWidth = 0;
    let visibleCount = 0;
    for (const width of linkWidths) {
      const itemWidth = width + (visibleCount ? gap : 0);
      if (usedWidth + itemWidth > availableWidth) break;
      usedWidth += itemWidth;
      visibleCount += 1;
    }
    links.slice(visibleCount).forEach((link) => menu.appendChild(link));
  }

  let resizeFrame = 0;
  function scheduleDistribution() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(distributeLinks);
  }

  window.addEventListener("resize", scheduleDistribution);
  if ("ResizeObserver" in window) new ResizeObserver(scheduleDistribution).observe(navInner);
  document.fonts?.ready.then(scheduleDistribution);
  distributeLinks();
})();
