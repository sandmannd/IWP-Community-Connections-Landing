IWP Community Connections — M6.15 Mobile Event-Day Polish

Landing repository only.

Changes:
- Command Center action buttons stack full-width with clear spacing on phones.
- Manage Adventures registration/check-in/edit/view actions stack full-width on phones.
- Registration Manager participant actions also stack on very small screens.
- "Scan QR Code" renamed to "Scan Participant QR Code".
- QR scanning now uses native BarcodeDetector when available and jsQR camera decoding as a fallback.
- Camera permission/failure messages clearly explain what to do.
- Participant "QR Code" action renamed "View QR Code".
- Check-in screens explain that participants receive their personal QR code in the registration confirmation email.
- No Apps Script/backend changes are required; the current backend already puts the personal QR code and secure check-in link in the confirmation email.
- .git is excluded.
