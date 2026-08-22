export async function onRequestGet(context) {
  const env = context && context.env ? context.env : {};
  const hasD1 = !!env.COMMUNITY_DB;
  const hasR2 = !!env.ADVENTURE_IMAGES;
  let r2Probe = null;
  let r2Error = '';

  if (hasR2) {
    try {
      const result = await env.ADVENTURE_IMAGES.list({ limit: 1 });
      r2Probe = {
        ok: true,
        objectCountReturned: Array.isArray(result.objects) ? result.objects.length : 0,
        truncated: !!result.truncated
      };
    } catch (error) {
      r2Probe = { ok: false };
      r2Error = String(error && error.message ? error.message : error || 'R2 probe failed');
    }
  }

  return Response.json({
    success: hasD1 && hasR2 && !!(r2Probe && r2Probe.ok),
    migration: 'M7.8',
    storageCheck: 'R2-finalization',
    d1Configured: hasD1,
    r2Configured: hasR2,
    r2Probe,
    r2Error
  }, { status: hasR2 ? 200 : 503 });
}
