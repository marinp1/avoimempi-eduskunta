---
name: fix-tickets
description: Fetch triaged tickets from the local ticket tracker and fix each issue in the codebase
---

# Fix Tickets Skill

Fetch triaged tickets from the local ticket tracker and fix each issue in the codebase.

## Steps

1. Fetch the ticket list:

```bash
curl -s "http://host.docker.internal:7331/tickets?project_id=92521980-313c-414d-accd-8f5101e5e51c&status=ready"
```

2. Parse the JSON array of tickets. Each ticket has a title and description (and possibly other fields) describing the issue to fix.

3. For each ticket:
   - Read and understand the relevant code
   - Implement the fix
   - Do not commit — just make the code changes
   - Mark the ticket as done by calling:
     ```bash
     curl -s -X POST "http://host.docker.internal:7331/tickets/{id}/done"
     ```
     where `{id}` is the ticket's id field (uuid) from the JSON.

4. After all tickets are processed, summarize what was done: which tickets were fixed, what files were changed, and any tickets that were unclear or skipped.

## Notes

- Fix tickets one at a time, in order
- If a ticket is ambiguous, make a best-effort fix and note the ambiguity in the summary
- Do not create new files unless the ticket explicitly requires it
- Run `bun run typecheck` after changes to verify no type errors were introduced
