"use client";

import { useEffect, useMemo, useState } from "react";

interface QueryParam {
  name: string;
  required: boolean;
  description: string;
  placeholder?: string;
  defaultValue?: string;
}

interface TryItProps {
  method: "GET";
  path: string;
  queryParams?: QueryParam[];
}

const KEY_STORAGE = "apiDocs.key";

export default function TryIt({ method, path, queryParams = [] }: TryItProps) {
  const [apiKey, setApiKey] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(queryParams.map((p) => [p.name, p.defaultValue || ""]))
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    ms: number;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(KEY_STORAGE);
    if (saved) setApiKey(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (apiKey) window.sessionStorage.setItem(KEY_STORAGE, apiKey);
  }, [apiKey]);

  const fullUrl = useMemo(() => {
    const qs = queryParams
      .map((p) => [p.name, values[p.name]] as const)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    return qs ? `${path}?${qs}` : path;
  }, [path, queryParams, values]);

  async function send() {
    if (!apiKey) {
      setResponse({ status: 0, ms: 0, body: "Paste an API key first." });
      return;
    }
    setLoading(true);
    const t0 = performance.now();
    try {
      const res = await fetch(fullUrl, {
        method,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw */
      }
      setResponse({
        status: res.status,
        ms: Math.round(performance.now() - t0),
        body: pretty,
      });
    } catch (err) {
      setResponse({
        status: 0,
        ms: Math.round(performance.now() - t0),
        body: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    response == null
      ? "text-text-muted"
      : response.status >= 200 && response.status < 300
        ? "text-success"
        : response.status >= 400
          ? "text-danger"
          : "text-text-muted";

  return (
    <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-black/30">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-mono">
          Try it
        </span>
        {response && (
          <span className={`text-[11px] font-mono ${statusColor}`}>
            {response.status || "ERR"} · {response.ms}ms
          </span>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pka_live_..."
            autoComplete="off"
            className="w-full px-2.5 py-1.5 bg-black/50 border border-border rounded text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60"
          />
        </div>

        {queryParams.map((p) => (
          <div key={p.name}>
            <label className="flex items-center justify-between text-[10px] uppercase tracking-widest text-text-muted mb-1">
              <span className="font-mono normal-case tracking-normal">
                {p.name}
                {p.required && <span className="text-danger ml-1">*</span>}
              </span>
              <span className="text-text-muted/60">{p.description}</span>
            </label>
            <input
              type="text"
              value={values[p.name] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [p.name]: e.target.value }))
              }
              placeholder={p.placeholder}
              className="w-full px-2.5 py-1.5 bg-black/50 border border-border rounded text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60"
            />
          </div>
        ))}

        <button
          onClick={send}
          disabled={loading}
          className="w-full px-3 py-2 bg-accent text-background rounded text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending…" : `${method} ${fullUrl}`}
        </button>

        {response && (
          <pre className="bg-black/60 border border-border rounded p-2.5 text-[11px] font-mono text-text-primary overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
            {response.body}
          </pre>
        )}
      </div>
    </div>
  );
}
