M6.21.5 Manage Adventures Login Fix

Landing repository only.

- Manage Adventures no longer treats every data-load error as a failed login.
- Only explicit session/auth errors return to Google sign-in.
- Network/timeouts keep the organizer workspace open and show a data-load message.
- Uses cache-busted organizer-adventures JS.
- .git excluded.
