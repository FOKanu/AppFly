# Run log

Purpose: Format markdown for `Runs/YYYY-MM-DD.md` after `jobhunt run`.

## Main files

- `__init__.py` — `format_run_note`

Compatibility imports: `jobhunt.runlog`.

## How to extend

Add fields to `format_run_note` and pass them from `jobhunt.cli:run_all`. Do not include secret values in the note body.
