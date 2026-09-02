import { z } from 'zod';

export const SignalSchema = z.enum(['ADD', 'HOLD', 'WATCH', 'REDUCE', 'EXIT']);
export const ThesisStatusSchema = z.enum([
  'improving',
  'unchanged',
  'deteriorating',
]);
export const RiskSchema = z.enum(['low', 'medium', 'high', 'very_high']);
export const RunTypeSchema = z.enum(['morning', 'market_open', 'market_close']);
const PriceSourceSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'stockanalysis' || normalized === 'stock analysis')
    return 'stockanalysis';
  if (normalized === 'marketscreener' || normalized === 'market screener')
    return 'marketscreener';
  return normalized;
},
  z.enum([
    'market_data',
    'finviz',
    'stockanalysis',
    'marketscreener',
    'scan',
    'unknown',
  ]),
);
const CurrencySchema = z.union([
  z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  z.literal('unknown'),
]);

const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
  published_at: z.string().optional().nullable(),
  source_type: z.string().optional(),
});

const EventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.preprocess((value) => value ?? 'unknown', z.string().min(1)),
  type: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional().default(''),
  impact: z.number().int().min(-3).max(3),
  source_name: z.string().optional().nullable(),
  source_url: z.url().optional().nullable(),
  verified: z.boolean().optional().default(false),
});

export const PortfolioSnapshotSchema = z.looseObject({
  ticker: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1),
  exchange: z.string().optional().nullable(),
  instrument_type: z.string().optional().default('equity'),
  currency: CurrencySchema,
  price: z
    .object({
      value: z.number().nonnegative().nullable(),
      currency: CurrencySchema.optional().nullable(),
      timestamp: z.string().min(1).nullable(),
      previous_close: z.number().nonnegative().optional().nullable(),
      change: z.number().optional().nullable(),
      change_pct: z.number().optional().nullable(),
      source: PriceSourceSchema.default('scan'),
    })
    .nullable(),
  assessment: z.object({
    signal: SignalSchema,
    score: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    risk: RiskSchema,
  }),
  thesis: z.object({
    status: ThesisStatusSchema,
    summary: z.string().min(1),
    changed_since_previous_scan: z.boolean(),
    bull_case: z.string().optional().default(''),
    bear_case: z.string().optional().default(''),
    key_assumption: z.string().optional().default(''),
  }),
  fundamentals: z.record(z.string(), z.unknown()).optional().default({}),
  analysts: z.record(z.string(), z.unknown()).optional().default({}),
  technicals: z.record(z.string(), z.unknown()).optional().default({}),
  catalysts: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  risks: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  events: z.array(EventSchema).optional().default([]),
  delta: z
    .looseObject({
      previous_scan_run_id: z.string().optional().nullable(),
      price_change_since_previous_scan_pct: z.number().optional().nullable(),
      score_change: z.number().optional().nullable(),
      signal_changed: z.boolean().optional().default(false),
      previous_signal: SignalSchema.optional().nullable(),
      thesis_changed: z.boolean().optional().default(false),
      previous_thesis_status: ThesisStatusSchema.optional().nullable(),
    })
    .optional()
    .default({ signal_changed: false, thesis_changed: false }),
  sources: z.array(SourceSchema).optional().default([]),
  summary: z.string().optional().default(''),
});

export const ScanSchema = z.looseObject({
  schema_version: z.literal('1.0'),
  scan_run_id: z.string().trim().min(1),
  generated_at: z.string().min(1),
  run_type: RunTypeSchema,
  market: z.string().min(1),
  market_summary: z.looseObject({
    sentiment: z.enum([
      'very_bearish',
      'bearish',
      'neutral',
      'bullish',
      'very_bullish',
    ]),
    summary: z.string().min(1),
  }),
  portfolio: z.array(PortfolioSnapshotSchema).min(1),
  opportunities: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .default([]),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

export type Scan = z.infer<typeof ScanSchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;

export function formatValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}
