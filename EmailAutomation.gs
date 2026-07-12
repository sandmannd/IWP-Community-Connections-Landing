/** Automatic 24-hour reminders and post-event thank-you emails. */

const EMAIL_AUTOMATION_HANDLER_ = 'runEventEmailAutomation';
const EMAIL_AUTOMATION_ENABLED_KEY_ = 'EVENT_EMAIL_AUTOMATION_ENABLED';
const EMAIL_AUTOMATION_SENT_PREFIX_ = 'EVENT_EMAIL_SENT_';
const EMAIL_QUEUE_SHEET_ = 'Email Queue';
const EMAIL_QUEUE_HEADERS_ = [
  'QueueId','UniqueKey','EventId','EventTitle','EmailType','Audience','ScheduledAt',
  'Status','SentAt','RecipientCount','FailureCount','RetryCount','LastError','CreatedAt','UpdatedAt'
];

function getEmailAutomationStatus() {
  requireAdmin_();
  const enabled = PropertiesService.getScriptProperties().getProperty(EMAIL_AUTOMATION_ENABLED_KEY_) === 'true';
  const triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === EMAIL_AUTOMATION_HANDLER_;
  });

  return {
    enabled: enabled && triggers.length > 0,
    triggerCount: triggers.length,
    label: enabled && triggers.length > 0 ? 'Automatic emails are ON' : 'Automatic emails are OFF'
  };
}

function enableEmailAutomation() {
  requireAdmin_();
  removeEmailAutomationTriggers_();
  ScriptApp.newTrigger(EMAIL_AUTOMATION_HANDLER_).timeBased().everyHours(1).create();
  PropertiesService.getScriptProperties().setProperty(EMAIL_AUTOMATION_ENABLED_KEY_, 'true');
  syncAutomaticEmailQueue_();
  return getEmailAutomationStatus();
}

function disableEmailAutomation() {
  requireAdmin_();
  removeEmailAutomationTriggers_();
  PropertiesService.getScriptProperties().setProperty(EMAIL_AUTOMATION_ENABLED_KEY_, 'false');
  return getEmailAutomationStatus();
}

function runEventEmailAutomation() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(EMAIL_AUTOMATION_ENABLED_KEY_) !== 'true') return;
  syncAutomaticEmailQueue_();
  processDueEmailQueue_();
}

function getEmailQueueStatus() {
  requireAdmin_();
  syncAutomaticEmailQueue_();
  const rows = getEmailQueueObjects_();
  const now = new Date();
  const scheduled = rows.filter(function(row) { return String(row.Status) === 'Scheduled'; });
  const due = scheduled.filter(function(row) {
    const when = queueDate_(row.ScheduledAt);
    return when && when.getTime() <= now.getTime();
  });
  const failed = rows.filter(function(row) { return String(row.Status) === 'Failed'; });
  const sent = rows.filter(function(row) { return String(row.Status) === 'Sent'; });
  const next = scheduled.sort(function(a, b) {
    return queueDate_(a.ScheduledAt).getTime() - queueDate_(b.ScheduledAt).getTime();
  }).slice(0, 8);

  return {
    scheduled: scheduled.length,
    due: due.length,
    failed: failed.length,
    sent: sent.length,
    next: next.map(toClientQueueItem_),
    failures: failed.slice(-8).reverse().map(toClientQueueItem_),
    updatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a')
  };
}

function sendQueuedEmailNow(queueId) {
  requireAdmin_();
  const result = processQueueItemById_(queueId, true);
  return { result: result, status: getEmailQueueStatus() };
}

function retryQueuedEmail(queueId) {
  requireAdmin_();
  const sheet = getEmailQueueSheet_();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIndex = headers.indexOf('QueueId');
  const statusIndex = headers.indexOf('Status');
  const errorIndex = headers.indexOf('LastError');
  const updatedIndex = headers.indexOf('UpdatedAt');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]) !== String(queueId)) continue;
    sheet.getRange(i + 1, statusIndex + 1).setValue('Scheduled');
    sheet.getRange(i + 1, errorIndex + 1).setValue('');
    sheet.getRange(i + 1, updatedIndex + 1).setValue(new Date());
    break;
  }
  const result = processQueueItemById_(queueId, true);
  return { result: result, status: getEmailQueueStatus() };
}

function syncAutomaticEmailQueue_() {
  const sheet = getEmailQueueSheet_();
  const existing = {};
  getEmailQueueObjects_().forEach(function(row) { existing[String(row.UniqueKey || '')] = row; });
  const props = PropertiesService.getScriptProperties();

  listEvents().forEach(function(event) {
    const status = String(event.Status || '');
    if (status === APP_CONFIG.eventStatuses.cancelled ||
        status === APP_CONFIG.eventStatuses.archived ||
        status === APP_CONFIG.eventStatuses.draft) return;
    if (!event.EventId) return;

    const start = eventDateTimeForAutomation_(event.StartDate, event.StartTime, false);
    const end = eventDateTimeForAutomation_(event.EndDate || event.StartDate, event.EndTime || event.StartTime, true);
    if (start) queueAutomaticEmail_(sheet, existing, props, event, 'REMINDER24', new Date(start.getTime() - 24 * 3600000));
    if (end) queueAutomaticEmail_(sheet, existing, props, event, 'THANKYOU', new Date(end.getTime() + 24 * 3600000));
  });
}

function queueAutomaticEmail_(sheet, existing, props, event, type, scheduledAt) {
  const uniqueKey = String(event.EventId) + ':' + type;
  if (existing[uniqueKey]) return;
  const sentKey = EMAIL_AUTOMATION_SENT_PREFIX_ + type + '_' + String(event.EventId);
  const alreadySent = props.getProperty(sentKey) === 'true';
  const now = new Date();
  const row = [
    Utilities.getUuid(), uniqueKey, String(event.EventId), String(event.Title || ''), type,
    'registered', scheduledAt, alreadySent ? 'Sent' : 'Scheduled', alreadySent ? now : '',
    '', '', 0, '', now, now
  ];
  sheet.appendRow(row);
  existing[uniqueKey] = true;
}

function processDueEmailQueue_() {
  const now = new Date();
  getEmailQueueObjects_().forEach(function(row) {
    if (String(row.Status) !== 'Scheduled') return;
    const scheduledAt = queueDate_(row.ScheduledAt);
    if (scheduledAt && scheduledAt.getTime() <= now.getTime()) processQueueItemById_(row.QueueId, false);
  });
}

function processQueueItemById_(queueId, force) {
  const sheet = getEmailQueueSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const map = {};
  headers.forEach(function(header, index) { map[header] = index; });

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[map.QueueId]) !== String(queueId)) continue;
    const status = String(row[map.Status] || '');
    if (!force && status !== 'Scheduled') return { success: false, message: 'Queue item is not scheduled.' };
    if (status === 'Sent') return { success: true, message: 'This email was already sent.' };

    const eventId = String(row[map.EventId] || '');
    const type = String(row[map.EmailType] || '');
    const event = getEvent(eventId);
    const template = type === 'THANKYOU' ? buildEventThankYouTemplate_(event) : buildEventReminderTemplate_(event);
    const recipients = getUniqueEventRecipientEmails_(eventId, String(row[map.Audience] || 'registered'));
    const retries = Number(row[map.RetryCount] || 0);
    const now = new Date();

    if (!recipients.length) {
      updateQueueRow_(sheet, i + 1, map, {
        Status: 'Skipped', RecipientCount: 0, FailureCount: 0,
        LastError: 'No eligible participant email addresses.', UpdatedAt: now
      });
      return { success: true, message: 'No eligible participant email addresses.' };
    }

    if (recipients.length > MailApp.getRemainingDailyQuota()) {
      const quotaError = 'Insufficient Apps Script email quota for ' + recipients.length + ' recipient(s).';
      updateQueueRow_(sheet, i + 1, map, {
        Status: 'Failed', RetryCount: retries + 1, LastError: quotaError, UpdatedAt: now
      });
      return { success: false, message: quotaError };
    }

    let sent = 0;
    const failed = [];
    recipients.forEach(function(email) {
      try {
        MailApp.sendEmail({ to: email, subject: template.subject, body: template.body, name: 'IWP Community Connections' });
        sent++;
      } catch (error) {
        failed.push(email + ': ' + error.message);
      }
    });

    const success = failed.length === 0;
    updateQueueRow_(sheet, i + 1, map, {
      Status: success ? 'Sent' : 'Failed',
      SentAt: success ? now : '',
      RecipientCount: sent,
      FailureCount: failed.length,
      RetryCount: success ? retries : retries + 1,
      LastError: failed.join(' | '),
      UpdatedAt: now
    });

    if (success) {
      PropertiesService.getScriptProperties().setProperty(
        EMAIL_AUTOMATION_SENT_PREFIX_ + type + '_' + eventId, 'true'
      );
      logEventEmailSend_(eventId, event, 'registered', template.subject, sent, []);
    }
    return {
      success: success,
      message: success ? sent + ' email' + (sent === 1 ? '' : 's') + ' sent.' : sent + ' sent, ' + failed.length + ' failed.'
    };
  }
  throw new Error('Email queue item was not found.');
}

function updateQueueRow_(sheet, rowNumber, map, values) {
  Object.keys(values).forEach(function(key) {
    if (typeof map[key] === 'number') sheet.getRange(rowNumber, map[key] + 1).setValue(values[key]);
  });
}

function getEmailQueueSheet_() {
  const ss = getDatabase();
  let sheet = ss.getSheetByName(EMAIL_QUEUE_SHEET_);
  if (!sheet) {
    sheet = ss.insertSheet(EMAIL_QUEUE_SHEET_);
    sheet.getRange(1, 1, 1, EMAIL_QUEUE_HEADERS_.length).setValues([EMAIL_QUEUE_HEADERS_]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getEmailQueueObjects_() {
  const sheet = getEmailQueueSheet_();
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map(function(row) {
    const object = {};
    headers.forEach(function(header, index) { object[header] = row[index]; });
    return object;
  });
}

function toClientQueueItem_(row) {
  const tz = Session.getScriptTimeZone();
  function format(value) {
    const date = queueDate_(value);
    return date ? Utilities.formatDate(date, tz, 'MMM d, yyyy h:mm a') : '';
  }
  return {
    queueId: String(row.QueueId || ''),
    eventId: String(row.EventId || ''),
    eventTitle: String(row.EventTitle || 'Adventure'),
    emailType: String(row.EmailType || ''),
    audience: String(row.Audience || ''),
    scheduledAt: format(row.ScheduledAt),
    status: String(row.Status || ''),
    sentAt: format(row.SentAt),
    recipientCount: Number(row.RecipientCount || 0),
    failureCount: Number(row.FailureCount || 0),
    retryCount: Number(row.RetryCount || 0),
    lastError: String(row.LastError || '')
  };
}

function queueDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function eventDateTimeForAutomation_(dateValue, timeValue, useEndOfDay) {
  const dateText = normalizeAutomationDate_(dateValue);
  if (!dateText) return null;
  const timeText = normalizeAutomationTime_(timeValue);
  const fallback = useEndOfDay ? '23:59:00' : '09:00:00';
  const parts = (timeText || fallback).split(':');
  const dateParts = dateText.split('-');
  return new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), Number(parts[0] || 0), Number(parts[1] || 0), Number(parts[2] || 0), 0);
}

function normalizeAutomationDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = String(value).trim();
  const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return '';
  return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
}

function normalizeAutomationTime_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm:ss');
  }
  const text = String(value).trim();
  const ampm = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const marker = ampm[4].toUpperCase();
    if (marker === 'PM' && hour !== 12) hour += 12;
    if (marker === 'AM' && hour === 12) hour = 0;
    return ('0' + hour).slice(-2) + ':' + ampm[2] + ':' + (ampm[3] || '00');
  }
  const twentyFour = text.match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (twentyFour) return ('0' + twentyFour[1]).slice(-2) + ':' + twentyFour[2] + ':' + (twentyFour[3] || '00');
  return '';
}

function removeEmailAutomationTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === EMAIL_AUTOMATION_HANDLER_) ScriptApp.deleteTrigger(trigger);
  });
}
