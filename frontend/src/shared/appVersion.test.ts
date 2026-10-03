import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./appVersion";

describe("APP_VERSION", () => {
  it("comes from frontend/package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8")) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_VERSION).not.toBe("0.4.2");
  });
});
