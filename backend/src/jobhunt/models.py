"""Shared job and requirements records.

Purpose: In-memory shapes used by scout, match, write, and the vault.
Inputs: Constructor fields or a YAML mapping for ``Requirements``.
Returns: ``Job`` and ``Requirements`` dataclasses.
Does not: Read disk, call APIs, or enforce crawl policy.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


STATUSES = (
    "inbox",
    "shortlist",
    "draft",
    "approved",
    "applied",
    "skipped",
)

ACTIONABLE = ("draft", "approved", "shortlist")


@dataclass
class Job:
    """One listing in memory (not yet a vault note).

    Purpose: Pass title, company, URL, and description between features.
    Inputs: Source fields from Agentur, RSS, inbox, or a vault note.
    Returns: Dataclass; ``text`` concatenates title, company, description.
    Does not: Fetch the listing URL.
    """

    source_id: str
    source: str
    title: str
    company: str
    url: str = ""
    location: str = ""
    description: str = ""
    lang: str = ""
    salary: str = ""
    address: str = ""
    posted: str = ""
    crawl_allowed: bool = True
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def text(self) -> str:
        return " ".join(part for part in (self.title, self.company, self.description) if part)


@dataclass
class Requirements:
    """Hard filters and tone copied from ``Requirements.md``.

    Purpose: Drive match skip rules and writer constraints.
    Inputs: Frontmatter mapping via ``from_mapping``.
    Returns: Dataclass of locations, salary floor, banned terms, skills, tone.
    Does not: Score jobs or write letters.
    """

    locations: list[str] = field(default_factory=list)
    salary_floor: int = 0
    languages: list[str] = field(default_factory=lambda: ["de", "en"])
    banned_terms: list[str] = field(default_factory=list)
    skip_companies: list[str] = field(default_factory=list)
    must_have: list[str] = field(default_factory=list)
    nice_to_have: list[str] = field(default_factory=list)
    tone: str = "concise, specific, no buzzword salad"

    @classmethod
    def from_mapping(cls, data: dict[str, Any] | None) -> Requirements:
        """Build requirements from Obsidian frontmatter.

        Purpose: Parse ``Requirements.md`` metadata.
        Inputs: Mapping or ``None``.
        Returns: ``Requirements`` with list fields normalized.
        Does not: Read the file (vault does).
        """

        data = data or {}
        return cls(
            locations=_str_list(data.get("locations")),
            salary_floor=int(data.get("salary_floor") or 0),
            languages=_str_list(data.get("languages")) or ["de", "en"],
            banned_terms=_str_list(data.get("banned_terms")),
            skip_companies=_str_list(data.get("skip_companies")),
            must_have=_str_list(data.get("must_have")),
            nice_to_have=_str_list(data.get("nice_to_have")),
            tone=str(data.get("tone") or "concise, specific, no buzzword salad"),
        )


def _str_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [value]
    return [str(item) for item in value if item]
