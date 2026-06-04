import Link from "next/link";
import { Settings, KeyRound, FileCode, Globe } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-accent" />
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Settings</h1>
      </div>

      <nav className="flex gap-2 border-b border-border">
        <Link
          href="/settings/sharing"
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border-b-2 border-transparent hover:border-accent/40"
        >
          <Globe className="w-4 h-4" />
          Sharing
        </Link>
        <Link
          href="/settings/api-keys"
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border-b-2 border-transparent hover:border-accent/40"
        >
          <KeyRound className="w-4 h-4" />
          API Keys
        </Link>
        <Link
          href="/docs/api"
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border-b-2 border-transparent hover:border-accent/40"
        >
          <FileCode className="w-4 h-4" />
          API Docs
        </Link>
      </nav>

      <div>{children}</div>
    </div>
  );
}
