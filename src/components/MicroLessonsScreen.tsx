import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { MicroLesson } from '../types';
import { getSuggestedLesson } from '../engine/lessonEngine';
import { LessonTryIt } from './lessons/LessonTryIt';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Award,
  Flame,
  GraduationCap,
  Filter,
} from 'lucide-react';

export const MicroLessonsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { mode, envelopes, reminders, goals, lessons, streakCount, completeLesson, profile } = useApp();

  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || 'lesson-1');
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'budgeting' | 'investing' | 'safety'>('all');

  const selectedLesson = useMemo(() => {
    return lessons.find((l) => l.id === selectedLessonId) || lessons[0];
  }, [lessons, selectedLessonId]);

  // Contextual recommendation check
  const suggested = useMemo(() => {
    return getSuggestedLesson({
      envelopes,
      reminders,
      goals,
      lessons,
      mode,
    });
  }, [envelopes, reminders, goals, lessons, mode]);

  const filteredLessons = useMemo(() => {
    if (activeFilter === 'all') return lessons;
    if (activeFilter === 'budgeting') {
      return lessons.filter((l) => l.tagKey.includes('budgeting') || l.tagKey.includes('basics'));
    }
    if (activeFilter === 'investing') {
      return lessons.filter((l) => l.tagKey.includes('investing'));
    }
    if (activeFilter === 'safety') {
      return lessons.filter((l) => l.tagKey.includes('safety') || l.tagKey.includes('debt'));
    }
    return lessons;
  }, [lessons, activeFilter]);

  const handleSelectLesson = (lesson: MicroLesson) => {
    setSelectedLessonId(lesson.id);
    setSelectedQuizOption(null);
    setHasSubmittedQuiz(false);
  };

  const handleQuizSubmit = () => {
    if (selectedQuizOption !== null && selectedLesson) {
      setHasSubmittedQuiz(true);
      if (selectedQuizOption === selectedLesson.quiz.correctOptionIndex) {
        completeLesson(selectedLesson.id);
      }
    }
  };

  const completedCount = lessons.filter((l) => l.isCompleted).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full px-1 sm:px-2">
      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-ink/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fraunces font-bold text-ink tracking-tight">
            {t('lessons.title')}
          </h1>
          <p className="text-xs sm:text-sm text-ink/75 mt-0.5">
            {t('lessons.subtitle')}
          </p>
        </div>

        {/* Progress & Streak Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Streak Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              mode === 'student'
                ? 'bg-accent/15 text-accent-dark border-accent/40 shadow-xs ring-1 ring-accent/30'
                : 'bg-sand/30 text-ink border-sand-dark/40'
            }`}
          >
            <Flame className={`w-4 h-4 ${mode === 'student' ? 'text-accent animate-pulse' : 'text-accent'}`} />
            <span>{t('lessons.streak_badge', { count: streakCount })}</span>
          </div>

          {/* Completed count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sand/20 border border-ink/15 text-xs font-semibold text-ink">
            <Award className="w-4 h-4 text-ink" />
            <span>
              {completedCount} of {lessons.length} {t('lessons.completed')}
            </span>
          </div>
        </div>
      </div>

      {/* STUDENT MODE EMPHASIS BANNER */}
      {mode === 'student' && (
        <div className="p-3.5 rounded-card bg-accent/10 border-2 border-accent/30 flex items-start sm:items-center gap-3">
          <GraduationCap className="w-5 h-5 text-accent shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-accent-dark">
              {t('lessons.student_streak_banner', { count: streakCount })}
            </p>
            <p className="text-[11px] text-ink/75 mt-0.5">
              Complete 1 micro-lesson daily to protect your semester pocket money and avoid campus debt traps.
            </p>
          </div>
        </div>
      )}

      {/* CONTEXTUAL RECOMMENDATION BANNER */}
      {suggested && suggested.lesson && !suggested.lesson.isCompleted && (
        <div
          onClick={() => handleSelectLesson(suggested.lesson)}
          className="p-3 sm:p-4 rounded-card bg-sand/20 border-2 border-sand-dark/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-sand/30 transition-all shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                  {t('lessons.contextual_badge')}
                </span>
                <span className="text-xs text-ink/70">
                  {suggested.lesson.readTimeMinutes} {t('lessons.minutes')}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-fraunces font-bold text-ink mt-1">
                {t(suggested.lesson.titleKey)}
              </h4>
              <p className="text-[11px] text-ink/75 mt-0.5">
                {t(suggested.reasonKey)}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="touch-target px-3.5 py-1.5 rounded-btn bg-ink text-paper text-xs font-semibold shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>{t('lessons.read')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <span className="text-xs font-bold text-ink/60 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" />
        </span>
        {[
          { id: 'all', labelKey: 'lessons.filter_all' },
          { id: 'budgeting', labelKey: 'lessons.filter_budgeting' },
          { id: 'investing', labelKey: 'lessons.filter_investing' },
          { id: 'safety', labelKey: 'lessons.filter_safety' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as any)}
            className={`touch-target px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
              activeFilter === tab.id
                ? 'bg-ink text-paper border-ink shadow-xs'
                : 'bg-paper text-ink/75 border-ink/15 hover:border-ink/40'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* MAIN 2-COLUMN VIEWPORT (Responsive 360px safe) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lesson Cards List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredLessons.map((lesson, idx) => {
            const isSelected = selectedLesson?.id === lesson.id;
            const isRecommended = suggested?.lesson?.id === lesson.id;

            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => handleSelectLesson(lesson)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-card border transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sand/30 border-ink shadow-sm ring-1 ring-ink'
                    : 'bg-paper border-ink/15 hover:border-ink/40 hover:bg-sand/10'
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between text-[11px] text-ink/70 mb-1 flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-sand-dark/20 text-ink text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sand/30 border border-sand">
                        {t(lesson.tagKey)}
                      </span>
                      {isRecommended && (
                        <span className="text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-1 py-0.5 rounded">
                          ★ Recommended
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.readTimeMinutes} {t('lessons.minutes')}
                    </span>
                  </div>

                  <h3 className="font-fraunces font-bold text-ink text-sm sm:text-base leading-snug mt-1 break-words">
                    {t(lesson.titleKey)}
                  </h3>
                  <p className="text-xs text-ink/75 line-clamp-2 mt-1 break-words">
                    {t(lesson.summaryKey)}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-ink/10 flex items-center justify-between text-xs w-full">
                  {lesson.isCompleted ? (
                    <span className="text-ink font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-ink" /> {t('lessons.completed')}
                    </span>
                  ) : (
                    <span className="text-ink/60">{t('lessons.not_completed')}</span>
                  )}
                  <span className="text-ink font-semibold flex items-center gap-1">
                    {t('lessons.read')} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Selected Lesson Viewer, Try-It, and Quiz */}
        {selectedLesson && (
          <div className="lg:col-span-7 p-4 sm:p-6 rounded-card bg-paper border border-ink/20 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-ink/70 mb-1 flex-wrap">
                <span className="uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-sand/30 border border-sand">
                  {t(selectedLesson.tagKey)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3 h-3" />
                  {selectedLesson.readTimeMinutes} {t('lessons.minutes')}
                </span>
                {selectedLesson.isCompleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky/30 text-ink border border-sky-dark/30 ml-auto">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('lessons.completed')}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-fraunces font-bold text-ink leading-tight break-words">
                {t(selectedLesson.titleKey)}
              </h2>
            </div>

            {/* Content Body */}
            <div className="text-xs sm:text-sm text-ink/90 leading-relaxed space-y-3 font-inter break-words">
              <p className="font-semibold text-ink bg-sand/20 p-3 rounded-btn border-l-4 border-ink">
                {t(selectedLesson.summaryKey)}
              </p>
              <p>{t(selectedLesson.contentKey)}</p>
            </div>

            {/* Interactive "Try It" Widget with User's / Demo Data */}
            <LessonTryIt
              topicId={selectedLesson.topicId}
              monthlyIncome={profile?.monthlyIncome || 38000}
              userMode={mode}
            />

            {/* Core Principle Takeaway Box */}
            <div className="p-3.5 rounded-card bg-sand/25 border-l-4 border-accent flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-0.5">
                  {t('lessons.core_principle')}
                </span>
                <p className="text-xs text-ink/90 font-medium leading-relaxed break-words">
                  {t(selectedLesson.takeawayKey)}
                </p>
              </div>
            </div>

            {/* Interactive Knowledge Check Quiz */}
            <div className="pt-4 border-t border-ink/15 space-y-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent" />
                <h4 className="font-fraunces font-bold text-sm sm:text-base text-ink">
                  {t('lessons.quiz_title')}
                </h4>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-ink break-words">
                {t(selectedLesson.quiz.questionKey)}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {selectedLesson.quiz.optionsKeys.map((optKey, idx) => {
                  const isChecked = selectedQuizOption === idx;
                  const isCorrect = idx === selectedLesson.quiz.correctOptionIndex;

                  let optClass = 'bg-paper border-ink/20 hover:border-ink/50 text-ink';
                  if (hasSubmittedQuiz) {
                    if (isCorrect) {
                      optClass = 'bg-sky/40 border-ink text-ink font-semibold';
                    } else if (isChecked && !isCorrect) {
                      optClass = 'bg-accent/15 border-accent text-accent-dark';
                    }
                  } else if (isChecked) {
                    optClass = 'bg-sand/30 border-ink ring-1 ring-ink text-ink font-semibold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={hasSubmittedQuiz}
                      onClick={() => setSelectedQuizOption(idx)}
                      className={`w-full text-left p-3 rounded-btn border text-xs sm:text-sm transition-all flex items-center justify-between gap-2 break-words ${optClass}`}
                    >
                      <span className="break-words">{t(optKey)}</span>
                      {hasSubmittedQuiz && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-ink shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Submit & Result */}
              {!hasSubmittedQuiz ? (
                <button
                  type="button"
                  disabled={selectedQuizOption === null}
                  onClick={handleQuizSubmit}
                  className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light disabled:opacity-40 text-paper text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                >
                  {t('lessons.check_answer')}
                </button>
              ) : (
                <div className="p-3.5 rounded-btn bg-sand/30 border border-ink/15 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    {selectedQuizOption === selectedLesson.quiz.correctOptionIndex ? (
                      <span className="text-ink">{t('lessons.correct_banner')}</span>
                    ) : (
                      <span className="text-accent">{t('lessons.incorrect_banner')}</span>
                    )}
                  </div>
                  <p className="text-xs text-ink/80 break-words">
                    {t(selectedLesson.quiz.explanationKey)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
