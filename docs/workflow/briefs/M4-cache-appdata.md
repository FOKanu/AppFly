You are the local coder on AppFly. Implement ONLY this brief. No planning essays. Do not commit.

REPO: FOKanu/AppFly (~/work/AppFly WSL on 5090)
BRANCH: feat/backend-cache-appdata (already cut from integrate/mvp-v1 @ 9c61c93 or later)

ALLOWED FILES:
- backend/src/jobhunt/config.py
- backend/src/jobhunt/store/paths.py
- backend/tests/test_cache_appdata.py
- docs/STORAGE.md
- docs/FEATURES.md

FORBIDDEN: matcher.py (already uses config.cache_dir — do not rewrite embed logic), package.json, pyproject.toml, lockfiles, frontend/**, policy.py, .env*

CONTEXT:
- Today AppConfig.cache_dir = REPO_ROOT / ".cache". Matcher writes config.cache_dir / "embeddings" / {sha}.json.
- Native store root is config.native_data_path (macOS ~/Library/Application Support/AppFly/).
- M4: embeddings live under app-data cache/embeddings. Document legacy repo .cache/.

BRIEF:
1. AppConfig.cache_dir:
   - When storage_backend == "native": return native_data_path / "cache"
   - When storage_backend == "markdown": keep REPO_ROOT / ".cache" (legacy vault workflow)
   - Docstring Purpose/Inputs/Returns/Does not.
2. ensure_native_layout: also mkdir cache/embeddings under the data root.
3. Add maybe_migrate_legacy_embeddings_cache(dest_cache_root: Path) -> int in paths.py:
   - Source: REPO_ROOT / ".cache" / "embeddings"
   - Dest: dest_cache_root / "embeddings" (dest_cache_root is the cache_dir, i.e. …/cache)
   - If source missing or empty: return 0
   - Copy *.json files that are not already in dest (do not overwrite)
   - Write dest / ".migrated_from_repo_cache" marker after a successful pass so we don't re-scan forever; if marker exists return 0
   - Return count of files copied
   - Call it from ensure_native_layout after creating cache/embeddings (pass base/"cache")
4. docs/STORAGE.md: add cache/embeddings under the AppFly/ tree; short note that repo-root .cache/embeddings is legacy and may be one-shot migrated; embeddings are local model vectors not secrets; no size quota enforced yet (note that).
5. docs/FEATURES.md: M4 row → **This tree** with short note.
6. backend/tests/test_cache_appdata.py:
   - native config → cache_dir is under native_data_path / "cache"
   - markdown config → cache_dir is REPO_ROOT / ".cache"
   - ensure_native_layout creates cache/embeddings
   - migrate copies one legacy json into dest and sets marker; second call copies 0

INVARIANTS:
- No secrets in cache files (vectors only)
- policy.py untouched
- Do not delete legacy .cache (leave in place after copy)

CHECKS:
- cd backend && uv run python -m pytest -q tests/test_cache_appdata.py
- Prefer full pytest if fast
- git diff --check

DONE WHEN: checks pass; native embeddings path under app-data; docs updated.

RETURN: summary, invariant self-review, check output, risks. Do not commit.
