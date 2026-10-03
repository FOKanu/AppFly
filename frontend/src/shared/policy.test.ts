import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BANNED_HOSTS } from "./policy";

describe("policy", () => {
  it("BANNED_HOSTS mirrors policy.py DENIED_ROOT_DOMAINS", () => {
    const backendPolicyPath = resolve(process.cwd(), "../backend/src/jobhunt/policy.py");
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
    const workflowPath = resolve(process.cwd(), "src/features/workflow/WorkflowPage.tsx");
    const profilePath = resolve(process.cwd(), "src/features/profiles/ProfileRequirements.tsx");

    const workflowContent = readFileSync(workflowPath, "utf-8");
    const profileContent = readFileSync(profilePath, "utf-8");

    expect(workflowContent).not.toMatch(/const BANNED_HOSTS\s*=/);
    expect(workflowContent).toContain("shared/policy");

    expect(profileContent).not.toMatch(/const BANNED_HOSTS\s*=/);
    expect(profileContent).toContain("shared/policy");
  });
});
