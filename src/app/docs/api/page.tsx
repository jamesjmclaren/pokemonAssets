import Link from "next/link";
import { headers } from "next/headers";
import { FileCode, KeyRound, BookOpen, AlertTriangle } from "lucide-react";
import TryIt from "./TryIt";
import CodeSamples from "./CodeSamples";

export const metadata = {
  title: "API Reference — West Investments",
};

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") || h.get("host") || "portfolio.westinvestments.co.uk";
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function Method({ verb }: { verb: "GET" | "POST" | "DELETE" }) {
  const color =
    verb === "GET"
      ? "bg-success/15 text-success"
      : verb === "POST"
        ? "bg-accent/15 text-accent"
        : "bg-danger/15 text-danger";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase font-mono ${color}`}
    >
      {verb}
    </span>
  );
}

function ParamTable({
  params,
}: {
  params: { name: string; type: string; required?: boolean; description: string }[];
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-text-muted bg-surface border-b border-border">
            <th className="py-2 px-3 font-medium">Parameter</th>
            <th className="py-2 px-3 font-medium">Type</th>
            <th className="py-2 px-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-border/50 last:border-0">
              <td className="py-2 px-3 font-mono text-text-primary align-top">
                {p.name}
                {p.required && <span className="text-danger ml-1">*</span>}
              </td>
              <td className="py-2 px-3 font-mono text-text-muted align-top">{p.type}</td>
              <td className="py-2 px-3 text-text-secondary align-top">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseField({
  name,
  type,
  description,
}: {
  name: string;
  type: string;
  description: string;
}) {
  return (
    <div className="border-b border-border/50 last:border-0 py-2 text-xs">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-text-primary">{name}</span>
        <span className="font-mono text-text-muted text-[11px]">{type}</span>
      </div>
      <p className="text-text-secondary mt-0.5">{description}</p>
    </div>
  );
}

export default async function ApiDocsPage() {
  const baseUrl = await getBaseUrl();
  const apiBase = `${baseUrl}/api/v1`;

  const portfolioSamples = {
    curl: `curl -X GET "${apiBase}/portfolio" \\
  -H "Authorization: Bearer $API_KEY"`,
    javascript: `const res = await fetch("${apiBase}/portfolio", {
  headers: { Authorization: \`Bearer \${process.env.API_KEY}\` },
});
const data = await res.json();
console.log(data.portfolios);`,
    python: `import os, requests

res = requests.get(
    "${apiBase}/portfolio",
    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},
)
res.raise_for_status()
print(res.json()["portfolios"])`,
  };

  const assetsSamples = {
    curl: `curl -X GET "${apiBase}/assets?limit=50" \\
  -H "Authorization: Bearer $API_KEY"`,
    javascript: `const res = await fetch("${apiBase}/assets?limit=50", {
  headers: { Authorization: \`Bearer \${process.env.API_KEY}\` },
});
const { assets, nextCursor } = await res.json();`,
    python: `import os, requests

res = requests.get(
    "${apiBase}/assets",
    params={"limit": 50},
    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},
)
print(res.json()["assets"])`,
  };

  const portfolioExample = `{
  "portfolios": [
    {
      "id": "5f3e4b76-1234-4c6f-8fda-1a2b3c4d5e6f",
      "name": "Main Collection",
      "description": null,
      "role": "owner",
      "assetCount": 42,
      "totalCostUsd": 12345.67,
      "totalValueUsd": 18900.12
    }
  ]
}`;

  const assetsExample = `{
  "assets": [
    {
      "id": "9c8b7a65-1234-4c6f-8fda-1a2b3c4d5e6f",
      "portfolioId": "5f3e4b76-1234-4c6f-8fda-1a2b3c4d5e6f",
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
}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
      {/* Sticky sidebar nav */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
              Getting Started
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#introduction" className="text-text-secondary hover:text-accent">
                  Introduction
                </a>
              </li>
              <li>
                <a href="#authentication" className="text-text-secondary hover:text-accent">
                  Authentication
                </a>
              </li>
              <li>
                <a href="#errors" className="text-text-secondary hover:text-accent">
                  Errors
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
              Endpoints
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#get-portfolio" className="text-text-secondary hover:text-accent">
                  <Method verb="GET" /> <span className="ml-1 font-mono">/portfolio</span>
                </a>
              </li>
              <li>
                <a href="#get-assets" className="text-text-secondary hover:text-accent">
                  <Method verb="GET" /> <span className="ml-1 font-mono">/assets</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="space-y-16 max-w-4xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileCode className="w-6 h-6 text-accent" />
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
              API Reference
            </h1>
            <span className="ml-2 px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
              v1
            </span>
          </div>
          <p className="text-text-secondary text-sm max-w-2xl">
            Programmatic access to your West Investments portfolio. REST over HTTPS,
            JSON-encoded, authenticated with a personal API key.
          </p>
        </div>

        {/* Introduction */}
        <section id="introduction" className="space-y-4 scroll-mt-6">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            Introduction
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 text-sm text-text-secondary">
              <p>
                The West Investments API lets you retrieve portfolio summaries and asset
                details over HTTPS. Every request is authenticated with a personal API key
                scoped to your user account.
              </p>
              <p>
                All responses are JSON. All monetary values are in <strong>USD</strong>,
                based on US-market Poketrace data (TCGPlayer + eBay). European-market
                assets are converted from EUR upstream using the daily reference rate.
              </p>
            </div>
            <div className="space-y-3">
              <div className="border border-border rounded-xl p-3 bg-surface">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  Base URL
                </p>
                <code className="block text-xs font-mono text-accent break-all">{apiBase}</code>
              </div>
              <div className="border border-border rounded-xl p-3 bg-surface text-xs text-text-secondary">
                <strong className="text-text-primary">Content-Type:</strong> application/json
                <br />
                <strong className="text-text-primary">Versioning:</strong> path-prefixed (
                <code>/v1</code>)
                <br />
                <strong className="text-text-primary">Encoding:</strong> UTF-8
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section id="authentication" className="space-y-4 scroll-mt-6">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-accent" />
            Authentication
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm text-text-secondary">
              <p>
                Create a key in{" "}
                <Link href="/settings/api-keys" className="text-accent hover:underline">
                  Settings → API Keys
                </Link>
                . Attach it as a <code className="text-xs">Bearer</code> token in the{" "}
                <code className="text-xs">Authorization</code> header on every request.
              </p>
              <div className="bg-warning/5 border border-warning/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary">
                  Keys are shown <strong>once</strong> on creation and cannot be retrieved
                  afterwards. Store them in a password manager or secrets vault. Revoke
                  compromised keys immediately from the settings page.
                </p>
              </div>
            </div>
            <CodeSamples
              samples={{
                curl: `curl -H "Authorization: Bearer $API_KEY" \\
  ${apiBase}/portfolio`,
                javascript: `await fetch("${apiBase}/portfolio", {
  headers: {
    Authorization: \`Bearer \${process.env.API_KEY}\`,
  },
});`,
                python: `requests.get(
    "${apiBase}/portfolio",
    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},
)`,
              }}
            />
          </div>
        </section>

        {/* GET /portfolio */}
        <section id="get-portfolio" className="space-y-4 scroll-mt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Method verb="GET" />
            <h2 className="text-xl font-semibold text-text-primary font-mono">
              /portfolio
            </h2>
          </div>
          <p className="text-sm text-text-secondary">
            Lists every portfolio you own or are a member of, with aggregate asset count,
            cost basis, and current value.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  Query parameters
                </p>
                <p className="text-xs text-text-muted italic">None.</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
                  Response fields
                </p>
                <div className="border border-border rounded-xl px-3 bg-surface">
                  <ResponseField
                    name="portfolios[].id"
                    type="string (uuid)"
                    description="Portfolio identifier."
                  />
                  <ResponseField
                    name="portfolios[].name"
                    type="string"
                    description="Display name."
                  />
                  <ResponseField
                    name="portfolios[].role"
                    type='"owner" | "read_write" | "read_only"'
                    description="Your role on this portfolio."
                  />
                  <ResponseField
                    name="portfolios[].assetCount"
                    type="integer"
                    description="Number of active assets."
                  />
                  <ResponseField
                    name="portfolios[].totalCostUsd"
                    type="number"
                    description="Sum of purchase prices (USD)."
                  />
                  <ResponseField
                    name="portfolios[].totalValueUsd"
                    type="number"
                    description="Sum of latest market values (USD)."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <CodeSamples samples={portfolioSamples} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  Example response · 200
                </p>
                <pre className="bg-[#0d1117] border border-border rounded-xl p-3 text-xs font-mono text-text-primary overflow-x-auto">
                  <code>{portfolioExample}</code>
                </pre>
              </div>
              <TryIt method="GET" path="/api/v1/portfolio" />
            </div>
          </div>
        </section>

        {/* GET /assets */}
        <section id="get-assets" className="space-y-4 scroll-mt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Method verb="GET" />
            <h2 className="text-xl font-semibold text-text-primary font-mono">
              /assets
            </h2>
          </div>
          <p className="text-sm text-text-secondary">
            Paginated list of assets across your accessible portfolios. Newest first. Use{" "}
            <code>nextCursor</code> from the response to fetch the next page.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
                  Query parameters
                </p>
                <ParamTable
                  params={[
                    {
                      name: "portfolioId",
                      type: "string (uuid)",
                      description: "Scope results to a single portfolio.",
                    },
                    {
                      name: "limit",
                      type: "integer (1–200)",
                      description: "Page size. Defaults to 50.",
                    },
                    {
                      name: "cursor",
                      type: "string (ISO-8601)",
                      description: "Pass nextCursor from the previous page.",
                    },
                  ]}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
                  Response fields
                </p>
                <div className="border border-border rounded-xl px-3 bg-surface">
                  <ResponseField name="assets[].id" type="string (uuid)" description="Asset identifier." />
                  <ResponseField name="assets[].name" type="string" description="Card or sealed product name." />
                  <ResponseField name="assets[].setName" type="string" description="Set name." />
                  <ResponseField name="assets[].type" type='"card" | "sealed"' description="Asset category." />
                  <ResponseField name="assets[].purchasePriceUsd" type="number | null" description="What you paid (USD)." />
                  <ResponseField name="assets[].currentPriceUsd" type="number | null" description="Latest market value (USD)." />
                  <ResponseField name="assets[].poketraceMarket" type='"US" | "EU"' description="Source market for pricing." />
                  <ResponseField name="assets[].grade" type="string | null" description='Professional grade (e.g. "PSA_9").' />
                  <ResponseField name="assets[].status" type='"ACTIVE" | "SOLD"' description="Holding status." />
                  <ResponseField name="nextCursor" type="string | null" description="Pass to cursor on the next call; null when exhausted." />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <CodeSamples samples={assetsSamples} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  Example response · 200
                </p>
                <pre className="bg-[#0d1117] border border-border rounded-xl p-3 text-xs font-mono text-text-primary overflow-x-auto max-h-96 overflow-y-auto">
                  <code>{assetsExample}</code>
                </pre>
              </div>
              <TryIt
                method="GET"
                path="/api/v1/assets"
                queryParams={[
                  {
                    name: "portfolioId",
                    required: false,
                    description: "optional",
                    placeholder: "uuid",
                  },
                  {
                    name: "limit",
                    required: false,
                    description: "1–200",
                    placeholder: "50",
                    defaultValue: "50",
                  },
                  { name: "cursor", required: false, description: "pagination" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Errors */}
        <section id="errors" className="space-y-4 scroll-mt-6">
          <h2 className="text-xl font-semibold text-text-primary">Errors & rate limits</h2>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted bg-surface border-b border-border">
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-mono text-success">200</td>
                  <td className="py-2 px-3">Request succeeded.</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-mono text-danger">401</td>
                  <td className="py-2 px-3">
                    Missing, malformed, revoked, or expired API key.
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-mono text-danger">403</td>
                  <td className="py-2 px-3">
                    Key valid but not authorised for the requested portfolio.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono text-danger">500</td>
                  <td className="py-2 px-3">Upstream failure. Retry with exponential backoff.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-muted">
            Rate limits: Clerk + Vercel edge defaults apply. Do not poll more than once per
            minute per key — prices are refreshed upstream once daily, so higher frequency
            wastes quota without yielding new data.
          </p>
        </section>
      </main>
    </div>
  );
}
