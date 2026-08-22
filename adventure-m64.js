(function () {
  'use strict';
  var config = window.IWP_SITE_CONFIG || {};
  var root = document.getElementById('adventureRoot');
  var detailCachePrefix = 'iwpAdventureDetailCacheV2M74:';
  var detailCacheMaxAge = 15 * 60 * 1000;
  var renderedFromCache = false;
  var renderedPreview = false;

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
    if (!value) return '';
    var match = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^#]*[?&]id=)([-_a-zA-Z0-9]+)/i);
    if (match) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(match[1]) + '&sz=w1600';
    if (/^\/api\/adventure-image\?key=adventures%2F/i.test(value) || /^\/api\/adventure-image\?key=adventures\//i.test(value)) return value;
    return /^https:\/\//i.test(value) ? value : '';
  }
  function detailCacheKey(eventId) { return detailCachePrefix + String(eventId || '').trim(); }
  function readDetailCache(eventId) {
    try {
      var raw = window.localStorage.getItem(detailCacheKey(eventId));
      var cached = raw ? JSON.parse(raw) : null;
      if (!cached || !cached.savedAt || !cached.data || !cached.data.success || !cached.data.event) return null;
      if (Date.now() - Number(cached.savedAt) > detailCacheMaxAge) return null;
      return cached.data;
    } catch (ignore) { return null; }
  }
  function writeDetailCache(eventId, payload) {
    if (!eventId || !payload || !payload.success || !payload.event) return;
    try { window.localStorage.setItem(detailCacheKey(eventId), JSON.stringify({ savedAt: Date.now(), data: payload })); } catch (ignore) {}
  }
  function infoCard(title, value) {
    if (!String(value || '').trim()) return '';
    return '<article class="adventure-info-card"><h3>' + escapeHtml(title) + '</h3><p>' + richText(value) + '</p></article>';
  }
  function attendeeSection(data,event) {
    var count=Number(data.attendeeCount!==undefined?data.attendeeCount:data.spotsTaken||0);
    var names=Array.isArray(data.registrations)?data.registrations:[];
    var label=count+' '+(count===1?'person':'people')+' registered';
    var html='<section class="adventure-attendees"><div class="adventure-attendees-heading"><h2>Who’s Going</h2><strong>'+escapeHtml(label)+'</strong></div>';
    if(names.length){html+='<div class="adventure-attendee-list">'+names.map(function(r){return '<span>'+escapeHtml(r.Name||'Participant')+'</span>'}).join('')+'</div>';if(names.length<count)html+='<p class="adventure-attendee-note">Plus '+(count-names.length)+' '+((count-names.length)===1?'person':'people')+' attending privately.</p>';}
    else if(count>0){html+='<p class="adventure-attendee-note">Attendee names are private unless participants choose to share them.</p>';}
    else{html+='<p class="adventure-attendee-note">Be the first to register for this adventure.</p>';}
    return html+'</section>';
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
    var availability = max <= 0 ? 'Registration open' : remaining > 0 ? remaining + ' spot' + (remaining === 1 ? '' : 's') + ' remaining' : bool(event.WaitlistEnabled) ? 'Full · Waitlist available' : 'Adventure full'; var registrationRequired=bool(event.RegistrationRequired);
    var registerLabel = max > 0 && remaining <= 0 && bool(event.WaitlistEnabled) ? 'Join Waitlist' : 'Register Now';
    var canRegister = String(event.Status || '') === 'Published' && bool(event.RegistrationRequired) && !(max > 0 && remaining <= 0 && !bool(event.WaitlistEnabled));
    var maps = event.Address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.Address) : '';

    root.innerHTML =
      '<a class="adventure-back" href="/">← Back to Adventures</a>' +
      (data.preview ? '<div class="adventure-live-refresh" aria-live="polite">Loading current availability…</div>' : '') +
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
            '<section class="adventure-disclaimer"><strong>Member-Organized Activity</strong><p>This activity is member-organized and is not facilitated, monitored, or organized by IWP staff.</p></section>' + attendeeSection(data,event) +
          '</div>' +
          '<aside class="adventure-action-card">' +
            '<h2>Adventure Information</h2>' +
            '<p class="adventure-availability">' + escapeHtml(availability) + '</p>' +
            (event.Address ? '<address>' + escapeHtml(event.Address) + '</address>' : '') +
            (maps ? '<a class="adventure-secondary-button" target="_blank" rel="noopener" href="' + escapeAttr(maps) + '">Open in Maps</a>' : '') +
            (canRegister ? '<a class="adventure-primary-button" href="' + escapeAttr('/register.html?id=' + encodeURIComponent(event.EventId || '')) + '">' + registerLabel + '</a><p class="adventure-registration-help">Registration takes just a minute. You’ll receive a confirmation email with event details and your personal event-day QR code.</p>' : (!registrationRequired ? '<div class="public-status-note">No registration is required for this adventure. Just review the details and show up.</div>' : '<div class="public-status-note is-closed">Registration is not available for this adventure right now.</div>')) +
            '<button id="shareAdventure" class="adventure-secondary-button" type="button">Share Adventure</button>' +
          '</aside>' +
        '</div>' +
      '</article>';

    var share = document.getElementById('shareAdventure');
    if (share) share.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({title:event.Title||'Community Adventure',text:event.Title||'Community Adventure',url:window.location.href}).catch(function(){});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(function () {
          var old=share.textContent;share.textContent='Link Copied';setTimeout(function(){share.textContent=old},1800);
        }, function () { window.prompt('Copy this adventure link:', window.location.href); });
      } else {
        window.prompt('Copy this adventure link:', window.location.href);
      }
    });
  }
  function renderError(message) {
    root.innerHTML = '<section class="adventure-error"><h1>Adventure unavailable</h1><p>' + escapeHtml(message || 'This adventure could not be loaded.') + '</p><a class="adventure-primary-button" href="/">Return to Community Connections</a></section>';
  }
  function load() {
    var eventId = new URLSearchParams(window.location.search).get('id');
    if (!eventId) return renderError('No adventure was selected.');
    if (!config.appUrl) return renderError('The Community Connections service is not configured.');

    var cached = readDetailCache(eventId);
    if (cached) {
      renderedFromCache = true;
      renderedPreview = !!cached.preview;
      render(cached);
    } else {
      try {
        var landingRaw = window.localStorage.getItem('iwpLandingDataCacheV1');
        var landingCached = landingRaw ? JSON.parse(landingRaw) : null;
        var landingData = landingCached && landingCached.data;
        var candidates = [];
        if (landingData && landingData.featured) candidates.push(landingData.featured);
        ['upcoming','past'].forEach(function (key) {
          (landingData && landingData[key] || []).forEach(function (item) { candidates.push(item); });
        });
        var summary = candidates.find(function (item) { return String(item.eventId || item.EventId || '') === String(eventId); });
        if (summary) {
          cached = {
            success: true,
            preview: true,
            event: {
              EventId: eventId,
              Title: summary.title || summary.Title || 'Community Adventure',
              EventType: summary.type || summary.EventType || 'Adventure',
              ImageUrl: summary.imageUrl || summary.ImageUrl || '',
              StartDate: summary.startDate || summary.StartDate || '',
              StartTime: summary.startTime || summary.StartTime || '',
              EndDate: summary.endDate || summary.EndDate || '',
              EndTime: summary.endTime || summary.EndTime || '',
              LocationName: summary.location || summary.LocationName || '',
              Description: summary.description || summary.Description || '',
              FreeEvent: String(summary.costLabel || '').toLowerCase() === 'free',
              MaxParticipants: Number(summary.maxParticipants || summary.MaxParticipants || 0),
              WaitlistEnabled: summary.waitlistEnabled !== undefined ? summary.waitlistEnabled : true,
              RegistrationRequired: true,
              Status: 'Published',
              Featured: summary.featured
            },
            spotsRemaining: summary.spotsRemaining === undefined ? null : Number(summary.spotsRemaining)
          };
          renderedFromCache = true;
          renderedPreview = true;
          render(cached);
        }
      } catch (ignore) {}
    }

    var finished = false;
    var timeout = window.setTimeout(function () {
      if (finished) return;
      finished = true;
      if (!renderedFromCache) renderError('The adventure took too long to load. Please try again.');
    }, 15000);
    fetch('/api/public-adventure?id=' + encodeURIComponent(eventId) + '&_=m78-' + Date.now(), { headers: { 'accept': 'application/json' } })
      .then(function (response) { if (!response.ok) throw new Error('Adventure request failed.'); return response.json(); })
      .then(function (payload) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        if (payload && payload.success && payload.event) {
          writeDetailCache(eventId, payload);
          render(payload);
        } else if (!renderedFromCache) renderError(payload && (payload.message || payload.error));
      })
      .catch(function () {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        if (!renderedFromCache) renderError('The adventure service is temporarily unavailable.');
      });
  }
  document.querySelectorAll('[data-launch-app]').forEach(function (link) { link.href = config.appUrl || '/'; });
  load();
})();
