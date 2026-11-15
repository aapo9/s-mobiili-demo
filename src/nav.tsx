import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

export type Tab = 'home' | 'card' | 'save' | 'account' | 'me';

export type Route =
  | { name: Tab }
  | { name: 'review'; ids: string[]; goal?: number; single?: boolean }
  | { name: 'shopping' }
  | { name: 'detail'; id: string }
  | { name: 'learn'; id: string }
  | { name: 'learnTransfer'; amount: number };

export type Entry = {
  key: number;
  route: Route;
  /** Set when this screen became the top again via `back`: the screen that was closed. Lets a screen skip its intro on return. */
  returnedFrom?: Route['name'];
};

type Nav = {
  stack: Entry[];
  current: Entry;
  tab: Tab;
  /**
   * Scroll position per stack entry. Only the top screen is mounted, so a
   * screen saves its offset here and restores it when you come back to it.
   */
  scrollY: (key: number) => number;
  setScrollY: (key: number, y: number) => void;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  /** Pop everything above the tab root and switch tab. */
  goTab: (t: Tab) => void;
  /** Reset the current tab's stack to its root plus an optional screen. */
  resetTo: (t: Tab, r?: Route) => void;
};

const NavContext = createContext<Nav | null>(null);
const TABS: Tab[] = ['home', 'card', 'save', 'account', 'me'];

export function NavProvider({ children }: { children: React.ReactNode }) {
  const keyRef = useRef(1);
  const next = () => keyRef.current++;
  const [stack, setStack] = useState<Entry[]>([{ key: 0, route: { name: 'home' } }]);

  const push = useCallback((route: Route) => setStack((s) => [...s, { key: next(), route }]), []);
  const replace = useCallback(
    (route: Route) => setStack((s) => [...s.slice(0, -1), { key: next(), route }]),
    [],
  );
  const back = useCallback(
    () =>
      setStack((s) => {
        if (s.length <= 1) return s;
        const below = s[s.length - 2];
        return [...s.slice(0, -2), { ...below, returnedFrom: s[s.length - 1].route.name }];
      }),
    [],
  );
  // Same key on return, so the offset saved before a push is found again; a new tab entry starts at the top.
  const scrolls = useRef(new Map<number, number>());
  const scrollY = useCallback((key: number) => scrolls.current.get(key) ?? 0, []);
  const setScrollY = useCallback((key: number, y: number) => {
    scrolls.current.set(key, y);
  }, []);
  const goTab = useCallback(
    (t: Tab) => setStack((s) => (s.length === 1 && s[0].route.name === t ? s : [{ key: next(), route: { name: t } }])),
    [],
  );
  const resetTo = useCallback(
    (t: Tab, r?: Route) =>
      setStack(() => {
        const root = { key: next(), route: { name: t } as Route };
        return r ? [root, { key: next(), route: r }] : [root];
      }),
    [],
  );

  // Android hardware back pops the stack; on a tab root other than Koti it goes to Koti.
  const stackRef = useRef(stack);
  stackRef.current = stack;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const s = stackRef.current;
      if (s.length > 1) {
        back();
        return true;
      }
      if (s[0].route.name !== 'home') {
        goTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [back, goTab]);

  const value = useMemo<Nav>(() => {
    const current = stack[stack.length - 1];
    const rootName = stack[0].route.name;
    const tab = (TABS as string[]).includes(rootName) ? (rootName as Tab) : 'home';
    return { stack, current, tab, scrollY, setScrollY, push, replace, back, goTab, resetTo };
  }, [stack, scrollY, setScrollY, push, replace, back, goTab, resetTo]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav outside NavProvider');
  return ctx;
}
