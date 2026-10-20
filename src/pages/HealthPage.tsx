import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHealthStatus, HealthStatus } from '../services/healthService';
import { fetchMarketData, setForcedFallback, isForcedFallback } from '../services/marketApi';
import {
  Activity,
  Wifi,
  WifiOff,
  Database,
  TrendingUp,
  Globe,
  GitBranch,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Server,
  Layers,
} from 'lucide-react';

export const HealthPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus>(getHealthStatus());
  const [isFetchingNav, setIsFetchingNav] = useState(false);
  const [forcedFallback, setForcedFallbackState] = useState(isForcedFallback());

  const refreshHealth = () => {
    setHealth(getHealthStatus());
  };

  useEffect(() => {
    const handleStatusChange = () => refreshHealth();
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const interval = setInterval(refreshHealth, 2000);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  const handleTriggerNav = async () => {
    setIsFetchingNav(true);
    await fetchMarketData();
    refreshHealth();
    setIsFetchingNav(false);
  };

  const handleToggleForcedFallback = () => {
    const next = !forcedFallback;
    setForcedFallback(next);
    setForcedFallbackState(next);
    handleTriggerNav();
  };

  return (
    <div className="min-h-screen bg-paper text-ink p-4 sm:p-8 font-inter">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-ink/15">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="touch-target p-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink transition-colors flex items-center justify-center border border-ink/20"
              aria-label="Back to application"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-accent" />
                <h1 className="text-2xl sm:text-3xl font-fraunces font-bold text-ink">
                  System Health & Diagnostics
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-ink/70 mt-0.5">
                Hidden system audit for PennyPath offline engine, repository integrity, and compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshHealth}
              className="touch-target px-3 py-1.5 rounded-btn bg-sand/30 hover:bg-sand/60 text-xs font-semibold text-ink border border-ink/20 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
            <Link
              to="/pitch"
              className="touch-target px-3.5 py-1.5 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs font-bold transition-all shadow-xs"
            >
              Enter Pitch Mode
            </Link>
          </div>
        </div>

        {/* Top 4 Metric Summaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Online / Offline Status */}
          <div className="p-4 rounded-card bg-sand/20 border border-ink/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70">
              1. Connectivity Status
            </span>
            <div className="flex items-center gap-2">
              {health.isOnline ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-lg font-fraunces font-bold text-emerald-800">
                    ONLINE
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                  <span className="text-lg font-fraunces font-bold text-accent">
                    AIRPLANE MODE (OFFLINE)
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-ink/70">
              {health.isOnline ? 'Network active' : 'Zero network required (100% offline-ready)'}
            </p>
          </div>

          {/* 2. Repository in Use */}
          <div className="p-4 rounded-card bg-sand/20 border border-ink/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70">
              2. Repository In Use
            </span>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-ink" />
              <span className="text-base font-fraunces font-bold text-ink truncate">
                {health.repository.name}
              </span>
            </div>
            <p className="text-xs text-ink/70">
              Persona: <strong>{health.repository.persona}</strong> • {health.repository.keysCount} keys in storage
            </p>
          </div>

          {/* 3. Last NAV Fetch */}
          <div className="p-4 rounded-card bg-sand/20 border border-ink/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70">
              3. Last NAV Fetch
            </span>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-ink" />
              <span className="text-sm font-fraunces font-bold text-ink truncate">
                {health.lastNavFetch.status === 'live' ? 'Live AMFI NAV' : 'Fallback Snapshot'}
              </span>
            </div>
            <p className="text-xs text-ink/70">
              Latency: {health.lastNavFetch.latencyMs}ms ({health.lastNavFetch.lastNav})
            </p>
          </div>

          {/* 4. i18n Coverage */}
          <div className="p-4 rounded-card bg-sand/20 border border-ink/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70">
              4. i18n Translation
            </span>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-ink" />
              <span className="text-2xl font-fraunces font-bold text-ink">
                {health.i18n.coveragePercent}%
              </span>
            </div>
            <p className="text-xs text-ink/70">
              {health.i18n.totalEnKeys} keys in EN & HI (0 missing)
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-5">
          {/* Section A: Repository Deep Dive */}
          <div className="p-5 rounded-card bg-paper border border-ink/15 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  Repository Architecture & State
                </h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sand/40 text-ink border border-ink/20">
                Local-First
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 p-3 rounded-btn bg-sand/15 border border-ink/10">
                <div>
                  <span className="text-ink/60">Repository Implementation: </span>
                  <strong>{health.repository.name}</strong>
                </div>
                <div>
                  <span className="text-ink/60">Classification: </span>
                  <span>{health.repository.type}</span>
                </div>
                <div>
                  <span className="text-ink/60">Storage Engine: </span>
                  <code>{health.repository.storageEngine}</code>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-btn bg-sand/15 border border-ink/10">
                <div>
                  <span className="text-ink/60">Demo Mode Status: </span>
                  <strong className={health.repository.isDemo ? 'text-emerald-700' : 'text-ink'}>
                    {health.repository.isDemo ? 'ACTIVE' : 'INACTIVE'}
                  </strong>
                </div>
                <div>
                  <span className="text-ink/60">Current Persona: </span>
                  <span className="font-bold">{health.repository.persona}</span>
                </div>
                <div>
                  <span className="text-ink/60">Stored Local Keys: </span>
                  <span>{health.repository.keysCount} keys</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: NAV Fetch & Market Fallback Tester */}
          <div className="p-5 rounded-card bg-paper border border-ink/15 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-ink/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  Market Benchmarks & NAV Fetch Status
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleForcedFallback}
                  className={`touch-target px-2.5 py-1 rounded-btn text-xs font-semibold border transition-colors ${
                    forcedFallback
                      ? 'bg-accent text-paper border-accent'
                      : 'bg-sand/30 hover:bg-sand/60 text-ink border-ink/20'
                  }`}
                  title="Simulate Market API outage during pitch"
                >
                  {forcedFallback ? 'Force Fallback: ON' : 'Force Fallback: OFF'}
                </button>

                <button
                  type="button"
                  onClick={handleTriggerNav}
                  disabled={isFetchingNav}
                  className="touch-target px-3 py-1 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3 h-3 ${isFetchingNav ? 'animate-spin' : ''}`} />
                  <span>{isFetchingNav ? 'Fetching...' : 'Test NAV Fetch'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 p-3 rounded-btn bg-sand/15 border border-ink/10">
                <div>
                  <span className="text-ink/60">Last Fetch Timestamp: </span>
                  <code className="text-[11px]">{health.lastNavFetch.timestamp}</code>
                </div>
                <div>
                  <span className="text-ink/60">Fetch Mode: </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      health.lastNavFetch.isFallback
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {health.lastNavFetch.isFallback ? 'SAMPLE DATA (FALLBACK SNAPSHOT)' : 'LIVE (200 OK)'}
                  </span>
                </div>
                <div>
                  <span className="text-ink/60">API Endpoint: </span>
                  <code className="text-[11px] break-all">{health.lastNavFetch.endpoint}</code>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-btn bg-sand/15 border border-ink/10">
                <div>
                  <span className="text-ink/60">Source Data: </span>
                  <span>{health.lastNavFetch.source}</span>
                </div>
                <div>
                  <span className="text-ink/60">Latency: </span>
                  <strong className="font-mono">{health.lastNavFetch.latencyMs} ms</strong>
                </div>
                {health.lastNavFetch.error && (
                  <div>
                    <span className="text-ink/60">Note: </span>
                    <span className="text-accent">{health.lastNavFetch.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Bilingual i18n Translation Coverage */}
          <div className="p-5 rounded-card bg-paper border border-ink/15 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-accent" />
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  Bilingual Localization (i18n) Audit
                </h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {health.i18n.coveragePercent}% Parity
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-btn bg-sand/15 border border-ink/10">
                <div>
                  <span>Total English Keys: <strong>{health.i18n.totalEnKeys}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Total Hindi Keys: <strong>{health.i18n.totalHiKeys}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>0 Missing Keys</span>
                </div>
              </div>

              {/* Category coverage grid */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/70 mb-2">
                  Namespaces & Key Distribution:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {health.i18n.categories.map((cat) => (
                    <div
                      key={cat.name}
                      className="p-2 rounded-btn bg-sand/10 border border-ink/10 flex items-center justify-between"
                    >
                      <span className="font-mono font-medium text-ink">{cat.name}</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-sand/30 text-ink">
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section D: Build Metadata */}
          <div className="p-5 rounded-card bg-paper border border-ink/15 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-accent" />
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  Build Identification & Runtime
                </h2>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-sand/40 text-ink border border-ink/20">
                {health.build.hash}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-btn bg-sand/15 border border-ink/10">
                <span className="text-ink/60 block text-[11px]">Build Hash</span>
                <strong className="font-mono text-sm text-ink">{health.build.hash}</strong>
              </div>
              <div className="p-3 rounded-btn bg-sand/15 border border-ink/10">
                <span className="text-ink/60 block text-[11px]">Build Timestamp</span>
                <span className="font-mono text-ink text-[11px]">{health.build.buildTime}</span>
              </div>
              <div className="p-3 rounded-btn bg-sand/15 border border-ink/10">
                <span className="text-ink/60 block text-[11px]">App Version & Mode</span>
                <span className="font-semibold text-ink">
                  v{health.build.version} ({health.build.environment})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
