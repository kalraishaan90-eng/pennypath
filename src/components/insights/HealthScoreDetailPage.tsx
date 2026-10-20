import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HealthScoreDetailResult,
  HealthSubScoreDetail,
  Add10PointsSuggestion,
} from '../../engine/insightsEngine';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Activity,
  Award,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface HealthScoreDetailPageProps {
  data: HealthScoreDetailResult;
  onSelectSuggestion?: (sug: Add10PointsSuggestion) => void;
}

export const HealthScoreDetailPage: React.FC<HealthScoreDetailPageProps> = ({
  data,
  onSelectSuggestion,
}) => {
  const { t } = useTranslation();
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  // Score Ring
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * data.totalScore) / 100;

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#0F414A'; // ink
    if (score >= 50) return '#C29D74'; // sand-dark / amber
    return '#7F0303'; // accent maroon
  };

  const ringColor = getScoreColor(data.totalScore);

  const getSubBarBg = (status: 'good' | 'warning' | 'alert') => {
    if (status === 'good') return 'bg-ink';
    if (status === 'warning') return 'bg-sand-dark';
    return 'bg-accent';
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Card */}
      <Card withAwningAccent>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Animated SVG Ring */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-ink/10"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-fraunces text-ink leading-none">
                  {data.totalScore}
                </span>
                <span className="text-[10px] text-ink/60 font-semibold uppercase mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Health Diagnosis & Assessment */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl sm:text-2xl font-bold font-fraunces text-ink">
                  {data.totalScore >= 75
                    ? 'Robust Financial Health'
                    : data.totalScore >= 50
                    ? 'Moderate Financial Balance'
                    : 'Needs Rebalancing'}
                </h3>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full capitalize"
                  style={{
                    backgroundColor: `${ringColor}15`,
                    color: ringColor,
                    border: `1px solid ${ringColor}35`,
                  }}
                >
                  {data.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-ink/75 max-w-xl">
                The Financial Health Score evaluates your cash flow across four weighted
                foundations: savings retention, envelope budget discipline, emergency liquid buffer,
                and recurring debt obligation cleanliness.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Four Sub-Scores Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-fraunces text-ink">
              {t('insights.health.four_pillars', 'The Four Health Pillars')}
            </h3>
            <p className="text-xs text-ink/60">
              Each pillar contributes a weighted portion to your overall 100-point score
            </p>
          </div>
          <Badge variant="sand" size="sm">
            Weighted 100 Pts
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.subScores.map((pillar) => {
            const isExpanded = expandedPillar === pillar.id;

            return (
              <div
                key={pillar.id}
                className="bg-paper border border-ink/15 rounded-xl p-4 shadow-sm hover:border-ink/30 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Pillar Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm sm:text-base text-ink font-fraunces">
                          {pillar.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink/60 font-semibold block mt-0.5">
                        Weight: {pillar.weightPercent}% (Max {pillar.maxPoints} pts)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold font-fraunces text-ink tabular-nums">
                        {pillar.pointsEarned} / {pillar.maxPoints}
                      </span>
                      <span className="text-[10px] text-ink/60 font-medium block">
                        score: {pillar.score}/100
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="w-full h-2.5 bg-ink/10 rounded-full overflow-hidden my-2.5"
                    role="progressbar"
                    aria-valuenow={pillar.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={pillar.title}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getSubBarBg(
                        pillar.status
                      )}`}
                      style={{ width: `${Math.min(100, Math.max(5, pillar.score))}%` }}
                    />
                  </div>

                  {/* Metrics & Benchmark */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-sand/15 border border-sand/30 text-xs my-2">
                    <div>
                      <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                        Current Metric
                      </span>
                      <span className="font-bold text-ink">{pillar.currentMetric}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                        Target Benchmark
                      </span>
                      <span className="font-semibold text-ink/80">{pillar.targetBenchmark}</span>
                    </div>
                  </div>

                  {/* Explanation text */}
                  <p className="text-xs text-ink/75 leading-relaxed mt-2">{pillar.explanation}</p>
                </div>

                {/* Improvement tip footer */}
                <div className="mt-3 pt-2.5 border-t border-ink/10 flex items-start gap-2 text-xs text-ink">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="font-medium text-[11px] text-ink/90 leading-snug">
                    <span className="font-bold text-ink">Action: </span>
                    {pillar.improvementTip}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "How to Add 10 Points" Suggestions Ranked by Impact */}
      <Card withAwningAccent className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <CardTitle>{t('insights.health.add_10_title', 'How to Add 10 Points')}</CardTitle>
            <Badge variant="awning" size="sm">Ranked by Impact</Badge>
          </div>
          <CardDescription>
            {t(
              'insights.health.add_10_subtitle',
              'High-leverage actions modeled by the engine to quickly advance to the next health tier'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {data.add10PointsSuggestions.map((sug) => (
            <div
              key={sug.id}
              onClick={() => onSelectSuggestion?.(sug)}
              className="p-3.5 sm:p-4 rounded-xl border border-ink/15 hover:border-ink/30 bg-paper hover:bg-sand/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group"
            >
              {/* Left: Rank, Points gain pill, Title & Action */}
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-ink text-paper text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  #{sug.rank}
                </span>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-sm text-ink group-hover:text-ink-dark font-fraunces">
                      {sug.title}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                      +{sug.pointsGain} Points
                    </span>
                    <span className="text-[10px] text-ink/60 font-semibold">
                      Target: {sug.targetSubScore}
                    </span>
                  </div>

                  <p className="text-xs text-ink/80 mt-1 leading-relaxed">
                    {sug.action}
                  </p>

                  <p className="text-[11px] text-ink/60 font-medium mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sand-dark inline-block" />
                    <span>{sug.financialStep}</span>
                  </p>
                </div>
              </div>

              {/* Right: Points gain badge & action hint */}
              <div className="self-end sm:self-center shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  className="touch-target px-3 py-1.5 rounded-btn bg-ink text-paper text-xs font-semibold hover:bg-ink-light transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>Apply Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* 10-Point Combo Summary Banner */}
          <div className="p-3 rounded-xl bg-sand/20 border border-sand/40 text-xs flex items-center justify-between gap-2 mt-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-ink shrink-0" />
              <div>
                <span className="font-bold text-ink">
                  Path to +10 Points:
                </span>
                <span className="text-ink/80 ml-1">
                  Applying Step #1 and Step #2 will comfortably add{' '}
                  <span className="font-bold text-accent">
                    +
                    {data.add10PointsSuggestions
                      .slice(0, 2)
                      .reduce((s, item) => s + item.pointsGain, 0)}{' '}
                    points
                  </span>{' '}
                  to your health score.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
