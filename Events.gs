/** Adventure/event engine. */

function listDashboardEvents() {
  requireAdmin_();
  return listEvents(false);
}

function listEvents(forcePublic) {
  const sheet = getSheetByName_(APP_CONFIG.sheets.events);
  const registrations = getDataObjects_(getSheetByName_(APP_CONFIG.sheets.registrations));
  const registrationsByEvent = {};

  registrations.forEach(function(registration) {
    const eventId = String(registration.EventId || '');
    if (!eventId) return;
    if (!registrationsByEvent[eventId]) registrationsByEvent[eventId] = [];
    registrationsByEvent[eventId].push(registration);
  });

  const publicMode = forcePublic === true || !isCurrentUserAdmin();
  const sourceEvents = getEventObjects_(sheet).filter(function(event) {
    return !publicMode || String(event.Status) === APP_CONFIG.eventStatuses.published;
  });

  const events = sourceEvents.map(function(event) {
    const clientEvent = toClientEvent_(event);
    const eventRegistrations = registrationsByEvent[String(event.EventId || '')] || [];
    const activeRegistrations = eventRegistrations.filter(function(registration) {
      const status = String(registration.Status || '').toLowerCase();
      return status !== String(APP_CONFIG.registrationStatuses.cancelled).toLowerCase() &&
             status !== String(APP_CONFIG.registrationStatuses.waitlist).toLowerCase();
    });
    const waitlistRegistrations = eventRegistrations.filter(function(registration) {
      return String(registration.Status || '').toLowerCase() === String(APP_CONFIG.registrationStatuses.waitlist).toLowerCase();
    });

    clientEvent.RegistrationCount = activeRegistrations.length;
    clientEvent.PeopleCount = calculateSpotsTaken_(eventRegistrations);
    clientEvent.WaitlistCount = waitlistRegistrations.length;
    clientEvent.SpotsRemaining = calculateSpotsRemaining_(event, eventRegistrations);

    // Public event records must never expose internal creator or organizer
    // contact fields. The public UI receives only the information needed to
    // display the adventure and calculate availability.
    if (publicMode) {
      delete clientEvent.CreatedBy;
      delete clientEvent.OrganizerEmail;
      delete clientEvent.OrganizerPhone;
    }

    return clientEvent;
  });

  return events.sort(function(a, b) {
    return String(a.StartDate || '').localeCompare(String(b.StartDate || ''));
  });
}



function summarizeRegistrationsForPublic_(registrations) {
  return (registrations || []).map(function(registration) {
    return {
      Status: safeClientValue_(registration.Status),
      AdultCount: Number(registration.AdultCount || 0),
      ChildCount: Number(registration.ChildCount || 0)
    };
  });
}

/**
 * Reads events and formats the four schedule columns by field type.
 * Google Sheets represents time-only cells as Date objects based on
 * December 30, 1899. We must format the RAW value as a time before it is
 * sent to the browser. Using getDisplayValues() can lose the time when the
 * sheet column is accidentally formatted as a date.
 */
function getEventObjects_(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];

  const displays = range.getDisplayValues();
  const headers = values[0];

  return values.slice(1).map(function(row, rowIndex) {
    const event = rowToObject_(headers, row);

    headers.forEach(function(header, columnIndex) {
      if (header === 'StartDate' || header === 'EndDate' ||
          header === 'StartTime' || header === 'EndTime') {
        event[header] = formatEventScheduleValue_(
          header,
          row[columnIndex],
          displays[rowIndex + 1][columnIndex]
        );
      }
    });

    return event;
  });
}

function formatEventScheduleValue_(fieldName, rawValue, displayValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return '';

  const isTimeField = fieldName === 'StartTime' || fieldName === 'EndTime';
  const timeZone = Session.getScriptTimeZone();

  if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
    return Utilities.formatDate(
      rawValue,
      timeZone,
      isTimeField ? 'h:mm a' : 'yyyy-MM-dd'
    );
  }

  const text = String(rawValue).trim();
  if (!text) return '';

  if (isTimeField) {
    // Already formatted time.
    if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?$/i.test(text)) {
      return normalizeEventTimeText_(text);
    }

    // ISO/date-time text with a usable time component.
    const timeMatch = text.match(/[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      return normalizeEventTimeText_(timeMatch[1] + ':' + timeMatch[2]);
    }

    // A bare 1899-12-30 contains no recoverable time. Do not display it.
    if (/^1899-12-30(?:T00:00:00(?:\.000)?Z?)?$/.test(text)) return '';

    const displayed = String(displayValue || '').trim();
    if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?$/i.test(displayed)) {
      return normalizeEventTimeText_(displayed);
    }

    return '';
  }

  // Date field stored as yyyy-MM-dd text.
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) return dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, timeZone, 'yyyy-MM-dd');
  }

  return String(displayValue || text).trim();
}

function normalizeEventTimeText_(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return text;

  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = match[3] ? match[3].toUpperCase() : '';

  if (suffix) {
    if (hour < 1 || hour > 12) return text;
    return hour + ':' + minute + ' ' + suffix;
  }

  if (hour < 0 || hour > 23) return text;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return hour + ':' + minute + ' ' + ampm;
}

function getPublishedEvents() {
  return listEvents(true);
}

function getEvent(eventId, forcePublic) {
  const events = getEventObjects_(getSheetByName_(APP_CONFIG.sheets.events));
  const event = events.find(function(item) {
    return String(item.EventId) === String(eventId);
  });

  if (!event) {
    throw new Error('Adventure not found.');
  }

  const publicMode = forcePublic === true || !isCurrentUserAdmin();
  if (publicMode && String(event.Status) !== APP_CONFIG.eventStatuses.published) {
    throw new Error('This adventure is not available to the public.');
  }

  return toClientEvent_(event);
}

function getEventDetailData(eventId, forcePublic) {
  const publicMode = forcePublic === true || !isCurrentUserAdmin();
  const event = getEvent(eventId, publicMode);
  const registrations = listRegistrationsForEvent_(eventId);
  const clientRegistrations = publicMode
    ? summarizeRegistrationsForPublic_(registrations)
    : safeClientArray_(registrations);

  return {
    event: event,
    registrations: clientRegistrations,
    memories: safeClientArray_(listApprovedEventMemories_(eventId)),
    spotsTaken: calculateSpotsTaken_(registrations),
    spotsRemaining: calculateSpotsRemaining_(event, registrations)
  };
}

function createEventDraft(eventData) {
  requireAdmin_();

  const sheet = getSheetByName_(APP_CONFIG.sheets.events);
  const record = normalizeEventRecord_(eventData || {});

  record.EventId = createId_('event');
  record.Status = APP_CONFIG.eventStatuses.draft;
  record.RegistrationLink = '';
  record.CreatedBy = getCurrentUserEmail_();
  record.CreatedAt = now_();
  record.UpdatedAt = now_();

  if (toBoolean_(record.Featured)) clearOtherFeaturedEvents_(record.EventId);
  appendObject_(sheet, record);

  return {
    success: true,
    message: 'Adventure draft saved.',
    event: toClientEvent_(record)
  };
}

function updateEventDraft(eventId, eventData) {
  requireAdmin_();

  const updates = normalizeEventRecord_(eventData || {});
  updates.UpdatedAt = now_();

  if (toBoolean_(updates.Featured)) clearOtherFeaturedEvents_(eventId);

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    updates
  );

  return {
    success: true,
    message: 'Adventure updated.',
    event: toClientEvent_(updated)
  };
}

/**
 * Google Sheets auto-converts values such as "11:00 AM" into time-only Date
 * objects. Those values can shift by an hour when the spreadsheet and Apps
 * Script time zones apply different historical offsets. Store the four event
 * schedule fields as literal text so the organizer's exact dates and times
 * survive every save and read.
 */
function writeEventScheduleAsText_(sheet, eventId, schedule) {
  const rowNumber = findRowById_(sheet, 'EventId', eventId);
  if (rowNumber === -1) throw new Error('Adventure schedule row not found: ' + eventId);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  ['StartDate', 'StartTime', 'EndDate', 'EndTime'].forEach(function(fieldName) {
    const columnIndex = headers.indexOf(fieldName);
    if (columnIndex === -1) return;
    const value = normalizeText_(schedule[fieldName] || '');
    const cell = sheet.getRange(rowNumber, columnIndex + 1);
    cell.setNumberFormat('@');
    cell.setValue(value);
  });
  SpreadsheetApp.flush();
}

function publishEvent(eventId) {
  requireAdmin_();

  const event = getEvent(eventId);
  const registrationLink = toBoolean_(event.RegistrationRequired)
    ? buildRegistrationUrl_(eventId)
    : '';

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Status: APP_CONFIG.eventStatuses.published,
      RegistrationLink: registrationLink,
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Adventure published.',
    event: toClientEvent_(updated)
  };
}

function closeEventRegistration(eventId) {
  requireAdmin_();

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Status: APP_CONFIG.eventStatuses.registrationClosed,
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Registration closed.',
    event: toClientEvent_(updated)
  };
}

function completeEvent(eventId) {
  requireAdmin_();

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Status: APP_CONFIG.eventStatuses.complete,
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Adventure completed.',
    event: toClientEvent_(updated)
  };
}

function cancelEvent(eventId) {
  requireAdmin_();

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Status: APP_CONFIG.eventStatuses.cancelled,
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Adventure cancelled.',
    event: toClientEvent_(updated)
  };
}

function deleteEvent(eventId) {
  requireAdmin_();
  deleteRowById_(getSheetByName_(APP_CONFIG.sheets.events), 'EventId', eventId);

  return {
    success: true,
    message: 'Adventure deleted.'
  };
}

function duplicateEvent(eventId) {
  requireAdmin_();

  const copy = Object.assign({}, getEvent(eventId));
  delete copy.EventId;
  copy.Title = copy.Title + ' Copy';
  copy.Status = APP_CONFIG.eventStatuses.draft;
  copy.RegistrationLink = '';
  copy.CreatedBy = getCurrentUserEmail_();
  copy.CreatedAt = now_();
  copy.UpdatedAt = now_();

  return createEventDraft(copy);
}


function setFeaturedAdventure(eventId) {
  requireAdmin_();

  const event = getEvent(eventId);
  if (String(event.Status || '') !== APP_CONFIG.eventStatuses.published) {
    throw new Error('Only a published adventure can be featured.');
  }

  clearOtherFeaturedEvents_(eventId);

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Featured: true,
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Featured adventure updated.',
    event: toClientEvent_(updated)
  };
}

function clearFeaturedAdventure(eventId) {
  requireAdmin_();

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Featured: false,
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Adventure is no longer featured.',
    event: toClientEvent_(updated)
  };
}

function clearOtherFeaturedEvents_(keepEventId) {
  const sheet = getSheetByName_(APP_CONFIG.sheets.events);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0];
  const idIndex = headers.indexOf('EventId');
  const featuredIndex = headers.indexOf('Featured');
  const updatedAtIndex = headers.indexOf('UpdatedAt');
  if (idIndex === -1 || featuredIndex === -1) return;

  const now = now_();
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const rowEventId = String(values[rowIndex][idIndex] || '');
    if (rowEventId === String(keepEventId || '')) continue;
    if (!toBoolean_(values[rowIndex][featuredIndex])) continue;

    sheet.getRange(rowIndex + 1, featuredIndex + 1).setValue(false);
    if (updatedAtIndex !== -1) {
      sheet.getRange(rowIndex + 1, updatedAtIndex + 1).setValue(now);
    }
  }
}

function getActiveEventTypes() {
  return getDataObjects_(getSheetByName_(APP_CONFIG.sheets.eventTypes))
    .filter(function(type) {
      return toBoolean_(type.Active);
    })
    .map(function(type) {
      return String(type.Name || '');
    })
    .filter(function(name) {
      return name !== '' && name.toLowerCase() !== 'motorcycle ride';
    });
}

function normalizeEventRecord_(data) {
  return {
    Status: data.Status || APP_CONFIG.eventStatuses.draft,
    Featured: toBoolean_(data.Featured || data.featured),
    Title: normalizeText_(data.Title || data.title),
    EventType: normalizeText_(data.EventType || data.eventType),
    ImageUrl: normalizeText_(data.ImageUrl || data.imageUrl),
    CustomEventType: normalizeText_(data.CustomEventType || data.customEventType),
    StartDate: normalizeText_(data.StartDate || data.startDate),
    StartTime: normalizeText_(data.StartTime || data.startTime),
    EndDate: normalizeText_(data.EndDate || data.endDate),
    EndTime: normalizeText_(data.EndTime || data.endTime),
    LocationName: normalizeText_(data.LocationName || data.locationName),
    Address: normalizeText_(data.Address || data.address),
    Description: normalizeText_(data.Description || data.description),
    WhatToExpect: normalizeText_(data.WhatToExpect || data.whatToExpect),
    WhatToBring: normalizeText_(data.WhatToBring || data.whatToBring),
    Provided: normalizeText_(data.Provided || data.provided),
    SpecialNotes: normalizeText_(data.SpecialNotes || data.specialNotes),
    ChildrenAllowed: toBoolean_(data.ChildrenAllowed || data.childrenAllowed),
    RegistrationRequired: toBoolean_(data.RegistrationRequired || data.registrationRequired),
    FreeEvent: toBoolean_(data.FreeEvent || data.freeEvent),
    PaidEvent: toBoolean_(data.PaidEvent || data.paidEvent),
    AdultCost: normalizeText_(data.AdultCost || data.adultCost),
    ChildCost: normalizeText_(data.ChildCost || data.childCost),
    PaymentDue: normalizeText_(data.PaymentDue || data.paymentDue),
    VenmoEnabled: toBoolean_(data.VenmoEnabled || data.venmoEnabled),
    VenmoHandle: normalizeText_(data.VenmoHandle || data.venmoHandle),
    CashAppEnabled: toBoolean_(data.CashAppEnabled || data.cashAppEnabled),
    CashAppHandle: normalizeText_(data.CashAppHandle || data.cashAppHandle),
    CashEnabled: toBoolean_(data.CashEnabled || data.cashEnabled),
    PayAtEventEnabled: toBoolean_(data.PayAtEventEnabled || data.payAtEventEnabled),
    BuyOwnTicketsEnabled: toBoolean_(data.BuyOwnTicketsEnabled || data.buyOwnTicketsEnabled),
    TicketPurchaseLink: normalizeText_(data.TicketPurchaseLink || data.ticketPurchaseLink),
    MaxParticipants: normalizeText_(data.MaxParticipants || data.maxParticipants),
    WaitlistEnabled: toBoolean_(data.WaitlistEnabled || data.waitlistEnabled),
    OrganizerName: normalizeText_(data.OrganizerName || data.organizerName),
    OrganizerEmail: normalizeText_(data.OrganizerEmail || data.organizerEmail),
    OrganizerPhone: normalizeText_(data.OrganizerPhone || data.organizerPhone),
    ShowAttendeeNames: toBoolean_(data.ShowAttendeeNames || data.showAttendeeNames),
    RegistrationLink: normalizeText_(data.RegistrationLink || data.registrationLink),
    CreatedBy: normalizeText_(data.CreatedBy || data.createdBy),
    CreatedAt: data.CreatedAt || data.createdAt || '',
    UpdatedAt: data.UpdatedAt || data.updatedAt || ''
  };
}

function toClientEvent_(event) {
  return safeClientObject_(event);
}

function safeClientArray_(items) {
  return (items || []).map(function(item) {
    return safeClientObject_(item);
  });
}

function safeClientObject_(obj) {
  const out = {};
  obj = obj || {};

  Object.keys(obj).forEach(function(key) {
    out[key] = safeClientValue_(obj[key]);
  });

  return out;
}

function safeClientValue_(value) {
  if (value instanceof Date) {
    var h=value.getHours(), m=value.getMinutes();
    if (value.getFullYear()==1899) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'h:mm a');
    }
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return String(value);
}


function uploadEventImage(fileData) {
  requireAdmin_();
  fileData = fileData || {};
  const mimeType = String(fileData.mimeType || 'image/jpeg');
  const fileName = String(fileData.fileName || ('event-' + Date.now() + '.jpg'));
  const base64 = String(fileData.base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!base64) throw new Error('No image data was received.');
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.');
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = getOrCreateEventImageFolder_();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    success: true,
    // The thumbnail endpoint renders reliably inside Apps Script web-app iframes.
    imageUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600',
    fileId: file.getId()
  };
}

function getOrCreateEventImageFolder_() {
  const name = 'IWP Community Connections Event Images';
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}
