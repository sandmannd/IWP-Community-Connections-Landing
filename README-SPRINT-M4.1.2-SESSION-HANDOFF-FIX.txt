Sprint M4.1.2
- Keeps the newly issued organizer session in memory for the first dashboard request.
- Stores the organizer session in both sessionStorage and localStorage when available.
- Falls back cleanly when one browser storage type is unavailable.
- Shows a specific error if the session payload cannot be saved or validated.
- Cleans up completed organizer session JSONP requests.
