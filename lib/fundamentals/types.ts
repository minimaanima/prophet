export type PerformanceStatus =
  | 'improving'
  | 'stable'
  | 'deteriorating'
  | 'insufficient';

export type FundamentalMetricUnit =
  | 'currency'
  | 'per_share'
  | 'percent'
  | 'shares';

export type FundamentalObservation = {
  periodEnd: string;
  filedAt: string;
  form: string;
  value: number;
};

export type FundamentalMetric = {
  key:
    | 'revenue'
    | 'diluted_eps'
    | 'operating_margin'
    | 'free_cash_flow'
    | 'net_debt'
    | 'diluted_shares';
  label: string;
  description: string;
  unit: FundamentalMetricUnit;
  currency: string | null;
  latest: number | null;
  prior: number | null;
  latestPeriod: string | null;
  priorPeriod: string | null;
  comparison: 'year_over_year' | 'unavailable';
  changePct: number | null;
  changeAbsolute: number | null;
  status: PerformanceStatus;
  history: FundamentalObservation[];
};

export type CompanyFundamentals = {
  normalizerVersion: 3;
  ticker: string;
  secTicker: string;
  cik: string;
  companyName: string;
  source: 'SEC EDGAR';
  sourceUrl: string;
  latestFilingDate: string | null;
  overallStatus: PerformanceStatus;
  summary: string;
  metrics: FundamentalMetric[];
};

export type FundamentalsApiResponse = {
  configured: boolean;
  available: boolean;
  cached: boolean;
  stale?: boolean;
  fetchedAt?: string;
  fundamentals?: CompanyFundamentals;
  error?: string;
};
