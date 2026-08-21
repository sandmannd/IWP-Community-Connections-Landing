const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function chicagoDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function bool(value) {
  return value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true';
}

function cleanMoney(value) {
  const text = String(value == null ? '' : value).replace(/^\$/, '').trim();
  if (!text) return '';
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  return Number.isInteger(numeric) ? String(numeric) : String(numeric).replace(/0+$/, '').replace(/\.$/, '');
}

function costLabel(event) {
  if (bool(event.free_event)) return 'Free';
  const adult = cleanMoney(event.adult_cost);
  const child = cleanMoney(event.child_cost);
  if (adult && child) return `$${adult} adult / $${child} child`;
  if (adult) return `$${adult}`;
  if (child) return `$${child} child`;
  return 'Cost listed in details';
}

function availabilityLabel(spotsRemaining, maxParticipants, waitlistEnabled) {
  if (!maxParticipants) return 'Registration open';
  if (spotsRemaining > 0) return `${spotsRemaining} spot${spotsRemaining === 1 ? '' : 's'} remaining`;
  return waitlistEnabled ? 'Full · Waitlist available' : 'Full';
}

async function getD1Payload(db, upstreamBaseUrl) {
  const todayKey = chicagoDateKey();
  const eventsResult = await db.prepare(`
    SELECT
      e.*,
      COALESCE(SUM(CASE
        WHEN lower(r.status) NOT IN ('cancelled','waitlist')
        THEN COALESCE(r.adult_count,0) + COALESCE(r.child_count,0)
        ELSE 0 END), 0) AS people_count,
      COALESCE(SUM(CASE WHEN lower(r.status) = 'waitlist' THEN 1 ELSE 0 END), 0) AS waitlist_count
    FROM events e
    LEFT JOIN registrations r ON r.event_id = e.event_id
    GROUP BY e.event_id
    ORDER BY e.start_date, e.start_time
  `).all();

  const allEvents = eventsResult.results || [];
  const upcomingRows = allEvents
    .filter(event => event.status === 'Published' && String(event.end_date || event.start_date || '') >= todayKey)
    .sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')) || String(a.start_time || '').localeCompare(String(b.start_time || '')));

  const build = event => {
    const maxParticipants = Number(event.max_participants || 0);
    const peopleCount = Number(event.people_count || 0);
    const spotsRemaining = maxParticipants > 0 ? Math.max(0, maxParticipants - peopleCount) : null;
    const waitlistEnabled = bool(event.waitlist_enabled);
    const full = maxParticipants > 0 && spotsRemaining === 0;
    return {
      eventId: String(event.event_id || ''),
      title: String(event.title || 'Community Adventure'),
      type: String(event.event_type || 'Adventure'),
      imageUrl: String(event.image_url || ''),
      startDate: String(event.start_date || ''),
      startTime: String(event.start_time || ''),
      endDate: String(event.end_date || ''),
      endTime: String(event.end_time || ''),
      location: String(event.location_name || ''),
      description: String(event.description || event.what_to_expect || ''),
      costLabel: costLabel(event),
      maxParticipants,
      peopleCount,
      spotsRemaining,
      waitlistCount: Number(event.waitlist_count || 0),
      waitlistEnabled,
      full,
      availabilityLabel: availabilityLabel(spotsRemaining, maxParticipants, waitlistEnabled),
      detailsUrl: `${upstreamBaseUrl}?event=${encodeURIComponent(event.event_id)}`,
      registrationUrl: `${upstreamBaseUrl}?register=${encodeURIComponent(event.event_id)}`,
      featured: bool(event.featured)
    };
  };

  const featuredRow = upcomingRows.find(event => bool(event.featured)) || null;
  return {
    success: true,
    featured: featuredRow ? build(featuredRow) : null,
    upcoming: upcomingRows.slice(0, 4).map(build),
    stats: {
      upcomingAdventures: upcomingRows.length,
      publishedAdventures: allEvents.filter(event => event.status === 'Published').length,
      completedAdventures: allEvents.filter(event => event.status === 'Complete').length
    }
  };
}

function stableEvent(event) {
  if (!event) return null;
  return {
    eventId: event.eventId || '',
    title: event.title || '',
    type: event.type || '',
    imageUrl: event.imageUrl || '',
    startDate: event.startDate || '',
    startTime: event.startTime || '',
    endDate: event.endDate || '',
    endTime: event.endTime || '',
    location: event.location || '',
    description: event.description || '',
    costLabel: event.costLabel || '',
    maxParticipants: Number(event.maxParticipants || 0),
    peopleCount: Number(event.peopleCount || 0),
    spotsRemaining: event.spotsRemaining == null ? null : Number(event.spotsRemaining),
    waitlistCount: Number(event.waitlistCount || 0),
    waitlistEnabled: Boolean(event.waitlistEnabled),
    full: Boolean(event.full),
    availabilityLabel: event.availabilityLabel || '',
    featured: Boolean(event.featured)
  };
}

function comparePayloads(google, d1) {
  const mismatches = [];
  const compare = (path, left, right) => {
    if (JSON.stringify(left) !== JSON.stringify(right)) mismatches.push({ path, google: left, d1: right });
  };

  compare('stats', google.stats || {}, d1.stats || {});
  compare('featured', stableEvent(google.featured), stableEvent(d1.featured));

  const googleUpcoming = (google.upcoming || []).map(stableEvent);
  const d1Upcoming = (d1.upcoming || []).map(stableEvent);
  compare('upcoming.length', googleUpcoming.length, d1Upcoming.length);

  const max = Math.max(googleUpcoming.length, d1Upcoming.length);
  for (let i = 0; i < max; i += 1) compare(`upcoming[${i}]`, googleUpcoming[i] || null, d1Upcoming[i] || null);

  return mismatches;
}

export async function onRequestGet(context) {
  const db = context.env.COMMUNITY_DB;
  const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || '').trim();
  if (!db) return json({ success: false, migration: 'M7.3', error: 'COMMUNITY_DB binding is not configured.' }, 503);
  if (!appUrl || !appUrl.startsWith('https://script.google.com/')) {
    return json({ success: false, migration: 'M7.3', error: 'IWP_APPS_SCRIPT_URL is not configured.' }, 503);
  }

  try {
    const upstream = await fetch(appUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'landingDataApi' }),
      redirect: 'follow'
    });
    const raw = await upstream.text();
    let google;
    try { google = JSON.parse(raw); }
    catch (_) { throw new Error('Google landing endpoint returned invalid JSON.'); }
    if (!google || google.success !== true) throw new Error(google && (google.error || google.message) || 'Google landing endpoint failed.');

    const d1 = await getD1Payload(db, appUrl.replace(/\?.*$/, '').replace(/\/+$/, ''));
    const mismatches = comparePayloads(google, d1);

    return json({
      success: true,
      migration: 'M7.3',
      productionCutover: false,
      googleLive: true,
      d1ShadowRead: true,
      match: mismatches.length === 0,
      mismatchCount: mismatches.length,
      mismatches,
      google: {
        featuredEventId: google.featured ? google.featured.eventId : null,
        upcomingEventIds: (google.upcoming || []).map(event => event.eventId),
        stats: google.stats || {}
      },
      d1: {
        featuredEventId: d1.featured ? d1.featured.eventId : null,
        upcomingEventIds: (d1.upcoming || []).map(event => event.eventId),
        stats: d1.stats || {}
      }
    });
  } catch (error) {
    return json({
      success: false,
      migration: 'M7.3',
      productionCutover: false,
      googleLive: true,
      d1ShadowRead: false,
      error: String(error && error.message || error)
    }, 500);
  }
}
