/** Shared utility functions. */

function createId_(prefix) {
  const cleanPrefix = prefix || 'id';
  const random = Utilities.getUuid().replace(/-/g, '').substring(0, 12);
  return cleanPrefix + '_' + random;
}

function now_() {
  return new Date();
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeText_(value) {
  return String(value || '').trim();
}

function toBoolean_(value) {
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value || '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'checked';
}

function getCurrentUserEmail_() {
  // ActiveUser identifies the person actually opening the web app.
  // On the public deployment this is intentionally blank, so visitors are viewers.
  // On the admin deployment (execute as user accessing the app), it contains the signed-in email.
  return normalizeEmail_(Session.getActiveUser().getEmail());
}

const PUBLIC_WEB_APP_URL_PROPERTY_ = 'PUBLIC_WEB_APP_URL';
const ADMIN_WEB_APP_URL_PROPERTY_ = 'ADMIN_WEB_APP_URL';

function normalizeWebAppUrl_(value) {
  const url = String(value || '').trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/i.test(url)) {
    throw new Error('Enter the complete Apps Script web app URL ending in /exec.');
  }
  return url;
}

function getScriptUrl_() {
  return String(ScriptApp.getService().getUrl() || '').replace(/\/+$/, '');
}

function getPublicAppUrl_() {
  const configured = PropertiesService.getScriptProperties().getProperty(PUBLIC_WEB_APP_URL_PROPERTY_);
  return String(configured || getScriptUrl_()).replace(/\/+$/, '');
}

function getAdminAppUrl_() {
  const configured = PropertiesService.getScriptProperties().getProperty(ADMIN_WEB_APP_URL_PROPERTY_);
  return String(configured || getScriptUrl_()).replace(/\/+$/, '');
}

function buildEventUrl_(eventId) {
  return getPublicAppUrl_() + '?event=' + encodeURIComponent(eventId);
}

function buildRegistrationUrl_(eventId) {
  return getPublicAppUrl_() + '?register=' + encodeURIComponent(eventId);
}

function getDeploymentStatus() {
  requireAdmin_();
  const publicUrl = getPublicAppUrl_();
  const adminUrl = getAdminAppUrl_();
  return {
    publicUrl: publicUrl,
    adminUrl: adminUrl,
    launchPageUrl: APP_CONFIG.launchPageUrl,
    currentDeploymentUrl: getScriptUrl_(),
    publicUrlConfigured: Boolean(PropertiesService.getScriptProperties().getProperty(PUBLIC_WEB_APP_URL_PROPERTY_)),
    adminUrlConfigured: Boolean(PropertiesService.getScriptProperties().getProperty(ADMIN_WEB_APP_URL_PROPERTY_))
  };
}

function setDeploymentUrls(publicUrl, adminUrl) {
  requireAdmin_();
  const normalizedPublicUrl = normalizeWebAppUrl_(publicUrl);
  const normalizedAdminUrl = normalizeWebAppUrl_(adminUrl);
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PUBLIC_WEB_APP_URL_PROPERTY_, normalizedPublicUrl);
  props.setProperty(ADMIN_WEB_APP_URL_PROPERTY_, normalizedAdminUrl);
  return getDeploymentStatus();
}

function getHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return {};
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};
  headers.forEach(function(header, index) { map[header] = index; });
  return map;
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) { obj[header] = row[index]; });
  return obj;
}

function objectToRow_(headers, obj) {
  return headers.map(function(header) {
    return obj[header] !== undefined ? obj[header] : '';
  });
}

function getDataObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(function(row) { return rowToObject_(headers, row); });
}

function findRowById_(sheet, idColumnName, idValue) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return -1;
  const headers = values[0];
  const idIndex = headers.indexOf(idColumnName);
  if (idIndex === -1) throw new Error('Missing ID column: ' + idColumnName);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(idValue)) return i + 1;
  }
  return -1;
}

function appendObject_(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(objectToRow_(headers, obj));
  return obj;
}

function updateObjectById_(sheet, idColumnName, idValue, updates) {
  const rowNumber = findRowById_(sheet, idColumnName, idValue);
  if (rowNumber === -1) throw new Error('Record not found: ' + idValue);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const currentRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const currentObj = rowToObject_(headers, currentRow);
  const merged = Object.assign({}, currentObj, updates);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([objectToRow_(headers, merged)]);
  return merged;
}

function deleteRowById_(sheet, idColumnName, idValue) {
  const rowNumber = findRowById_(sheet, idColumnName, idValue);
  if (rowNumber === -1) throw new Error('Record not found: ' + idValue);
  sheet.deleteRow(rowNumber);
  return true;
}

function safeJson_(value) {
  return JSON.parse(JSON.stringify(value || {}));
}


/**
 * One-click production deployment configuration for the established
 * Community Connections web app deployment.
 */
function setProductionDeploymentUrls() {
  return setDeploymentUrls(
    'https://script.google.com/macros/s/AKfycbxPNqswpRLvj0LZ0ZaVw6DTSpTcZIDt0S0zWFJgOES7g864n734dDF2UpGMwdpsEPGK4Q/exec',
    'https://script.google.com/macros/s/AKfycbxPNqswpRLvj0LZ0ZaVw6DTSpTcZIDt0S0zWFJgOES7g864n734dDF2UpGMwdpsEPGK4Q/exec'
  );
}

function logDeploymentStatus() {
  const status = getDeploymentStatus();
  console.log(JSON.stringify(status, null, 2));
  return status;
}
