(function () {
  "use strict";

  var root = document.documentElement;
  var tabs = Array.prototype.slice.call(
    document.querySelectorAll('[role="tab"]')
  );
  var panels = Array.prototype.slice.call(
    document.querySelectorAll('[role="tabpanel"]')
  );
  var tabBar = document.querySelector(".tab-index");
  var validIds = new Set(
    panels.map(function (panel) {
      return panel.id;
    })
  );
  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var baseTitle = document.title;
  var panelTitles = {
    profile: "Jim Whitescarver",
    qlf: "Quantum Logical Framework",
    quantumos: "QuantumOS",
    rchain: "RChain and the rho-calculus",
    collective: "Collective intelligence",
    writing: "Writing",
    contact: "Contact",
  };
  var currentId = null;

  function ensureTabVisible(tab) {
    if (!tabBar || !tab) {
      return;
    }

    var barRect = tabBar.getBoundingClientRect();
    var tabRect = tab.getBoundingClientRect();
    var tabLeft = tabRect.left - barRect.left + tabBar.scrollLeft;
    var tabRight = tabLeft + tabRect.width;
    var viewLeft = tabBar.scrollLeft;
    var viewRight = viewLeft + tabBar.clientWidth;
    var target = null;

    if (tabLeft < viewLeft) {
      target = tabLeft - 8;
    } else if (tabRight > viewRight) {
      target = tabRight - tabBar.clientWidth + 8;
    }

    if (target !== null) {
      tabBar.scrollTo({
        left: Math.max(0, target),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }

  function activate(id, options) {
    options = options || {};

    if (!validIds.has(id)) {
      id = "profile";
    }

    var changed = currentId !== id;
    currentId = id;
    var selectedTab = null;

    tabs.forEach(function (tab) {
      var selected = tab.getAttribute("aria-controls") === id;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        selectedTab = tab;
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    });

    ensureTabVisible(selectedTab);

    panels.forEach(function (panel) {
      panel.hidden = panel.id !== id;
    });

    document.title =
      id === "profile"
        ? baseTitle
        : (panelTitles[id] || "Jim Whitescarver") + " — Jim Whitescarver";

    if (options.updateHash && window.location.hash !== "#" + id) {
      history.pushState({}, "", "#" + id);
    }

    if (options.scroll && (changed || options.forceScroll)) {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    if (options.focusPanel) {
      var panel = document.getElementById(id);
      if (panel) {
        panel.focus({ preventScroll: true });
      }
    }
  }

  function idFromHash() {
    return window.location.hash.replace(/^#/, "");
  }

  // Initial view: honour a deep link, otherwise show the profile.
  var initialId = idFromHash();
  activate(validIds.has(initialId) ? initialId : "profile", {
    scroll: false,
  });

  // Tab clicks, the brand link, and any in-page link to a panel.
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    var link = target.closest('a[href^="#"]');
    if (!link) {
      return;
    }

    var id = link.getAttribute("href").slice(1);
    if (!validIds.has(id)) {
      return;
    }

    event.preventDefault();
    activate(id, {
      updateHash: true,
      scroll: true,
      forceScroll: link.classList.contains("tab"),
    });
  });

  // Back/forward and manually edited hashes.
  window.addEventListener("hashchange", function () {
    var id = idFromHash();
    if (validIds.has(id)) {
      activate(id, { scroll: true });
    }
  });

  // Arrow-key navigation between tabs.
  tabs.forEach(function (tab, index) {
    tab.addEventListener("keydown", function (event) {
      var nextIndex = null;

      switch (event.key) {
        case "ArrowRight":
          nextIndex = (index + 1) % tabs.length;
          break;
        case "ArrowLeft":
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      var nextTab = tabs[nextIndex];
      nextTab.focus();
      activate(nextTab.getAttribute("aria-controls"), {
        updateHash: true,
        scroll: true,
      });
    });
  });

  // Theme toggle.
  var themeToggle = document.querySelector(".theme-toggle");

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    var dark = theme === "dark";

    if (themeToggle) {
      themeToggle.textContent = dark ? "Light" : "Dark";
      themeToggle.setAttribute(
        "aria-label",
        dark ? "Switch to light theme" : "Switch to dark theme"
      );
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", dark ? "#151513" : "#fcfbf7");
    }

    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (error) {
        // The preference simply does not persist.
      }
    }
  }

  if (themeToggle) {
    setTheme(root.dataset.theme === "dark" ? "dark" : "light", false);
    themeToggle.addEventListener("click", function () {
      setTheme(
        root.dataset.theme === "dark" ? "light" : "dark",
        true
      );
    });
  }

  // Copy-to-clipboard controls.
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var text = button.getAttribute("data-copy");
      var restore = button.textContent;
      var copied = false;

      function showCopied() {
        button.textContent = "Copied";
        window.setTimeout(function () {
          button.textContent = restore;
        }, 1600);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(showCopied)
          .catch(function () {
            fallbackCopy(text, showCopied);
          });
      } else {
        fallbackCopy(text, showCopied);
      }
    });
  });

  function fallbackCopy(text, onSuccess) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();

    try {
      if (document.execCommand("copy")) {
        onSuccess();
      }
    } catch (error) {
      // Nothing else to try; leave the text visible in the page.
    } finally {
      area.remove();
    }
  }

  // Print / save PDF. Only the active panel is printed.
  document.querySelectorAll("[data-print]").forEach(function (button) {
    button.addEventListener("click", function () {
      window.print();
    });
  });
})();
