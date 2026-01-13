import React from "react";
import { createRoot } from "react-dom/client";
import NoShowCalculator from "./NoShowCalculator.jsx";

const MOUNT_ID = "no-show-calculator";

function getHeaderOffset() {
  // versucht einen fixen Header zu erkennen (HubSpot Themes haben oft header/nav sticky)
  const header =
    document.querySelector("header") ||
    document.querySelector(".header") ||
    document.querySelector("[data-global-header]") ||
    document.querySelector(".navbar") ||
    document.querySelector("#hs-nav-v4") ||
    null;

  const h = header?.getBoundingClientRect?.().height ?? 0;
  // bisschen Luft
  return Math.min(Math.max(h, 0), 180) + 16;
}

function scrollToCalculatorTop({ behavior = "smooth" } = {}) {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;

  const offset = getHeaderOffset();
  const y = window.scrollY + el.getBoundingClientRect().top - offset;

  window.scrollTo({ top: Math.max(0, y), behavior });
}

// globally verfügbar machen (damit NoShowCalculator das aufrufen kann)
window.__noShowScrollToTop = (opts) => scrollToCalculatorTop(opts);

function interceptAnchorClicks() {
  // wenn irgendwo ein Link auf #no-show-calculator zeigt:
  document.addEventListener("click", (e) => {
    const a = e.target?.closest?.('a[href="#no-show-calculator"]');
    if (!a) return;

    // Default Anchor-Jump verhindern
    e.preventDefault();

    // sauber scrollen
    scrollToCalculatorTop({ behavior: "smooth" });

    // Hash aus der URL entfernen -> verhindert "Reload springt nach unten"
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {}
  });
}

function mountShadow() {
  const container = document.getElementById(MOUNT_ID);
  if (!container) return;

  let host = container.querySelector(":scope > .ns-shadow-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "ns-shadow-host";
    container.appendChild(host);
  }

  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });

  const cssHref = new URL("./embed.css", import.meta.url).href;
  if (!shadow.querySelector(`link[data-ns-embed="1"]`)) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", cssHref);
    link.setAttribute("data-ns-embed", "1");
    shadow.appendChild(link);
  }

  let mount = shadow.querySelector("#ns-mount");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "ns-mount";
    shadow.appendChild(mount);
  }

  if (!mount.__noShowRoot) {
    mount.__noShowRoot = createRoot(mount);
  }

  mount.__noShowRoot.render(
    <NoShowCalculator
      onRequestScrollTop={() => scrollToCalculatorTop({ behavior: "smooth" })}
    />
  );
}

function waitAndMount() {
  interceptAnchorClicks();

  mountShadow();

  // wenn die Seite mit Hash geladen wurde, nicht “Anchor Jump” behalten
  if (location.hash === "#no-show-calculator") {
    // nach dem initialen Layout einmal korrekt scrollen
    setTimeout(() => scrollToCalculatorTop({ behavior: "auto" }), 0);
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {}
  }

  if (document.getElementById(MOUNT_ID)) return;

  const obs = new MutationObserver(() => {
    if (document.getElementById(MOUNT_ID)) {
      obs.disconnect();
      mountShadow();
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}

waitAndMount();
