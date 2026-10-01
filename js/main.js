const CONTACT_EMAIL = "ciao@borgoconnesso.it";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const menu = document.querySelector("#menu");
const menuOpeners = [...document.querySelectorAll(".menu-open")];
const menuClose = document.querySelector(".menu-close");

function setMenu(open) {
  if (!menu || !menuOpeners.length) return;
  menu.hidden = !open;
  menuOpeners.forEach((btn) => btn.setAttribute("aria-expanded", String(open)));
  document.body.classList.toggle("menu-open", open);
  if (open) {
    menuClose?.focus();
  }
}

menuOpeners.forEach((btn) => {
  btn.addEventListener("click", () => setMenu(menu.hidden));
});
menuClose?.addEventListener("click", () => {
  setMenu(false);
  menuOpeners[0]?.focus();
});

menu?.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (link) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu && !menu.hidden) {
    setMenu(false);
    menuOpeners[0]?.focus();
  }
  if (event.key !== "Tab" || !menu || menu.hidden) return;
  const focusable = [...menu.querySelectorAll("a, button")];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.querySelectorAll("[data-accordion]").forEach((root) => {
  const items = [...root.querySelectorAll(".acc-item")];
  items.forEach((item) => {
    const button = item.querySelector(".acc-button");
    const panel = item.querySelector(".acc-panel");
    button?.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      items.forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".acc-button")?.setAttribute("aria-expanded", "false");
        const otherPanel = other.querySelector(".acc-panel");
        if (otherPanel) otherPanel.hidden = true;
      });
      if (willOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        if (panel) panel.hidden = false;
      }
    });
  });
});

const place = document.querySelector(".place");
if (place) {
  const slides = [...place.querySelectorAll(".place-slide")];
  const status = place.querySelector(".place-status");
  let index = 0;
  let timer = 0;

  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    if (status) {
      const word = slides[index].querySelector(".place-word")?.textContent?.trim() || "";
      status.textContent = word;
    }
  }

  function stop() {
    window.clearInterval(timer);
    timer = 0;
  }

  function play() {
    if (reducedMotion || timer) return;
    timer = window.setInterval(() => show(index + 1), 5200);
  }

  place.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      stop();
      show(index + Number(button.getAttribute("data-dir")));
      play();
    });
  });

  place.addEventListener("mouseenter", stop);
  place.addEventListener("mouseleave", play);
  place.addEventListener("focusin", stop);
  place.addEventListener("focusout", play);
  show(0);
  play();
}

const heroVisual = document.querySelector(".hero-visual");
if (heroVisual) {
  const heroSlides = [...heroVisual.querySelectorAll(".hero-slide")];
  const heroVideo = heroVisual.querySelector(".hero-video");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let heroIndex = 0;

  function syncHeroVideo(activeIndex) {
    if (!heroVideo) return;
    if (reduceMotion || activeIndex !== 0) {
      heroVideo.pause();
      return;
    }
    const play = heroVideo.play();
    if (play?.catch) play.catch(() => {});
  }

  function showHero(next) {
    heroIndex = (next + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, slideIndex) => {
      const active = slideIndex === heroIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    syncHeroVideo(heroIndex);
  }

  heroVisual.querySelectorAll("[data-hero-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      showHero(heroIndex + Number(button.dataset.heroDir));
    });
  });

  showHero(0);
}

const percorso = document.querySelector("#percorso");

document.querySelectorAll("[data-percorso]").forEach((link) => {
  link.addEventListener("click", () => {
    const value = link.getAttribute("data-percorso");
    if (percorso && value) {
      percorso.value = value;
      percorso.removeAttribute("aria-invalid");
    }
  });
});

const form = document.querySelector("#proposta-form");
const formStatus = document.querySelector("#form-status");

function setInvalid(field, invalid) {
  if (!field) return;
  if (invalid) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const nome = form.querySelector("#nome");
  const email = form.querySelector("#email");
  const organizzazione = form.querySelector("#organizzazione");
  const persone = form.querySelector("#persone");
  const periodo = form.querySelector("#periodo");
  const messaggio = form.querySelector("#messaggio");

  const nomeOk = nome.value.trim().length > 1;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  const percorsoOk = Boolean(percorso.value);

  setInvalid(nome, !nomeOk);
  setInvalid(email, !emailOk);
  setInvalid(percorso, !percorsoOk);

  if (!nomeOk || !emailOk || !percorsoOk) {
    formStatus.textContent = !nomeOk
      ? "Manca il nome."
      : !emailOk
        ? "L'email non è completa."
        : "Scegli un pacchetto, anche «Da comporre insieme».";
    const firstInvalid = form.querySelector("[aria-invalid='true']");
    firstInvalid?.focus();
    return;
  }

  const percorsoLabel = percorso.selectedOptions[0]?.textContent?.trim() || percorso.value;
  const body = [
    `Nome: ${nome.value.trim()}`,
    `Email: ${email.value.trim()}`,
    `Pacchetto: ${percorsoLabel}`,
    `Organizzazione o famiglia: ${organizzazione.value.trim() || "—"}`,
    `Persone: ${persone.value.trim() || "—"}`,
    `Periodo: ${periodo.value.trim() || "—"}`,
    "",
    messaggio.value.trim() || "Nessun messaggio aggiuntivo.",
  ].join("\n");

  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Proposta Borgo Connesso — ${percorsoLabel}`)}&body=${encodeURIComponent(body)}`;
  formStatus.textContent = `Se il programma di posta non si apre, scrivi a ${CONTACT_EMAIL}.`;
  window.location.href = href;
});

form?.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => field.removeAttribute("aria-invalid"));
});

const pathRail = document.querySelector(".path-rail");
const pathSlides = pathRail ? [...pathRail.querySelectorAll(".path")] : [];
const pathCount = document.querySelector(".path-count");
const pathButtons = [...document.querySelectorAll("[data-path-dir]")];

function pathIndex() {
  if (!pathRail || !pathSlides.length) return 0;
  const step = pathSlides[0].offsetWidth + 14;
  if (!step) return 0;
  return Math.max(0, Math.min(pathSlides.length - 1, Math.round(pathRail.scrollLeft / step)));
}

function updatePathNav() {
  const index = pathIndex();
  if (pathCount) pathCount.textContent = `${index + 1} / ${pathSlides.length}`;
  pathButtons.forEach((button) => {
    const dir = Number(button.dataset.pathDir);
    button.disabled = index + dir < 0 || index + dir >= pathSlides.length;
  });
}

pathButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = pathSlides[pathIndex() + Number(button.dataset.pathDir)];
    if (!target || !pathRail) return;
    const left = target.getBoundingClientRect().left - pathRail.getBoundingClientRect().left + pathRail.scrollLeft;
    pathRail.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
  });
});

pathRail?.addEventListener("scroll", updatePathNav, { passive: true });
pathRail?.addEventListener("scrollend", updatePathNav);
updatePathNav();

const seasonRoot = document.querySelector("#stagioni");
const seasonButton = seasonRoot?.querySelector(".season-switch");
if (seasonRoot && seasonButton) {
  const setSeason = (winter) => {
    seasonRoot.classList.toggle("is-inverno", winter);
    seasonButton.setAttribute("aria-pressed", String(winter));
    seasonButton.setAttribute("aria-label", winter ? "Passa all'estate" : "Passa all'inverno");
    const name = winter ? "inverno" : "estate";
    seasonRoot.querySelectorAll("[data-season]").forEach((el) => {
      const on = el.dataset.season === name;
      el.classList.toggle("is-on", on);
      if (el.classList.contains("season-panel")) {
        el.setAttribute("aria-hidden", String(!on));
      }
    });
  };

  seasonButton.addEventListener("click", () => {
    setSeason(!seasonRoot.classList.contains("is-inverno"));
  });
}

const whyList = document.querySelector(".why-list");
if (whyList) {
  if (reducedMotion) {
    whyList.classList.add("is-in");
  } else {
    const whyObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          whyList.classList.add("is-in");
          whyObserver.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    whyObserver.observe(whyList);
  }
}

const rebirthGrid = document.querySelector(".rebirth-grid");
const rebirthVideo = document.querySelector(".rebirth-video");
const rebirthSection = document.querySelector("#rinascita");
if (rebirthGrid) {
  if (reducedMotion) {
    rebirthGrid.classList.add("is-in");
  } else {
    const rebirthObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          rebirthGrid.classList.add("is-in");
          rebirthObserver.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    rebirthObserver.observe(rebirthGrid);
  }
}
if (rebirthVideo && rebirthSection && !reducedMotion) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const play = rebirthVideo.play();
          if (play?.catch) play.catch(() => {});
        } else {
          rebirthVideo.pause();
        }
      });
    },
    { threshold: 0.2 },
  );
  videoObserver.observe(rebirthSection);
}

const offerList = document.querySelector(".offer-list");
if (offerList) {
  if (reducedMotion) {
    offerList.classList.add("is-in");
  } else {
    const offerObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          offerList.classList.add("is-in");
          offerObserver.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    offerObserver.observe(offerList);
  }
}

const tileBand = document.querySelector(".tile-band");
if (tileBand) {
  if (reducedMotion) {
    tileBand.classList.add("is-in");
  } else {
    const bandObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          tileBand.classList.add("is-in");
          bandObserver.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    bandObserver.observe(tileBand);
  }
}

const steps = document.querySelector(".steps");
if (steps) {
  const stepItems = [...steps.querySelectorAll(".step")];

  function revealSteps() {
    steps.classList.add("is-drawn");
    stepItems.forEach((item) => item.classList.add("is-in"));
  }

  if (reducedMotion) {
    revealSteps();
  } else {
    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          steps.classList.add("is-drawn");
          entry.target.classList.add("is-in");
          stepObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );
    stepItems.forEach((item) => stepObserver.observe(item));
  }
}

const newsRotator = document.querySelector("[data-news-rotator]");
if (newsRotator) {
  const NEWS_MS = 5000;
  const feature = newsRotator.querySelector(".news-feature");
  const items = [...newsRotator.querySelectorAll(".news-list > li")];
  const dateEl = feature?.querySelector("[data-news-date]");
  const mediaEl = feature?.querySelector("[data-news-media]");
  const imgEl = feature?.querySelector("[data-news-img]");
  const linkEl = feature?.querySelector("[data-news-link]");
  let index = Math.max(0, items.findIndex((item) => item.classList.contains("is-active")));
  let timer = 0;

  function paintNews(next) {
    if (!feature || !items.length) return;
    index = ((next % items.length) + items.length) % items.length;
    const item = items[index];

    items.forEach((li, i) => {
      const on = i === index;
      li.classList.toggle("is-active", on);
      li.setAttribute("aria-selected", String(on));
      li.tabIndex = on ? 0 : -1;
    });

    const apply = () => {
      if (dateEl) {
        dateEl.textContent = item.dataset.date || "";
        dateEl.setAttribute("datetime", item.dataset.datetime || "");
      }
      if (imgEl) {
        imgEl.src = item.dataset.img || imgEl.src;
        imgEl.alt = item.dataset.alt || "";
      }
      if (mediaEl) mediaEl.setAttribute("href", item.dataset.href || "#");
      if (linkEl) {
        linkEl.textContent = item.dataset.title || "";
        linkEl.setAttribute("href", item.dataset.href || "#");
      }
      feature.classList.remove("is-swap");
    };

    if (reducedMotion) {
      apply();
      return;
    }

    feature.classList.add("is-swap");
    window.setTimeout(apply, 220);
  }

  function stopNews() {
    window.clearInterval(timer);
    timer = 0;
  }

  function playNews() {
    stopNews();
    if (reducedMotion || items.length < 2) return;
    timer = window.setInterval(() => paintNews(index + 1), NEWS_MS);
  }

  items.forEach((item, itemIndex) => {
    item.addEventListener("click", () => {
      paintNews(itemIndex);
      playNews();
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      paintNews(itemIndex);
      playNews();
    });
  });

  newsRotator.addEventListener("mouseenter", stopNews);
  newsRotator.addEventListener("mouseleave", playNews);
  newsRotator.addEventListener("focusin", stopNews);
  newsRotator.addEventListener("focusout", (event) => {
    if (!newsRotator.contains(event.relatedTarget)) playNews();
  });

  paintNews(index);
  playNews();
}
