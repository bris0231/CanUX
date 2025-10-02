(function () {
  const acc = document.getElementById("accordion");
  let slides = [];
  let activeIndex = 0;

  // ---- Config ----
  const RESET_DELAY = 20000; // idle reset to slide 0
  const ACTIVE_WIDTH = 800; // active slide width in px
  const MIN_COLLAPSED = 120; // minimum collapsed width
  const SWALLOW_CLICK_ON = ".case-study-button,a[href]"; // don't switch when clicking links/buttons

  // ---- Idle reset ----
  let resetTimer = null;
  const startResetTimer = () => {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setActive(0), RESET_DELAY);
  };

  // ---- Layout calc ----
  let lastWidth = null;
  function computeExpanded() {
    const n = slides.length;
    if (n === 0) return;

    const w = acc.clientWidth;
    if (w === lastWidth) return; // skip unnecessary recalcs
    lastWidth = w;

    const cs = getComputedStyle(acc);
    const gap = parseFloat(cs.getPropertyValue("gap")) || 0;
    const totalGaps = (n - 1) * gap;

    let expanded = ACTIVE_WIDTH;
    let collapsed = 0;

    if (n === 1) {
      // Only one slide
      expanded = Math.min(ACTIVE_WIDTH, w);
      collapsed = 0;
    } else {
      collapsed = (w - expanded - totalGaps) / (n - 1);
      if (collapsed < MIN_COLLAPSED) {
        collapsed = MIN_COLLAPSED;
        expanded = Math.max(MIN_COLLAPSED, w - totalGaps - (n - 1) * collapsed);
      }
    }

    acc.style.setProperty("--expanded", expanded + "px");
    acc.style.setProperty("--collapsed", Math.max(0, collapsed) + "px");
  }

  function setActive(i) {
    if (!slides.length) return;

    i = Math.max(0, Math.min(i, slides.length - 1));

    requestAnimationFrame(() => {
      slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));

      // Let the first slide flex to fill any leftover space
      if (slides[0]) slides[0].style.flex = "1 1 auto";

      activeIndex = i;
      computeExpanded();
      startResetTimer();
    });
  }

  // ---- Click to activate ----
  acc.addEventListener("click", (e) => {
    if (e.target.closest(SWALLOW_CLICK_ON)) return;

    const slideEl = e.target.closest(".slide");
    if (!slideEl) return;

    const idx = slides.indexOf(slideEl);
    if (idx === -1) return;

    setActive(idx);
  });

  // ---- Keyboard support ----
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") setActive(activeIndex + 1);
    if (e.key === "ArrowLeft") setActive(activeIndex - 1);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") startResetTimer();
  });

  addEventListener("resize", computeExpanded, { passive: true });
  addEventListener("orientationchange", computeExpanded, { passive: true });

  // ---- JSON slides ----
  (async function loadSlides() {
    try {
      const res = await fetch("./slides.json");
      const data = await res.json();
      data.forEach(makeSlide);

      // Cache slide references once after load
      slides = Array.from(acc.querySelectorAll(".slide"));
    } catch (err) {
      console.error("Failed to load slides:", err);
    } finally {
      setActive(0);
    }
  })();

  // ---- Build a Slide ----
  function makeSlide(item) {
    const slide = document.createElement("div");
    slide.className = "slide";
    if (item.classes) slide.classList.add(...item.classes.split(/\s+/));

    const content = document.createElement("div");
    content.className = "slide-content is-content";
    if (item.contentClasses) {
      content.classList.add(...item.contentClasses.split(/\s+/));
    }

    // --- Hero image container
    const hero = document.createElement("div");
    hero.className = "hero-image";
    if (item.backgroundImage) {
      hero.style.backgroundImage = `url("${item.backgroundImage}")`;

      // Preload image to avoid jank
      const img = new Image();
      img.src = item.backgroundImage;
      img.decoding = "async";
    }
    if (item.focal?.x) {
      hero.style.setProperty("--collapsed-hero-x", item.focal.x);
    }

    // --- Button wrapper
    const buttonWrap = document.createElement("div");
    buttonWrap.className = "button-wrapper";

    const btn = document.createElement("button");
    btn.className = "case-study-button";
    btn.textContent = item.button?.label || "READ CASE STUDY";

    if (item.button?.bg) btn.style.background = item.button.bg;
    if (item.button?.color) btn.style.color = item.button.color;
    if (item.button?.stroke)
      btn.style.border = `1px solid ${item.button.stroke}`;

    buttonWrap.appendChild(btn);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(item);
    });

    // --- Blur gradient (bottom of hero)
    const heroBlur = document.createElement("div");
    heroBlur.className = "card-blur";
    if (item.gradientColor) {
      heroBlur.style.setProperty("--card-gradient-color", item.gradientColor);
    }

    hero.appendChild(buttonWrap);
    hero.appendChild(heroBlur);

    // --- Card
    const cardWrap = document.createElement("div");
    cardWrap.className = "card-wrapper";

    const card = document.createElement("div");
    card.className = "card";
    if (item.card?.bg) card.style.setProperty("--card-bg", item.card.bg);
    if (item.card?.textColor)
      card.style.setProperty("--card-text-color", item.card.textColor);

    const header = document.createElement("div");
    header.className = "card-header";

    const phase = document.createElement("div");
    phase.className = "card-phase";
    phase.textContent = item.card?.phase || "";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = item.card?.title || "";

    const subtitleWrap = document.createElement("div");
    subtitleWrap.className = "card-subtitle-wrapper";

    if (item.card?.logo) {
      const logo = document.createElement("img");
      logo.className = "card-logo";
      logo.src = item.card.logo;
      logo.alt = item.card.logoAlt || "";
      subtitleWrap.appendChild(logo);
    }

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = item.card?.subtitle || "";
    subtitleWrap.appendChild(subtitle);

    header.appendChild(phase);
    header.appendChild(title);
    header.appendChild(subtitleWrap);

    const body = document.createElement("div");
    body.className = "card-body";
    const p = document.createElement("p");
    p.textContent = item.card?.body || "";
    body.appendChild(p);

    card.appendChild(header);
    card.appendChild(body);
    cardWrap.appendChild(card);

    content.appendChild(hero);
    content.appendChild(cardWrap);
    slide.appendChild(content);
    acc.appendChild(slide);
  }

  // ---- Build & Open Modal ----
  function openModal(item) {
    const MODAL_TIMEOUT = 60000; // ms (change as you like)
    let modalTimer;

    // Remove any old modal
    const oldModal = document.getElementById("case-study-modal");
    if (oldModal) oldModal.remove();

    const modal = document.createElement("div");
    modal.id = "case-study-modal";
    modal.className = "modal";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    // ----- Hero image -----
    const modalImage = document.createElement("div");
    modalImage.className = "modal-image";
    if (item.backgroundImage) {
      modalImage.style.backgroundImage = `url("${item.backgroundImage}")`;
      modalImage.style.backgroundPosition = "center";
      modalImage.style.backgroundSize = "cover";
    }

    const closeBtn = document.createElement("span");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = "&times;";

    const blur = document.createElement("div");
    blur.className = "modal-card-blur";
    if (item.gradientColor) {
      blur.style.setProperty("--card-gradient-color", item.gradientColor);
    }
    blur.style.setProperty(
      "--modal-hero-text-color",
      item.modalCard?.textColor || "#fff"
    );

    const titleText = item.modalCard?.title ?? item.card?.title ?? "";
    if (titleText) {
      const heroTitle = document.createElement("div");
      heroTitle.className = "modal-title";
      heroTitle.textContent = titleText;
      blur.appendChild(heroTitle);
    }

    modalImage.appendChild(closeBtn);
    modalImage.appendChild(blur);

    // ----- Card -----
    const modalCard = document.createElement("div");
    modalCard.className = "modal-card";
    if (item.modalCard?.bg) modalCard.style.background = item.modalCard.bg;
    if (item.modalCard?.textColor) {
      modalCard.style.setProperty(
        "--modal-text-color",
        item.modalCard.textColor
      );
    }

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    if (Array.isArray(item.modalCard?.sections)) {
      item.modalCard.sections.forEach((section) => {
        const sectionEl = document.createElement("div");
        sectionEl.className = "modal-section";

        const sectionTitle = document.createElement("div");
        sectionTitle.className = "section-title";
        sectionTitle.textContent = section.title || "";

        const sectionContent = document.createElement("div");
        sectionContent.className = "section-content";
        sectionContent.textContent = section.content || "";

        sectionEl.appendChild(sectionTitle);
        sectionEl.appendChild(sectionContent);
        modalBody.appendChild(sectionEl);
      });
    }

    modalCard.appendChild(modalBody);
    modalContent.appendChild(modalImage);
    modalContent.appendChild(modalCard);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // --- Close helpers
    const closeModal = () => {
      clearTimeout(modalTimer);
      if (modal.parentNode) {
        modal.style.display = "none";
        modal.remove();
      }
      // remove listeners to avoid leaks
      modal.removeEventListener("click", onBackdropClick);
      closeBtn.removeEventListener("click", onCloseBtn);
      modalContent.removeEventListener("mousemove", resetTimer);
      modalContent.removeEventListener("scroll", resetTimer);
      modalContent.removeEventListener("keydown", resetTimer);
      modalContent.removeEventListener("pointerdown", resetTimer);
    };

    const onBackdropClick = (e) => {
      if (e.target === modal) closeModal();
    };
    const onCloseBtn = () => closeModal();

    // --- Timeout logic
    const startTimer = () => {
      clearTimeout(modalTimer);
      modalTimer = setTimeout(closeModal, MODAL_TIMEOUT);
    };
    const resetTimer = () => startTimer();

    // Show & wire events
    modal.style.display = "flex";
    // Close interactions
    modal.addEventListener("click", onBackdropClick);
    closeBtn.addEventListener("click", onCloseBtn);
    // Keep-alive interactions (optional but recommended)
    modalContent.addEventListener("mousemove", resetTimer);
    modalContent.addEventListener("scroll", resetTimer);
    modalContent.addEventListener("keydown", resetTimer);
    modalContent.addEventListener("pointerdown", resetTimer);

    // Kick off timer
    startTimer();
  }
})();
