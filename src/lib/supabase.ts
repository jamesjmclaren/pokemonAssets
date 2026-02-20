import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
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
          rarity: string | null;
          card_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["assets"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      price_snapshots: {
        Row: {
          id: string;
          asset_id: string;
          price: number;
          source: string;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["price_snapshots"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["price_snapshots"]["Insert"]>;
      };
    };
  };
};
