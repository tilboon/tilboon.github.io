// Footer year + last updated
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const updatedEl = document.getElementById("updated");
  if (updatedEl) {
    const d = new Date(document.lastModified);
    updatedEl.textContent = d.toLocaleDateString();
  }
})();

// Mobile hamburger nav
(function () {
  const btn = document.getElementById("nav-toggle");
  const nav = document.getElementById("nav-primary");
  if (!btn || !nav) return;

  const mq = window.matchMedia("(max-width: 860px)");

  function closeNav() {
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A" && mq.matches) closeNav();
  });

  mq.addEventListener("change", (e) => {
    if (!e.matches) closeNav();
  });
})();

// Highlight nav item for section currently in view (sticky-header friendly)
(function () {
  const nav = document.getElementById("nav-primary");
  if (!nav) return;

  const navLinks = Array.from(nav.querySelectorAll("a"));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length) return;

  // Match this to your CSS --header-offset (px)
  const HEADER_OFFSET = 240;

  // Keep last-known visibility for ALL sections
  const visible = new Map(sections.map((s) => [s.id, false]));

  function setActiveByTopLine() {
    // Find the first section whose top is at/above the activation line
    // and whose bottom is below it.
    const line = HEADER_OFFSET + 8; // a few px below header
    let current = sections[0];

    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const inBand = r.top <= line && r.bottom > line;
      if (inBand) {
        current = s;
        break;
      }
      // Fallback: if we've scrolled past it, keep updating
      if (r.top <= line) current = s;
    }

    const id = "#" + current.id;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
  }

  // Observer just triggers recalculation; selection logic is in setActiveByTopLine()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting);
      setActiveByTopLine();
    },
    {
      root: null,
      // Shift the "viewport" down so sections count as active below the sticky header
      rootMargin: `-${HEADER_OFFSET}px 0px -60% 0px`,
      threshold: 0,
    }
  );

  sections.forEach((s) => observer.observe(s));

  // Also update on click + on scroll (covers fast jumps)
  window.addEventListener("scroll", () => setActiveByTopLine(), { passive: true });
  window.addEventListener("resize", () => setActiveByTopLine());
  navLinks.forEach((a) => a.addEventListener("click", () => setTimeout(setActiveByTopLine, 0)));

  setActiveByTopLine();
})();

