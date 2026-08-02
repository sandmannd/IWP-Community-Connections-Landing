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
        },
        dashboard: getCommandCenterData_(),
        adventures: getOrganizerAdventureIndex_()
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

function normalizeOrganizerBoolean_(value) {
  if (value === true || value === false) return value;
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1';
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
      registrationClosed: normalizeOrganizerBoolean_(event.RegistrationClosed),
      featured: normalizeOrganizerBoolean_(event.Featured),
      imageUrl: String(event.ImageUrl || event.EventImageUrl || ''),
      updatedAt: String(event.UpdatedAt || event.ModifiedAt || '')
    };
  }).sort(function(a, b) {
    const aDate = String(a.startDate || '9999-12-31');
    const bDate = String(b.startDate || '9999-12-31');
    return aDate.localeCompare(bDate) || String(a.title).localeCompare(String(b.title));
  });
}


function getOrganizerEventRecord_(eventId) {
  const id = String(eventId || '').trim();
  const events = getEventObjects_(getSheetByName_(APP_CONFIG.sheets.events));
  const event = events.find(function(item) { return String(item.EventId || '') === id; });
  if (!event) throw new Error('Adventure not found.');
  return event;
}

/** Sprint M4.2: Cloudflare Adventure Builder data and draft-save bridge. */
function getOrganizerBuilderJsonp_(callbackName, credential, sessionToken, eventId) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerBuilderCallback');
  let payload;
  try {
    const identity = getOrganizerIdentity_(credential, sessionToken);
    const id = String(eventId || '').trim();
    const event = id ? getOrganizerEventRecord_(id) : null;
    payload = {
      success: true,
      authorized: true,
      user: { email: identity.email, name: identity.name || '', picture: identity.picture || '', role: identity.role || '' },
      event: event ? toClientEvent_(event) : null,
      eventTypes: getActiveEventTypes(),
      mode: event ? 'edit' : 'create'
    };
  } catch (error) {
    payload = { success: false, authorized: false, error: error && error.message ? error.message : 'Unable to load the Adventure Builder.' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function saveOrganizerAdventureJsonp_(callbackName, credential, sessionToken, eventId, encodedData) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerSaveAdventureCallback');
  let payload;
  try {
    const identity = getOrganizerIdentity_(credential, sessionToken);
    const data = decodeOrganizerBuilderData_(encodedData);
    validateOrganizerBuilderData_(data);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      payload = saveOrganizerAdventureDraft_(String(eventId || '').trim(), data, identity);
    } finally {
      lock.releaseLock();
    }
    payload.authorized = true;
  } catch (error) {
    payload = { success: false, authorized: true, error: error && error.message ? error.message : 'Unable to save the adventure.' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function organizerSaveStatusCacheKey_(operationId) {
  return 'organizer-save-status:' + String(operationId || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 100);
}

function storeOrganizerSaveStatus_(operationId, payload) {
  const key = organizerSaveStatusCacheKey_(operationId);
  if (!key || key === 'organizer-save-status:') return;
  CacheService.getScriptCache().put(key, JSON.stringify(payload || {}), 600);
}

function getOrganizerSaveStatusJsonp_(callbackName, sessionToken, operationId) {
  const callback = String(callbackName || '').replace(/[^\w.$]/g, '');
  if (!callback) throw new Error('A valid callback is required.');
  let payload;
  try {
    verifyOrganizerSession_(sessionToken);
    const key = organizerSaveStatusCacheKey_(operationId);
    const raw = key && key !== 'organizer-save-status:' ? CacheService.getScriptCache().get(key) : '';
    payload = raw ? JSON.parse(raw) : { success: true, complete: false };
  } catch (error) {
    payload = { success: false, complete: true, error: error && error.message ? String(error.message) : 'Unable to check save status.' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload).replace(/<\//g, '<\\/') + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function writeOrganizerScheduleTextValues_(sheet, eventId, record) {
  const rowNumber = findRowById_(sheet, 'EventId', eventId);
  if (rowNumber === -1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  ['StartDate', 'StartTime', 'EndDate', 'EndTime'].forEach(function(field) {
    const index = headers.indexOf(field);
    if (index === -1) return;
    const cell = sheet.getRange(rowNumber, index + 1);
    cell.setNumberFormat('@');
    cell.setValue(String(record[field] || ''));
  });
}

function decodeOrganizerBuilderData_(encodedData) {
  const raw = String(encodedData || '');
  if (!raw) return {};
  if (raw.length > 45000) throw new Error('The adventure is too large to save in one request.');
  let jsonText = raw;
  try { jsonText = decodeURIComponent(raw); } catch (ignore) {}
  let data;
  try { data = JSON.parse(jsonText); } catch (error) { throw new Error('The adventure form could not be read. Please reload and try again.'); }
  return data && typeof data === 'object' ? data : {};
}

function validateOrganizerBuilderData_(data) {
  if (!normalizeText_(data.Title || data.title)) throw new Error('Adventure name is required.');
  if (!normalizeText_(data.EventType || data.eventType)) throw new Error('Adventure type is required.');
  if (!normalizeText_(data.StartDate || data.startDate)) throw new Error('Start date is required.');
  if (!normalizeText_(data.EndDate || data.endDate)) throw new Error('End date is required.');
  const start = String(data.StartDate || data.startDate || '');
  const end = String(data.EndDate || data.endDate || '');
  if (end < start) throw new Error('End date cannot be before the start date.');
}

function saveOrganizerAdventureDraft_(eventId, eventData, identity) {
  const sheet = getSheetByName_(APP_CONFIG.sheets.events);
  const record = normalizeEventRecord_(eventData || {});
  record.UpdatedAt = now_();
  if (eventId) {
    const existing = getOrganizerEventRecord_(eventId);
    record.Status = existing.Status || APP_CONFIG.eventStatuses.draft;
    record.CreatedBy = existing.CreatedBy || identity.email;
    record.CreatedAt = existing.CreatedAt || now_();
    record.DriveFolderId = existing.DriveFolderId || '';
    const updated = updateObjectById_(sheet, 'EventId', eventId, record);
    writeOrganizerScheduleTextValues_(sheet, eventId, record);
    writeEventScheduleText_(sheet, eventId, record);
    return { success: true, created: false, eventId: eventId, message: 'Adventure draft updated.', event: toClientEvent_(updated) };
  }
  record.EventId = createId_('event');
  record.Status = APP_CONFIG.eventStatuses.draft;
  record.RegistrationLink = '';
  record.CreatedBy = identity.email;
  record.CreatedAt = now_();
  appendObject_(sheet, record);
  writeOrganizerScheduleTextValues_(sheet, record.EventId, record);
  writeEventScheduleText_(sheet, record.EventId, record);
  return { success: true, created: true, eventId: record.EventId, message: 'Adventure draft created.', event: toClientEvent_(record) };
}


/** Sprint M4.2.1: authenticated image upload for the Cloudflare builder. */
function uploadOrganizerAdventureImage_(sessionToken, fileName, mimeType, dataUrl) {
  verifyOrganizerSession_(sessionToken);
  const raw = String(dataUrl || '');
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(raw)) throw new Error('Choose a PNG, JPG, or WebP image.');
  if (raw.length > 5500000) throw new Error('The image is too large. Choose a smaller image and try again.');
  const uploaded = uploadEventImageAuthorized_({
    fileName: String(fileName || 'adventure-image.jpg'),
    mimeType: String(mimeType || 'image/jpeg'),
    base64: raw
  });
  const imageUrl = uploaded && (uploaded.imageUrl || uploaded.ImageUrl || uploaded.url);
  if (!imageUrl) throw new Error('The image uploaded, but no usable image URL was returned.');
  return String(imageUrl);
}

/**
 * Reads an adventure after an opaque organizer session has already been verified.
 * Do not call getEvent() here: getEvent() checks Session.getActiveUser(), which is
 * blank for requests coming from the Cloudflare organizer workspace.
 */
function getOrganizerEventForSession_(eventId) {
  const cleanEventId = String(eventId || '').trim();
  if (!cleanEventId) throw new Error('Adventure ID is required.');

  const events = getEventObjects_(getSheetByName_(APP_CONFIG.sheets.events));
  const event = events.find(function(item) {
    return String(item.EventId || '') === cleanEventId;
  });
  if (!event) throw new Error('Adventure not found.');

  const clientEvent = toClientEvent_(event);
  clientEvent.Resources = listAdventureResources_(cleanEventId, false);
  return clientEvent;
}

/** Session-authenticated email composer for the Cloudflare organizer workspace. */
function getOrganizerEmailDataJsonp_(callbackName, sessionToken, eventId) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerEmailDataCallback');
  let payload;
  try {
    verifyOrganizerSession_(sessionToken);
    const cleanEventId = String(eventId || '').trim();
    const event = getOrganizerEventForSession_(cleanEventId);
    payload = {
      success: true,
      authorized: true,
      data: {
        event: makeCommunicationSafe_(event),
        counts: getEventRecipientCounts_(cleanEventId),
        history: getEventEmailHistory_(cleanEventId, 8)
      }
    };
  } catch (error) {
    payload = { success: false, authorized: false, error: error && error.message ? error.message : 'Unable to load email details.' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload).replace(/<\//g, '<\\/') + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/** Sends a participant email after validating the opaque organizer session. */
function sendOrganizerParticipantEmail_(sessionToken, eventId, subject, body, audience, taskLabel) {
  const identity = verifyOrganizerSession_(sessionToken);
  const cleanEventId = String(eventId || '').trim();
  const event = getOrganizerEventForSession_(cleanEventId);
  const cleanSubject = normalizeText_(subject);
  const cleanBody = String(body || '').trim();
  if (!cleanSubject) throw new Error('Email subject is required.');
  if (!cleanBody) throw new Error('Email message is required.');
  const cleanAudience = normalizeEventEmailAudience_(audience);
  const recipients = getUniqueEventRecipientEmails_(cleanEventId, cleanAudience);
  if (!recipients.length) throw new Error('There are no participant email addresses for this event.');
  const remainingQuota = MailApp.getRemainingDailyQuota();
  if (recipients.length > remainingQuota) throw new Error('This email needs ' + recipients.length + ' sends, but only ' + remainingQuota + ' remain in today\'s Apps Script email quota.');
  let sent = 0; const failed = [];
  recipients.forEach(function(email) {
    try { MailApp.sendEmail({ to: email, subject: cleanSubject, body: cleanBody, name: 'IWP Community Connections' }); sent++; }
    catch (error) { failed.push(email); Logger.log('Participant email failed for ' + email + ': ' + error.message); }
  });
  logOrganizerEventEmailSend_(eventId, event, cleanAudience, cleanSubject, sent, failed, identity.email, taskLabel);
  if (sent > 0 && taskLabel) {
    completeOrganizerReminderTask_(cleanEventId, taskLabel, identity.email);
  }
  return { success: failed.length === 0, sent: sent, failed: failed.length, failedEmails: failed, message: sent + ' email' + (sent === 1 ? '' : 's') + ' sent' + (failed.length ? '. ' + failed.length + ' failed.' : '.') };
}

function logOrganizerEventEmailSend_(eventId, event, audience, subject, sent, failedEmails, sentBy, taskLabel) {
  try {
    const ss = getDatabase(); let sheet = ss.getSheetByName('Email Log');
    if (!sheet) { sheet = ss.insertSheet('Email Log'); sheet.appendRow(['SentAt','EventId','EventTitle','Audience','Subject','SentCount','FailedCount','SentBy','TaskLabel']); sheet.setFrozenRows(1); }
    sheet.appendRow([new Date(), eventId, event && event.Title ? event.Title : '', audience, subject, sent, failedEmails ? failedEmails.length : 0, sentBy || '', taskLabel || '']);
  } catch (error) { Logger.log('Unable to write organizer email history: ' + error.message); }
}


/** M5.5: registration management data for the Cloudflare organizer workspace. */
function getOrganizerRegistrationsJsonp_(callbackName, sessionToken, eventId) {
  const callback = sanitizeOrganizerCallback_(callbackName || 'iwpOrganizerRegistrationsCallback');
  let payload;
  try {
    verifyOrganizerSession_(sessionToken);
    const cleanEventId = String(eventId || '').trim();
    const event = getOrganizerEventForSession_(cleanEventId);
    const registrations = listRegistrationsForEvent_(cleanEventId).map(function(registration) {
      return {
        registrationId: String(registration.RegistrationId || ''),
        status: String(registration.Status || ''),
        name: String(registration.Name || ''),
        email: String(registration.Email || ''),
        phone: String(registration.Phone || ''),
        emergencyContactName: String(registration.EmergencyContactName || ''),
        emergencyContactPhone: String(registration.EmergencyContactPhone || ''),
        adults: getRegistrationPeopleField_(registration, ['AdultCount','Adult Count','Adults']),
        children: getRegistrationPeopleField_(registration, ['ChildCount','Child Count','Children']),
        adultGuestNames: String(registration.AdultGuestNames || registration['Adult Guest Names'] || ''),
        childNames: String(registration.ChildNames || registration['Child Names'] || ''),
        paymentStatus: String(registration.PaymentStatus || ''),
        paymentMethod: String(registration.PaymentMethod || ''),
        attendanceType: String(registration.AttendanceType || ''),
        arrivalDate: serializeOrganizerRegistrationValue_(registration.ArrivalDate),
        departureDate: serializeOrganizerRegistrationValue_(registration.DepartureDate),
        dayVisitDate: serializeOrganizerRegistrationValue_(registration.DayVisitDate),
        accommodationType: String(registration.AccommodationType || ''),
        accommodationSiteNumber: String(registration.AccommodationSiteNumber || ''),
        notes: String(registration.Notes || ''),
        registeredAt: serializeOrganizerRegistrationValue_(registration.RegisteredAt),
        acknowledgementsComplete: organizerRegistrationAcknowledgementsComplete_(registration)
      };
    });
    const confirmedStatus = String(APP_CONFIG.registrationStatuses.confirmed || 'Confirmed').toLowerCase();
    const checkedInStatus = String(APP_CONFIG.registrationStatuses.checkedIn || 'Checked In').toLowerCase();
    const waitlistStatus = String(APP_CONFIG.registrationStatuses.waitlist || 'Waitlist').toLowerCase();
    const cancelledStatus = String(APP_CONFIG.registrationStatuses.cancelled || 'Cancelled').toLowerCase();
    let totalPeople = 0, registered = 0, waitlist = 0, checkedIn = 0, adults = 0, children = 0, paid = 0, needsPayment = 0;
    registrations.forEach(function(item) {
      const status = String(item.status || '').toLowerCase();
      if (status !== cancelledStatus && status !== waitlistStatus) {
        registered++;
        totalPeople += Number(item.adults || 0) + Number(item.children || 0);
        adults += Number(item.adults || 0);
        children += Number(item.children || 0);
      }
      if (status === waitlistStatus) waitlist++;
      if (status === checkedInStatus) checkedIn++;
      const payment = String(item.paymentStatus || '').toLowerCase();
      if (payment === 'paid') paid++;
      if (payment === 'pending' || payment === 'pay at event') needsPayment++;
    });
    payload = {
      success: true,
      authorized: true,
      data: {
        event: makeCommunicationSafe_(event),
        registrations: registrations,
        counts: { registrations: registered, people: totalPeople, adults: adults, children: children, waitlist: waitlist, checkedIn: checkedIn, paid: paid, needsPayment: needsPayment }
      }
    };
  } catch (error) {
    payload = { success: false, authorized: false, error: error && error.message ? error.message : 'Unable to load registrations.' };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload).replace(/<\//g, '<\\/') + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getRegistrationPeopleField_(registration, keys) {
  for (let i = 0; i < keys.length; i++) {
    const value = registration[keys[i]];
    if (value !== undefined && value !== null && value !== '') {
      const number = Number(value);
      return isNaN(number) ? 0 : Math.max(0, number);
    }
  }
  return 0;
}

function serializeOrganizerRegistrationValue_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  return value === undefined || value === null ? '' : String(value);
}

function organizerRegistrationAcknowledgementsComplete_(registration) {
  const fields = ['AcknowledgementMemberOrganized','AcknowledgementVoluntary','AcknowledgementRespect','AcknowledgementPhotosVideos'];
  return fields.every(function(field) {
    const value = registration[field];
    return value === '' || value === undefined || value === null || toBoolean_(value);
  });
}


/** M5.5.2: update registrations after organizer-session validation. */
function organizerRegistrationAction_(sessionToken, eventId, registrationIds, action, changes) {
  const identity = verifyOrganizerSession_(sessionToken);
  const cleanEventId = String(eventId || '').trim();
  const cleanAction = String(action || '').trim().toLowerCase();
  const ids = Array.isArray(registrationIds) ? registrationIds : [registrationIds];
  const cleanIds = ids.map(function(id) { return String(id || '').trim(); }).filter(Boolean);
  if (!cleanEventId) throw new Error('Adventure ID is required.');
  if (!cleanIds.length) throw new Error('Choose at least one registration.');

  getOrganizerEventRecord_(cleanEventId);
  const sheet = getSheetByName_(APP_CONFIG.sheets.registrations);
  const registrations = getDataObjects_(sheet);
  const matches = registrations.filter(function(item) {
    return cleanIds.indexOf(String(item.RegistrationId || '').trim()) !== -1 &&
      String(item.EventId || '').trim() === cleanEventId;
  });
  if (matches.length !== cleanIds.length) throw new Error('One or more registrations could not be found for this adventure.');

  const statuses = APP_CONFIG.registrationStatuses || {};
  const payments = APP_CONFIG.paymentStatuses || {};
  const updates = [];
  const allowedPaymentMethods = ['','Cash','Check','Venmo','PayPal','Credit Card','Other'];

  matches.forEach(function(registration) {
    let patch = { UpdatedAt: now_() };
    if (cleanAction === 'checkin') {
      patch.Status = statuses.checkedIn || 'Checked In';
    } else if (cleanAction === 'undo-checkin') {
      patch.Status = statuses.confirmed || 'Confirmed';
    } else if (cleanAction === 'mark-paid') {
      patch.PaymentStatus = payments.paid || 'Paid';
      if (changes && changes.paymentMethod !== undefined) {
        const method = String(changes.paymentMethod || '').trim();
        if (allowedPaymentMethods.indexOf(method) === -1) throw new Error('Invalid payment method.');
        patch.PaymentMethod = method;
      }
    } else if (cleanAction === 'payment-pending') {
      patch.PaymentStatus = payments.pending || 'Pending';
    } else if (cleanAction === 'cancel') {
      patch.Status = statuses.cancelled || 'Cancelled';
    } else if (cleanAction === 'confirm') {
      patch.Status = statuses.confirmed || 'Confirmed';
    } else if (cleanAction === 'waitlist') {
      patch.Status = statuses.waitlist || 'Waitlist';
    } else if (cleanAction === 'update') {
      const c = changes || {};
      if (c.name !== undefined) patch.Name = String(c.name || '').trim();
      if (c.email !== undefined) patch.Email = String(c.email || '').trim();
      if (c.phone !== undefined) patch.Phone = String(c.phone || '').trim();
      if (c.notes !== undefined) patch.Notes = String(c.notes || '').trim();
      if (c.paymentMethod !== undefined) {
        const method = String(c.paymentMethod || '').trim();
        if (allowedPaymentMethods.indexOf(method) === -1) throw new Error('Invalid payment method.');
        patch.PaymentMethod = method;
      }
      if (c.paymentStatus !== undefined) {
        const allowedPayments = [
          payments.notRequired || 'Not Required',
          payments.pending || 'Pending',
          payments.paid || 'Paid',
          payments.payAtEvent || 'Pay At Event',
          payments.buyOwnTicket || 'Buy Own Ticket'
        ];
        if (allowedPayments.indexOf(String(c.paymentStatus || '')) === -1) throw new Error('Invalid payment status.');
        patch.PaymentStatus = String(c.paymentStatus || '');
      }
      if (c.status !== undefined) {
        const allowedStatuses = [
          statuses.pending || 'Pending',
          statuses.confirmed || 'Confirmed',
          statuses.waitlist || 'Waitlist',
          statuses.cancelled || 'Cancelled',
          statuses.checkedIn || 'Checked In'
        ];
        if (allowedStatuses.indexOf(String(c.status || '')) === -1) throw new Error('Invalid registration status.');
        patch.Status = String(c.status || '');
      }
      if (!patch.Name) throw new Error('Participant name is required.');
    } else {
      throw new Error('Unsupported registration action.');
    }

    const updated = updateObjectById_(sheet, 'RegistrationId', registration.RegistrationId, patch);
    updates.push({
      registrationId: String(updated.RegistrationId || ''),
      status: String(updated.Status || ''),
      paymentStatus: String(updated.PaymentStatus || ''),
      paymentMethod: String(updated.PaymentMethod || ''),
      name: String(updated.Name || ''),
      email: String(updated.Email || ''),
      phone: String(updated.Phone || ''),
      notes: String(updated.Notes || '')
    });
  });

  if (cleanAction === 'cancel') promoteResourceWaitlistsForEvent_(cleanEventId);
  return {
    success: true,
    action: cleanAction,
    updated: updates,
    updatedCount: updates.length,
    updatedBy: identity.email || ''
  };
}

/** M5.5: cancel or permanently delete an adventure after organizer-session validation. */
function organizerEventLifecycleAction_(sessionToken, eventId, action) {
  const identity = verifyOrganizerSession_(sessionToken);
  const cleanEventId = String(eventId || '').trim();
  const cleanAction = String(action || '').trim().toLowerCase();
  if (!cleanEventId) throw new Error('Adventure ID is required.');
  const event = getOrganizerEventRecord_(cleanEventId);
  if (cleanAction === 'cancel') {
    const updated = updateObjectById_(getSheetByName_(APP_CONFIG.sheets.events), 'EventId', cleanEventId, {
      Status: APP_CONFIG.eventStatuses.cancelled,
      RegistrationClosed: true,
      UpdatedAt: now_()
    });
    if (typeof deleteQueuedEmailsForEvent_ === 'function') deleteQueuedEmailsForEvent_(cleanEventId);
    return { success: true, action: 'cancel', message: 'Adventure cancelled. Registrations and history were preserved.', event: toClientEvent_(updated) };
  }
  if (cleanAction !== 'delete') throw new Error('Unsupported adventure action.');
  const removed = {
    registrations: deleteRowsForEvent_(getSheetByName_(APP_CONFIG.sheets.registrations), cleanEventId),
    tasks: deleteRowsForEvent_(getOrCreateEventTasksSheet_(), cleanEventId),
    resources: deleteRowsForEvent_(getSheetByName_(APP_CONFIG.sheets.resources), cleanEventId),
    queuedEmails: typeof deleteQueuedEmailsForEvent_ === 'function' ? deleteQueuedEmailsForEvent_(cleanEventId) : 0,
    emailHistory: deleteRowsForEvent_(getDatabase().getSheetByName('Email Log'), cleanEventId)
  };
  deleteOrganizerEventDriveAssets_(event);
  deleteRowById_(getSheetByName_(APP_CONFIG.sheets.events), 'EventId', cleanEventId);
  return {
    success: true,
    action: 'delete',
    message: 'Adventure and associated records were permanently deleted.',
    removed: removed,
    deletedBy: identity.email || ''
  };
}

function deleteRowsForEvent_(sheet, eventId) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value || '').trim(); });
  const candidates = ['EventId','Event ID','EventID','AdventureId','Adventure ID'];
  let column = -1;
  for (let i = 0; i < candidates.length && column < 0; i++) column = headers.indexOf(candidates[i]);
  if (column < 0) return 0;
  let removed = 0;
  for (let row = values.length - 1; row >= 1; row--) {
    if (String(values[row][column] || '').trim() === String(eventId || '').trim()) {
      sheet.deleteRow(row + 1);
      removed++;
    }
  }
  return removed;
}

function deleteOrganizerEventDriveAssets_(event) {
  try {
    const folderId = String((event || {}).DriveFolderId || '').trim();
    if (folderId) {
      DriveApp.getFolderById(folderId).setTrashed(true);
      return;
    }
    const imageUrl = String((event || {}).ImageUrl || (event || {}).EventImageUrl || '');
    const match = imageUrl.match(/[-\w]{25,}/);
    if (match) DriveApp.getFileById(match[0]).setTrashed(true);
  } catch (error) {
    Logger.log('Unable to remove event Drive assets: ' + error.message);
  }
}
