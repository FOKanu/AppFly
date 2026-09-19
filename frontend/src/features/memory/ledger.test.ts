import { describe, expect, it } from "vitest";
import { countByStatus, rollUpByCompany, toTenPointScale, type LedgerEntry } from "./ledger";

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    sourceId: "id",
    company: "Acme",
    role: "Engineer",
    location: "Berlin",
    status: "applied",
    source: "agentur",
    score: 0.8,
    salary: "",
    hasLetter: false,
    url: "",
    ...over,
  };
}

describe("toTenPointScale", () => {
  it("rescales a 0-1 cosine and leaves a 0-10 score alone", () => {
    expect(toTenPointScale(0.86)).toBe(8.6);
    expect(toTenPointScale(8.6)).toBe(8.6);
    expect(toTenPointScale(null)).toBeNull();
    expect(toTenPointScale(undefined)).toBeNull();
  });
});

describe("countByStatus", () => {
  it("counts every status present", () => {
    const counts = countByStatus([
      { status: "applied" },
      { status: "applied" },
      { status: "draft" },
    ]);
    expect(counts.applied).toBe(2);
    expect(counts.draft).toBe(1);
    expect(counts.inbox).toBeUndefined();
  });
});

describe("rollUpByCompany", () => {
  it("groups roles, tallies statuses and keeps the best score", () => {
    const rows = rollUpByCompany([
      entry({ sourceId: "a", role: "Engineer", status: "applied", score: 7 }),
      entry({ sourceId: "b", role: "Staff Engineer", status: "approved", score: 9 }),
      entry({ sourceId: "c", company: "Globex", status: "applied", score: 6 }),
    ]);

    const acme = rows.find((row) => row.company === "Acme");
    expect(acme?.roles).toEqual(["Engineer", "Staff Engineer"]);
    expect(acme?.applied).toBe(1);
    expect(acme?.approved).toBe(1);
    expect(acme?.bestScore).toBe(9);
    // Busiest company sorts first.
    expect(rows[0].company).toBe("Acme");
  });

  it("collects distinct salaries only when the packet supplied one", () => {
    const rows = rollUpByCompany([
      entry({ sourceId: "a", salary: "€95–115k" }),
      entry({ sourceId: "b", salary: "€95–115k" }),
      entry({ sourceId: "c", salary: "" }),
    ]);
    expect(rows[0].salaries).toEqual(["€95–115k"]);
  });
});
