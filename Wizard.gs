/** Text generation helpers. These generate prompts, not paid API calls. */

function buildAdventurePrompt(eventData) {
  const data = eventData || {};
  return [
    'Help me write content for a member-organized Community Connections adventure.',
    '',
    'Important wording:',
    'This is a member-organized Community Connections event and is not facilitated, monitored, or organized by IWP staff.',
    '',
    'Adventure Name: ' + (data.title || data.Title || ''),
    'Adventure Type: ' + (data.eventType || data.EventType || ''),
    'Location: ' + (data.locationName || data.LocationName || ''),
    'Address: ' + (data.address || data.Address || ''),
    'Start: ' + (data.startDate || data.StartDate || '') + ' ' + (data.startTime || data.StartTime || ''),
    'End: ' + (data.endDate || data.EndDate || '') + ' ' + (data.endTime || data.EndTime || ''),
    'Children Allowed: ' + (data.childrenAllowed || data.ChildrenAllowed ? 'Yes' : 'No'),
    'Registration Required: ' + (data.registrationRequired || data.RegistrationRequired ? 'Yes' : 'No'),
    'Paid Event: ' + (data.paidEvent || data.PaidEvent ? 'Yes' : 'No'),
    '',
    'Notes / Description:',
    data.description || data.Description || '',
    '',
    'What to expect:',
    data.whatToExpect || data.WhatToExpect || '',
    '',
    'What to bring:',
    data.whatToBring || data.WhatToBring || '',
    '',
    'Please write:',
    '1. A friendly adventure description.',
    '2. A Facebook event description.',
    '3. A Facebook announcement post.',
    '4. A what-to-bring checklist.',
    '5. A 24-hour reminder post.',
    '6. A thank-you post.',
    '',
    'Tone: Friendly, welcoming, casual, and clear. Do not make it sound like an official IWP event.'
  ].join('\n');
}
