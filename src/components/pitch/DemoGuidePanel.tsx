import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePitch } from '../../context/PitchContext';
import {
  Sparkles,
  RotateCcw,
  Minimize2,
  Maximize2,
  Tv,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Clock,
  Compass,
  AlertTriangle,
  Move,
  Languages,
  CheckCircle2,
  X,
} from 'lucide-react';

export const DemoGuidePanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    isPitchMode,
    togglePitchMode,
    isBigScreen,
    toggleBigScreen,
    isMinimized,
    toggleMinimized,
    panelPosition,
    setPanelPosition,
    currentStepIndex,
    setCurrentStepIndex,
    steps,
    executeStep,
    resetDemoDataFast,
    lastResetDurationMs,
    resetFeedback,
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
  } = usePitch();

  const [isResetting, setIsResetting] = useState(false);

  if (!isPitchMode) return null;

  const currentStep = steps[currentStepIndex];

  // Format mm:ss for pitch timer
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleInstantReset = async () => {
    setIsResetting(true);
    await resetDemoDataFast();
    setIsResetting(false);
  };

  // Minimized Floating Pill View (NEVER overlaps key UI on 1280x720)
  if (isMinimized) {
    return (
      <aside
        aria-label="Demo Guide Minimized Control"
        className={`fixed z-50 ${
          panelPosition === 'top-right'
            ? 'top-4 right-4'
            : 'bottom-4 sm:bottom-6 right-4 sm:right-6'
        } animate-in fade-in duration-150`}
      >
        <div className="flex items-center gap-2 bg-ink text-paper px-3.5 py-2 rounded-full shadow-2xl border-2 border-sand/40">
          <button
            type="button"
            onClick={toggleMinimized}
            className="flex items-center gap-2 hover:text-sky transition-colors text-left"
            title="Expand 5-Minute Demo Guide"
          >
            <Sparkles className="w-4 h-4 text-sky shrink-0" />
            <span className="text-xs font-bold tracking-wide">
              Step {currentStep.number}/5: {t(currentStep.titleKey)}
            </span>
            <span className="font-mono text-[11px] text-sand bg-ink-light px-2 py-0.5 rounded-full">
              {formattedTime}
            </span>
          </button>

          <div className="h-4 w-px bg-sand/30 mx-0.5" />

          {/* Quick Step Action Trigger */}
          <button
            type="button"
            onClick={() => executeStep(currentStepIndex)}
            className="touch-target px-2.5 py-1 rounded-full bg-accent hover:bg-accent-light text-paper text-xs font-bold transition-all shadow-xs"
            title={t(currentStep.buttonLabelKey)}
          >
            {t(currentStep.buttonLabelKey)}
          </button>

          {/* Instant Reset Button */}
          <button
            type="button"
            onClick={handleInstantReset}
            disabled={isResetting}
            className="touch-target p-1.5 rounded-full hover:bg-ink-light text-sand transition-colors"
            title="Reset demo data (< 1s)"
            aria-label="Reset demo data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          </button>

          {/* Expand Button */}
          <button
            type="button"
            onClick={toggleMinimized}
            className="touch-target p-1.5 rounded-full hover:bg-ink-light text-paper/80 transition-colors"
            title="Expand Guide"
            aria-label="Expand Guide"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Reset feedback badge */}
        {resetFeedback && (
          <div className="mt-1 text-center">
            <span className="inline-block text-[10px] font-semibold bg-sky/90 text-ink px-2 py-0.5 rounded-full shadow-md animate-bounce">
              ⚡ {resetFeedback}
            </span>
          </div>
        )}
      </aside>
    );
  }

  // Expanded Floating Guide Panel
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4 sm:right-6',
    'top-right': 'top-14 right-4 sm:right-6',
    'dock-bottom': 'bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-4',
  }[panelPosition];

  return (
    <aside
      aria-label="PennyPath Live Pitch Demo Guide"
      className={`fixed ${positionClasses} z-50 w-full sm:w-[380px] max-h-[88vh] sm:max-h-[640px] flex flex-col bg-paper/95 backdrop-blur-md rounded-2xl border-2 border-ink shadow-2xl text-ink overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200`}
    >
      {/* Panel Top Header */}
      <div className="bg-ink text-paper p-3.5 flex items-center justify-between border-b border-sand/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent text-paper flex items-center justify-center font-bold text-xs">
            P
          </div>
          <div>
            <h2 className="font-fraunces font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span>{t('pitch.guide_title')}</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sand/20 text-sand">
                5-Min Pitch
              </span>
            </h2>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-1">
          {/* Position Switcher */}
          <button
            type="button"
            onClick={() => {
              const next =
                panelPosition === 'bottom-right'
                  ? 'top-right'
                  : panelPosition === 'top-right'
                  ? 'dock-bottom'
                  : 'bottom-right';
              setPanelPosition(next);
            }}
            className="p-1.5 rounded-lg hover:bg-ink-light text-paper/70 hover:text-paper transition-colors"
            title={`Dock Position: ${panelPosition}`}
            aria-label="Change dock position"
          >
            <Move className="w-3.5 h-3.5" />
          </button>

          {/* Big-Screen Mode Toggle */}
          <button
            type="button"
            onClick={toggleBigScreen}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
              isBigScreen
                ? 'bg-sky text-ink'
                : 'hover:bg-ink-light text-paper/70 hover:text-paper'
            }`}
            title="Toggle Big-Screen Projector Mode (1280x720 / 1080p)"
            aria-label="Toggle Big-Screen Projector Mode"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={toggleMinimized}
            className="p-1.5 rounded-lg hover:bg-ink-light text-paper/70 hover:text-paper transition-colors"
            title="Minimize guide (avoids overlapping key UI)"
            aria-label="Minimize guide"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close/Exit Pitch Mode */}
          <button
            type="button"
            onClick={togglePitchMode}
            className="p-1.5 rounded-lg hover:bg-accent text-paper/70 hover:text-paper transition-colors"
            title="Exit Pitch Mode"
            aria-label="Exit Pitch Mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timer & Fast Reset Utility Bar */}
      <div className="bg-sand/30 border-b border-ink/15 px-3.5 py-2 flex items-center justify-between text-xs">
        {/* 5-Minute Timer */}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-ink/70" />
          <span className="font-mono font-bold text-ink text-sm">
            {formattedTime}
          </span>
          <button
            type="button"
            onClick={isTimerRunning ? pauseTimer : startTimer}
            className="touch-target p-1 rounded hover:bg-sand/60 text-ink/80 transition-colors"
            title={isTimerRunning ? 'Pause Pitch Timer' : 'Start Pitch Timer'}
          >
            {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-accent" />}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="touch-target p-1 rounded hover:bg-sand/60 text-ink/60 transition-colors text-[10px]"
            title="Reset Timer"
          >
            0:00
          </button>
        </div>

        {/* 1-Second Reset Trigger Button */}
        <button
          type="button"
          onClick={handleInstantReset}
          disabled={isResetting}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1 rounded-btn bg-accent hover:bg-accent-light active:bg-accent-dark text-paper text-xs font-bold transition-all shadow-xs"
          title="Restores clean seeded demo data in < 1 second"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : t('pitch.reset_button')}</span>
        </button>
      </div>

      {/* Reset Duration Feedback Banner */}
      {resetFeedback && (
        <div className="bg-sky/30 border-b border-sky-dark/30 px-3.5 py-1 text-xs font-medium text-ink flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-ink" />
          <span>{resetFeedback}</span>
        </div>
      )}

      {/* Scrollable Script Steps Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Step Progress Dots */}
        <div className="flex items-center justify-between gap-1 pb-2 border-b border-ink/10">
          {steps.map((st, idx) => {
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex-1 flex flex-col items-center gap-1 p-1 rounded-md transition-all ${
                  isActive ? 'bg-ink text-paper' : 'hover:bg-sand/40 text-ink/70'
                }`}
              >
                <span className="text-[10px] font-bold">Step {st.number}</span>
                <span className="text-[9px] opacity-80">{st.timeRange.split(' - ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Hero Card */}
        <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/15 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-accent font-mono block">
                {currentStep.timeRange}
              </span>
              <h3 className="font-fraunces font-bold text-base text-ink leading-tight">
                Step {currentStep.number}: {t(currentStep.titleKey)}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ink text-paper">
              {currentStep.number} / 5
            </span>
          </div>

          {/* Speaker Cue / Script Prompter */}
          <div className="p-2.5 rounded-lg bg-paper border border-ink/10 text-xs text-ink/80 leading-relaxed italic">
            "{t(currentStep.cueKey)}"
          </div>

          {/* The Hero Action Button that navigates & sets state */}
          <button
            type="button"
            onClick={() => executeStep(currentStepIndex)}
            className="w-full touch-target py-2.5 px-4 rounded-xl bg-ink hover:bg-ink-light active:bg-ink-dark text-paper text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>{t(currentStep.buttonLabelKey)}</span>
            <ChevronRight className="w-4 h-4 text-sky" />
          </button>
        </div>

        {/* Quick Access List: Jump to Any Step Directly */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60 block">
            Direct Step Triggers:
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {steps.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                onClick={() => executeStep(idx)}
                className={`w-full touch-target text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  idx === currentStepIndex
                    ? 'border-ink bg-sand/40 font-bold text-ink'
                    : 'border-ink/10 bg-paper hover:bg-sand/20 text-ink/80 font-medium'
                }`}
              >
                <div className="truncate">
                  <span className="opacity-60 mr-1.5">#{st.number}</span>
                  <span>{t(st.buttonLabelKey)}</span>
                </div>
                <span className="text-[10px] font-mono text-ink/50 ml-2 shrink-0">
                  {st.timeRange}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panel Bottom Navigation Bar */}
      <div className="p-3 bg-sand/20 border-t border-ink/15 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            const prev = Math.max(0, currentStepIndex - 1);
            setCurrentStepIndex(prev);
          }}
          disabled={currentStepIndex === 0}
          className="touch-target px-2.5 py-1.5 rounded-lg border border-ink/20 hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent font-medium flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>{t('pitch.prev_step')}</span>
        </button>

        <span className="text-[11px] text-ink/60 font-semibold">
          {currentStepIndex + 1} of {steps.length}
        </span>

        <button
          type="button"
          onClick={() => {
            const next = Math.min(steps.length - 1, currentStepIndex + 1);
            setCurrentStepIndex(next);
          }}
          disabled={currentStepIndex === steps.length - 1}
          className="touch-target px-2.5 py-1.5 rounded-lg border border-ink/20 hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent font-medium flex items-center gap-1 transition-colors"
        >
          <span>{t('pitch.next_step')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
