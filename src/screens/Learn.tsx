import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { C, eur, font } from '../theme';
import { transferContext, useSave } from '../state';
import { ChatTurn, Explanation, explainer, transferAdvisor } from '../ai/explainer';
import { Icon, IconName } from '../components/Icon';
import { Header, Press, T } from '../components/ui';
import { useKeyboardHeight } from '../components/keyboard';
import { useT } from '../i18n';

type Turn = { q: string; a?: string };

/** "Kerro lisää" for one suggestion card. */
export function Learn({ id }: { id: string }) {
  const st = useSave();
  const s = st.demo.byId(id);
  const ctx = { saving: st.saving(id), qty: st.qty[id], demo: st.demo };
  return (
    <LearnView
      topic={`${s.title} · ${eur(ctx.saving)}`}
      load={() => explainer.explain(s, ctx)}
      questions={s.qa.map((q) => q.q)}
      answer={(q, history) => explainer.answer(s, q, ctx, history)}
    />
  );
}

/** "Kerro lisää" for the "Siirrä säästöön" suggestion on the Säästä tab. */
export function LearnTransfer({ amount }: { amount: number }) {
  const { demo, saved } = useSave();
  const t = useT();
  const ctx = transferContext(demo, saved, amount);
  return (
    <LearnView
      topic={t.transferTopic(amount)}
      load={() => transferAdvisor.explain(ctx)}
      questions={transferAdvisor.questions(ctx)}
      answer={(q, history) => transferAdvisor.answer(q, ctx, history)}
    />
  );
}

/**
 * The shared "Kerro lisää" screen: a personal, educational explanation plus
 * follow-up questions. Content comes from the `src/ai` layer (placeholder
 * hand-written texts for the card and the chips, Gemini for anything typed).
 * The first suggested question is a chip; the text field under it asks anything.
 * `answer` gets the conversation so far, so follow-up questions work.
 */
function LearnView({
  topic,
  load,
  questions,
  answer,
}: {
  topic: string;
  load: () => Promise<Explanation>;
  questions: string[];
  answer: (question: string, history: ChatTurn[]) => Promise<string>;
}) {
  const t = useT();
  const [exp, setExp] = useState<Explanation | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  // While typing, only the text field stays at the bottom (right above the keyboard; see Shell in App.tsx).
  const typing = useKeyboardHeight() > 0;
  const scroll = useRef<ScrollViewInstance>(null);
  const busy = turns.some((t) => t.a === undefined);
  // Only one ready-made question per suggestion; the rest of the Q&A still grounds typed questions.
  const remaining = questions.slice(0, 1).filter((q) => !turns.some((t) => t.q === q));

  useEffect(() => {
    let alive = true;
    load().then((e) => alive && setExp(e));
    return () => {
      alive = false;
    };
    // Loads once per screen; the topic doesn't change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = (raw: string) => {
    const q = raw.trim();
    if (busy || !q) return;
    const history = turns.filter((t): t is ChatTurn => t.a !== undefined);
    const i = turns.length;
    setTurns((t) => [...t, { q }]);
    answer(q, history).then((a) => setTurns((t) => t.map((x, j) => (j === i ? { q, a } : x))));
  };

  const send = () => {
    if (busy || !draft.trim()) return;
    ask(draft);
    setDraft('');
  };

  // Keep the latest message in view, also when the keyboard opens and the chat area shrinks.
  useEffect(() => {
    if (turns.length === 0) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [turns, typing]);

  return (
    <>
      <Header title={t.learnMore} />
      <View style={styles.topic}>
        <View style={styles.topicPill}>
          <T w={700} s={16}>
            {topic}
          </T>
        </View>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <View style={styles.card}>
          {exp ? (
            <FadeIn style={{ gap: 18 }}>
              <Section icon="info" title={t.whySuggest} body={exp.why} />
              <Section icon="coins" title={t.whatItMeans} body={exp.impact} />
              <View style={styles.lesson}>
                <T w={700} s={14} c={C.orangeInk}>
                  {t.goodToKnow}
                </T>
                <T w={800} s={19} c={C.orangeInkDark}>
                  {exp.lesson.term}
                </T>
                <T s={17} c={C.orangeInkDark} style={{ lineHeight: 24 }}>
                  {exp.lesson.body}
                </T>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Icon name="shield" size={16} color={C.muted} />
                <T s={14} c={C.muted} style={{ flex: 1 }}>
                  {exp.source}
                </T>
              </View>
            </FadeIn>
          ) : (
            <Loading />
          )}
        </View>

        {turns.length > 0 ? (
          <T w={800} s={18} style={{ marginTop: 6 }}>
            {t.yourQuestions}
          </T>
        ) : null}
        {turns.map((t, i) => (
          <React.Fragment key={i}>
            <Bubble mine text={t.q} />
            {t.a === undefined ? <Typing /> : <Bubble text={t.a} />}
          </React.Fragment>
        ))}
      </ScrollView>
      {exp ? (
        <View style={[styles.chips, typing && { paddingTop: 8, paddingBottom: 8 }]}>
          {typing ? null : (
            <>
              <T w={700} s={15} c={C.muted} style={{ width: '100%' }}>
                {t.askMore}
              </T>
              {remaining.map((q) => (
                <Press key={q} onPress={() => ask(q)} style={styles.chip}>
                  <T w={700} s={16} c={C.green}>
                    {q}
                  </T>
                </Press>
              ))}
            </>
          )}
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              placeholder={t.askPlaceholder}
              placeholderTextColor={C.muted}
              returnKeyType="send"
              submitBehavior="submit"
              maxLength={300}
              style={styles.input}
            />
            <Press
              onPress={send}
              disabled={busy || !draft.trim()}
              accessibilityLabel={t.sendA11y}
              style={[styles.send, (busy || !draft.trim()) && { opacity: 0.4 }]}
            >
              <Icon name="arrow" size={22} color={C.white} strokeWidth={2.4} />
            </Press>
          </View>
        </View>
      ) : null}
    </>
  );
}

function Section({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={styles.secIcon}>
        <Icon name={icon} size={20} color={C.green} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T w={800} s={18}>
          {title}
        </T>
        <T s={17} c={C.ink2} style={{ lineHeight: 24 }}>
          {body}
        </T>
      </View>
    </View>
  );
}

function FadeIn({ children, style }: { children: React.ReactNode; style?: object }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** Pulsing placeholder lines while the explanation is being prepared. */
function Loading() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const t = useT();
  return (
    <View style={{ gap: 10 }} accessibilityLabel={t.preparingA11y}>
      <T s={16} c={C.muted}>
        {t.preparing}
      </T>
      {[100, 92, 70].map((w) => (
        <Animated.View key={w} style={[styles.skeleton, { width: `${w}%`, opacity }]} />
      ))}
    </View>
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
  card: { backgroundColor: C.white, borderRadius: 22, padding: 18, gap: 16 },
  secIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lesson: { backgroundColor: C.yellowTint, borderRadius: 16, padding: 16, gap: 4 },
  skeleton: { height: 14, borderRadius: 7, backgroundColor: C.track },
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.bg,
  },
  inputRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.divider,
    backgroundColor: C.white,
    ...font(500, 17, C.ink),
  },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
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
