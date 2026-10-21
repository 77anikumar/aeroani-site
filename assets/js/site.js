// AeroAni — small enhancements: mobile nav, header shadow, gallery lightbox.

(() => {
  // Mobile menu
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-header .nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Header border once the page scrolls
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // YouTube: show a thumbnail and only load the player (privacy-enhanced mode) when clicked
  document.querySelectorAll(".yt[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      iframe.title = btn.getAttribute("aria-label")?.replace(/^Play: /, "") || "YouTube video";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      const frame = document.createElement("div");
      frame.className = "yt";
      frame.appendChild(iframe);
      btn.replaceWith(frame);
      iframe.focus();
    }, { once: true });
  });

  // Lightbox
  const items = Array.from(document.querySelectorAll(".gallery [data-full]"));
  if (!items.length) return;

  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Photo viewer");
  box.innerHTML = `
    <img alt="">
    <button class="lb-btn lb-close" aria-label="Close">✕</button>
    <button class="lb-btn lb-prev" aria-label="Previous photo">‹</button>
    <button class="lb-btn lb-next" aria-label="Next photo">›</button>
    <div class="lb-count"></div>`;
  document.body.appendChild(box);

  const img = box.querySelector("img");
  const count = box.querySelector(".lb-count");
  let i = 0;
  let lastFocus = null;

  const show = (n) => {
    i = (n + items.length) % items.length;
    const el = items[i];
    img.src = el.dataset.full;
    img.alt = el.querySelector("img")?.alt || "";
    count.textContent = `${i + 1} / ${items.length}`;
    // Warm the cache for the neighbours
    [i + 1, i - 1].forEach((k) => {
      const nb = items[(k + items.length) % items.length];
      if (nb) new Image().src = nb.dataset.full;
    });
  };
  const open = (n) => {
    lastFocus = document.activeElement;
    show(n);
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.querySelector(".lb-close").focus();
  };
  const close = () => {
    box.hidden = true;
    img.removeAttribute("src");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  items.forEach((el, n) => el.addEventListener("click", () => open(n)));
  box.querySelector(".lb-close").addEventListener("click", close);
  box.querySelector(".lb-prev").addEventListener("click", () => show(i - 1));
  box.querySelector(".lb-next").addEventListener("click", () => show(i + 1));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(i - 1);
    else if (e.key === "ArrowRight") show(i + 1);
  });

  // Swipe on phones
  let x0 = null;
  box.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  });
})();
