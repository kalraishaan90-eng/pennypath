import { describe, it, expect } from 'vitest';
import {
  calculateNextDueDate,
  mapObligationTypeToCategory,
  calculateDaysLeft,
  getReminderAlertStatus,
  generateRemindersFromObligations,
  classifyReminders,
  snoozeDueDate,
  generateIcsContent,
} from '../remindersEngine';
import { Obligation, DueReminder } from '../../types';

describe('Reminders Engine (Obligations & Dues)', () => {
  const refDate = new Date('2026-10-20T10:30:00+05:30');

  describe('calculateNextDueDate', () => {
    it('returns this month due date when dueDay >= refDay and not paid', () => {
      // Today is Oct 20. Due day 22 is in 2 days.
      const dueDate = calculateNextDueDate(22, false, refDate);
      expect(dueDate).toBe('2026-10-22');
    });

    it('returns this month past date (overdue) when dueDay < refDay and not paid', () => {
      // Due day 10 when today is Oct 20
      const dueDate = calculateNextDueDate(10, false, refDate);
      expect(dueDate).toBe('2026-10-10');
    });

    it('advances to next month when already paid for this month', () => {
      // Due day 5, paid -> next due date is Nov 5
      const dueDate = calculateNextDueDate(5, true, refDate);
      expect(dueDate).toBe('2026-11-05');
    });

    it('clamps to last day of month if dueDay exceeds total days', () => {
      // Feb in non-leap year (2027) with dueDay 31 -> Feb 28
      const febDate = new Date('2027-02-10T10:00:00+05:30');
      const dueDate = calculateNextDueDate(31, false, febDate);
      expect(dueDate).toBe('2027-02-28');
    });
  });

  describe('mapObligationTypeToCategory', () => {
    it('maps obligation types to standard reminder categories', () => {
      expect(mapObligationTypeToCategory('emi')).toBe('loan');
      expect(mapObligationTypeToCategory('rent')).toBe('bill');
      expect(mapObligationTypeToCategory('utilities')).toBe('bill');
      expect(mapObligationTypeToCategory('subscription')).toBe('subscription');
      expect(mapObligationTypeToCategory('chit')).toBe('fee');
      expect(mapObligationTypeToCategory('other')).toBe('bill');
    });
  });

  describe('calculateDaysLeft & getReminderAlertStatus', () => {
    it('identifies overdue, due today, due tomorrow, and due in 2-3 days', () => {
      expect(calculateDaysLeft('2026-10-18', refDate)).toBe(-2);
      expect(calculateDaysLeft('2026-10-20', refDate)).toBe(0);
      expect(calculateDaysLeft('2026-10-21', refDate)).toBe(1);
      expect(calculateDaysLeft('2026-10-22', refDate)).toBe(2);
      expect(calculateDaysLeft('2026-10-23', refDate)).toBe(3);

      const emiReminder: DueReminder = {
        id: 'rem-emi-1',
        titleKey: 'Bike Loan EMI',
        amount: 3200,
        dueDate: '2026-10-22',
        category: 'loan',
        isPaid: false,
        isRecurring: true,
      };

      const status = getReminderAlertStatus(emiReminder, refDate);
      expect(status.daysLeft).toBe(2);
      expect(status.status).toBe('due_soon');
    });
  });

  describe('generateRemindersFromObligations', () => {
    it('auto-generates reminders from obligations accurately without duplicates', () => {
      const obligations: Obligation[] = [
        {
          id: 'ob-1',
          title: 'Bike Loan EMI (Bajaj Pulsar)',
          type: 'emi',
          amount: 3200,
          dueDay: 22,
          isPaid: false,
          emiDetails: {
            principal: 90000,
            annualInterestRate: 11,
            tenureMonths: 36,
            remainingMonths: 22,
            remainingPrincipal: 58500,
          },
        },
        {
          id: 'ob-2',
          title: 'PG Rent',
          type: 'rent',
          amount: 12000,
          dueDay: 5,
          isPaid: true,
        },
      ];

      const existingReminders: DueReminder[] = [
        {
          id: 'rem-custom-1',
          titleKey: 'WiFi Bill',
          amount: 799,
          dueDate: '2026-10-25',
          category: 'bill',
          isPaid: false,
          isRecurring: true,
        },
      ];

      const merged = generateRemindersFromObligations(obligations, existingReminders, refDate);

      expect(merged).toHaveLength(3);

      const bikeReminder = merged.find((r) => r.obligationId === 'ob-1');
      expect(bikeReminder).toBeDefined();
      expect(bikeReminder?.dueDate).toBe('2026-10-22');
      expect(bikeReminder?.amount).toBe(3200);
      expect(bikeReminder?.category).toBe('loan');
      expect(bikeReminder?.obligationType).toBe('emi');
      expect(bikeReminder?.isPaid).toBe(false);

      const rentReminder = merged.find((r) => r.obligationId === 'ob-2');
      expect(rentReminder).toBeDefined();
      expect(rentReminder?.dueDate).toBe('2026-11-05');
      expect(rentReminder?.isPaid).toBe(true);

      // Running it again does not duplicate items
      const mergedTwice = generateRemindersFromObligations(obligations, merged, refDate);
      expect(mergedTwice).toHaveLength(3);
    });
  });

  describe('classifyReminders into Overdue, Next 7 days, Later, Paid', () => {
    it('classifies reminders into respective buckets according to reference date', () => {
      const list: DueReminder[] = [
        {
          id: '1',
          titleKey: 'Old Electric Bill',
          amount: 800,
          dueDate: '2026-10-15', // 5 days overdue
          category: 'bill',
          isPaid: false,
          isRecurring: true,
        },
        {
          id: '2',
          titleKey: 'Rohan Bike EMI',
          amount: 3200,
          dueDate: '2026-10-22', // due in 2 days
          category: 'loan',
          isPaid: false,
          isRecurring: true,
        },
        {
          id: '3',
          titleKey: 'Next Month Rent',
          amount: 12000,
          dueDate: '2026-11-05', // due in 16 days (later)
          category: 'bill',
          isPaid: false,
          isRecurring: true,
        },
        {
          id: '4',
          titleKey: 'Mobile Recharge',
          amount: 299,
          dueDate: '2026-10-19',
          category: 'bill',
          isPaid: true, // paid
          isRecurring: true,
        },
      ];

      const classified = classifyReminders(list, refDate);

      expect(classified.overdue).toHaveLength(1);
      expect(classified.overdue[0].id).toBe('1');

      expect(classified.next7Days).toHaveLength(1);
      expect(classified.next7Days[0].id).toBe('2');
      expect(classified.next7Days[0].dueDate).toBe('2026-10-22');

      expect(classified.later).toHaveLength(1);
      expect(classified.later[0].id).toBe('3');

      expect(classified.paid).toHaveLength(1);
      expect(classified.paid[0].id).toBe('4');
    });
  });

  describe('snoozeDueDate', () => {
    it('advances due date by exactly 1 day or 3 days', () => {
      expect(snoozeDueDate('2026-10-22', 1)).toBe('2026-10-23');
      expect(snoozeDueDate('2026-10-22', 3)).toBe('2026-10-25');
      // Month boundary rollover
      expect(snoozeDueDate('2026-10-31', 1)).toBe('2026-11-01');
    });
  });

  describe('generateIcsContent (.ics iCalendar generator)', () => {
    it('creates RFC 5545 compliant .ics format with monthly recurrence rule for EMIs', () => {
      const emiReminder: DueReminder = {
        id: 'rem-rohan-emi',
        titleKey: 'Bike Loan EMI (Bajaj Pulsar)',
        customTitle: 'Bike Loan EMI (Bajaj Pulsar)',
        amount: 3200,
        dueDate: '2026-10-22',
        category: 'loan',
        obligationType: 'emi',
        isPaid: false,
        isRecurring: true,
      };

      const ics = generateIcsContent(emiReminder);

      // RFC 5545 structural requirements
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Bike Loan EMI (Bajaj Pulsar) - ₹3,200');
      expect(ics).toContain('DTSTART:20261022T090000');
      // Recurring monthly rule for EMI
      expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=22');
      // 3 days before alarm
      expect(ics).toContain('TRIGGER:-P3D');
      // 1 day before alarm
      expect(ics).toContain('TRIGGER:-P1D');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });
  });
});
