const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

async function scalar(db, sql) {
  const row = await db.prepare(sql).first();
  return Number(row && Object.values(row)[0] || 0);
}

export async function onRequestGet(context) {
  const db = context.env.COMMUNITY_DB;
  if (!db) {
    return json({ success: false, migration: 'M7.2', d1Configured: false, productionCutover: false, error: 'COMMUNITY_DB binding is not configured.' }, 503);
  }

  try {
    const counts = {};
    const tables = [
      'events', 'registrations', 'admins', 'settings', 'event_types', 'memories',
      'adventure_resources', 'resource_templates', 'logs', 'migration_imports'
    ];
    for (const table of tables) {
      counts[table] = await scalar(db, `SELECT COUNT(*) AS count FROM ${table}`);
    }

    const integrity = {
      registrationsMissingEvent: await scalar(db, 'SELECT COUNT(*) AS count FROM registrations r LEFT JOIN events e ON e.event_id = r.event_id WHERE e.event_id IS NULL'),
      memoriesMissingEvent: await scalar(db, 'SELECT COUNT(*) AS count FROM memories m LEFT JOIN events e ON e.event_id = m.event_id WHERE e.event_id IS NULL'),
      resourcesMissingEvent: await scalar(db, 'SELECT COUNT(*) AS count FROM adventure_resources r LEFT JOIN events e ON e.event_id = r.event_id WHERE e.event_id IS NULL')
    };

    const packageRow = await db.prepare(
      "SELECT source_row_key AS packageId, source_updated_at AS exportedAt, checksum FROM migration_imports WHERE source_name = 'M7.2_PACKAGE' ORDER BY imported_at DESC LIMIT 1"
    ).first();

    return json({
      success: true,
      migration: 'M7.2',
      d1Configured: true,
      productionCutover: false,
      package: packageRow || null,
      counts,
      integrity,
      integrityOk: Object.values(integrity).every(value => value === 0)
    });
  } catch (error) {
    return json({
      success: false,
      migration: 'M7.2',
      d1Configured: true,
      productionCutover: false,
      error: String(error && error.message || error)
    }, 500);
  }
}
