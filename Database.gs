/** Database setup and access helpers. */

function initializeDatabase() {
  const ss = getOrCreateDatabase_();
  pinDatabase_(ss);
  createSheetIfMissing_(ss, APP_CONFIG.sheets.events, getEventHeaders_());
  createSheetIfMissing_(ss, APP_CONFIG.sheets.registrations, getRegistrationHeaders_());
  createSheetIfMissing_(ss, APP_CONFIG.sheets.admins, getAdminHeaders_());
  createSheetIfMissing_(ss, APP_CONFIG.sheets.settings, getSettingsHeaders_());
  createSheetIfMissing_(ss, APP_CONFIG.sheets.eventTypes, getEventTypeHeaders_());
  createSheetIfMissing_(ss, APP_CONFIG.sheets.memories, getMemoryHeaders_());
  createSheetIfMissing_(ss, APP_CONFIG.sheets.logs, getLogHeaders_());
  seedOwnerAdmin_(ss);
  seedDefaultEventTypes_(ss);
  seedDefaultSettings_(ss);
  return { success: true, message: 'Database initialized successfully.', spreadsheetUrl: ss.getUrl(), spreadsheetId: ss.getId() };
}

function getDatabase() { return getOrCreateDatabase_(); }

function getSheetByName_(sheetName) {
  const ss = getOrCreateDatabase_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing required sheet: ' + sheetName);

  // Keep existing databases in sync when new columns are added in later builds.
  // This is especially important for ImageUrl, because older Events sheets were
  // created before that field existed and silently discarded uploaded images.
  if (sheetName === APP_CONFIG.sheets.events) {
    ensureSheetHeaders_(sheet, getEventHeaders_());
  }

  return sheet;
}

function ensureSheetHeaders_(sheet, headers) {
  if (!sheet || !headers || !headers.length) return;

  const lastColumn = Math.max(1, sheet.getLastColumn());
  const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const existingHeaders = firstRow.map(function(value) {
    return String(value || '').trim();
  });

  headers.forEach(function(header) {
    if (existingHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      existingHeaders.push(header);
    }
  });
}

function getOrCreateDatabase_() {
  const props = PropertiesService.getScriptProperties();
  const pinnedId =
    props.getProperty('DATABASE_SPREADSHEET_ID') ||
    props.getProperty('IWP_COMMUNITY_CONNECTIONS_DB_ID') ||
    props.getProperty('IWP_EVENT_WIZARD_DB_ID') ||
    '';

  if (pinnedId) {
    try {
      const pinnedSpreadsheet = SpreadsheetApp.openById(pinnedId);
      // Normalize all supported property names so older and newer builds
      // always resolve to the same existing database.
      props.setProperty('DATABASE_SPREADSHEET_ID', pinnedSpreadsheet.getId());
      props.setProperty('IWP_COMMUNITY_CONNECTIONS_DB_ID', pinnedSpreadsheet.getId());
      return pinnedSpreadsheet;
    } catch (err) {
      throw new Error(
        'The configured Community Connections database could not be opened. ' +
        'Verify the spreadsheet ID in Script Properties and make sure the deployment owner can access it. ' +
        'Original error: ' + err.message
      );
    }
  }

  const files = DriveApp.getFilesByName(APP_CONFIG.spreadsheetName);
  let bestFile = null;
  let bestRows = -1;

  while (files.hasNext()) {
    const file = files.next();
    try {
      const ss = SpreadsheetApp.openById(file.getId());
      const sheet = ss.getSheetByName(APP_CONFIG.sheets.events);
      const rows = sheet ? sheet.getLastRow() : 0;
      if (rows > bestRows) {
        bestRows = rows;
        bestFile = file;
      }
    } catch (err) {
      // Ignore files we cannot open.
    }
  }

  if (bestFile) {
    const ss = SpreadsheetApp.openById(bestFile.getId());
    pinDatabase_(ss);
    return ss;
  }

  throw new Error(
    'Community Connections database is not configured. Add the spreadsheet ID to the ' +
    'IWP_COMMUNITY_CONNECTIONS_DB_ID Script Property, then reload the app.'
  );
}

function pinDatabase_(ss) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('DATABASE_SPREADSHEET_ID', ss.getId());
  props.setProperty('IWP_COMMUNITY_CONNECTIONS_DB_ID', ss.getId());
  // Keep the legacy key temporarily so older deployed versions remain functional.
  props.setProperty('IWP_EVENT_WIZARD_DB_ID', ss.getId());
}

function clearPinnedDatabase() {
  PropertiesService.getScriptProperties().deleteProperty('DATABASE_SPREADSHEET_ID');
  return { success: true, message: 'Pinned database cleared. Run initializeDatabase again.' };
}

function getDatabaseDiagnostics() {
  const props = PropertiesService.getScriptProperties();
  const pinnedId = props.getProperty('DATABASE_SPREADSHEET_ID') || '';
  const files = DriveApp.getFilesByName(APP_CONFIG.spreadsheetName);
  const results = [];

  while (files.hasNext()) {
    const file = files.next();
    let eventRows = 'unknown';
    let url = '';
    try {
      const ss = SpreadsheetApp.openById(file.getId());
      url = ss.getUrl();
      const events = ss.getSheetByName(APP_CONFIG.sheets.events);
      eventRows = events ? Math.max(0, events.getLastRow() - 1) : 0;
    } catch (err) {
      eventRows = 'error: ' + err.message;
    }
    results.push({ id: file.getId(), name: file.getName(), url: url, eventRows: eventRows, pinned: file.getId() === pinnedId });
  }

  Logger.log(JSON.stringify({ pinnedId: pinnedId, databases: results }, null, 2));
  return { pinnedId: pinnedId, databases: results };
}

function setDatabaseId(spreadsheetId) {
  if (!spreadsheetId) throw new Error('Spreadsheet ID is required.');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  pinDatabase_(ss);
  initializeDatabase();
  return { success: true, message: 'Database pinned.', spreadsheetUrl: ss.getUrl(), spreadsheetId: ss.getId() };
}

function createSheetIfMissing_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const lastColumn = Math.max(sheet.getLastColumn(), headers.length);
  const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const existingHeaders = firstRow.filter(function(value) { return value !== ''; });
  if (existingHeaders.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers.forEach(function(header) {
      if (existingHeaders.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      }
    });
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  return sheet;
}

function seedOwnerAdmin_(ss) {
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.admins);
  const data = sheet.getDataRange().getValues();
  if (data.length > 1) return;
  const email = Session.getEffectiveUser().getEmail();
  sheet.appendRow([createId_('admin'), 'Shane Hendricks', email, APP_CONFIG.roles.owner, true, new Date(), new Date()]);
}

function seedDefaultEventTypes_(ss) {
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.eventTypes);
  const data = sheet.getDataRange().getValues();
  if (data.length > 1) return;
  APP_CONFIG.defaultEventTypes.forEach(function(type) {
    sheet.appendRow([createId_('type'), type, true, new Date(), new Date()]);
  });
}

function seedDefaultSettings_(ss) {
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  const data = sheet.getDataRange().getValues();
  if (data.length > 1) return;
  [['appName', APP_CONFIG.appName], ['subtitle', APP_CONFIG.subtitle], ['tagline', APP_CONFIG.tagline], ['version', APP_CONFIG.version]].forEach(function(row) {
    sheet.appendRow([createId_('setting'), row[0], row[1], new Date(), new Date()]);
  });
}

function getEventHeaders_() {
  return [
    'EventId','Status','Featured','Title','EventType','ImageUrl','CustomEventType','StartDate','StartTime','EndDate','EndTime','LocationName','Address','Description','WhatToExpect','WhatToBring','Provided','SpecialNotes','ChildrenAllowed','RegistrationRequired','FreeEvent','PaidEvent','AdultCost','ChildCost','PaymentDue','VenmoEnabled','VenmoHandle','CashAppEnabled','CashAppHandle','CashEnabled','PayAtEventEnabled','BuyOwnTicketsEnabled','TicketPurchaseLink','MaxParticipants','WaitlistEnabled','OrganizerName','OrganizerEmail','OrganizerPhone','ShowAttendeeNames','RegistrationLink','CreatedBy','CreatedAt','UpdatedAt'
  ];
}

function getRegistrationHeaders_() {
  return [
    'RegistrationId','EventId','Status','Name','Email','Phone','AdultCount','ChildCount','AdultGuestNames','ChildNames','EmergencyContactName','EmergencyContactPhone','PaymentStatus','PaymentMethod','PaymentNotes','ShowNameOnAttendeeList','AcknowledgementMemberOrganized','AcknowledgementVoluntary','AcknowledgementRespect','AcknowledgementPayment','AcknowledgementRefund','Notes','RegisteredAt','UpdatedAt'
  ];
}
function getAdminHeaders_() { return ['AdminId','Name','Email','Role','Active','CreatedAt','UpdatedAt']; }
function getSettingsHeaders_() { return ['SettingId','SettingKey','SettingValue','CreatedAt','UpdatedAt']; }
function getEventTypeHeaders_() { return ['EventTypeId','Name','Active','CreatedAt','UpdatedAt']; }
function getMemoryHeaders_() { return ['MemoryId','EventId','ImageUrl','FileId','Caption','Featured','Approved','UploadedBy','CreatedAt','UpdatedAt']; }
function getLogHeaders_() { return ['LogId','Level','Message','Details','CreatedAt']; }
