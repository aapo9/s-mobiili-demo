import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BASELINE, MAX_SAVING, SUGGESTIONS, Suggestion, byId, defaultSaving } from './data';

export type Decision = 'pending' | 'accepted' | 'kept';

type Store = {
  decisions: Record<string, Decision>;
  /** Chosen quantity for reduce-type suggestions. */
  qty: Record<string, number>;
  /** Plan rows whose cleanup animation already ran on the Säästä tab. */
  cleaned: Record<string, true>;
  basketReady: boolean;
  /** Whether the "Arvioidut menot" list on the Säästä tab is open. Kept here so it survives the tab remounting. */
  expensesOpen: boolean;
};

const initial = (): Store => ({
  decisions: Object.fromEntries(SUGGESTIONS.map((s) => [s.id, 'pending' as Decision])),
  qty: Object.fromEntries(SUGGESTIONS.filter((s) => s.kind === 'reduce').map((s) => [s.id, s.kind === 'reduce' ? s.suggested : 0])),
  cleaned: {},
  basketReady: false,
  expensesOpen: false,
});

/** Saving for a suggestion, given the quantity the user picked (reduce type). */
export function savingFor(s: Suggestion, qty?: number): number {
  if (s.kind === 'reduce') return Math.max(0, s.current - (qty ?? s.suggested)) * s.unitPrice;
  return defaultSaving(s);
}

/**
 * Outcome-first mode: pick the smallest practical set of pending changes that
 * reaches the goal. Fewest changes first, then the smallest overshoot.
 */
export function planForGoal(goal: number, pendingIds: string[]): string[] | null {
  let best: { ids: string[]; sum: number } | null = null;
  const n = pendingIds.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const ids = pendingIds.filter((_, i) => mask & (1 << i));
    const sum = ids.reduce((acc, id) => acc + defaultSaving(byId(id)), 0);
    if (sum + 0.005 < goal) continue;
    if (!best || ids.length < best.ids.length || (ids.length === best.ids.length && sum < best.sum)) {
      best = { ids, sum };
    }
  }
  // Keep the suggestion order stable so the flow reads the same every time.
  return best ? SUGGESTIONS.map((s) => s.id).filter((id) => best!.ids.includes(id)) : null;
}

type Ctx = Store & {
  baseline: number;
  maxSaving: number;
  saved: number;
  pendingIds: string[];
  pendingSaving: number;
  saving: (id: string) => number;
  accept: (id: string, qty?: number) => void;
  keep: (id: string) => void;
  undo: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  markCleaned: (id: string) => void;
  setBasketReady: (v: boolean) => void;
  setExpensesOpen: (v: boolean) => void;
  resetAll: () => void;
};

const SaveContext = createContext<Ctx | null>(null);

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(initial);

  const saving = useCallback((id: string) => savingFor(byId(id), store.qty[id]), [store.qty]);

  const accept = useCallback((id: string, qty?: number) => {
    setStore((s) => ({
      ...s,
      decisions: { ...s.decisions, [id]: 'accepted' },
      qty: qty === undefined ? s.qty : { ...s.qty, [id]: qty },
      basketReady: false,
    }));
  }, []);

  const keep = useCallback((id: string) => {
    setStore((s) => ({ ...s, decisions: { ...s.decisions, [id]: 'kept' } }));
  }, []);

  // Cancelling an accepted change counts as a "no": it becomes kept, so it is never suggested again.
  const undo = useCallback((id: string) => {
    setStore((s) => {
      const cleaned = { ...s.cleaned };
      delete cleaned[id];
      return { ...s, decisions: { ...s.decisions, [id]: 'kept' }, cleaned, basketReady: false };
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setStore((s) => ({ ...s, qty: { ...s.qty, [id]: qty } }));
  }, []);

  const markCleaned = useCallback((id: string) => {
    setStore((s) => ({ ...s, cleaned: { ...s.cleaned, [id]: true } }));
  }, []);

  const setBasketReady = useCallback((v: boolean) => setStore((s) => ({ ...s, basketReady: v })), []);
  const setExpensesOpen = useCallback((v: boolean) => setStore((s) => ({ ...s, expensesOpen: v })), []);
  const resetAll = useCallback(() => setStore(initial()), []);

  const value = useMemo<Ctx>(() => {
    const ids = SUGGESTIONS.map((s) => s.id);
    const pendingIds = ids.filter((id) => store.decisions[id] === 'pending');
    const saved = ids.filter((id) => store.decisions[id] === 'accepted').reduce((acc, id) => acc + saving(id), 0);
    const pendingSaving = pendingIds.reduce((acc, id) => acc + defaultSaving(byId(id)), 0);
    return {
      ...store,
      baseline: BASELINE,
      maxSaving: MAX_SAVING,
      saved,
      pendingIds,
      pendingSaving,
      saving,
      accept,
      keep,
      undo,
      setQty,
      markCleaned,
      setBasketReady,
      setExpensesOpen,
      resetAll,
    };
  }, [store, saving, accept, keep, undo, setQty, markCleaned, setBasketReady, setExpensesOpen, resetAll]);

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSave outside SaveProvider');
  return ctx;
}
