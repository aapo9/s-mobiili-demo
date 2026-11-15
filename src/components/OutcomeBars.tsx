import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { C, eur0, font } from '../theme';
import { useSave } from '../state';
import { AnimatedNumber, T } from './ui';
import { useT } from '../i18n';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { bar: number; legend: number; main: number; gap: number; pad: number; title: number }> = {
  sm: { bar: 16, legend: 14, main: 26, gap: 8, pad: 12, title: 16 },
  md: { bar: 20, legend: 15, main: 40, gap: 18, pad: 20, title: 30 },
  lg: { bar: 22, legend: 15, main: 40, gap: 14, pad: 22, title: 18 },
};

/** How long the bar shows only the no-changes amount before the changes grow in. */
const INTRO_DELAY = 450;

/**
 * - `fill`: the estimate is still negative. The whole bar is the shortfall and savings fill it.
 * - `normal`: the bar runs from 0 € to the best outcome.
 */
type Phase = 'fill' | 'normal';

/**
 * The single outcome visualisation: one bar of what is left on payday.
 * It starts at the no-changes estimate (green), then the accepted changes grow
 * on the end of it (solid yellow) and the suggestion being looked at shows as a
 * dashed segment after that. Works like the "storage freed" bar when cleaning a phone.
 *
 * When the no-changes estimate is negative, the bar works in two phases. First
 * ("fill") the whole bar is the shortfall, outlined in red, and accepted changes
 * fill it from the left like a progress bar. Once the shortfall is covered, the
 * bar switches to the normal scale (0 € to the best outcome), and what is left on
 * payday shows in yellow, since all of it comes from the savings.
 */
export function OutcomeBars({
  preview = 0,
  previewLabel,
  size = 'md',
  goal,
  label,
  flat = false,
  animateIn = true,
  children,
}: {
  /** Play the intro (bar grows from the no-changes amount, number counts up). Off when returning to a screen. */
  animateIn?: boolean;
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
  const { baseline, saved, maxSaving, demo } = useSave();
  const t = useT();
  const PAYDAY = demo.payday;
  const S = SIZES[size];
  const [track, setTrack] = useState(0);
  const deficit = baseline < 0;
  /** The shortfall to cover first, when the estimate starts negative. */
  const need = deficit ? -baseline : 0;
  const now = baseline + saved;
  const phase: Phase = deficit && now < -0.005 ? 'fill' : 'normal';
  // The phase the bar draws. It lags `phase` while a crossing animation finishes the old one.
  const [shown, setShown] = useState<Phase>(phase);

  /** Pixel length of an amount on the normal scale (0 € to the best outcome). */
  const scaleMax = Math.max(0, baseline + maxSaving) / 0.936;
  const px = (v: number) => (scaleMax > 0 ? (track * Math.max(0, v)) / scaleMax : 0);

  /** Pixel positions in a phase: end of the green, end of the yellow, end of the dashed preview. */
  const layout = (p: Phase) => {
    if (p === 'fill') {
      // The whole track is the shortfall.
      const f = (v: number) => (need > 0 ? (track * Math.min(v, need)) / need : 0);
      return { base: 0, solid: f(saved), dash: f(saved + preview) };
    }
    // After a shortfall none of the money is "no changes" money, so the yellow starts at 0 €.
    if (deficit) return { base: 0, solid: px(now), dash: px(now + preview) };
    return { base: px(baseline), solid: px(baseline + saved), dash: px(baseline + saved + preview) };
  };

  // Pixel widths, animated directly.
  const aSolid = useRef(new Animated.Value(0)).current;
  const aDash = useRef(new Animated.Value(0)).current;
  const aDashOpacity = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (!track) return;
    const intro = first.current;
    first.current = false;
    const to = layout(phase);
    const dashOn = preview > 0.005 ? 1 : 0;
    if (intro) {
      setShown(phase);
      if (!animateIn) {
        // Coming back to the screen: show the current state straight away.
        aSolid.setValue(to.solid);
        aDash.setValue(to.dash);
        aDashOpacity.setValue(dashOn);
        return;
      }
      // Start from "no changes": only the green baseline (or the empty shortfall) is on the bar.
      aSolid.setValue(to.base);
      aDash.setValue(to.base);
    }
    const cfg = { duration: intro ? 800 : 650, delay: intro ? INTRO_DELAY : 0, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    const grow = (t: { solid: number; dash: number }, c: typeof cfg) =>
      Animated.parallel([
        Animated.timing(aSolid, { ...c, toValue: t.solid }),
        Animated.timing(aDash, { ...c, toValue: t.dash }),
        Animated.timing(aDashOpacity, { ...c, duration: 250, toValue: dashOn }),
      ]);
    if (!intro && shown !== phase) {
      // Crossing 0 €: finish the old phase (shortfall full, or yellow empty), switch scale, then continue.
      const edge = shown === 'fill' ? track : 0;
      grow({ solid: edge, dash: edge }, { ...cfg, duration: 380, easing: Easing.inOut(Easing.cubic) }).start(({ finished }) => {
        if (!finished) return;
        const restart = phase === 'fill' ? track : 0;
        aSolid.setValue(restart);
        aDash.setValue(restart);
        setShown(phase);
        grow(to, { ...cfg, delay: 120 }).start();
      });
      return;
    }
    grow(to, cfg).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, preview, track]);

  const onLayout = (e: LayoutChangeEvent) => setTrack(e.nativeEvent.layout.width);
  const filling = shown === 'fill';
  const { base, solid } = layout(shown);
  const r = S.bar / 2;
  const hasExtra = saved > 0.005 || preview > 0.005;
  const hasPreview = preview > 0.005;
  // The "+X €" inside the yellow: what was saved. After a shortfall the big number already says what is left.
  const solidLabel = filling ? Math.min(saved, need) : deficit ? 0 : saved;

  // Spell out what the big number is: money left on the account when the next salary arrives.
  const title =
    size === 'sm' ? (
      <View style={{ flex: 1, gap: 1 }}>
        <T w={700} s={15} c={C.ink}>
          {label ?? t.leftOnPayday}
        </T>
        <T s={13} c={C.muted}>
          {t.estimateAfterExpenses(PAYDAY)}
        </T>
      </View>
    ) : size === 'md' ? (
      // The heading of the whole savings block on the Säästä tab, so it reads as a title, not a caption.
      <View style={{ gap: 4 }}>
        <T w={800} s={S.title} c={C.ink} style={{ lineHeight: S.title + 6, textAlign: 'center' }}>
          {label ?? t.estimatedBalance}
        </T>
        <T w={600} s={16} c={C.muted} style={{ textAlign: 'center' }}>
          {t.onPayday(PAYDAY)}
        </T>
      </View>
    ) : (
      <T w={700} s={S.title} c={C.muted}>
        {label ?? t.leftOnPaydayDate(PAYDAY)}
      </T>
    );
  const number = (
    <AnimatedNumber
      value={now}
      from={animateIn ? baseline : undefined}
      delay={animateIn ? INTRO_DELAY : 0}
      duration={800}
      format={eur0}
      colorFor={(n) => (Math.round(n) < 0 ? C.red : C.green)}
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
        {/* Empty track so the bar reads as "room to grow". In the fill phase it is the shortfall (red tint). */}
        <View style={[styles.abs, { right: 0, height: S.bar, borderRadius: r, backgroundColor: filling ? C.deficitTint : C.track }]} />
        {/* Dashed potential: drawn as one rounded rect behind the solid bars.
            In the fill phase only its tint shows, so the shortfall's red outline stays visible over it. */}
        <Animated.View
          style={[
            styles.abs,
            {
              height: S.bar,
              width: aDash,
              opacity: aDashOpacity,
              borderRadius: r,
              borderWidth: filling ? 0 : 2.5,
              borderStyle: 'dashed',
              borderColor: C.yellowDash,
              backgroundColor: C.yellowTint,
            },
          ]}
        />
        {filling ? (
          <View style={[styles.abs, { right: 0, height: S.bar, borderRadius: r, borderWidth: 2, borderStyle: 'dashed', borderColor: C.deficit }]} />
        ) : null}
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
        {base > 0 ? (
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
        ) : null}
        {solidLabel > 0.005 && solid - base > 44 && S.bar >= 18 ? (
          // Grows with the yellow; the padding keeps the label centred on the yellow part only.
          <Animated.View style={[styles.abs, styles.center, { width: aSolid, paddingLeft: base, height: S.bar }]}>
            <T w={800} s={12} numberOfLines={1}>
              +{eur0(solidLabel)}
            </T>
          </Animated.View>
        ) : null}
        {goal !== undefined && track > 0 && !filling ? (
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
        {filling ? (
          <>
            <Legend outline text={t.shortfall(need)} s={S.legend} />
            {saved > 0.005 ? <Legend color={C.yellow} text={t.covered(Math.min(saved, need), need)} s={S.legend} /> : null}
          </>
        ) : (
          <>
            <Legend color={deficit ? C.deficit : C.green} text={t.withoutSavings(baseline)} s={S.legend} />
            {goal !== undefined ? (
              <T w={700} s={S.legend} c={C.ink}>
                {t.goal(goal)}
              </T>
            ) : saved > 0.005 ? (
              <Legend color={C.yellow} text={t.yourSavings(saved)} s={S.legend} />
            ) : null}
          </>
        )}
        {size !== 'lg' && hasPreview ? (
          <Legend dashed text={`${previewLabel ?? t.possible} +${eur0(preview)}`} s={S.legend} />
        ) : null}
      </View>

      {children}
    </View>
  );
}

function Legend({ color, dashed, outline, text, s }: { color?: string; dashed?: boolean; outline?: boolean; text: string; s: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[styles.dot, dashed ? styles.dashDot : outline ? styles.outlineDot : { backgroundColor: color }]} />
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
  // Matches the shortfall track in the fill phase.
  outlineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.deficit, backgroundColor: C.deficitTint },
});
