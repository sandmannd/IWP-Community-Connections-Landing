IWP Community Connections M5.5.2

Registration Manager improvements:
- Participant detail dialog with editable contact, status, payment, method, and notes
- Quick check-in, mark-paid, and cancellation actions
- Multi-select bulk check-in, mark-paid, cancellation, and email-client launch
- Expanded adult, child, paid, and needs-payment metrics
- Multiple simultaneous status/payment filters
- CSV roster export
- Organizer-session-protected registration action API

Deployment:
- Apps Script project requires clasp push and a new deployment version.
- Landing project requires Cloudflare Pages deployment.
- Cloudflare environment variable IWP_APPS_SCRIPT_URL must contain the current Apps Script /exec URL.
