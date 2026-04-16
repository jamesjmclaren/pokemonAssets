# Debug

Systematic debugging workflow for this Next.js/TypeScript project.

## Steps

1. Read the relevant source files and identify the issue
2. Check for caching layers — this project uses a `cash_balance` pattern on `portfolios` that caches computed values from `assets`. Look for similar derived/cached fields that may be stale
3. Check for environment variable guards on SDK initializations (Stripe, Supabase, etc.) — ensure they don't run at module import time during builds
4. Trace the full data flow from database to API route to frontend component
5. Apply the fix at every layer where the stale/incorrect data is consumed
6. Run `npm run build` to verify no build errors before committing
7. Commit with a descriptive message explaining the root cause and fix
