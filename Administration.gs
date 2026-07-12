/** Administration Center data and settings helpers. */

function getAdministrationData() {
  requireAdmin_();
  ensureAdministrationDefaults_();

  const settings = {};
  getDataObjects_(getSheetByName_(APP_CONFIG.sheets.settings)).forEach(function(row) {
    settings[String(row.SettingKey || '')] = String(row.SettingValue || '');
  });

  const categories = getDataObjects_(getSheetByName_(APP_CONFIG.sheets.eventTypes))
    .filter(function(row) { return String(row.Name || '').toLowerCase() !== 'volunteer'; })
    .map(function(row) {
      return {
        id: String(row.EventTypeId || ''),
        name: String(row.Name || ''),
        active: toBoolean_(row.Active)
      };
    });

  const admins = listAdmins().map(function(row) {
    return {
      id: String(row.AdminId || ''),
      name: String(row.Name || ''),
      email: String(row.Email || ''),
      role: String(row.Role || ''),
      active: toBoolean_(row.Active)
    };
  });

  return safeJson_({
    settings: settings,
    categories: categories,
    admins: admins,
    system: {
      appName: APP_CONFIG.appName,
      version: APP_CONFIG.version,
      databaseName: APP_CONFIG.spreadsheetName,
      cloudProjectNumber: '976851999093',
      developer: 'Shane Hendricks'
    }
  });
}

function saveGeneralAdministrationSettings(payload) {
  requireAdmin_();
  return saveAdministrationSettings_([
    'organizationName', 'supportEmail', 'websiteUrl', 'facebookGroupUrl',
    'phoneNumber', 'footerText', 'welcomeMessage'
  ], payload);
}

function saveBrandingAdministrationSettings(payload) {
  requireAdmin_();
  payload = payload || {};
  validateHexColor_(payload.primaryColor, 'Primary color');
  validateHexColor_(payload.accentColor, 'Accent color');
  return saveAdministrationSettings_([
    'primaryColor', 'accentColor', 'defaultEventImage', 'logoUrl', 'bannerUrl'
  ], payload);
}

function saveRegistrationAdministrationSettings(payload) {
  requireAdmin_();
  payload = payload || {};
  const capacity = Math.max(1, parseInt(payload.defaultCapacity, 10) || 1);
  const deadlineDays = Math.max(0, parseInt(payload.registrationDeadlineDays, 10) || 0);
  return saveAdministrationSettings_([
    'defaultCapacity', 'registrationDeadlineDays', 'waitlistEnabled',
    'childrenAllowed', 'selfCancelEnabled', 'cancellationPolicy', 'refundPolicy'
  ], {
    defaultCapacity: capacity,
    registrationDeadlineDays: deadlineDays,
    waitlistEnabled: toBoolean_(payload.waitlistEnabled),
    childrenAllowed: toBoolean_(payload.childrenAllowed),
    selfCancelEnabled: toBoolean_(payload.selfCancelEnabled),
    cancellationPolicy: normalizeText_(payload.cancellationPolicy),
    refundPolicy: normalizeText_(payload.refundPolicy)
  });
}

function savePaymentAdministrationSettings(payload) {
  requireAdmin_();
  payload = payload || {};
  return saveAdministrationSettings_([
    'paymentCash', 'paymentVenmo', 'paymentCashApp', 'paymentPayPal',
    'paymentAtEvent', 'paymentBuyOwnTicket', 'paymentInstructions'
  ], {
    paymentCash: toBoolean_(payload.paymentCash),
    paymentVenmo: toBoolean_(payload.paymentVenmo),
    paymentCashApp: toBoolean_(payload.paymentCashApp),
    paymentPayPal: toBoolean_(payload.paymentPayPal),
    paymentAtEvent: toBoolean_(payload.paymentAtEvent),
    paymentBuyOwnTicket: toBoolean_(payload.paymentBuyOwnTicket),
    paymentInstructions: normalizeText_(payload.paymentInstructions)
  });
}

function saveCommunicationsAdministrationSettings(payload) {
  requireAdmin_();
  payload = payload || {};
  const reminderHours = Math.max(1, parseInt(payload.reminderHours, 10) || 24);
  const thankYouHours = Math.max(1, parseInt(payload.thankYouHours, 10) || 24);
  return saveAdministrationSettings_([
    'emailSenderName', 'replyToEmail', 'reminderHours', 'thankYouHours',
    'emailSignature', 'registrationTemplate', 'reminderTemplate', 'thankYouTemplate'
  ], {
    emailSenderName: normalizeText_(payload.emailSenderName),
    replyToEmail: normalizeText_(payload.replyToEmail),
    reminderHours: reminderHours,
    thankYouHours: thankYouHours,
    emailSignature: normalizeText_(payload.emailSignature),
    registrationTemplate: normalizeText_(payload.registrationTemplate),
    reminderTemplate: normalizeText_(payload.reminderTemplate),
    thankYouTemplate: normalizeText_(payload.thankYouTemplate)
  });
}

function saveAdministrationSettings_(allowedKeys, payload) {
  payload = payload || {};
  allowedKeys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      setSettingValue_(key, serializeAdministrationSetting_(payload[key]));
    }
  });
  return getAdministrationData();
}

function serializeAdministrationSetting_(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return normalizeText_(value);
}

function validateHexColor_(value, label) {
  const color = normalizeText_(value);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error((label || 'Color') + ' must use a six-digit hex value, such as #38bdf8.');
  }
}

function saveAdministrationCategory(category) {
  requireAdmin_();
  category = category || {};
  const name = normalizeText_(category.name);
  if (!name) throw new Error('Category name is required.');
  if (name.toLowerCase() === 'volunteer') throw new Error('Volunteer is not an available adventure category.');

  const sheet = getSheetByName_(APP_CONFIG.sheets.eventTypes);
  const id = normalizeText_(category.id);
  if (id) {
    updateObjectById_(sheet, 'EventTypeId', id, {
      Name: name,
      Active: category.active !== false,
      UpdatedAt: now_()
    });
  } else {
    appendObject_(sheet, {
      EventTypeId: createId_('type'),
      Name: name,
      Active: true,
      CreatedAt: now_(),
      UpdatedAt: now_()
    });
  }
  return getAdministrationData();
}

function setAdministrationCategoryActive(categoryId, active) {
  requireAdmin_();
  updateObjectById_(getSheetByName_(APP_CONFIG.sheets.eventTypes), 'EventTypeId', categoryId, {
    Active: toBoolean_(active),
    UpdatedAt: now_()
  });
  return getAdministrationData();
}

function ensureAdministrationDefaults_() {
  const defaults = {
    organizationName: 'Invisible Wounds Project',
    supportEmail: 'sandmannd@gmail.com',
    websiteUrl: '',
    facebookGroupUrl: 'https://www.facebook.com/groups/1000568346273790/?sorting_setting=CHRONOLOGICAL',
    phoneNumber: '855-435-7497',
    footerText: 'Built with love for the Invisible Wounds Project community.',
    welcomeMessage: 'Building connections. Strengthening lives.',
    primaryColor: '#38bdf8',
    accentColor: '#22c55e',
    defaultEventImage: '',
    logoUrl: '',
    bannerUrl: '',
    defaultCapacity: '20',
    registrationDeadlineDays: '1',
    waitlistEnabled: 'true',
    childrenAllowed: 'false',
    selfCancelEnabled: 'false',
    cancellationPolicy: 'Please contact the organizer as soon as possible if you can no longer attend.',
    refundPolicy: 'Refunds are handled by the event organizer and may depend on nonrefundable reservations or ticket purchases.',
    paymentCash: 'true',
    paymentVenmo: 'true',
    paymentCashApp: 'true',
    paymentPayPal: 'false',
    paymentAtEvent: 'true',
    paymentBuyOwnTicket: 'true',
    paymentInstructions: 'Your reservation is not confirmed until any required payment has been received.',
    emailSenderName: 'IWP Community Connections',
    replyToEmail: 'sandmannd@gmail.com',
    reminderHours: '24',
    thankYouHours: '24',
    emailSignature: 'IWP Community Connections\nYou Are Not Alone.',
    registrationTemplate: 'Hi {{FirstName}},\n\nYou are registered for {{AdventureTitle}} on {{AdventureDate}}.\n\nLocation: {{Location}}\n\nWe look forward to seeing you!',
    reminderTemplate: 'Hi {{FirstName}},\n\nThis is a reminder that {{AdventureTitle}} is coming up on {{AdventureDate}} at {{AdventureTime}}.\n\nLocation: {{Location}}',
    thankYouTemplate: 'Hi {{FirstName}},\n\nThank you for joining us for {{AdventureTitle}}. We hope you had a great time connecting with the community.'
  };
  Object.keys(defaults).forEach(function(key) {
    if (getSettingValue_(key) === '') setSettingValue_(key, defaults[key]);
  });
}

function getSettingValue_(key) {
  const rows = getDataObjects_(getSheetByName_(APP_CONFIG.sheets.settings));
  const match = rows.find(function(row) { return String(row.SettingKey || '') === String(key); });
  return match ? String(match.SettingValue || '') : '';
}

function setSettingValue_(key, value) {
  const sheet = getSheetByName_(APP_CONFIG.sheets.settings);
  const rows = getDataObjects_(sheet);
  const match = rows.find(function(row) { return String(row.SettingKey || '') === String(key); });
  if (match) {
    updateObjectById_(sheet, 'SettingId', match.SettingId, {
      SettingValue: value,
      UpdatedAt: now_()
    });
  } else {
    appendObject_(sheet, {
      SettingId: createId_('setting'),
      SettingKey: key,
      SettingValue: value,
      CreatedAt: now_(),
      UpdatedAt: now_()
    });
  }
}
