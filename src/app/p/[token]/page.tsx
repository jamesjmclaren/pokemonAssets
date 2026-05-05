import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fixStorageUrl } from "@/lib/format";

type PublicAsset = {
  id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  custom_image_url: string | null;
  current_price: number | null;
  price_currency: string | null;
  condition: string | null;
  psa_grade: string | null;
  rarity: string | null;
  card_number: string | null;
  asset_type: string | null;
  quantity: number | null;
  language: string | null;
};

function formatPrice(value: number | null, currency = "USD"): string {
  if (value == null) return "—";
  const cur = currency || "USD";
  const locale = cur === "GBP" ? "en-GB" : cur === "EUR" ? "en-IE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTotalValue(assets: PublicAsset[]): string {
  const total = assets.reduce(
    (sum, a) => sum + (a.current_price ?? 0) * (a.quantity ?? 1),
    0
  );
  const primaryCurrency = assets.find((a) => a.price_currency)?.price_currency ?? "USD";
  const symbol = primaryCurrency === "GBP" ? "£" : primaryCurrency === "EUR" ? "€" : "$";
  if (total >= 1000) return `${symbol}${(total / 1000).toFixed(1)}K`;
  return `${symbol}${total.toFixed(2)}`;
}

async function getPublicPortfolio(token: string) {
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id, name")
    .eq("public_token", token)
    .eq("is_public", true)
    .single();

  if (!portfolio) return null;

  const { data: assets } = await supabase
    .from("assets")
    .select(
      `id, name, set_name, image_url, custom_image_url,
       current_price, price_currency, condition, psa_grade,
       rarity, card_number, asset_type, quantity, language`
    )
    .eq("portfolio_id", portfolio.id)
    .or("status.is.null,status.eq.ACTIVE")
    .order("current_price", { ascending: false });

  return { portfolio, assets: (assets ?? []) as PublicAsset[] };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicPortfolio(token);

  if (!data) return notFound();

  const { portfolio, assets } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Portfolio</p>
            <h1 className="text-xl font-bold text-accent">{portfolio.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Total Value</p>
            <p className="text-xl font-bold text-white">{formatTotalValue(assets)}</p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {assets.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No cards in this portfolio yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {assets.map((asset) => {
              const imageUrl = fixStorageUrl(asset.custom_image_url) ?? asset.image_url;
              const currency = asset.price_currency || "USD";
              const label = asset.psa_grade
                ? `PSA ${asset.psa_grade}`
                : asset.condition
                ? asset.condition.replace(/_/g, " ")
                : null;
              const cardRef =
                asset.rarity && asset.card_number
                  ? `${asset.rarity} • ${asset.card_number}`
                  : asset.rarity || asset.card_number || null;

              return (
                <div
                  key={asset.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-zinc-800">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={asset.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 50vw, 400px"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
                        No image
                      </div>
                    )}
                    {asset.language && asset.language !== "English" && (
                      <span className="absolute top-2 right-2 bg-zinc-900/80 text-zinc-300 text-xs px-1.5 py-0.5 rounded">
                        {asset.language}
                      </span>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="font-semibold text-white text-sm leading-tight">
                      {asset.name}
                      {label && (
                        <span className="ml-1 text-zinc-400 font-normal">({label})</span>
                      )}
                    </p>
                    {asset.set_name && (
                      <p className="text-xs text-zinc-400">{asset.set_name}</p>
                    )}
                    {cardRef && (
                      <p className="text-xs text-zinc-500">{cardRef}</p>
                    )}

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="text-base font-bold text-white">
                        {formatPrice(asset.current_price, currency)}
                      </span>
                      <span className="text-xs text-zinc-500">Qty: {asset.quantity ?? 1}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-zinc-500 text-sm">
            Powered by{" "}
            <Link href="/" className="text-accent hover:text-accent-hover transition-colors font-medium">
              West Investments
            </Link>{" "}
            — Track your Pokémon card collection for free
          </p>
        </div>
      </div>
    </div>
  );
}
