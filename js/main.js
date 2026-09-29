// Scroll-driven motion lives here. The inline script in <head> adds html.motion
// unless the visitor prefers reduced motion; without it the page is fully static.
const MOTION = document.documentElement.classList.contains("motion");
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// Footer dates
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const updatedEl = document.getElementById("updated");
  if (updatedEl) {
    updatedEl.textContent = new Date(document.lastModified).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
})();

// Split the vision statement into words so they can light up one by one
const words = [];
if (MOTION) {
  document.querySelectorAll("[data-words]").forEach((el) => {
    const parts = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    parts.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "w";
      span.textContent = word;
      el.appendChild(span);
      if (i < parts.length - 1) el.appendChild(document.createTextNode(" "));
      words.push(span);
    });
  });
}

// Stats count up with their section's scroll progress (scrubbed, so scrolling back counts down).
// A section can set data-count-from / data-count-span to choose when in its progress the count runs.
const counters = Array.from(document.querySelectorAll("[data-count]")).map((el) => ({
  el,
  scene: el.closest("[data-scrub]"),
}));
function setCounters(scene, p) {
  const from = Number(scene.dataset.countFrom ?? 0.5);
  const span = Number(scene.dataset.countSpan ?? 0.3);
  const eased = 1 - Math.pow(1 - clamp((p - from) / span), 3);
  counters.forEach(({ el, scene: s }) => {
    if (s === scene) el.textContent = String(Math.round(Number(el.dataset.count) * eased));
  });
}

// One scroll loop drives all motion. Each frame it reads every position first,
// then writes, so the browser only lays out once.
//   [data-scrub] gets --p (0→1):
//     hero    — how far the hero has scrolled off the top
//     pin     — progress through a tall section whose stage is sticky
//     through — how far the viewport's reading line has travelled down the element
//   .reveal elements get .in once they enter the viewport (siblings stagger)
(function () {
  const scrubs = MOTION ? Array.from(document.querySelectorAll("[data-scrub]")) : [];
  let pending = MOTION ? Array.from(document.querySelectorAll(".reveal")) : [];
  const hero = document.querySelector(".hero");
  const features = Array.from(document.querySelectorAll(".feature"));
  // Research slider: the step nearest the middle of the screen picks the pinned visual
  const steps = Array.from(document.querySelectorAll(".step"));
  const visuals = Array.from(document.querySelectorAll(".story-visual"));
  let activeStep = "0";
  // Looping clips only play while on screen (and, in the slider, while their step is active)
  const loops = Array.from(document.querySelectorAll("video.pub-loop, .feature-media video, .story-visual video"));
  if (!MOTION) loops.forEach((v) => (v.controls = true));
  let ticking = false;

  pending.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty("--d", `${Math.min(i, 6) * 0.08}s`);
  });

  function update() {
    ticking = false;
    const vh = window.innerHeight;

    // --- read ---
    const scrubRects = scrubs.map((el) => el.getBoundingClientRect());
    const revealed = pending.filter((el) => el.getBoundingClientRect().top < vh * 0.9);

    const scrolled = hero ? window.scrollY > hero.offsetHeight * 0.65 : true;

    let nextStep = activeStep;
    let best = Infinity;
    for (const st of steps) {
      const r = st.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < best) {
        best = d;
        nextStep = st.dataset.step;
      }
    }

    const overDark = features.some((f) => {
      const r = f.getBoundingClientRect();
      return r.top <= 0 && r.bottom > 56;
    });
    const loopVisible = loops.map((v) => {
      const r = v.getBoundingClientRect();
      return r.bottom > 0 && r.top < vh;
    });

    // --- write ---
    scrubs.forEach((el, i) => {
      const r = scrubRects[i];
      if (r.bottom < -vh || r.top > vh * 2) return;

      let p;
      switch (el.dataset.scrub) {
        case "hero":
          p = clamp(-r.top / r.height);
          break;
        case "pin":
          // Unpinned (phones / reduced motion): fall back to scroll-through progress
          p = r.height - vh > 1 ? clamp(-r.top / (r.height - vh)) : clamp((vh * 0.9 - r.top) / (vh * 0.8));
          break;
        default:
          p = clamp((vh * 0.6 - r.top) / r.height);
      }
      el.style.setProperty("--p", p.toFixed(4));

      if (words.length && el.querySelector("[data-words]")) {
        const lit = Math.round(clamp((p - 0.08) / 0.72) * words.length);
        words.forEach((w, j) => w.classList.toggle("lit", j < lit));
      }
      if (el.querySelector("[data-count]")) setCounters(el, p);
    });

    if (revealed.length) {
      revealed.forEach((el) => el.classList.add("in"));
      pending = pending.filter((el) => !el.classList.contains("in"));
    }



    if (nextStep !== activeStep) {
      activeStep = nextStep;
      steps.forEach((st) => st.classList.toggle("is-active", st.dataset.step === activeStep));
      visuals.forEach((v) => v.classList.toggle("is-active", v.dataset.step === activeStep));
    }

    if (MOTION) {
      loops.forEach((v, i) => {
        const visual = v.closest(".story-visual");
        const shouldPlay = loopVisible[i] && (!visual || visual.dataset.step === activeStep);
        if (shouldPlay && v.paused) v.play().catch(() => {});
        else if (!shouldPlay && !v.paused) v.pause();
      });
    }

    document.body.classList.toggle("scrolled", scrolled);
    document.body.classList.toggle("nav-dark", overDark);
  }

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// Highlight the nav link for the section currently in view
(function () {
  const navLinks = Array.from(document.querySelectorAll(".nav a[href^='#']"));
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if (!sections.length) return;

  function setActiveLink() {
    const marker = window.innerHeight * 0.35;
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) current = section;
    }
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
      current = sections[sections.length - 1];
    }
    navLinks.forEach((link) => {
      link.classList.toggle("active", !!current && link.getAttribute("href") === `#${current.id}`);
    });
  }

  window.addEventListener("scroll", setActiveLink, { passive: true });
  window.addEventListener("resize", setActiveLink);
  setActiveLink();
})();

// Mobile menu
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
  mq.addEventListener("change", (e) => {
    if (!e.matches) closeNav();
  });
})();

// Click-to-play YouTube: swap the thumbnail for the player. Opened from a local file,
// YouTube refuses to embed, so the link just opens youtube.com instead.
(function () {
  if (location.protocol === "file:") return;

  document.querySelectorAll("a.yt[data-yt]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${link.dataset.yt}?autoplay=1&rel=0`;
      iframe.title = link.getAttribute("aria-label") || "YouTube video";
      iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;

      const frame = document.createElement("div");
      frame.className = "pub-video";
      frame.appendChild(iframe);
      link.replaceWith(frame);
    });
  });
})();
