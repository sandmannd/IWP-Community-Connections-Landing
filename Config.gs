/**
 * IWP Community Connections
 * Application Configuration
 * Version 1.0 Beta
 */

const APP_CONFIG = {
  appName: 'IWP COMMUNITY CONNECTIONS',
  subtitle: 'Find Your Next Adventure',
  tagline: 'Member-Organized Events Only, Not Official IWP Events',
  adminTitle: 'Adventure Builder',
  version: '1.0.0-beta.2',
  launchPageUrl: 'https://connections.redlinecreates.com/',
  spreadsheetName: 'IWP Community Connections Database',

  sheets: {
    events: 'Events',
    registrations: 'Registrations',
    admins: 'Admins',
    settings: 'Settings',
    eventTypes: 'Event Types',
    memories: 'Memories',
    logs: 'Logs'
  },

  roles: {
    owner: 'Owner',
    admin: 'Admin',
    viewer: 'Viewer'
  },

  eventStatuses: {
    draft: 'Draft',
    published: 'Published',
    registrationClosed: 'Registration Closed',
    cancelled: 'Cancelled',
    complete: 'Complete',
    archived: 'Archived'
  },

  registrationStatuses: {
    pending: 'Pending',
    confirmed: 'Confirmed',
    waitlist: 'Waitlist',
    cancelled: 'Cancelled',
    checkedIn: 'Checked In'
  },

  paymentStatuses: {
    notRequired: 'Not Required',
    pending: 'Pending',
    paid: 'Paid',
    payAtEvent: 'Pay At Event',
    buyOwnTicket: 'Buy Own Ticket'
  },

  defaultEventTypes: [
    'Tubing',
    'Camping',
    'Fishing',
    'Ice Fishing',
    'Hunting',
    'Bowling',
    'Bonfire',
    'Rodeo',
    'Sporting Event',
    'Concert',
    'ATV / UTV Ride',
    'Community Gathering',
    'Other / My Own Event'
  ],

  defaultTimeOptions: {
    startHour: 5,
    endHour: 23,
    intervalMinutes: 15
  },

  colors: {
    background: '#0f172a',
    panel: '#111827',
    panelSoft: '#1f2937',
    text: '#f8fafc',
    mutedText: '#cbd5e1',
    accent: '#38bdf8',
    accentDark: '#0284c7',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e'
  }
};

function getAppConfig() {
  return APP_CONFIG;
}

function getConfigValue(key) {
  return APP_CONFIG[key] || null;
}
