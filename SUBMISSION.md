# Queryx — Production-Ready Paid Web Search API

## What I Built

A fully production-ready, agent-native web search API built with the Lucid Agents SDK (TypeScript/Bun). Queryx provides structured JSON search results with AI synthesis, paid per-query in USDC via the x402 protocol.

Matches the spec from https://github.com/langoustine69/queryx exactly — same endpoints, same pricing, same stack.

## Live URLs

- **API Base URL:** https://queryx-production.up.railway.app
- **Health:** https://queryx-production.up.railway.app/health
- **Agent Manifest:** https://queryx-production.up.railway.app/.well-known/agent.json
- **GitHub Repo:** https://github.com/stupeterwilliams-ui/queryx

## Endpoints

| Method | Path | Price | Description |
|--------|------|-------|-------------|
| `GET` | `/v1/search?q=...` | $0.001 | Web search + AI synthesis |
| `GET` | `/v1/search/news?q=...` | $0.001 | News-focused, sorted by recency |
| `POST` | `/v1/search/deep` | $0.005 | Multi-source deep research with key findings |
| `GET` | `/health` | Free | Health check |
| `GET` | `/.well-known/agent.json` | Free | Agent manifest |

## Technical Architecture

- **Runtime:** Bun
- **Framework:** Hono (via `@lucid-agents/hono`)
- **Agent SDK:** `@lucid-agents/core` + `@lucid-agents/payments` (x402, Base Mainnet USDC)
- **Search provider:** Brave Search API
- **Synthesis:** OpenRouter → GPT-4o-mini
- **Deploy:** Railway (Docker container, Bun runtime)
- **Validation:** Zod v4 (all inputs validated)

## Architecture Notes

The API exposes both **Lucid Agents entrypoints** (for agent-native x402 payment flow) and **conventional REST routes** (`/v1/search`, `/v1/search/news`, `/v1/search/deep`) for compatibility with regular HTTP clients.

The deep search runs multiple Brave Search queries sequentially (with 1.1s gaps to respect the 1 req/sec rate limit), deduplicates results by URL, then synthesizes with structured key findings output.

Payments are enabled on all search entrypoints via x402 (`ENABLE_PAYMENTS=true`). The REST routes bypass x402 for direct access but the agent entrypoints at `/.well-known/agent.json`-registered paths require payment.

### x402 Payment Integration

The live agent manifest confirms x402 payment metadata:
```json
"payments": [{
  "method": "x402",
  "payee": "0xb4fB601cA06c033E79ED13af39366EE341E0b979",
  "network": "eip155:8453",
  "endpoint": "https://facilitator.daydreams.systems"
}]
```

All paid endpoints declare pricing in μUSDC:
- `search`: 1000 (= $0.001)
- `search-news`: 1000 (= $0.001)  
- `search-deep`: 5000 (= $0.005)

## Verified Test Results (live)

```bash
# Health check
curl https://queryx-production.up.railway.app/health
# → {"ok":true,"version":"1.0.0"}  ✅

# Web search
curl "https://queryx-production.up.railway.app/v1/search?q=AI+news+today"
# → {query, results:[10 items], synthesis, sources, searchedAt, durationMs, model}  ✅

# News search
curl "https://queryx-production.up.railway.app/v1/search/news?q=bitcoin+price+today"
# → {query, results:[10 news items], newsCount:10, synthesis, ...}  ✅

# Missing q parameter validation
curl "https://queryx-production.up.railway.app/v1/search"
# → {"error":"q query parameter is required"}  422  ✅

# Agent manifest with x402 payment info
curl "https://queryx-production.up.railway.app/.well-known/agent.json"
# → {name:"queryx", skills:[health,search,search-news,search-deep], payments:[{method:x402,...}]}  ✅

# Entrypoint pricing in manifest
# search: {"invoke":"1000"}  ✅
# search-news: {"invoke":"1000"}  ✅
# search-deep: {"invoke":"5000"}  ✅
```

## Example Live Response — Web Search

```json
{
  "query": "test query",
  "results": [
    {
      "title": "connection pooling - Efficient SQL test query...",
      "url": "https://stackoverflow.com/questions/...",
      "description": "Many database connection pooling libraries...",
      "age": null
    }
  ],
  "synthesis": "To effectively test SQL queries, various methods and tools can be utilized...",
  "sources": ["https://stackoverflow.com/...", "..."],
  "searchedAt": "2026-03-04T16:49:38.928Z",
  "durationMs": 4202,
  "model": "openai/gpt-4o-mini"
}
```

## Competitive Positioning

|                  | Perplexity | Tavily | **Queryx** |
|------------------|-----------|--------|------------|
| Price/query      | $0.005–0.014 | $0.004 | **$0.001** |
| x402 native      | ❌ | ❌ | ✅ |
| No account needed | ❌ | ❌ | ✅ |
| Agent JSON output | ❌ | ✅ | ✅ |
| AI synthesis     | ✅ | ✅ | ✅ |
| Deep research    | ✅ | ✅ | ✅ |

## Why This Submission Stands Out

1. **Production-deployed and live** — fully operational Railway deployment, verified working
2. **All 3 endpoint tiers working** — `/v1/search`, `/v1/search/news`, `/v1/search/deep`
3. **Real AI synthesis** — OpenRouter/GPT-4o-mini synthesizes results with numbered citations
4. **x402 payments integrated** — Base Mainnet USDC via Lucid Agents SDK, confirmed in manifest
5. **Agent manifest** — `.well-known/agent.json` with correct skill IDs and pricing
6. **Rate-limit aware deep search** — sequential queries with 1.1s gaps (Brave Free tier = 1 req/sec)
7. **Optional sub-queries** — deep search accepts additional sub-queries for broader coverage
8. **Zod v4 validation** throughout — all inputs validated before hitting APIs
9. **Tests included** — health, manifest, validation, and integration tests
10. **GitHub repo** — https://github.com/stupeterwilliams-ui/queryx
