export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const appUrl = (context.env.IWP_APPS_SCRIPT_URL || body.appUrl || '').trim();
    if (!appUrl || !appUrl.startsWith('https://script.google.com/')) {
      return Response.json({ success: false, message: 'Registration service is not configured.' }, { status: 500 });
    }
    const upstream = await fetch(appUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'createRegistration', eventId: body.eventId, registration: body.registration }),
      redirect: 'follow'
    });
    const text = await upstream.text();
    let result;
    try { result = JSON.parse(text); }
    catch (_) { throw new Error('The registration service returned an invalid response.'); }
    return Response.json(result, { status: result.success ? 200 : 400, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ success: false, message: error && error.message ? error.message : 'Registration could not be submitted.' }, { status: 500 });
  }
}
