(function () {
  'use strict';
  var config = window.IWP_SITE_CONFIG || {};
  var root = document.getElementById('adventureRoot');

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escapeAttr(value) { return escapeHtml(value); }
  function bool(value) { return value === true || String(value).toLowerCase() === 'true' || String(value) === '1'; }
  function dateValue(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  }
  function dateRange(event) {
    var start = dateValue(event.StartDate), end = dateValue(event.EndDate);
    if (!start) return 'Date coming soon';
    var full = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    if (!end || event.StartDate === event.EndDate) return full.format(start);
    return full.format(start) + ' – ' + full.format(end);
  }
  function formatTime(value) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return String(value || '');
    var h = Number(match[1]), m = match[2], suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + suffix;
  }
  function timeRange(event) {
    var start = formatTime(event.StartTime), end = formatTime(event.EndTime);
    if (start && end) return start + ' – ' + end;
    return start || end || 'Time coming soon';
  }
  function costLabel(event) {
    if (bool(event.FreeEvent)) return 'Free';
    if (String(event.VariableCost || '').trim()) return 'Cost varies';
    var adult = String(event.AdultCost || '').replace(/^\$/, '').trim();
    var child = String(event.ChildCost || '').replace(/^\$/, '').trim();
    if (adult && child) return '$' + adult + ' adult / $' + child + ' child';
    if (adult) return '$' + adult;
    if (child) return '$' + child + ' child';
    return 'See adventure details';
  }
  function richText(value) {
    return escapeHtml(value || '').replace(/\r?\n\r?\n/g, '</p><p>').replace(/\r?\n/g, '<br>');
  }
  function icon(type) {
    var v = String(type || '').toLowerCase();
    if (v.indexOf('cruise') >= 0 || v.indexOf('vacation') >= 0) return '🚢';
    if (v.indexOf('camp') >= 0) return '🏕️';
    if (v.indexOf('fish') >= 0) return '🎣';
    if (v.indexOf('tub') >= 0 || v.indexOf('kayak') >= 0) return '🌊';
    return '🤝';
  }
  function normalizeImage(url) {
    var value = String(url || '').trim();
    var match = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^#]*[?&]id=)([-_a-zA-Z0-9]+)/i);
    if (match) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(match[1]) + '&sz=w1600';
    return /^https:\/\//i.test(value) ? value : '';
  }
  function infoCard(title, value) {
    if (!String(value || '').trim()) return '';
    return '<article class="adventure-info-card"><h3>' + escapeHtml(title) + '</h3><p>' + richText(value) + '</p></article>';
  }
  function render(data) {
    if (!data || !data.success || !data.event) return renderError(data && data.message);
    var event = data.event;
    document.title = (event.Title || 'Adventure Details') + ' | IWP Community Connections';
    var imageUrl = normalizeImage(event.ImageUrl);
    var image = imageUrl
      ? '<img src="' + escapeAttr(imageUrl) + '" alt="Cover image for ' + escapeAttr(event.Title || 'this adventure') + '">'
      : '<div class="adventure-image-fallback" aria-hidden="true">' + icon(event.EventType) + '</div>';
    var max = Number(event.MaxParticipants || 0);
    var remaining = data.spotsRemaining === null || data.spotsRemaining === undefined ? null : Number(data.spotsRemaining);
    var availability = max <= 0 ? 'Registration open' : remaining > 0 ? remaining + ' spot' + (remaining === 1 ? '' : 's') + ' remaining' : bool(event.WaitlistEnabled) ? 'Full · Waitlist available' : 'Adventure full';
    var registerLabel = max > 0 && remaining <= 0 && bool(event.WaitlistEnabled) ? 'Join Waitlist' : 'Register Now';
    var canRegister = String(event.Status || '') === 'Published' && bool(event.RegistrationRequired) && !(max > 0 && remaining <= 0 && !bool(event.WaitlistEnabled));
    var maps = event.Address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.Address) : '';

    root.innerHTML =
      '<a class="adventure-back" href="/">← Back to Adventures</a>' +
      '<article class="adventure-detail-card">' +
        '<div class="adventure-cover">' + image + '</div>' +
        '<div class="adventure-heading">' +
          '<div class="adventure-badges"><span>' + escapeHtml(event.EventType || 'Community Adventure') + '</span>' + (bool(event.Featured) ? '<span>★ Featured</span>' : '') + '</div>' +
          '<h1>' + escapeHtml(event.Title || 'Community Adventure') + '</h1>' +
          '<p class="adventure-lead">' + richText(event.Description || event.WhatToExpect || 'Adventure details are coming soon.') + '</p>' +
        '</div>' +
        '<div class="adventure-layout">' +
          '<div class="adventure-main-copy">' +
            '<section class="adventure-facts">' +
              '<div><small>Date</small><strong>' + escapeHtml(dateRange(event)) + '</strong></div>' +
              '<div><small>Time</small><strong>' + escapeHtml(timeRange(event)) + '</strong></div>' +
              '<div><small>Location</small><strong>' + escapeHtml(event.LocationName || 'Location coming soon') + '</strong></div>' +
              '<div><small>Cost</small><strong>' + escapeHtml(costLabel(event)) + '</strong></div>' +
            '</section>' +
            '<section class="adventure-info-grid">' +
              infoCard('What To Expect', event.WhatToExpect) + infoCard('What To Bring', event.WhatToBring) +
              infoCard('Provided', event.Provided) + infoCard('Special Notes', event.SpecialNotes) +
            '</section>' +
            '<section class="adventure-disclaimer"><strong>Member-Organized Activity</strong><p>This activity is member-organized and is not facilitated, monitored, or organized by IWP staff.</p></section>' +
          '</div>' +
          '<aside class="adventure-action-card">' +
            '<h2>Adventure Information</h2>' +
            '<p class="adventure-availability">' + escapeHtml(availability) + '</p>' +
            (event.Address ? '<address>' + escapeHtml(event.Address) + '</address>' : '') +
            (maps ? '<a class="adventure-secondary-button" target="_blank" rel="noopener" href="' + escapeAttr(maps) + '">Get Directions</a>' : '') +
            (canRegister ? '<a class="adventure-primary-button" href="' + escapeAttr(data.registrationUrl || config.appUrl) + '">' + registerLabel + '</a>' : '<span class="adventure-disabled-button">Registration unavailable</span>') +
            '<button id="shareAdventure" class="adventure-secondary-button" type="button">Copy Adventure Link</button>' +
          '</aside>' +
        '</div>' +
      '</article>';

    var share = document.getElementById('shareAdventure');
    if (share) share.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.href).then(function () { share.textContent = 'Link Copied'; }, function () { window.prompt('Copy this adventure link:', window.location.href); });
    });
  }
  function renderError(message) {
    root.innerHTML = '<section class="adventure-error"><h1>Adventure unavailable</h1><p>' + escapeHtml(message || 'This adventure could not be loaded.') + '</p><a class="adventure-primary-button" href="/">Return to Community Connections</a></section>';
  }
  function load() {
    var eventId = new URLSearchParams(window.location.search).get('id');
    if (!eventId) return renderError('No adventure was selected.');
    if (!config.appUrl) return renderError('The Community Connections service is not configured.');
    window.iwpPublicAdventureCallback = render;
    var script = document.createElement('script');
    script.src = config.appUrl + (config.appUrl.indexOf('?') === -1 ? '?' : '&') + 'api=public-adventure&eventId=' + encodeURIComponent(eventId) + '&callback=iwpPublicAdventureCallback&_=' + Date.now();
    script.async = true;
    script.onerror = function () { renderError('The adventure service is temporarily unavailable.'); };
    document.head.appendChild(script);
    window.setTimeout(function () {
      if (root && root.querySelector('.adventure-loading')) renderError('The adventure took too long to load. Please try again.');
    }, 15000);
  }
  document.querySelectorAll('[data-launch-app]').forEach(function (link) { link.href = config.appUrl || '/'; });
  load();
})();
