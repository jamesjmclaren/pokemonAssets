import Link from "next/link";
import { headers } from "next/headers";
import { FileCode, Terminal, KeyRound } from "lucide-react";

export const metadata = {
  title: "API Docs — West Investments",
};

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "portfolio.westinvestments.co.uk";
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-background border border-border rounded-xl p-4 overflow-x-auto text-xs font-mono text-text-primary">
      <code>{children}</code>
    </pre>
  );
}

export default async function ApiDocsPage() {
  const baseUrl = await getBaseUrl();
  const apiBase = `${baseUrl}/api/v1`;
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileCode className="w-6 h-6 text-accent" />
          API Documentation
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Programmatic access to your portfolio via HTTP. All endpoints are authenticated with an API key.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-accent" />
          Authentication
        </h2>
        <p className="text-sm text-text-secondary">
          Create a key in{" "}
          <Link href="/settings/api-keys" className="text-accent hover:underline">
            Settings → API Keys
          </Link>
          . Send the key as a <code className="text-xs">Bearer</code> token in the{" "}
          <code className="text-xs">Authorization</code> header on every request.
        </p>
        <Code>{`Authorization: Bearer <your_api_key>`}</Code>
        <p className="text-[11px] text-text-muted">
          Keys are shown once on creation and cannot be retrieved later. Revoke compromised keys from the settings page.
        </p>
      </section>

      <section className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Base URL</h2>
        <Code>{apiBase}</Code>
        <p className="text-xs text-text-muted">
          All prices are returned in USD (US-market Poketrace data). European-market assets are converted from EUR upstream.
        </p>
      </section>

      <section className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent" />
          GET /api/v1/portfolio
        </h2>
        <p className="text-sm text-text-secondary">
          Lists every portfolio you own or are a member of, with aggregate asset count, cost, and value.
        </p>
        <Code>{`curl -H "Authorization: Bearer $KEY" \\
  ${apiBase}/portfolio`}</Code>
        <p className="text-xs text-text-muted">Response:</p>
        <Code>{`{
  "portfolios": [
    {
      "id": "uuid",
      "name": "Main Collection",
      "description": null,
      "role": "owner",
      "assetCount": 42,
      "totalCostUsd": 12345.67,
      "totalValueUsd": 18900.12
    }
  ]
}`}</Code>
      </section>

      <section className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent" />
          GET /api/v1/assets
        </h2>
        <p className="text-sm text-text-secondary">
          Paginated list of assets across your accessible portfolios. Newest first.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="py-2 pr-3 font-medium">Query param</th>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 font-medium">Default</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            <tr className="border-b border-border/50">
              <td className="py-2 pr-3 font-mono">portfolioId</td>
              <td className="py-2 pr-3">Scope results to one portfolio</td>
              <td className="py-2">all</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 pr-3 font-mono">limit</td>
              <td className="py-2 pr-3">Page size (1–200)</td>
              <td className="py-2">50</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-mono">cursor</td>
              <td className="py-2 pr-3">Pass <code>nextCursor</code> from the previous page</td>
              <td className="py-2">—</td>
            </tr>
          </tbody>
        </table>
        <Code>{`curl -H "Authorization: Bearer $KEY" \\
  "${apiBase}/assets?limit=50"`}</Code>
        <Code>{`{
  "assets": [
    {
      "id": "uuid",
      "portfolioId": "uuid",
      "name": "Charizard",
      "setName": "Base Set",
      "type": "card",
      "purchasePriceUsd": 250.00,
      "purchaseDate": "2024-01-15",
      "currentPriceUsd": 480.25,
      "priceUpdatedAt": "2026-04-18T03:00:00.000Z",
      "poketraceId": "xy-012",
      "poketraceMarket": "US",
      "grade": "PSA_9",
      "status": "ACTIVE",
      "sellPriceUsd": null,
      "sellDate": null,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "nextCursor": "2024-01-15T10:00:00.000Z"
}`}</Code>
      </section>

      <section className="bg-surface border border-border rounded-2xl p-4 md:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Errors & rate limits</h2>
        <ul className="text-sm text-text-secondary space-y-1 list-disc pl-5">
          <li>
            <code className="text-xs">401</code> — missing, invalid, revoked, or expired key
          </li>
          <li>
            <code className="text-xs">403</code> — key valid but not authorised for the requested portfolio
          </li>
          <li>
            <code className="text-xs">500</code> — upstream failure; retry with backoff
          </li>
        </ul>
        <p className="text-xs text-text-muted">
          The API is currently rate-limited at the edge (Clerk + Vercel defaults). Be mindful: do not poll more than once per minute per key.
        </p>
      </section>
    </div>
  );
}
