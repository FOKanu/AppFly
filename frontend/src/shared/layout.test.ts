import { describe, expect, it } from "vitest";
import { breakpointFromWidth } from "./breakpoint";
import { fixtureFromSearch } from "../app/layout/mobile/screens";
import { isMoreRoute, titleForRoute } from "../app/layout/mobile/nav";

describe("breakpointFromWidth", () => {
  it("keeps 390 and everything under 768 on the mobile shell", () => {
    expect(breakpointFromWidth(390)).toBe("mobile");
    expect(breakpointFromWidth(767)).toBe("mobile");
  });

  it("uses the tablet shell at FigJam 768", () => {
    expect(breakpointFromWidth(768)).toBe("tablet");
    expect(breakpointFromWidth(1023)).toBe("tablet");
  });
});

describe("mobile nav", () => {
  it("treats settings and memory as More destinations", () => {
    expect(isMoreRoute("settings-keys")).toBe(true);
    expect(isMoreRoute("queue")).toBe(false);
    expect(titleForRoute("tonight")).toBe("Tonight");
  });
});

describe("edge fixtures", () => {
  it("parses FigJam 05 preview query params", () => {
    expect(fixtureFromSearch("?state=rate-limited")).toBe("rate-limited");
    expect(fixtureFromSearch("")).toBeNull();
  });
});
