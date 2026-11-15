import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, font } from '../theme';
import { Tab, useNav } from '../nav';
import { useSave } from '../state';
import { Icon, IconName } from './Icon';
import { Press } from './ui';
import { useT } from '../i18n';
import type { Strings } from '../i18n/strings';

const TABS: { tab: Tab; label: keyof Strings; icon: IconName }[] = [
  { tab: 'home', label: 'tabHome', icon: 'home' },
  { tab: 'card', label: 'tabCard', icon: 'card' },
  { tab: 'save', label: 'tabSave', icon: 'coins' },
  { tab: 'account', label: 'tabBank', icon: 'wallet' },
  { tab: 'me', label: 'tabMe', icon: 'user' },
];

/**
 * Android is edge-to-edge, so the system navigation bar draws over the app.
 * In Expo Go the reported bottom inset can come back as 0 or too small, which
 * leaves the tab bar half hidden behind it. 48 dp is the height of the
 * 3-button navigation bar and also clears the gesture handle.
 */
export const MIN_BOTTOM = Platform.OS === 'android' ? 48 : 10;

export function TabBar() {
  const nav = useNav();
  const { pendingIds } = useSave();
  const insets = useSafeAreaInsets();
  const t = useT();
  // "S-Etukortti" needs ~66 px at 12 px; below ~350 px wide a fifth of the bar is narrower than that.
  const labelSize = useWindowDimensions().width < 350 ? 11 : 12;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM) }]}>
      {TABS.map(({ tab, label: key, icon }) => {
        const label = t[key] as string;
        const active = nav.tab === tab;
        const color = active ? C.green : C.navMuted;
        return (
          <Press key={tab} onPress={() => nav.goTab(tab)} containerStyle={{ flex: 1 }} style={styles.item} accessibilityLabel={label}>
            <View style={styles.iconBox}>
              <Icon name={icon} size={24} color={color} strokeWidth={active ? 2.1 : 1.7} filled={active && tab === 'home'} />
              {tab === 'save' && pendingIds.length > 0 ? <View style={styles.dot} /> : null}
            </View>
            {/* One line that shrinks on narrow phones ("S-Etukortti" is the longest), so labels never wrap or clip. */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              allowFontScaling={false}
              style={[font(active ? 700 : 500, labelSize, color), styles.label]}
            >
              {label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.navBorder,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 1 },
  iconBox: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { lineHeight: 16, textAlign: 'center', alignSelf: 'stretch' },
  dot: {
    position: 'absolute',
    right: -1,
    top: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.yellow,
    borderWidth: 1.5,
    borderColor: C.white,
  },
});
