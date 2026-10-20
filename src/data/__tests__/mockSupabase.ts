import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';

export function createMockSupabaseClient(): SupabaseClient<Database> {
  const store: Record<string, any[]> = {
    profiles: [],
    income_sources: [],
    categories: [],
    transactions: [],
    obligations: [],
    goals: [],
    budget_plans: [],
    plan_lines: [],
    reminders: [],
    risk_profiles: [],
    lesson_progress: [],
  };

  const getTable = (name: string) => {
    if (!store[name]) store[name] = [];
    return store[name];
  };

  const createQueryBuilder = (tableName: string) => {
    let filters: ((item: any) => boolean)[] = [];
    let sorters: ((a: any, b: any) => number)[] = [];
    let rangeSlice: { offset: number; limit: number } | null = null;
    let pendingOperation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    let payload: any = null;

    const builder: any = {
      select: (_cols?: string) => {
        return builder;
      },
      insert: (values: any) => {
        pendingOperation = 'insert';
        payload = values;
        return builder;
      },
      update: (values: any) => {
        pendingOperation = 'update';
        payload = values;
        return builder;
      },
      upsert: (values: any) => {
        pendingOperation = 'upsert';
        payload = values;
        return builder;
      },
      delete: () => {
        pendingOperation = 'delete';
        return builder;
      },
      eq: (field: string, val: any) => {
        filters.push((item: any) => item[field] === val);
        return builder;
      },
      gte: (field: string, val: any) => {
        filters.push((item: any) => item[field] >= val);
        return builder;
      },
      lte: (field: string, val: any) => {
        filters.push((item: any) => item[field] <= val);
        return builder;
      },
      order: (field: string, opts?: { ascending?: boolean }) => {
        const asc = opts?.ascending !== false;
        sorters.push((a: any, b: any) => {
          if (a[field] == null) return 1;
          if (b[field] == null) return -1;
          if (a[field] < b[field]) return asc ? -1 : 1;
          if (a[field] > b[field]) return asc ? 1 : -1;
          return 0;
        });
        return builder;
      },
      limit: (n: number) => {
        rangeSlice = { offset: rangeSlice?.offset ?? 0, limit: n };
        return builder;
      },
      range: (from: number, to: number) => {
        rangeSlice = { offset: from, limit: to - from + 1 };
        return builder;
      },
      then: (onFulfilled?: (val: any) => any, onRejected?: (err: any) => any) => {
        return new Promise<any>((resolve, reject) => {
          try {
            const res = execute();
            resolve(res);
          } catch (err) {
            reject(err);
          }
        }).then(onFulfilled, onRejected);
      },
      single: async () => {
        const res = execute();
        if (res.error) throw res.error;
        const item = Array.isArray(res.data) ? res.data[0] : res.data;
        if (!item) {
          return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        }
        return { data: item, error: null };
      },
      maybeSingle: async () => {
        const res = execute();
        if (res.error) throw res.error;
        const item = Array.isArray(res.data) ? (res.data.length ? res.data[0] : null) : res.data;
        return { data: item ?? null, error: null };
      },
    };

    function execute() {
      const table = getTable(tableName);

      if (pendingOperation === 'insert') {
        const items = Array.isArray(payload) ? payload : [payload];
        const inserted = items.map((item) => {
          const rec = {
            id: item.id || `mock-${Math.random().toString(36).substring(2, 9)}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          table.push(rec);
          return { ...rec };
        });
        return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
      }

      if (pendingOperation === 'upsert') {
        const items = Array.isArray(payload) ? payload : [payload];
        const upserted = items.map((item) => {
          // identify key: id, user_id, or composite
          let idx = -1;
          if (tableName === 'profiles') {
            idx = table.findIndex((r) => r.user_id === item.user_id);
          } else if (tableName === 'plan_lines') {
            idx = table.findIndex((r) => r.plan_id === item.plan_id && r.category_id === item.category_id);
          } else if (tableName === 'risk_profiles') {
            idx = table.findIndex((r) => r.user_id === item.user_id);
          } else if (tableName === 'lesson_progress') {
            idx = table.findIndex((r) => r.user_id === item.user_id && r.lesson_key === item.lesson_key);
          } else if (item.id) {
            idx = table.findIndex((r) => r.id === item.id);
          }

          if (idx >= 0) {
            table[idx] = { ...table[idx], ...item };
            return { ...table[idx] };
          } else {
            const rec = {
              id: item.id || `mock-${Math.random().toString(36).substring(2, 9)}`,
              created_at: item.created_at || new Date().toISOString(),
              ...item,
            };
            table.push(rec);
            return { ...rec };
          }
        });
        return { data: Array.isArray(payload) ? upserted : upserted[0], error: null };
      }

      if (pendingOperation === 'update') {
        const matched = table.filter((item) => filters.every((f) => f(item)));
        for (const item of matched) {
          Object.assign(item, payload);
        }
        return { data: matched[0] ? { ...matched[0] } : null, error: null };
      }

      if (pendingOperation === 'delete') {
        const toKeep = table.filter((item) => !filters.every((f) => f(item)));
        store[tableName] = toKeep;
        return { data: null, error: null };
      }

      // SELECT
      let result = table.filter((item) => filters.every((f) => f(item)));
      for (const sorter of sorters) {
        result.sort(sorter);
      }
      if (rangeSlice) {
        result = result.slice(rangeSlice.offset, rangeSlice.offset + rangeSlice.limit);
      }
      return { data: result.map((r) => ({ ...r })), error: null };
    }

    return builder;
  };

  return {
    from: (tableName: string) => createQueryBuilder(tableName),
  } as unknown as SupabaseClient<Database>;
}
