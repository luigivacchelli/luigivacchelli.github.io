// Gesture controls for opening/closing the "chisono" overlay via #about-toggle (mobile only)

(function () {
  // Run gestures only on mobile/touch devices
  const isMobileLike = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || ('ontouchstart' in window);
  if (!isMobileLike) {
    return; // do nothing on desktop/trackpad
  }

  const CHECKBOX_SELECTOR = '#about-toggle';
  const aboutToggle = document.querySelector(CHECKBOX_SELECTOR);
  if (!aboutToggle) return;

  const openOverlay = () => { if (!aboutToggle.checked) aboutToggle.checked = true; };
  const closeOverlay = () => { if (aboutToggle.checked) aboutToggle.checked = false; };

  // ---- TOUCH (phones/tablets) ----
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const TOUCH_MIN_X = 60;     // min horizontal pixels
  const TOUCH_MAX_Y = 50;     // max vertical drift
  const TOUCH_MAX_MS = 600;   // max gesture time

  window.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const dt = Date.now() - touchStartTime;
    if (dt > TOUCH_MAX_MS) return;

    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - touchStartX;
    const dy = Math.abs(t.clientY - touchStartY);

    // Swipe right to open; swipe left to close
    if (dx > TOUCH_MIN_X && dy < TOUCH_MAX_Y) {
      openOverlay();
    } else if (dx < -TOUCH_MIN_X && dy < TOUCH_MAX_Y) {
      closeOverlay();
    }
  }, { passive: true });
})();
