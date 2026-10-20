import { BudgetEnvelope, UserMode } from './budget';
import { DueReminder, FinancialGoal, LessonProgressRecord, MicroLesson } from '../types';

export interface SuggestedLessonResult {
  lesson: MicroLesson;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  categoryOverspent?: string;
}

export interface LessonEngineParams {
  envelopes: BudgetEnvelope[];
  reminders?: DueReminder[];
  goals?: FinancialGoal[];
  lessons: MicroLesson[];
  mode?: UserMode;
  lessonProgress?: LessonProgressRecord[];
}

/**
 * Evaluates user's real-time financial state and surfaces the most contextual micro-lesson.
 */
export function getSuggestedLesson(params: LessonEngineParams): SuggestedLessonResult | null {
  const { envelopes, reminders = [], goals = [], lessons } = params;
  if (!lessons || lessons.length === 0) return null;

  const findLessonByTopic = (topicId: string) => lessons.find((l) => l.topicId === topicId);

  // 1. Context Trigger: Overspending on Wants / Entertainment / Discretionary
  const wantEnvelopes = envelopes.filter(
    (e) =>
      e.type === 'want' ||
      e.categoryKey.includes('canteen') ||
      e.categoryKey.includes('weekend') ||
      e.categoryKey.includes('gadgets') ||
      e.categoryKey.includes('dining')
  );
  const overspentWant = wantEnvelopes.find((e) => e.spent > e.allocated);

  if (overspentWant) {
    const lesson = findLessonByTopic('needs_vs_wants');
    if (lesson && !lesson.isCompleted) {
      return {
        lesson,
        reasonKey: 'lessons.contextual_cards.wants_overspent_desc',
        categoryOverspent: overspentWant.categoryKey,
      };
    }
  }

  // 2. Context Trigger: Has active EMI / Loan obligation
  const hasEmi = reminders.some(
    (r) => r.category === 'loan' || r.obligationType === 'emi' || r.titleKey.includes('emi')
  );
  if (hasEmi) {
    const lesson = findLessonByTopic('how_emis_work');
    if (lesson && !lesson.isCompleted) {
      return {
        lesson,
        reasonKey: 'lessons.contextual_cards.emi_active_desc',
      };
    }
  }

  // 3. Context Trigger: Safety/Emergency cushion underfunded
  const emergencyGoal = goals.find((g) => g.category === 'safety' || g.titleKey.includes('emergency'));
  const isEmergencyUnderfunded =
    !emergencyGoal || emergencyGoal.currentAmount < emergencyGoal.targetAmount * 0.5;

  if (isEmergencyUnderfunded) {
    const lesson = findLessonByTopic('emergency_fund');
    if (lesson && !lesson.isCompleted) {
      return {
        lesson,
        reasonKey: 'lessons.contextual_cards.emergency_low_desc',
      };
    }
  }

  // 4. Context Trigger: Tight margin or over-budget overall
  const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
  if (totalAllocated > 0 && totalSpent / totalAllocated >= 0.8) {
    const lesson = findLessonByTopic('rule_50_30_20');
    if (lesson && !lesson.isCompleted) {
      return {
        lesson,
        reasonKey: 'lessons.contextual_cards.tight_budget_desc',
      };
    }
  }

  // 5. Context Trigger: Idle cash / inflation awareness
  const lessonInflation = findLessonByTopic('inflation_savings');
  if (lessonInflation && !lessonInflation.isCompleted) {
    return {
      lesson: lessonInflation,
      reasonKey: 'lessons.contextual_cards.idle_cash_desc',
    };
  }

  // Default: Pick the first uncompleted lesson
  const uncompleted = lessons.find((l) => !l.isCompleted);
  if (uncompleted) {
    return {
      lesson: uncompleted,
      reasonKey: 'lessons.recommended_reason',
    };
  }

  // If all completed, return first lesson
  return {
    lesson: lessons[0],
    reasonKey: 'lessons.recommended_reason',
  };
}

export function calculateLessonStreak(lessons: MicroLesson[]) {
  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const totalCount = lessons.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    streak: completedCount,
    completedCount,
    totalCount,
    percent,
  };
}
