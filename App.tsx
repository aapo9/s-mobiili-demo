import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { C } from './src/theme';
import { NavProvider, Route, useNav } from './src/nav';
import { SaveProvider } from './src/state';
import { MIN_BOTTOM, TabBar } from './src/components/TabBar';
import { Home } from './src/screens/Home';
import { Save } from './src/screens/Save';
import { Review } from './src/screens/Review';
import { Detail } from './src/screens/Detail';
import { Ask } from './src/screens/Ask';
import { Shopping } from './src/screens/Shopping';
import { Account } from './src/screens/Account';
import { EtuCard, Me } from './src/screens/Other';

function renderRoute(r: Route) {
  switch (r.name) {
    case 'home':
      return <Home />;
    case 'save':
      return <Save />;
    case 'account':
      return <Account />;
    case 'card':
      return <EtuCard />;
    case 'me':
      return <Me />;
    case 'review':
      return <Review ids={r.ids} goal={r.goal} single={r.single} />;
    case 'detail':
      return <Detail id={r.id} />;
    case 'ask':
      return <Ask id={r.id} />;
    case 'shopping':
      return <Shopping />;
  }
}

/** Slides each new screen in slightly from the right. */
function ScreenTransition({ children }: { children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: a,
        transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const { current } = useNav();
  // The suggestion cards are a focused flow that must fit one screen, so they hide the tab bar.
  const focused = current.route.name === 'review';
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenTransition key={current.key}>{renderRoute(current.route)}</ScreenTransition>
      </View>
      {focused ? <View style={{ height: Math.max(insets.bottom, MIN_BOTTOM), backgroundColor: C.bg }} /> : <TabBar />}
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.white }} />;
  return (
    <SafeAreaProvider>
      <SaveProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </SaveProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // White behind the status bar to match the white headers; mint for content.
  root: { flex: 1, backgroundColor: C.white },
});
