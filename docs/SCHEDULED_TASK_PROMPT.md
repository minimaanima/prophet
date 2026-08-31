# Scheduled scan prompt

Use the following core instruction for the morning, market-open, and market-close ChatGPT tasks. Change only `RUN_TYPE` and the task-specific focus.

```text
Produce the RUN_TYPE investment-monitoring scan for my portfolio.

Current symbols: TMUS, MSFT, AAPL, NVDA, SKHY, SGM.

Return exactly one valid JSON object conforming to Prophet schema_version 1.0. Do not use Markdown fences. Do not place explanations before or after the JSON. Use only these enums:

signal: ADD | HOLD | WATCH | REDUCE | EXIT
thesis.status: improving | unchanged | deteriorating
risk: low | medium | high | very_high
run_type: morning | market_open | market_close
market_summary.sentiment: very_bearish | bearish | neutral | bullish | very_bullish

Include one portfolio snapshot for every current symbol. Include price with source "scan" only when a reliable timestamped price is available; otherwise use null. Signal must not be derived mechanically from score. Confidence represents evidence quality, not probability of price appreciation.

For each factual event, include a direct source URL when available. Distinguish new evidence from facts repeated since the previous scan. Populate delta relative to the preceding scan when that scan is available.

Always return 2-3 reasoned opportunities when credible candidates exist. Always evaluate the AI_POWER_INFRASTRUCTURE theme across grid equipment, transformers, switchgear, transmission, utilities, gas turbines, nuclear, natural gas, power generators, storage, cooling, and onsite generation. Treat backlog and order growth as important evidence for equipment suppliers.

This is an analytical monitor, not an instruction to execute trades.
```

Task-specific focus:

- `morning`: overnight company news, filings, analyst changes, macro developments and the coming session's known events.
- `market_open`: opening gaps, volume/reaction, material overnight news being repriced, and thesis changes.
- `market_close`: full-session recap, closing price context, material events, thesis changes and new opportunities.

Before importing the first real scan, replace `SGM`'s display name and exchange with the exact values shown in Revolut. The ticker remains `SGM`.
