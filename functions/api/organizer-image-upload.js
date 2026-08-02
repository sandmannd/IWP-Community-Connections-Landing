export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || body.appUrl || '').trim();
    if (!appUrl || !appUrl.startsWith('https://script.google.com/')) {
      return Response.json({ success: false, error: 'Image upload service is not configured.' }, { status: 500 });
    }
    const upstream = await fetch(appUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'organizerUploadImageApi',
        session: body.session || '',
        fileName: body.fileName || 'adventure-image.jpg',
        mimeType: body.mimeType || 'image/jpeg',
        dataUrl: body.dataUrl || ''
      }),
      redirect: 'follow'
    });
    const text = await upstream.text();
    let result;
    try { result = JSON.parse(text); }
    catch (_) { throw new Error('The image service returned an invalid response.'); }
    return Response.json(result, {
      status: result.success ? 200 : 400,
      headers: { 'cache-control': 'no-store' }
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error && error.message ? error.message : 'The image could not be uploaded.'
    }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}
