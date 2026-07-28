/**
 * Cloudflare organizer dashboard bridge.
 * Verifies a Google Identity Services ID token and then checks the verified
 * email against the active Community Connections administrator directory.
 */
const IWP_CLOUDFLARE_GOOGLE_CLIENT_ID_ =
  '976851999093-8d1na61p55803iim4202s189uncggp3t.apps.googleusercontent.com';



/**
 * Exchanges a verified Google Identity Services credential for a short-lived,
 * opaque organizer session. The browser stores only this organizer session;
 * Google ID tokens are never reused as the application session.
 */
function createOrganizerSessionJsonp_(callbackName, credential) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerSessionCallback');
  let payload;

  try {
    const identity = getOrganizerIdentity_(credential, '');
    const role = identity.role || getUserRole_(identity.email);
    const authorized = role === APP_CONFIG.roles.owner || role === APP_CONFIG.roles.admin;

    if (!authorized) {
      payload = {
        success: false,
        authorized: false,
        authenticated: true,
        error: 'This Google account is not an approved Community Connections organizer.',
        user: { email: identity.email, name: identity.name || '' }
      };
    } else {
      const session = issueOrganizerSession_(identity, role);
      payload = {
        success: true,
        authorized: true,
        authenticated: true,
        sessionToken: session.token,
        expiresAt: session.expiresAt,
        user: {
          email: identity.email,
          name: identity.name || '',
          picture: identity.picture || '',
          role: String(role || '')
        }
      };
    }
  } catch (error) {
    payload = {
      success: false,
      authorized: false,
      authenticated: false,
      error: error && error.message ? error.message : 'Unable to start the organizer session.'
    };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

const IWP_ORGANIZER_SESSION_PREFIX_ = 'IWP_ORGANIZER_SESSION_';
const IWP_ORGANIZER_SESSION_HOURS_ = 8;

function issueOrganizerSession_(identity, role) {
  cleanupExpiredOrganizerSessions_();
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const expiresAt = Date.now() + (IWP_ORGANIZER_SESSION_HOURS_ * 60 * 60 * 1000);
  const record = {
    email: normalizeEmail_(identity.email || ''),
    name: normalizeText_(identity.name || ''),
    picture: String(identity.picture || ''),
    subject: String(identity.subject || ''),
    role: String(role || ''),
    expiresAt: expiresAt
  };
  PropertiesService.getScriptProperties().setProperty(
    organizerSessionPropertyKey_(token),
    JSON.stringify(record)
  );
  return { token: token, expiresAt: new Date(expiresAt).toISOString() };
}

function verifyOrganizerSession_(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    throw new Error('Your organizer session is missing or invalid. Please sign in again.');
  }
  const properties = PropertiesService.getScriptProperties();
  const key = organizerSessionPropertyKey_(token);
  const raw = properties.getProperty(key);
  if (!raw) throw new Error('Your organizer session expired. Please sign in again.');

  let record = null;
  try { record = JSON.parse(raw); } catch (ignore) {}
  if (!record || !record.email || Number(record.expiresAt || 0) <= Date.now()) {
    properties.deleteProperty(key);
    throw new Error('Your organizer session expired. Please sign in again.');
  }

  const currentRole = getUserRole_(record.email);
  const authorized = currentRole === APP_CONFIG.roles.owner || currentRole === APP_CONFIG.roles.admin;
  if (!authorized) {
    properties.deleteProperty(key);
    throw new Error('This account is no longer approved for organizer access.');
  }

  record.role = String(currentRole || '');
  return record;
}

function revokeOrganizerSessionJsonp_(callbackName, sessionToken) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerSignOutCallback');
  const token = String(sessionToken || '').trim();
  if (/^[0-9a-f]{64}$/i.test(token)) {
    PropertiesService.getScriptProperties().deleteProperty(organizerSessionPropertyKey_(token));
  }
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify({ success: true }) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function organizerSessionPropertyKey_(token) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token || ''));
  const hex = digest.map(function(value) {
    const byte = value < 0 ? value + 256 : value;
    return ('0' + byte.toString(16)).slice(-2);
  }).join('');
  return IWP_ORGANIZER_SESSION_PREFIX_ + hex;
}

function cleanupExpiredOrganizerSessions_() {
  const properties = PropertiesService.getScriptProperties();
  const all = properties.getProperties();
  const now = Date.now();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf(IWP_ORGANIZER_SESSION_PREFIX_) !== 0) return;
    let record = null;
    try { record = JSON.parse(all[key]); } catch (ignore) {}
    if (!record || Number(record.expiresAt || 0) <= now) properties.deleteProperty(key);
  });
}

function getOrganizerIdentity_(credential, sessionToken) {
  if (String(sessionToken || '').trim()) return verifyOrganizerSession_(sessionToken);
  const identity = verifyCloudflareGoogleCredential_(credential);
  const role = getUserRole_(identity.email);
  const authorized = role === APP_CONFIG.roles.owner || role === APP_CONFIG.roles.admin;
  if (!authorized) throw new Error('This Google account is not an approved Community Connections organizer.');
  identity.role = String(role || '');
  return identity;
}

function getOrganizerDashboardJsonp_(callbackName, credential, sessionToken) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerDashboardCallback');
  let payload;

  try {
    const identity = getOrganizerIdentity_(credential, sessionToken);
    const role = identity.role || getUserRole_(identity.email);
    const authorized = role === APP_CONFIG.roles.owner || role === APP_CONFIG.roles.admin;

    if (!authorized) {
      payload = {
        success: false,
        authorized: false,
        authenticated: true,
        error: 'This Google account is not an approved Community Connections organizer.',
        user: { email: identity.email, name: identity.name || '' }
      };
    } else {
      payload = {
        success: true,
        authorized: true,
        authenticated: true,
        user: {
          email: identity.email,
          name: identity.name || '',
          picture: identity.picture || '',
          role: String(role || '')
        },
        dashboard: getCommandCenterData_()
      };
    }
  } catch (error) {
    payload = {
      success: false,
      authorized: false,
      authenticated: false,
      error: error && error.message ? error.message : 'Unable to verify organizer access.'
    };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function verifyCloudflareGoogleCredential_(credential) {
  const token = String(credential || '').trim();
  if (!token) throw new Error('Sign in with Google to open the organizer command center.');
  if (token.length > 10000) throw new Error('The Google sign-in response was invalid.');

  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true, followRedirects: false }
  );
  const status = response.getResponseCode();
  let claims = {};
  try { claims = JSON.parse(response.getContentText() || '{}'); } catch (ignore) {}

  if (status !== 200 || claims.error_description || claims.error) {
    throw new Error('Your Google sign-in expired or could not be verified. Please sign in again.');
  }

  if (String(claims.aud || '') !== IWP_CLOUDFLARE_GOOGLE_CLIENT_ID_) {
    throw new Error('The Google sign-in was issued for a different application.');
  }
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(String(claims.iss || '')) === -1) {
    throw new Error('The Google sign-in issuer could not be verified.');
  }
  if (String(claims.email_verified || '').toLowerCase() !== 'true') {
    throw new Error('Your Google email address must be verified.');
  }
  const expiration = Number(claims.exp || 0);
  if (!expiration || expiration * 1000 <= Date.now()) {
    throw new Error('Your Google sign-in has expired. Please sign in again.');
  }

  const email = normalizeEmail_(claims.email || '');
  if (!email) throw new Error('Google did not return a usable email address.');
  return {
    email: email,
    name: normalizeText_(claims.name || ''),
    picture: String(claims.picture || ''),
    subject: String(claims.sub || '')
  };
}

function sanitizeOrganizerCallback_(callbackName) {
  const value = String(callbackName || '').trim();
  return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(value)
    ? value
    : 'iwpOrganizerDashboardCallback';
}

/**
 * Run this function once from the Apps Script editor after pushing this update.
 * Its only purpose is to trigger Google's authorization prompt for the
 * script.external_request scope required to verify Google Identity tokens.
 */
function authorizeCloudflareOrganizerTokenVerification() {
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: false
  });

  return {
    authorized: true,
    responseCode: response.getResponseCode(),
    message: 'External-request authorization is active. A non-200 response is expected because no token was supplied.'
  };
}


/**
 * Returns the organizer adventure index for the Cloudflare workspace.
 * The Google token and administrator directory are verified before any
 * non-public adventure information is read.
 */
function getOrganizerAdventuresJsonp_(callbackName, credential, sessionToken) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerAdventuresCallback');
  let payload;

  try {
    const identity = getOrganizerIdentity_(credential, sessionToken);
    const role = identity.role || getUserRole_(identity.email);
    const authorized = role === APP_CONFIG.roles.owner || role === APP_CONFIG.roles.admin;

    if (!authorized) {
      payload = {
        success: false,
        authorized: false,
        authenticated: true,
        error: 'This Google account is not an approved Community Connections organizer.',
        user: { email: identity.email, name: identity.name || '' }
      };
    } else {
      payload = {
        success: true,
        authorized: true,
        authenticated: true,
        user: {
          email: identity.email,
          name: identity.name || '',
          picture: identity.picture || '',
          role: String(role || '')
        },
        adventures: getOrganizerAdventureIndex_(),
        generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a')
      };
    }
  } catch (error) {
    payload = {
      success: false,
      authorized: false,
      authenticated: false,
      error: error && error.message ? error.message : 'Unable to load organizer adventures.'
    };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getOrganizerAdventureIndex_() {
  const events = getEventObjects_(getSheetByName_(APP_CONFIG.sheets.events));
  const registrations = getDataObjects_(getSheetByName_(APP_CONFIG.sheets.registrations));
  const registrationsByEvent = {};

  registrations.forEach(function(registration) {
    const eventId = normalizeRegistrationEventId_(getRegistrationEventId_(registration));
    if (!eventId) return;
    if (!registrationsByEvent[eventId]) registrationsByEvent[eventId] = [];
    registrationsByEvent[eventId].push(registration);
  });

  return events.map(function(event) {
    const eventId = String(event.EventId || '');
    const eventRegistrations = registrationsByEvent[normalizeRegistrationEventId_(eventId)] || [];
    const activeRegistrations = eventRegistrations.filter(registrationCountsTowardCapacity_);
    const waitlistRegistrations = eventRegistrations.filter(function(registration) {
      return getRegistrationStatus_(registration) ===
        String(APP_CONFIG.registrationStatuses.waitlist || 'Waitlist').toLowerCase();
    });
    const peopleCount = calculateSpotsTaken_(eventRegistrations);
    const maxParticipants = Number(event.MaxParticipants || 0);

    return {
      eventId: eventId,
      title: String(event.Title || 'Untitled Adventure'),
      status: String(event.Status || APP_CONFIG.eventStatuses.draft || 'Draft'),
      type: String(event.EventType || event.Type || ''),
      location: String(event.Location || ''),
      startDate: String(event.StartDate || ''),
      endDate: String(event.EndDate || event.StartDate || ''),
      startTime: String(event.StartTime || ''),
      endTime: String(event.EndTime || ''),
      registrationCount: activeRegistrations.length,
      peopleCount: peopleCount,
      waitlistCount: waitlistRegistrations.length,
      maxParticipants: maxParticipants > 0 ? maxParticipants : null,
      spotsRemaining: maxParticipants > 0 ? Math.max(0, maxParticipants - peopleCount) : null,
      registrationClosed: normalizeBoolean_(event.RegistrationClosed),
      featured: normalizeBoolean_(event.Featured),
      imageUrl: String(event.ImageUrl || event.EventImageUrl || ''),
      updatedAt: String(event.UpdatedAt || event.ModifiedAt || '')
    };
  }).sort(function(a, b) {
    const aDate = String(a.startDate || '9999-12-31');
    const bDate = String(b.startDate || '9999-12-31');
    return aDate.localeCompare(bDate) || String(a.title).localeCompare(String(b.title));
  });
}
