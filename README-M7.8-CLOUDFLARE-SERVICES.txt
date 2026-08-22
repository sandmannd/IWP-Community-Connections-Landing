M7.8 — Cloudflare Services

This sprint removes the remaining live registration/email/image dependencies on Google Apps Script.

Changes:
- Registration confirmation and organizer notification email use Cloudflare Email Service binding EMAIL.
- Organizer participant emails/reminders read recipients from D1 and send through Cloudflare Email Service.
- Public adventure pages always show the registered participant count.
- Only registrations that explicitly opted in via the existing show_name_on_attendee_list registration checkbox are displayed publicly. Child names are never exposed.
- New organizer image uploads store in R2 binding ADVENTURE_IMAGES and are served through /api/adventure-image. Existing Google Drive image URLs remain supported.

Required Cloudflare resources before deployment:
1. Email Service sending domain onboarded for redlinecreates.com.
2. Pages/Worker send_email binding named EMAIL.
3. Text variable COMMUNITY_EMAIL_FROM (recommended: connections@redlinecreates.com).
4. R2 bucket (recommended: iwp-community-connections-images) bound as ADVENTURE_IMAGES.

No Apps Script code change is required for M7.8.
