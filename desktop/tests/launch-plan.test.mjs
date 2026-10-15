import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../resources/js/launch-plan.js", import.meta.url), "utf8");
function plan() {
  const ctx = {};
  vm.runInNewContext(src, ctx);
  assert.ok(ctx.AppFlyLaunchPlan, "AppFlyLaunchPlan is not defined");
  return ctx.AppFlyLaunchPlan;
}
const ids = (c) => c.map((x) => x.id);

test("1 dev path -> repo root", () => {
  assert.equal(plan().resolveRoots({ nlPath: "/r/desktop" }).repoRoot, "/r");
});
test("2 neu build output -> repo root", () => {
  assert.equal(plan().resolveRoots({ nlPath: "/r/desktop/dist/AppFly" }).repoRoot, "/r");
});
test("3 installed path -> no repo root", () => {
  const r = plan().resolveRoots({ nlPath: "/opt/AppFly" });
  assert.equal(r.appDir, "/opt/AppFly");
  assert.equal(r.repoRoot, null);
});
test("4 empty path -> both null", () => {
  const r = plan().resolveRoots({ nlPath: "" });
  assert.equal(r.appDir, null);
  assert.equal(r.repoRoot, null);
});
test("5 windows separators and trailing slash", () => {
  const p = plan();
  assert.equal(p.resolveRoots({ nlPath: "C:\\r\\desktop\\" }).repoRoot, "C:/r");
  assert.equal(p.resolveRoots({ nlPath: "C:/r/desktop/dist/AppFly" }).repoRoot, "C:/r");
});
test("6 linux dev candidates", () => {
  const c = plan().buildCandidates({ nlPath: "/r/desktop", os: "Linux", nlPort: 5174 });
  assert.ok(ids(c).every((id, i) => id === ["sidecar", "venv", "uv", "python"][i]));
  assert.ok(c[2].command.includes("--frozen"));
  assert.equal(c[3].envs.PYTHONPATH, "/r/backend/src");
  assert.equal(c[3].command, "python3 -m jobhunt.api");
});
test("7 windows candidates spawn python directly", () => {
  const c = plan().buildCandidates({ nlPath: "C:\\r\\desktop", os: "Windows", nlPort: 5174 });
  assert.ok(c[1].requires.endsWith(".venv/Scripts/python.exe"));
  for (const x of c) {
    assert.ok(!x.command.includes("bash"));
    assert.ok(!x.command.includes("start-api.sh"));
  }
  assert.equal(c[c.length - 1].command, "python -m jobhunt.api");
});
test("8 packaged path -> sidecar only", () => {
  const c = plan().buildCandidates({ nlPath: "/opt/AppFly", os: "Linux", nlPort: 5174 });
  assert.ok(ids(c).every((id, i) => id === ["sidecar"][i]));
  assert.equal(c[0].requires, "/opt/AppFly/sidecar/python");
});
test("9 parent pid env only when finite", () => {
  const p = plan();
  const a = p.buildCandidates({ nlPath: "/r/desktop", os: "Linux", nlPort: 5174, parentPid: 4242 });
  assert.equal(a[0].envs.APPFLY_PARENT_PID, "4242");
  const b = p.buildCandidates({ nlPath: "/r/desktop", os: "Linux", nlPort: 5174, parentPid: undefined });
  assert.equal("APPFLY_PARENT_PID" in b[0].envs, false);
});
test("10 allowed origins env", () => {
  const c = plan().buildCandidates({ nlPath: "/r/desktop", os: "Linux", nlPort: 5174 });
  assert.equal(c[0].envs.APPFLY_ALLOWED_ORIGINS, "http://localhost:5174,http://127.0.0.1:5174");
});
test("11 failure messages", () => {
  const p = plan();
  const title = "AppFly couldn't start its local engine";
  const pk = p.failureMessage([{ id: "sidecar", label: "bundled Python", waitMs: 20000, outcome: "missing" }], { packaged: true });
  assert.equal(pk.title, title);
  assert.ok(pk.content.includes("sidecar/"));
  const dev = p.failureMessage([{ id: "venv", label: "backend/.venv", waitMs: 20000, outcome: "exited" }], { packaged: false, os: "Linux" });
  assert.ok(dev.content.includes("uv sync"));
  assert.ok(dev.content.includes("python3"));
  const to = p.failureMessage([{ id: "uv", label: "uv", waitMs: 60000, outcome: "timeout" }], { packaged: false });
  assert.ok(to.content.includes("(uv)"));
  assert.ok(to.content.includes("60 s"));
  assert.ok(p.failureMessage([], {}).content.includes("no app path"));
});
