"""SQLite schema and migrations for NativeStore.

Purpose: Versioned DDL for jobs, letters, documents, runs, requirements.
Inputs: Open sqlite3 connection.
Returns: ``migrate(conn)`` applies pending versions.
Does not: Store API keys or CV bodies in list-facing columns (text lives in files).
"""

from __future__ import annotations

import sqlite3

SCHEMA_VERSION = 2

_STATEMENTS: list[str] = [
    """
    CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS jobs (
        source_id TEXT PRIMARY KEY,
        source TEXT NOT NULL DEFAULT 'unknown',
        title TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'inbox',
        url TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        lang TEXT NOT NULL DEFAULT '',
        salary TEXT NOT NULL DEFAULT '',
        score REAL,
        crawl_allowed INTEGER NOT NULL DEFAULT 1,
        letter_path TEXT,
        gemini INTEGER,
        skip_reason TEXT,
        why_match TEXT,
        extra_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT ''
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS letters (
        source_id TEXT PRIMARY KEY,
        body TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (source_id) REFERENCES jobs(source_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        mime TEXT NOT NULL DEFAULT 'application/octet-stream',
        word_count INTEGER NOT NULL DEFAULT 0,
        active_cv INTEGER NOT NULL DEFAULT 0,
        active_voice INTEGER NOT NULL DEFAULT 0,
        original_name TEXT NOT NULL DEFAULT '',
        rel_dir TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT ''
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'completed',
        started TEXT NOT NULL DEFAULT '',
        finished TEXT NOT NULL DEFAULT '',
        scouted INTEGER NOT NULL DEFAULT 0,
        shortlisted INTEGER NOT NULL DEFAULT 0,
        skipped INTEGER NOT NULL DEFAULT 0,
        written INTEGER NOT NULL DEFAULT 0,
        write_skipped INTEGER NOT NULL DEFAULT 0,
        errors_json TEXT NOT NULL DEFAULT '[]',
        model TEXT NOT NULL DEFAULT '',
        preview TEXT NOT NULL DEFAULT '',
        trigger TEXT NOT NULL DEFAULT 'api',
        owner TEXT NOT NULL DEFAULT '',
        heartbeat TEXT NOT NULL DEFAULT '',
        cancel_requested INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS requirements (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload_json TEXT NOT NULL DEFAULT '{}'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS companies (
        name TEXT PRIMARY KEY,
        body TEXT NOT NULL DEFAULT ''
    )
    """,
]


def migrate(conn: sqlite3.Connection) -> None:
    """Apply schema migrations up to SCHEMA_VERSION.

    Purpose: Idempotent native DB setup.
    Inputs: Open connection.
    Returns: None.
    Does not: Delete user data.
    """

    conn.executescript(";".join(_STATEMENTS))
    row = conn.execute("SELECT value FROM meta WHERE key = 'schema_version'").fetchone()
    current = int(row[0]) if row else 0
    if current < SCHEMA_VERSION:
        # Add new columns for schema version 2
        if current < 2:
            # Check for missing columns and add them
            table_info = conn.execute("PRAGMA table_info(runs)").fetchall()
            existing_columns = {col[1] for col in table_info}

            new_columns = [
                ("trigger", "TEXT NOT NULL DEFAULT 'api'"),
                ("owner", "TEXT NOT NULL DEFAULT ''"),
                ("heartbeat", "TEXT NOT NULL DEFAULT ''"),
                ("cancel_requested", "INTEGER NOT NULL DEFAULT 0")
            ]

            for col_name, col_def in new_columns:
                if col_name not in existing_columns:
                    conn.execute(f"ALTER TABLE runs ADD COLUMN {col_name} {col_def}")

        conn.execute(
            "INSERT INTO meta(key, value) VALUES('schema_version', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (str(SCHEMA_VERSION),),
        )
    conn.commit()
