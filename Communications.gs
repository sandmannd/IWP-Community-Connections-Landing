/** Organizer email tools for launch. */

function getEventEmailComposerData(eventId) {
  requireAdmin_();
  const event = getEvent(eventId);
  const counts = getEventRecipientCounts_(eventId);

  return {
    event: makeCommunicationSafe_(event),
    recipientCount: counts.registered,
    counts: counts,
    history: getEventEmailHistory_(eventId, 8),
    templates: {
      update: buildEventUpdateTemplate_(event),
      reminder24: buildEventReminderTemplate_(event),
      thankYou: buildEventThankYouTemplate_(event)
    }
  };
}



function sendEventTestEmail(eventId, subject, body) {
  requireAdmin_();
  const event = getEvent(eventId);
  const cleanSubject = normalizeText_(subject);
  const cleanBody = String(body || '').trim();
  const recipient = normalizeEmail_(Session.getActiveUser().getEmail());

  if (!cleanSubject) throw new Error('Email subject is required.');
  if (!cleanBody) throw new Error('Email message is required.');
  if (!recipient) {
    throw new Error('Google did not provide your signed-in email address. Use Send Email only after reviewing the message carefully.');
  }
  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error('There is no remaining Apps Script email quota today.');
  }

  MailApp.sendEmail({
    to: recipient,
    subject: '[TEST] ' + cleanSubject,
    body: cleanBody + '\n\n---\nThis was a test email for ' + (event && event.Title ? event.Title : 'an IWP Community Connections adventure') + '.',
    name: 'IWP Community Connections'
  });

  return {
    success: true,
    recipient: recipient,
    message: 'Test email sent to ' + recipient + '.'
  };
}

function sendEventParticipantEmail(eventId, subject, body, audience) {
  requireAdmin_();
  const event = getEvent(eventId);
  const cleanSubject = normalizeText_(subject);
  const cleanBody = String(body || '').trim();

  if (!cleanSubject) throw new Error('Email subject is required.');
  if (!cleanBody) throw new Error('Email message is required.');

  const cleanAudience = normalizeEventEmailAudience_(audience);
  const recipients = getUniqueEventRecipientEmails_(eventId, cleanAudience);
  if (!recipients.length) throw new Error('There are no participant email addresses for this event.');

  const remainingQuota = MailApp.getRemainingDailyQuota();
  if (recipients.length > remainingQuota) {
    throw new Error('This email needs ' + recipients.length + ' sends, but only ' + remainingQuota + ' remain in today\'s Apps Script email quota.');
  }

  let sent = 0;
  const failed = [];
  recipients.forEach(function(email) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: cleanSubject,
        body: cleanBody,
        name: 'IWP Community Connections'
      });
      sent++;
    } catch (error) {
      failed.push(email);
      Logger.log('Participant email failed for ' + email + ': ' + error.message);
    }
  });

  logEventEmailSend_(eventId, event, cleanAudience, cleanSubject, sent, failed);

  return {
    success: failed.length === 0,
    sent: sent,
    failed: failed.length,
    failedEmails: failed,
    message: sent + ' email' + (sent === 1 ? '' : 's') + ' sent' + (failed.length ? '. ' + failed.length + ' failed.' : '.')
  };
}

function logEventEmailSend_(eventId, event, audience, subject, sent, failedEmails) {
  try {
    const sheetName = 'Email Log';
    const ss = getDatabase();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['SentAt', 'EventId', 'EventTitle', 'Audience', 'Subject', 'SentCount', 'FailedCount', 'SentBy']);
      sheet.setFrozenRows(1);
    }
    const user = Session.getActiveUser().getEmail() || '';
    sheet.appendRow([
      new Date(),
      eventId,
      event && event.Title ? event.Title : '',
      audience,
      subject,
      sent,
      failedEmails ? failedEmails.length : 0,
      user
    ]);
  } catch (error) {
    Logger.log('Unable to write email history: ' + error.message);
  }
}

function getEventEmailHistory_(eventId, limit) {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('Email Log');
    if (!sheet || sheet.getLastRow() < 2) return [];
    const values = sheet.getDataRange().getValues();
    const rows = values.slice(1).filter(function(row) {
      return String(row[1]) === String(eventId);
    }).reverse().slice(0, Number(limit || 8));

    const tz = Session.getScriptTimeZone();
    return rows.map(function(row) {
      return {
        sentAt: row[0] instanceof Date ? Utilities.formatDate(row[0], tz, 'MMM d, yyyy h:mm a') : String(row[0] || ''),
        audience: String(row[3] || ''),
        subject: String(row[4] || ''),
        sent: Number(row[5] || 0),
        failed: Number(row[6] || 0),
        sentBy: String(row[7] || '')
      };
    });
  } catch (error) {
    Logger.log('Unable to read email history: ' + error.message);
    return [];
  }
}

function getUniqueEventRecipientEmails_(eventId, audience) {
  const cleanAudience = normalizeEventEmailAudience_(audience);
  const statuses = APP_CONFIG.registrationStatuses || {};
  const cancelledStatus = String(statuses.cancelled || 'Cancelled').toLowerCase();
  const waitlistStatus = String(statuses.waitlist || 'Waitlist').toLowerCase();
  const seen = {};
  const emails = [];

  listRegistrationsForEvent(eventId).forEach(function(registration) {
    const status = String(registration.Status || '').toLowerCase();
    if (status === cancelledStatus) return;

    const isWaitlisted = status === waitlistStatus;
    if (cleanAudience === 'registered' && isWaitlisted) return;
    if (cleanAudience === 'waitlist' && !isWaitlisted) return;

    const email = normalizeEmail_(registration.Email);
    if (!email || seen[email]) return;
    seen[email] = true;
    emails.push(email);
  });
  return emails;
}

function getEventRecipientCounts_(eventId) {
  const registered = getUniqueEventRecipientEmails_(eventId, 'registered').length;
  const waitlist = getUniqueEventRecipientEmails_(eventId, 'waitlist').length;
  return {
    registered: registered,
    waitlist: waitlist,
    all: getUniqueEventRecipientEmails_(eventId, 'all').length
  };
}

function normalizeEventEmailAudience_(audience) {
  const clean = String(audience || 'registered').toLowerCase();
  return ['registered', 'waitlist', 'all'].indexOf(clean) >= 0 ? clean : 'registered';
}

function buildEventUpdateTemplate_(event) {
  return {
    subject: (event.Title || 'Community Connections Adventure') + ' Update',
    body: [
      'Hello,',
      '',
      'Here is an update for ' + (event.Title || 'our upcoming Community Connections adventure') + ':',
      '',
      '[Add your update here]',
      '',
      buildEventEmailDetails_(event),
      '',
      'You Are Not Alone.',
      'IWP Community Connections'
    ].join('\n')
  };
}

function buildEventReminderTemplate_(event) {
  return {
    subject: 'Reminder: ' + (event.Title || 'Community Connections Adventure') + ' is tomorrow',
    body: [
      'Hello,',
      '',
      'This is your 24-hour reminder for ' + (event.Title || 'our Community Connections adventure') + '.',
      '',
      buildEventEmailDetails_(event),
      '',
      event.WhatToBring ? 'What to bring:\n' + event.WhatToBring + '\n' : '',
      'Please contact the organizer if your plans have changed.',
      '',
      'You Are Not Alone.',
      'IWP Community Connections'
    ].filter(Boolean).join('\n')
  };
}

function buildEventThankYouTemplate_(event) {
  return {
    subject: 'Thank you for joining us: ' + (event.Title || 'Community Connections Adventure'),
    body: [
      'Hello,',
      '',
      'Thank you for joining us for ' + (event.Title || 'our Community Connections adventure') + '.',
      '',
      'We hope you had a great time connecting with others and making some good memories.',
      '',
      '[Add any event-specific thank-you message or photo link here]',
      '',
      'You Are Not Alone.',
      'IWP Community Connections'
    ].join('\n')
  };
}

function buildEventEmailDetails_(event) {
  const lines = [];
  lines.push('Event: ' + (event.Title || 'Community Connections Adventure'));
  lines.push('Date/Time: ' + formatEventDateLine_(event));
  lines.push('Location: ' + (event.LocationName || 'To be announced'));
  if (event.Address) lines.push('Address: ' + event.Address);
  if (event.OrganizerName) lines.push('Organizer: ' + event.OrganizerName);
  if (event.OrganizerPhone) lines.push('Organizer phone: ' + event.OrganizerPhone);
  return lines.join('\n');
}

function makeCommunicationSafe_(value) {
  return JSON.parse(JSON.stringify(value || {}));
}
