document.addEventListener("DOMContentLoaded", () => {
  if (!document.body) return;

  const currentPage = document.body.dataset.panelPage || "";
  const fadeConfigs = {
    "infinity-ratio": {
      selector: ".stage-wrap",
      variantClass: "fade-infinity",
      delay: 160
    },
    "true-recycling": {
      selector: ".stage-wrap",
      variantClass: "fade-true",
      delay: 140
    },
    "population-comparison": {
      selector: ".image-stage",
      variantClass: "fade-compare",
      delay: 180,
      waitForImageSelector: ".comparison-image"
    }
  };

  const fadeConfig = fadeConfigs[currentPage];
  const fadeTarget = fadeConfig ? document.querySelector(fadeConfig.selector) : null;

  if (fadeConfig && fadeTarget) {
    fadeTarget.classList.add("page-fade-target", fadeConfig.variantClass);

    const reveal = () => {
      setTimeout(() => {
        fadeTarget.classList.add("is-visible");
      }, fadeConfig.delay);
    };

    if (fadeConfig.waitForImageSelector) {
      const img = document.querySelector(fadeConfig.waitForImageSelector);
      if (img && !img.complete) {
        img.addEventListener("load", reveal, { once: true });
        img.addEventListener("error", reveal, { once: true });
      } else {
        reveal();
      }
    } else {
      reveal();
    }

    window.addEventListener("pageshow", event => {
      if (!event.persisted) return;
      fadeTarget.classList.remove("is-visible");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reveal();
        });
      });
    });
  }

  if (document.querySelector(".site-panel-nav")) return;
  if (document.body.dataset.panelNav === "off") return;

  const items = [
    { id: "infinity-ratio", label: "Infinity Ratio", href: "infinity-ratio.html" },
    { id: "how-they-are-used", label: "How They Are Used", href: "how-they-are-used.html" },
    { id: "true-recycling", label: "True Recycling", href: "true-recycling.html" },
    {
      id: "population-comparison",
      label: "Comparison of Per Capita Waste Generation",
      subLabel: "and Population by Province",
      href: "population-comparison.html"
    },
    { id: "canada-waste-report", label: "Canada Waste Report: 2022", href: "dashboard.html" }
  ];

  const nav = document.createElement("nav");
  nav.className = "site-panel-nav";
  nav.setAttribute("aria-label", "Project 2 navigation");

  const menu = document.createElement("ul");
  menu.className = "site-panel-nav__menu";

  items.forEach(item => {
    const listItem = document.createElement("li");
    listItem.className = "site-panel-nav__item";

    const link = document.createElement("a");
    link.className = "site-panel-nav__link";
    link.href = item.href;
    if (currentPage === item.id) {
      link.setAttribute("aria-current", "page");
    }

    const caret = document.createElement("span");
    caret.className = "site-panel-nav__caret";
    caret.textContent = "▶";

    const label = document.createElement("span");
    label.textContent = item.label;
    if (item.subLabel) {
      label.appendChild(document.createElement("br"));
      label.append(item.subLabel);
    }

    link.append(caret, label);
    listItem.appendChild(link);
    menu.appendChild(listItem);
  });

  const trigger = document.createElement("a");
  trigger.className = "site-panel-nav__trigger";
  trigger.href = "project2.html";
  trigger.setAttribute("aria-label", "Go to Project 2 landing page");

  const title = document.createElement("div");
  title.className = "site-panel-nav__title";
  title.textContent = "The Infinity Loop:";

  const subtitle = document.createElement("div");
  subtitle.className = "site-panel-nav__subtitle";
  subtitle.textContent = "A Comparative Analysis of Canada's Recycling Status";

  trigger.append(title, subtitle);
  nav.append(menu, trigger);
  document.body.appendChild(nav);
});
