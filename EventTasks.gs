/** Event timeline and organizer task helpers. */

const EVENT_TASKS_SHEET_NAME = 'Event Tasks';

function getEventTaskHeaders_() {
  return ['TaskId','EventId','TaskKey','TaskLabel','DueDate','Status','Notes','CreatedAt','UpdatedAt'];
}

function getOrCreateEventTasksSheet_() {
  const ss = getDatabase();
  return createSheetIfMissing_(ss, EVENT_TASKS_SHEET_NAME, getEventTaskHeaders_());
}

function listEventTasks(eventId) {
  requireAdmin_();
  if (!eventId) throw new Error('Event ID is required.');

  ensureDefaultEventTasks_(eventId);
  const sheet = getOrCreateEventTasksSheet_();
  return getDataObjects_(sheet)
    .filter(function(task) { return String(task.EventId) === String(eventId); })
    .map(serializeEventTask_)
    .sort(function(a, b) {
      const left = a.DueDate || '9999-12-31';
      const right = b.DueDate || '9999-12-31';
      return left.localeCompare(right);
    });
}

function updateEventTask(taskId, updates) {
  requireAdmin_();
  if (!taskId) throw new Error('Task ID is required.');

  updates = updates || {};
  const allowedStatuses = ['Pending', 'In Progress', 'Complete'];
  const payload = { UpdatedAt: now_() };

  if (updates.Status !== undefined) {
    if (allowedStatuses.indexOf(String(updates.Status)) === -1) throw new Error('Invalid task status.');
    payload.Status = String(updates.Status);
  }
  if (updates.Notes !== undefined) payload.Notes = String(updates.Notes || '');
  if (updates.DueDate !== undefined) payload.DueDate = String(updates.DueDate || '');

  const sheet = getOrCreateEventTasksSheet_();
  return serializeEventTask_(updateObjectById_(sheet, 'TaskId', taskId, payload));
}

function addEventTask(eventId, label, dueDate) {
  requireAdmin_();
  if (!eventId) throw new Error('Event ID is required.');
  label = String(label || '').trim();
  if (!label) throw new Error('Task name is required.');

  const task = {
    TaskId: createId_('task'),
    EventId: eventId,
    TaskKey: 'custom_' + Date.now(),
    TaskLabel: label,
    DueDate: String(dueDate || ''),
    Status: 'Pending',
    Notes: '',
    CreatedAt: now_(),
    UpdatedAt: now_()
  };

  appendObject_(getOrCreateEventTasksSheet_(), task);
  return serializeEventTask_(task);
}

function deleteEventTask(taskId) {
  requireAdmin_();
  deleteRowById_(getOrCreateEventTasksSheet_(), 'TaskId', taskId);
  return { success: true };
}

function ensureDefaultEventTasks_(eventId) {
  const sheet = getOrCreateEventTasksSheet_();
  const existing = getDataObjects_(sheet).filter(function(task) {
    return String(task.EventId) === String(eventId);
  });
  if (existing.length) return;

  const event = getEvent(eventId);
  const startDate = parseEventDateForTasks_(event.StartDate);
  const templates = [
    ['30_days', '30-Day Planning Check', -30],
    ['14_days', 'Two-Week Reminder', -14],
    ['7_days', 'One-Week Reminder', -7],
    ['3_days', 'Three-Day Reminder', -3],
    ['24_hours', '24-Hour Reminder', -1],
    ['morning_of', 'Morning-of Event Check', 0],
    ['thank_you', 'Post Thank-You Message', 1],
    ['photos', 'Upload and Share Photos', 2],
    ['close_event', 'Close Out Event', 3]
  ];

  templates.forEach(function(template) {
    const due = startDate ? new Date(startDate.getTime()) : null;
    if (due) due.setDate(due.getDate() + template[2]);
    appendObject_(sheet, {
      TaskId: createId_('task'),
      EventId: eventId,
      TaskKey: template[0],
      TaskLabel: template[1],
      DueDate: due ? Utilities.formatDate(due, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      Status: 'Pending',
      Notes: '',
      CreatedAt: now_(),
      UpdatedAt: now_()
    });
  });
}

function parseEventDateForTasks_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function serializeEventTask_(task) {
  const output = Object.assign({}, task || {});
  ['DueDate','CreatedAt','UpdatedAt'].forEach(function(key) {
    const value = output[key];
    if (value instanceof Date) {
      output[key] = Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        key === 'DueDate' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss"
      );
    } else if (value === undefined || value === null) {
      output[key] = '';
    }
  });
  return safeJson_(output);
}
