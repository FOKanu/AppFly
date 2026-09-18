---
locations:
  - Berlin
  - Remote
salary_floor: 0
languages:
  - de
  - en
banned_terms:
  - Personalvermittlung
  - Zeitarbeit
  - Arbeitnehmerüberlassung
skip_companies: []
must_have: []
nice_to_have:
  - Python
  - TypeScript
tone: concise, specific, no buzzword salad
---

# Requirements

Hard filters live in the YAML properties above. The matcher reads them every run.

- **locations**: job location must contain at least one of these (case-insensitive), or be empty/remote-friendly
- **salary_floor**: skip if a numeric salary is present and below this (0 disables)
- **languages**: preferred letter languages
- **banned_terms**: skip if the title or description contains any of these
- **skip_companies**: never write or shortlist these employers
- **must_have**: each term must appear in the job text (title + description)
- **nice_to_have**: used for scoring overlap, not as a hard filter
