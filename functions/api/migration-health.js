/**
 * M7.1 migration-only endpoint.
 * It is intentionally isolated from the production API routes. Nothing in the
 * live site calls this endpoint yet.
 */
export async function onRequestGet(context) {
  const db = context.env.COMMUNITY_DB;
  if (!db) {
    return Response.json({
      success: true,
      migration: 'M7.1',
      d1Configured: false,
      productionCutover: false,
      message: 'D1 binding COMMUNITY_DB has not been configured yet.'
    }, { headers: { 'cache-control': 'no-store' } });
  }

  try {
    const row = await db.prepare(
      "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 1"
    ).first();

    const counts = {};
    for (const table of ['events', 'registrations', 'admins', 'event_types', 'memories', 'adventure_resources']) {
      const result = await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
      counts[table] = Number(result && result.count || 0);
    }

    return Response.json({
      success: true,
      migration: 'M7.1',
      d1Configured: true,
      productionCutover: false,
      schemaVersion: row ? row.version : null,
      schemaAppliedAt: row ? row.applied_at : null,
      counts
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({
      success: false,
      migration: 'M7.1',
      d1Configured: true,
      productionCutover: false,
      error: error && error.message ? error.message : 'D1 health check failed.'
    }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}
