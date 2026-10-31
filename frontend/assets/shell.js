(function (global) {
  "use strict";

  var officialPages = {
    dashboard: { label: "Dashboard", href: "official-dashboard.html", icon: "dashboard" },
    operations: { label: "Operations", href: "new-compliance-scan.html", icon: "document_scanner" },
    history: { label: "History", href: "scan-history.html", icon: "history" },
    products: { label: "Products", href: "products.html", icon: "inventory_2" },
    settings: { label: "Settings", href: "settings.html", icon: "settings" }
  };
  var aliases = {
    "official-dashboard.html": "dashboard",
    "new-compliance-scan.html": "operations",
    "scan-history.html": "history",
    "review-queue.html": "history",
    "case-details.html": "history",
    "log-case-action.html": "history",
    "products.html": "products",
    "settings.html": "settings",
    "profile.html": "settings",
    "support.html": "support",
    "compliance-report.html": "history",
    "compliance-result.html": "operations"
  };

  function escape(value) {
    return global.LL && global.LL.escapeHtml ? global.LL.escapeHtml(value) : String(value || "");
  }

  function pageName() {
    return (global.location.pathname.split("/").pop() || "official-dashboard.html").toLowerCase();
  }

  function roleFor(session) {
    return "official";
  }

  function removeLegacyShell() {
    document.querySelectorAll("body > aside, body > nav.fixed, header, .ll-official-header, .ll-manufacturer-header").forEach(function (element) {
      element.remove();
    });
  }

  function ensureShellStyles() {
    document.body.classList.add("ll-shell");
    if (document.querySelector('link[href^="assets/shell.css"]')) return;
    var stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "assets/shell.css?v=20261031-7";
    document.head.appendChild(stylesheet);
  }

  function render(user, role) {
    ensureShellStyles();
    removeLegacyShell();
    var pages = officialPages;
    var active = aliases[pageName()] || "dashboard";
    var roleLabel = user.demoMode ? "DEMO" : "OFFICIAL";
    var pageTitle = active === "support" ? "Support" : (pages[active] ? pages[active].label : "LegalLens");
    var dashboard = pages.dashboard.href;
    var operations = pages.operations.href;
    var nav = Object.keys(pages).map(function (key) {
      var item = pages[key];
      return '<a class="ll-sidebar-link' + (key === active ? ' is-active' : '') + '" href="' + item.href + '" data-nav="' + key + '"' + (key === active ? ' aria-current="page"' : '') + '><span class="material-symbols-outlined">' + item.icon + '</span><span>' + item.label + '</span></a>';
    }).join("");
    var sidebar = document.createElement("aside");
    sidebar.className = "ll-sidebar";
    sidebar.id = "ll-sidebar";
    sidebar.setAttribute("aria-label", roleLabel + " navigation");
    sidebar.innerHTML = '<div class="ll-sidebar-brand"><a href="' + dashboard + '"><img src="assets/page-previews/Logo.png" alt="LegalLens"><span><strong>LegalLens</strong><small>Government portal</small></span></a></div>' +
      '<a class="ll-new-scan" href="' + operations + '"><span class="material-symbols-outlined">add</span><span>New Compliance Scan</span></a>' +
      '<nav class="ll-sidebar-main" aria-label="Primary navigation">' + nav + '</nav>' +
      '<div class="ll-sidebar-bottom"><a class="ll-sidebar-link ll-support' + (active === "support" ? ' is-active' : '') + '" href="support.html"' + (active === "support" ? ' aria-current="page"' : '') + '><span class="material-symbols-outlined">help</span><span>Support</span></a><button class="ll-sidebar-link ll-logout" type="button"><span class="material-symbols-outlined">logout</span><span>' + (user.demoMode ? 'Exit Demo' : 'Logout') + '</span></button></div>';
    document.body.appendChild(sidebar);

    var header = document.createElement("header");
    header.className = "ll-header";
    header.innerHTML = '<button class="ll-menu-toggle" type="button" aria-label="Open navigation" aria-controls="ll-sidebar" aria-expanded="false"><span class="material-symbols-outlined">menu</span></button>' +
      '<div class="ll-header-title"><img class="ll-header-logo" src="assets/page-previews/Logo.png" alt="LegalLens"><span class="ll-demo-pill"' + (user.demoMode ? '' : ' hidden') + '>DEMO MODE</span><span class="ll-demo-message"' + (user.demoMode ? '' : ' hidden') + '>You are exploring the LegalLense demonstration environment.</span><span>' + pageTitle + '</span></div>' +
      '<nav class="ll-header-nav" aria-label="Quick navigation"><a href="' + dashboard + '">Dashboard</a><a href="' + operations + '">New Scan</a><a href="scan-history.html">History</a><a href="review-queue.html">Review Queue</a></nav>' +
      '<div class="ll-header-account"><span>' + roleLabel + '</span><button class="ll-profile-button" type="button" aria-label="Open profile" aria-expanded="false"><span class="material-symbols-outlined">person</span></button><div class="ll-profile-menu" hidden><div class="ll-profile-heading"><span class="material-symbols-outlined">account_circle</span><span><strong>' + escape(user.fullName) + '</strong><small>' + escape(user.email) + '</small></span></div><a href="profile.html">Profile</a><a href="settings.html">Settings</a><button class="ll-menu-logout" type="button"><span class="material-symbols-outlined">logout</span>Logout</button></div></div>';
    document.body.appendChild(header);

    var overlay = document.createElement("div");
    overlay.className = "ll-sidebar-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    var toggle = header.querySelector(".ll-menu-toggle");
    function setSidebarOpen(open, returnFocus) {
      document.body.classList.toggle("ll-sidebar-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      sidebar.setAttribute("aria-hidden", String(!open && global.matchMedia("(max-width: 900px)").matches));
      sidebar.inert = !open && global.matchMedia("(max-width: 900px)").matches;
      if (open) {
        var firstLink = sidebar.querySelector("a");
        if (firstLink) firstLink.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    }
    function closeSidebar() { setSidebarOpen(false, false); }
    function syncSidebarForViewport() {
      var mobile = global.matchMedia("(max-width: 900px)").matches;
      if (!mobile) {
        document.body.classList.remove("ll-sidebar-open");
        sidebar.removeAttribute("aria-hidden");
        sidebar.inert = false;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation");
      } else if (!document.body.classList.contains("ll-sidebar-open")) {
        sidebar.setAttribute("aria-hidden", "true");
        sidebar.inert = true;
      }
    }
    toggle.addEventListener("click", function () {
      setSidebarOpen(!document.body.classList.contains("ll-sidebar-open"), true);
    });
    overlay.addEventListener("click", closeSidebar);
    document.addEventListener("click", function (event) {
      if (document.body.classList.contains("ll-sidebar-open") && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
        closeSidebar();
      }
    });
    sidebar.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeSidebar); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && document.body.classList.contains("ll-sidebar-open")) {
        setSidebarOpen(false, true);
        return;
      }
      if (event.key === "Tab" && document.body.classList.contains("ll-sidebar-open")) {
        var focusable = Array.prototype.slice.call(sidebar.querySelectorAll('a[href],button:not(:disabled),[tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    global.addEventListener("resize", syncSidebarForViewport);
    syncSidebarForViewport();

    var profileButton = header.querySelector(".ll-profile-button");
    var profileMenu = header.querySelector(".ll-profile-menu");
    profileButton.addEventListener("click", function (event) { event.stopPropagation(); profileMenu.hidden = !profileMenu.hidden; profileButton.setAttribute("aria-expanded", String(!profileMenu.hidden)); });
    document.addEventListener("click", function (event) { if (!header.querySelector(".ll-header-account").contains(event.target)) { profileMenu.hidden = true; profileButton.setAttribute("aria-expanded", "false"); } });
    function logout() {
      var isDemo = !!(user && user.demoMode);
      var request = isDemo && global.LLAuth && global.LLAuth.logoutDemo
        ? global.LLAuth.logoutDemo()
        : (global.LLAuth && global.LLAuth.logout ? global.LLAuth.logout() : Promise.resolve());
      Promise.resolve(request).catch(function () {}).finally(function () {
        sessionStorage.removeItem("legallense_session_v1");
        localStorage.removeItem("legallense_demo_session_v1");
        global.location.replace("login.html");
      });
    }
    sidebar.querySelector(".ll-logout").addEventListener("click", logout);
    header.querySelector(".ll-menu-logout").addEventListener("click", logout);
  }

  function start() {
    if (global.__legalLensShellStarted) return;
    global.__legalLensShellStarted = true;
    var auth = global.LL && global.LL.getAuthState ? global.LL.getAuthState() : null;
    if (!auth) {
      global.location.replace("login.html");
      return;
    }
    var session = auth.session;
    var role = auth.role;
    if (auth.demoMode && global.LLAuth && global.LLAuth.validateDemoSession) {
      global.LLAuth.validateDemoSession().then(function () {
        render({ fullName: session.name || "LegalLense Demo", email: session.email || "", demoMode: true }, role);
      }).catch(function () {
        sessionStorage.removeItem("legallense_session_v1");
        localStorage.removeItem("legallense_demo_session_v1");
        localStorage.removeItem("legallense_demo_scans_v1");
        global.location.replace("login.html");
      });
      return;
    }
    render({ fullName: session.name || "Inspector Rajesh Kumar", email: session.email || "", demoMode: false }, role);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(window);