import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { C, eur0, font } from '../theme';
import { useSave } from '../state';
import { PAYDAY } from '../data';
import { AnimatedNumber, T } from './ui';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { bar: number; legend: number; main: number; gap: number; pad: number; title: number }> = {
  sm: { bar: 16, legend: 14, main: 26, gap: 8, pad: 12, title: 16 },
  md: { bar: 20, legend: 15, main: 40, gap: 18, pad: 20, title: 30 },
  lg: { bar: 22, legend: 15, main: 40, gap: 14, pad: 22, title: 18 },
};

/** How long the bar shows only the no-changes amount before the changes grow in. */
const INTRO_DELAY = 450;

/**
 * The single outcome visualisation: one bar of what is left on payday.
 * It starts at the no-changes estimate (green), then the accepted changes grow
 * on the end of it (solid yellow) and the suggestion being looked at shows as a
 * dashed segment after that. Works like the "storage freed" bar when cleaning a phone.
 */
export function OutcomeBars({
  preview = 0,
  previewLabel,
  size = 'md',
  goal,
  label,
  flat = false,
  children,
}: {
  preview?: number;
  /** Legend words for the dashed amount, shown as "<label> +X €", e.g. "Mahdollista" or "Jos hyväksyt". */
  previewLabel?: string;
  size?: Size;
  goal?: number;
  label?: string;
  /** No card background or padding, for when the parent is already a white surface. */
  flat?: boolean;
  /** Rendered at the bottom of the card, e.g. the CTA. */
  children?: React.ReactNode;
}) {
  const { baseline, saved, maxSaving } = useSave();
  const S = SIZES[size];
  const [track, setTrack] = useState(0);
  const scaleMax = (baseline + maxSaving) / 0.936;
  const px = (v: number) => (track * v) / scaleMax;

  // Pixel widths, animated directly.
  const aSaved = useRef(new Animated.Value(0)).current;
  const aSolid = useRef(new Animated.Value(0)).current;
  const aDash = useRef(new Animated.Value(0)).current;
  const aDashOpacity = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (!track) return;
    const b = px(baseline);
    const intro = first.current;
    first.current = false;
    if (intro) {
      // Start from "no changes": only the green baseline is on the bar.
      aSaved.setValue(0);
      aSolid.setValue(b);
      aDash.setValue(b);
    }
    const cfg = { duration: intro ? 800 : 650, delay: intro ? INTRO_DELAY : 0, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    Animated.parallel([
      Animated.timing(aSaved, { ...cfg, toValue: px(saved) }),
      Animated.timing(aSolid, { ...cfg, toValue: b + px(saved) }),
      Animated.timing(aDash, { ...cfg, toValue: b + px(saved + preview) }),
      Animated.timing(aDashOpacity, { ...cfg, duration: 250, toValue: preview > 0.005 ? 1 : 0 }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, preview, track]);

  const onLayout = (e: LayoutChangeEvent) => setTrack(e.nativeEvent.layout.width);
  const base = px(baseline);
  const r = S.bar / 2;
  const hasExtra = saved > 0.005 || preview > 0.005;
  const hasPreview = preview > 0.005;

  // Spell out what the big number is: money left on the account when the next salary arrives.
  const title =
    size === 'sm' ? (
      <View style={{ flex: 1, gap: 1 }}>
        <T w={700} s={15} c={C.ink}>
          {label ?? 'Rahaa jää palkkapäivänä'}
        </T>
        <T s={13} c={C.muted}>
          {PAYDAY} · arvio menojen jälkeen
        </T>
      </View>
    ) : size === 'md' ? (
      // The heading of the whole savings block on the Säästä tab, so it reads as a title, not a caption.
      <View style={{ gap: 4 }}>
        <T w={800} s={S.title} c={C.ink} style={{ lineHeight: S.title + 6, textAlign: 'center' }}>
          {label ?? 'Arvioitu saldo'}
        </T>
        <T w={600} s={16} c={C.muted} style={{ textAlign: 'center' }}>
          Palkkapäivänä {PAYDAY}
        </T>
      </View>
    ) : (
      <T w={700} s={S.title} c={C.muted}>
        {label ?? `Rahaa jää palkkapäivänä ${PAYDAY}`}
      </T>
    );
  const number = (
    <AnimatedNumber
      value={baseline + saved}
      from={baseline}
      delay={INTRO_DELAY}
      duration={800}
      format={eur0}
      style={[font(800, S.main, C.green), { letterSpacing: -0.5 }]}
    />
  );

  return (
    <View style={[!flat && styles.card, { padding: flat ? 0 : S.pad, gap: S.gap }]}>
      {size === 'sm' ? (
        <View style={[styles.row, { alignItems: 'center', gap: 8 }]}>
          {title}
          {number}
        </View>
      ) : (
        <View style={{ gap: size === 'md' ? 8 : 2 }}>
          {title}
          <View style={[styles.row, { alignItems: 'center', justifyContent: size === 'md' ? 'center' : 'flex-start', gap: 10 }]}>
            {number}
          </View>
        </View>
      )}

      <View onLayout={onLayout} style={{ height: S.bar }}>
        {/* Empty track so the bar reads as "room to grow". */}
        <View style={[styles.abs, { right: 0, height: S.bar, borderRadius: r, backgroundColor: C.track }]} />
        {/* Dashed potential: drawn as one rounded rect behind the solid bars. */}
        <Animated.View
          style={[
            styles.abs,
            {
              height: S.bar,
              width: aDash,
              opacity: aDashOpacity,
              borderRadius: r,
              borderWidth: 2.5,
              borderStyle: 'dashed',
              borderColor: C.yellowDash,
              backgroundColor: C.yellowTint,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.abs,
            {
              height: S.bar,
              width: aSolid,
              backgroundColor: C.yellow,
              borderTopLeftRadius: r,
              borderBottomLeftRadius: r,
              borderTopRightRadius: hasPreview ? 0 : r,
              borderBottomRightRadius: hasPreview ? 0 : r,
            },
          ]}
        />
        <View
          style={[
            styles.abs,
            {
              height: S.bar,
              width: base,
              backgroundColor: C.green,
              borderTopLeftRadius: r,
              borderBottomLeftRadius: r,
              borderTopRightRadius: hasExtra ? 0 : r,
              borderBottomRightRadius: hasExtra ? 0 : r,
            },
          ]}
        />
        <Animated.View style={[styles.abs, styles.center, { left: base, width: aSaved, height: S.bar }]}>
          {px(saved) > 44 && S.bar >= 18 ? (
            <T w={800} s={12} numberOfLines={1}>
              +{eur0(saved)}
            </T>
          ) : null}
        </Animated.View>
        {goal !== undefined && track > 0 ? (
          <View style={[styles.goal, { left: base + px(goal) - 1, top: -5, height: S.bar + 10 }]} />
        ) : null}
      </View>

      {/* Where the bar has a dashed preview (Säästä tab, suggestion cards), each legend entry gets its own row. */}
      <View
        style={
          size !== 'lg'
            ? size === 'md'
              ? { alignItems: 'flex-start', gap: 9 }
              : { marginTop: -2, alignItems: 'flex-start', gap: 2 }
            : [styles.row, { marginTop: -2, flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center', columnGap: 14, rowGap: 6 }]
        }
      >
        <Legend color={C.green} text={`Ilman säästöjä ${eur0(baseline)}`} s={S.legend} />
        {goal !== undefined ? (
          <T w={700} s={S.legend} c={C.ink}>
            Tavoite +{eur0(goal)}
          </T>
        ) : saved > 0.005 ? (
          <Legend color={C.yellow} text={`Säästösi +${eur0(saved)}`} s={S.legend} />
        ) : null}
        {size !== 'lg' && hasPreview ? (
          <Legend dashed text={`${previewLabel ?? 'Mahdollista'} +${eur0(preview)}`} s={S.legend} />
        ) : null}
      </View>

      {children}
    </View>
  );
}

function Legend({ color, dashed, text, s }: { color?: string; dashed?: boolean; text: string; s: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[styles.dot, dashed ? styles.dashDot : { backgroundColor: color }]} />
      <T w={600} s={s} c={C.muted}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  abs: { position: 'absolute', left: 0, top: 0 },
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  goal: { position: 'absolute', width: 2, backgroundColor: C.ink, borderRadius: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  // Matches the dashed bar segment. A full circle, so iOS can draw the dashed border.
  dashDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.yellowDash, backgroundColor: C.yellowTint },
});
