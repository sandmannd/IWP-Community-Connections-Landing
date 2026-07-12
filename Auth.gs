/** Admin authentication and role helpers. */

function getCurrentUser(forcePublic) {
  if (forcePublic === true) {
    return {
      email: '',
      isAdmin: false,
      role: APP_CONFIG.roles.viewer,
      isPublicPreview: true
    };
  }

  const email = getCurrentUserEmail_();
  const role = getUserRole_(email);
  return {
    email: email,
    isAdmin: role === APP_CONFIG.roles.owner || role === APP_CONFIG.roles.admin,
    role: role,
    isPublicPreview: false
  };
}

function isCurrentUserAdmin() {
  return getCurrentUser(false).isAdmin;
}

function isAdminEmail_(email) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) return false;
  const sheet = getSheetByName_(APP_CONFIG.sheets.admins);
  return getDataObjects_(sheet).some(function(admin) {
    return normalizeEmail_(admin.Email) === normalizedEmail && toBoolean_(admin.Active);
  });
}

function getUserRole_(email) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) return APP_CONFIG.roles.viewer;
  const sheet = getSheetByName_(APP_CONFIG.sheets.admins);
  const match = getDataObjects_(sheet).find(function(admin) {
    return normalizeEmail_(admin.Email) === normalizedEmail && toBoolean_(admin.Active);
  });
  return match ? String(match.Role || APP_CONFIG.roles.admin) : APP_CONFIG.roles.viewer;
}

function requireAdmin_() {
  if (!isCurrentUserAdmin()) {
    throw new Error('You do not have permission to perform this action.');
  }
  return true;
}

function listAdmins() {
  requireAdmin_();
  return getDataObjects_(getSheetByName_(APP_CONFIG.sheets.admins));
}

function addAdmin(admin) {
  requireAdmin_();
  const sheet = getSheetByName_(APP_CONFIG.sheets.admins);
  const email = normalizeEmail_(admin.email);
  if (!email) throw new Error('Admin email is required.');
  if (isAdminEmail_(email)) throw new Error('That email is already an active admin.');
  return appendObject_(sheet, {
    AdminId: createId_('admin'),
    Name: normalizeText_(admin.name),
    Email: email,
    Role: admin.role || APP_CONFIG.roles.admin,
    Active: true,
    CreatedAt: now_(),
    UpdatedAt: now_()
  });
}

function deactivateAdmin(adminId) {
  requireAdmin_();
  return updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.admins),
    'AdminId',
    adminId,
    { Active: false, UpdatedAt: now_() }
  );
}
