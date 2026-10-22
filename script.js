(() => {
  "use strict";
  const scene = document.querySelector(".scroll-scene");
  const section = document.querySelector(".precision");
  const video = document.querySelector("#controller-video");
  const status = document.querySelector(".media-status");
  const hint = document.querySelector(".scroll-hint");
  const FPS = Number(video.dataset.fps) || 60;
  let targetTime = 0;
  let lastFrame = 0;
  let raf = 0;
  let initialized = false;
  let tween;
  let nativeUpdate;
  let nativeMeasure;
  let distance = 0;
  let seekStarted = 0;

  video.muted = true;
  video.pause();
  video.addEventListener("play", () => video.pause());

  function distanceForViewport() { return Math.max(2200, section.clientHeight * 3.5); }
  function requestSeek() { if (!raf) raf = requestAnimationFrame(commitSeek); }

  function commitSeek() {
    raf = 0;
    // Metadata is sufficient. Requiring readyState >= 2 here can block recovery
    // while a frame requested by an earlier seek is still buffering.
    if (video.readyState < 1) return;
    if (video.seeking) {
      if (!seekStarted) seekStarted = performance.now();
      if (performance.now() - seekStarted < 1000) {
        requestSeek();
        return;
      }
    }
    if (Math.abs(video.currentTime - targetTime) > 0.002) {
      try {
        video.currentTime = targetTime;
        seekStarted = performance.now();
      } catch {
        // Readiness events retry when the decoder can accept the seek.
      }
    }
  }

  function setProgress(progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    // Request actual frames, avoiding redundant decoder work.
    targetTime = Math.min(lastFrame, Math.round(clamped * lastFrame * FPS) / FPS);
    hint.style.opacity = String(1 - Math.min(1, clamped * 8));
    requestSeek();
  }

  function setupNativeScroll() {
    scene.classList.add("is-native");
    let sceneTop = 0;
    nativeUpdate = () => setProgress((window.scrollY - sceneTop) / distance);
    nativeMeasure = () => {
      distance = distanceForViewport();
      scene.style.setProperty("--scroll-distance", distance + "px");
      sceneTop = scene.getBoundingClientRect().top + window.scrollY;
      nativeUpdate();
    };
    window.addEventListener("scroll", nativeUpdate, { passive: true });
    window.addEventListener("resize", nativeMeasure, { passive: true });
    nativeMeasure();
  }

  function initialize() {
    if (initialized || !Number.isFinite(video.duration) || video.duration <= 0) return;
    initialized = true;
    // The optimized file has no audio tail. Keep the playhead inside its
    // final video sample, including when scrolling past the pinned section.
    lastFrame = Math.max(0, Math.round(video.duration * FPS) - 1) / FPS;
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      const playhead = { progress: 0 };
      tween = gsap.to(playhead, {
        progress: 1,
        ease: "none",
        onUpdate: () => setProgress(playhead.progress),
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + distanceForViewport(),
          pin: true,
          pinSpacing: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    } else {
      setupNativeScroll();
    }
    requestSeek();
  }

  video.addEventListener("loadedmetadata", initialize);
  video.addEventListener("loadeddata", () => { status.textContent = ""; requestSeek(); });
  video.addEventListener("seeked", () => {
    seekStarted = 0;
    status.textContent = "";
    requestSeek();
  });
  video.addEventListener("canplay", requestSeek);
  video.addEventListener("progress", requestSeek);
  video.addEventListener("error", () => {
    tween?.scrollTrigger?.kill();
    tween?.kill();
    if (nativeUpdate) window.removeEventListener("scroll", nativeUpdate);
    if (nativeMeasure) window.removeEventListener("resize", nativeMeasure);
    scene.classList.remove("is-native");
    status.textContent = "Não foi possível abrir o vídeo. Recarregue a página para tentar novamente.";
  });
  section.addEventListener("touchstart", requestSeek, { passive: true });
  window.addEventListener("pageshow", () => {
    video.pause();
    if (tween) ScrollTrigger.refresh();
    nativeUpdate?.();
    requestSeek();
  });

  async function loadVideo() {
    const source = video.dataset.src;
    // All bytes in memory allow reverse seeks without HTTP Range support.
    // Local file previews use the original file directly.
    if (location.protocol === "http:" || location.protocol === "https:") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) throw new Error("HTTP " + response.status);
        video.src = URL.createObjectURL(await response.blob());
      } catch {
        video.src = source;
      } finally {
        clearTimeout(timeout);
      }
    } else {
      video.src = source;
    }
    video.load();
  }
  loadVideo();
})();
