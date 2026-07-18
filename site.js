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

  function appendQueryParam(url, key, value) {
    var source = String(url || '').trim();
    if (!source) return source;
    try {
      var parsed = new URL(source, window.location.href);
      if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
      return parsed.toString();
    } catch (error) {
      var separator = source.indexOf('?') === -1 ? '?' : '&';
      return source + separator + encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }
  }

  function publicAppUrl(url) {
    var source = String(url || c.appUrl || '').trim();
    if (!source) return source;
    return /script\.google\.com\/macros\/s\//i.test(source)
      ? appendQueryParam(source, 'public', '1')
      : source;
  }

  function showAppLaunchOverlay() {
    var overlay = document.getElementById('appLaunchOverlay');
    if (!overlay) return;
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function warmCommunityConnections() {
    var url = publicAppUrl(c.appUrl);
    if (!url || window.__iwpAppWarmStarted) return;
    window.__iwpAppWarmStarted = true;
    try {
      fetch(url, { mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true }).catch(function () {});
    } catch (error) {}
  }

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
    var isAdventureBuilder =
      el.dataset.organizerLaunch === "true" ||
      el.textContent.trim().toLowerCase().indexOf("adventure builder") !== -1;

    if (isAdventureBuilder) {
      el.href = c.appUrl;
      el.dataset.organizerLaunch = "true";
    } else {
      el.href = publicAppUrl(c.appUrl);
    }

    el.removeAttribute("target");
    el.removeAttribute("rel");
    el.addEventListener("pointerenter", warmCommunityConnections, { once: true });
    el.addEventListener("touchstart", warmCommunityConnections, {
      once: true,
      passive: true
    });
    el.addEventListener("click", showAppLaunchOverlay);
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
    var upcoming = data && data.upcoming ? data.upcoming : [];
    renderFeaturedAdventure(data && data.featured);
    renderUpcomingAdventures(upcoming);
    renderLandingCategories(upcoming, data && data.featured);
    activateFastNavigation(document);
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

  function renderLandingCategories(events, featuredEvent) {
    var grid = document.getElementById("landingCategoryGrid");
    if (!grid) return;

    var featuredCategory = featuredEvent ? canonicalLandingCategory(featuredEvent.type) : null;
    var categories = {};

    (events || []).forEach(function (event) {
      var sourceType = String(event.type || "").trim();
      if (!sourceType) return;

      var category = canonicalLandingCategory(sourceType);
      if (!categories[category.key]) {
        categories[category.key] = {
          key: category.key,
          label: category.label,
          order: category.order,
          count: 0,
          featured: false
        };
      }
      categories[category.key].count += 1;
    });

    if (featuredCategory && categories[featuredCategory.key]) {
      categories[featuredCategory.key].featured = true;
    }

    var items = Object.keys(categories)
      .map(function (key) { return categories[key]; })
      .sort(function (a, b) {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return b.count - a.count || a.order - b.order || a.label.localeCompare(b.label);
      });

    if (!items.length) {
      grid.innerHTML = '<a class="activity-category-card activity-category-card--browse" href="' + escapeAttr(publicAppUrl(c.appUrl) || '#') + '">' +
        '<span class="activity-category-photo is-loading" data-bg="assets/hands-community.webp"></span>' +
        '<span class="activity-category-shade"></span>' +
        '<span class="activity-category-content"><span class="activity-category-icon">' + categorySvg('browse') + '</span><strong>Browse Adventures</strong><span class="activity-category-count">New adventures coming soon</span></span>' +
      '</a>';
      activateLazyCategoryImages(grid);
      return;
    }

    grid.innerHTML = items.map(function (category) {
      var visual = categoryVisual(category.key);
      var countLabel = category.count + ' ' + (category.count === 1 ? 'Adventure' : 'Adventures');
      var featuredBadge = category.featured ? '<span class="activity-category-featured">★ Featured</span>' : '';

      return '<a class="activity-category-card' + (category.featured ? ' is-featured' : '') + '" href="' + escapeAttr(publicAppUrl(c.appUrl) || '#') + '" aria-label="View ' + escapeAttr(category.label) + ' adventures, ' + category.count + ' available">' +
        '<span class="activity-category-photo is-loading" data-bg="' + escapeAttr(visual.image) + '"></span>' +
        '<span class="activity-category-shade"></span>' +
        featuredBadge +
        '<span class="activity-category-content">' +
          '<span class="activity-category-icon" aria-hidden="true">' + categorySvg(visual.icon) + '</span>' +
          '<strong>' + escapeHtml(category.label) + '</strong>' +
          '<span class="activity-category-count">' + escapeHtml(countLabel) + '</span>' +
        '</span>' +
      '</a>';
    }).join('');
    activateLazyCategoryImages(grid);
  }

  function activateLazyCategoryImages(root) {
    var photos = Array.prototype.slice.call((root || document).querySelectorAll('.activity-category-photo[data-bg]'));
    if (!photos.length) return;

    function loadPhoto(photo) {
      if (!photo || photo.dataset.loaded === 'true') return;
      var src = photo.getAttribute('data-bg');
      if (!src) return;
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        photo.style.backgroundImage = 'url(\"' + src.replace(/\"/g, '') + '\")';
        photo.dataset.loaded = 'true';
        photo.classList.remove('is-loading');
        window.requestAnimationFrame(function () { photo.classList.add('is-loaded'); });
      };
      img.onerror = function () { photo.classList.remove('is-loading'); photo.classList.add('is-error'); };
      img.src = src;
    }

    if (!('IntersectionObserver' in window)) {
      photos.forEach(loadPhoto);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadPhoto(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '260px 0px', threshold: 0.01 });

    photos.forEach(function (photo) { observer.observe(photo); });
  }

  function canonicalLandingCategory(type) {
    var value = String(type || '').toLowerCase().replace(/&/g, ' and ');
    if (/atv|utv|off.?road|four.?wheel|trail ride/.test(value)) return { key: 'atv-utv', label: 'ATV / UTV', order: 10 };
    if (/camp|camping|bonfire|campfire/.test(value)) return { key: 'camping', label: 'Camping', order: 20 };
    if (/hik|hiking|walk|walking|trail/.test(value)) return { key: 'hiking', label: 'Hiking', order: 30 };
    if (/ice\s*fish/.test(value)) return { key: 'ice-fishing', label: 'Ice Fishing', order: 40 };
    if (/fish/.test(value)) return { key: 'fishing', label: 'Fishing', order: 50 };
    if (/hunt|hunting|shoot|archer/.test(value)) return { key: 'hunting', label: 'Hunting', order: 60 };
    if (/tub|tube|kayak|canoe|paddle|water/.test(value)) return { key: 'water-adventures', label: 'Tubing / Kayaking', order: 70 };
    if (/sport|game|ball|golf|race|rodeo|bowling/.test(value)) return { key: 'sporting-events', label: 'Sporting Events', order: 80 };
    if (/poker|cribbage|card|board game|game night|bingo/.test(value)) return { key: 'games-social', label: 'Games & Social', order: 90 };
    if (/family|kid|children/.test(value)) return { key: 'family-activities', label: 'Family Activities', order: 100 };
    if (/wellness|support|peer|therapy|health/.test(value)) return { key: 'wellness-support', label: 'Wellness & Support', order: 110 };
    if (/community|meetup|social|connection|gather/.test(value)) return { key: 'community-meetups', label: 'Community Meetups', order: 120 };
    var fallbackLabel = titleCaseCategory(type) || 'Other Adventures';
    return { key: slugifyCategory(fallbackLabel), label: fallbackLabel, order: 900 };
  }

  function titleCaseCategory(value) {
    return String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function slugifyCategory(value) {
    var slug = String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'other-adventures';
  }

  function categoryVisual(key) {
    var visuals = {
      'atv-utv': { image: 'assets/hiking.webp', icon: 'mountain' },
      'camping': { image: 'assets/bonfire.webp', icon: 'camp' },
      'hiking': { image: 'assets/hiking.webp', icon: 'hike' },
      'ice-fishing': { image: 'assets/ice-fishing.webp', icon: 'snow' },
      'fishing': { image: 'assets/kayak.webp', icon: 'fish' },
      'hunting': { image: 'assets/hiking.webp', icon: 'target' },
      'water-adventures': { image: 'assets/kayak.webp', icon: 'water' },
      'sporting-events': { image: 'assets/campfire-community.webp', icon: 'people' },
      'games-social': { image: 'assets/campfire-community.webp', icon: 'cards' },
      'family-activities': { image: 'assets/hands-community.webp', icon: 'family' },
      'wellness-support': { image: 'assets/hands-community.webp', icon: 'heart' },
      'community-meetups': { image: 'assets/campfire-community.webp', icon: 'people' },
      'other-adventures': { image: 'assets/campfire-community.webp', icon: 'browse' }
    };
    return visuals[key] || visuals['other-adventures'];
  }

  function categorySvg(icon) {
    var common = 'viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
    var icons = {
      camp: '<svg ' + common + '><path d="M8 53 31 12l25 41H8Z"/><path d="M31 12v41M19 53l12-20 13 20"/></svg>',
      hike: '<svg ' + common + '><circle cx="39" cy="10" r="5"/><path d="m34 20-9 13 10 8-6 15M35 27l12 8 8-5M25 33l-12 9"/></svg>',
      fish: '<svg ' + common + '><path d="M10 32c10-13 24-16 37-7l9-7v28l-9-7c-13 9-27 6-37-7Z"/><circle cx="42" cy="28" r="1" fill="currentColor" stroke="none"/></svg>',
      snow: '<svg ' + common + '><path d="M32 5v54M8 19l48 26M8 45l48-26M20 10l12 10 12-10M20 54l12-10 12 10M9 30l15 2-6 14M55 34l-15-2 6-14"/></svg>',
      target: '<svg ' + common + '><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="4"/><path d="M32 3v10M32 51v10M3 32h10M51 32h10"/></svg>',
      water: '<svg ' + common + '><path d="M32 6C20 21 14 29 14 40a18 18 0 0 0 36 0C50 29 44 21 32 6Z"/><path d="M21 43c5 5 14 6 22 0"/></svg>',
      mountain: '<svg ' + common + '><path d="M5 54 23 22l9 15 8-12 19 29H5Z"/><path d="m17 33 6-11 5 9"/></svg>',
      people: '<svg ' + common + '><circle cx="32" cy="20" r="8"/><circle cx="14" cy="27" r="6"/><circle cx="50" cy="27" r="6"/><path d="M18 55v-9c0-8 6-14 14-14s14 6 14 14v9M3 55v-6c0-7 5-12 11-12 3 0 5 1 7 3M61 55v-6c0-7-5-12-11-12-3 0-5 1-7 3"/></svg>',
      cards: '<svg ' + common + '><rect x="9" y="13" width="30" height="40" rx="4"/><rect x="25" y="7" width="30" height="40" rx="4"/><path d="M40 18l4 6-4 6-4-6 4-6Z"/></svg>',
      family: '<svg ' + common + '><circle cx="22" cy="20" r="7"/><circle cx="43" cy="20" r="7"/><circle cx="32" cy="35" r="6"/><path d="M8 56v-8c0-9 6-15 14-15 4 0 8 2 10 5M56 56v-8c0-9-6-15-13-15-5 0-8 2-11 5M21 57v-5c0-7 5-12 11-12s11 5 11 12v5"/></svg>',
      heart: '<svg ' + common + '><path d="M32 55 10 34C-1 23 6 8 19 8c7 0 11 4 13 9 2-5 6-9 13-9 13 0 20 15 9 26L32 55Z"/></svg>',
      browse: '<svg ' + common + '><circle cx="27" cy="27" r="17"/><path d="m40 40 16 16"/></svg>'
    };
    return icons[icon] || icons.people;
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
            '<a class="button" href="' + escapeAttr(publicAppUrl(c.appUrl) || "#") + '">Browse Adventures</a>' +
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
            '<a class="button" href="' + escapeAttr(publicAppUrl(event.registrationUrl || event.detailsUrl || c.appUrl)) + '">Register Now →</a>' +
            '<a class="button secondary" href="' + escapeAttr(publicAppUrl(event.detailsUrl || c.appUrl)) + '">View Details</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    activateAdventureImageFallbacks(container);
    activatePremiumPolish(container);
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
          '<div class="live-card-footer"><strong>' + escapeHtml(event.costLabel || "See details") + '</strong><a href="' + escapeAttr(publicAppUrl(event.detailsUrl || c.appUrl)) + '">Details →</a></div>' +
        '</div>' +
      '</article>';
    }).join("");
    activateAdventureImageFallbacks(grid);
    activatePremiumPolish(grid);
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
    renderLandingCategories([]);
    var featured = document.getElementById("featuredAdventureContent");
    var grid = document.getElementById("upcomingAdventureGrid");

    if (featured && featured.querySelector(".featured-loading")) {
      featured.innerHTML =
        '<div class="featured-empty">' +
          '<span class="featured-badge">⭐ Featured Adventure</span>' +
          '<h2>Browse the live adventure list.</h2>' +
          '<p>The landing page could not load the schedule right now, but the full Community Connections app is available.</p>' +
          '<div class="featured-actions"><a class="button" href="' + escapeAttr(publicAppUrl(c.appUrl) || "#") + '">Open Community Connections</a></div>' +
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


  // V24 Sprint 9E premium polish: image fade-in and restrained button ripple.
  function activatePremiumPolish(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('img'), function (img) {
      if (img.dataset.iwpPolishBound === '1') return;
      img.dataset.iwpPolishBound = '1';
      var markLoaded = function () { img.classList.add('is-loaded'); };
      img.addEventListener('load', markLoaded, { once: true });
      if (img.complete && img.naturalWidth > 0) markLoaded();
    });

    Array.prototype.forEach.call(root.querySelectorAll('a.button, .lp9d-actions a, .featured-actions a, .lp9d-primary, .lp9d-secondary'), function (button) {
      if (button.dataset.iwpRippleBound === '1') return;
      button.dataset.iwpRippleBound = '1';
      button.addEventListener('pointerdown', function (event) {
        var rect = button.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'iwp-ripple';
        ripple.style.left = (event.clientX - rect.left) + 'px';
        ripple.style.top = (event.clientY - rect.top) + 'px';
        button.appendChild(ripple);
        window.setTimeout(function () { ripple.remove(); }, 620);
      });
    });
  }

  function activateFastNavigation(root) {
    root = root || document;

    Array.prototype.forEach.call(
  root.querySelectorAll('a[href*="script.google.com/macros/s/"]'),
  function (link) {

    // Organizer links must never be forced into public-preview mode.
    var isOrganizerLink =
      link.dataset.organizerLaunch === "true" ||
      link.textContent.toLowerCase().indexOf("adventure builder") !== -1 ||
      link.textContent.toLowerCase().indexOf("organizer") !== -1;

    if (isOrganizerLink) {
      link.href = c.appUrl;
      link.dataset.organizerLaunch = "true";
    } else {
      if (link.dataset.organizerLink !== "true") {
		link.href = publicAppUrl(link.href);
	}

    if (link.dataset.iwpFastNavBound === '1') return;
    link.dataset.iwpFastNavBound = '1';

    link.addEventListener('pointerenter', warmCommunityConnections, { once: true });
    link.addEventListener('touchstart', warmCommunityConnections, {
      once: true,
      passive: true
    });
    link.addEventListener('click', showAppLaunchOverlay);
  }
);

    Array.prototype.forEach.call(root.querySelectorAll('.lp9d-story-card'), function (card) {
      if (card.dataset.iwpCardLinkBound === '1') return;
      var link = card.querySelector('a[href]');
      if (!link) return;
      card.dataset.iwpCardLinkBound = '1';
      card.classList.add('is-clickable');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');
      card.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        if (link.target === '_blank') window.open(link.href, '_blank', 'noopener');
        else {
          if (/script\.google\.com/i.test(link.href)) showAppLaunchOverlay();
          window.location.href = link.href;
        }
      });
      card.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        card.click();
      });
    });
  }

  activatePremiumPolish(document);
  activateFastNavigation(document);
  window.setTimeout(warmCommunityConnections, 900);
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
