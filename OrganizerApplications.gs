/**
 * Public organizer-interest submission.
 * Sprint 8.9
 */
function submitOrganizerInterest(payload) {
  payload = payload || {};

  // Honeypot: silently accept bot submissions without sending mail.
  if (String(payload.website || '').trim()) {
    return { success: true, message: 'Your organizer request was sent.' };
  }

  const name = sanitizeOrganizerInterestText_(payload.name, 100);
  const email = sanitizeOrganizerInterestText_(payload.email, 160).toLowerCase();
  const phone = sanitizeOrganizerInterestText_(payload.phone, 40);
  const adventureType = sanitizeOrganizerInterestText_(payload.adventureType, 100);
  const idea = sanitizeOrganizerInterestText_(payload.idea, 2000);
  const notes = sanitizeOrganizerInterestText_(payload.notes, 1200);

  if (!name) throw new Error('Enter your name.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!idea) throw new Error('Tell us about the adventure you would like to organize.');

  const cache = CacheService.getScriptCache();
  const throttleKey = 'organizer-interest:' + Utilities.base64EncodeWebSafe(email).slice(0, 180);
  if (cache.get(throttleKey)) {
    throw new Error('We already received a request from this email recently. Please wait before sending another one.');
  }

  const recipient = getOrganizerInterestRecipient_();
  const submittedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Chicago', 'EEEE, MMMM d, yyyy h:mm a');
  const subject = 'New Community Connections Organizer Request - ' + name;
  const body = [
    'A member is interested in organizing a Community Connections adventure.',
    '',
    'Name: ' + name,
    'Email: ' + email,
    'Phone: ' + (phone || 'Not provided'),
    'Adventure Type: ' + (adventureType || 'Not provided'),
    'Submitted: ' + submittedAt,
    '',
    'Adventure Idea:',
    idea,
    '',
    'Additional Notes:',
    notes || 'None provided',
    '',
    'This request was submitted through the public IWP Community Connections application.'
  ].join('\n');

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    replyTo: email,
    name: APP_CONFIG.appName || 'IWP Community Connections'
  });

  cache.put(throttleKey, '1', 21600);
  logAction_('Organizer Interest Submitted', name + ' <' + email + '>');

  return {
    success: true,
    message: 'Your organizer request was sent. An administrator will follow up with you.'
  };
}

function getOrganizerInterestRecipient_() {
  try {
    const settings = getSettingsMap_();
    return settings.OrganizerApplicationEmail || settings.SupportEmail || 'sandmannd@gmail.com';
  } catch (error) {
    return 'sandmannd@gmail.com';
  }
}

function sanitizeOrganizerInterestText_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLength || 500);
}
