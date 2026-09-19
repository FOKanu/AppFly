# Memory

The copilot's career ledger: what you applied to, which companies you already
hit, and how your profile changed. **Memory remembers, Profiles edits.**

Three sections, deep-linkable by hash from the PROFILE menu:

- `#applications` — jobs that reached approved or applied, derived from
  `GET /jobs` via the Queue's client (`ledger.ts`)
- `#companies` — the same entries rolled up per company
- `#versions` — profile changes, from `versionLedger.ts`

## Honest gaps

- **No dates.** Neither `JobSummary` nor `JobPacket` carries a timestamp, so
  the ledger has no "when" column. The types are shaped so an `applied_at`
  can land later without changing the screens.
- **Salary** is only on `GET /jobs/{id}`, so it is hydrated for a bounded
  slice of the ledger and shows "—" beyond that.
- **Version history is local to the browser** (`localStorage`). There is no
  profile-version endpoint; the entry shape matches what one would return.

Run logs are *not* here — those stay on `/activity`.
