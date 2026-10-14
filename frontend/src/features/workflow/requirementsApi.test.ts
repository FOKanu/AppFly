import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiGet, apiPut } from "../../shared/api/client";
import {
  fetchRequirements,
  saveRequirements,
  toDraft,
  sameDraft,
  limitProblems,
  REQUIREMENT_LIMITS,
  LIST_FIELDS,
  RequirementsDraft,
} from "./requirementsApi";

vi.mock("../../shared/api/client", () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

const DRAFT: RequirementsDraft = {
  locations: ["Berlin"],
  salary_floor: 60000,
  languages: ["de", "en"],
  banned_terms: ["Zeitarbeit"],
  skip_companies: ["Acme"],
  must_have: ["Python"],
  nice_to_have: ["Rust"],
  tone: "warm, specific",
};

describe("requirementsApi", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
    vi.mocked(apiPut).mockReset();
  });

  it("fetchRequirements calls apiGet with exactly '/requirements'", async () => {
    const mockResponse = { ...DRAFT, storage_backend: "native" };
    vi.mocked(apiGet).mockResolvedValue(mockResponse);

    const result = await fetchRequirements();

    expect(apiGet).toHaveBeenCalledWith("/requirements");
    expect(result).toEqual(mockResponse);
  });

  it("saveRequirements calls apiPut with correct parameters", async () => {
    const mockResponse = { ...DRAFT, storage_backend: "native" };
    vi.mocked(apiPut).mockResolvedValue(mockResponse);

    const result = await saveRequirements(DRAFT);

    expect(apiPut).toHaveBeenCalledWith(
      "/requirements",
      expect.objectContaining({
        locations: DRAFT.locations,
        salary_floor: DRAFT.salary_floor,
        languages: DRAFT.languages,
        banned_terms: DRAFT.banned_terms,
        skip_companies: DRAFT.skip_companies,
        must_have: DRAFT.must_have,
        nice_to_have: DRAFT.nice_to_have,
        tone: DRAFT.tone,
      })
    );

    // Verify that storage_backend is not in the body
    const callArgs = vi.mocked(apiPut).mock.calls[0];
    const body = callArgs[1];
    expect("storage_backend" in body).toBe(false);

    expect(result).toEqual(mockResponse);
  });

  it("sameDraft works correctly", () => {
    // Test that identical drafts are equal
    expect(sameDraft(DRAFT, toDraft(DRAFT))).toBe(true);

    // Test that changing each field results in different drafts
    for (const field of LIST_FIELDS) {
      const changedDraft = { ...DRAFT };
      if (Array.isArray(changedDraft[field])) {
        changedDraft[field] = [...changedDraft[field], "x"];
      } else if (field === "salary_floor") {
        changedDraft[field] += 1;
      } else if (field === "tone") {
        changedDraft[field] += "!";
      }
      expect(sameDraft(DRAFT, changedDraft)).toBe(false);
    }
  });

  it("limitProblems returns empty array for valid draft", () => {
    expect(limitProblems(DRAFT)).toEqual([]);
  });

  it("limitProblems detects must-have limit exceeded", () => {
    const draftWithTooManyMustHaves = {
      ...DRAFT,
      must_have: Array(11).fill("skill"),
    };
    const problems = limitProblems(draftWithTooManyMustHaves);
    expect(problems.some(p => p.includes("Must-have"))).toBe(true);
  });

  it("limitProblems detects empty languages", () => {
    const draftWithEmptyLanguages = {
      ...DRAFT,
      languages: [],
    };
    const problems = limitProblems(draftWithEmptyLanguages);
    expect(problems.some(p => p.includes("Languages"))).toBe(true);
  });

  it("limitProblems detects tone too long", () => {
    const draftWithLongTone = {
      ...DRAFT,
      tone: "x".repeat(201),
    };
    const problems = limitProblems(draftWithLongTone);
    expect(problems.some(p => p.includes("Letter tone") && p.includes("200"))).toBe(true);
  });

  it("limitProblems detects tone with newline", () => {
    const draftWithNewlineTone = {
      ...DRAFT,
      tone: "a\nb",
    };
    const problems = limitProblems(draftWithNewlineTone);
    expect(problems.some(p => p.includes("one line"))).toBe(true);
  });
});
