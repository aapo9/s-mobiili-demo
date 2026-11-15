import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, eur } from '../theme';
import { unitOf } from '../data';
import { useNav } from '../nav';
import { useSave } from '../state';
import { Icon } from '../components/Icon';
import { Body, Btn, Card, Header, LearnMore, T } from '../components/ui';
import { useT } from '../i18n';

/** What an accepted change means, and what (if anything) is left to do. */
export function Detail({ id }: { id: string }) {
  const nav = useNav();
  const st = useSave();
  const t = useT();
  const s = st.demo.byId(id);
  const amount = st.saving(id);

  const undo = () => {
    st.undo(id);
    nav.back();
  };

  return (
    <>
      <Header title={s.kind === 'swap' ? s.title : s.kind === 'reduce' ? s.title : s.doneLabel} />
      <Body contentStyle={{ gap: 12 }}>
        <Card style={{ gap: 4, paddingVertical: 18 }}>
          <T s={17} c={C.muted}>
            {t.youSave}
          </T>
          <T w={800} s={36} c={C.green} style={{ lineHeight: 40 }}>
            {s.kind === 'pause' ? t.perMonth(s.monthly) : eur(amount)}
          </T>
          <T s={17} c={C.muted} style={{ lineHeight: 24 }}>
            {s.kind === 'reduce'
              ? t.reduceNote(st.qty[id], unitOf(s), s.current)
              : s.detailNote ??
                (s.kind === 'pause'
                  ? t.perYear(Math.round(s.monthly * 12))
                  : s.kind === 'swap'
                    ? t.swapNote(s.to.name, s.times)
                    : t.beforePayday)}
          </T>
        </Card>

        {s.kind === 'pause' ? (
          <View style={styles.note} accessibilityRole="alert">
            <Icon name="info" size={24} color={C.orangeInk} strokeWidth={2.2} />
            <T s={17} c={C.orangeInkDark} style={{ flex: 1, lineHeight: 24 }}>
              <T w={700} s={17} c={C.orangeInkDark}>
                {t.subStillActive}
              </T>{' '}
              {t.nextCharge(s.nextCharge)}
            </T>
          </View>
        ) : null}
        {s.steps?.length ? (
          <Card style={{ gap: 14, paddingVertical: 18 }}>
            <T w={800} s={20}>
              {t.howToSave}
            </T>
            {s.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={styles.num}>
                  <T w={800} s={17} c={C.white}>
                    {i + 1}
                  </T>
                </View>
                <T s={18} style={{ flex: 1, lineHeight: 25 }}>
                  {step}
                </T>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={{ gap: 4 }}>
          <LearnMore size={18} onPress={() => nav.push({ name: 'learn', id })} containerStyle={{ alignSelf: 'center' }} />
          <Btn label={t.cancelSaving} kind="text" color={C.red} height={48} onPress={undo} />
        </View>
      </Body>
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: C.orangeTint,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
