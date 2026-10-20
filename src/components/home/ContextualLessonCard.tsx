import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getSuggestedLesson } from '../../engine/lessonEngine';
import { BookOpen, Sparkles, Clock, ArrowRight, Flame, CheckCircle, X, HelpCircle } from 'lucide-react';
import { LessonTryIt } from '../lessons/LessonTryIt';

export const ContextualLessonCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mode, envelopes, reminders, goals, lessons, streakCount, completeLesson, profile } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuizOpt, setSelectedQuizOpt] = useState<number | null>(null);
  const [hasCheckedQuiz, setHasCheckedQuiz] = useState(false);

  const suggested = getSuggestedLesson({
    envelopes,
    reminders,
    goals,
    lessons,
    mode,
  });

  if (!suggested || !suggested.lesson) {
    return null;
  }

  const { lesson, reasonKey } = suggested;

  const handleOpenLesson = () => {
    setSelectedQuizOpt(null);
    setHasCheckedQuiz(false);
    setIsModalOpen(true);
  };

  const handleQuizSubmit = () => {
    if (selectedQuizOpt !== null) {
      setHasCheckedQuiz(true);
      if (selectedQuizOpt === lesson.quiz.correctOptionIndex) {
        completeLesson(lesson.id);
      }
    }
  };

  return (
    <>
      <article
        className="bg-paper border-2 border-sand-dark/40 rounded-card p-4 sm:p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
        aria-label="Contextual micro-lesson recommendation"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-sand-dark to-ink" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-accent" />
              {t('lessons.contextual_badge')}
            </span>

            {/* Streak Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                mode === 'student'
                  ? 'bg-accent/15 text-accent-dark border-accent/40 shadow-xs ring-1 ring-accent/30'
                  : 'bg-sand/30 text-ink border-sand-dark/40'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${mode === 'student' ? 'text-accent animate-pulse' : 'text-accent'}`} />
              <span>{t('lessons.streak_badge', { count: streakCount })}</span>
            </span>
          </div>

          <span className="flex items-center gap-1 text-xs text-ink/70 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {lesson.readTimeMinutes} {t('lessons.minutes')}
          </span>
        </div>

        {/* Reason contextual banner */}
        <p className="text-xs font-semibold text-accent-dark mb-1 flex items-center gap-1.5">
          <span>💡</span> {t(reasonKey)}
        </p>

        {/* Lesson Title & Summary */}
        <div className="my-2">
          <h3 className="text-base sm:text-lg font-fraunces font-bold text-ink leading-snug">
            {t(lesson.titleKey)}
          </h3>
          <p className="text-xs sm:text-sm text-ink/80 mt-1 line-clamp-2">
            {t(lesson.summaryKey)}
          </p>
        </div>

        {/* Action Button Row */}
        <div className="mt-4 pt-3 border-t border-ink/10 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleOpenLesson}
            className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-sky" />
            <span>{t('lessons.contextual_cards.learn_cta')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/lessons')}
            className="touch-target text-xs font-bold text-ink hover:text-accent flex items-center gap-1 transition-colors"
          >
            <span>{t('nav.lessons')} (10)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </article>

      {/* Interactive 90-Second Lesson Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl bg-paper border-2 border-ink rounded-card shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-btn hover:bg-sand/30 text-ink/70 hover:text-ink transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="pr-8 space-y-1">
              <div className="flex items-center gap-2 text-xs text-ink/70">
                <span className="uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sand/30 border border-sand">
                  {t(lesson.tagKey)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5" /> {lesson.readTimeMinutes} {t('lessons.minutes')}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-fraunces font-bold text-ink leading-tight">
                {t(lesson.titleKey)}
              </h2>
            </div>

            {/* Body */}
            <div className="mt-4 text-xs sm:text-sm text-ink/90 leading-relaxed space-y-3 font-inter">
              <p className="font-semibold text-ink bg-sand/20 p-2.5 rounded-btn border-l-4 border-ink">
                {t(lesson.summaryKey)}
              </p>
              <p>{t(lesson.contentKey)}</p>
            </div>

            {/* Interactive "Try It" Widget */}
            <LessonTryIt
              topicId={lesson.topicId}
              monthlyIncome={profile?.monthlyIncome || 38000}
              userMode={mode}
            />

            {/* Core Principle Takeaway */}
            <div className="mt-4 p-3 rounded-card bg-sand/30 border-l-4 border-accent flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                  {t('lessons.core_principle')}
                </span>
                <p className="text-xs text-ink/90 font-medium">{t(lesson.takeawayKey)}</p>
              </div>
            </div>

            {/* Quick Knowledge Check Quiz */}
            <div className="mt-5 pt-4 border-t border-ink/15 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span>{t('lessons.quiz_title')}</span>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-ink">
                {t(lesson.quiz.questionKey)}
              </p>

              <div className="space-y-2">
                {lesson.quiz.optionsKeys.map((optKey, idx) => {
                  const isChecked = selectedQuizOpt === idx;
                  const isCorrect = idx === lesson.quiz.correctOptionIndex;

                  let optClass = 'bg-paper border-ink/20 hover:border-ink/50 text-ink';
                  if (hasCheckedQuiz) {
                    if (isCorrect) optClass = 'bg-sky/40 border-ink text-ink font-semibold';
                    else if (isChecked && !isCorrect) optClass = 'bg-accent/15 border-accent text-accent-dark';
                  } else if (isChecked) {
                    optClass = 'bg-sand/30 border-ink ring-1 ring-ink text-ink font-semibold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={hasCheckedQuiz}
                      onClick={() => setSelectedQuizOpt(idx)}
                      className={`w-full text-left p-2.5 rounded-btn border text-xs sm:text-sm transition-all flex items-center justify-between ${optClass}`}
                    >
                      <span>{t(optKey)}</span>
                      {hasCheckedQuiz && isCorrect && <CheckCircle className="w-4 h-4 text-ink shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {!hasCheckedQuiz ? (
                <button
                  type="button"
                  disabled={selectedQuizOpt === null}
                  onClick={handleQuizSubmit}
                  className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light disabled:opacity-40 text-paper text-xs sm:text-sm font-semibold transition-colors"
                >
                  {t('lessons.check_answer')}
                </button>
              ) : (
                <div className="p-3 rounded-btn bg-sand/30 border border-ink/15 space-y-1">
                  <div className="text-xs font-bold">
                    {selectedQuizOpt === lesson.quiz.correctOptionIndex ? (
                      <span className="text-ink">{t('lessons.correct_banner')}</span>
                    ) : (
                      <span className="text-accent">{t('lessons.incorrect_banner')}</span>
                    )}
                  </div>
                  <p className="text-xs text-ink/80">{t(lesson.quiz.explanationKey)}</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="mt-5 pt-3 border-t border-ink/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="touch-target px-4 py-2 rounded-btn bg-sand/30 hover:bg-sand/50 text-ink text-xs font-semibold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
