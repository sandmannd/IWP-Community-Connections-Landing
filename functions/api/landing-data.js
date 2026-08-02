export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/landing-data-cache-v2', context.request.url), { method:'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || '').trim();
    if (!appUrl) throw new Error('Landing service is not configured.');
    const upstream = await fetch(appUrl, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'publicLandingDataApi'}), redirect:'follow' });
    const raw = await upstream.text();
    const result = JSON.parse(raw);
    const response = Response.json(result, { status:result.success?200:500, headers:{'cache-control':'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'} });
    if (result.success) context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return Response.json({success:false,error:error&&error.message?error.message:'Landing data could not be loaded.'},{status:500,headers:{'cache-control':'no-store'}});
  }
}
