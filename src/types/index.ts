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

export type PokemonAssetSearchResult = PokemonCard | SealedProduct;

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
  currency?: string;
  isConverted?: boolean;
}

export interface PortfolioAsset {
  id: string;
  external_id: string;
  name: string;
  set_name: string;
  asset_type: "card" | "sealed";
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
  evidence_url?: string | null;
  status?: 'ACTIVE' | 'SOLD';
  sell_price?: number | null;
  sell_date?: string | null;
  // Marketplace fields
  for_sale?: boolean;
  sale_price?: number | null;
  // Poketrace fields
  poketrace_id?: string | null;
  poketrace_market?: string;
  price_currency?: string;
  is_converted_price?: boolean;
  // Preferred price source: 'tcgplayer' | 'ebay' | 'cardmarket' | null (auto)
  price_source?: string | null;
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
  type?: "card" | "sealed" | "all";
}

export interface Vendor {
  id: string;
  user_id: string;
  shop_name: string;
  description: string | null;
  shop_image_url: string | null;
  website_url: string | null;
  ebay_url: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface MarketplaceItem extends PortfolioAsset {
  vendor: Vendor;
}

export interface ApiSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  totalCards: number;
  imageUrl?: string;
}
