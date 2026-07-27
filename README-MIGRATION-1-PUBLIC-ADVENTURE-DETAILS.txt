COMMUNITY CONNECTIONS CLOUDFLARE MIGRATION 1

This update creates the first real Cloudflare-hosted application screen: public adventure details.

BACKEND
- Adds a read-only JSONP endpoint: api=public-adventure
- Reuses existing public event protections and public registration summaries
- Keeps registration on Apps Script for now

CLOUDFLARE
- Adds adventure.html, adventure.js, and adventure.css
- Landing-page adventure cards now open the Cloudflare detail page
- Organizer tools continue opening the existing Apps Script application

SAFE DEPLOYMENT ORDER
1. Push and deploy the Apps Script backend first.
2. Then deploy the Cloudflare landing project.
3. Test an adventure card, details, directions, sharing, and registration handoff.
