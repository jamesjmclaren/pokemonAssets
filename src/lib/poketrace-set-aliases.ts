/**
 * Poketrace's /sets and /cards endpoints aren't always consistent about
 * the slug a given set is indexed under — /sets may surface a set as
 * "151" while the cards index requires "sv-scarlet-and-violet-151".
 * This module holds the known set name → candidate slug mappings so the
 * cron and the user-facing /api/set-trends route can both fall through
 * the candidate list when the primary slug returns zero cards.
 */

export interface SupplementalSet {
  name: string;
  slugs: string[];
}

export const SUPPLEMENTAL_SETS: SupplementalSet[] = [
  // ---- 2026 / Mega Evolution era ----
  // Confirmed pattern: me-{name} (from cron: me-ascended-heroes worked)
  { name: "Perfect Order", slugs: ["me-perfect-order", "me-mega-evolution-perfect-order", "perfect-order"] },
  { name: "Ascended Heroes", slugs: ["me-ascended-heroes", "sv-scarlet-and-violet-ascended-heroes", "ascended-heroes"] },
  { name: "Phantasmal Flames", slugs: ["me-phantasmal-flames", "me-mega-evolution-phantasmal-flames", "phantasmal-flames"] },
  { name: "Mega Evolution", slugs: ["me-mega-evolution", "mega-evolution"] },
  // ---- 2025 era (SV) ----
  { name: "White Flare", slugs: ["sv-scarlet-and-violet-white-flare", "white-flare"] },
  { name: "Black Bolt", slugs: ["sv-scarlet-and-violet-black-bolt", "black-bolt"] },
  { name: "Destined Rivals", slugs: ["sv-scarlet-and-violet-destined-rivals", "destined-rivals"] },
  { name: "Journey Together", slugs: ["sv-scarlet-and-violet-journey-together", "journey-together"] },
  { name: "Prismatic Evolutions", slugs: ["sv-scarlet-and-violet-prismatic-evolutions", "prismatic-evolutions"] },
  // ---- 2024 era (SV) ----
  { name: "Surging Sparks", slugs: ["sv-scarlet-and-violet-surging-sparks", "surging-sparks"] },
  { name: "Stellar Crown", slugs: ["sv-scarlet-and-violet-stellar-crown", "stellar-crown"] },
  { name: "Shrouded Fable", slugs: ["sv-scarlet-and-violet-shrouded-fable", "shrouded-fable"] },
  { name: "Twilight Masquerade", slugs: ["sv-scarlet-and-violet-twilight-masquerade", "twilight-masquerade"] },
  { name: "Temporal Forces", slugs: ["sv-scarlet-and-violet-temporal-forces", "temporal-forces"] },
  { name: "Paldean Fates", slugs: ["sv-scarlet-and-violet-paldean-fates", "paldean-fates"] },
  // ---- 2023 era (SV launch) ----
  { name: "Paradox Rift", slugs: ["sv-scarlet-and-violet-paradox-rift", "paradox-rift"] },
  { name: "Scarlet & Violet—151", slugs: ["sv-scarlet-and-violet-151", "151"] },
  { name: "Obsidian Flames", slugs: ["sv-scarlet-and-violet-obsidian-flames", "obsidian-flames"] },
  { name: "Paldea Evolved", slugs: ["sv-scarlet-and-violet-paldea-evolved", "paldea-evolved"] },
  { name: "Scarlet & Violet Base Set", slugs: ["sv-scarlet-and-violet-base-set", "scarlet-and-violet-base-set"] },
  // ---- Sword & Shield era (2020-2023) ----
  // Trying swsh-{name} (short prefix) after the long-form; bare name was already tried last run
  { name: "Crown Zenith", slugs: ["swsh-crown-zenith", "crown-zenith", "swsh-sword-and-shield-crown-zenith"] },
  { name: "Silver Tempest", slugs: ["swsh-silver-tempest", "silver-tempest", "swsh-sword-and-shield-silver-tempest"] },
  { name: "Lost Origin", slugs: ["swsh-lost-origin", "lost-origin", "swsh-sword-and-shield-lost-origin"] },
  { name: "Pokémon GO", slugs: ["swsh-pokemon-go", "pokemon-go", "swsh-sword-and-shield-pokemon-go"] },
  { name: "Astral Radiance", slugs: ["swsh-astral-radiance", "astral-radiance", "swsh-sword-and-shield-astral-radiance"] },
  { name: "Brilliant Stars", slugs: ["swsh-brilliant-stars", "brilliant-stars", "swsh-sword-and-shield-brilliant-stars"] },
  { name: "Fusion Strike", slugs: ["swsh-fusion-strike", "fusion-strike", "swsh-sword-and-shield-fusion-strike"] },
  { name: "Celebrations", slugs: ["swsh-celebrations", "celebrations", "swsh-sword-and-shield-celebrations"] },
  { name: "Evolving Skies", slugs: ["swsh-evolving-skies", "evolving-skies", "swsh-sword-and-shield-evolving-skies"] },
  { name: "Chilling Reign", slugs: ["swsh-chilling-reign", "chilling-reign", "swsh-sword-and-shield-chilling-reign"] },
  { name: "Battle Styles", slugs: ["swsh-battle-styles", "battle-styles", "swsh-sword-and-shield-battle-styles"] },
  { name: "Shining Fates", slugs: ["swsh-shining-fates", "shining-fates", "swsh-sword-and-shield-shining-fates"] },
  { name: "Vivid Voltage", slugs: ["swsh-vivid-voltage", "vivid-voltage", "swsh-sword-and-shield-vivid-voltage"] },
  { name: "Champion's Path", slugs: ["swsh-champions-path", "champions-path", "swsh-sword-and-shield-champions-path"] },
  { name: "Darkness Ablaze", slugs: ["swsh-darkness-ablaze", "darkness-ablaze", "swsh-sword-and-shield-darkness-ablaze"] },
  { name: "Rebel Clash", slugs: ["swsh-rebel-clash", "rebel-clash", "swsh-sword-and-shield-rebel-clash"] },
  { name: "Sword & Shield", slugs: ["swsh-sword-shield", "swsh-sword-and-shield", "sword-and-shield"] },
  // ---- Sun & Moon era (2017-2019) ----
  // Trying sm-{name} (short prefix) after the long-form
  { name: "Cosmic Eclipse", slugs: ["sm-cosmic-eclipse", "cosmic-eclipse", "sm-sun-and-moon-cosmic-eclipse"] },
  { name: "Hidden Fates", slugs: ["sm-hidden-fates", "hidden-fates", "sm-sun-and-moon-hidden-fates"] },
  { name: "Unified Minds", slugs: ["sm-unified-minds", "unified-minds", "sm-sun-and-moon-unified-minds"] },
  { name: "Unbroken Bonds", slugs: ["sm-unbroken-bonds", "unbroken-bonds", "sm-sun-and-moon-unbroken-bonds"] },
  { name: "Detective Pikachu", slugs: ["sm-detective-pikachu", "detective-pikachu", "sm-sun-and-moon-detective-pikachu"] },
  { name: "Team Up", slugs: ["sm-team-up", "team-up", "sm-sun-and-moon-team-up"] },
  { name: "Lost Thunder", slugs: ["sm-lost-thunder", "lost-thunder", "sm-sun-and-moon-lost-thunder"] },
  { name: "Dragon Majesty", slugs: ["sm-dragon-majesty", "dragon-majesty", "sm-sun-and-moon-dragon-majesty"] },
  { name: "Celestial Storm", slugs: ["sm-celestial-storm", "celestial-storm", "sm-sun-and-moon-celestial-storm"] },
  { name: "Forbidden Light", slugs: ["sm-forbidden-light", "forbidden-light", "sm-sun-and-moon-forbidden-light"] },
  { name: "Ultra Prism", slugs: ["sm-ultra-prism", "ultra-prism", "sm-sun-and-moon-ultra-prism"] },
  { name: "Crimson Invasion", slugs: ["sm-crimson-invasion", "crimson-invasion", "sm-sun-and-moon-crimson-invasion"] },
  { name: "Shining Legends", slugs: ["sm-shining-legends", "shining-legends", "sm-sun-and-moon-shining-legends"] },
  { name: "Burning Shadows", slugs: ["sm-burning-shadows", "burning-shadows", "sm-sun-and-moon-burning-shadows"] },
  { name: "Guardians Rising", slugs: ["sm-guardians-rising", "guardians-rising", "sm-sun-and-moon-guardians-rising"] },
  { name: "Sun & Moon", slugs: ["sm-sun-moon", "sm-sun-and-moon", "sun-and-moon"] },
  // ---- XY era (2014-2016) ----
  { name: "Evolutions", slugs: ["xy-evolutions", "evolutions"] },
  { name: "Steam Siege", slugs: ["xy-steam-siege", "steam-siege"] },
  { name: "Fates Collide", slugs: ["xy-fates-collide", "fates-collide"] },
  { name: "Generations", slugs: ["xy-generations", "generations"] },
  { name: "BREAKpoint", slugs: ["xy-breakpoint", "breakpoint"] },
  { name: "BREAKthrough", slugs: ["xy-breakthrough", "breakthrough"] },
  { name: "Ancient Origins", slugs: ["xy-ancient-origins", "ancient-origins"] },
  { name: "Roaring Skies", slugs: ["xy-roaring-skies", "roaring-skies"] },
  { name: "Double Crisis", slugs: ["xy-double-crisis", "double-crisis"] },
  { name: "Primal Clash", slugs: ["xy-primal-clash", "primal-clash"] },
  { name: "Phantom Forces", slugs: ["xy-phantom-forces", "phantom-forces"] },
  { name: "Furious Fists", slugs: ["xy-furious-fists", "furious-fists"] },
  { name: "Flashfire", slugs: ["xy-flashfire", "flashfire"] },
  { name: "XY", slugs: ["xy-base-set", "xy"] },
  { name: "Kalos Starter Set", slugs: ["xy-kalos-starter-set", "kalos-starter-set"] },
  // ---- Black & White era (2011-2013) ----
  { name: "Legendary Treasures", slugs: ["bw-legendary-treasures", "legendary-treasures", "bw-black-and-white-legendary-treasures"] },
  { name: "Plasma Blast", slugs: ["bw-plasma-blast", "plasma-blast", "bw-black-and-white-plasma-blast"] },
  { name: "Plasma Freeze", slugs: ["bw-plasma-freeze", "plasma-freeze", "bw-black-and-white-plasma-freeze"] },
  { name: "Plasma Storm", slugs: ["bw-plasma-storm", "plasma-storm", "bw-black-and-white-plasma-storm"] },
  { name: "Boundaries Crossed", slugs: ["bw-boundaries-crossed", "boundaries-crossed", "bw-black-and-white-boundaries-crossed"] },
  { name: "Dragon Vault", slugs: ["bw-dragon-vault", "dragon-vault", "bw-black-and-white-dragon-vault"] },
  { name: "Dragons Exalted", slugs: ["bw-dragons-exalted", "dragons-exalted", "bw-black-and-white-dragons-exalted"] },
  { name: "Dark Explorers", slugs: ["bw-dark-explorers", "dark-explorers", "bw-black-and-white-dark-explorers"] },
  { name: "Next Destinies", slugs: ["bw-next-destinies", "next-destinies", "bw-black-and-white-next-destinies"] },
  { name: "Noble Victories", slugs: ["bw-noble-victories", "noble-victories", "bw-black-and-white-noble-victories"] },
  { name: "Emerging Powers", slugs: ["bw-emerging-powers", "emerging-powers", "bw-black-and-white-emerging-powers"] },
  { name: "Black & White", slugs: ["bw-black-white", "bw-black-and-white", "black-and-white"] },
  { name: "Call of Legends", slugs: ["col-call-of-legends", "call-of-legends"] },
  // ---- HeartGold & SoulSilver era (2010) ----
  { name: "Triumphant", slugs: ["hgss-triumphant", "triumphant", "hgss-heartgold-and-soulsilver-triumphant"] },
  { name: "Undaunted", slugs: ["hgss-undaunted", "undaunted", "hgss-heartgold-and-soulsilver-undaunted"] },
  { name: "Unleashed", slugs: ["hgss-unleashed", "unleashed", "hgss-heartgold-and-soulsilver-unleashed"] },
  { name: "HeartGold & SoulSilver", slugs: ["hgss-heartgold-soulsilver", "hgss-heartgold-and-soulsilver", "heartgold-and-soulsilver"] },
  // ---- Platinum era (2009) ----
  { name: "Platinum: Arceus", slugs: ["pl-arceus", "platinum-arceus", "pl-platinum-arceus"] },
  { name: "Supreme Victors", slugs: ["pl-supreme-victors", "supreme-victors", "pl-platinum-supreme-victors"] },
  { name: "Rising Rivals", slugs: ["pl-rising-rivals", "rising-rivals", "pl-platinum-rising-rivals"] },
  { name: "Platinum", slugs: ["pl-platinum", "platinum"] },
  // ---- Diamond & Pearl era (2007-2008) ----
  { name: "Stormfront", slugs: ["dp-stormfront", "stormfront", "dp-diamond-and-pearl-stormfront"] },
  { name: "Legends Awakened", slugs: ["dp-legends-awakened", "legends-awakened", "dp-diamond-and-pearl-legends-awakened"] },
  { name: "Majestic Dawn", slugs: ["dp-majestic-dawn", "majestic-dawn", "dp-diamond-and-pearl-majestic-dawn"] },
  { name: "Great Encounters", slugs: ["dp-great-encounters", "great-encounters", "dp-diamond-and-pearl-great-encounters"] },
  { name: "Secret Wonders", slugs: ["dp-secret-wonders", "secret-wonders", "dp-diamond-and-pearl-secret-wonders"] },
  { name: "Mysterious Treasures", slugs: ["dp-mysterious-treasures", "mysterious-treasures", "dp-diamond-and-pearl-mysterious-treasures"] },
  { name: "Diamond & Pearl", slugs: ["dp-diamond-pearl", "dp-diamond-and-pearl", "diamond-and-pearl"] },
  // ---- EX era (2003-2007) ----
  { name: "EX Power Keepers", slugs: ["ex-power-keepers", "power-keepers"] },
  { name: "EX Dragon Frontiers", slugs: ["ex-dragon-frontiers", "dragon-frontiers"] },
  { name: "EX Crystal Guardians", slugs: ["ex-crystal-guardians", "crystal-guardians"] },
  { name: "EX Holon Phantoms", slugs: ["ex-holon-phantoms", "holon-phantoms"] },
  { name: "EX Legend Maker", slugs: ["ex-legend-maker", "legend-maker"] },
  { name: "EX Delta Species", slugs: ["ex-delta-species", "delta-species"] },
  { name: "EX Unseen Forces", slugs: ["ex-unseen-forces", "unseen-forces"] },
  { name: "EX Emerald", slugs: ["ex-emerald", "emerald"] },
  { name: "EX Deoxys", slugs: ["ex-deoxys", "deoxys"] },
  { name: "EX Team Rocket Returns", slugs: ["ex-team-rocket-returns", "team-rocket-returns"] },
  { name: "EX FireRed & LeafGreen", slugs: ["ex-firered-and-leafgreen", "firered-and-leafgreen"] },
  { name: "EX Hidden Legends", slugs: ["ex-hidden-legends", "hidden-legends"] },
  { name: "EX Team Magma vs Team Aqua", slugs: ["ex-team-magma-vs-team-aqua", "team-magma-vs-team-aqua"] },
  { name: "EX Dragon", slugs: ["ex-dragon", "dragon"] },
  { name: "EX Sandstorm", slugs: ["ex-sandstorm", "sandstorm"] },
  { name: "EX Ruby & Sapphire", slugs: ["ex-ruby-and-sapphire", "ruby-and-sapphire"] },
  // ---- e-Card era (2002-2003) ----
  // Confirmed: bare slug "expedition" works (from cron run)
  { name: "Skyridge", slugs: ["skyridge", "ec-skyridge"] },
  { name: "Aquapolis", slugs: ["aquapolis", "ec-aquapolis"] },
  { name: "Expedition Base Set", slugs: ["expedition", "expedition-base-set", "ec-expedition-base-set"] },
  // ---- Legendary Collection (2002) ----
  { name: "Legendary Collection", slugs: ["legendary-collection"] },
  // ---- Neo era (2000-2002) ----
  { name: "Neo Destiny", slugs: ["neo-destiny"] },
  { name: "Neo Revelation", slugs: ["neo-revelation"] },
  { name: "Neo Discovery", slugs: ["neo-discovery"] },
  { name: "Neo Genesis", slugs: ["neo-genesis"] },
  // ---- Original era (1999-2000) ----
  { name: "Gym Challenge", slugs: ["gym-challenge"] },
  { name: "Gym Heroes", slugs: ["gym-heroes"] },
  { name: "Team Rocket", slugs: ["team-rocket"] },
  { name: "Base Set 2", slugs: ["base-set-2"] },
  { name: "Fossil", slugs: ["fossil"] },
  { name: "Jungle", slugs: ["jungle"] },
  { name: "Base Set", slugs: ["base-set", "base"] },
];

/**
 * Given a slug (and optionally a display name), return an ordered list of
 * candidate slugs to try against /v1/cards. Always includes the input
 * slug first so callers can blindly iterate. If the slug appears in any
 * supplemental entry's `slugs[]`, that entry's full list is appended.
 * Falls back to a name match if the slug isn't recognised but the name is.
 */
export function getCandidateSlugs(slug: string, name?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string) => {
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  push(slug);

  const bySlug = SUPPLEMENTAL_SETS.find((e) => e.slugs.includes(slug));
  if (bySlug) {
    for (const s of bySlug.slugs) push(s);
  } else if (name) {
    const target = name.trim().toLowerCase();
    const byName = SUPPLEMENTAL_SETS.find((e) => e.name.trim().toLowerCase() === target);
    if (byName) {
      for (const s of byName.slugs) push(s);
    }
  }

  return out;
}
