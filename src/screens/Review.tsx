import React, { useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { C, eur, font } from '../theme';
import { Suggestion, SwapProduct, unitOf } from '../data';
import { useNav } from '../nav';
import { savingFor, useSave } from '../state';
import { OutcomeBars } from '../components/OutcomeBars';
import { Icon } from '../components/Icon';
import { AnimatedNumber, Btn, Header, LearnMore, Press, T, success, tap } from '../components/ui';
import { useT } from '../i18n';

/** Short screens (iPhone SE, small Android) get tighter type and spacing so the card still fits without scrolling. */
function useCompact() {
  return useWindowDimensions().height < 760;
}

export function Review({ ids, goal, single }: { ids: string[]; goal?: number; single?: boolean }) {
  const nav = useNav();
  const st = useSave();
  const t = useT();
  const compact = useCompact();
  // Only the top screen is mounted, so coming back from Kerro lisää remounts this: resume at the first undecided card.
  const [i, setI] = useState(() => Math.max(0, ids.findIndex((id) => st.decisions[id] === 'pending')));
  const [busy, setBusy] = useState(false);
  const [savedAtStart] = useState(st.saved);
  const s = st.demo.byId(ids[Math.min(i, ids.length - 1)]);

  // Local quantities for reduce cards so the outcome updates while the stepper moves.
  const [qtyMap, setQtyMap] = useState<Record<string, number>>(st.qty);
  const qty = qtyMap[s.id] ?? (s.kind === 'reduce' ? s.suggested : 0);
  const setQty = (n: number) => setQtyMap((m) => ({ ...m, [s.id]: n }));

  const decided = st.decisions[s.id] === 'accepted';
  const saving = savingFor(s, s.kind === 'reduce' ? qty : undefined);
  const preview = busy || decided ? 0 : saving;

  // Card motion
  const enter = useRef(new Animated.Value(1)).current;
  const fly = useRef(new Animated.Value(0)).current; // accept: up into the bar
  const side = useRef(new Animated.Value(0)).current; // keep: aside to the left
  const toast = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState('');
  const [struck, setStruck] = useState(false);

  const nextCard = () => {
    if (i + 1 >= ids.length) {
      // Straight back to Säästä, which remounts and plays the cleanup animation for accepted rows.
      nav.back();
      return;
    }
    fly.setValue(0);
    side.setValue(0);
    enter.setValue(0);
    setStruck(false);
    setI(i + 1);
    setBusy(false);
    Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const onAccept = () => {
    if (busy) return;
    setBusy(true);
    success();
    setStruck(true);
    st.accept(s.id, s.kind === 'reduce' ? qty : undefined);
    setToastText(`+${eur(saving)}`);
    toast.setValue(0);
    Animated.timing(toast, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(280),
      Animated.timing(fly, { toValue: 1, duration: 480, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(nextCard);
  };

  const onKeep = () => {
    if (busy) return;
    setBusy(true);
    tap('medium');
    st.keep(s.id);
    Animated.timing(side, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(nextCard);
  };

  const cardStyle = {
    opacity: Animated.multiply(
      enter,
      Animated.multiply(
        fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        side.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      ),
    ),
    transform: [
      { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) },
      { translateX: side.interpolate({ inputRange: [0, 1], outputRange: [0, -360] }) },
      { translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, -260] }) },
      { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) },
      { rotate: side.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) },
    ],
  };

  const title = single ? t.suggestion : t.suggestionN(i + 1, ids.length);
  const item = st.demo.planItem(s.planItemId);

  return (
    <>
      <Header title={title} />
      {/* Fixed layout, never scrolls: the card takes the remaining height and keeps the buttons at the bottom. */}
      <View style={[styles.screen, compact && styles.screenC]}>
        {goal !== undefined ? (
          <View style={styles.goalNote}>
            <Icon name="sparkle" size={16} color={C.orangeInk} />
            <T w={700} s={14} c={C.orangeInk} style={{ flex: 1 }}>
              {t.goalNote(goal, ids.length)}
            </T>
          </View>
        ) : null}

        <View style={{ zIndex: 1 }}>
          <OutcomeBars size="sm" preview={preview} previewLabel={t.ifYouAccept} goal={goal !== undefined ? savedAtStart + goal : undefined} />
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: toast.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [10, -18] }) },
                  { scale: toast.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.08, 1] }) },
                ],
              },
            ]}
          >
            {toastText}
          </Animated.Text>
        </View>

        <Animated.View style={[styles.card, compact && styles.cardC, cardStyle]}>
          {/* The concrete upcoming purchase this card changes. */}
          <View style={styles.source}>
            <Icon name="cart" size={16} color={C.muted} />
            <T s={14} c={C.muted} numberOfLines={1} style={[{ flex: 1 }, struck && styles.strike]}>
              {item.title} · {item.sub}
            </T>
            <T w={700} s={14} c={C.muted} style={struck ? styles.strike : undefined}>
              {eur(item.amount)}
            </T>
          </View>

          <T w={800} s={compact ? 22 : 24} style={{ lineHeight: compact ? 26 : 29 }}>
            {s.title}
          </T>

          <CardBody s={s} qty={qty} setQty={setQty} onLearn={() => nav.push({ name: 'learn', id: s.id })} />

          <View style={{ flex: 1, minHeight: 4 }} />

          {/* The saving sits at the bottom, right above the buttons that decide it. */}
          <Saving lead={s.kind === 'reduce' && qty === s.current ? t.sameAsNow : s.lead} value={saving} />

          <View style={styles.actions}>
            <Btn label={t.reject} kind="outline" height={compact ? 50 : 56} onPress={onKeep} disabled={busy} containerStyle={{ flex: 1 }} />
            <Btn
              label={t.accept}
              icon="check"
              height={compact ? 50 : 56}
              onPress={onAccept}
              disabled={busy || saving <= 0}
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </View>
    </>
  );
}

function Big({ value }: { value: number }) {
  const compact = useCompact();
  return <AnimatedNumber value={value} format={(n) => eur(n)} duration={300} style={[styles.big, compact && styles.bigC]} />;
}

/** "Säästät" line plus the big saving number. */
function Saving({ lead, value }: { lead: string; value: number }) {
  return (
    <View style={{ gap: 0 }}>
      <T s={17} c={C.ink2}>
        {lead}
      </T>
      <Big value={value} />
    </View>
  );
}

/** The card's short explanation, with the "Kerro lisää" link right under it. */
function Reason({ text, onLearn }: { text: string; onLearn: () => void }) {
  const compact = useCompact();
  return (
    <View>
      <T s={compact ? 16 : 17} c={C.ink2} style={{ lineHeight: compact ? 22 : 24 }}>
        {text}
      </T>
      <LearnMore size={compact ? 16 : 17} onPress={onLearn} containerStyle={{ marginTop: -2, marginBottom: -6 }} />
    </View>
  );
}

const NBSP = String.fromCharCode(160);

/**
 * One side of the swap comparison. Plain information, not a choice: no border or
 * fill of its own, so it doesn't read as a button (the card's buttons are below).
 */
function SwapSide({ caption, p, old }: { caption: string; p: SwapProduct; old?: boolean }) {
  const compact = useCompact();
  return (
    <View style={styles.side}>
      <T w={700} s={12} c={old ? C.muted : C.greenDark} style={styles.caption}>
        {caption.toUpperCase()}
      </T>
      {p.image ? (
        <Image
          source={p.image}
          resizeMode="contain"
          style={[styles.packshot, compact && styles.packshotC, old && { opacity: 0.85 }]}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <T w={600} s={compact ? 13 : 14} c={C.ink2} numberOfLines={2} style={styles.sideName}>
        {/* Keep the pack size ("900 g", "1 kg") on one line with the word before it. */}
        {p.name.replace(/ (\d+(?:[.,]\d+)?) (g|kg|l|ml)$/, `${NBSP}$1${NBSP}$2`)}
      </T>
      <T w={800} s={old ? 16 : 19} c={old ? C.muted : C.green} style={old ? styles.strike : undefined}>
        {eur(p.price)}
      </T>
    </View>
  );
}

function CardBody({
  s,
  qty,
  setQty,
  onLearn,
}: {
  s: Suggestion;
  qty: number;
  setQty: (n: number) => void;
  onLearn: () => void;
}) {
  const t = useT();
  const compact = useCompact();
  if (s.kind === 'remove' || s.kind === 'pause') {
    return <Reason text={s.reason} onLearn={onLearn} />;
  }
  if (s.kind === 'swap') {
    return (
      <>
        <View
          style={[styles.swap, compact && styles.swapC]}
          accessible
          accessibilityLabel={`${t.now}: ${s.from.name}, ${eur(s.from.price)}. ${t.cheaper}: ${s.to.name}, ${eur(s.to.price)}`}
        >
          <SwapSide caption={t.now} p={s.from} old />
          <Icon name="arrow" size={compact ? 20 : 22} color={C.green} strokeWidth={2.6} />
          <SwapSide caption={t.cheaper} p={s.to} />
        </View>
        <Reason text={s.reason} onLearn={onLearn} />
      </>
    );
  }
  // reduce
  const step = (d: number) => {
    const n = Math.max(0, Math.min(s.current, qty + d));
    if (n !== qty) {
      tap();
      setQty(n);
    }
  };
  return (
    <>
      <Reason text={s.reason} onLearn={onLearn} />
      <View style={styles.stepper}>
        <Press onPress={() => step(-1)} style={styles.stepBtn} haptic={false} accessibilityLabel={t.less}>
          <Icon name="minus" size={24} color={C.green} strokeWidth={2.6} />
        </Press>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <T w={800} s={26} style={{ lineHeight: 30 }}>
            {qty} {unitOf(s)}
          </T>
          <T s={13} c={C.muted}>
            {t.nowQty(s.product, s.current, unitOf(s))}
          </T>
        </View>
        <Press onPress={() => step(1)} style={styles.stepBtn} haptic={false} accessibilityLabel={t.more}>
          <Icon name="plus" size={24} color={C.green} strokeWidth={2.6} />
        </Press>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12 },
  screenC: { paddingTop: 8, paddingBottom: 8, gap: 8 },
  card: { flex: 1, backgroundColor: C.white, borderRadius: 22, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 18, gap: 12 },
  cardC: { paddingTop: 12, paddingBottom: 12, gap: 9 },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F6F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  strike: { textDecorationLine: 'line-through' },
  big: { ...font(800, 36, C.green), letterSpacing: -0.5, lineHeight: 42 },
  bigC: { fontSize: 30, lineHeight: 35 },
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F6F4',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  swapC: { paddingVertical: 6 },
  side: { flex: 1, alignItems: 'center', gap: 2 },
  caption: { letterSpacing: 0.6 },
  packshot: { width: '100%', height: 84, marginVertical: 4 },
  packshotC: { height: 40, marginVertical: 0 },
  sideName: { textAlign: 'center', lineHeight: 18 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 18,
    padding: 8,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 10 },
  goalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.yellowTint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toast: {
    position: 'absolute',
    right: 18,
    bottom: -14,
    ...font(800, 18, C.ink),
    backgroundColor: C.yellow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
