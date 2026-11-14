import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { C, eur } from '../theme';
import { QA, byId } from '../data';
import { useSave } from '../state';
import { Header, Press, T } from '../components/ui';

/**
 * "Kysy tästä": tap-only answers to the questions people actually ask about a
 * suggestion. No free-text input on purpose — the AI stays behind the interface.
 */
export function Ask({ id }: { id: string }) {
  const s = byId(id);
  const { saving } = useSave();
  const [asked, setAsked] = useState<QA[]>([]);
  const [typing, setTyping] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const remaining = s.qa.filter((q) => !asked.includes(q));

  const ask = (q: QA) => {
    if (typing) return;
    setAsked((a) => [...a, q]);
    setTyping(true);
    setTimeout(() => setTyping(false), 650);
  };

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [asked.length, typing]);

  return (
    <>
      <Header title="Kysy tästä" />
      <View style={styles.topic}>
        <View style={styles.topicPill}>
          <T w={700} s={16}>
            {s.title} · {eur(saving(id))}
          </T>
        </View>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {asked.length === 0 ? (
          <T s={17} c={C.muted} style={{ textAlign: 'center', marginTop: 12 }}>
            Valitse kysymys alta.
          </T>
        ) : null}
        {asked.map((q, i) => {
          const last = i === asked.length - 1;
          return (
            <React.Fragment key={q.q}>
              <Bubble mine text={q.q} />
              {last && typing ? <Typing /> : <Bubble text={q.a} />}
            </React.Fragment>
          );
        })}
      </ScrollView>
      {remaining.length > 0 ? (
        <View style={styles.chips}>
          {remaining.map((q) => (
            <Press key={q.q} onPress={() => ask(q)} style={styles.chip}>
              <T w={700} s={16} c={C.green}>
                {q.q}
              </T>
            </Press>
          ))}
        </View>
      ) : null}
    </>
  );
}

function Bubble({ text, mine }: { text: string; mine?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [a]);
  return (
    <Animated.View
      style={[
        mine ? styles.mine : styles.theirs,
        { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <T s={18} c={mine ? C.white : C.ink} style={{ lineHeight: 25 }}>
        {text}
      </T>
    </Animated.View>
  );
}

function Typing() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <View style={[styles.theirs, { flexDirection: 'row', gap: 6, paddingVertical: 16 }]}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { opacity: a.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [1, 0.3] : [0.3, 1] }) }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  topic: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    alignItems: 'center',
  },
  topicPill: { backgroundColor: C.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: C.green,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  theirs: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: C.white,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.green,
    backgroundColor: C.white,
    justifyContent: 'center',
  },
});
