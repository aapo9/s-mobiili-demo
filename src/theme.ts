import { TextStyle } from 'react-native';
import { getLang } from './i18n/lang';

export const C = {
  bg: '#EAF6EB',
  white: '#FFFFFF',
  ink: '#1E1E1E',
  ink2: '#2C302D',
  muted: '#3D423F',
  navMuted: '#555B57',
  green: '#00733B',
  greenDark: '#00602F',
  greenTint: '#F2FAF4',
  greenFlash: '#DDF1E2',
  /** Sub line on the green CTA. */
  ctaSub: '#D6EEDD',
  yellow: '#FFD84D',
  yellowDash: '#B88A00',
  yellowTint: '#FFF4CC',
  grey: '#B8C2BB',
  /** Empty part of the outcome bar. */
  track: '#EDF1EE',
  border: '#D5DDD8',
  divider: '#E6ECE8',
  navBorder: '#DCE3DE',
  /** Destructive actions, e.g. "Peru tämä säästö". */
  red: '#C62828',
  /** Shortfall on the outcome bar when the payday estimate is negative. */
  deficit: '#E5766F',
  deficitTint: '#FDECEA',
  orangeTint: '#FFE9CC',
  orangeInk: '#6B3A00',
  orangeInkDark: '#3A2000',
};

const families = {
  400: 'Figtree_400Regular',
  500: 'Figtree_500Medium',
  600: 'Figtree_600SemiBold',
  700: 'Figtree_700Bold',
  800: 'Figtree_800ExtraBold',
} as const;

export type Weight = keyof typeof families;

/** Figtree ships one family per weight, so pick the family instead of fontWeight. */
export function font(weight: Weight, size: number, color: string = C.ink, extra?: TextStyle): TextStyle {
  return { fontFamily: families[weight], fontSize: size, color, ...extra };
}

/** Money in the active language: 24,90 € (fi) or €24.90 (en). */
export function eur(n: number, decimals = 2): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const sign = n < 0 ? '−' : '';
  return getLang() === 'en' ? `${sign}€${fixed}` : `${sign}${fixed.replace('.', ',')} €`;
}

/** Whole euros, rounded: 58 €, −48 € (fi) or €58, −€48 (en). */
export function eur0(n: number): string {
  const r = Math.round(n);
  const sign = r < 0 ? '−' : '';
  return getLang() === 'en' ? `${sign}€${Math.abs(r)}` : `${sign}${Math.abs(r)} €`;
}
