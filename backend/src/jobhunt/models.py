"""Shared job and requirements records used by every engine feature.

Purpose: Keep Job and Requirements shapes in one place at the package root.
Inputs: Constructor fields or a YAML/frontmatter mapping for Requirements.
Returns: Dataclasses consumed by scout, match, write, and vault.
Does not: Read the vault, fetch URLs, or call Gemini.
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
    """One listing collected by scout or loaded from a vault job note.

    Purpose: Carry source, title, company, and description through the pipeline.
    Inputs: Fields set by a scout source or Vault.job_from_note.
    Returns: Dataclass instance (text is a derived property).
    Does not: Fetch the listing URL or write markdown.
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
        """Concatenated title, company, and description for matching.

        Purpose: Give hard_filter and embeddings a single haystack.
        Inputs: None (uses instance fields).
        Returns: Space-joined non-empty parts.
        Does not: Truncate or fetch extra text.
        """
        return " ".join(part for part in (self.title, self.company, self.description) if part)


@dataclass
class Requirements:
    """Hard filters and tone copied from vault Requirements.md.

    Purpose: Drive skip/ban/must-have checks and writer constraints.
    Inputs: Frontmatter mapping via from_mapping, or explicit fields.
    Returns: Dataclass used by match and write.
    Does not: Read files itself.
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
        """Build Requirements from a YAML/frontmatter dict.

        Purpose: Parse vault Requirements.md metadata.
        Inputs: Mapping or None.
        Returns: Requirements with list fields normalized.
        Does not: Open the markdown file.
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
