import React from "react";
import { createRoot } from "react-dom/client";
import NoShowCalculator from "./NoShowCalculator.jsx";
import "./index.css"; // ✅ wichtig: damit Vite embed.css überhaupt erzeugt

const MOUNT_ID = "no-show-calculator";

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

  // CSS im Shadow laden (aus demselben Ordner wie embed.js)
  const cssHref = new URL("./embed.css", import.meta.url).href;

  if (!shadow.querySelector(`link[data-ns-embed="1"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssHref;
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
  mount.__noShowRoot.render(<NoShowCalculator />);
}

function waitAndMount() {
  mountShadow();
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