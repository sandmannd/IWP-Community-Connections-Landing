(function () {

  window.iwpAdventureImageFallback = function (img) {
    if (!img) return;
    var parent = img.parentNode;
    if (!parent || parent.getAttribute('data-fallback-active') === 'true') return;
    parent.setAttribute('data-fallback-active', 'true');
    parent.classList.add(parent.classList.contains('featured-event-image') ? 'featured-event-image-fallback' : 'live-card-image-fallback');
    var icon = img.getAttribute('data-fallback-icon') || '🤝';
    parent.innerHTML = '<span>' + escapeHtml(icon) + '</span>';
  };
  var c = window.IWP_SITE_CONFIG || {};

  document.querySelectorAll("[data-config]").forEach(function (el) {
    var key = el.getAttribute("data-config");
    if (c[key]) el.textContent = c[key];
  });

  document.querySelectorAll("[data-href-config]").forEach(function (el) {
    var key = el.getAttribute("data-href-config");
    if (c[key]) el.href = c[key];
  });

  document.querySelectorAll("[data-mailto-config]").forEach(function (el) {
    var key = el.getAttribute("data-mailto-config");
    if (c[key]) el.href = "mailto:" + c[key];
  });

  document.querySelectorAll("[data-launch-app]").forEach(function (el) {
    if (!c.appUrl || c.appUrl.indexOf("PASTE_") === 0) {
      el.href = "#launch";
      el.addEventListener("click", function (event) {
        event.preventDefault();
        alert("The Community Connections application link is being finalized.");
      });
    } else {
      el.href = c.appUrl;
      el.removeAttribute("target");
      el.removeAttribute("rel");
    }
  });


  var menuButton = document.querySelector(".mobile-menu-button");
  var mainNavigation = document.getElementById("mainNavigation");

  if (menuButton && mainNavigation) {
    menuButton.addEventListener("click", function () {
      var expanded = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!expanded));
      mainNavigation.classList.toggle("is-open", !expanded);
      menuButton.textContent = expanded ? "Menu" : "Close";
    });

    mainNavigation.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menuButton.setAttribute("aria-expanded", "false");
        mainNavigation.classList.remove("is-open");
        menuButton.textContent = "Menu";
      });
    });
  }

  document.querySelectorAll(".faq-item").forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      document.querySelectorAll(".faq-item[open]").forEach(function (other) {
        if (other !== item) other.removeAttribute("open");
      });
    });
  });


  window.iwpLandingDataCallback = function (data) {
    renderFeaturedAdventure(data && data.featured);
    renderUpcomingAdventures(data && data.upcoming ? data.upcoming : []);
  };

  function loadLandingData() {
    if (!c.apiUrl) {
      renderLandingDataError();
      return;
    }

    var script = document.createElement("script");
    var separator = c.apiUrl.indexOf("?") === -1 ? "?" : "&";
    script.src = c.apiUrl + separator + "callback=iwpLandingDataCallback&_=" + Date.now();
    script.async = true;
    script.onerror = renderLandingDataError;
    document.head.appendChild(script);

    window.setTimeout(function () {
      var featured = document.getElementById("featuredAdventureContent");
      if (featured && featured.querySelector(".featured-loading")) {
        renderLandingDataError();
      }
    }, 12000);
  }

  function isSafeLandingImageUrl(url) {
    var value = String(url || '').trim();
    if (!value) return false;
    // Google Drive thumbnails frequently require cookies or sharing permissions.
    // The landing page uses a reliable category icon instead of attempting them.
    if (/drive\.google\.com|googleusercontent\.com/i.test(value)) return false;
    return /^https:\/\//i.test(value);
  }

  function renderFeaturedAdventure(event) {
    var container = document.getElementById("featuredAdventureContent");
    if (!container) return;

    if (!event) {
      container.innerHTML =
        '<div class="featured-empty">' +
          '<span class="featured-badge">⭐ Featured Adventure</span>' +
          '<h2>New adventures are coming soon.</h2>' +
          '<p>Visit the live adventure list or Facebook group for the newest updates.</p>' +
          '<div class="featured-actions">' +
            '<a class="button" href="' + escapeAttr(c.appUrl || "#") + '">Browse Adventures</a>' +
            '<a class="button secondary" target="_blank" rel="noopener" href="' + escapeAttr(c.facebookUrl || "#") + '">Facebook Group</a>' +
          '</div>' +
        '</div>';
      return;
    }

    var image = isSafeLandingImageUrl(event.imageUrl)
      ? '<div class="featured-event-image"><img data-adventure-image data-fallback-icon="' + escapeAttr(categoryIcon(event.type)) + '" onerror="window.iwpAdventureImageFallback(this)" src="' + escapeAttr(event.imageUrl) + '" alt=""></div>'
      : '<div class="featured-event-image featured-event-image-fallback"><span>' + categoryIcon(event.type) + '</span></div>';

    container.innerHTML =
      '<div class="featured-badge">⭐ Featured Adventure</div>' +
      '<div class="featured-event-layout">' +
        image +
        '<div class="featured-event-copy">' +
          '<span class="eyebrow">' + escapeHtml(event.type || "Adventure") + '</span>' +
          '<h2>' + escapeHtml(event.title || "Community Adventure") + '</h2>' +
          '<p class="featured-event-date">' + escapeHtml(formatEventDate(event)) + '</p>' +
          '<p>' + escapeHtml(event.description || "Join the community for the next adventure.") + '</p>' +
          '<div class="featured-event-meta">' +
            metaPill("📍", event.location || "Location in details") +
            metaPill("💵", event.costLabel || "See details") +
            metaPill("👥", event.availabilityLabel || "Registration open") +
          '</div>' +
          '<div class="featured-actions">' +
            '<a class="button" href="' + escapeAttr(event.registrationUrl || event.detailsUrl || c.appUrl) + '">Register Now →</a>' +
            '<a class="button secondary" href="' + escapeAttr(event.detailsUrl || c.appUrl) + '">View Details</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    activateAdventureImageFallbacks(container);
  }

  function renderUpcomingAdventures(events) {
    var grid = document.getElementById("upcomingAdventureGrid");
    if (!grid) return;

    if (!events.length) {
      grid.innerHTML =
        '<div class="live-empty">' +
          '<strong>No upcoming adventures are published yet.</strong>' +
          '<span>Check back soon or visit the Facebook group for updates.</span>' +
        '</div>';
      return;
    }

    grid.innerHTML = events.map(function (event) {
      var image = isSafeLandingImageUrl(event.imageUrl)
        ? '<div class="live-card-image"><img data-adventure-image data-fallback-icon="' + escapeAttr(categoryIcon(event.type)) + '" onerror="window.iwpAdventureImageFallback(this)" loading="lazy" decoding="async" src="' + escapeAttr(event.imageUrl) + '" alt=""></div>'
        : '<div class="live-card-image live-card-image-fallback"><span>' + categoryIcon(event.type) + '</span></div>';

      return '<article class="live-event-card">' +
        image +
        '<div class="live-card-body">' +
          '<div class="live-card-topline"><span>' + escapeHtml(event.type || "Adventure") + '</span><strong>' + escapeHtml(event.availabilityLabel || "Open") + '</strong></div>' +
          '<h3>' + escapeHtml(event.title || "Community Adventure") + '</h3>' +
          '<p class="live-card-date">' + escapeHtml(formatEventDate(event)) + '</p>' +
          '<p class="live-card-location">📍 ' + escapeHtml(event.location || "Location in details") + '</p>' +
          '<div class="live-card-footer"><strong>' + escapeHtml(event.costLabel || "See details") + '</strong><a href="' + escapeAttr(event.detailsUrl || c.appUrl) + '">Details →</a></div>' +
        '</div>' +
      '</article>';
    }).join("");
    activateAdventureImageFallbacks(grid);
  }

  function activateAdventureImageFallbacks(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('img[data-adventure-image]'), function (img) {
      var showFallback = function () {
        window.iwpAdventureImageFallback(img);
      };
      img.addEventListener('error', showFallback, { once: true });
      if (img.complete && img.naturalWidth === 0) showFallback();
    });
  }

  function renderLandingDataError() {
    var featured = document.getElementById("featuredAdventureContent");
    var grid = document.getElementById("upcomingAdventureGrid");

    if (featured && featured.querySelector(".featured-loading")) {
      featured.innerHTML =
        '<div class="featured-empty">' +
          '<span class="featured-badge">⭐ Featured Adventure</span>' +
          '<h2>Browse the live adventure list.</h2>' +
          '<p>The landing page could not load the schedule right now, but the full Community Connections app is available.</p>' +
          '<div class="featured-actions"><a class="button" href="' + escapeAttr(c.appUrl || "#") + '">Open Community Connections</a></div>' +
        '</div>';
    }

    if (grid) {
      grid.innerHTML =
        '<div class="live-empty"><strong>Live schedule temporarily unavailable.</strong><span>Open Community Connections to see current adventures.</span></div>';
    }
  }

  function formatEventDate(event) {
    var date = parseDateKey(event.startDate);
    var dateLabel = date
      ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date)
      : "Date coming soon";

    var time = event.startTime || "";
    return time ? dateLabel + " · " + time : dateLabel;
  }

  function parseDateKey(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function categoryIcon(type) {
    var value = String(type || "").toLowerCase();
    if (value.indexOf("fish") !== -1) return "🎣";
    if (value.indexOf("camp") !== -1 || value.indexOf("bonfire") !== -1) return "🏕️";
    if (value.indexOf("tub") !== -1 || value.indexOf("kayak") !== -1) return "🌊";
    if (value.indexOf("hunt") !== -1) return "🦌";
    if (value.indexOf("bowling") !== -1) return "🎳";
    if (value.indexOf("concert") !== -1) return "🎵";
    if (value.indexOf("atv") !== -1 || value.indexOf("utv") !== -1) return "🏞️";
    return "🤝";
  }

  function metaPill(icon, text) {
    return '<span><b>' + icon + '</b>' + escapeHtml(text || "") + '</span>';
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  loadLandingData();

  var revealElements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach(function (element) {
      if (!element.classList.contains("is-visible")) observer.observe(element);
    });
  } else {
    revealElements.forEach(function (element) {
      element.classList.add("is-visible");
    });
  }
})();
