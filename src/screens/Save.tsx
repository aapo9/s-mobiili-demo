import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { C, eur, eur0, font } from '../theme';
import { PlanItem, unitOf } from '../data';
import { useNav } from '../nav';
import { transferContext, transferRange, useSave } from '../state';
import { OutcomeBars } from '../components/OutcomeBars';
import { PlanRow, RowView } from '../components/PlanRow';
import { Icon, IconName } from '../components/Icon';
import { AnimatedNumber, Btn, Cta, LearnMore, Press, T, success, tap } from '../components/ui';
import { useT } from '../i18n';

/** "Siirrä eri määrä" stepper step, in euros. */
const TRANSFER_STEP = 5;

export function Save() {
  const nav = useNav();
  const st = useSave();
  const t = useT();
  const { demo, decisions, cleaned, pendingIds, pendingSaving, qty, expensesOpen, setExpensesOpen, markCleaned } = st;
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Only the top screen is mounted, so coming back from Kerro lisää, a detail etc. remounts this tab.
  // The intro plays when the tab is opened and right after the suggestion cards; other returns keep things still.
  const { key, returnedFrom } = nav.current;
  const [intro] = useState(() => !returnedFrom || returnedFrom === 'review');
  const [doneOnMount] = useState(st.transferred > 0);
  // And the scroll position is restored instead of jumping to the top.
  const scroll = useRef<ScrollViewInstance>(null);
  const [startY] = useState(() => nav.scrollY(key));
  const restored = useRef(startY === 0);
  const restoreScroll = () => {
    if (restored.current) return;
    restored.current = true;
    scroll.current?.scrollTo({ y: startY, animated: false });
  };

  // Rows that still need their cleanup/update animation, in plan order.
  const animQueue = demo.plan.filter((p) => p.suggestionId && decisions[p.suggestionId] === 'accepted' && !cleaned[p.suggestionId]).map(
    (p) => p.id,
  );

  // With the list closed the rows aren't mounted, so their cleanup animation can't run: settle those changes right away.
  const animKey = animQueue.join(',');
  useEffect(() => {
    if (expensesOpen) return;
    demo.plan.forEach((p) => {
      if (p.suggestionId && animQueue.includes(p.id)) markCleaned(p.suggestionId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expensesOpen, animKey]);

  const rowFor = (p: PlanItem): { view: RowView; hidden: boolean; exit: boolean; flash: boolean; onPress?: () => void } => {
    const base: RowView = { title: p.title, sub: p.sub, amount: p.amount };
    if (p.protectedByUser) return { view: { ...base, tag: { kind: 'kept' } }, hidden: false, exit: false, flash: false };
    if (!p.suggestionId) return { view: base, hidden: false, exit: false, flash: false };
    const s = demo.byId(p.suggestionId);
    const d = decisions[s.id];
    const open = () => nav.push({ name: 'review', ids: [s.id], single: true });
    if (d === 'pending') return { view: base, hidden: false, exit: false, flash: false, onPress: open };
    if (d === 'kept') return { view: { ...base, tag: { kind: 'kept' } }, hidden: false, exit: false, flash: false, onPress: open };
    // accepted
    const anim = !cleaned[s.id];
    if (s.kind === 'remove' || s.kind === 'pause') return { view: base, hidden: !anim, exit: anim, flash: false };
    if (s.kind === 'swap') {
      return {
        view: {
          title: s.to.name,
          sub: s.times === 1 ? t.swapped : t.swappedTimes(s.times),
          amount: s.to.price * s.times,
          oldAmount: p.amount,
          tag: { kind: 'changed', label: s.changedLabel ?? t.cheaperProduct },
        },
        hidden: false,
        exit: false,
        flash: anim,
        onPress: () => nav.push({ name: 'detail', id: s.id }),
      };
    }
    const n = qty[s.id] ?? s.suggested;
    return {
      view: { title: p.title, sub: t.reducedSub(n, unitOf(s), s.current), amount: n * s.unitPrice, oldAmount: p.amount, tag: { kind: 'changed', label: t.reduced } },
      hidden: false,
      exit: false,
      flash: anim,
      onPress: () => nav.push({ name: 'detail', id: s.id }),
    };
  };

  const rows = demo.plan.map((p) => ({ p, ...rowFor(p) })).filter((r) => !r.hidden);
  // Purchases you can act on stay visible; plain bills and estimates fold into one row.
  const isPlain = (r: (typeof rows)[number]) => !r.view.tag && !r.p.suggestionId;
  const actionable = rows.filter((r) => !isPlain(r));
  const rest = rows.filter(isPlain);
  const restTotal = rest.reduce((sum, r) => sum + r.view.amount, 0);
  const visible = showAll ? [...actionable, ...rest] : actionable;

  const planTotal = demo.plan.reduce((sum, p) => {
    const s = p.suggestionId ? demo.byId(p.suggestionId) : null;
    // Only count a change once its row has been cleaned up, so the total ticks down with the animation.
    if (!s || decisions[s.id] !== 'accepted' || !cleaned[s.id]) return sum + p.amount;
    return sum + p.amount - st.saving(s.id);
  }, 0);

  // Only this pay period: savings accepted since the last payday, acting on spending before the next one.
  const accepted = demo.suggestions.filter((s) => decisions[s.id] === 'accepted');

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      contentOffset={{ x: 0, y: startY }}
      onContentSizeChange={restoreScroll}
      onScroll={(e) => nav.setScrollY(key, e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={32}
    >
      {/* 1. The outcome, and the one thing to do about it. A white hero instead of a title bar. */}
      <View style={styles.hero}>
        <OutcomeBars flat preview={pendingSaving} previewLabel={t.possible} size="md" animateIn={intro} />
        {pendingIds.length > 0 ? (
          <Cta
            title={t.seeSavings}
            sub={t.suggestionsCount(pendingIds.length)}
            onPress={() => nav.push({ name: 'review', ids: pendingIds })}
            height={68}
          />
        ) : null}
        {/* After the suggestion cards: make the freed money real by moving it to savings. */}
        {st.transferOffer > 0 ? (
          <TransferCard amount={st.transferOffer} animate={intro} />
        ) : st.transferred > 0 ? (
          <TransferDone animate={!doneOnMount} />
        ) : null}
      </View>

      <View style={styles.content}>
        {/* 2. What you already saved this pay period. */}
        <View style={{ gap: 8 }}>
          <SectionHead title={t.acceptedSavings} right={accepted.length > 0 ? `+${eur(st.saved)}` : undefined} />
          <View style={styles.list}>
            {accepted.map((s, i) => (
              <Press
                key={s.id}
                onPress={() => nav.push({ name: 'detail', id: s.id })}
                style={[styles.accRow, i < accepted.length - 1 && styles.divider]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <T w={700} s={17}>
                    {s.kind === 'reduce' ? `${s.product}: ${qty[s.id]} ${unitOf(s)}` : s.doneLabel}
                  </T>
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
                  {t.noSavingsYet}
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
              style={[styles.toggle, expensesOpen && styles.divider]}
              accessibilityLabel={expensesOpen ? t.expensesHide : t.expensesShow}
            >
              {/* Label row: what the number is, with the info button right next to it. */}
              <View style={styles.labelRow}>
                <T w={700} s={16} c={C.muted}>
                  {t.estimatedExpenses}
                </T>
                <Press onPress={() => setShowInfo(true)} style={styles.infoBtn} accessibilityLabel={t.howEstimated}>
                  <Icon name="about" size={19} color={C.green} strokeWidth={2.2} />
                </Press>
              </View>
              <T s={14} c={C.muted}>
                {t.beforePaydayDate(demo.payday)}
              </T>
              {/* The total is the point of the card. */}
              <View style={styles.toggleRow}>
                <AnimatedNumber value={planTotal} format={(n) => `~${eur0(n)}`} style={font(800, 28, C.ink, { letterSpacing: -0.5 })} />
                <View style={styles.toggleIcon}>
                  <View style={{ transform: [{ rotate: expensesOpen ? '-90deg' : '90deg' }] }}>
                    <Icon name="chevron" size={18} color={C.green} strokeWidth={2.6} />
                  </View>
                </View>
              </View>
            </Press>
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
                accessibilityLabel={showAll ? t.showLess : t.showAllExpenses}
              >
                <T w={700} s={16} c={C.green} style={{ flex: 1 }}>
                  {showAll ? t.showLess : t.billsAndOther(rest.length)}
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
      <ExpensesInfo visible={showInfo} onClose={() => setShowInfo(false)} />
    </ScrollView>
  );
}

/** Fades and slides in after the outcome bar's intro, so it reads as the next step. */
function Appear({ children, delay = 900, animate = true }: { children: React.ReactNode; delay?: number; animate?: boolean }) {
  const a = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.timing(a, { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** "Siirrä säästöön": suggests moving the freed money to savings, with the reason and what's left on payday. */
function TransferCard({ amount: suggested, animate }: { amount: number; animate: boolean }) {
  const st = useSave();
  const t = useT();
  const { demo } = st;
  // "Siirrä eri määrä": the picked amount lives in the store, so it survives a visit to Kerro lisää.
  const editing = st.transferPick !== null;
  const { min, max } = transferRange(st.baseline, st.saved);
  const amount = Math.min(max, Math.max(min, st.transferPick ?? suggested));
  const step = (d: number) => {
    const n = Math.min(max, Math.max(min, amount + d * TRANSFER_STEP));
    if (n !== amount) {
      tap();
      st.setTransferPick(n);
    }
  };
  const c = transferContext(demo, st.saved, amount);
  const open = st.transferOpen;
  return (
    <Appear animate={animate}>
      <View style={styles.transfer}>
        {/* The dropdown, like "Arvioidut menot": label, hint and the amount are the button. The rest stays hidden until it is opened. */}
        <Press
          onPress={() => st.setTransferOpen(!open)}
          style={styles.transferToggle}
          accessibilityLabel={open ? t.transferHide : t.transferShow}
        >
          <T w={700} s={16} c={C.muted}>
            {t.transferLabel}
          </T>
          <T s={14} c={C.muted}>
            {t.transferHint}
          </T>
          <View style={styles.toggleRow}>
            <T w={800} s={28} c={C.green} style={{ letterSpacing: -0.5 }}>
              {eur0(amount)}
            </T>
            <View style={[styles.toggleIcon, { backgroundColor: C.white }]}>
              <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
                <Icon name="chevron" size={18} color={C.green} strokeWidth={2.6} />
              </View>
            </View>
          </View>
        </Press>
        {open ? <TransferBody c={c} amount={amount} suggested={suggested} editing={editing} min={min} max={max} step={step} /> : null}
      </View>
    </Appear>
  );
}

/** The open "Siirrä säästöön" card: the reason, what moves where, why it's safe, and the buttons. */
function TransferBody({
  c,
  amount,
  suggested,
  editing,
  min,
  max,
  step,
}: {
  c: ReturnType<typeof transferContext>;
  amount: number;
  suggested: number;
  editing: boolean;
  min: number;
  max: number;
  step: (d: number) => void;
}) {
  const nav = useNav();
  const st = useSave();
  const t = useT();
  const { demo } = st;
  return (
    <>
      <View>
        <T s={17} c={C.ink2} style={{ lineHeight: 24 }}>
          {t.transferBody(c.saved)}
        </T>
        <LearnMore onPress={() => nav.push({ name: 'learnTransfer', amount })} containerStyle={{ marginTop: -2, marginBottom: -6 }} />
      </View>

      {/* One panel that reads top to bottom: what moves where, then why it's safe. */}
      <View style={styles.transferPanel}>
        <View style={styles.route}>
          <T w={700} s={16} c={C.ink}>
            S-Tili
          </T>
          <Icon name="arrow" size={18} color={C.muted} strokeWidth={2.4} />
          <T w={700} s={16} c={C.ink} style={{ flex: 1 }}>
            {demo.savingsAccount.name}
          </T>
          {!editing ? (
            <T w={800} s={22} c={C.green}>
              {eur0(amount)}
            </T>
          ) : null}
        </View>
        {editing ? (
          <View style={styles.amountStepper}>
            <Press onPress={() => step(-1)} style={[styles.stepBtn, amount <= min && { opacity: 0.4 }]} haptic={false} accessibilityLabel={t.smallerAmount}>
              <Icon name="minus" size={22} color={C.green} strokeWidth={2.6} />
            </Press>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T w={800} s={26} c={C.green} style={{ lineHeight: 30 }}>
                {eur0(amount)}
              </T>
              <T s={13} c={C.muted}>
                {eur0(min)}–{eur0(max)}
              </T>
            </View>
            <Press onPress={() => step(1)} style={[styles.stepBtn, amount >= max && { opacity: 0.4 }]} haptic={false} accessibilityLabel={t.biggerAmount}>
              <Icon name="plus" size={22} color={C.green} strokeWidth={2.6} />
            </Press>
          </View>
        ) : null}
        <View style={styles.checks}>
          <Check value={`~${eur0(c.paydayAfter)}`} text={t.bufferLeft(demo.payday)} />
          <Check value={`~${eur0(c.ifHalfFails)}`} text={t.evenIfHalf} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label={t.notNow} kind="outline" height={56} onPress={st.declineTransfer} containerStyle={{ flex: 1 }} />
        <Btn
          label={t.transfer}
          icon="transfer"
          height={56}
          onPress={() => {
            success();
            st.transfer(amount);
          }}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <Press
        onPress={() => st.setTransferPick(editing ? null : suggested)}
        containerStyle={{ alignSelf: 'center', marginTop: -4, marginBottom: -6 }}
        style={styles.otherAmount}
      >
        <T w={700} s={17} c={C.green}>
          {editing ? t.useSuggested(suggested) : t.otherAmount}
        </T>
        {!editing ? <Icon name="chevron" size={18} color={C.green} strokeWidth={2.6} /> : null}
      </Press>
    </>
  );
}

/** One reassurance line on the transfer card: a bold number, then what it means. */
function Check({ value, text }: { value: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={styles.checkIcon}>
        <Icon name="check" size={14} color={C.white} strokeWidth={3} />
      </View>
      <T s={16} c={C.ink2} style={{ flex: 1, lineHeight: 22 }}>
        <T w={800} s={16} c={C.ink}>
          {value}
        </T>{' '}
        {text}
      </T>
    </View>
  );
}

function TransferDone({ animate }: { animate: boolean }) {
  const { demo, baseline, saved, transferred } = useSave();
  const t = useT();
  // Pop-in: the card springs up, the check bounces in with a ring pulse and a burst of coins and confetti.
  const pop = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const check = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const burst = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(140),
      Animated.spring(check, { toValue: 1, speed: 12, bounciness: 16, useNativeDriver: true }),
    ]).start();
    Animated.timing(burst, { toValue: 1, duration: 900, delay: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const id = setTimeout(() => tap('light'), 180);
    return () => clearTimeout(id);
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const before = demo.savingsAccount.balance;
  return (
    <Animated.View
      style={{
        opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
      }}
    >
      <View style={styles.done} accessibilityRole="alert">
        <View style={styles.doneIconWrap}>
          {animate ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.doneRing,
                  {
                    opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.5, 0] }),
                    transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
                  },
                ]}
              />
              {BURST.map((b, i) => (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={[
                    b.coin ? styles.burstCoin : [styles.burstDot, { backgroundColor: b.color }],
                    {
                      opacity: burst.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                      transform: [
                        { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(b.a) * b.d] }) },
                        // A little gravity: particles drift down at the end.
                        { translateY: burst.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, Math.sin(b.a) * b.d, Math.sin(b.a) * b.d + 10] }) },
                        { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 0.6] }) },
                      ],
                    },
                  ]}
                >
                  {b.coin ? (
                    <T w={800} s={10} c={C.orangeInk} style={{ lineHeight: 12 }}>
                      €
                    </T>
                  ) : null}
                </Animated.View>
              ))}
            </>
          ) : null}
          <Animated.View
            style={[
              styles.doneIcon,
              {
                transform: [
                  { scale: check },
                  { rotate: check.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Icon name="check" size={20} color={C.white} strokeWidth={2.8} />
          </Animated.View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AnimatedNumber
            value={transferred}
            from={animate ? 0 : transferred}
            delay={200}
            duration={900}
            format={(n) => t.transferredTitle(n)}
            style={font(700, 17, C.ink)}
          />
          <T s={15} c={C.ink2}>
            {t.transferredBody(baseline + saved - transferred)}
          </T>
          <View style={styles.doneBalance}>
            <T w={600} s={14} c={C.muted}>
              {demo.savingsAccount.name}
            </T>
            <AnimatedNumber
              value={before + transferred}
              from={animate ? before : before + transferred}
              delay={350}
              duration={1100}
              format={eur0}
              style={font(800, 14, C.green)}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/** Celebration particles around the check: angle, distance, and coin or confetti dot. */
const BURST = Array.from({ length: 12 }, (_, i) => ({
  a: (i / 12) * Math.PI * 2 - Math.PI / 2,
  d: 30 + (i % 3) * 9,
  coin: i % 3 === 0,
  color: [C.yellow, C.green, C.greenFlash, C.yellowDash][i % 4],
}));

/** Explains the forecast: a modal above everything, tab bar included. */
function ExpensesInfo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { demo } = useSave();
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.close}>
        {/* Swallow taps on the card so they don't close it. */}
        <Pressable style={styles.sheet} onPress={() => {}} accessible={false}>
          <View style={styles.sheetHead}>
            <T w={800} s={22} c={C.ink} style={{ flex: 1 }}>
              {t.howEstimated}
            </T>
            <Press onPress={onClose} style={styles.closeBtn} accessibilityLabel={t.close}>
              <View style={{ transform: [{ rotate: '45deg' }] }}>
                <Icon name="plus" size={22} color={C.ink} strokeWidth={2.4} />
              </View>
            </Press>
          </View>
          <T s={16} c={C.ink2} style={{ lineHeight: 23 }}>
            {t.infoIntro(demo.payday)}
          </T>

          <View style={{ gap: 14 }}>
            <InfoStep icon="list" title={t.infoBillsTitle}>
              {t.infoBills}
            </InfoStep>
            <InfoStep icon="cart" title={t.infoHabitsTitle}>
              {t.infoHabits}
            </InfoStep>
            <InfoStep icon="check" title={t.infoAcceptedTitle}>
              {t.infoAccepted}
            </InfoStep>
          </View>

          <T s={14} c={C.muted} style={{ lineHeight: 20 }}>
            {t.infoFoot}
          </T>
          <Btn label={t.gotIt} onPress={onClose} height={56} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InfoStep({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <Icon name={icon} size={20} color={C.green} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T w={700} s={16} c={C.ink}>
          {title}
        </T>
        <T s={14} c={C.muted} style={{ lineHeight: 20 }}>
          {children}
        </T>
      </View>
    </View>
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
  transfer: { backgroundColor: C.greenTint, borderRadius: 22, padding: 18, gap: 12 },
  transferToggle: { gap: 4 },
  transferPanel: { backgroundColor: C.white, borderRadius: 16 },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  checks: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  amountStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Text link like "Kerro lisää"; the padding only grows the touch target. */
  otherAmount: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 12 },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.greenTint, borderRadius: 18, padding: 16 },
  doneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  doneIconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  doneRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: C.green },
  doneBalance: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  burstDot: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5 },
  burstCoin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.yellow,
    borderWidth: 1.5,
    borderColor: C.yellowDash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  // Small icon, full-size touch target.
  infoBtn: { width: 40, height: 40, marginVertical: -10, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: C.white, borderRadius: 24, padding: 20, gap: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: { width: 40, height: 40, margin: -8, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  list: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden' },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  toggle: { gap: 4, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.divider },
});
