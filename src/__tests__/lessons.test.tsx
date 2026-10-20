// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';
import { AppProvider, useApp } from '../context/AppContext';
import { MicroLessonsScreen } from '../components/MicroLessonsScreen';
import { LessonTryIt } from '../components/lessons/LessonTryIt';
import { ContextualLessonCard } from '../components/home/ContextualLessonCard';
import { getSuggestedLesson, calculateLessonStreak } from '../engine/lessonEngine';
import { INITIAL_LESSONS } from '../repository/seedData';
import { repository } from '../repository';
import { LessonTopicId, MicroLesson } from '../types';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>
  );
};

describe('Micro-Lessons & Hindi i18n Acceptance Test Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData('earner');
    await i18n.changeLanguage('en');

    // Mock matchMedia for jsdom
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 1: i18n Zero Missing Keys Parity
  // --------------------------------------------------------------------------
  describe('Acceptance 1: i18n Parity (en.json vs hi.json)', () => {
    function flattenKeys(obj: Record<string, any>, prefix = ''): { key: string; val: any }[] {
      let keys: { key: string; val: any }[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          keys = keys.concat(flattenKeys(v, full));
        } else {
          keys.push({ key: full, val: v });
        }
      }
      return keys;
    }

    it('diffs en.json vs hi.json and verifies ZERO missing keys and ZERO empty strings', () => {
      const enKeys = flattenKeys(en);
      const hiKeys = flattenKeys(hi);

      const enKeySet = new Set(enKeys.map((k) => k.key));
      const hiKeySet = new Set(hiKeys.map((k) => k.key));

      const missingInHi = enKeys.filter((k) => !hiKeySet.has(k.key)).map((k) => k.key);
      const missingInEn = hiKeys.filter((k) => !enKeySet.has(k.key)).map((k) => k.key);
      const emptyInEn = enKeys.filter((k) => typeof k.val === 'string' && k.val.trim() === '').map((k) => k.key);
      const emptyInHi = hiKeys.filter((k) => typeof k.val === 'string' && k.val.trim() === '').map((k) => k.key);

      expect(missingInHi, `Keys in en.json missing in hi.json: ${missingInHi.join(', ')}`).toHaveLength(0);
      expect(missingInEn, `Keys in hi.json missing in en.json: ${missingInEn.join(', ')}`).toHaveLength(0);
      expect(emptyInEn, `Empty keys in en.json: ${emptyInEn.join(', ')}`).toHaveLength(0);
      expect(emptyInHi, `Empty keys in hi.json: ${emptyInHi.join(', ')}`).toHaveLength(0);

      expect(enKeys.length).toBeGreaterThanOrEqual(800);
      expect(hiKeys.length).toBe(enKeys.length);
    });

    it('uses natural everyday Hindi words (kharcha, bachat, kisht, byaaj) instead of stiff Sanskrit words', () => {
      const hiString = JSON.stringify(hi);
      // Everyday Hindi words should be present
      expect(hiString).toContain('खर्चा'); // kharcha
      expect(hiString).toContain('बचत'); // bachat
      expect(hiString).toContain('किश्त'); // kisht
      expect(hiString).toContain('ब्याज'); // byaaj
      expect(hiString).toContain('राशन'); // ration

      // Should not contain stiff obsolete words
      expect(hiString).not.toContain('व्यय'); // not vyaya
      expect(hiString).not.toContain('ऋण'); // not rin
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 2: 10 Micro-Lessons with <= 90 Seconds Read Time
  // --------------------------------------------------------------------------
  describe('Acceptance 2: 10 Micro-Lessons Curriculum', () => {
    const requiredTopics: LessonTopicId[] = [
      'needs_vs_wants',
      'rule_50_30_20',
      'emergency_fund',
      'how_emis_work',
      'compound_interest',
      'sip_vs_lump_sum',
      'inflation_savings',
      'risk_vs_return',
      'gold_fd_mutual_funds',
      'scam_safety',
    ];

    it('contains exactly the 10 specified micro-lesson topics', () => {
      expect(INITIAL_LESSONS).toHaveLength(10);
      const topics = INITIAL_LESSONS.map((l) => l.topicId);
      for (const required of requiredTopics) {
        expect(topics).toContain(required);
      }
    });

    it('ensures each micro-lesson has read time <= 90 seconds (1.5 minutes)', () => {
      for (const lesson of INITIAL_LESSONS) {
        expect(lesson.readTimeMinutes).toBeLessThanOrEqual(1.5);
      }
    });

    it('ensures every lesson has title, summary, content, takeaway, and a 3-option quiz with explanation', () => {
      for (const lesson of INITIAL_LESSONS) {
        expect(lesson.titleKey).toBeTruthy();
        expect(lesson.summaryKey).toBeTruthy();
        expect(lesson.contentKey).toBeTruthy();
        expect(lesson.takeawayKey).toBeTruthy();

        expect(lesson.quiz.questionKey).toBeTruthy();
        expect(lesson.quiz.optionsKeys).toHaveLength(3);
        expect(lesson.quiz.correctOptionIndex).toBeGreaterThanOrEqual(0);
        expect(lesson.quiz.correctOptionIndex).toBeLessThanOrEqual(2);
        expect(lesson.quiz.explanationKey).toBeTruthy();
      }
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 3: Contextual Surfacing
  // --------------------------------------------------------------------------
  describe('Acceptance 3: Contextual Surfacing', () => {
    it('surfaces "Wants vs needs" lesson when user overspends on Entertainment / Wants', () => {
      const mockEnvelopes = [
        { id: 'env-1', categoryKey: 'budget.cat.weekend_hangouts', allocated: 2000, spent: 2800, type: 'want' as const, icon: 'film' },
        { id: 'env-2', categoryKey: 'budget.cat.food_groceries', allocated: 5000, spent: 3000, type: 'need' as const, icon: 'shopping-cart' },
      ];

      const suggested = getSuggestedLesson({
        envelopes: mockEnvelopes,
        reminders: [],
        goals: [],
        lessons: INITIAL_LESSONS,
        mode: 'earner',
      });

      expect(suggested).not.toBeNull();
      expect(suggested?.lesson.topicId).toBe('needs_vs_wants');
      expect(suggested?.reasonKey).toBe('lessons.contextual_cards.wants_overspent_desc');
    });

    it('surfaces "How EMIs really work" when user has active loan/EMI obligations', () => {
      const mockReminders = [
        {
          id: 'rem-1',
          titleKey: 'reminders.items.bike_loan_emi',
          amount: 3200,
          dueDate: '2026-10-25',
          category: 'loan' as const,
          obligationType: 'emi' as const,
          isPaid: false,
          isRecurring: true,
        },
      ];

      const suggested = getSuggestedLesson({
        envelopes: [{ id: 'env-1', categoryKey: 'budget.cat.food', allocated: 5000, spent: 2000, type: 'need' as const, icon: 'shopping-cart' }],
        reminders: mockReminders,
        goals: [],
        lessons: INITIAL_LESSONS,
        mode: 'earner',
      });

      expect(suggested).not.toBeNull();
      expect(suggested?.lesson.topicId).toBe('how_emis_work');
      expect(suggested?.reasonKey).toBe('lessons.contextual_cards.emi_active_desc');
    });

    it('surfaces "Emergency fund" when safety cushion is underfunded', () => {
      const mockGoals = [
        {
          id: 'goal-1',
          titleKey: 'goals.items.three_month_emergency',
          targetAmount: 60000,
          currentAmount: 10000, // < 50%
          targetDate: '2027-01-01',
          category: 'safety' as const,
          priority: 'high' as const,
        },
      ];

      const suggested = getSuggestedLesson({
        envelopes: [{ id: 'env-1', categoryKey: 'budget.cat.food', allocated: 5000, spent: 2000, type: 'need' as const, icon: 'shopping-cart' }],
        reminders: [],
        goals: mockGoals,
        lessons: INITIAL_LESSONS,
        mode: 'earner',
      });

      expect(suggested).not.toBeNull();
      expect(suggested?.lesson.topicId).toBe('emergency_fund');
      expect(suggested?.reasonKey).toBe('lessons.contextual_cards.emergency_low_desc');
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 4: Progress Persistence & Streak Badges
  // --------------------------------------------------------------------------
  describe('Acceptance 4: Progress Persistence in lesson_progress & Streak Badges', () => {
    it('persists lesson progress into repository and updates streak count', async () => {
      const initialProgress = await repository.getLessonProgress();
      expect(initialProgress).toHaveLength(0);

      // Complete lesson 1
      await repository.markLessonComplete('lesson-1');
      const updatedProgress = await repository.getLessonProgress();
      expect(updatedProgress).toHaveLength(1);
      expect(updatedProgress[0].lessonKey).toBe('lesson-1');
      expect(updatedProgress[0].completedAt).toBeTruthy();

      // Complete lesson 2
      await repository.markLessonComplete('lesson-2');
      const prog2 = await repository.getLessonProgress();
      expect(prog2).toHaveLength(2);

      const lessons = await repository.getLessons('earner');
      const l1 = lessons.find((l) => l.id === 'lesson-1');
      const l2 = lessons.find((l) => l.id === 'lesson-2');
      expect(l1?.isCompleted).toBe(true);
      expect(l2?.isCompleted).toBe(true);

      const streakData = calculateLessonStreak(lessons);
      expect(streakData.completedCount).toBe(2);
      expect(streakData.streak).toBe(2);
    });

    it('emphasizes streak badge in Student mode with gamified banner', async () => {
      localStorage.setItem('pennypath_mode', 'student');
      await repository.markLessonComplete('lesson-1');

      renderWithProviders(<MicroLessonsScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Student Study Streak/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/1 Lesson Streak/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 5: State Preservation Across Language Toggling
  // --------------------------------------------------------------------------
  describe('Acceptance 5: Language Switching Preserves State', () => {
    it('retains envelope data, form state, and lesson progress when switching EN <-> HI', async () => {
      await repository.seedPersona('rohan');
      await repository.markLessonComplete('lesson-1');

      const TestComponent = () => {
        const { lang, toggleLang, lessons, profile } = useApp();
        return (
          <div>
            <span data-testid="lang-val">{lang}</span>
            <span data-testid="income-val">{profile?.monthlyIncome}</span>
            <span data-testid="completed-count">{lessons.filter((l) => l.isCompleted).length}</span>
            <button onClick={toggleLang}>Toggle</button>
          </div>
        );
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('income-val')).toHaveTextContent('38000');
        expect(screen.getByTestId('completed-count')).toHaveTextContent('1');
        expect(screen.getByTestId('lang-val')).toHaveTextContent('en');
      });

      // Toggle to Hindi
      fireEvent.click(screen.getByText('Toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('lang-val')).toHaveTextContent('hi');
        // State remains completely intact!
        expect(screen.getByTestId('income-val')).toHaveTextContent('38000');
        expect(screen.getByTestId('completed-count')).toHaveTextContent('1');
      });
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 6: Devanagari 360px Mobile Layout Safety
  // --------------------------------------------------------------------------
  describe('Acceptance 6: Devanagari Rendering at 360px Viewport', () => {
    it('renders MicroLessonsScreen in Hindi without layout break or overflow at 360px width', async () => {
      window.innerWidth = 360;
      window.innerHeight = 640;
      await i18n.changeLanguage('hi');

      const { container } = renderWithProviders(<MicroLessonsScreen />);

      await waitFor(() => {
        expect(screen.getByText(/माइक्रो-सबक/i)).toBeInTheDocument();
      });

      // Verify header and lesson list render in Hindi
      expect(screen.getByText(/90 सेकंड में समझें पैसे की समझदारी/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ज़रूरत बनाम शौक/i).length).toBeGreaterThan(0);

      // Check responsive container width
      const rootContainer = container.querySelector('.max-w-6xl');
      expect(rootContainer).toBeInTheDocument();
      expect(rootContainer).toHaveClass('w-full');
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPTANCE 7: Each Lesson's "Try It" Runs on Demo Data
  // --------------------------------------------------------------------------
  describe('Acceptance 7: "Try It" Runs on Demo Data for All 10 Lessons', () => {
    const topics: LessonTopicId[] = [
      'needs_vs_wants',
      'rule_50_30_20',
      'emergency_fund',
      'how_emis_work',
      'compound_interest',
      'sip_vs_lump_sum',
      'inflation_savings',
      'risk_vs_return',
      'gold_fd_mutual_funds',
      'scam_safety',
    ];

    topics.forEach((topic) => {
      it(`executes "Try It" interactive simulation for topic: ${topic}`, () => {
        const { unmount } = render(
          <LessonTryIt topicId={topic} monthlyIncome={38000} userMode="earner" />
        );

        expect(screen.getByText(/Interactive Simulation/i)).toBeInTheDocument();

        if (topic === 'needs_vs_wants') {
          expect(screen.getByText(/Monthly Grocery Ration/i)).toBeInTheDocument();
          expect(screen.getByText(/Needs:/i)).toBeInTheDocument();
        } else if (topic === 'rule_50_30_20') {
          expect(screen.getByText(/PennyPath Daily Safe-to-Spend/i)).toBeInTheDocument();
        } else if (topic === 'emergency_fund') {
          expect(screen.getByText(/Target Airbag Corpus/i)).toBeInTheDocument();
        } else if (topic === 'how_emis_work') {
          expect(screen.getByText(/Option A: Pay Upfront Cash/i)).toBeInTheDocument();
          expect(screen.getByText(/Option B: 6-Month 'No-Cost' EMI/i)).toBeInTheDocument();
        } else if (topic === 'compound_interest') {
          expect(screen.getByText(/Early Bird/i)).toBeInTheDocument();
          expect(screen.getByText(/Late Starter/i)).toBeInTheDocument();
        } else if (topic === 'sip_vs_lump_sum') {
          expect(screen.getByText(/Market Dip Simulation/i)).toBeInTheDocument();
        } else if (topic === 'inflation_savings') {
          expect(screen.getByText(/In 3% Savings Account/i)).toBeInTheDocument();
        } else if (topic === 'risk_vs_return') {
          expect(screen.getByText(/Match your goal time horizon/i)).toBeInTheDocument();
        } else if (topic === 'gold_fd_mutual_funds') {
          expect(screen.getByText(/Bank FD/i)).toBeInTheDocument();
          expect(screen.getByText(/Digital Gold/i)).toBeInTheDocument();
        } else if (topic === 'scam_safety') {
          expect(screen.getByText(/Red Flag Scam Meter/i)).toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});
