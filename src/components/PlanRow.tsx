import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { C, eur, font } from '../theme';
import { Icon } from './Icon';
import { Pill, Press, T, tap } from './ui';
import { useT } from '../i18n';

export type RowView = {
  title: string;
  sub: string;
  amount: number;
  /** Struck-through previous amount, for swaps and reductions. */
  oldAmount?: number;
  tag?: { kind: 'suggest'; saving: number } | { kind: 'kept' } | { kind: 'changed'; label: string };
};

/**
 * One upcoming purchase in the spending plan.
 * `exit` plays the cleanup animation: tick, sweep right, collapse.
 * `flash` plays the in-place update used for cheaper swaps and reductions.
 */
export function PlanRow({
  view,
  last,
  onPress,
  exit,
  flash,
  delay = 0,
  freed,
  onAnimDone,
}: {
  view: RowView;
  last?: boolean;
  onPress?: () => void;
  exit?: boolean;
  flash?: boolean;
  delay?: number;
  freed?: number;
  onAnimDone?: () => void;
}) {
  const t = useT();
  const [h, setH] = useState<number | null>(null);
  const bg = useRef(new Animated.Value(0)).current; // 0 white → 1 green flash
  const tick = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const collapse = useRef(new Animated.Value(1)).current;
  const chip = useRef(new Animated.Value(0)).current;
  const [struck, setStruck] = useState(false);
  const started = useRef(false);

  const onLayout = (e: LayoutChangeEvent) => {
    if (h === null) setH(e.nativeEvent.layout.height);
  };

  useEffect(() => {
    if ((!exit && !flash) || started.current || h === null) return;
    started.current = true;
    const t = setTimeout(() => {
      tap('medium');
      setStruck(true);
      const intro = Animated.parallel([
        Animated.timing(bg, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(tick, { toValue: 1, useNativeDriver: false, speed: 18, bounciness: 12 }),
        Animated.timing(chip, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]);
      const outro = exit
        ? Animated.sequence([
            Animated.delay(260),
            Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
            Animated.timing(collapse, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
          ])
        : Animated.sequence([
            Animated.delay(700),
            Animated.parallel([
              Animated.timing(bg, { toValue: 0, duration: 500, useNativeDriver: false }),
              Animated.timing(tick, { toValue: 0, duration: 400, useNativeDriver: false }),
            ]),
          ]);
      Animated.sequence([intro, outro]).start(() => onAnimDone?.());
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit, flash, h]);

  const backgroundColor = bg.interpolate({ inputRange: [0, 1], outputRange: [C.white, C.greenFlash] });
  const height = h === null ? undefined : collapse.interpolate({ inputRange: [0, 1], outputRange: [0, h] });
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
  const opacity = slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const { title, sub, amount, oldAmount, tag } = view;
  const content = (
    <Animated.View
      onLayout={onLayout}
      style={[styles.row, !last && styles.divider, { backgroundColor, opacity, transform: [{ translateX }] }]}
    >
      {/* Tick grows in from zero width so the title slides aside to make room. */}
      <Animated.View
        style={{
          width: tick.interpolate({ inputRange: [0, 1], outputRange: [0, 26], extrapolateRight: 'clamp' }),
          marginRight: tick.interpolate({ inputRange: [0, 1], outputRange: [-10, 0], extrapolateRight: 'clamp' }),
          opacity: tick,
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[styles.tick, { transform: [{ scale: tick }] }]}>
          <Icon name="check" size={16} color={C.white} strokeWidth={3} />
        </Animated.View>
      </Animated.View>
      <View style={{ flex: 1, gap: 3 }}>
        <T w={700} s={17} numberOfLines={1} style={struck && exit ? styles.strike : undefined}>
          {title}
        </T>
        <T s={14} c={C.muted} numberOfLines={1}>
          {sub}
        </T>
        {tag?.kind === 'suggest' ? (
          <Pill label={t.suggestionSave(tag.saving)} bg={C.yellowTint} color={C.orangeInk} icon="sparkle" />
        ) : tag?.kind === 'kept' ? (
          <Pill label={t.youKeepThis} bg="#EEF2EF" color={C.muted} icon="lock" />
        ) : tag?.kind === 'changed' ? (
          <Pill label={tag.label} bg={C.greenFlash} color={C.greenDark} icon="check" />
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {oldAmount !== undefined ? (
          <T s={14} c={C.muted} style={styles.strike}>
            {eur(oldAmount)}
          </T>
        ) : null}
        <T w={700} s={17} style={struck && exit ? styles.strike : undefined}>
          {eur(amount)}
        </T>
      </View>
      {onPress ? <Icon name="chevron" size={18} color={C.muted} strokeWidth={2.2} /> : null}
      {freed ? (
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.chip,
            {
              opacity: chip.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: chip.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }],
            },
          ]}
        >
          +{eur(freed)}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );

  return (
    <Animated.View style={{ height, overflow: 'visible' }}>
      {onPress && !exit ? (
        <Press onPress={onPress} haptic>
          {content}
        </Press>
      ) : (
        content
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, minHeight: 68 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  strike: { textDecorationLine: 'line-through' },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    position: 'absolute',
    right: 16,
    top: 8,
    ...font(800, 16, C.green),
    backgroundColor: C.yellow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
