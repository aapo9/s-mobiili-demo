import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, font, Weight } from '../theme';
import { Icon, IconName } from './Icon';
import { useNav } from '../nav';
import { useT } from '../i18n';

export const TAB_BAR_HEIGHT = 64;

export function T({
  w = 400,
  s = 16,
  c = C.ink,
  style,
  children,
  ...rest
}: { w?: Weight; s?: number; c?: string; style?: StyleProp<TextStyle>; children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text style={[font(w, s, c), style]} {...rest}>
      {children}
    </Text>
  );
}

export function tap(style: 'light' | 'medium' = 'light') {
  Haptics.impactAsync(style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Pressable that gently scales down while pressed. */
export function Press({
  onPress,
  style,
  children,
  disabled,
  haptic = true,
  accessibilityLabel,
  containerStyle,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  haptic?: boolean;
  accessibilityLabel?: string;
  /** Style for the outer touch target (e.g. flex: 1 inside a row). */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={containerStyle}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onPress={() => {
        if (haptic) tap();
        onPress?.();
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  const nav = useNav();
  const t = useT();
  return (
    <View style={styles.header}>
      {onBack !== undefined || nav.stack.length > 1 ? (
        <Press onPress={onBack ?? nav.back} style={styles.headerBtn} accessibilityLabel={t.back}>
          <Icon name="back" size={28} strokeWidth={2.2} />
        </Press>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <T w={700} s={20} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </T>
      <View style={styles.headerBtn} />
    </View>
  );
}

export function Body({ children, contentStyle }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 32, gap: 14 }, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'outline' | 'text';
export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  height = 62,
  disabled,
  containerStyle,
  color: colorOverride,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  /** Label and icon color, e.g. C.red for a destructive text button. */
  color?: string;
  icon?: IconName;
  height?: number;
  disabled?: boolean;
  /** Layout on the touch target, e.g. flex: 1 in a row. */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const color = colorOverride ?? (kind === 'primary' ? C.white : kind === 'text' ? C.ink : C.green);
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      containerStyle={containerStyle}
      style={[
        styles.btn,
        { height, borderRadius: height / 2, opacity: disabled ? 0.5 : 1 },
        kind === 'primary' && { backgroundColor: C.green },
        kind === 'outline' && { backgroundColor: C.white, borderWidth: 2.5, borderColor: C.green },
      ]}
    >
      {icon ? <Icon name={icon} size={22} color={color} strokeWidth={2.2} /> : null}
      <T w={700} s={kind === 'text' ? 18 : 20} c={color}>
        {label}
      </T>
    </Press>
  );
}

/** The big green call-to-action: title, optional sub line, arrow. */
export function Cta({ title, sub, onPress, height = 72 }: { title: string; sub?: string; onPress: () => void; height?: number }) {
  return (
    <Press onPress={onPress} style={[styles.cta, { minHeight: height, borderRadius: height / 2 }]}>
      <View style={{ flex: 1, paddingVertical: 10 }}>
        <T w={800} s={20} c={C.white}>
          {title}
        </T>
        {sub ? (
          <T w={600} s={15} c={C.ctaSub}>
            {sub}
          </T>
        ) : null}
      </View>
      <View style={styles.ctaArrow}>
        <Icon name="arrow" size={22} color={C.green} strokeWidth={2.6} />
      </View>
    </Press>
  );
}

/** Counts smoothly to `value`. */
export function AnimatedNumber({
  value,
  format,
  style,
  duration = 650,
  from,
  delay = 0,
  colorFor,
}: {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  /** Text color for the number currently shown, e.g. red while it counts through negative values. */
  colorFor?: (n: number) => string;
  duration?: number;
  /** Start value on mount; defaults to `value` (no intro count). */
  from?: number;
  /** Delay for the first count only. */
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(from ?? value)).current;
  const [shown, setShown] = useState(from ?? value);
  const first = useRef(true);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(v));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    const d = first.current ? delay : 0;
    first.current = false;
    Animated.timing(anim, { toValue: value, duration, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, anim, duration]);
  return <Text style={[style, colorFor && { color: colorFor(shown) }]}>{format(shown)}</Text>;
}

export function Pill({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={14} color={color} strokeWidth={2.4} /> : null}
      <T w={700} s={13} c={color}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Text link; the padding only grows the touch target. */
  learn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingRight: 12 },
  header: {
    backgroundColor: C.white,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.white, borderRadius: 22, padding: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 24,
    paddingRight: 12,
    backgroundColor: C.green,
  },
  ctaArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});

/** "Kerro lisää": the tinted, easy-to-spot entry to a suggestion's explanation. */
export function LearnMore({
  onPress,
  size = 17,
  containerStyle,
}: {
  onPress: () => void;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const t = useT();
  return (
    <Press
      onPress={onPress}
      containerStyle={[{ alignSelf: 'flex-start' }, containerStyle]}
      style={styles.learn}
      accessibilityLabel={t.learnMoreA11y}
    >
      <T w={700} s={size} c={C.green}>
        {t.learnMore}
      </T>
      <Icon name="chevron" size={size + 1} color={C.green} strokeWidth={2.6} />
    </Press>
  );
}
