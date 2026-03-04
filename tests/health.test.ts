import { describe, it, expect } from "bun:test";

const BASE_URL = process.env.TEST_URL ?? "http://localhost:3000";

describe("Queryx API", () => {
  it("GET /health returns ok", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("queryx");
  });

  it("GET /.well-known/agent.json returns agent manifest", async () => {
    const res = await fetch(`${BASE_URL}/.well-known/agent.json`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toBe("queryx");
  });

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

  it("POST /v1/search/deep without body returns 422 or 400", async () => {
    const res = await fetch(`${BASE_URL}/v1/search/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect([400, 402, 422]).toContain(res.status);
  });
});
