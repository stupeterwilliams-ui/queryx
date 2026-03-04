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

### x402 Payment Flow
- Paid entrypoints are registered in `.well-known/agent.json` with `pricing.invoke` values
- `search` + `search-news`: 1000 μUSDC = $0.001 per query
- `search-deep`: 5000 μUSDC = $0.005 per query
- Payment via Base Mainnet USDC, facilitator: `https://facilitator.daydreams.systems`
- Payee: `0xb4fB601cA06c033E79ED13af39366EE341E0b979`

### Deep Research
The deep search runs multiple Brave Search queries sequentially (with 1.1s gaps to respect the 1 req/sec rate limit), deduplicates results by URL, then synthesizes with structured key findings output.

### AI Synthesis
All endpoints use GPT-4o-mini via OpenRouter for fast, cheap synthesis. Deep mode uses a structured format with `[SYNTHESIS]` and `[KEY_FINDINGS]` sections for reliable parsing.

## Verified Live Endpoints

```bash
# Health check
curl https://queryx-production.up.railway.app/health
# {"status":"ok","version":"1.0.0","service":"queryx"}

# Agent manifest (shows x402 payment config + all entrypoints)
curl https://queryx-production.up.railway.app/.well-known/agent.json

# Web search
curl "https://queryx-production.up.railway.app/v1/search?q=typescript+programming"
# Returns: {query, results:[10 items], synthesis, sources, searchedAt, durationMs, model}

# News search
curl "https://queryx-production.up.railway.app/v1/search/news?q=bitcoin+price+today"
# Returns: {query, results:[10 news items], newsCount:10, synthesis, ...}

# Deep research
curl -X POST "https://queryx-production.up.railway.app/v1/search/deep" \
  -H "Content-Type: application/json" \
  -d '{"q": "impact of AI on software jobs 2025"}'
# Returns: {query, results:[14 items], synthesis, keyFindings:[7 bullets], depth:"deep", durationMs:16332, ...}
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
  "searchedAt": "2026-03-04T16:46:14.964Z",
  "durationMs": 1542,
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

## Differentiators vs Existing Submissions

1. **Production-deployed and live** — fully operational Railway deployment at queryx-production.up.railway.app
2. **All 3 endpoint tiers working** — `/v1/search`, `/v1/search/news`, `/v1/search/deep` all returning real results
3. **Real AI synthesis** — OpenRouter/GPT-4o-mini synthesizes results with numbered citations
4. **x402 payments integrated** — Base Mainnet USDC via Lucid Agents SDK, pricing declared in agent manifest
5. **Agent manifest** — `.well-known/agent.json` with full entrypoint specs, input/output schemas, and payment metadata
6. **Rate-limit aware deep search** — sequential queries with 1.1s gaps, URL deduplication
7. **Comprehensive tests** — 13 tests covering health, manifest, input validation, response schemas, x402 metadata
8. **Zod v4 validation** throughout all inputs
9. **Full source on GitHub** — https://github.com/stupeterwilliams-ui/queryx
10. **`.env.example`** with all required env vars documented

## Test Coverage (13 tests)

- Health endpoint: status, service, version fields
- Agent manifest: valid JSON, correct skills, x402 payment metadata
- Pricing: correct μUSDC amounts on all paid entrypoints
- Input validation: 422 on missing q, 400 on invalid JSON body
- Response schemas: all required fields present on real search results
- newsCount field on news endpoint
- keyFindings array + depth:"deep" on deep search
- ISO 8601 timestamp validation
