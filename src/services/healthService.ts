import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';
import { getLastNavFetchInfo, NavFetchInfo } from './marketApi';
import { repository } from '../repository';

export interface I18nCoverageReport {
  totalEnKeys: number;
  totalHiKeys: number;
  missingInHi: string[];
  coveragePercent: number;
  categories: { name: string; count: number }[];
}

export interface HealthStatus {
  isOnline: boolean;
  repository: {
    name: string;
    type: string;
    isDemo: boolean;
    persona: string | null;
    storageEngine: string;
    keysCount: number;
  };
  lastNavFetch: NavFetchInfo;
  i18n: I18nCoverageReport;
  build: {
    hash: string;
    buildTime: string;
    version: string;
    environment: string;
  };
}

export const BUILD_HASH = 'pennypath-7f9a2e1';
export const BUILD_TIME = '2026-10-20T10:30:00+05:30';
export const APP_VERSION = '1.0.0';

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        keys = keys.concat(flattenKeys(obj[k], fullPath));
      } else {
        keys.push(fullPath);
      }
    }
  }
  return keys;
}

export function computeI18nCoverage(): I18nCoverageReport {
  const enKeys = flattenKeys(en);
  const hiKeys = new Set(flattenKeys(hi));

  const missingInHi = enKeys.filter((key) => !hiKeys.has(key));
  const coveredCount = enKeys.length - missingInHi.length;
  const coveragePercent = enKeys.length > 0 ? Number(((coveredCount / enKeys.length) * 100).toFixed(1)) : 100;

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const k of enKeys) {
    const topCategory = k.split('.')[0] || 'general';
    categoryCounts[topCategory] = (categoryCounts[topCategory] || 0) + 1;
  }

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    totalEnKeys: enKeys.length,
    totalHiKeys: hiKeys.size,
    missingInHi,
    coveragePercent,
    categories,
  };
}

export function getHealthStatus(): HealthStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isDemo = repository.isDemoMode();
  const persona = repository.getDemoPersona();

  let storageKeysCount = 0;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      storageKeysCount = Object.keys(window.localStorage).filter((k) =>
        k.startsWith('pennypath_')
      ).length;
    }
  } catch {
    storageKeysCount = 0;
  }

  return {
    isOnline,
    repository: {
      name: 'LocalSeededRepository',
      type: 'Local-first Offline Demo Repository',
      isDemo,
      persona: persona ? persona.toUpperCase() : 'NONE',
      storageEngine: 'window.localStorage + In-Memory Fallback',
      keysCount: storageKeysCount,
    },
    lastNavFetch: getLastNavFetchInfo(),
    i18n: computeI18nCoverage(),
    build: {
      hash: BUILD_HASH,
      buildTime: BUILD_TIME,
      version: APP_VERSION,
      environment: import.meta.env.MODE || 'production',
    },
  };
}
