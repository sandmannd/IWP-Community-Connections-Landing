/**
 * Admin lifecycle helpers for published adventures.
 */

function reopenEventRegistration(eventId) {
  requireAdmin_();

  const event = getEvent(eventId);

  if (!toBoolean_(event.RegistrationRequired)) {
    throw new Error('This adventure does not use registration.');
  }

  const updated = updateObjectById_(
    getSheetByName_(APP_CONFIG.sheets.events),
    'EventId',
    eventId,
    {
      Status: APP_CONFIG.eventStatuses.published,
      RegistrationLink: buildRegistrationUrl_(eventId),
      UpdatedAt: now_()
    }
  );

  return {
    success: true,
    message: 'Registration reopened.',
    event: updated
  };
}
