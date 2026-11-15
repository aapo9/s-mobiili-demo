import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLang } from './i18n';
import { DEFAULT_SET_ID, Demo, Suggestion, TRANSFER_BUFFER, TRANSFER_MIN, TRANSFER_ROUND, TRANSFER_SHARE, defaultSaving, demoById } from './data';

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
  /** Euros moved to the savings account with the "Siirrä säästöön" suggestion (0 = not yet). */
  transferred: number;
  /** The user said no to the transfer suggestion, so it isn't shown again. */
  transferDeclined: boolean;
  /** Amount picked with "Siirrä eri määrä", or null for the suggested one. Kept here so it survives the Säästä tab remounting. */
  transferPick: number | null;
  /** Whether the "Siirrä säästöön" card on the Säästä tab is open (it starts as a closed dropdown). Kept here so it survives the tab remounting. */
  transferOpen: boolean;
};

const initial = (demo: Demo): Store => ({
  decisions: Object.fromEntries(demo.suggestions.map((s) => [s.id, 'pending' as Decision])),
  qty: Object.fromEntries(demo.suggestions.filter((s) => s.kind === 'reduce').map((s) => [s.id, s.kind === 'reduce' ? s.suggested : 0])),
  cleaned: {},
  basketReady: false,
  expensesOpen: false,
  transferred: 0,
  transferDeclined: false,
  transferPick: null,
  transferOpen: false,
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
export function planForGoal(demo: Demo, goal: number, pendingIds: string[]): string[] | null {
  let best: { ids: string[]; sum: number } | null = null;
  const n = pendingIds.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const ids = pendingIds.filter((_, i) => mask & (1 << i));
    const sum = ids.reduce((acc, id) => acc + defaultSaving(demo.byId(id)), 0);
    if (sum + 0.005 < goal) continue;
    if (!best || ids.length < best.ids.length || (ids.length === best.ids.length && sum < best.sum)) {
      best = { ids, sum };
    }
  }
  // Keep the suggestion order stable so the flow reads the same every time.
  return best ? demo.suggestions.map((s) => s.id).filter((id) => best!.ids.includes(id)) : null;
}

/**
 * "Siirrä säästöön": how much to suggest moving to savings right now.
 * Deliberately less than what was just saved (TRANSFER_SHARE of it), so part of
 * the saving stays as extra margin and the transfer feels safe. Never so much
 * that S-Tili would have less than TRANSFER_BUFFER left on payday. Rounded down
 * to a round TRANSFER_ROUND € amount.
 */
export function transferOfferFor(baseline: number, saved: number): number {
  const room = Math.min(saved * TRANSFER_SHARE, baseline + saved - TRANSFER_BUFFER);
  const amount = Math.floor(room / TRANSFER_ROUND) * TRANSFER_ROUND;
  return amount >= TRANSFER_MIN ? amount : 0;
}

/** Range for "Siirrä eri määrä": at least TRANSFER_MIN, at most what still leaves the payday buffer. */
export function transferRange(baseline: number, saved: number) {
  return { min: TRANSFER_MIN, max: Math.floor(baseline + saved - TRANSFER_BUFFER) };
}

/** The numbers behind a transfer of `amount`, for the card and the explainer. */
export function transferContext(demo: Demo, saved: number, amount: number) {
  const baseline = demo.baseline;
  const paydayBefore = baseline + saved;
  return {
    amount,
    saved,
    paydayBefore,
    paydayAfter: paydayBefore - amount,
    // Stress test: what's left after the transfer if only half of the accepted savings actually happen.
    ifHalfFails: paydayBefore - amount - saved / 2,
    buffer: TRANSFER_BUFFER,
    savingsBalance: demo.savingsAccount.balance,
    demo,
  };
}

type Ctx = Store & {
  /** The active demo set. Everything on screen comes from here. */
  demo: Demo;
  /** Switch demo set; also resets every decision, like "Nollaa demo". */
  chooseSet: (id: string) => void;
  baseline: number;
  maxSaving: number;
  saved: number;
  pendingIds: string[];
  pendingSaving: number;
  /** Suggested transfer to savings; 0 when there's nothing to suggest (suggestions still pending, too little room, or already decided). */
  transferOffer: number;
  transfer: (amount: number) => void;
  declineTransfer: () => void;
  setTransferPick: (amount: number | null) => void;
  setTransferOpen: (v: boolean) => void;
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
  const { lang } = useLang();
  // The set id is the state; its texts follow the language. Ids match across languages, so decisions survive a switch.
  const [demoId, setDemoId] = useState(DEFAULT_SET_ID);
  const demo = useMemo<Demo>(() => demoById(demoId, lang), [demoId, lang]);
  const [store, setStore] = useState<Store>(() => initial(demo));

  const saving = useCallback((id: string) => savingFor(demo.byId(id), store.qty[id]), [demo, store.qty]);

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
  const transfer = useCallback((amount: number) => setStore((s) => ({ ...s, transferred: s.transferred + amount })), []);
  const declineTransfer = useCallback(() => setStore((s) => ({ ...s, transferDeclined: true })), []);
  const setTransferPick = useCallback((amount: number | null) => setStore((s) => ({ ...s, transferPick: amount })), []);
  const setTransferOpen = useCallback((v: boolean) => setStore((s) => ({ ...s, transferOpen: v })), []);
  const resetAll = useCallback(() => setStore(initial(demo)), [demo]);
  const chooseSet = useCallback((id: string) => {
    const next = demoById(id, lang);
    setDemoId(next.id);
    setStore(initial(next));
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const ids = demo.suggestions.map((s) => s.id);
    const pendingIds = ids.filter((id) => store.decisions[id] === 'pending');
    const saved = ids.filter((id) => store.decisions[id] === 'accepted').reduce((acc, id) => acc + saving(id), 0);
    const pendingSaving = pendingIds.reduce((acc, id) => acc + defaultSaving(demo.byId(id)), 0);
    // Only after the suggestion cards are done, so it's the last step of the flow, and only once.
    const decided = store.transferred > 0 || store.transferDeclined;
    const transferOffer = pendingIds.length === 0 && !decided ? transferOfferFor(demo.baseline, saved) : 0;
    return {
      ...store,
      demo,
      chooseSet,
      baseline: demo.baseline,
      maxSaving: demo.maxSaving,
      saved,
      pendingIds,
      pendingSaving,
      transferOffer,
      transfer,
      declineTransfer,
      setTransferPick,
      setTransferOpen,
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
  }, [demo, chooseSet, store, saving, accept, keep, undo, setQty, markCleaned, setBasketReady, setExpensesOpen, transfer, declineTransfer, setTransferPick, setTransferOpen, resetAll]);

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSave outside SaveProvider');
  return ctx;
}
