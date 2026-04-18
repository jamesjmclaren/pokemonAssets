"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface SampleSet {
  curl: string;
  javascript: string;
  python: string;
}

const LANGUAGES: { id: keyof SampleSet; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
];

export default function CodeSamples({ samples }: { samples: SampleSet }) {
  const [active, setActive] = useState<keyof SampleSet>("curl");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(samples[active]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-black/30">
        <div className="flex">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l.id)}
              className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
                active === l.id
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 px-3 py-2 text-[11px] text-text-muted hover:text-text-primary"
          aria-label="Copy"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-text-primary leading-relaxed">
        <code>{samples[active]}</code>
      </pre>
    </div>
  );
}
