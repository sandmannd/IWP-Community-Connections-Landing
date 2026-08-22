M7.8 — Gmail API Email Delivery

This revision replaces the paid Cloudflare Email Service dependency with Gmail API sending through the dedicated Community Connections Gmail account.

Required Cloudflare settings:
- Secret: GMAIL_CLIENT_ID
- Secret: GMAIL_CLIENT_SECRET
- Secret: GMAIL_REFRESH_TOKEN
- Text:   GMAIL_FROM_ADDRESS = iwpcommunityconnections@gmail.com

Email behavior:
- Registration confirmations are sent from IWP Community Connections <iwpcommunityconnections@gmail.com>.
- Organizer registration notifications go to the adventure organizer email.
- Participant emails use Reply-To = organizer email when available.
- Organizer notifications use Reply-To = participant email when available.
- Organizer reminder/update emails use Gmail API and D1.

No Apps Script email relay is used.
No Cloudflare paid Email Service binding is required.
