import { apiGet, apiPut } from "../../shared/api/client";

export interface RequirementsPayload {
  locations: string[];
  salary_floor: number;
  languages: string[];
  banned_terms: string[];
  skip_companies: string[];
  must_have: string[];
  nice_to_have: string[];
  tone: string;
  storage_backend: string;
}

export type RequirementsDraft = Omit<RequirementsPayload, "storage_backend">;

export const REQUIREMENT_LIMITS = {
  locations: 20,
  languages: 6,
  banned_terms: 50,
  skip_companies: 200,
  must_have: 10,
  nice_to_have: 30,
  itemChars: 80,
  languageChars: 20,
  toneChars: 200,
  salaryMax: 1_000_000,
} as const;

export const LIST_FIELDS = [
  "locations",
  "languages",
  "banned_terms",
  "skip_companies",
  "must_have",
  "nice_to_have",
] as const;

export function fetchRequirements(): Promise<RequirementsPayload> {
  return apiGet<RequirementsPayload>("/requirements");
}

export function saveRequirements(
  draft: RequirementsDraft
): Promise<RequirementsPayload> {
  return apiPut<RequirementsPayload>(
    "/requirements",
    toDraft(draft as RequirementsPayload)
  );
}

export function toDraft(
  p: RequirementsPayload | RequirementsDraft
): RequirementsDraft {
  return {
    locations: [...p.locations],
    salary_floor: p.salary_floor,
    languages: [...p.languages],
    banned_terms: [...p.banned_terms],
    skip_companies: [...p.skip_companies],
    must_have: [...p.must_have],
    nice_to_have: [...p.nice_to_have],
    tone: p.tone,
  };
}

export function sameDraft(a: RequirementsDraft, b: RequirementsDraft): boolean {
  return (
    a.locations.length === b.locations.length &&
    a.locations.every((v, i) => v === b.locations[i]) &&
    a.salary_floor === b.salary_floor &&
    a.languages.length === b.languages.length &&
    a.languages.every((v, i) => v === b.languages[i]) &&
    a.banned_terms.length === b.banned_terms.length &&
    a.banned_terms.every((v, i) => v === b.banned_terms[i]) &&
    a.skip_companies.length === b.skip_companies.length &&
    a.skip_companies.every((v, i) => v === b.skip_companies[i]) &&
    a.must_have.length === b.must_have.length &&
    a.must_have.every((v, i) => v === b.must_have[i]) &&
    a.nice_to_have.length === b.nice_to_have.length &&
    a.nice_to_have.every((v, i) => v === b.nice_to_have[i]) &&
    a.tone === b.tone
  );
}

export function limitProblems(d: RequirementsDraft): string[] {
  const problems: string[] = [];

  for (const field of LIST_FIELDS) {
    const value = d[field];
    const cap = REQUIREMENT_LIMITS[field];
    if (value.length > cap) {
      const label =
        field === "must_have"
          ? "Must-have skills"
          : field === "nice_to_have"
          ? "Nice-to-have skills"
          : field.charAt(0).toUpperCase() + field.slice(1);
      problems.push(`${label}: at most ${cap} items.`);
    }

    for (const item of value) {
      const maxChars =
        field === "languages" ? REQUIREMENT_LIMITS.languageChars : REQUIREMENT_LIMITS.itemChars;
      if (item.length > maxChars) {
        const label =
          field === "must_have"
            ? "Must-have skills"
            : field === "nice_to_have"
            ? "Nice-to-have skills"
            : field.charAt(0).toUpperCase() + field.slice(1);
        problems.push(`${label}: items must be at most ${maxChars} characters.`);
      }
    }
  }

  if (d.languages.length === 0) {
    problems.push("Languages: add at least one language.");
  }

  if (
    !Number.isInteger(d.salary_floor) ||
    d.salary_floor < 0 ||
    d.salary_floor > REQUIREMENT_LIMITS.salaryMax
  ) {
    problems.push(
      `Salary floor must be between 0 and ${REQUIREMENT_LIMITS.salaryMax}.`
    );
  }

  const trimmedTone = d.tone.trim();
  if (trimmedTone === "") {
    problems.push("Letter tone: required.");
  } else {
    if (trimmedTone.length > REQUIREMENT_LIMITS.toneChars) {
      problems.push(`Letter tone: at most ${REQUIREMENT_LIMITS.toneChars} characters.`);
    }
    if (trimmedTone.includes("\n") || trimmedTone.includes("\r")) {
      problems.push("Letter tone: one line only.");
    }
  }

  return problems;
}
