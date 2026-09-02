import type {
  CompanyFundamentals,
  FundamentalMetric,
  FundamentalMetricUnit,
  FundamentalObservation,
  PerformanceStatus,
} from './types';

export const SEC_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type SecErrorCode = 'configuration' | 'unavailable' | 'remote';

export class SecFundamentalsError extends Error {
  constructor(
    message: string,
    readonly code: SecErrorCode,
  ) {
    super(message);
    this.name = 'SecFundamentalsError';
  }
}

type TickerDirectoryEntry = {
  cik_str: number | string;
  ticker: string;
  title: string;
};

type SecFact = {
  start?: string;
  end?: string;
  val?: number;
  form?: string;
  filed?: string;
  frame?: string;
  fp?: string;
  fy?: number;
};

type SecConcept = {
  label?: string;
  description?: string;
  units?: Record<string, SecFact[]>;
};

type SecCompanyFacts = {
  cik?: number;
  entityName?: string;
  facts?: Record<string, Record<string, SecConcept>>;
};

type ConceptCandidate = {
  taxonomy: 'us-gaap' | 'ifrs-full' | 'dei';
  tags: string[];
};

type LocatedFacts = {
  facts: SecFact[];
  unit: string;
  currency: string | null;
};

type InternalObservation = FundamentalObservation & {
  frame: string | null;
};

let directoryCache:
  | { expiresAt: number; entries: TickerDirectoryEntry[] }
  | undefined;

const conceptCandidates = {
  dilutedEps: [
    {
      taxonomy: 'us-gaap',
      tags: ['EarningsPerShareDiluted'],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['DilutedEarningsLossPerShare'],
    },
  ],
  revenue: [
    {
      taxonomy: 'us-gaap',
      tags: [
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'RevenueFromContractWithCustomerIncludingAssessedTax',
        'Revenues',
        'SalesRevenueNet',
      ],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['Revenue'],
    },
  ],
  operatingIncome: [
    {
      taxonomy: 'us-gaap',
      tags: ['OperatingIncomeLoss'],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['ProfitLossFromOperatingActivities'],
    },
  ],
  operatingCashFlow: [
    {
      taxonomy: 'us-gaap',
      tags: ['NetCashProvidedByUsedInOperatingActivities'],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['CashFlowsFromUsedInOperatingActivities'],
    },
  ],
  capitalExpenditure: [
    {
      taxonomy: 'us-gaap',
      tags: [
        'PaymentsToAcquirePropertyPlantAndEquipment',
        'PaymentsForAdditionsToPropertyPlantAndEquipment',
      ],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['PurchaseOfPropertyPlantAndEquipment'],
    },
  ],
  dilutedShares: [
    {
      taxonomy: 'us-gaap',
      tags: ['WeightedAverageNumberOfDilutedSharesOutstanding'],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['WeightedAverageNumberOfDilutedSharesOutstanding'],
    },
  ],
  cash: [
    {
      taxonomy: 'us-gaap',
      tags: [
        'CashAndCashEquivalentsAtCarryingValue',
        'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
      ],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['CashAndCashEquivalents'],
    },
  ],
  totalDebt: [
    {
      taxonomy: 'us-gaap',
      tags: ['LongTermDebtAndFinanceLeaseObligations', 'LongTermDebt'],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['Borrowings'],
    },
  ],
  currentDebt: [
    {
      taxonomy: 'us-gaap',
      tags: [
        'LongTermDebtAndFinanceLeaseObligationsCurrent',
        'LongTermDebtCurrent',
      ],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['CurrentBorrowings'],
    },
  ],
  noncurrentDebt: [
    {
      taxonomy: 'us-gaap',
      tags: [
        'LongTermDebtAndFinanceLeaseObligationsNoncurrent',
        'LongTermDebtNoncurrent',
      ],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['NoncurrentBorrowings'],
    },
  ],
  shortTermDebt: [
    {
      taxonomy: 'us-gaap',
      tags: ['ShortTermBorrowings', 'ShortTermBorrowingsCurrent'],
    },
    {
      taxonomy: 'ifrs-full',
      tags: ['CurrentBorrowings'],
    },
  ],
} satisfies Record<string, ConceptCandidate[]>;

export async function fetchSecFundamentals({
  ticker,
  companyName,
  knownCik,
  userAgent,
}: {
  ticker: string;
  companyName?: string | null;
  knownCik?: string | null;
  userAgent: string;
}): Promise<CompanyFundamentals> {
  if (!userAgent.trim() || !userAgent.includes('@')) {
    throw new SecFundamentalsError(
      'SEC access requires SEC_USER_AGENT with an application name and contact email.',
      'configuration',
    );
  }

  let cik = knownCik?.replace(/\D/g, '').padStart(10, '0') ?? null;
  let secTicker = ticker;
  let resolvedName = companyName ?? ticker;

  if (!cik) {
    const resolved = await resolveCompany(ticker, companyName, userAgent);
    if (!resolved) {
      throw new SecFundamentalsError(
        'No SEC filer could be matched to this instrument.',
        'unavailable',
      );
    }
    cik = String(resolved.cik_str).padStart(10, '0');
    secTicker = resolved.ticker.toUpperCase();
    resolvedName = resolved.title;
  }

  const companyFacts = await fetchSecJson<SecCompanyFacts>(
    'https://data.sec.gov/api/xbrl/companyfacts/CIK' + cik + '.json',
    userAgent,
  );

  return normalizeCompanyFacts({
    ticker,
    secTicker,
    cik,
    companyName: companyFacts.entityName ?? resolvedName,
    data: companyFacts,
  });
}

async function resolveCompany(
  ticker: string,
  companyName: string | null | undefined,
  userAgent: string,
) {
  const entries = await getTickerDirectory(userAgent);
  const direct = entries.find(
    (entry) => entry.ticker.toUpperCase() === ticker.toUpperCase(),
  );
  if (direct) return direct;

  if (!companyName) return null;
  const normalizedName = normalizeCompanyName(companyName);
  const matches = entries.filter(
    (entry) => normalizeCompanyName(entry.title) === normalizedName,
  );
  return matches.length === 1 ? matches[0] : null;
}

async function getTickerDirectory(userAgent: string) {
  if (directoryCache && directoryCache.expiresAt > Date.now()) {
    return directoryCache.entries;
  }

  const payload = await fetchSecJson<Record<string, TickerDirectoryEntry>>(
    'https://www.sec.gov/files/company_tickers.json',
    userAgent,
  );
  const entries = Object.values(payload);
  directoryCache = {
    entries,
    expiresAt: Date.now() + SEC_CACHE_TTL_MS,
  };
  return entries;
}

async function fetchSecJson<T>(url: string, userAgent: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (response.status === 404) {
    throw new SecFundamentalsError(
      'SEC fundamentals are not available for this instrument.',
      'unavailable',
    );
  }
  if (response.status === 403) {
    throw new SecFundamentalsError(
      'SEC rejected the configured requester identity. Check SEC_USER_AGENT.',
      'configuration',
    );
  }
  if (!response.ok) {
    throw new SecFundamentalsError(
      'SEC request failed (' + response.status + ').',
      'remote',
    );
  }

  return (await response.json()) as T;
}

function normalizeCompanyFacts({
  ticker,
  secTicker,
  cik,
  companyName,
  data,
}: {
  ticker: string;
  secTicker: string;
  cik: string;
  companyName: string;
  data: SecCompanyFacts;
}): CompanyFundamentals {
  const revenueFacts = locateFacts(data, conceptCandidates.revenue, 'currency');
  const epsFacts = locateFacts(data, conceptCandidates.dilutedEps, 'per_share');
  const operatingIncomeFacts = locateFacts(
    data,
    conceptCandidates.operatingIncome,
    'currency',
  );
  const operatingCashFlowFacts = locateFacts(
    data,
    conceptCandidates.operatingCashFlow,
    'currency',
  );
  const capitalExpenditureFacts = locateFacts(
    data,
    conceptCandidates.capitalExpenditure,
    'currency',
  );
  const dilutedShareFacts = locateFacts(
    data,
    conceptCandidates.dilutedShares,
    'shares',
  );

  const quarterlyRevenue = prepareDurationSeries(
    revenueFacts?.facts ?? [],
    'quarterly',
  );
  const annualRevenue = prepareDurationSeries(
    revenueFacts?.facts ?? [],
    'annual',
  );
  const revenue = selectNewestSeries(quarterlyRevenue, annualRevenue);
  const quarterlyEps = prepareDurationSeries(
    epsFacts?.facts ?? [],
    'quarterly',
  );
  const annualEps = prepareDurationSeries(epsFacts?.facts ?? [], 'annual');
  const dilutedEps = selectNewestSeries(quarterlyEps, annualEps);
  const quarterlyOperatingIncome = prepareDurationSeries(
    operatingIncomeFacts?.facts ?? [],
    'quarterly',
  );
  const annualOperatingIncome = prepareDurationSeries(
    operatingIncomeFacts?.facts ?? [],
    'annual',
  );
  const annualOperatingCashFlow = prepareDurationSeries(
    operatingCashFlowFacts?.facts ?? [],
    'annual',
  );
  const annualCapitalExpenditure = prepareDurationSeries(
    capitalExpenditureFacts?.facts ?? [],
    'annual',
  );
  const quarterlyDilutedShares = prepareDurationSeries(
    dilutedShareFacts?.facts ?? [],
    'quarterly',
  );
  const annualDilutedShares = prepareDurationSeries(
    dilutedShareFacts?.facts ?? [],
    'annual',
  );
  const dilutedShares = selectNewestSeries(
    quarterlyDilutedShares,
    annualDilutedShares,
  );

  const quarterlyOperatingMargin = combineSeries(
    quarterlyOperatingIncome,
    quarterlyRevenue,
    (operatingIncome, revenueValue) =>
      revenueValue === 0 ? null : (operatingIncome / revenueValue) * 100,
  );
  const annualOperatingMargin = combineSeries(
    annualOperatingIncome,
    annualRevenue,
    (operatingIncome, revenueValue) =>
      revenueValue === 0 ? null : (operatingIncome / revenueValue) * 100,
  );
  const operatingMargin = selectNewestSeries(
    quarterlyOperatingMargin,
    annualOperatingMargin,
  );
  const freeCashFlow = combineSeries(
    annualOperatingCashFlow,
    annualCapitalExpenditure,
    (operatingCashFlow, capitalExpenditure) =>
      operatingCashFlow - Math.abs(capitalExpenditure),
  );
  const netDebt = buildNetDebtSeries(data);

  const metrics: FundamentalMetric[] = [
    makeMetric({
      key: 'revenue',
      label: 'Revenue',
      description: 'Latest comparable reported period versus one year earlier.',
      unit: 'currency',
      currency: revenueFacts?.currency ?? null,
      series: revenue,
      favorable: 'higher',
      threshold: 2,
    }),
    makeMetric({
      key: 'diluted_eps',
      label: 'Diluted EPS',
      description:
        'Earnings attributable to each diluted share, year over year.',
      unit: 'per_share',
      currency: epsFacts?.currency ?? null,
      series: dilutedEps,
      favorable: 'higher',
      threshold: 5,
    }),
    makeMetric({
      key: 'operating_margin',
      label: 'Operating margin',
      description: 'Operating income as a percentage of revenue.',
      unit: 'percent',
      currency: null,
      series: operatingMargin,
      favorable: 'higher',
      threshold: 0.5,
      compareWithPoints: true,
    }),
    makeMetric({
      key: 'free_cash_flow',
      label: 'Free cash flow',
      description: 'Annual operating cash flow less capital expenditure.',
      unit: 'currency',
      currency:
        operatingCashFlowFacts?.currency ??
        capitalExpenditureFacts?.currency ??
        null,
      series: freeCashFlow,
      favorable: 'higher',
      threshold: 5,
    }),
    makeMetric({
      key: 'net_debt',
      label: 'Net debt',
      description:
        'Reported borrowings less cash; lower is generally healthier.',
      unit: 'currency',
      currency: netDebt.currency,
      series: netDebt.series,
      favorable: 'lower',
      threshold: 5,
    }),
    makeMetric({
      key: 'diluted_shares',
      label: 'Diluted shares',
      description:
        'Weighted diluted shares; sustained increases indicate dilution.',
      unit: 'shares',
      currency: null,
      series: dilutedShares,
      favorable: 'lower',
      threshold: 2,
    }),
  ];

  const availableMetrics = metrics.filter((metric) => metric.latest !== null);
  if (availableMetrics.length === 0) {
    throw new SecFundamentalsError(
      'The SEC filing has no comparable standardized financial facts.',
      'unavailable',
    );
  }

  const overallStatus = summarizeStatus(metrics);
  const filingDates = availableMetrics
    .flatMap((metric) => metric.history.map((item) => item.filedAt))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left));

  return {
    normalizerVersion: 3,
    ticker,
    secTicker,
    cik,
    companyName,
    source: 'SEC EDGAR',
    sourceUrl:
      'https://www.sec.gov/edgar/browse/?CIK=' +
      encodeURIComponent(cik) +
      '&owner=exclude',
    latestFilingDate: filingDates[0] ?? null,
    overallStatus,
    summary: statusSummary(overallStatus, availableMetrics.length),
    metrics,
  };
}

function locateFacts(
  data: SecCompanyFacts,
  candidates: ConceptCandidate[],
  unitKind: FundamentalMetricUnit,
): LocatedFacts | null {
  for (const candidate of candidates) {
    const taxonomy = data.facts?.[candidate.taxonomy];
    if (!taxonomy) continue;
    for (const tag of candidate.tags) {
      const concept = taxonomy[tag];
      if (!concept?.units) continue;
      const unit = selectUnit(Object.keys(concept.units), unitKind);
      if (!unit) continue;
      return {
        facts: concept.units[unit] ?? [],
        unit,
        currency: currencyFromUnit(unit),
      };
    }
  }
  return null;
}

function selectUnit(units: string[], kind: FundamentalMetricUnit) {
  if (kind === 'shares') {
    return units.find((unit) => unit.toLowerCase() === 'shares') ?? null;
  }
  if (kind === 'per_share') {
    return (
      units.find((unit) => {
        const normalized = unit.toLowerCase();
        return (
          normalized.includes('/shares') || normalized.includes('-per-shares')
        );
      }) ?? null
    );
  }
  return (
    units.find((unit) => /^[A-Z]{3}$/.test(unit)) ??
    units.find((unit) => /^[A-Z]{3}/.test(unit)) ??
    null
  );
}

function currencyFromUnit(unit: string) {
  const match = unit.match(/^[A-Z]{3}/);
  return match?.[0] ?? null;
}

function prepareDurationSeries(
  facts: SecFact[],
  cadence: 'quarterly' | 'annual',
): InternalObservation[] {
  const filtered = facts.flatMap((fact) => {
    if (!isAllowedFact(fact) || !fact.start || !fact.end) return [];
    const durationDays =
      (Date.parse(fact.end) - Date.parse(fact.start)) / 86_400_000;
    const frame = fact.frame ?? '';
    const isQuarter =
      /^CY\d{4}Q[1-4]$/.test(frame) ||
      (durationDays >= 60 &&
        durationDays <= 120 &&
        /^Q[1-4]$/.test(fact.fp ?? ''));
    const isAnnual =
      /^CY\d{4}$/.test(frame) ||
      (durationDays >= 300 && durationDays <= 400 && fact.fp === 'FY');

    if (cadence === 'quarterly' ? !isQuarter : !isAnnual) return [];
    return [toObservation(fact)];
  });

  return dedupeObservations(filtered);
}

function prepareInstantSeries(facts: SecFact[]) {
  return dedupeObservations(
    facts.flatMap((fact) =>
      isAllowedFact(fact) && fact.end ? [toObservation(fact)] : [],
    ),
  );
}

function isAllowedFact(fact: SecFact) {
  const value = Number(fact.val);
  const form = (fact.form ?? '').replace(/\/A$/, '');
  return (
    Number.isFinite(value) &&
    Boolean(fact.filed) &&
    ['10-Q', '10-K', '20-F', '40-F', '6-K'].includes(form)
  );
}

function toObservation(fact: SecFact): InternalObservation {
  return {
    periodEnd: fact.end ?? '',
    filedAt: fact.filed ?? '',
    form: fact.form ?? '',
    frame: fact.frame ?? null,
    value: Number(fact.val),
  };
}

function dedupeObservations(items: InternalObservation[]) {
  const byPeriod = new Map<string, InternalObservation>();
  for (const item of items) {
    const existing = byPeriod.get(item.periodEnd);
    if (!existing || item.filedAt > existing.filedAt) {
      byPeriod.set(item.periodEnd, item);
    }
  }
  return [...byPeriod.values()].sort((left, right) =>
    right.periodEnd.localeCompare(left.periodEnd),
  );
}

function selectNewestSeries(
  quarterly: InternalObservation[],
  annual: InternalObservation[],
) {
  if (!quarterly[0]) return annual;
  if (!annual[0]) return quarterly;
  return annual[0].periodEnd > quarterly[0].periodEnd ? annual : quarterly;
}

function combineSeries(
  primary: InternalObservation[],
  secondary: InternalObservation[],
  calculate: (primary: number, secondary: number) => number | null,
) {
  const secondaryByPeriod = new Map(
    secondary.map((item) => [item.periodEnd, item]),
  );
  return primary.flatMap((item) => {
    const match = secondaryByPeriod.get(item.periodEnd);
    if (!match) return [];
    const value = calculate(item.value, match.value);
    if (value === null || !Number.isFinite(value)) return [];
    return [
      {
        ...item,
        filedAt: item.filedAt > match.filedAt ? item.filedAt : match.filedAt,
        value,
      },
    ];
  });
}

function buildNetDebtSeries(data: SecCompanyFacts) {
  const cashFacts = locateFacts(data, conceptCandidates.cash, 'currency');
  const totalDebtFacts = locateFacts(
    data,
    conceptCandidates.totalDebt,
    'currency',
  );
  const currentDebtFacts = locateFacts(
    data,
    conceptCandidates.currentDebt,
    'currency',
  );
  const noncurrentDebtFacts = locateFacts(
    data,
    conceptCandidates.noncurrentDebt,
    'currency',
  );
  const shortTermDebtFacts = locateFacts(
    data,
    conceptCandidates.shortTermDebt,
    'currency',
  );

  const cash = prepareInstantSeries(cashFacts?.facts ?? []);
  const totalDebt = prepareInstantSeries(totalDebtFacts?.facts ?? []);
  const currentDebt = prepareInstantSeries(currentDebtFacts?.facts ?? []);
  const noncurrentDebt = prepareInstantSeries(noncurrentDebtFacts?.facts ?? []);
  const shortTermDebt = prepareInstantSeries(shortTermDebtFacts?.facts ?? []);
  const cashByPeriod = new Map(cash.map((item) => [item.periodEnd, item]));
  const totalByPeriod = new Map(
    totalDebt.map((item) => [item.periodEnd, item]),
  );
  const currentByPeriod = new Map(
    currentDebt.map((item) => [item.periodEnd, item]),
  );
  const noncurrentByPeriod = new Map(
    noncurrentDebt.map((item) => [item.periodEnd, item]),
  );
  const shortByPeriod = new Map(
    shortTermDebt.map((item) => [item.periodEnd, item]),
  );

  const series = cash.flatMap((cashItem) => {
    const total = totalByPeriod.get(cashItem.periodEnd);
    const current = currentByPeriod.get(cashItem.periodEnd);
    const noncurrent = noncurrentByPeriod.get(cashItem.periodEnd);
    const short = shortByPeriod.get(cashItem.periodEnd);
    const currentPortion = current ?? short;
    const debt =
      total?.value ??
      (noncurrent && currentPortion
        ? noncurrent.value + currentPortion.value
        : null);
    if (debt === null) return [];
    const filedAt = [cashItem, total, current, noncurrent, short]
      .filter((item): item is InternalObservation => Boolean(item))
      .map((item) => item.filedAt)
      .sort((left, right) => right.localeCompare(left))[0];
    return [
      {
        ...cashItem,
        filedAt,
        value: debt - cashItem.value,
      },
    ];
  });

  return {
    currency:
      cashFacts?.currency ??
      totalDebtFacts?.currency ??
      currentDebtFacts?.currency ??
      noncurrentDebtFacts?.currency ??
      null,
    series,
  };
}

function makeMetric({
  key,
  label,
  description,
  unit,
  currency,
  series,
  favorable,
  threshold,
  compareWithPoints = false,
}: {
  key: FundamentalMetric['key'];
  label: string;
  description: string;
  unit: FundamentalMetricUnit;
  currency: string | null;
  series: InternalObservation[];
  favorable: 'higher' | 'lower';
  threshold: number;
  compareWithPoints?: boolean;
}): FundamentalMetric {
  const latest = series[0] ?? null;
  const prior = latest ? findPriorYear(series, latest) : null;
  const changeAbsolute = latest && prior ? latest.value - prior.value : null;
  const changePct =
    latest && prior && prior.value !== 0
      ? ((latest.value - prior.value) / Math.abs(prior.value)) * 100
      : null;

  let status: PerformanceStatus = 'insufficient';
  if (latest && prior) {
    const comparisonValue = compareWithPoints
      ? (changeAbsolute ?? 0)
      : (changePct ??
        (latest.value === prior.value
          ? 0
          : latest.value > prior.value
            ? threshold
            : -threshold));
    const directed =
      favorable === 'higher' ? comparisonValue : -comparisonValue;
    status =
      directed >= threshold
        ? 'improving'
        : directed <= -threshold
          ? 'deteriorating'
          : 'stable';
  }

  return {
    key,
    label,
    description,
    unit,
    currency,
    latest: latest?.value ?? null,
    prior: prior?.value ?? null,
    latestPeriod: latest?.periodEnd ?? null,
    priorPeriod: prior?.periodEnd ?? null,
    comparison: prior ? 'year_over_year' : 'unavailable',
    changePct,
    changeAbsolute,
    status,
    history: series.slice(0, 5).map(({ frame: _frame, ...item }) => item),
  };
}

function findPriorYear(
  series: InternalObservation[],
  latest: InternalObservation,
) {
  const frameMatch = latest.frame?.match(/^CY(\d{4})(Q[1-4])?$/);
  if (frameMatch) {
    const targetFrame =
      'CY' + (Number(frameMatch[1]) - 1) + (frameMatch[2] ?? '');
    const framed = series.find((item) => item.frame === targetFrame);
    if (framed) return framed;
  }

  const latestDate = Date.parse(latest.periodEnd);
  return (
    series
      .slice(1)
      .map((item) => ({
        item,
        dayDifference:
          Math.abs(latestDate - Date.parse(item.periodEnd)) / 86_400_000,
      }))
      .filter(
        ({ dayDifference }) => dayDifference >= 320 && dayDifference <= 410,
      )
      .sort(
        (left, right) =>
          Math.abs(left.dayDifference - 365) -
          Math.abs(right.dayDifference - 365),
      )[0]?.item ?? null
  );
}

function summarizeStatus(metrics: FundamentalMetric[]): PerformanceStatus {
  const statuses = metrics
    .map((metric) => metric.status)
    .filter((status) => status !== 'insufficient');
  if (statuses.length < 2) return 'insufficient';
  const score = statuses.reduce(
    (total, status) =>
      total +
      (status === 'improving' ? 1 : status === 'deteriorating' ? -1 : 0),
    0,
  );
  if (score >= 2) return 'improving';
  if (score <= -2) return 'deteriorating';
  return 'stable';
}

function statusSummary(status: PerformanceStatus, metricCount: number) {
  if (status === 'improving') {
    return (
      metricCount +
      ' reported indicators are available, with the balance currently improving.'
    );
  }
  if (status === 'deteriorating') {
    return (
      metricCount +
      ' reported indicators are available, with several showing deterioration.'
    );
  }
  if (status === 'stable') {
    return (
      metricCount +
      ' reported indicators are available, with a broadly mixed or stable picture.'
    );
  }
  return (
    metricCount +
    ' reported indicators are available, but more comparable periods are needed.'
  );
}

function normalizeCompanyName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(the|incorporated|inc|corporation|corp|company|co|plc|limited|ltd|holdings|holding|group|n v|nv|s a|sa|se)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}
