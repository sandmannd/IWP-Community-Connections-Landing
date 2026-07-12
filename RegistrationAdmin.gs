/**
 * Admin registration viewer helpers.
 * Kept separate so registration submission logic is not overwritten.
 */

function listEventRegistrationsForAdmin(eventId) {
  requireAdmin_();

  const event = getEvent(eventId);
  const registrations = listRegistrationsForEvent(eventId).map(function (registration) {
    return {
      RegistrationId: registration.RegistrationId || '',
      EventId: registration.EventId || '',
      Status: registration.Status || '',
      Name: registration.Name || '',
      Email: registration.Email || '',
      Phone: registration.Phone || '',
      AdultCount: readRegistrationNumber_(registration, [
        'AdultCount',
        'Adult Count',
        'Adults'
      ]),
      AdultGuestNames: readRegistrationText_(registration, [
        'AdultGuestNames',
        'Adult Guest Names',
        'AdditionalAdultNames',
        'Additional Adult Names'
      ]),
      ChildCount: readRegistrationNumber_(registration, [
        'ChildCount',
        'Child Count',
        'Children'
      ]),
      ChildNames: readRegistrationText_(registration, [
        'ChildNames',
        'Child Names'
      ]),
      EmergencyContactName: registration.EmergencyContactName || '',
      EmergencyContactPhone: registration.EmergencyContactPhone || '',
      PaymentStatus: registration.PaymentStatus || '',
      PaymentMethod: registration.PaymentMethod || '',
      CheckedIn: String(registration.Status || '').toLowerCase() === String(APP_CONFIG.registrationStatuses.checkedIn || 'Checked In').toLowerCase(),
      Notes: registration.Notes || '',
      RegisteredAt: serializeRegistrationValue_(registration.RegisteredAt),
      UpdatedAt: serializeRegistrationValue_(registration.UpdatedAt)
    };
  });

  const totalPeople = registrations.reduce(function (total, registration) {
    return total +
      Number(registration.AdultCount || 0) +
      Number(registration.ChildCount || 0);
  }, 0);

  return {
    event: makeBrowserSafe_(event),
    registrations: registrations,
    totalRegistrations: registrations.length,
    totalPeople: totalPeople
  };
}

function readRegistrationNumber_(record, possibleKeys) {
  for (let i = 0; i < possibleKeys.length; i++) {
    const value = record[possibleKeys[i]];

    if (value !== undefined && value !== null && value !== '') {
      const numberValue = Number(value);
      return isNaN(numberValue) ? 0 : numberValue;
    }
  }

  return 0;
}

function readRegistrationText_(record, possibleKeys) {
  for (let i = 0; i < possibleKeys.length; i++) {
    const value = record[possibleKeys[i]];

    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return '';
}

function serializeRegistrationValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm:ss"
    );
  }

  return value === undefined || value === null ? '' : value;
}

function makeBrowserSafe_(value) {
  return JSON.parse(JSON.stringify(value || {}));
}


function updateRegistrationPaymentStatus(registrationId, paymentStatus) {
  requireAdmin_();
  const allowed = [
    APP_CONFIG.paymentStatuses.notRequired,
    APP_CONFIG.paymentStatuses.pending,
    APP_CONFIG.paymentStatuses.paid,
    APP_CONFIG.paymentStatuses.payAtEvent,
    APP_CONFIG.paymentStatuses.buyOwnTicket
  ];
  if (allowed.indexOf(paymentStatus) === -1) throw new Error('Invalid payment status.');
  const sheet = getSheetByName_(APP_CONFIG.sheets.registrations);
  const updated = updateObjectById_(sheet, 'RegistrationId', registrationId, {
    PaymentStatus: paymentStatus,
    UpdatedAt: now_()
  });
  return { success: true, registration: safeJson_(updated) };
}

function setRegistrationCheckedIn(registrationId, checkedIn) {
  requireAdmin_();
  const sheet = getSheetByName_(APP_CONFIG.sheets.registrations);
  const updated = updateObjectById_(sheet, 'RegistrationId', registrationId, {
    Status: checkedIn ? APP_CONFIG.registrationStatuses.checkedIn : APP_CONFIG.registrationStatuses.confirmed,
    UpdatedAt: now_()
  });
  return { success: true, registration: safeJson_(updated) };
}

/**
 * Update a registration status from the organizer registration manager.
 */
function updateRegistrationStatus(registrationId, status) {
  requireAdmin_();

  const allowed = [
    APP_CONFIG.registrationStatuses.pending,
    APP_CONFIG.registrationStatuses.confirmed,
    APP_CONFIG.registrationStatuses.waitlist,
    APP_CONFIG.registrationStatuses.cancelled,
    APP_CONFIG.registrationStatuses.checkedIn
  ];

  if (allowed.indexOf(status) === -1) {
    throw new Error('Invalid registration status.');
  }

  const sheet = getSheetByName_(APP_CONFIG.sheets.registrations);
  const updated = updateObjectById_(sheet, 'RegistrationId', registrationId, {
    Status: status,
    UpdatedAt: now_()
  });

  return { success: true, registration: safeJson_(updated) };
}

/**
 * Move a waitlisted registration into the event when enough room is available.
 */
function promoteWaitlistRegistration(registrationId) {
  requireAdmin_();

  const registrationsSheet = getSheetByName_(APP_CONFIG.sheets.registrations);
  const registrations = getDataObjects_(registrationsSheet);
  const registration = registrations.find(function(item) {
    return String(item.RegistrationId) === String(registrationId);
  });

  if (!registration) throw new Error('Registration not found.');
  if (String(registration.Status) !== APP_CONFIG.registrationStatuses.waitlist) {
    throw new Error('Only waitlisted registrations can be promoted.');
  }

  const event = getEvent(registration.EventId);
  const eventRegistrations = registrations.filter(function(item) {
    return String(item.EventId) === String(registration.EventId);
  });

  const requestedSpots = Number(registration.AdultCount || 0) + Number(registration.ChildCount || 0);
  const activeRegistrations = eventRegistrations.filter(function(item) {
    const itemStatus = String(item.Status || '');
    return itemStatus !== APP_CONFIG.registrationStatuses.cancelled &&
      itemStatus !== APP_CONFIG.registrationStatuses.waitlist &&
      String(item.RegistrationId) !== String(registrationId);
  });
  const spotsRemaining = calculateSpotsRemaining_(event, activeRegistrations);

  if (spotsRemaining !== null && requestedSpots > spotsRemaining) {
    throw new Error('There are only ' + spotsRemaining + ' spot(s) available. This registration needs ' + requestedSpots + '.');
  }

  const updated = updateObjectById_(registrationsSheet, 'RegistrationId', registrationId, {
    Status: APP_CONFIG.registrationStatuses.confirmed,
    UpdatedAt: now_()
  });

  return { success: true, registration: safeJson_(updated) };
}
