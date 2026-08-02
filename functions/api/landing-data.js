export async function onRequestGet(context) {
  try {
    const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || '').trim();
    if (!appUrl || !appUrl.startsWith('https://script.google.com/')) {
      return Response.json({ success: false, error: 'Landing data service is not configured.' }, { status: 500 });
    }
    const upstream = await fetch(appUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'landingDataApi' }),
      redirect: 'follow'
    });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (_) { throw new Error('The landing data service returned an invalid response.'); }
    return Response.json(result, {
      status: result && result.success ? 200 : 502,
      headers: { 'cache-control': 'public, max-age=60, s-maxage=60' }
    });
  } catch (error) {
    return Response.json({ success: false, error: error && error.message ? error.message : 'Landing data could not be loaded.' }, {
      status: 500,
      headers: { 'cache-control': 'no-store' }
    });
  }
}
