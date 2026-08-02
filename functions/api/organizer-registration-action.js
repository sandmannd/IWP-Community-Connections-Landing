export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || body.appUrl || '').trim();
    if (!appUrl || !appUrl.startsWith('https://script.google.com/')) {
      return Response.json({ success: false, error: 'Organizer service is not configured.' }, { status: 500 });
    }
    const upstream = await fetch(appUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'organizerRegistrationActionApi',
        session: body.session || '',
        eventId: body.eventId || '',
        registrationIds: Array.isArray(body.registrationIds) ? body.registrationIds : [],
        registrationAction: body.registrationAction || '',
        changes: body.changes || {}
      }),
      redirect: 'follow'
    });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (_) { throw new Error('The organizer service returned an invalid response.'); }
    return Response.json(result, {
      status: result && result.success ? 200 : 400,
      headers: { 'cache-control': 'no-store' }
    });
  } catch (error) {
    return Response.json({ success: false, error: error && error.message ? error.message : 'Registration action failed.' }, {
      status: 500,
      headers: { 'cache-control': 'no-store' }
    });
  }
}
