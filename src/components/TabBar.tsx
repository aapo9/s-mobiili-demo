import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';
import { Tab, useNav } from '../nav';
import { useSave } from '../state';
import { Icon, IconName } from './Icon';
import { Press, T } from './ui';

const TABS: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: 'home', label: 'Koti', icon: 'home' },
  { tab: 'card', label: 'S-Etukortti', icon: 'card' },
  { tab: 'save', label: 'Säästä', icon: 'coins' },
  { tab: 'account', label: 'Pankki', icon: 'wallet' },
  { tab: 'me', label: 'Minä', icon: 'user' },
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
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM) }]}>
      {TABS.map(({ tab, label, icon }) => {
        const active = nav.tab === tab;
        const color = active ? C.green : C.navMuted;
        return (
          <Press key={tab} onPress={() => nav.goTab(tab)} containerStyle={{ flex: 1 }} style={styles.item} accessibilityLabel={label}>
            <View>
              <Icon name={icon} size={26} color={color} strokeWidth={active ? 2.1 : 1.7} filled={active && tab === 'home'} />
              {tab === 'save' && pendingIds.length > 0 ? <View style={styles.dot} /> : null}
            </View>
            <T w={active ? 700 : 400} s={12} c={color}>
              {label}
            </T>
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
    paddingHorizontal: 2,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  dot: {
    position: 'absolute',
    right: -3,
    top: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.yellow,
    borderWidth: 1.5,
    borderColor: C.white,
  },
});
