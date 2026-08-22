-- REVIEW BEFORE RUNNING. Removes only the State Fair test registrations created during M7 testing on Aug 22, 2026.
SELECT registration_id,event_id,name,email,status,registered_at FROM registrations
WHERE event_id='event_7f993d30dc58'
  AND registered_at >= '2026-08-22T00:00:00.000Z'
  AND (name IN ('Shane Hendricks','Chuck Lowry') OR email IN ('sandmannd@gmail.com','hendrickshg@gmail.com'));

DELETE FROM registrations
WHERE event_id='event_7f993d30dc58'
  AND registered_at >= '2026-08-22T00:00:00.000Z'
  AND (name IN ('Shane Hendricks','Chuck Lowry') OR email IN ('sandmannd@gmail.com','hendrickshg@gmail.com'));
