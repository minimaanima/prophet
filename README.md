# Prophet

Personal portfolio intelligence dashboard. Prophet combines authoritative market prices with manually imported, structured AI scan snapshots so investment theses can be tracked and evaluated over time.

## Local setup

1. Copy `.env.example` to `.env.local` and add a Twelve Data API key when available.
2. Run `npm run dev`.
3. Open the dashboard and use **Import scan** to paste or upload JSON.

The app works without a market-data key using preview chart data. Imported scans are validated against schema v1 and saved to the configured D1 database.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — static checks
- `npm run db:generate` — generate SQL migrations from the Drizzle schema

See [SPEC.md](./SPEC.md) for the product and ingestion contract.
