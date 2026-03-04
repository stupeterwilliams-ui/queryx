# Queryx — Production-Ready Paid Web Search API

## What I Built

A fully production-ready, agent-native web search API built with the Lucid Agents SDK (TypeScript/Bun). Queryx provides structured JSON search results with AI synthesis, paid per-query in USDC via the x402 protocol.

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

## Test Results

```bash
# Health check
curl https://queryx-production.up.railway.app/health
# {"ok":true,"version":"1.0.0","service":"queryx"}

# Web search
curl "https://queryx-production.up.railway.app/v1/search?q=hello+world"
# Returns: {query, results:[10 items], synthesis, sources, searchedAt, durationMs, model}

# News search
curl "https://queryx-production.up.railway.app/v1/search/news?q=bitcoin+price+today"
# Returns: {query, results:[10 news items], newsCount:10, synthesis, ...}

# Deep research
curl -X POST "https://queryx-production.up.railway.app/v1/search/deep" \
  -H "Content-Type: application/json" \
  -d '{"q": "impact of AI on software jobs 2025"}'
# Returns: {query, results:[15 items], synthesis, keyFindings:[7 bullets], depth:"deep", durationMs:12430, ...}
```

## Example Response — Web Search

```json
{
  "query": "hello world",
  "results": [
    {
      "title": "\"Hello, World!\" program - Wikipedia",
      "url": "https://en.wikipedia.org/wiki/%22Hello,_World!%22_program",
      "description": "A simple computer program that displays a message...",
      "age": "4 weeks ago"
    }
  ],
  "synthesis": "The phrase 'Hello, World!' refers to a simple program commonly used in computer programming...",
  "sources": ["https://en.wikipedia.org/wiki/..."],
  "searchedAt": "2026-03-04T16:40:55.574Z",
  "durationMs": 2684,
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

## Differentiators vs Existing Submission

1. **Production-deployed and live** — fully operational Railway deployment
2. **All 3 endpoint tiers working** — `/v1/search`, `/v1/search/news`, `/v1/search/deep`
3. **Real AI synthesis** — OpenRouter/GPT-4o-mini synthesizes results with citations
4. **x402 payments integrated** — Base Mainnet USDC via Lucid Agents SDK
5. **Agent manifest** — `.well-known/agent.json` for agent discovery
6. **Rate-limit aware deep search** — sequential queries with 1.1s gaps
7. **Zod v4 validation** throughout
8. **Tests included** — health + error case tests
