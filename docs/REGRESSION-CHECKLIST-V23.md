# IWP Community Connections Regression Checklist V23

## Automated backend
Run `runFullRegressionTest()` after `clasp push`. Required result: zero failures and zero warnings. The previous verified baseline was 248 passed.

Verify coverage includes:
- Configuration and deployment URLs
- Required sheets, headers, and duplicate IDs
- Authentication and public/admin separation
- Adventure dates and time formatting
- Registration validation, capacity, payments, and guest names
- Community Memories integrity, approval, featured state, throttling, and moderation
- Organizer analytics data
- Adventure Details, registration, and public UI contracts

## Automated browser
Run `browser-tests\Run-V23-All-Tests.bat`. Required result: 22 passed, zero failed, zero warnings.

Coverage:
- Landing page
- Public app startup
- Adventure cards
- Search and categories
- Adventure Details
- Registration route
- Public/admin separation
- Mobile menu and horizontal overflow
- Organizer recognition, Command Center, dashboard, and Adventure Builder
- Browser JavaScript health

## Focused human validation
Automated tests cannot fully prove:
- Real email delivery
- Real Drive upload permissions and image visibility
- QR scanning
- Actual phone/tablet appearance
- Payment-account correctness

## Release gate
Do not label V23 Green until both automated suites are clean after deployment and any required focused human checks are complete.
