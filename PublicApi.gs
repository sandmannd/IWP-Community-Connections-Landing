/**
 * Read-only landing-page data endpoint.
 * Uses JSONP so the Cloudflare-hosted landing page can read public data
 * without exposing private organizer or registration information.
 */

function getLandingPageData() {
  const allEvents = listEvents();
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const upcoming = allEvents.filter(function(event) {
    return String(event.Status || '') === APP_CONFIG.eventStatuses.published &&
      String(event.StartDate || '') >= todayKey;
  }).sort(function(a, b) {
    return String(a.StartDate || '').localeCompare(String(b.StartDate || '')) ||
      String(a.StartTime || '').localeCompare(String(b.StartTime || ''));
  });

  const featured = upcoming.find(function(event) {
    return toBoolean_(event.Featured);
  }) || upcoming[0] || null;

  const baseUrl = getPublicAppUrl_();

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    featured: featured ? buildLandingEvent_(featured, baseUrl) : null,
    upcoming: upcoming.slice(0, 4).map(function(event) {
      return buildLandingEvent_(event, baseUrl);
    }),
    stats: {
      upcomingAdventures: upcoming.length,
      publishedAdventures: allEvents.filter(function(event) {
        return String(event.Status || '') === APP_CONFIG.eventStatuses.published;
      }).length,
      completedAdventures: allEvents.filter(function(event) {
        return String(event.Status || '') === APP_CONFIG.eventStatuses.complete;
      }).length
    }
  };
}

function buildLandingEvent_(event, baseUrl) {
  const maxParticipants = Number(event.MaxParticipants || 0);
  const peopleCount = Number(event.PeopleCount || 0);
  const spotsRemaining = maxParticipants > 0
    ? Math.max(0, maxParticipants - peopleCount)
    : null;

  const free = toBoolean_(event.FreeEvent);
  const waitlistEnabled = toBoolean_(event.WaitlistEnabled);
  const full = maxParticipants > 0 && spotsRemaining === 0;

  return {
    eventId: String(event.EventId || ''),
    title: String(event.Title || 'Community Adventure'),
    type: String(event.EventType || 'Adventure'),
    imageUrl: String(event.ImageUrl || ''),
    startDate: String(event.StartDate || ''),
    startTime: String(event.StartTime || ''),
    endDate: String(event.EndDate || ''),
    endTime: String(event.EndTime || ''),
    location: String(event.LocationName || ''),
    description: String(event.Description || event.WhatToExpect || ''),
    costLabel: free ? 'Free' : buildLandingCostLabel_(event),
    maxParticipants: maxParticipants,
    peopleCount: peopleCount,
    spotsRemaining: spotsRemaining,
    waitlistCount: Number(event.WaitlistCount || 0),
    waitlistEnabled: waitlistEnabled,
    full: full,
    availabilityLabel: buildLandingAvailabilityLabel_(spotsRemaining, maxParticipants, waitlistEnabled),
    detailsUrl: baseUrl + '?event=' + encodeURIComponent(event.EventId),
    registrationUrl: baseUrl + '?register=' + encodeURIComponent(event.EventId),
    featured: toBoolean_(event.Featured)
  };
}

function buildLandingCostLabel_(event) {
  const adult = String(event.AdultCost || '').replace(/^\$/, '').trim();
  const child = String(event.ChildCost || '').replace(/^\$/, '').trim();

  if (adult && child) return '$' + adult + ' adult / $' + child + ' child';
  if (adult) return '$' + adult;
  if (child) return '$' + child + ' child';
  return 'Cost listed in details';
}

function buildLandingAvailabilityLabel_(spotsRemaining, maxParticipants, waitlistEnabled) {
  if (!maxParticipants) return 'Registration open';
  if (spotsRemaining > 0) {
    return spotsRemaining + ' spot' + (spotsRemaining === 1 ? '' : 's') + ' remaining';
  }
  return waitlistEnabled ? 'Full · Waitlist available' : 'Full';
}

function getLandingPageJsonp_(callbackName) {
  const callback = String(callbackName || '').replace(/[^\w.$]/g, '');
  if (!callback) throw new Error('A valid callback is required.');

  const payload = JSON.stringify(getLandingPageData()).replace(/<\//g, '<\\/');
  return ContentService
    .createTextOutput(callback + '(' + payload + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
