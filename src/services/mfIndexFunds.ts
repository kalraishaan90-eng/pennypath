/**
 * AMFI India Mutual Fund NAV Service
 * Fetches free open mutual fund NAV data from mfapi.in, computes trailing returns,
 * and caches results in localStorage for offline resiliency.
 * 
 * DISCLAIMER:
 * Past performance does not guarantee future returns.
 * Data is fetched for educational purposes only.
 */

export interface IndexFundSnapshot {
  schemeCode: number;
  schemeName: string;
  shortName: string;
  fundHouse: string;
  nav: number;
  navDate: string; // 'DD-MM-YYYY'
  trailingReturn1Y: number | null; // e.g. 14.2%
  trailingReturn3Y: number | null; // e.g. 12.8% CAGR
}

export interface MarketSnapshotResult {
  funds: IndexFundSnapshot[];
  lastUpdated: string;
  isCached: boolean;
  status: 'live' | 'cached' | 'unavailable';
  error?: string;
}

export const TARGET_INDEX_FUNDS = [
  {
    code: 120716,
    shortName: 'UTI Nifty 50 Index Fund',
    category: 'Large Cap / Broad Index',
  },
  {
    code: 119063,
    shortName: 'HDFC Nifty 50 Index Fund',
    category: 'Large Cap / Broad Index',
  },
  {
    code: 101349,
    shortName: 'ICICI Prudential Nifty 50 Index Fund',
    category: 'Large Cap / Broad Index',
  },
  {
    code: 148943,
    shortName: 'SBI Nifty Next 50 Index Fund',
    category: 'Next 50 / Large-Mid Index',
  },
];

const MFAPI_CACHE_KEY = 'pennypath_mfapi_cache';

/**
 * Parses 'DD-MM-YYYY' into a Date object.
 */
export function parseNavDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Computes trailing 1Y and 3Y CAGR returns from an AMFI historical NAV list (sorted latest to oldest).
 */
export function computeTrailingReturns(
  history: Array<{ date: string; nav: string }>
): { return1Y: number | null; return3Y: number | null } {
  if (!history || history.length === 0) {
    return { return1Y: null, return3Y: null };
  }

  const latestNav = parseFloat(history[0].nav);
  if (isNaN(latestNav) || latestNav <= 0) {
    return { return1Y: null, return3Y: null };
  }

  const latestDate = parseNavDate(history[0].date);
  if (isNaN(latestDate.getTime())) {
    return { return1Y: null, return3Y: null };
  }

  // 1-Year target (approx 365 days ago)
  const target1Y = new Date(latestDate);
  target1Y.setDate(target1Y.getDate() - 365);

  // 3-Year target (approx 3 * 365 days ago)
  const target3Y = new Date(latestDate);
  target3Y.setDate(target3Y.getDate() - (3 * 365));

  const entry1Y = history.find((item) => parseNavDate(item.date) <= target1Y);
  const entry3Y = history.find((item) => parseNavDate(item.date) <= target3Y);

  let return1Y: number | null = null;
  if (entry1Y) {
    const nav1Y = parseFloat(entry1Y.nav);
    if (!isNaN(nav1Y) && nav1Y > 0) {
      return1Y = Number((((latestNav - nav1Y) / nav1Y) * 100).toFixed(2));
    }
  }

  let return3Y: number | null = null;
  if (entry3Y) {
    const nav3Y = parseFloat(entry3Y.nav);
    if (!isNaN(nav3Y) && nav3Y > 0) {
      // Annualized 3-Year CAGR: (latestNav / nav3Y)^(1/3) - 1
      const cagr = (Math.pow(latestNav / nav3Y, 1 / 3) - 1) * 100;
      return3Y = Number(cagr.toFixed(2));
    }
  }

  return { return1Y, return3Y };
}

/**
 * Retrieves cached index fund snapshots from localStorage.
 */
export function getCachedIndexFunds(): MarketSnapshotResult | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(MFAPI_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.funds) && parsed.funds.length > 0) {
      return {
        funds: parsed.funds,
        lastUpdated: parsed.lastUpdated || 'Previously cached',
        isCached: true,
        status: 'cached',
      };
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return null;
}

/**
 * Fetches mutual fund data for the target index funds from mfapi.in with timeout,
 * computes returns, caches in localStorage, and handles network failures gracefully.
 */
export async function fetchIndexFundSnapshots(timeoutMs: number = 5000): Promise<MarketSnapshotResult> {
  const cached = getCachedIndexFunds();

  // If currently offline, return cached data if available or unavailable state
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (isOffline) {
    if (cached) {
      return {
        ...cached,
        status: 'cached',
      };
    }
    return {
      funds: [],
      lastUpdated: 'Offline',
      isCached: false,
      status: 'unavailable',
      error: 'Device is offline and no cached data is available.',
    };
  }

  try {
    const fetchWithTimeout = async (fundInfo: (typeof TARGET_INDEX_FUNDS)[0]) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`https://api.mfapi.in/mf/${fundInfo.code}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        const history: Array<{ date: string; nav: string }> = data?.data || [];
        if (history.length === 0) {
          throw new Error('Empty NAV history');
        }

        const latest = history[0];
        const latestNav = parseFloat(latest.nav);
        const { return1Y, return3Y } = computeTrailingReturns(history);

        const snapshot: IndexFundSnapshot = {
          schemeCode: fundInfo.code,
          schemeName: data?.meta?.scheme_name || fundInfo.shortName,
          shortName: fundInfo.shortName,
          fundHouse: data?.meta?.fund_house || 'Mutual Fund',
          nav: Number(latestNav.toFixed(2)),
          navDate: latest.date,
          trailingReturn1Y: return1Y,
          trailingReturn3Y: return3Y,
        };

        return snapshot;
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    const results = await Promise.allSettled(TARGET_INDEX_FUNDS.map(fetchWithTimeout));
    const successfulFunds: IndexFundSnapshot[] = [];

    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        successfulFunds.push(res.value);
      }
    });

    if (successfulFunds.length > 0) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
      const lastUpdated = `${dateStr}, ${timeStr}`;

      const cachePayload = {
        funds: successfulFunds,
        lastUpdated,
      };

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(MFAPI_CACHE_KEY, JSON.stringify(cachePayload));
        }
      } catch {
        // Cache write error fallback
      }

      return {
        funds: successfulFunds,
        lastUpdated,
        isCached: false,
        status: 'live',
      };
    }

    // All fetches failed: fallback to cache if available
    if (cached) {
      return {
        ...cached,
        status: 'cached',
        error: 'Network refresh failed; showing cached data.',
      };
    }

    return {
      funds: [],
      lastUpdated: 'Unavailable',
      isCached: false,
      status: 'unavailable',
      error: 'Unable to reach AMFI API and no local cache is available.',
    };
  } catch (err: unknown) {
    if (cached) {
      return {
        ...cached,
        status: 'cached',
        error: err instanceof Error ? err.message : 'Network error',
      };
    }

    return {
      funds: [],
      lastUpdated: 'Unavailable',
      isCached: false,
      status: 'unavailable',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
