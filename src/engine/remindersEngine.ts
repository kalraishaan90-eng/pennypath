/**
 * Pure TypeScript Reminders Engine for Obligations and Custom Dues.
 * 
 * Strict architectural rule:
 * NO MATH in UI components. All date arithmetic, section partitioning,
 * alert categorization, and RFC 5545 iCalendar generation occur here.
 */

import { Obligation, DueReminder, ObligationType } from '../types';
import { BudgetEnvelope } from './budget';

export interface ClassifiedReminders {
  overdue: DueReminder[];
  next7Days: DueReminder[];
  later: DueReminder[];
  paid: DueReminder[];
}

export interface ReminderAlertStatus {
  status: 'overdue' | 'due_today' | 'due_tomorrow' | 'due_in_3_days' | 'due_soon' | 'upcoming' | 'paid';
  daysLeft: number;
  labelKey: string;
}

/**
 * Normalizes date to midnight YYYY-MM-DD
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns total days in a given month (1-indexed month: 1=Jan, 12=Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates the next due date for a recurring monthly obligation based on dueDay (1..31).
 * If isPaid is false:
 *   - If dueDay >= reference day: due date is this month on dueDay.
 *   - If dueDay < reference day: this month's due date is in the past (overdue).
 * If isPaid is true:
 *   - Due date advances to next month on dueDay.
 */
export function calculateNextDueDate(
  dueDay: number,
  isPaid: boolean = false,
  referenceDate: Date = new Date('2026-10-20T10:30:00+05:30')
): string {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed
  const refDay = referenceDate.getDate();

  let targetYear = refYear;
  let targetMonth = refMonth;

  if (isPaid) {
    // Already paid this month, next due date is next month
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth + 1);
  const clampedDay = Math.min(Math.max(1, dueDay), daysInTargetMonth);

  const targetDate = new Date(targetYear, targetMonth, clampedDay);
  return toISODateString(targetDate);
}

/**
 * Maps obligation type to reminder category
 */
export function mapObligationTypeToCategory(type: ObligationType): DueReminder['category'] {
  switch (type) {
    case 'emi':
      return 'loan';
    case 'rent':
    case 'utilities':
    case 'insurance':
    case 'other':
      return 'bill';
    case 'subscription':
      return 'subscription';
    case 'chit':
      return 'fee';
    default:
      return 'bill';
  }
}

/**
 * Calculates difference in days between two YYYY-MM-DD date strings or Date objects.
 * Positive = future, 0 = today, Negative = overdue.
 */
export function calculateDaysLeft(
  dueDateStr: string,
  referenceDate: Date = new Date('2026-10-20T10:30:00+05:30')
): number {
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const dueDate = new Date(y, m - 1, d);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = dueDate.getTime() - refDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines alert status (3 days before, 1 day before, on the day, overdue).
 */
export function getReminderAlertStatus(
  reminder: DueReminder,
  referenceDate: Date = new Date('2026-10-20T10:30:00+05:30')
): ReminderAlertStatus {
  if (reminder.isPaid) {
    return { status: 'paid', daysLeft: 0, labelKey: 'dues.chip.paid' };
  }

  const daysLeft = calculateDaysLeft(reminder.dueDate, referenceDate);

  if (daysLeft < 0) {
    return { status: 'overdue', daysLeft, labelKey: 'dues.chip.overdue' };
  }
  if (daysLeft === 0) {
    return { status: 'due_today', daysLeft: 0, labelKey: 'dues.chip.due_today' };
  }
  if (daysLeft === 1) {
    return { status: 'due_tomorrow', daysLeft: 1, labelKey: 'dues.chip.days_left_one' };
  }
  if (daysLeft === 3) {
    return { status: 'due_in_3_days', daysLeft: 3, labelKey: 'dues.chip.days_left' };
  }
  if (daysLeft <= 7) {
    return { status: 'due_soon', daysLeft, labelKey: 'dues.chip.days_left' };
  }
  return { status: 'upcoming', daysLeft, labelKey: 'dues.chip.days_left' };
}

/**
 * Auto-generates reminders from obligations (due_day -> next due date),
 * merging them seamlessly with any custom user reminders.
 */
export function generateRemindersFromObligations(
  obligations: Obligation[],
  existingReminders: DueReminder[] = [],
  referenceDate: Date = new Date('2026-10-20T10:30:00+05:30')
): DueReminder[] {
  const result: DueReminder[] = [...existingReminders];
  const existingByObligationId = new Map<string, DueReminder>();

  for (const rem of existingReminders) {
    if (rem.obligationId) {
      existingByObligationId.set(rem.obligationId, rem);
    }
  }

  for (const ob of obligations) {
    const existing = existingByObligationId.get(ob.id);
    if (existing) {
      // Keep existing reminder to preserve user changes (snooze, paid status, etc.)
      continue;
    }

    // Check if an obligation reminder already exists with identical title
    const existingByTitle = result.find(
      (r) => (r.customTitle === ob.title || r.titleKey === ob.title)
    );
    if (existingByTitle) {
      existingByTitle.obligationId = ob.id;
      existingByTitle.obligationType = ob.type;
      continue;
    }

    const nextDueDate = calculateNextDueDate(ob.dueDay, ob.isPaid ?? false, referenceDate);

    const generatedReminder: DueReminder = {
      id: `rem-ob-${ob.id}`,
      obligationId: ob.id,
      obligationType: ob.type,
      titleKey: ob.title,
      customTitle: ob.title,
      amount: ob.amount,
      dueDate: nextDueDate,
      category: mapObligationTypeToCategory(ob.type),
      isPaid: ob.isPaid ?? false,
      isRecurring: true,
      alertDaysBefore: [3, 1, 0],
      emiDetails: ob.emiDetails,
    };

    result.push(generatedReminder);
  }

  return result;
}

/**
 * Classifies reminders into:
 * - Overdue (maroon)
 * - Next 7 days
 * - Later
 * - Paid
 */
export function classifyReminders(
  reminders: DueReminder[],
  referenceDate: Date = new Date('2026-10-20T10:30:00+05:30')
): ClassifiedReminders {
  const overdue: DueReminder[] = [];
  const next7Days: DueReminder[] = [];
  const later: DueReminder[] = [];
  const paid: DueReminder[] = [];

  for (const rem of reminders) {
    if (rem.isPaid) {
      paid.push(rem);
      continue;
    }

    const daysLeft = calculateDaysLeft(rem.dueDate, referenceDate);
    if (daysLeft < 0) {
      overdue.push(rem);
    } else if (daysLeft <= 7) {
      next7Days.push(rem);
    } else {
      later.push(rem);
    }
  }

  // Sort logically:
  // Overdue: most overdue first (ascending daysLeft: -10 before -1)
  overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // Next 7 days: closest due date first
  next7Days.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // Later: closest first
  later.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // Paid: latest due date first
  paid.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  return { overdue, next7Days, later, paid };
}

/**
 * Snoozes a due date by 1 or 3 days.
 */
export function snoozeDueDate(currentDueDateStr: string, daysToSnooze: 1 | 3): string {
  const [y, m, d] = currentDueDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setDate(targetDate.getDate() + daysToSnooze);
  return toISODateString(targetDate);
}

/**
 * Best matching envelope category detection for logging an expense.
 */
export function detectEnvelopeCategoryKey(
  reminder: DueReminder,
  envelopes: BudgetEnvelope[]
): string {
  const title = (reminder.customTitle || reminder.titleKey || '').toLowerCase();
  const category = reminder.category;
  const obType = reminder.obligationType;

  // 1. Direct obligation type matches
  if (obType === 'emi' || category === 'loan') {
    const commuteOrGadget = envelopes.find((e) =>
      e.categoryKey.includes('commute') ||
      e.categoryKey.includes('gadgets') ||
      e.categoryKey.includes('bike')
    );
    if (commuteOrGadget) return commuteOrGadget.categoryKey;
  }

  if (obType === 'rent') {
    const rentEnv = envelopes.find((e) => e.categoryKey.includes('rent'));
    if (rentEnv) return rentEnv.categoryKey;
  }

  if (obType === 'subscription' || category === 'subscription') {
    const subEnv = envelopes.find(
      (e) => e.categoryKey.includes('hangouts') || e.categoryKey.includes('canteen') || e.categoryKey.includes('gadgets')
    );
    if (subEnv) return subEnv.categoryKey;
  }

  if (category === 'sip') {
    const sipEnv = envelopes.find((e) => e.type === 'goal' || e.categoryKey.includes('sip') || e.categoryKey.includes('fund'));
    if (sipEnv) return sipEnv.categoryKey;
  }

  if (category === 'fee') {
    const feeEnv = envelopes.find((e) => e.categoryKey.includes('tuition') || e.categoryKey.includes('education'));
    if (feeEnv) return feeEnv.categoryKey;
  }

  // 2. Title keyword search
  if (title.includes('broadband') || title.includes('wifi') || title.includes('electric') || title.includes('gas')) {
    const utilEnv = envelopes.find((e) => e.categoryKey.includes('utilities') || e.categoryKey.includes('bills'));
    if (utilEnv) return utilEnv.categoryKey;
  }

  // 3. Fallback: first need envelope or first available envelope
  const needEnv = envelopes.find((e) => e.type === 'need');
  if (needEnv) return needEnv.categoryKey;

  return envelopes[0]?.categoryKey || 'budget.cat.utilities_bills';
}

/**
 * Formats a Date object to RFC 5545 iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ
 */
function formatIcsDateTime(date: Date): string {
  return (
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  );
}

/**
 * Generates standard RFC 5545 iCalendar (.ics) content for a due reminder.
 * Includes recurring monthly rule for EMIs, and 3-day + 1-day alarms.
 */
export function generateIcsContent(reminder: DueReminder): string {
  const uid = `${reminder.id || 'rem-' + Date.now()}@pennypath.app`;
  const now = new Date();
  const dtStamp = formatIcsDateTime(now);

  // Parse YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = reminder.dueDate.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  // All-day event or 9:00 AM IST start
  const dtStart = `${yearStr}${monthStr}${dayStr}T090000`;
  const dtEnd = `${yearStr}${monthStr}${dayStr}T093000`;

  const title = reminder.customTitle || reminder.titleKey || 'Payment Due';
  const cleanTitle = title.replace(/[,\n]/g, ' ');
  const description = `PennyPath Payment Reminder: ${cleanTitle} of ₹${reminder.amount.toLocaleString(
    'en-IN'
  )} is due today.`;

  const isEmi =
    reminder.obligationType === 'emi' ||
    reminder.category === 'loan' ||
    cleanTitle.toLowerCase().includes('emi');

  // Recurring monthly rule for EMIs or recurring items
  const rruleLines: string[] = [];
  if (isEmi || reminder.isRecurring) {
    rruleLines.push(`RRULE:FREQ=MONTHLY;BYMONTHDAY=${d}`);
  }

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PennyPath//Bharat Financial Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${cleanTitle} - ₹${reminder.amount.toLocaleString('en-IN')}`,
    `DESCRIPTION:${description}`,
    ...rruleLines,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    // Alarm 1: 3 days before
    'BEGIN:VALARM',
    'TRIGGER:-P3D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${cleanTitle} due in 3 days`,
    'END:VALARM',
    // Alarm 2: 1 day before
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${cleanTitle} due tomorrow`,
    'END:VALARM',
    // Alarm 3: On the morning
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Due Today: ${cleanTitle}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

/**
 * Triggers a client-side .ics file download.
 */
export function downloadIcsFile(reminder: DueReminder): void {
  const ics = generateIcsContent(reminder);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (reminder.customTitle || reminder.titleKey || 'due-reminder')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  a.download = `${safeName}-${reminder.dueDate}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
