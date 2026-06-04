# Poketrace Slug Audit

Comparing the comprehensive English TCG set list against what Poketrace's `/v1/sets` catalogue + `/v1/cards?set=…` endpoint actually delivered in the 2026‑05‑02 cron sweep.

**Legend**
- ✅ `slug` — INSERTED, real card data
- ⚠️ `slug` — slug accepted by `/cards` but **0 cards** returned (Poketrace data gap)
- ❌ `slug` — slug listed in `/sets` catalogue but `/cards?set=slug` **404s** (Poketrace bug / index gap)
- 🔴 — no plausible slug found anywhere in Poketrace's `/sets` catalogue

---

## 2026 — Mega Evolution era

| Set | Best slug found | Status |
|---|---|---|
| Mega Evolution | `me-mega-evolution` / `me01-mega-evolution` | ⚠️ no cards / ❌ 404 |
| Phantasmal Flames | `me-phantasmal-flames` / `me02-phantasmal-flames` | ⚠️ no cards / ❌ 404 |
| Ascended Heroes | `me-ascended-heroes` | ✅ **400 cards / 74 PSA10** |
| Perfect Order | `me-perfect-order` / `me03-perfect-order` | ⚠️ no cards / ❌ 404 |

## 2025 — Scarlet & Violet (late)

| Set | Best slug found | Status |
|---|---|---|
| Prismatic Evolutions | `sv-scarlet-and-violet-prismatic-evolutions` / `sv-prismatic-evolutions` | ⚠️ no cards / ❌ 404 |
| Journey Together | `sv-scarlet-and-violet-journey-together` / `sv09-journey-together` | ⚠️ / ❌ |
| Destined Rivals | `sv-scarlet-and-violet-destined-rivals` / `sv10-destined-rivals` | ⚠️ / ❌ |
| Black Bolt | `sv-scarlet-and-violet-black-bolt` / `sv11b-black-bolt` / `sv-black-bolt` | ⚠️ / ❌ / ❌ |
| White Flare | `sv-scarlet-and-violet-white-flare` / `sv11w-white-flare` / `sv-white-flare` | ⚠️ / ❌ / ❌ |

## 2024 — SV mid

| Set | Best slug found | Status |
|---|---|---|
| Paldean Fates | `sv-scarlet-and-violet-paldean-fates` / `sv-paldean-fates` | ⚠️ / ❌ |
| Temporal Forces | `sv-scarlet-and-violet-temporal-forces` / `sv05-temporal-forces` | ⚠️ / ❌ |
| Twilight Masquerade | `sv-scarlet-and-violet-twilight-masquerade` / `sv06-twilight-masquerade` | ⚠️ / ❌ |
| Shrouded Fable | `sv-scarlet-and-violet-shrouded-fable` / `sv-shrouded-fable` | ⚠️ / ❌ |
| Stellar Crown | `sv-scarlet-and-violet-stellar-crown` / `sv07-stellar-crown` | ⚠️ / ❌ |
| Surging Sparks | `sv-scarlet-and-violet-surging-sparks` / `sv08-surging-sparks` | ⚠️ / ❌ |

## 2023 — SV launch

| Set | Best slug found | Status |
|---|---|---|
| Scarlet & Violet Base | `sv-scarlet-and-violet-base-set` / `sv01-scarlet-and-violet-base-set` | ⚠️ / ❌ |
| Paldea Evolved | `sv-scarlet-and-violet-paldea-evolved` / `sv02-paldea-evolved` | ⚠️ / ❌ |
| Obsidian Flames | `sv-scarlet-and-violet-obsidian-flames` / `sv03-obsidian-flames` | ⚠️ / ❌ |
| 151 | `sv-scarlet-and-violet-151` | ❌ 404 (regression — used to work) |
| Paradox Rift | `sv-scarlet-and-violet-paradox-rift` / `sv04-paradox-rift` | ⚠️ / ❌ |

## 2020-2023 — Sword & Shield

| Set | Best slug found | Status |
|---|---|---|
| Sword & Shield (base) | `swsh01-sword-and-shield-base-set` | ❌ 404 |
| Rebel Clash | `swsh02-rebel-clash` | ❌ 404 |
| Darkness Ablaze | `swsh03-darkness-ablaze` | ❌ 404 |
| Champion's Path | `swsh-champions-path` | ❌ 404 |
| Vivid Voltage | `swsh04-vivid-voltage` | ❌ 404 |
| Shining Fates | `swsh-shining-fates` / `shining-fates-shiny-vault` | ❌ / ✅ Shiny Vault subset only (122 cards) |
| Battle Styles | `swsh05-battle-styles` | ❌ 404 |
| Chilling Reign | `swsh06-chilling-reign` | ❌ 404 |
| Evolving Skies | `swsh07-evolving-skies` | ❌ 404 |
| Celebrations | `celebrations-classic-collection` | ✅ Classic Collection subset only (25 cards). Main set: ❌ |
| Fusion Strike | `swsh08-fusion-strike` | ❌ 404 |
| Brilliant Stars | `swsh09-brilliant-stars` | ❌ 404 |
| Astral Radiance | `swsh10-astral-radiance` | ❌ 404 |
| Pokémon GO | `s10b-pokemon-go` | ❌ 404 |
| Lost Origin | `swsh11-lost-origin` | ❌ 404 |
| Silver Tempest | `swsh12-silver-tempest` | ❌ 404 |
| Crown Zenith | `swsh-crown-zenith-galarian-gallery` | ✅ Galarian Gallery subset only (70 cards). Main set: ❌ |
| **SWSH Promos (whole era)** | `swsh-sword-and-shield-promo-cards` | ✅ **343 cards / 203 PSA10** |

## 2017-2019 — Sun & Moon

| Set | Best slug found | Status |
|---|---|---|
| Sun & Moon (base) | `sm-sun-moon` / `sm-base-set` | ❌ / ❌ |
| Guardians Rising | `sm-guardians-rising` | ❌ 404 |
| Burning Shadows | `sm-burning-shadows` | ❌ 404 |
| Shining Legends | `sm-shining-legends` / `sm3plus-shining-legends` | ❌ / ❌ |
| Crimson Invasion | `sm-crimson-invasion` | ❌ 404 |
| Ultra Prism | `sm-ultra-prism` | ❌ 404 |
| Forbidden Light | `sm6-forbidden-light` | ❌ 404 |
| Celestial Storm | `sm-celestial-storm` | ❌ 404 |
| Dragon Majesty | `sm-dragon-majesty` | ❌ 404 |
| Lost Thunder | `sm-lost-thunder` | ❌ 404 |
| Team Up | `sm-team-up` | ❌ 404 |
| **Detective Pikachu** | `detective-pikachu` | ✅ **39 cards / 22 PSA10** |
| Unbroken Bonds | `sm-unbroken-bonds` | ❌ 404 |
| Unified Minds | `sm-unified-minds` | ❌ 404 |
| **Hidden Fates** | `hidden-fates` | ✅ **152 cards / 110 PSA10** |
| Cosmic Eclipse | `sm-cosmic-eclipse` / `sm12-alter-genesis` | ❌ / ❌ |

## 2014-2016 — XY

| Set | Best slug found | Status |
|---|---|---|
| Kalos Starter | `xy-kalos-starter-set` | ❌ 404 |
| XY (base) | `xy-base-set` / `xy-beginning-set` | ❌ / ❌ |
| Flashfire | `xy-flashfire` | ❌ 404 |
| Furious Fists | `xy-furious-fists` | ❌ 404 |
| Phantom Forces | `xy-phantom-forces` | ❌ 404 |
| Primal Clash | `xy-primal-clash` | ❌ 404 |
| Double Crisis | `xy-double-crisis` | ❌ 404 |
| Roaring Skies | `xy-roaring-skies` | ❌ 404 |
| Ancient Origins | `xy-ancient-origins` | ❌ 404 |
| BREAKthrough | `xy-breakthrough` | ❌ 404 |
| BREAKpoint | `xy-breakpoint` | ❌ 404 |
| Generations | `xy-generations` | ❌ 404 |
| Fates Collide | `xy-fates-collide` | ❌ 404 |
| Steam Siege | `xy-steam-siege` | ❌ 404 |
| Evolutions | `xy-evolutions` | ❌ 404 |

## 2011-2013 — Black & White

| Set | Best slug found | Status |
|---|---|---|
| Black & White (base) | `bw-black-white` | ❌ 404 |
| Emerging Powers | `bw-emerging-powers` | ❌ 404 |
| Noble Victories | `bw-noble-victories` / `noble-victories-zweilous` | ❌ / ⚠️ |
| Next Destinies | `bw-next-destinies` | ❌ 404 |
| Dark Explorers | `bw-dark-explorers` | ❌ 404 |
| Dragons Exalted | `bw-dragons-exalted` | ❌ 404 |
| Dragon Vault | `bw-dragon-vault` | ❌ 404 |
| Boundaries Crossed | `bw-boundaries-crossed` | ❌ 404 |
| Plasma Storm | `bw-plasma-storm` | ❌ 404 |
| Plasma Freeze | `bw-plasma-freeze` | ❌ 404 |
| Plasma Blast | `bw-plasma-blast` / `plasma-blast-machoke` | ❌ / ⚠️ |
| Legendary Treasures | `bw-legendary-treasures` / `legendary-treasures-zapdos` / `legendary-treasures-radiant-collection` | ❌ / ❌ / ❌ |
| Call of Legends | `col-call-of-legends` | ❌ 404 |

## 2010 — HeartGold & SoulSilver

| Set | Best slug found | Status |
|---|---|---|
| HGSS Base | `hgss-heartgold-soulsilver` | ❌ 404 |
| Unleashed | `hgss-unleashed` | ❌ 404 |
| Undaunted | `hgss-undaunted` | ❌ 404 |
| Triumphant | `hgss-triumphant` | ❌ 404 |
| Call of Legends | `col-call-of-legends` | ❌ 404 |
| **HGSS Promos** | `hgss-promos` | ✅ **38 cards / 11 PSA10** |

## 2009 — Platinum

| Set | Best slug found | Status |
|---|---|---|
| Platinum | `pl-platinum` | ❌ 404 |
| Rising Rivals | `pl-rising-rivals` | ❌ 404 |
| Supreme Victors | `pl-supreme-victors` | ❌ 404 |
| Arceus | `pl-arceus` | ❌ 404 |

## 2007-2008 — Diamond & Pearl

| Set | Best slug found | Status |
|---|---|---|
| Diamond & Pearl | `dp-diamond-pearl` | ❌ 404 |
| Mysterious Treasures | `dp-mysterious-treasures` | ❌ 404 |
| Secret Wonders | `dp-secret-wonders` | ❌ 404 |
| Great Encounters | `dp-great-encounters` | ❌ 404 |
| Majestic Dawn | `dp-majestic-dawn` | ❌ 404 |
| Legends Awakened | `dp-legends-awakened` | ❌ 404 |
| Stormfront | `dp-stormfront` | ❌ 404 |

## 2003-2007 — EX Era (16 sets)

All 16 EX sets show as `❌ 404`:
`ex-ruby-and-sapphire`, `ex-sandstorm`, `ex-dragon`, `ex-team-magma-vs-team-aqua`, `ex-hidden-legends`, `ex-firered-and-leafgreen`, `ex-team-rocket-returns`, `ex-deoxys`, `ex-emerald`, `ex-unseen-forces`, `ex-delta-species`, `ex-legend-maker`, `ex-holon-phantoms`, `ex-crystal-guardians`, `ex-dragon-frontiers`, `ex-power-keepers`.

## 2002-2003 — e-Card

| Set | Best slug found | Status |
|---|---|---|
| **Expedition Base Set** | `expedition` | ✅ **327 cards / 309 PSA10** 🌟 best PSA10 haul of any set |
| Aquapolis | `aquapolis` | ❌ 404 |
| Skyridge | `skyridge` | ❌ 404 |

## 2002 — Legendary Collection

| Set | Slug | Status |
|---|---|---|
| Legendary Collection | `legendary-collection` | ❌ 404 |

## 2000-2002 — Neo

| Set | Slug | Status |
|---|---|---|
| Neo Genesis | `neo-genesis` | ❌ 404 |
| Neo Discovery | `neo-discovery` | ❌ 404 |
| Neo Revelation | `neo-revelation` | ❌ 404 |
| Neo Destiny | `neo-destiny` | ❌ 404 |

## 1999-2000 — Original (WOTC)

| Set | Slug | Status |
|---|---|---|
| Base Set | `base-set` / `base-set-shadowless` | ❌ / ❌ |
| Jungle | `jungle` | ❌ 404 |
| Fossil | `fossil` | ❌ 404 |
| Base Set 2 | `base-set-2` | ❌ 404 |
| Team Rocket | `team-rocket` / `team-rocket-porygon` | ❌ / ❌ |
| Gym Heroes | `gym-heroes` | ❌ 404 |
| Gym Challenge | `gym-challenge` | ❌ 404 |

---

## Summary

| Status | Count | What it means |
|---|---|---|
| ✅ Inserted (English flagship/major) | **5** | Ascended Heroes, Hidden Fates, Detective Pikachu, Expedition, SWSH Promos |
| ✅ Inserted (English subsets) | **3** | Crown Zenith Galarian Gallery, Shining Fates Shiny Vault, Celebrations Classic Collection |
| ⚠️ no_cards (waiting on Poketrace data) | **~22 SV sets** | Slug accepted, 0 cards |
| ❌ 404 (Poketrace catalogue lists, but `/cards` 404s) | **~80 SWSH/SM/XY/BW/DP/PL/HGSS/EX/Original/Neo/e-Card sets** | Poketrace bug — slug appears in `/sets` but doesn't resolve in `/cards` |
| 🔴 Not in catalogue | **~0** | Every English set name is in Poketrace's catalogue somewhere |

## What you can manually fix

The ❌ 404s are not fixable by changing slugs — Poketrace's `/sets` endpoint returns these slugs but their `/cards` endpoint 404s. That's their data gap.

The ⚠️ no_cards SV sets — same story; Poketrace knows the slug, hasn't indexed cards.

**The realistic path forward:**

1. Accept Poketrace simply doesn't have US market data for English flagship sets pre‑Ascended Heroes.
2. The Japanese L‑series (Soulsilver Collection, Revival Legends, Clash at the Summit) ≈ HGSS in JP — those work, and the cards are graphically identical to the English HGSS releases. Same for `expansion-pack` (≈ SV Base) and `magma-vs-aqua-two-ambitions` (≈ EX Team Magma vs Aqua).
3. If you have a different price source you trust for legacy English (PriceCharting, TCGplayer), that'd unblock everything pre‑2024. But within Poketrace alone, we're capped at the ~69 sets we have.

If you can spot a slug pattern I missed (e.g. `sm7-celestial-storm` in some other format, or a US‑specific override at Poketrace), drop it in and I'll wire it up.
