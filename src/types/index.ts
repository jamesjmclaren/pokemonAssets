export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  setName: string;
  setId: string;
  imageUrl: string;
  prices: CardPrices | null;
  type: "card";
}

export interface SealedProduct {
  id: string;
  name: string;
  setName: string;
  setId: string;
  imageUrl: string;
  prices: CardPrices | null;
  type: "sealed";
}

export interface ComicBook {
  id: string;
  name: string;
  setName: string;
  imageUrl?: string;
  url: string;
  type: "comic";
  prices: {
    ungraded?: number;
    vg4?: number;
    fine6?: number;
    vf8?: number;
    nm92?: number;
    nm98?: number;
  };
}

export type PokemonAssetSearchResult = PokemonCard | SealedProduct | ComicBook;

export interface CardPrices {
  tcgplayer?: {
    market?: number;
    low?: number;
    mid?: number;
    high?: number;
  };
  ebay?: {
    average?: number;
    low?: number;
    high?: number;
  };
  cardmarket?: {
    average?: number;
    low?: number;
    trend?: number;
  };
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  source?: string;
}

export interface PortfolioAsset {
  id: string;
  external_id: string;
  name: string;
  set_name: string;
  asset_type: "card" | "sealed" | "comic";
  image_url: string | null;
  custom_image_url: string | null;
  purchase_price: number;
  purchase_date: string;
  purchase_location: string;
  condition: string;
  notes: string | null;
  current_price: number | null;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
  rarity?: string;
  card_number?: string;
  psa_grade?: string | null;
  manual_price?: boolean;
  quantity?: number;
  language?: string;
  storage_location?: string;
  is_manual_submission?: boolean;
  pc_product_id?: string | null;
  pc_url?: string | null;
  pc_grade_field?: string | null;
}

export interface PortfolioSummary {
  totalAssets: number;
  totalInvested: number;
  currentValue: number;
  totalProfit: number;
  profitPercentage: number;
  topGainers: PortfolioAsset[];
  topLosers: PortfolioAsset[];
  recentlyAdded: PortfolioAsset[];
}

export interface SearchFilters {
  query: string;
  setId?: string;
  type?: "card" | "sealed" | "comic" | "all";
}

export interface ApiSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  totalCards: number;
  imageUrl?: string;
}
