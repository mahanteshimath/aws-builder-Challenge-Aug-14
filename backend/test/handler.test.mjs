import assert from "node:assert/strict";
import test from "node:test";
import { HttpError, claimBudget, parseRequest } from "../index.mjs";
import { ARCHETYPES, PALETTES, normalizeScene, renderPoster } from "../poster.mjs";
import { parseJsonObject, toPostcard, SYSTEM } from "../postcard.mjs";

const post = (body) => ({
  requestContext: { http: { method: "POST" } },
  rawPath: "/dream",
  body: typeof body === "string" ? body : JSON.stringify(body),
});

test("routes a valid dream to create", () => {
  assert.deepEqual(parseRequest(post({ dreamText: "  a paper train  " })), {
    route: "create",
    dreamText: "a paper train",
  });
});

test("routes a permalink to read", () => {
  const event = { requestContext: { http: { method: "GET" } }, rawPath: "/p/abc-123" };
  assert.deepEqual(parseRequest(event), { route: "read", id: "abc-123" });
});

test("rejects empty, oversized, and malformed input at the boundary", () => {
  const rejects = [
    post({ dreamText: "   " }),
    post({}),
    post({ dreamText: "x".repeat(501) }),
    post("not json"),
  ];
  for (const event of rejects) {
    assert.throws(() => parseRequest(event), (err) => err instanceof HttpError && err.status === 400);
  }
});

test("unknown routes 404 instead of falling through to Bedrock", () => {
  const event = { requestContext: { http: { method: "GET" } }, rawPath: "/../secrets" };
  assert.throws(() => parseRequest(event), (err) => err.status === 404);
});

test("the daily cap blocks the request that would exceed it", async () => {
  let spent = 0;
  const cap = 3;
  const fakeDb = {
    send() {
      if (spent >= cap) {
        return Promise.reject(Object.assign(new Error(), { name: "ConditionalCheckFailedException" }));
      }
      spent += 1;
      return Promise.resolve({});
    },
  };

  for (let i = 0; i < cap; i++) await claimBudget("2026-08-14", cap, fakeDb);
  await assert.rejects(
    claimBudget("2026-08-14", cap, fakeDb),
    (err) => err instanceof HttpError && err.status === 429,
  );
  assert.equal(spent, cap, "no budget was claimed past the cap");
});

test("model prose around the JSON is stripped before parsing", () => {
  const padded = 'Understood, here is your reply:\n```json\n{"a":1}\n```\nHope that helps!';
  assert.deepEqual(parseJsonObject(padded), { a: 1 });
  assert.throws(() => parseJsonObject("no object here"));
});

test("a raw newline inside a string value does not crash the parse", () => {
  assert.deepEqual(parseJsonObject('{"note":"line one\nline two"}'), { note: "line one line two" });
  assert.deepEqual(parseJsonObject('{"note":"tab\there"}'), { note: "tab here" });
});

test("a postcard missing required prose is rejected", () => {
  const ok = { destination: "THE PAPER COAST", note: "n", postmark: "p", stamp: "s" };
  assert.equal(toPostcard(ok).destination, "THE PAPER COAST");
  assert.throws(() => toPostcard({ ...ok, note: "   " }), /note/);
});

test("an explicit celebration pins the tricolour palette, whatever the model picked", () => {
  const ok = { destination: "D", note: "n", postmark: "p", stamp: "s", palette: "dusk" };
  for (const dream of ["happy independence day india", "a parade with flags", "Diwali on the roof"]) {
    assert.equal(toPostcard(ok, dream).scene.palette, "tricolour", dream);
  }
  assert.equal(toPostcard(ok, "a quiet grey beach").scene.palette, "dusk");
});

test("hostile or nonsense art direction is clamped, never trusted", () => {
  const scene = normalizeScene(
    { archetype: "<script>alert(1)</script>", palette: "__proto__", sunY: 99, birds: -40 },
    "seed",
  );
  assert.ok(ARCHETYPES.includes(scene.archetype));
  assert.ok(scene.palette in PALETTES);
  assert.equal(scene.sunY, 1);
  assert.equal(scene.birds, 0);
});

test("the poster renders valid standalone SVG and never echoes model strings", () => {
  const svg = renderPoster({ archetype: "waves", palette: "dusk", sunY: 0.4, birds: 4 }, "abc");
  assert.match(svg, /^<svg[^>]*viewBox="0 0 600 400"/);
  assert.match(svg, /<\/svg>$/);
  assert.ok(!/<script|onload=|foreignObject/i.test(svg));

  const hostile = renderPoster({ archetype: '"><script>x</script>', palette: "noon" }, "abc");
  assert.ok(!hostile.includes("<script"));
});

test("the same id always redraws the same poster", () => {
  const scene = { archetype: "mountains", palette: "night", sunY: 0.2, birds: 5 };
  assert.equal(renderPoster(scene, "same-id"), renderPoster(scene, "same-id"));
  assert.notEqual(renderPoster(scene, "same-id"), renderPoster(scene, "other-id"));
});

test("every archetype and palette the renderer supports is offered to the model", () => {
  for (const name of [...ARCHETYPES, ...Object.keys(PALETTES)]) {
    assert.ok(SYSTEM.includes(name), `"${name}" is missing from the system prompt`);
  }
});

test("every palette renders", () => {
  for (const palette of Object.keys(PALETTES)) {
    assert.match(renderPoster({ archetype: "city", palette }, palette), /^<svg[\s\S]*<\/svg>$/);
  }
});
