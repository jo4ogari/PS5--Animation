(() => {
  "use strict";
  const header = document.querySelector(".site-header");
  const dialog = document.querySelector(".search-dialog");
  const input = document.querySelector("#search-input");
  const rows = [...document.querySelectorAll(".search-results li")];
  const cards = [...document.querySelectorAll(".console-card")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const indicator = document.querySelector(".filter-indicator");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const engine = window.gsap;
  const revealTweens = [];
  let navigationTween;
  let closingSearch = false;
  let decorativeContext;

  const canAnimate = () => engine && !reduceMotion.matches;
  const refresh = () => window.ScrollTrigger?.refresh();
  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  function moveIndicator(animate = true) {
    const active = filters.find(button => button.getAttribute("aria-pressed") === "true");
    const props = { x: active.offsetLeft, width: active.offsetWidth, opacity: 1 };
    indicator.parentElement.classList.add("has-indicator");
    if (canAnimate() && animate) engine.to(indicator, { ...props, duration: .4, ease: "power3.out", overwrite: true });
    else {
      indicator.style.transform = `translateX(${props.x}px)`;
      indicator.style.width = `${props.width}px`;
      indicator.style.opacity = "1";
    }
  }

  function filterCards(category, animate = true) {
    // A user's explicit filter takes ownership from the initial scroll reveal.
    revealTweens.forEach(tween => { tween.scrollTrigger?.kill(); tween.kill(); });
    revealTweens.length = 0;
    filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
    cards.forEach(card => { card.hidden = category !== "all" && card.dataset.category !== category; });
    const visible = cards.filter(card => !card.hidden);
    document.querySelector(".results-count").textContent = `${visible.length} ${visible.length === 1 ? "console para explorar" : "consoles para explorar"}`;
    moveIndicator(animate);
    if (engine) {
      engine.killTweensOf(cards);
      engine.set(cards, { clearProps: "opacity,visibility,transform" });
      if (canAnimate() && animate) engine.fromTo(visible, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .09, duration: .55, ease: "power3.out", onComplete: refresh });
    }
    requestAnimationFrame(refresh);
  }
  filters.forEach(button => button.addEventListener("click", () => filterCards(button.dataset.filter)));
  window.addEventListener("resize", () => moveIndicator(false), { passive: true });
  document.fonts?.ready.then(() => moveIndicator(false));
  moveIndicator(false);

  function updateSearch() {
    const query = normalize(input.value);
    rows.forEach(row => { row.hidden = !normalize(row.dataset.keywords + row.textContent).includes(query); });
    const count = rows.filter(row => !row.hidden).length;
    document.querySelector(".search-empty").hidden = count > 0;
    document.querySelector(".search-count").textContent = `${count} ${count === 1 ? "destino encontrado" : "destinos encontrados"}`;
  }

  function openSearch() {
    if (dialog.open) return;
    closingSearch = false;
    input.value = "";
    updateSearch();
    dialog.showModal();
    input.focus({ preventScroll: true });
    if (canAnimate()) {
      engine.fromTo(dialog, { y: -14, scale: .975, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .35, ease: "power3.out", overwrite: true });
      engine.fromTo(rows, { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: .045, duration: .3, delay: .1, overwrite: true });
    }
  }

  function closeSearch(afterClose) {
    if (!dialog.open) { afterClose?.(); return; }
    if (closingSearch) return;
    closingSearch = true;
    const done = () => { dialog.close(); closingSearch = false; afterClose?.(); };
    if (canAnimate()) engine.to(dialog, { y: -8, opacity: 0, duration: .17, overwrite: true, onComplete: done });
    else done();
  }
  document.querySelector(".search-trigger").addEventListener("click", openSearch);
  document.querySelector(".close-search").addEventListener("click", () => closeSearch());
  dialog.addEventListener("cancel", event => { event.preventDefault(); closeSearch(); });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSearch();
  });
  input.addEventListener("input", updateSearch);
  dialog.addEventListener("keydown", event => {
    const links = rows.filter(row => !row.hidden).map(row => row.querySelector("a"));
    if (["ArrowDown", "ArrowUp"].includes(event.key) && links.length) {
      event.preventDefault();
      const index = links.indexOf(document.activeElement);
      const next = event.key === "ArrowDown" ? (index + 1) % links.length : (index <= 0 ? links.length - 1 : index - 1);
      links[next].focus();
    }
    if (event.key === "Enter" && event.target === input && links.length) { event.preventDefault(); links[0].click(); }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest("input, textarea, select, [contenteditable]")) {
      event.preventDefault(); openSearch();
    }
  });

  function stopNavigation() { navigationTween?.kill(); }
  window.addEventListener("wheel", stopNavigation, { passive: true });
  window.addEventListener("touchstart", stopNavigation, { passive: true });
  document.addEventListener("keydown", event => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key) && !dialog.open) stopNavigation();
  });

  function navigate(hash) {
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    stopNavigation();
    if (hash === "#ps4" || hash === "#ps5") filterCards(hash.slice(1), false);
    if (hash === "#consoles") filterCards("all", false);
    refresh();
    const offset = header.getBoundingClientRect().bottom + 24;
    const top = hash === "#experiencia" ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    const finish = () => {
      target.focus({ preventScroll: true });
      try { history.replaceState(null, "", hash); } catch { /* Local previews may restrict history. */ }
    };
    if (canAnimate()) {
      const position = { y: window.scrollY };
      navigationTween = engine.to(position, { y: top, duration: 1.05, ease: "power3.inOut", onUpdate: () => window.scrollTo(0, position.y), onComplete: finish });
    } else { window.scrollTo(0, top); finish(); }
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute("href");
      if (!document.getElementById(hash.slice(1))) return;
      event.preventDefault();
      closeSearch(() => navigate(hash));
    });
  });

  document.querySelectorAll(".console-details").forEach(details => {
    details.addEventListener("toggle", () => {
      if (details.open && canAnimate()) engine.fromTo(details.querySelector(".details-body"), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .35, overwrite: true });
      requestAnimationFrame(refresh);
    });
  });

  function setupDecorativeMotion() {
    decorativeContext?.revert();
    if (!canAnimate()) return;
    decorativeContext = engine.context(() => {
      engine.timeline({ defaults: { ease: "power3.out" } })
        .from(header, { y: -24, autoAlpha: 0, duration: .7 })
        .from(header.querySelectorAll(".brand, .main-nav a, .search-trigger"), { y: 8, autoAlpha: 0, stagger: .07, duration: .4 }, "-=.4");
      engine.from(".hero-symbols .play-symbol", { y: 9, scale: .7, opacity: 0, stagger: .12, duration: .8, delay: .3, ease: "back.out(1.5)" });
      engine.from(".hero-eyebrow", { x: -12, opacity: 0, duration: .8, delay: .4, ease: "power3.out" });
      if (!window.ScrollTrigger) return;
      engine.registerPlugin(ScrollTrigger);
      engine.from(".console-ornament span", { y: 14, opacity: 0, stagger: .15, duration: .7, ease: "back.out(1.7)", scrollTrigger: { trigger: ".consoles-intro", start: "top 88%", once: true } });
      engine.from(".section-kicker > span", { scaleX: 0, duration: .8, scrollTrigger: { trigger: ".consoles-intro", start: "top 88%", once: true } });
      engine.from(".title-line > span", { yPercent: 110, duration: .9, stagger: .13, ease: "power3.out", scrollTrigger: { trigger: ".consoles-intro", start: "top 85%", once: true } });
      engine.from(".intro-row > p", { y: 20, opacity: 0, duration: .8, scrollTrigger: { trigger: ".consoles-intro", start: "top 80%", once: true } });
      cards.forEach((card, index) => {
        revealTweens.push(engine.from(card, { y: 50, autoAlpha: 0, duration: .85, delay: finePointer.matches ? index * .12 : 0, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 92%", once: true } }));
        engine.fromTo(card.querySelector(".console-visual"), { y: 12 }, { y: -12, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } });
      });
      engine.from(".closing-rule", { scaleX: 0, duration: 1.1, ease: "power3.inOut", scrollTrigger: { trigger: ".closing-note", start: "top 90%", once: true } });
      engine.from(".closing-note p, .closing-note a", { y: 20, opacity: 0, stagger: .12, duration: .7, scrollTrigger: { trigger: ".closing-note", start: "top 85%", once: true } });
    });
  }
  setupDecorativeMotion();
  reduceMotion.addEventListener("change", () => {
    stopNavigation();
    if (engine) {
      engine.killTweensOf([dialog, ...rows]);
      engine.set([dialog, ...rows], { clearProps: "opacity,visibility,transform" });
      if (closingSearch) { dialog.close(); closingSearch = false; }
    }
    setupDecorativeMotion();
    refresh();
  });

  cards.forEach(card => {
    const surface = card.querySelector(".card-surface");
    const picture = card.querySelector(".console-image");
    const reset = () => {
      if (!engine) return;
      engine.to(surface, { rotateX: 0, rotateY: 0, duration: .5, overwrite: true });
      engine.to(picture, { scale: 1, rotation: 0, duration: .5, overwrite: true });
    };
    card.addEventListener("pointermove", event => {
      if (!canAnimate() || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      engine.to(surface, { rotateY: ((event.clientX - rect.left) / rect.width - .5) * 4, rotateX: -((event.clientY - rect.top) / rect.height - .5) * 3, duration: .5, ease: "power2.out", overwrite: true });
      engine.to(picture, { scale: 1.035, rotation: card.dataset.category === "ps5" ? -1 : 1, duration: .6, overwrite: true });
    });
    card.addEventListener("pointerleave", reset);
    card.addEventListener("focusout", reset);
    reduceMotion.addEventListener("change", reset);
  });

  // Native observers keep navigation state useful even without GSAP.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const sectionId = entry.target.id;
      document.querySelectorAll(".main-nav a").forEach(link => {
        if (link.getAttribute("href") === "#" + sectionId) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-20% 0px -50% 0px" });
  [document.querySelector("#experiencia"), document.querySelector("#consoles")].forEach(node => observer.observe(node));
  window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 20), { passive: true });
  document.querySelectorAll(".console-image").forEach(image => image.addEventListener("load", refresh, { once: true }));
  // The video's async metadata adds its pin spacing later. Re-measure all new
  // reveals afterwards; this does not change the video's scroll controller.
  document.querySelector("#controller-video").addEventListener("loadedmetadata", () => requestAnimationFrame(() => {
    refresh();
    if (["#consoles", "#ps5", "#ps4"].includes(location.hash)) navigate(location.hash);
  }), { once: true });
})();
