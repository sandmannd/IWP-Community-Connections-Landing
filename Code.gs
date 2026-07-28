function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  const apiRoute = String(params.api || '').toLowerCase();
  if (apiRoute === 'landing') {
    return getLandingPageJsonp_(params.callback || 'iwpLandingDataCallback');
  }
  if (apiRoute === 'public-adventure') {
    return getPublicAdventureJsonp_(params.eventId || params.event || '', params.callback || 'iwpPublicAdventureCallback');
  }
  if (apiRoute === 'registration-data') {
    return getPublicRegistrationDataJsonp_(params.eventId || params.event || '', params.callback || 'iwpRegistrationDataCallback');
  }
  if (apiRoute === 'organizer-session') {
    return createOrganizerSessionJsonp_(params.callback || 'iwpOrganizerSessionCallback', params.credential || params.idToken || '');
  }
  if (apiRoute === 'organizer-signout') {
    return revokeOrganizerSessionJsonp_(params.callback || 'iwpOrganizerSignOutCallback', params.session || params.sessionToken || '');
  }
  if (apiRoute === 'organizer-dashboard') {
    return getOrganizerDashboardJsonp_(params.callback || 'iwpOrganizerDashboardCallback', params.credential || params.idToken || '', params.session || params.sessionToken || '');
  }
  if (apiRoute === 'organizer-adventures') {
    return getOrganizerAdventuresJsonp_(params.callback || 'iwpOrganizerAdventuresCallback', params.credential || params.idToken || '', params.session || params.sessionToken || '');
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
