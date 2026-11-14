import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { C, eur, eur0, font } from '../theme';
import { PAYDAY, PLAN, PlanItem, SUGGESTIONS, byId } from '../data';
import { useNav } from '../nav';
import { useSave } from '../state';
import { OutcomeBars } from '../components/OutcomeBars';
import { PlanRow, RowView } from '../components/PlanRow';
import { Icon } from '../components/Icon';
import { AnimatedNumber, Cta, Pill, Press, T } from '../components/ui';

export function Save() {
  const nav = useNav();
  const st = useSave();
  const { decisions, cleaned, pendingIds, pendingSaving, qty, expensesOpen, setExpensesOpen, markCleaned } = st;
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Rows that still need their cleanup/update animation, in plan order.
  const animQueue = PLAN.filter((p) => p.suggestionId && decisions[p.suggestionId] === 'accepted' && !cleaned[p.suggestionId]).map(
    (p) => p.id,
  );

  // With the list closed the rows aren't mounted, so their cleanup animation can't run: settle those changes right away.
  const animKey = animQueue.join(',');
  useEffect(() => {
    if (expensesOpen) return;
    PLAN.forEach((p) => {
      if (p.suggestionId && animQueue.includes(p.id)) markCleaned(p.suggestionId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expensesOpen, animKey]);

  const rowFor = (p: PlanItem): { view: RowView; hidden: boolean; exit: boolean; flash: boolean; onPress?: () => void } => {
    const base: RowView = { title: p.title, sub: p.sub, amount: p.amount };
    if (p.protectedByUser) return { view: { ...base, tag: { kind: 'kept' } }, hidden: false, exit: false, flash: false };
    if (!p.suggestionId) return { view: base, hidden: false, exit: false, flash: false };
    const s = byId(p.suggestionId);
    const d = decisions[s.id];
    const open = () => nav.push({ name: 'review', ids: [s.id], single: true });
    if (d === 'pending') return { view: base, hidden: false, exit: false, flash: false, onPress: open };
    if (d === 'kept') return { view: { ...base, tag: { kind: 'kept' } }, hidden: false, exit: false, flash: false, onPress: open };
    // accepted
    const anim = !cleaned[s.id];
    if (s.kind === 'remove' || s.kind === 'pause') return { view: base, hidden: !anim, exit: anim, flash: false };
    if (s.kind === 'swap') {
      return {
        view: { title: s.to.name, sub: `${s.times} kertaa · vaihdettu`, amount: s.to.price * s.times, oldAmount: p.amount, tag: { kind: 'changed', label: 'Halvempi tuote' } },
        hidden: false,
        exit: false,
        flash: anim,
        onPress: () => nav.push({ name: 'detail', id: s.id }),
      };
    }
    const n = qty[s.id] ?? s.suggested;
    return {
      view: { title: p.title, sub: `${n} kpl · ennen ${s.current} kpl`, amount: n * s.unitPrice, oldAmount: p.amount, tag: { kind: 'changed', label: 'Vähennetty' } },
      hidden: false,
      exit: false,
      flash: anim,
      onPress: () => nav.push({ name: 'detail', id: s.id }),
    };
  };

  const rows = PLAN.map((p) => ({ p, ...rowFor(p) })).filter((r) => !r.hidden);
  // Purchases you can act on stay visible; plain bills and estimates fold into one row.
  const isPlain = (r: (typeof rows)[number]) => !r.view.tag && !r.p.suggestionId;
  const actionable = rows.filter((r) => !isPlain(r));
  const rest = rows.filter(isPlain);
  const restTotal = rest.reduce((sum, r) => sum + r.view.amount, 0);
  const visible = showAll ? [...actionable, ...rest] : actionable;

  const planTotal = PLAN.reduce((sum, p) => {
    const s = p.suggestionId ? byId(p.suggestionId) : null;
    // Only count a change once its row has been cleaned up, so the total ticks down with the animation.
    if (!s || decisions[s.id] !== 'accepted' || !cleaned[s.id]) return sum + p.amount;
    return sum + p.amount - st.saving(s.id);
  }, 0);

  // Only this pay period: savings accepted since the last payday, acting on spending before the next one.
  const accepted = SUGGESTIONS.filter((s) => decisions[s.id] === 'accepted');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* 1. The outcome, and the one thing to do about it. A white hero instead of a title bar. */}
      <View style={styles.hero}>
        <OutcomeBars flat preview={pendingSaving} previewLabel="Mahdollista" size="md" />
        {pendingIds.length > 0 ? (
          <Cta
            title="Katso säästöt"
            sub={`${pendingIds.length} ${pendingIds.length === 1 ? 'ehdotus' : 'ehdotusta'}`}
            onPress={() => nav.push({ name: 'review', ids: pendingIds })}
            height={68}
          />
        ) : null}

      </View>

      <View style={styles.content}>
        {/* 2. What you already saved this pay period. */}
        <View style={{ gap: 8 }}>
          <SectionHead title="Hyväksymäsi säästöt" right={accepted.length > 0 ? `+${eur(st.saved)}` : undefined} />
          <View style={styles.list}>
            {accepted.map((s, i) => (
              <Press
                key={s.id}
                onPress={() => nav.push({ name: 'detail', id: s.id })}
                style={[styles.accRow, i < accepted.length - 1 && styles.divider]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <T w={700} s={17}>
                    {s.kind === 'reduce' ? `${s.product}: ${qty[s.id]} kpl` : s.doneLabel}
                  </T>
                  {s.kind === 'pause' ? <Pill label="Tee vielä: peru tilaus" bg={C.orangeTint} color={C.orangeInk} /> : null}
                </View>
                <T w={700} s={17} c={C.green}>
                  +{eur(st.saving(s.id))}
                </T>
                <Icon name="chevron" size={18} color={C.muted} strokeWidth={2.2} />
              </Press>
            ))}
            {accepted.length === 0 ? (
              <View style={styles.accRow}>
                <T s={16} c={C.muted}>
                  Ei vielä säästöjä
                </T>
              </View>
            ) : null}
          </View>
        </View>

        {/* 3. The forecast the changes act on. */}
        <View>
          <View style={styles.list}>
            {/* The dropdown: the section's own heading, date and total are the button. Purchases stay hidden until it is opened. */}
            <Press
              onPress={() => setExpensesOpen(!expensesOpen)}
              style={[styles.toggle, (expensesOpen || showInfo) && styles.divider]}
              accessibilityLabel={expensesOpen ? 'Arvioidut menot, piilota' : 'Arvioidut menot, näytä'}
            >
              <View style={styles.toggleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <T w={800} s={20} c={C.ink}>
                    Arvioidut menot
                  </T>
                  <Press onPress={() => setShowInfo((v) => !v)} style={styles.infoBtn} accessibilityLabel="Mistä arvio tulee?">
                    <Icon name="about" size={20} color={showInfo ? C.green : C.muted} strokeWidth={2.2} />
                  </Press>
                </View>
                <View style={styles.toggleIcon}>
                  <View style={{ transform: [{ rotate: expensesOpen ? '-90deg' : '90deg' }] }}>
                    <Icon name="chevron" size={18} color={C.green} strokeWidth={2.6} />
                  </View>
                </View>
              </View>
              <View style={[styles.toggleRow, { alignItems: 'baseline' }]}>
                <T s={14} c={C.muted}>
                  Ennen palkkapäivää {PAYDAY}
                </T>
                <AnimatedNumber value={planTotal} format={(n) => `n. ${eur(n)}`} style={font(700, 16, C.muted)} />
              </View>
            </Press>
            {showInfo ? (
              <View style={[styles.info, expensesOpen && styles.divider]} accessibilityLiveRegion="polite">
                <T s={15} c={C.ink2} style={{ lineHeight: 21 }}>
                  Nämä eivät ole vielä toteutuneita maksuja. Arvioimme ne viime kuukausien tilitapahtumistasi ja S-Etukortin ostoistasi, joten summat voivat vaihdella.
                </T>
              </View>
            ) : null}
            {expensesOpen ? visible.map((r, i) => {
              const qi = animQueue.indexOf(r.p.id);
              const sid = r.p.suggestionId;
              return (
                <PlanRow
                  key={r.p.id}
                  view={r.view}
                  last={i === visible.length - 1}
                  onPress={r.onPress}
                  exit={r.exit}
                  flash={r.flash}
                  delay={qi >= 0 ? 350 + qi * 650 : 0}
                  freed={sid && (r.exit || r.flash) ? st.saving(sid) : undefined}
                  onAnimDone={sid ? () => st.markCleaned(sid) : undefined}
                />
              );
            }) : null}
            {expensesOpen && rest.length > 0 ? (
              <Press
                onPress={() => setShowAll((v) => !v)}
                style={styles.more}
                accessibilityLabel={showAll ? 'Näytä vähemmän' : 'Näytä kaikki menot'}
              >
                <T w={700} s={16} c={C.green} style={{ flex: 1 }}>
                  {showAll ? 'Näytä vähemmän' : `Laskut ja muut menot (${rest.length})`}
                </T>
                {!showAll ? (
                  <T w={700} s={16} c={C.muted}>
                    {eur(restTotal)}
                  </T>
                ) : null}
                <View style={{ transform: [{ rotate: showAll ? '-90deg' : '90deg' }] }}>
                  <Icon name="chevron" size={18} color={C.green} strokeWidth={2.4} />
                </View>
              </Press>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: string }) {
  return (
    <View style={{ gap: 2, paddingHorizontal: 4 }}>
      <View style={styles.sectionHead}>
        <T w={800} s={20} c={C.ink}>
          {title}
        </T>
        {right ? (
          <T w={700} s={16} c={C.green}>
            {right}
          </T>
        ) : null}
      </View>
      {sub ? (
        <T s={14} c={C.muted}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // White like the status bar area, so the top of the tab reads as one surface without a title bar.
  hero: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  content: { paddingHorizontal: 16, paddingTop: 24, gap: 26 },
  info: { backgroundColor: C.greenTint, paddingVertical: 12, paddingHorizontal: 16 },
  // Small icon, full-size touch target.
  infoBtn: { width: 36, height: 36, margin: -6, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  list: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden' },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  toggle: { gap: 2, paddingVertical: 12, paddingHorizontal: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.divider },
});
