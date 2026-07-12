function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (String(params.api || '').toLowerCase() === 'landing') {
    return getLandingPageJsonp_(params.callback || 'iwpLandingDataCallback');
  }
  const forcePublic = String(params.public || '').toLowerCase() === '1' ||
    String(params.public || '').toLowerCase() === 'true';

  const template = HtmlService.createTemplateFromFile('Index');
  template.appConfig = APP_CONFIG;
  template.user = getCurrentUser(forcePublic);
  template.route = getRoute_(e);
  return template.evaluate()
    .setTitle(APP_CONFIG.appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getRoute_(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.register) return { page: 'register', eventId: params.register };
  if (params.checkin) return { page: 'checkin', eventId: params.checkin };
  if (params.event) return { page: 'event', eventId: params.event };
  return { page: 'home', eventId: '' };
}
