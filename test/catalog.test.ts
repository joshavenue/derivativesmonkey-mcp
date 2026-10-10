import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, coerceParam, entry, EXCLUDED_PREFIXES, normalizeExpiry } from "../src/catalog.js";
import { TOOLS } from "../src/views.js";
import { dmUrl } from "../src/client.js";
import { decodeJwt } from "../src/auth.js";

test("every view points at a catalogued, non-excluded endpoint", () => {
  for (const t of TOOLS) {
    assert.match(t.name, /^dm_[a-z_]+$/);
    for (const [name, v] of Object.entries(t.views)) {
      const e = entry(v.path, v.method ?? "GET");
      assert.ok(e, `${t.name}.${name}`);
      assert.ok(!EXCLUDED_PREFIXES.some((p) => v.path.startsWith(p)), `${t.name}.${name} uses an excluded route`);
      assert.ok((v.desc ?? e.description ?? "").length > 10, `${t.name}.${name} has no description`);
      if (e.auth_required) assert.ok(v.auth, `${t.name}.${name} needs auth: true`);
    }
  }
});

test("catalog has no duplicate method+path", () => {
  const seen = new Set<string>();
  for (const e of CATALOG) {
    const k = `${e.method} ${e.path}`;
    assert.ok(!seen.has(k), k);
    seen.add(k);
  }
});

test("expiry spellings normalize to YYYY-MM-DD", () => {
  assert.equal(normalizeExpiry("2026-10-30"), "2026-10-30");
  assert.equal(normalizeExpiry("30OCT26"), "2026-10-30");
  assert.equal(normalizeExpiry("9oct26"), "2026-10-09");
  assert.equal(normalizeExpiry("20261030"), "2026-10-30");
  assert.throws(() => normalizeExpiry("next friday"));
});

test("option_type is spelled per endpoint", () => {
  const pnl = entry("/api/market/pnl-surface");
  const hist = entry("/api/market/strike-insight/history");
  const p = (e: typeof pnl) => e.params.find((x) => x.name === "option_type")!;
  assert.equal(coerceParam(pnl, p(pnl), "C"), "call");
  assert.equal(coerceParam(pnl, p(pnl), "put"), "put");
  assert.equal(coerceParam(hist, p(hist), "call"), "C");
  assert.equal(coerceParam(hist, p(hist), "P"), "P");
  assert.throws(() => coerceParam(hist, p(hist), "straddle"));
});

test("enum params are checked and numbers coerced", () => {
  const movers = entry("/api/scanner/movers");
  const tf = movers.params.find((x) => x.name === "tf")!;
  assert.equal(coerceParam(movers, tf, "1h"), "1h");
  assert.throws(() => coerceParam(movers, tf, "2h"));
  const limit = movers.params.find((x) => x.name === "limit")!;
  assert.equal(coerceParam(movers, limit, "25"), 25);
});

test("client refuses other hosts and non-API routes", () => {
  assert.equal(dmUrl("/api/market/spot"), "https://www.derivativesmonkey.com/api/market/spot");
  assert.throws(() => dmUrl("/auth/login"));
  assert.throws(() => dmUrl("/api/../auth/login?x=@evil.com"), /./);
});

test("JWT payload decoding tolerates garbage", () => {
  const payload = Buffer.from(JSON.stringify({ email: "a@b.c", exp: 123 })).toString("base64url");
  assert.deepEqual(decodeJwt(`x.${payload}.y`), { email: "a@b.c", exp: 123 });
  assert.deepEqual(decodeJwt("not-a-jwt"), {});
});
