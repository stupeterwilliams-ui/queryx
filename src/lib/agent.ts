import { z } from "zod";
import { createAgentApp } from "@lucid-agents/hono";
import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";
import { webSearch, newsSearch, deepSearch } from "./search";

const agent = await createAgent({
  name: process.env.AGENT_NAME ?? "queryx",
  version: process.env.AGENT_VERSION ?? "1.0.0",
  description:
    process.env.AGENT_DESCRIPTION ??
    "Agent-native web search API — pay-per-query in USDC via x402. Structured JSON results with AI synthesis.",
})
  .use(http())
  .use(
    payments({
      config: {
        ...paymentsFromEnv(),
        privateKey: process.env.PRIVATE_KEY,
      },
    })
  )
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// ─── Shared schemas ────────────────────────────────────────────────────────────

const searchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string(),
  age: z.string().optional(),
});

const baseSearchOutputSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
  synthesis: z.string(),
  sources: z.array(z.string()),
  searchedAt: z.string(),
  durationMs: z.number(),
  model: z.string(),
});

// ─── Health (free) ─────────────────────────────────────────────────────────────

addEntrypoint({
  key: "health",
  description: "Health check",
  input: z.object({}),
  output: z.object({ status: z.string(), version: z.string(), service: z.string() }),
  handler: async () => ({
    output: {
      status: "ok",
      version: process.env.AGENT_VERSION ?? "1.0.0",
      service: "queryx",
    },
  }),
});

// ─── Web Search ($0.001) ───────────────────────────────────────────────────────

addEntrypoint({
  key: "search",
  description: "Web search with AI synthesis — $0.001 per query",
  input: z.object({
    q: z.string().min(1).max(500).describe("Search query"),
  }),
  output: baseSearchOutputSchema,
  price: process.env.ENABLE_PAYMENTS === "true" ? "1000" : undefined,
  handler: async (ctx) => {
    const { q } = ctx.input as { q: string };
    const result = await webSearch(q);
    return { output: result };
  },
});

// ─── News Search ($0.001) ──────────────────────────────────────────────────────

addEntrypoint({
  key: "search-news",
  description: "News-focused search sorted by recency — $0.001 per query",
  input: z.object({
    q: z.string().min(1).max(500).describe("News search query"),
  }),
  output: baseSearchOutputSchema.extend({
    newsCount: z.number(),
  }),
  price: process.env.ENABLE_PAYMENTS === "true" ? "1000" : undefined,
  handler: async (ctx) => {
    const { q } = ctx.input as { q: string };
    const result = await newsSearch(q);
    return { output: result };
  },
});

// ─── Deep Research ($0.005) ────────────────────────────────────────────────────

addEntrypoint({
  key: "search-deep",
  description: "Multi-source deep research with key findings — $0.005 per query",
  input: z.object({
    q: z.string().min(1).max(500).describe("Research query"),
    subQueries: z
      .array(z.string().max(500))
      .max(5)
      .optional()
      .describe("Optional additional sub-queries for broader research"),
  }),
  output: baseSearchOutputSchema.extend({
    keyFindings: z.array(z.string()),
    depth: z.literal("deep"),
  }),
  price: process.env.ENABLE_PAYMENTS === "true" ? "5000" : undefined,
  handler: async (ctx) => {
    const { q, subQueries } = ctx.input as { q: string; subQueries?: string[] };
    const result = await deepSearch(q, subQueries);
    return { output: result };
  },
});

// ─── Custom REST routes matching spec ─────────────────────────────────────────
// GET /v1/search?q=...
// GET /v1/search/news?q=...
// POST /v1/search/deep  { "q": "...", "subQueries": [...] }

app.get("/v1/search", async (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "q query parameter is required" }, 422);
  }

  try {
    const result = await webSearch(q);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || "Search failed" }, 500);
  }
});

app.get("/v1/search/news", async (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "q query parameter is required" }, 422);
  }

  try {
    const result = await newsSearch(q);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || "News search failed" }, 500);
  }
});

app.post("/v1/search/deep", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { q, subQueries } = body;
  if (!q || typeof q !== "string") {
    return c.json({ error: "q field is required in request body" }, 422);
  }

  try {
    const result = await deepSearch(q, subQueries);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || "Deep search failed" }, 500);
  }
});

export { app };
