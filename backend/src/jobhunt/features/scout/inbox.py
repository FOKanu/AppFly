"""Parse local _inbox/ Web Clipper notes. Never HTTP-fetch the listing URL.

Purpose: Turn markdown/html/txt clips the user already opened into Job records.
Inputs: Path to the vault `_inbox/` directory.
Returns: list[Job] with source="inbox".
Does not: GET the clip's URL, even when the host is on DENIED_CRAWL_HOSTS.
"""

from __future__ import annotations

import hashlib
import re
from html.parser import HTMLParser
from pathlib import Path

import frontmatter

from jobhunt.models import Job

SKIP_NAMES = {"readme.md"}


def fetch_inbox_jobs(inbox_dir: Path) -> list[Job]:
    """Read clip files from the vault inbox folder.

    Purpose: Ingest user-saved listings without crawling job boards.
    Inputs: Directory path (missing dir yields []).
    Returns: One Job per supported file.
    Does not: Fetch remote URLs or skip deny-listed hosts (storage is allowed).
    """
    if not inbox_dir.exists():
        return []
    jobs: list[Job] = []
    for path in sorted(inbox_dir.iterdir()):
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.name.lower() in SKIP_NAMES:
            continue
        if path.suffix.lower() not in {".md", ".html", ".htm", ".txt"}:
            continue
        jobs.append(_parse_clip(path))
    return jobs


def _parse_clip(path: Path) -> Job:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() in {".html", ".htm"}:
        title, text, urls = _parse_html(raw)
        meta: dict[str, object] = {}
    else:
        post = frontmatter.loads(raw)
        meta = dict(post.metadata)
        title = str(meta.get("title") or _first_heading(post.content) or path.stem)
        text = post.content
        urls = _urls(post.content)
        if meta.get("url"):
            urls = [str(meta["url"]), *urls]

    company = str(meta.get("company") or _company_line(text) or "Unknown")
    url = str(meta.get("url") or (urls[0] if urls else ""))
    location = str(meta.get("location") or "")
    source_id = str(meta.get("source_id") or url or _hash_id(path.name, title))
    return Job(
        source_id=source_id,
        source="inbox",
        title=title,
        company=company,
        url=url,
        location=location,
        description=_strip(text),
    )


def _first_heading(text: str) -> str:
    match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def _company_line(text: str) -> str:
    match = re.search(r"(?im)^(?:company|firma|arbeitgeber)\s*[:\-]\s*(.+)$", text)
    return match.group(1).strip() if match else ""


def _urls(text: str) -> list[str]:
    found = re.findall(r"https?://[^\s)>\]\"']+", text)
    return found


def _hash_id(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]


def _strip(text: str) -> str:
    return " ".join(re.sub(r"<[^>]+>", " ", text).split())


def _parse_html(raw: str) -> tuple[str, str, list[str]]:
    parser = _ClipParser()
    parser.feed(raw)
    title = parser.title or "Untitled"
    return title, parser.text(), parser.urls


class _ClipParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.urls: list[str] = []
        self._chunks: list[str] = []
        self._in_title = False
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self._skip = True
        if tag == "title":
            self._in_title = True
        if tag == "a":
            href = dict(attrs).get("href")
            if href and href.startswith("http"):
                self.urls.append(href)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"}:
            self._skip = False
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        text = data.strip()
        if not text:
            return
        if self._in_title and not self.title:
            self.title = text
        self._chunks.append(text)

    def text(self) -> str:
        return " ".join(self._chunks)
