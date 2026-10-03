// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BANNED_BRANDS, BANNED_HOSTS } from "./policy";

describe("policy", () => {
  it("BANNED_HOSTS mirrors policy.py DENIED_ROOT_DOMAINS", () => {
    const backendPolicyPath = fileURLToPath(new URL("../../../backend/src/jobhunt/policy.py", import.meta.url));
    const policyContent = readFileSync(backendPolicyPath, "utf-8");

    // Find the DENIED_ROOT_DOMAINS section
    const startIndex = policyContent.indexOf("DENIED_ROOT_DOMAINS");
    const endIndex = policyContent.indexOf("}", startIndex);
    const section = policyContent.substring(startIndex, endIndex + 1);

    // Extract all quoted hosts
    const hosts = [...section.matchAll(/"([^"]+)"/g)].map(match => match[1]);

    expect(hosts).toHaveLength(10);
    expect([...BANNED_HOSTS].sort()).toEqual([...hosts].sort());
  });

  it("pages use the shared list", () => {
    const workflowPath = fileURLToPath(new URL("../features/workflow/WorkflowPage.tsx", import.meta.url));
    const profilePath = fileURLToPath(new URL("../features/profiles/ProfileRequirements.tsx", import.meta.url));

    const workflowContent = readFileSync(workflowPath, "utf-8");
    const profileContent = readFileSync(profilePath, "utf-8");

    expect(workflowContent).not.toMatch(/const BANNED_HOSTS\s*=/);
    expect(workflowContent).toContain("shared/policy");

    expect(profileContent).not.toMatch(/const BANNED_HOSTS\s*=/);
    expect(profileContent).toContain("shared/policy");
  });

  it("BANNED_BRANDS names every banned host by brand", () => {
    expect([...BANNED_BRANDS]).toEqual(["LinkedIn", "Indeed", "Stepstone", "ZipRecruiter", "Xing", "Glassdoor", "Wellfound (AngelList)"]);
    for (const brand of BANNED_BRANDS) expect(brand).not.toContain(".");
  });
});
