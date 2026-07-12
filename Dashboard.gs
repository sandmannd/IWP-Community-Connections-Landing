/** Organizer Command Center data. */

function getCommandCenterData() {
  requireAdmin_();

  const events = getEventObjects_(getSheetByName_(APP_CONFIG.sheets.events));
  const registrations = getDataObjects_(getSheetByName_(APP_CONFIG.sheets.registrations));
  const now = new Date();
  const todayKey = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const weekEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const weekEndKey = Utilities.formatDate(weekEnd, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const activeEvents = events.filter(function(event) {
    const status = String(event.Status || '').trim();
    const startDate = dashboardDateKey_(event.StartDate);
    return startDate >= todayKey &&
      status !== APP_CONFIG.eventStatuses.cancelled &&
      status !== APP_CONFIG.eventStatuses.complete &&
      status !== APP_CONFIG.eventStatuses.archived;
  }).sort(function(a, b) {
    return dashboardDateKey_(a.StartDate).localeCompare(dashboardDateKey_(b.StartDate)) ||
      String(a.StartTime || '').localeCompare(String(b.StartTime || ''));
  });

  const activeIds = {};
  activeEvents.forEach(function(event) {
    activeIds[String(event.EventId)] = true;
  });

  const activeRegistrations = registrations.filter(function(registration) {
    return activeIds[String(registration.EventId)] &&
      String(registration.Status || '') !== APP_CONFIG.registrationStatuses.cancelled;
  });

  const registrationsByEvent = {};
  activeRegistrations.forEach(function(registration) {
    const id = String(registration.EventId || '');
    if (!registrationsByEvent[id]) registrationsByEvent[id] = [];
    registrationsByEvent[id].push(registration);
  });

  const totalPeople = activeRegistrations.reduce(function(total, registration) {
    return total + dashboardPeopleCount_(registration);
  }, 0);

  const pendingPayments = activeRegistrations.filter(function(registration) {
    return String(registration.PaymentStatus || '') === APP_CONFIG.paymentStatuses.pending;
  });

  const paymentEventIds = {};
  pendingPayments.forEach(function(registration) {
    paymentEventIds[String(registration.EventId || '')] = true;
  });

  const waitlistedRegistrations = activeRegistrations.filter(function(registration) {
    return String(registration.Status || '').toLowerCase() ===
      String(APP_CONFIG.registrationStatuses.waitlist || 'Waitlist').toLowerCase();
  });

  const waitlistEventIds = {};
  waitlistedRegistrations.forEach(function(registration) {
    waitlistEventIds[String(registration.EventId || '')] = true;
  });

  const alerts = [];
  const waitlistSummary = [];

  activeEvents.forEach(function(event) {
    const eventId = String(event.EventId || '');
    const eventRegistrations = registrationsByEvent[eventId] || [];

    const eventPending = eventRegistrations.filter(function(registration) {
      return String(registration.PaymentStatus || '') === APP_CONFIG.paymentStatuses.pending;
    }).length;

    const eventWaitlisted = eventRegistrations.filter(function(registration) {
      return String(registration.Status || '').toLowerCase() ===
        String(APP_CONFIG.registrationStatuses.waitlist || 'Waitlist').toLowerCase();
    });

    if (String(event.Status || '') === APP_CONFIG.eventStatuses.draft) {
      alerts.push(dashboardAlert_(event, 'draft', 'Draft adventure has not been published.'));
    }

    if (eventPending > 0) {
      alerts.push(dashboardAlert_(
        event,
        'payment',
        eventPending + (eventPending === 1 ? ' payment is' : ' payments are') + ' still pending.'
      ));
    }

    if (eventWaitlisted.length > 0) {
      waitlistSummary.push({
        eventId: eventId,
        title: String(event.Title || 'Adventure'),
        count: eventWaitlisted.reduce(function(total, registration) {
          return total + dashboardPeopleCount_(registration);
        }, 0),
        startDate: dashboardDateKey_(event.StartDate)
      });
    }

    if (event.MaxParticipants) {
      const spotsTaken = calculateSpotsTaken_(eventRegistrations);
      const maxParticipants = Number(event.MaxParticipants || 0);
      if (maxParticipants > 0 && spotsTaken >= maxParticipants) {
        alerts.push(dashboardAlert_(
          event,
          'full',
          'Adventure is full at ' + spotsTaken + ' of ' + maxParticipants + ' spots.'
        ));
      }
    }
  });

  const nonCancelledRegistrations = registrations.filter(function(registration) {
    return String(registration.Status || '') !== APP_CONFIG.registrationStatuses.cancelled;
  });

  const completedEvents = events.filter(function(event) {
    const status = String(event.Status || '').trim();
    const endDate = dashboardDateKey_(event.EndDate || event.StartDate);
    return status === APP_CONFIG.eventStatuses.complete ||
      status === APP_CONFIG.eventStatuses.archived ||
      (endDate && endDate < todayKey && status !== APP_CONFIG.eventStatuses.cancelled);
  }).length;

  const checkedInRegistrations = nonCancelledRegistrations.filter(function(registration) {
    return String(registration.Status || '').toLowerCase() ===
      String(APP_CONFIG.registrationStatuses.checkedIn || 'Checked In').toLowerCase();
  }).length;

  const paidRegistrations = nonCancelledRegistrations.filter(function(registration) {
    return String(registration.PaymentStatus || '').toLowerCase() ===
      String(APP_CONFIG.paymentStatuses.paid || 'Paid').toLowerCase();
  }).length;

  const totalRegisteredPeopleAllTime = nonCancelledRegistrations.reduce(function(total, registration) {
    return total + dashboardPeopleCount_(registration);
  }, 0);

  const eventTitleById = {};
  events.forEach(function(event) {
    eventTitleById[String(event.EventId || '')] = String(event.Title || 'Adventure');
  });

  activeEvents.forEach(function(event) {
    try {
      ensureDefaultEventTasks_(event.EventId);
    } catch (error) {
      Logger.log('Task setup skipped: ' + error.message);
    }
  });

  let todayTasks = [];
  try {
    todayTasks = getDataObjects_(getOrCreateEventTasksSheet_()).filter(function(task) {
      const due = dashboardDateKey_(task.DueDate);
      const status = String(task.Status || 'Pending').toLowerCase();
      return due && due <= todayKey && status !== 'complete';
    }).map(function(task) {
      const due = dashboardDateKey_(task.DueDate);
      return {
        taskId: String(task.TaskId || ''),
        eventId: String(task.EventId || ''),
        eventTitle: eventTitleById[String(task.EventId || '')] || 'Adventure',
        label: String(task.TaskLabel || 'Organizer task'),
        dueDate: due,
        overdue: due < todayKey,
        status: String(task.Status || 'Pending')
      };
    }).sort(function(a, b) {
      return a.dueDate.localeCompare(b.dueDate);
    }).slice(0, 12);
  } catch (error) {
    Logger.log('Unable to load dashboard tasks: ' + error.message);
  }

  const recentCutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const recentRegistrations = registrations.map(function(registration) {
    return {
      registrationId: String(registration.RegistrationId || ''),
      eventId: String(registration.EventId || ''),
      eventTitle: eventTitleById[String(registration.EventId || '')] || 'Adventure',
      name: dashboardRegistrationName_(registration),
      people: dashboardPeopleCount_(registration),
      status: String(registration.Status || 'Registered'),
      paymentStatus: String(registration.PaymentStatus || ''),
      createdAt: dashboardDateTime_(registration.CreatedAt || registration.RegisteredAt || registration.Timestamp)
    };
  }).filter(function(registration) {
    return registration.createdAt && registration.createdAt >= recentCutoff;
  }).sort(function(a, b) {
    return b.createdAt.getTime() - a.createdAt.getTime();
  }).slice(0, 8).map(function(registration) {
    return {
      registrationId: registration.registrationId,
      eventId: registration.eventId,
      eventTitle: registration.eventTitle,
      name: registration.name,
      people: registration.people,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      createdAt: Utilities.formatDate(
        registration.createdAt,
        Session.getScriptTimeZone(),
        'MMM d, h:mm a'
      )
    };
  });

  const featuredEvent = activeEvents.find(function(event) {
    return toBoolean_(event.Featured);
  }) || null;

  const draftCount = events.filter(function(event) {
    return String(event.Status || '') === APP_CONFIG.eventStatuses.draft;
  }).length;

  const publishedCount = events.filter(function(event) {
    return String(event.Status || '') === APP_CONFIG.eventStatuses.published;
  }).length;

  const eventsThisWeek = activeEvents.filter(function(event) {
    const key = dashboardDateKey_(event.StartDate);
    return key >= todayKey && key <= weekEndKey;
  }).length;

  const healthIssues = [];
  if (draftCount > 0) healthIssues.push(draftCount + (draftCount === 1 ? ' draft' : ' drafts'));
  if (pendingPayments.length > 0) healthIssues.push(pendingPayments.length + ' pending payment' + (pendingPayments.length === 1 ? '' : 's'));
  if (todayTasks.some(function(task) { return task.overdue; })) healthIssues.push('overdue tasks');

  return {
    greetingName: dashboardOrganizerName_(),
    upcomingEvents: activeEvents.length,
    eventsThisWeek: eventsThisWeek,
    totalParticipants: totalPeople,
    pendingPayments: pendingPayments.length,
    paymentEventCount: Object.keys(paymentEventIds).length,
    waitlistedPeople: waitlistedRegistrations.reduce(function(total, registration) {
      return total + dashboardPeopleCount_(registration);
    }, 0),
    waitlistEventCount: Object.keys(waitlistEventIds).length,
    attentionCount: alerts.length,
    draftCount: draftCount,
    featuredEvent: featuredEvent ? toClientEvent_(featuredEvent) : null,
    nextEvent: activeEvents.length ? toClientEvent_(activeEvents[0]) : null,
    alerts: alerts.slice(0, 12),
    todayTasks: todayTasks,
    recentRegistrations: recentRegistrations,
    waitlists: waitlistSummary.sort(function(a, b) {
      return a.startDate.localeCompare(b.startDate);
    }).slice(0, 8),
    health: {
      ok: healthIssues.length === 0,
      title: healthIssues.length === 0 ? 'Everything looks good' : 'Organizer attention recommended',
      message: healthIssues.length === 0
        ? 'No urgent organizer issues were found.'
        : healthIssues.join(' · ')
    },
    launchReport: {
      totalEvents: events.length,
      publishedEvents: publishedCount,
      completedEvents: completedEvents,
      totalRegistrations: nonCancelledRegistrations.length,
      totalPeople: totalRegisteredPeopleAllTime,
      checkedInRegistrations: checkedInRegistrations,
      paidRegistrations: paidRegistrations
    },
    updatedAt: Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a')
  };
}

function dashboardPeopleCount_(registration) {
  return Number(registration.AdultCount || 0) + Number(registration.ChildCount || 0);
}

function dashboardRegistrationName_(registration) {
  return String(
    registration.Name ||
    registration.FullName ||
    registration.ParticipantName ||
    registration.Email ||
    'Community member'
  );
}

function dashboardOrganizerName_() {
  try {
    const user = getCurrentUser_ ? getCurrentUser_() : null;
    if (user && user.name) return String(user.name).split(' ')[0];
  } catch (error) {
    Logger.log('Organizer name lookup skipped: ' + error.message);
  }
  return 'Shane';
}

function dashboardDateTime_(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function dashboardAlert_(event, type, message) {
  return {
    type: type,
    eventId: String(event.EventId || ''),
    title: String(event.Title || 'Untitled Adventure'),
    message: message,
    startDate: dashboardDateKey_(event.StartDate)
  };
}

function dashboardDateKey_(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return '';
}
