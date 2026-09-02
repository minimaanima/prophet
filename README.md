# Prophet

Personal portfolio intelligence dashboard. Prophet combines authoritative market prices with manually imported, structured AI scan snapshots so investment theses can be tracked and evaluated over time.

## Local setup

1. Copy `.env.example` to `.env`. Add a Twelve Data key for prices and set `SEC_USER_AGENT` to an application name plus your contact email for free reported fundamentals.
2. Run `npm run dev`.
3. Open the dashboard and use **Import scan** to paste or upload JSON.

The app works without a market-data key using preview chart data. SEC fundamentals require no API key, but the SEC requires a declared contact identity. Imported scans and cached fundamentals are saved to the configured D1 database.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — static checks
- `npm run db:generate` — generate SQL migrations from the Drizzle schema

See [SPEC.md](./SPEC.md) for the product and ingestion contract.
