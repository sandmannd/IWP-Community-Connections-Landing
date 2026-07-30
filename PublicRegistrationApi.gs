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
  const action = String((e && e.parameter && e.parameter.action) || '').trim();
  if (action === 'organizerUploadImage') {
    const callbackId = String((e.parameter && e.parameter.callbackId) || '').replace(/[^0-9A-Za-z_-]/g, '');
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
    const safePayload = JSON.stringify(payload).replace(/</g, '\u003c');
    return HtmlService.createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><script>try{parent.postMessage({type:"iwpOrganizerImageUploadComplete",callbackId:' +
      JSON.stringify(callbackId) + ',payload:' + safePayload + '},"*")}catch(e){}<\/script>'
    );
  }

  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
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
