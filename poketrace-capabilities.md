# Poketrace API — Capabilities Reference

**Base URL:** `https://api.poketrace.com/v1`  
**Auth:** `X-API-Key` header (all endpoints except `/health`)  
**API key:** https://poketrace.com/dashboard  
**Active plan: Pro**

---

## Plans

| Plan      | Daily Limit | Burst Rate          | Markets    | Graded Prices | Real-Time |
|-----------|-------------|---------------------|------------|---------------|-----------|
| Free      | 250 req/day | 1 req / 2 sec       | US only    | Raw only      | No        |
| **Pro ✓** | **10,000/day** | **30 req / 10 sec** | **US + EU** | **PSA, BGS, CGC** | **No** |
| Scale     | 100,000/day | 60 req / 10 sec     | US + EU    | All graders   | WebSocket |

Limits reset at midnight UTC. Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-Plan`.

### What Pro unlocks in this app
- **EU market** — Cardmarket Price Trend (`cardmarket`) and active listings (`cardmarket_unsold`) with country/language breakdown
- **Graded prices** — PSA, BGS, CGC tiers on eBay (graders like ACE, TAG, PCA, SFG, CGS require Scale)
- **10,000 requests/day** — sufficient for scheduled price snapshots, cron jobs, and on-demand refreshes
- WebSocket real-time updates are **not available** on Pro (Scale only)

---

## Markets & Price Sources

### US Market (USD)
| Source      | Tiers available                          |
|-------------|------------------------------------------|
| `ebay`      | Graded tiers + raw conditions            |
| `tcgplayer` | Raw conditions only                      |

### EU Market (EUR)
| Source               | Tiers available                                              |
|----------------------|--------------------------------------------------------------|
| `cardmarket`         | `AGGREGATED` only — verified sales average (avg only)        |
| `cardmarket_unsold`  | Condition/graded tiers with country + language breakdown      |

EU CardMarket returns exact sale counts (`approxSaleCount = false`).

---

## Price Tiers

### Raw Conditions
`MINT`, `NEAR_MINT`, `LIGHTLY_PLAYED`, `MODERATELY_PLAYED`, `HEAVILY_PLAYED`, `DAMAGED`

### Graded (9 companies)
Format: `{COMPANY}_{GRADE}` — half grades use underscore (e.g. `PSA_9_5`, `CGC_9_5`)

Supported graders: **PSA, CGC, BGS, SGC, ACE, TAG, PCA, SFG, CGS**

### TierPrice object
```ts
{
  avg: number
  low: number
  high: number
  saleCount?: number
  lastUpdated: string
  avg1d?: number
  avg7d?: number
  avg30d?: number
  median3d?: number
  median7d?: number
  median30d?: number
  // EU cardmarket_unsold only:
  country?: { [code]: { avg, low, high, saleCount, language?: { [lang]: { avg, low, high, saleCount } } } }
  language?: { [lang]: { avg, low, high, saleCount } }
}
```

---

## Card Variants

| Market | Variants |
|--------|----------|
| US     | Normal, Holofoil, Reverse_Holofoil, 1st_Edition, 1st_Edition_Holofoil, Unlimited |
| EU     | Normal, Holofoil (null → "Normal") |

---

## Endpoints

### `GET /health` — No auth required
```json
{ "status": "healthy", "version": "1.6.0", "codename": "snorlax", "timestamp": "ISO8601", "database": "connected" }
```

### `GET /auth/info`
Returns API key metadata: plan, daily limit, remaining requests, period start, reset time.

### `GET /cards`
Search and list cards. Both individual cards and sealed products are returned from this single endpoint.

**Query params:**
- `search` — name search (case-sensitive; card mechanic tokens like EX, GX, VMAX are auto-uppercased in this app)
- `set` — set slug filter
- `card_number`, `variant`, `rarity`, `game`, `market`
- `tcgplayer_ids`, `cardmarket_ids`, `has_graded`
- `limit` (max 20, default 20), `cursor` (base64 offset), `offset` (integer)

**Response:**
```json
{
  "data": [{ "id", "name", "cardNumber", "set", "variant", "rarity", "image", "game", "market", "currency", "refs", "prices", "lastUpdated" }],
  "pagination": { "hasMore": true, "nextCursor": "...", "count": 20 }
}
```

> Free plan: US raw prices only (eBay + TCGPlayer). Pro/Scale add graded tiers and EU CardMarket data.

### `GET /cards/:id`
Single card with full pricing breakdown by source and tier. Also returns `gradedOptions`, `conditionOptions`, `topPrice`, `totalSaleCount`, `hasGraded`.

Optional query param: `market`

### `GET /cards/:id/prices/:tier/history`
Price history for a specific tier (e.g. `NEAR_MINT`, `PSA_10`, `AGGREGATED`).

**Query params:** `period` (`7d` | `30d` | `90d` | `1y` | `all`), `limit` (max 365, default 30), `cursor`

**Response:** flat entries with a `source` field per record:
```json
{ "data": [{ "date", "source", "avg", "low", "high", "saleCount", "avg1d", "avg7d", "avg30d", "median3d", "median7d", "median30d" }] }
```

### `GET /cards/:id/listings` — Scale plan only
Individual sold eBay listings. Rate limited at 30 req / 30 sec per account.

**Query params:** `limit` (max 20), `cursor`, `grader`, `grade`, `min_price`, `max_price`, `sort` (`sold_at_desc` | `sold_at_asc` | `price_desc` | `price_asc`)

**Response includes:** `id`, `sourceItemId`, `listingType`, `title`, `price`, `currency`, `listingUrl`, `condition`, `grader`, `grade`, `soldAt`, `anomalyFlag?`, `anomalyReason?`

### `GET /sets`
List all sets. Query params: `limit` (max 100, default 50), `cursor`, `search`, `game`.

Response: `{ slug, name, releaseDate, cardCount }` + pagination.

### `GET /sets/:slug`
Single set details including `externalIds` (tcgplayer + cardmarket references).

---

## WebSocket — Scale plan only

**URL:** `wss://api.poketrace.com/v1/ws`  
**Auth:** `X-API-Key` header

| Limit | Value |
|-------|-------|
| Connections per user | 3 |
| Messages per minute | 30 |
| Max message size | 1 KB |

**Events:**
- `connected` — initial handshake confirmation
- `price.card-updated` — fired when a card price changes

```json
{
  "event": "price.card-updated",
  "data": {
    "id": "card-id",
    "source": "ebay | tcgplayer | cardmarket | cardmarket_unsold",
    "tier": "PSA_10",
    "price": 450.00,
    "currency": "USD",
    "country": "DE",
    "avg1d": 445.00,
    "avg7d": 440.00,
    "avg30d": 435.00
  },
  "timestamp": "ISO8601"
}
```

**Keepalive:** send `{ "type": "ping" }` → receive `{ "type": "pong" }`

Source notes:
- `tcgplayer`: includes `tier` + historical averages (`avg1d/7d/30d`)
- `cardmarket`: no `tier` (Price Trend), includes `avg1d/7d/30d`
- `cardmarket_unsold`: includes `tier` and `country`

---

## Pagination

For `/cards`: prefer `cursor` from the previous response. `offset=N` also works directly (e.g. `offset=20`).  
For `/sets`: cursor-based only.

---

## Error Responses

| Status | Body |
|--------|------|
| 400 | `{ "error": "Bad request" }` |
| 401 | `{ "error": "Invalid API key" }` |
| 403 | `{ "error": "Upgrade required", "code": "UPGRADE_REQUIRED" }` |
| 404 | `{ "error": "Not found" }` |
| 429 | `{ "error": "Rate limit exceeded", "usage": {...}, "retryAfter": number }` |

---

## How This App Uses Poketrace

This project integrates Poketrace via `src/lib/poketrace.ts` as the sole pricing backend, replacing PriceCharting, JustTCG, and PokemonPriceTracker.

### Key functions

| Function | Purpose |
|----------|---------|
| `searchPoketrace(query, opts)` | Search cards/products; normalizes result to app format |
| `searchPoketraceByType(query, type, opts)` | Filtered search — `card`, `sealed`, or `all` |
| `getPoketraceCardById(id)` | Fetch a single card by Poketrace ID (normalized) |
| `getRawPoketraceCard(id)` | Fetch unnormalized card (for full graded breakdown) |
| `fetchPoketraceCardsBySet(slug, market, opts)` | Paginate all cards in a set |
| `fetchPoketracePrice(id, grade?, source?)` | Current price for an asset; handles EUR→USD conversion |
| `fetchPoketracePriceBreakdown(id, grade?)` | Per-source price breakdown (TCGPlayer vs eBay vs CardMarket) |
| `getPoketracePriceHistory(id, tier?, start?, end?)` | Historical price data with period fallback |
| `getPoketraceSets(sortBy, sortOrder)` | Full set catalogue (paginated, up to 2000 sets) |
| `extractBestPrice(card)` | Prefers TCGPlayer NM → eBay NM → CardMarket |
| `extractGradedPrice(card, grade)` | Grade-specific price (e.g. "PSA 10") |
| `extractSourcePrices(card, tier)` | All source prices for a given tier |
| `extractAllGradedPrices(card)` | Map of all graded tiers to prices |
| `gradeToPoketraceTier(grade)` | "PSA 10" → "PSA_10", "CGC 9.5" → "CGC_9.5" |
| `inferAssetType(card)` | Heuristic: "card" vs "sealed" based on name/rarity/cardNumber |

### Price source selection logic
- **Graded tiers** (PSA/CGC/BGS): checked on `ebay` first, then `tcgplayer`
- **Raw conditions**: checked on `tcgplayer` first, then `ebay`, then `cardmarket`
- Alias fallback handles casing inconsistencies (`NEAR_MINT` / `Near Mint` / `NM`)

### EUR → USD conversion
EU cards (`currency: "EUR"`) are converted to USD via `src/lib/exchange-rate.ts` before being returned to the UI. The original currency and `isConverted` flag are preserved on the normalized record.

### Sealed product detection
Poketrace serves cards and sealed products through the same `/v1/cards` endpoint. `inferAssetType` uses a keyword list (booster box, ETB, tin, etc.) plus absence of `cardNumber`/`rarity` to classify products.

### API routes that call Poketrace
- `/api/card-detail` — card lookup
- `/api/card-price` — current price
- `/api/price-history` — historical chart data
- `/api/graded-search` — grade-filtered search
- `/api/assets/[id]/refresh-price` — on-demand price refresh
- `/api/cron/record-prices` — scheduled price snapshots
- `/api/cron/check-price-alerts` — price alert evaluation

### Database columns added for Poketrace (`supabase-migration-v8-poketrace.sql`)
- `assets.poketrace_id` — Poketrace card ID
- `assets.poketrace_market` — `US` or `EU`
- `assets.price_currency` — `USD` or `EUR`
- `assets.is_converted_price` — true when EUR was converted
- `price_snapshots.currency`, `.is_converted`, `.exchange_rate`
