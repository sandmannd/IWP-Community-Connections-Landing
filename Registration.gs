/** Registration engine. */

function getRegistrationPageData(eventId) {
  const event = getEvent(eventId, true);
  const registrations = listRegistrationsForEvent_(eventId);
  return {
    event: event,
    registrations: summarizeRegistrationsForPublic_(registrations),
    spotsTaken: calculateSpotsTaken_(registrations),
    spotsRemaining: calculateSpotsRemaining_(event, registrations)
  };
}

function listRegistrationsForEvent(eventId) {
  requireAdmin_();
  return safeClientArray_(listRegistrationsForEvent_(eventId));
}

function listRegistrationsForEvent_(eventId) {
  return getDataObjects_(getSheetByName_(APP_CONFIG.sheets.registrations)).filter(function(registration) { return String(registration.EventId) === String(eventId); });
}

function createRegistration(eventId, registrationData) {
  const event = getEvent(eventId);
  if (!toBoolean_(event.RegistrationRequired)) throw new Error('Registration is not required for this adventure.');
  if (String(event.Status) !== APP_CONFIG.eventStatuses.published) throw new Error('Registration is not currently open for this adventure.');
  const sheet = getSheetByName_(APP_CONFIG.sheets.registrations);
  const existingRegistrations = listRegistrationsForEvent_(eventId);
  assertNoDuplicateRegistration_(existingRegistrations, registrationData);
  const spotsRemaining = calculateSpotsRemaining_(event, existingRegistrations);
  const requestedSpots = Number(registrationData.adultCount || 0) + (toBoolean_(event.ChildrenAllowed) ? Number(registrationData.childCount || 0) : 0);
  let status = APP_CONFIG.registrationStatuses.confirmed;
  if (event.MaxParticipants && spotsRemaining !== null && requestedSpots > spotsRemaining) {
    if (toBoolean_(event.WaitlistEnabled)) status = APP_CONFIG.registrationStatuses.waitlist;
    else throw new Error('This adventure is full.');
  }
  const paidEvent = toBoolean_(event.PaidEvent);
  const payAtEvent = toBoolean_(event.PayAtEventEnabled);
  const buyOwnTickets = toBoolean_(event.BuyOwnTicketsEnabled);
  let paymentStatus = APP_CONFIG.paymentStatuses.notRequired;
  if (paidEvent && buyOwnTickets) paymentStatus = APP_CONFIG.paymentStatuses.buyOwnTicket;
  else if (paidEvent && payAtEvent) paymentStatus = APP_CONFIG.paymentStatuses.payAtEvent;
  else if (paidEvent) paymentStatus = APP_CONFIG.paymentStatuses.pending;

  const record = {
    RegistrationId: createId_('reg'), EventId: eventId, Status: status,
    Name: normalizeText_(registrationData.name), Email: normalizeEmail_(registrationData.email), Phone: normalizeText_(registrationData.phone),
    AdultCount: Number(registrationData.adultCount || 0), ChildCount: toBoolean_(event.ChildrenAllowed) ? Number(registrationData.childCount || 0) : 0,
    EmergencyContactName: normalizeText_(registrationData.emergencyContactName), EmergencyContactPhone: normalizeText_(registrationData.emergencyContactPhone),
    PaymentStatus: paymentStatus, PaymentMethod: normalizeText_(registrationData.paymentMethod), PaymentNotes: '',
    ShowNameOnAttendeeList: toBoolean_(registrationData.showNameOnAttendeeList),
    AcknowledgementMemberOrganized: toBoolean_(registrationData.acknowledgementMemberOrganized),
    AcknowledgementVoluntary: toBoolean_(registrationData.acknowledgementVoluntary),
    AcknowledgementRespect: toBoolean_(registrationData.acknowledgementRespect),
    AcknowledgementPayment: paidEvent ? registrationAcknowledgementValue_(registrationData, [
      'acknowledgementPayment', 'AcknowledgementPayment', 'ackPayment', 'paymentAcknowledgement'
    ]) : '',
    AcknowledgementRefund: paidEvent ? registrationAcknowledgementValue_(registrationData, [
      'acknowledgementRefund', 'AcknowledgementRefund', 'ackRefund', 'refundAcknowledgement'
    ]) : '',
    Notes: normalizeText_(registrationData.notes), RegisteredAt: now_(), UpdatedAt: now_()
  };
  validateRegistration_(event, record);
  appendObject_(sheet, record);
  sendRegistrationEmails_(event, record);
  return { success: true, status: status, registrationStatus: status, message: status === APP_CONFIG.registrationStatuses.waitlist ? 'You have been added to the waitlist.' : 'Registration submitted successfully.', registration: record };
}


function assertNoDuplicateRegistration_(registrations, registrationData) {
  const email = normalizeEmail_(registrationData.email || '');
  const phone = String(registrationData.phone || '').replace(/\D/g, '');
  const name = normalizeText_(registrationData.name || '').toLowerCase();
  const cancelled = String(APP_CONFIG.registrationStatuses.cancelled || 'Cancelled').toLowerCase();

  const duplicate = (registrations || []).some(function(item) {
    if (String(item.Status || '').toLowerCase() === cancelled) return false;
    const existingEmail = normalizeEmail_(item.Email || '');
    const existingPhone = String(item.Phone || '').replace(/\D/g, '');
    const existingName = normalizeText_(item.Name || '').toLowerCase();
    if (email && existingEmail && email === existingEmail) return true;
    if (phone && existingPhone && phone === existingPhone) return true;
    return name && existingName === name && ((email && email === existingEmail) || (phone && phone === existingPhone));
  });

  if (duplicate) throw new Error('You are already registered for this adventure. Contact the organizer if your registration needs to be changed.');
}

function registrationAcknowledgementValue_(data, keys) {
  data = data || {};
  for (let i = 0; i < keys.length; i++) {
    if (Object.prototype.hasOwnProperty.call(data, keys[i]) && toBoolean_(data[keys[i]])) return true;
  }
  return false;
}

function validateRegistration_(event, registration) {
  if (!registration.Name) throw new Error('Name is required.');
  if (!registration.Email && !registration.Phone) throw new Error('Email or phone is required.');
  if (registration.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.Email)) throw new Error('Enter a valid email address.');
  if (registration.Phone && String(registration.Phone).replace(/\D/g, '').length < 7) throw new Error('Enter a valid phone number.');
  if (Number(registration.AdultCount) < 1) throw new Error('At least one adult is required.');
  if (!toBoolean_(event.ChildrenAllowed) && Number(registration.ChildCount) > 0) throw new Error('Children are not allowed for this adventure.');
  if (!toBoolean_(registration.AcknowledgementMemberOrganized)) throw new Error('Member-organized event acknowledgement is required.');
  if (!toBoolean_(registration.AcknowledgementVoluntary)) throw new Error('Voluntary participation acknowledgement is required.');
  if (!toBoolean_(registration.AcknowledgementRespect)) throw new Error('Courtesy and respect acknowledgement is required.');
  if (toBoolean_(event.PaidEvent)) {
    if (!toBoolean_(registration.AcknowledgementPayment)) throw new Error('Payment acknowledgement is required.');
    if (!toBoolean_(registration.AcknowledgementRefund)) throw new Error('Refund acknowledgement is required.');
  }
}

function calculateSpotsTaken_(registrations) {
  return registrations.filter(function(registration) {
    const status = String(registration.Status || '').toLowerCase();
    return status !== String(APP_CONFIG.registrationStatuses.cancelled).toLowerCase() &&
           status !== String(APP_CONFIG.registrationStatuses.waitlist).toLowerCase();
  }).reduce(function(total, registration) {
    return total + Number(registration.AdultCount || 0) + Number(registration.ChildCount || 0);
  }, 0);
}
function calculateSpotsRemaining_(event, registrations) {
  if (!event.MaxParticipants) return null;
  return Math.max(0, Number(event.MaxParticipants) - calculateSpotsTaken_(registrations));
}

function sendRegistrationEmails_(event, registration) {
  try {
    sendParticipantConfirmationEmail_(event, registration);
    sendOrganizerNotificationEmail_(event, registration);
  } catch (error) {
    Logger.log('Registration email failed: ' + error.message);
  }
}

function sendParticipantConfirmationEmail_(event, registration) {
  if (!registration.Email) return;

  MailApp.sendEmail({
    to: registration.Email,
    subject: 'You are registered: ' + event.Title,
    body: buildParticipantConfirmationBody_(event, registration)
  });
}

function sendOrganizerNotificationEmail_(event, registration) {
  const organizerEmail = normalizeEmail_(event.OrganizerEmail || event.CreatedBy || getCurrentUserEmail_());
  if (!organizerEmail) return;

  MailApp.sendEmail({
    to: organizerEmail,
    subject: 'New registration: ' + event.Title,
    body: buildOrganizerNotificationBody_(event, registration)
  });
}

function buildParticipantConfirmationBody_(event, registration) {
  const lines = [];
  lines.push('Hi ' + registration.Name + ',');
  lines.push('');
  lines.push('Thanks for registering for:');
  lines.push(event.Title);
  lines.push('');
  lines.push('Date/Time: ' + formatEventDateLine_(event));
  lines.push('Location: ' + (event.LocationName || 'To be announced'));
  if (event.Address) lines.push('Address: ' + event.Address);
  if (event.OrganizerName) lines.push('Organizer: ' + event.OrganizerName);
  lines.push('');
  lines.push('Registration status: ' + registration.Status);
  lines.push('Adults: ' + registration.AdultCount);
  if (Number(registration.ChildCount || 0) > 0) lines.push('Children: ' + registration.ChildCount);

  if (toBoolean_(event.PaidEvent)) {
    lines.push('');
    lines.push('Payment status: ' + registration.PaymentStatus);
    lines.push('Payment method: ' + (registration.PaymentMethod || 'Not selected'));
    if (registration.PaymentStatus === APP_CONFIG.paymentStatuses.pending) {
      lines.push('Your reservation is not confirmed until payment has been received.');
    }
  }

  lines.push('');
  lines.push('Important: This is a member-organized Community Connections event and is not facilitated, monitored, or organized by IWP staff.');
  lines.push('');
  lines.push('IWP Community Connections');
  lines.push('Find Your Next Adventure');
  return lines.join('\n');
}

function buildOrganizerNotificationBody_(event, registration) {
  const dashboardUrl = getScriptUrlSafe_();
  const eventUrl = buildEventUrlSafe_(event.EventId);
  const registrationUrl = buildRegistrationUrlSafe_(event.EventId);

  const lines = [];
  lines.push('New registration received for:');
  lines.push(event.Title);
  lines.push('');
  lines.push('Participant');
  lines.push('Name: ' + registration.Name);
  lines.push('Email: ' + registration.Email);
  lines.push('Phone: ' + registration.Phone);
  lines.push('Adults: ' + registration.AdultCount);
  lines.push('Children: ' + registration.ChildCount);
  lines.push('Status: ' + registration.Status);
  lines.push('Payment Status: ' + registration.PaymentStatus);
  lines.push('Payment Method: ' + (registration.PaymentMethod || 'Not selected'));
  lines.push('');
  if (registration.EmergencyContactName || registration.EmergencyContactPhone) {
    lines.push('Emergency Contact');
    lines.push('Name: ' + registration.EmergencyContactName);
    lines.push('Phone: ' + registration.EmergencyContactPhone);
    lines.push('');
  }
  if (registration.Notes) {
    lines.push('Notes:');
    lines.push(registration.Notes);
    lines.push('');
  }
  lines.push('Quick Links');
  lines.push('Dashboard: ' + dashboardUrl);
  lines.push('Adventure Details: ' + eventUrl);
  lines.push('Registration Page: ' + registrationUrl);
  lines.push('');
  lines.push('This message was automatically generated by IWP Community Connections.');
  return lines.join('\n');
}

function formatEventDateLine_(event) {
  const start = [event.StartDate, event.StartTime].filter(Boolean).join(' ');
  const end = [event.EndDate, event.EndTime].filter(Boolean).join(' ');
  if (end) return start + ' through ' + end;
  return start || 'To be announced';
}

function getScriptUrlSafe_() {
  try {
    return getPublicAppUrl_() || APP_CONFIG.launchPageUrl || 'Open the IWP Community Connections app dashboard.';
  } catch (error) {
    return 'Open the IWP Community Connections app dashboard.';
  }
}

function buildEventUrlSafe_(eventId) {
  const base = getScriptUrlSafe_();
  if (base.indexOf('http') !== 0) return base;
  return base + '?event=' + encodeURIComponent(eventId);
}

function buildRegistrationUrlSafe_(eventId) {
  const base = getScriptUrlSafe_();
  if (base.indexOf('http') !== 0) return base;
  return base + '?register=' + encodeURIComponent(eventId);
}

function sendTestEmail() {
  requireAdmin_();
  const email = getCurrentUserEmail_();
  MailApp.sendEmail({
    to: email,
    subject: 'IWP Community Connections Test Email',
    body: 'This is a test email from the IWP Community Connections app.\n\nIf you received this, Apps Script email permissions are working.'
  });
  Logger.log('Test email sent to: ' + email);
}
