M6.21.3 Real Publish Flow

Landing repository only.

- Publish Adventure first saves the current form, then calls the dedicated authenticated publish action.
- The UI only reports "Adventure published" after the publish action actually succeeds.
- If draft save succeeds but publish fails, the builder stays open and clearly says the draft saved but publish failed.
- .git excluded.
