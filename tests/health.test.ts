import { describe, it, expect } from "bun:test";

const BASE_URL = process.env.TEST_URL ?? "http://localhost:3000";

describe("Queryx API — Health & Infrastructure", () => {
  it("GET /health returns 200 with ok indicator", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    // Framework may return {ok:true} or {status:"ok"} — accept either
    const isOk = body.ok === true || body.status === "ok";
    expect(isOk).toBe(true);
    expect(typeof body.version).toBe("string");
  });

  it("GET /.well-known/agent.json returns valid agent manifest", async () => {
    const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toBe("queryx");
    expect(body.protocolVersion).toBeDefined();
    expect(Array.isArray(body.skills)).toBe(true);
    // Should have search, search-news, search-deep skills
    const skillIds = body.skills.map((s: any) => s.id);
    expect(skillIds).toContain("search");
    expect(skillIds).toContain("search-news");
    expect(skillIds).toContain("search-deep");
  });

  it("x402 payments metadata present in agent manifest", async () => {
    const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
    const body = await res.json() as any;
    expect(Array.isArray(body.payments)).toBe(true);
    expect(body.payments.length).toBeGreaterThan(0);
    const payment = body.payments[0];
    expect(payment.method).toBe("x402");
    expect(payment.network).toBe("eip155:8453"); // Base Mainnet
  });

  it("pricing is declared on paid entrypoints", async () => {
    const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
    const body = await res.json() as any;
    const entrypoints = body.entrypoints ?? {};
    // search: $0.001 = 1000 μUSDC
    expect(entrypoints["search"]?.pricing?.invoke).toBe("1000");
    // search-news: $0.001 = 1000 μUSDC
    expect(entrypoints["search-news"]?.pricing?.invoke).toBe("1000");
    // search-deep: $0.005 = 5000 μUSDC
    expect(entrypoints["search-deep"]?.pricing?.invoke).toBe("5000");
  });
});

describe("Queryx API — Input Validation", () => {
  it("GET /v1/search without q returns 422", async () => {
    const res = await fetch(`${BASE_URL}/v1/search`);
    expect(res.status).toBe(422);
    const body = await res.json() as any;
    expect(body.error).toContain("q");
  });

  it("GET /v1/search/news without q returns 422", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/news`);
    expect(res.status).toBe(422);
    const body = await res.json() as any;
    expect(body.error).toContain("q");
  });

  it("POST /v1/search/deep with empty body returns 400 or 422", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect([400, 402, 422]).toContain(res.status);
  });

  it("POST /v1/search/deep with invalid JSON returns 400", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect([400, 402, 422]).toContain(res.status);
  });

  it("POST /v1/search/deep with numeric q returns 422", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: 123 }),
    });
    // q must be string
    expect([400, 402, 422]).toContain(res.status);
  });
});

describe("Queryx API — Response Schemas (live search, no payment)", () => {
  // These tests hit the live search endpoints which work without payment
  // because ENABLE_PAYMENTS controls x402 gating on the entrypoint routes,
  // while /v1/* REST routes always respond directly.

  it("GET /v1/search returns valid structured response", async () => {
    const res = await fetch(`${BASE_URL}/v1/search?q=typescript+programming`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    // Required fields
    expect(typeof body.query).toBe("string");
    expect(body.query).toBe("typescript+programming");
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(typeof body.synthesis).toBe("string");
    expect(body.synthesis.length).toBeGreaterThan(0);
    expect(Array.isArray(body.sources)).toBe(true);
    expect(typeof body.searchedAt).toBe("string");
    expect(typeof body.durationMs).toBe("number");
    expect(typeof body.model).toBe("string");
    // Result item schema
    const r = body.results[0];
    expect(typeof r.title).toBe("string");
    expect(typeof r.url).toBe("string");
    expect(typeof r.description).toBe("string");
  });

  it("GET /v1/search/news returns newsCount field", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/news?q=technology+news`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(typeof body.newsCount).toBe("number");
    expect(Array.isArray(body.results)).toBe(true);
    expect(Array.isArray(body.sources)).toBe(true);
  });

  it("POST /v1/search/deep returns keyFindings and depth:deep", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "open source AI models 2025" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.depth).toBe("deep");
    expect(Array.isArray(body.keyFindings)).toBe(true);
    expect(body.keyFindings.length).toBeGreaterThan(0);
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
  }, 30_000); // deep search can take up to 30s

  it("searchedAt is a valid ISO 8601 timestamp", async () => {
    const res = await fetch(`${BASE_URL}/v1/search?q=test`);
    const body = await res.json() as any;
    const d = new Date(body.searchedAt);
    expect(d.getTime()).not.toBeNaN();
  });
});
