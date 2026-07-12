/**
 * IWP Community Connections Automated Regression Suite
 *
 * Run `runFullRegressionTest` from the Apps Script editor while signed in as
 * an approved organizer. The suite is read-only. It does not create events,
 * registrations, memories, send email, or delete production data.
 */

const REGRESSION_REPORT_PROPERTY_ = 'LAST_REGRESSION_TEST_REPORT';

function runFullRegressionTest() {
  requireAdmin_();

  const startedAt = new Date();
  const report = {
    app: APP_CONFIG.appName,
    version: APP_CONFIG.version,
    startedAt: startedAt.toISOString(),
    finishedAt: '',
    durationMs: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    success: false,
    sections: []
  };

  const suite = createRegressionSuite_(report);

  suite.section('Configuration and deployment', function(test) {
    const props = PropertiesService.getScriptProperties();
    const primaryDbId = props.getProperty('DATABASE_SPREADSHEET_ID') || '';
    const currentDbId = props.getProperty('IWP_COMMUNITY_CONNECTIONS_DB_ID') || '';
    const legacyDbId = props.getProperty('IWP_EVENT_WIZARD_DB_ID') || '';

    test.truthy('Application configuration loads', APP_CONFIG && APP_CONFIG.sheets);
    test.equal('Public title remains Find Your Next Adventure', APP_CONFIG.subtitle, 'Find Your Next Adventure');
    test.equal('Organizer title remains Adventure Builder', APP_CONFIG.adminTitle, 'Adventure Builder');
    test.truthy('Database ID is configured', primaryDbId || currentDbId || legacyDbId);

    if (primaryDbId && currentDbId) {
      test.equal('Current database property aliases match', primaryDbId, currentDbId);
    } else {
      test.warn('Both current database property aliases are not populated yet. initializeDatabase will normalize them.');
    }

    const deployment = getDeploymentStatus();
    test.matches('Public web-app URL has the expected Apps Script format', deployment.publicUrl, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/i);
    test.matches('Admin web-app URL has the expected Apps Script format', deployment.adminUrl, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/i);
    test.equal('Launch page points to the Community Connections domain', String(deployment.launchPageUrl).replace(/\/$/, ''), 'https://connections.redlinecreates.com');
  });

  suite.section('Database structure and integrity', function(test) {
    const ss = getDatabase();
    test.truthy('Configured database opens', ss && ss.getId());

    const requiredSheets = [
      { name: APP_CONFIG.sheets.events, headers: getEventHeaders_(), id: 'EventId' },
      { name: APP_CONFIG.sheets.registrations, headers: getRegistrationHeaders_(), id: 'RegistrationId' },
      { name: APP_CONFIG.sheets.admins, headers: getAdminHeaders_(), id: 'AdminId' },
      { name: APP_CONFIG.sheets.settings, headers: getSettingsHeaders_(), id: 'SettingId' },
      { name: APP_CONFIG.sheets.eventTypes, headers: getEventTypeHeaders_(), id: 'EventTypeId' },
      { name: APP_CONFIG.sheets.memories, headers: getMemoryHeaders_(), id: 'MemoryId' },
      { name: APP_CONFIG.sheets.logs, headers: getLogHeaders_(), id: 'LogId' }
    ];

    requiredSheets.forEach(function(definition) {
      const sheet = ss.getSheetByName(definition.name);
      test.truthy('Required sheet exists: ' + definition.name, sheet);
      if (!sheet) return;

      const actualHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
        .map(function(value) { return String(value || '').trim(); });
      const missingHeaders = definition.headers.filter(function(header) {
        return actualHeaders.indexOf(header) === -1;
      });
      test.equal('Required headers exist: ' + definition.name, missingHeaders.join(', '), '');

      const objects = getDataObjects_(sheet);
      const duplicateIds = findDuplicateValues_(objects, definition.id);
      test.equal('No duplicate IDs: ' + definition.name, duplicateIds.join(', '), '');
    });
  });

  suite.section('Authentication and public separation', function(test) {
    const publicUser = getCurrentUser(true);
    test.equal('Forced public user is not an admin', publicUser.isAdmin, false);
    test.equal('Forced public user receives Viewer role', publicUser.role, APP_CONFIG.roles.viewer);
    test.equal('Forced public user email is hidden', publicUser.email, '');
    test.equal('Forced public preview flag is set', publicUser.isPublicPreview, true);

    const publicEvents = listEvents(true);
    const leakedStatuses = publicEvents.filter(function(event) {
      return String(event.Status) !== APP_CONFIG.eventStatuses.published;
    });
    test.equal('Public event list contains only published adventures', leakedStatuses.length, 0);

    const publicSensitiveFields = ['CreatedBy', 'OrganizerEmail'];
    const fieldLeaks = [];
    publicEvents.forEach(function(event) {
      publicSensitiveFields.forEach(function(field) {
        if (event[field]) fieldLeaks.push(String(event.EventId || 'unknown') + ':' + field);
      });
    });
    if (fieldLeaks.length) {
      test.warn('Public event records include organizer contact fields. Confirm this is intentional: ' + fieldLeaks.slice(0, 5).join(', '));
    } else {
      test.pass('Public event records do not expose organizer email or creator fields');
    }

    publicEvents.slice(0, 5).forEach(function(event) {
      const detail = getEventDetailData(event.EventId, true);
      const registrationLeaks = (detail.registrations || []).filter(function(registration) {
        return registration.Name || registration.Email || registration.Phone || registration.EmergencyContactName || registration.EmergencyContactPhone;
      });
      test.equal('Public detail hides registration identity: ' + event.Title, registrationLeaks.length, 0);
    });
  });

  suite.section('Adventure data and schedule regressions', function(test) {
    const allEvents = listEvents(false);
    test.truthy('Adventure list returns an array', Array.isArray(allEvents));

    allEvents.forEach(function(event) {
      ['StartDate', 'EndDate'].forEach(function(field) {
        const value = String(event[field] || '');
        if (value) test.matches(event.Title + ' has normalized ' + field, value, /^\d{4}-\d{2}-\d{2}$/);
      });
      ['StartTime', 'EndTime'].forEach(function(field) {
        const value = String(event[field] || '');
        if (value) {
          test.matches(event.Title + ' has normalized ' + field, value, /^\d{1,2}:\d{2} (AM|PM)$/);
          test.notContains(event.Title + ' does not expose the Sheets 1899 date in ' + field, value, '1899-12-30');
          test.notContains(event.Title + ' does not contain raw HTML in ' + field, value, '<');
        }
      });
    });

    test.equal('Midnight time normalization works', normalizeEventTimeText_('00:00'), '12:00 AM');
    test.equal('Afternoon time normalization works', normalizeEventTimeText_('13:05'), '1:05 PM');
    test.equal('Existing AM/PM time remains stable', normalizeEventTimeText_('9:30 AM'), '9:30 AM');
  });

  suite.section('Registration rules and capacity logic', function(test) {
    const freeEvent = {
      ChildrenAllowed: false,
      PaidEvent: false
    };
    const validRegistration = {
      Name: 'Automated Test',
      Email: 'test@example.com',
      Phone: '',
      AdultCount: 1,
      ChildCount: 0,
      AcknowledgementMemberOrganized: true,
      AcknowledgementVoluntary: true,
      AcknowledgementRespect: true,
      AcknowledgementPayment: '',
      AcknowledgementRefund: ''
    };

    test.doesNotThrow('Valid free registration passes validation', function() {
      validateRegistration_(freeEvent, validRegistration);
    });
    test.throws('Registration requires at least one adult', function() {
      validateRegistration_(freeEvent, Object.assign({}, validRegistration, { AdultCount: 0 }));
    }, 'At least one adult');
    test.throws('Registration requires member-organized acknowledgement', function() {
      validateRegistration_(freeEvent, Object.assign({}, validRegistration, { AcknowledgementMemberOrganized: false }));
    }, 'Member-organized');
    test.throws('Children are rejected when the adventure does not allow children', function() {
      validateRegistration_(freeEvent, Object.assign({}, validRegistration, { ChildCount: 1 }));
    }, 'Children are not allowed');

    const paidEvent = { ChildrenAllowed: true, PaidEvent: true };
    test.throws('Paid registration requires payment acknowledgement', function() {
      validateRegistration_(paidEvent, Object.assign({}, validRegistration, {
        ChildCount: 0,
        AcknowledgementPayment: false,
        AcknowledgementRefund: true
      }));
    }, 'Payment acknowledgement');
    test.throws('Paid registration requires refund acknowledgement', function() {
      validateRegistration_(paidEvent, Object.assign({}, validRegistration, {
        ChildCount: 0,
        AcknowledgementPayment: true,
        AcknowledgementRefund: false
      }));
    }, 'Refund acknowledgement');

    const sampleRegistrations = [
      { Status: APP_CONFIG.registrationStatuses.confirmed, AdultCount: 2, ChildCount: 1 },
      { Status: APP_CONFIG.registrationStatuses.waitlist, AdultCount: 2, ChildCount: 0 },
      { Status: APP_CONFIG.registrationStatuses.cancelled, AdultCount: 1, ChildCount: 0 },
      { Status: APP_CONFIG.registrationStatuses.checkedIn, AdultCount: 1, ChildCount: 0 }
    ];
    test.equal('Capacity counts confirmed and checked-in participants only', calculateSpotsTaken_(sampleRegistrations), 4);
    test.equal('Remaining capacity is calculated correctly', calculateSpotsRemaining_({ MaxParticipants: 10 }, sampleRegistrations), 6);
    test.equal('Unlimited capacity returns null', calculateSpotsRemaining_({ MaxParticipants: '' }, sampleRegistrations), null);

    test.throws('Duplicate email is blocked', function() {
      assertNoDuplicateRegistration_([{ Status: 'Confirmed', Email: 'same@example.com', Phone: '', Name: 'Person' }], {
        email: 'same@example.com', phone: '', name: 'Different Person'
      });
    }, 'already registered');
  });

  suite.section('Community Memories', function(test) {
    const sheet = getMemorySheet_();
    test.truthy('Memories sheet opens', sheet);
    const memories = getDataObjects_(sheet);
    const events = listEvents(false);
    const eventIds = {};
    events.forEach(function(event) { eventIds[String(event.EventId)] = true; });

    const orphaned = memories.filter(function(memory) {
      return memory.EventId && !eventIds[String(memory.EventId)];
    });
    test.equal('Every memory belongs to an existing adventure', orphaned.length, 0);

    const approvedWithoutImage = memories.filter(function(memory) {
      return toBoolean_(memory.Approved) && !String(memory.ImageUrl || '').trim();
    });
    test.equal('Approved memories have an image URL', approvedWithoutImage.length, 0);

    const featured = memories.filter(function(memory) { return toBoolean_(memory.Featured); });
    test.truthy('No more than one memory is featured globally', featured.length <= 1);

    const unapprovedLeaks = [];
    events.slice(0, 10).forEach(function(event) {
      const publicMemories = listApprovedEventMemories_(event.EventId);
      publicMemories.forEach(function(memory) {
        if (!toBoolean_(memory.Approved)) unapprovedLeaks.push(memory.MemoryId);
      });
    });
    test.equal('Public memory queries contain approved memories only', unapprovedLeaks.length, 0);
  });

  suite.section('Landing-page API and public links', function(test) {
    const payload = getLandingPageData();
    test.equal('Landing API reports success', payload.success, true);
    test.truthy('Landing API includes generated timestamp', payload.generatedAt);
    test.truthy('Landing API includes statistics', payload.stats);

    (payload.upcoming || []).forEach(function(event) {
      test.matches('Landing details URL is valid: ' + event.title, event.detailsUrl, /\?event=[^&]+$/);
      test.matches('Landing registration URL is valid: ' + event.title, event.registrationUrl, /\?register=[^&]+$/);
      test.equal('Landing API does not expose organizer email: ' + event.title, Object.prototype.hasOwnProperty.call(event, 'organizerEmail'), false);
    });
  });

  suite.section('User-interface files and settled V18 requirements', function(test) {
    const index = HtmlService.createHtmlOutputFromFile('Index').getContent();
    const registration = HtmlService.createHtmlOutputFromFile('RegistrationForm').getContent();
    const eventDetail = HtmlService.createHtmlOutputFromFile('EventDetail').getContent();
    const styles = HtmlService.createHtmlOutputFromFile('Styles').getContent();
    const javascript = HtmlService.createHtmlOutputFromFile('JavaScript').getContent();

    test.contains('Public/adventure category filter exists', index, 'id="eventTypeFilter"');
    test.contains('Unified entry portal exists', index, 'id="entryPortalView"');
    test.contains('Organizer portal choice exists', index, 'id="organizerPortalChoice"');
    test.contains('Registration event header exists', registration, 'id="registrationHeader"');
    test.contains('Registration success card exists', registration, 'id="registrationSuccessCard"');
    test.contains('Registration success return control exists', registration, 'Back to Community Connections');
    test.contains('Payment acknowledgements exist', registration, 'id="ackPayment"');
    test.contains('Refund acknowledgements exist', registration, 'id="ackRefund"');
    test.contains('Adventure Details content container exists', eventDetail, 'id="eventDetailContent"');
    test.contains('Mobile CSS breakpoint exists', styles, '@media');
    test.contains('Date input formatter remains installed', javascript, 'normalizeAdventureDateValue');
    test.contains('Automatic slash insertion remains installed', javascript, "digits.slice(0, 2) + '/'");
    test.notContains('Styles file does not contain an accidental visible style tag escape', styles, '&lt;style');
  });

  suite.finish();
  report.finishedAt = new Date().toISOString();
  report.durationMs = new Date().getTime() - startedAt.getTime();
  report.success = report.failed === 0;

  PropertiesService.getScriptProperties().setProperty(
    REGRESSION_REPORT_PROPERTY_,
    JSON.stringify(report)
  );

  Logger.log(formatRegressionIssueSummary_(report));
  return report;
}

function getLastRegressionTestReport() {
  requireAdmin_();
  const stored = PropertiesService.getScriptProperties().getProperty(REGRESSION_REPORT_PROPERTY_);
  return stored ? JSON.parse(stored) : null;
}


/**
 * Public-safe summary used by the browser regression runner.
 * It exposes only the latest report status and counts, never test details or data.
 */
function getRegressionSummaryForBrowserTest() {
  const report = getLastRegressionTestReport();
  if (!report) {
    return { exists: false, success: false, passed: 0, failed: 0, warnings: 0, version: '', finishedAt: '' };
  }
  return {
    exists: true,
    success: report.success === true && Number(report.failed || 0) === 0 && Number(report.warnings || 0) === 0,
    passed: Number(report.passed || 0),
    failed: Number(report.failed || 0),
    warnings: Number(report.warnings || 0),
    version: String(report.version || ''),
    finishedAt: String(report.finishedAt || '')
  };
}

function getLastRegressionTestReportText() {
  const report = getLastRegressionTestReport();
  return report ? formatRegressionReport_(report) : 'No regression test report has been saved yet.';
}

function createRegressionSuite_(report) {
  let currentSection = null;

  function addResult_(status, name, details) {
    const result = {
      status: status,
      name: name,
      details: details || ''
    };
    currentSection.results.push(result);
    if (status === 'PASS') report.passed++;
    if (status === 'FAIL') report.failed++;
    if (status === 'WARN') report.warnings++;
  }

  const assertions = {
    pass: function(name) { addResult_('PASS', name, ''); },
    warn: function(message) { addResult_('WARN', message, ''); },
    truthy: function(name, value) {
      if (value) addResult_('PASS', name, '');
      else addResult_('FAIL', name, 'Expected a truthy value.');
    },
    equal: function(name, actual, expected) {
      if (actual === expected) addResult_('PASS', name, '');
      else addResult_('FAIL', name, 'Expected ' + printable_(expected) + ', received ' + printable_(actual) + '.');
    },
    contains: function(name, haystack, needle) {
      if (String(haystack || '').indexOf(String(needle)) !== -1) addResult_('PASS', name, '');
      else addResult_('FAIL', name, 'Missing required content: ' + needle);
    },
    notContains: function(name, haystack, needle) {
      if (String(haystack || '').indexOf(String(needle)) === -1) addResult_('PASS', name, '');
      else addResult_('FAIL', name, 'Unexpected content found: ' + needle);
    },
    matches: function(name, value, pattern) {
      if (pattern.test(String(value || ''))) addResult_('PASS', name, '');
      else addResult_('FAIL', name, 'Value did not match ' + pattern + ': ' + printable_(value));
    },
    doesNotThrow: function(name, callback) {
      try {
        callback();
        addResult_('PASS', name, '');
      } catch (error) {
        addResult_('FAIL', name, error && error.message ? error.message : String(error));
      }
    },
    throws: function(name, callback, expectedMessagePart) {
      try {
        callback();
        addResult_('FAIL', name, 'Expected an error, but none was thrown.');
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        if (!expectedMessagePart || message.indexOf(expectedMessagePart) !== -1) addResult_('PASS', name, '');
        else addResult_('FAIL', name, 'Wrong error message: ' + message);
      }
    }
  };

  return {
    section: function(name, callback) {
      currentSection = { name: name, results: [] };
      report.sections.push(currentSection);
      try {
        callback(assertions);
      } catch (error) {
        addResult_('FAIL', 'Section crashed before completion', error && error.stack ? error.stack : String(error));
      }
    },
    finish: function() {
      currentSection = null;
    }
  };
}

function findDuplicateValues_(objects, fieldName) {
  const seen = {};
  const duplicates = {};
  (objects || []).forEach(function(object) {
    const value = String(object[fieldName] || '').trim();
    if (!value) return;
    if (seen[value]) duplicates[value] = true;
    seen[value] = true;
  });
  return Object.keys(duplicates);
}

function printable_(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return '"' + value + '"';
  try { return JSON.stringify(value); } catch (error) { return String(value); }
}

function formatRegressionReport_(report) {
  const lines = [];
  lines.push('============================================================');
  lines.push('IWP COMMUNITY CONNECTIONS AUTOMATED REGRESSION REPORT');
  lines.push('Version: ' + report.version);
  lines.push('Result: ' + (report.success ? 'PASSED' : 'FAILED'));
  lines.push('Passed: ' + report.passed + ' | Failed: ' + report.failed + ' | Warnings: ' + report.warnings);
  lines.push('============================================================');

  (report.sections || []).forEach(function(section) {
    lines.push('');
    lines.push(section.name.toUpperCase());
    (section.results || []).forEach(function(result) {
      lines.push('[' + result.status + '] ' + result.name + (result.details ? ' | ' + result.details : ''));
    });
  });

  return lines.join('\n');
}


/**
 * Keeps the Apps Script execution log readable by printing only the summary,
 * failures, and warnings. The full report remains saved in Script Properties
 * and can be retrieved with getLastRegressionTestReportText().
 */
function formatRegressionIssueSummary_(report) {
  const lines = [];
  lines.push('============================================================');
  lines.push('IWP COMMUNITY CONNECTIONS AUTOMATED REGRESSION REPORT');
  lines.push('Version: ' + report.version);
  lines.push('Result: ' + (report.success ? 'PASSED' : 'FAILED'));
  lines.push('Passed: ' + report.passed + ' | Failed: ' + report.failed + ' | Warnings: ' + report.warnings);
  lines.push('Duration: ' + report.durationMs + ' ms');
  lines.push('============================================================');

  let issueCount = 0;
  (report.sections || []).forEach(function(section) {
    const issues = (section.results || []).filter(function(result) {
      return result.status === 'FAIL' || result.status === 'WARN';
    });
    if (!issues.length) return;

    lines.push('');
    lines.push(section.name.toUpperCase());
    issues.forEach(function(result) {
      issueCount++;
      lines.push('[' + result.status + '] ' + result.name + (result.details ? ' | ' + result.details : ''));
    });
  });

  if (!issueCount) {
    lines.push('');
    lines.push('No failures or warnings. All automated checks passed.');
  }

  lines.push('');
  lines.push('Full report saved. Run getLastRegressionTestReportText to retrieve it.');
  return lines.join('\n');
}

function logLastRegressionTestReport() {
  Logger.log(getLastRegressionTestReportText());
}
