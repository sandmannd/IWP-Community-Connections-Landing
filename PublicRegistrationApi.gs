/** Public registration API used by the Cloudflare Pages frontend. */
function getPublicRegistrationDataJsonp_(eventId, callbackName) {
  const callback = String(callbackName || '').replace(/[^\w.$]/g, '');
  if (!callback) throw new Error('A valid callback is required.');
  try {
    const data = getRegistrationPageData(String(eventId || '').trim());
    const payload = { success: true, generatedAt: new Date().toISOString(), data: data };
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload).replace(/<\//g, '<\\/') + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify({
      success: false,
      message: error && error.message ? String(error.message) : 'Registration could not be loaded.'
    }).replace(/<\//g, '<\\/') + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function doPost(e) {
  let jsonBody = {};
  try {
    jsonBody = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (jsonError) {
    jsonBody = {};
  }

  if (String(jsonBody.action || '') === 'publicLandingDataApi') {
    try {
      return ContentService.createTextOutput(JSON.stringify(getLandingPageData()))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success:false, error:error && error.message ? String(error.message) : 'Landing data could not be loaded.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (String(jsonBody.action || '') === 'organizerDashboardApi') {
    try {
      const identity = verifyOrganizerSession_(String(jsonBody.session || ''));
      return ContentService.createTextOutput(JSON.stringify({
        success:true, authorized:true, authenticated:true,
        user:{ email:identity.email, name:identity.name || '', picture:identity.picture || '', role:String(identity.role || '') },
        dashboard:getCachedCommandCenterData_()
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success:false, authorized:false, authenticated:false, error:error && error.message ? String(error.message) : 'Unable to load organizer dashboard.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (String(jsonBody.action || '') === 'organizerEmailDataApi') {
    return ContentService.createTextOutput(JSON.stringify(getOrganizerEmailDataObject_(String(jsonBody.session || ''), String(jsonBody.eventId || ''))))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (String(jsonBody.action || '') === 'organizerSendParticipantEmailApi') {
    try {
      const result = sendOrganizerParticipantEmail_(
        String(jsonBody.session || ''), String(jsonBody.eventId || ''),
        String(jsonBody.subject || ''), String(jsonBody.body || ''),
        String(jsonBody.audience || 'registered'), String(jsonBody.taskLabel || '')
      );
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success:false, error:error && error.message ? String(error.message) : 'Email could not be sent.' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (String(jsonBody.action || '') === 'organizerUploadImageApi') {
    try {
      const imageUrl = uploadOrganizerAdventureImage_(
        String(jsonBody.session || ''),
        String(jsonBody.fileName || ''),
        String(jsonBody.mimeType || ''),
        String(jsonBody.dataUrl || '')
      );
      return ContentService.createTextOutput(JSON.stringify({ success: true, imageUrl: imageUrl }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: error && error.message ? String(error.message) : 'Image upload failed.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  const action = String((e && e.parameter && e.parameter.action) || '').trim();
  if (action === 'organizerSaveAdventureWithImage') {
    const operationId = String((e.parameter && e.parameter.operationId) || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 100);
    let result;
    try {
      const identity = getOrganizerIdentity_('', String((e.parameter && e.parameter.session) || ''));
      const data = decodeOrganizerBuilderData_(String((e.parameter && e.parameter.data) || ''));
      validateOrganizerBuilderData_(data);
      const imageUrl = uploadOrganizerAdventureImage_(
        String((e.parameter && e.parameter.session) || ''),
        String((e.parameter && e.parameter.fileName) || ''),
        String((e.parameter && e.parameter.mimeType) || ''),
        String((e.parameter && e.parameter.dataUrl) || '')
      );
      data.ImageUrl = imageUrl;
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      let saved;
      try {
        saved = saveOrganizerAdventureDraft_(String((e.parameter && e.parameter.eventId) || '').trim(), data, identity);
      } finally {
        lock.releaseLock();
      }
      result = { success: true, eventId: saved.eventId || '', imageUrl: imageUrl };
    } catch (error) {
      result = { success: false, error: error && error.message ? String(error.message) : 'The image or adventure could not be saved.' };
    }
    result.complete = true;
    storeOrganizerSaveStatus_(operationId, result);
    const resultJson = JSON.stringify(result).replace(/</g, '\u003c');
    if (result.success) {
      return HtmlService.createHtmlOutput(
        '<!doctype html><meta charset="utf-8"><title>Adventure saved</title>' +
        '<body style="font-family:Arial,sans-serif;background:#101c31;color:#fff;padding:28px">' +
        '<h2>Adventure saved</h2><p>The image and draft were saved successfully.</p>' +
        '<p>You can return to the Community Connections Builder. This window will be closed by the Builder.</p></body>'
      );
    }
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><title>Adventure save failed</title>' +
      '<body style="font-family:Arial,sans-serif;background:#101c31;color:#fff;padding:28px">' +
      '<h2>Adventure was not saved</h2><p style="white-space:pre-wrap">' +
      String(result.error || 'Unknown error').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</p><p>Leave this window open and return to the Builder to correct the problem.</p></body>'
    );
  }

  if (action === 'organizerUploadImage') {
    const callbackId = String((e.parameter && e.parameter.callbackId) || '').replace(/[^0-9A-Za-z_-]/g, '');
    const requestedCallbackUrl = String((e.parameter && e.parameter.callbackUrl) || '').trim();
    const callbackUrl = /^https:\/\/connections\.redlinecreates\.com\/organizer-upload-complete\.html$/i.test(requestedCallbackUrl)
      ? requestedCallbackUrl
      : 'https://connections.redlinecreates.com/organizer-upload-complete.html';
    let payload;
    try {
      const url = uploadOrganizerAdventureImage_(
        e.parameter.session || '',
        e.parameter.fileName || '',
        e.parameter.mimeType || '',
        e.parameter.dataUrl || ''
      );
      payload = { success: true, imageUrl: url };
    } catch (error) {
      payload = { success: false, error: error && error.message ? String(error.message) : 'Image upload failed.' };
    }
    const destination = callbackUrl +
      '?callbackId=' + encodeURIComponent(callbackId) +
      '&success=' + (payload.success ? '1' : '0') +
      '&imageUrl=' + encodeURIComponent(payload.imageUrl || '') +
      '&error=' + encodeURIComponent(payload.error || '');
    const safeDestination = JSON.stringify(destination).replace(/</g, '\u003c');
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><title>Image upload</title>' +
      '<body style="font-family:Arial,sans-serif;padding:24px"><p>Image upload complete. Returning to Community Connections…</p>' +
      '<script>location.replace(' + safeDestination + ')<\/script>' +
      '<p><a href="' + destination.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">Continue</a></p></body>'
    );
  }

  try {
    const body = jsonBody;
    if (String(body.action || '') !== 'createRegistration') throw new Error('Unsupported request.');
    const response = createRegistration(String(body.eventId || '').trim(), body.registration || {});
    return ContentService.createTextOutput(JSON.stringify({ success: true, response: response }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error && error.message ? String(error.message) : 'Registration could not be submitted.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
