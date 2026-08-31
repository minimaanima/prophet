# Prophet MVP specification

## Purpose

Prophet records recurring AI investment assessments and displays them on top of independent market-price history. It is a monitoring and research tool, not an automated trading system.

## Sources of truth

- Twelve Data (through a replaceable `MarketDataProvider`) supplies price history.
- Manually imported ChatGPT scans supply assessment, thesis, catalysts, risks, events, sources, and opportunities.
- The original scan JSON is always retained for audit and future reprocessing.
- Current price and day change are displayed only from the active Twelve Data refresh window. Imported prices and stale cached quotes are never used as UI fallbacks.
- Missing provider data is shown as unavailable; the application does not display demo or synthetic records.

## Initial portfolio

`TMUS`, `MSFT`, `AAPL`, `NVDA`, `SKHY`, and `SGM`. Instruments are created or updated from imported scans, so their identity and display name are not hard-coded. `SGM` remains the exact Revolut symbol supplied by the owner.

## Scan schedule

| Run type       | Intended time      | Purpose                        |
| -------------- | ------------------ | ------------------------------ |
| `morning`      | 09:00 Europe/Sofia | Overnight news and preparation |
| `market_open`  | 16:30 Europe/Sofia | Opening reaction               |
| `market_close` | 23:05 Europe/Sofia | Daily recap                    |

Timestamps are stored with offsets/UTC. US session logic must use `America/New_York`; display defaults to `Europe/Sofia`.

## Import flow

1. Copy the JSON-only response from the scheduled ChatGPT task.
2. Open **Import scan**.
3. Paste JSON or select a local `.json` file.
4. Validate and save.
5. The portfolio switches to the newest successfully processed scan.

Malformed or schema-invalid payloads are retained with status `invalid`. Valid imports use status `processed`.

## Required root fields

- `schema_version`: exactly `1.0`
- `scan_run_id`: unique stable identifier
- `generated_at`: timestamp with timezone
- `run_type`: `morning`, `market_open`, or `market_close`
- `market`
- `market_summary.sentiment` and `market_summary.summary`
- `portfolio`: one snapshot per followed instrument
- `opportunities`
- `meta`

Strict assessment enums:

- Signal: `ADD`, `HOLD`, `WATCH`, `REDUCE`, `EXIT`
- Thesis: `improving`, `unchanged`, `deteriorating`
- Risk: `low`, `medium`, `high`, `very_high`

Signal is an analytical label, not an automatic order. Confidence measures evidence quality, not the probability of a price increase.

## Persistence

The deployed MVP uses managed SQLite/D1 with relational tables for `instruments`, `scan_runs`, `snapshots`, and `events`. Common history queries are indexed. The application boundaries and field types remain portable to PostgreSQL when external infrastructure is warranted.

## Market data

The Twelve Data adapter is inactive until `TWELVE_DATA_API_KEY` is configured. Responses are cached by interval to preserve the free-plan budget. The provider abstraction allows a future migration without changing product components.

## AI power infrastructure theme

Every scan should always consider 2–3 opportunities across grid equipment, transformers, switchgear, transmission, utilities, gas turbines, nuclear, natural gas, power generation, storage, cooling, and onsite generation. Backlog and order growth are first-class evidence for relevant equipment suppliers.

## Later phases

- Portfolio quantities, average cost and Revolut P&L
- Alerts and earnings calendar
- Analyst and source history
- Sector exposure and benchmark comparison
- Signal performance at 1, 7, 30 and 90 days
