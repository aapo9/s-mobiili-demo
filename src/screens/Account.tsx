import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, eur, eur0 } from '../theme';
import { ACCOUNT_BALANCE, PAYDAY, TRANSACTIONS } from '../data';
import { useNav } from '../nav';
import { useSave } from '../state';
import { Icon } from '../components/Icon';
import { Body, Card, Header, Press, T } from '../components/ui';

export function Account() {
  const nav = useNav();
  const { baseline, saved, pendingIds, pendingSaving } = useSave();

  return (
    <>
      <Header title="S-Tili" />
      <Body>
        <Card style={{ gap: 4 }}>
          <T s={16} c={C.muted}>
            FI12 3456 7890 1234 56
          </T>
          <T w={800} s={36} c={C.green}>
            {eur(ACCOUNT_BALANCE)}
          </T>
          <T s={16} c={C.muted}>
            Käytettävissä
          </T>
        </Card>

        {/* The cleanup lives next to the account, not in a separate app. */}
        <Press onPress={() => nav.goTab('save')} style={styles.payday}>
          <View style={{ flex: 1, gap: 2 }}>
            <T w={700} s={17}>
              Rahaa jää palkkapäivänä {PAYDAY}
            </T>
            <T s={15} c={C.ink2}>
              {saved > 0 ? `${eur0(baseline + saved)}, josta ${eur0(saved)} säästämällä` : `Arviolta ${eur0(baseline)}`}
              {pendingIds.length > 0 ? ` · voit lisätä ${eur0(pendingSaving)}` : ''}
            </T>
          </View>
          <View style={styles.arrow}>
            <Icon name="arrow" size={20} color={C.yellow} strokeWidth={2.6} />
          </View>
        </Press>

        <T w={800} s={20} c={C.green} style={{ marginTop: 6 }}>
          Tapahtumat
        </T>
        <View style={styles.list}>
          {TRANSACTIONS.map((t, i) => (
            <View key={t.id} style={[styles.row, i < TRANSACTIONS.length - 1 && styles.divider]}>
              <View style={{ width: 52 }}>
                <T w={600} s={14} c={C.muted}>
                  {t.date}
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T w={600} s={17} numberOfLines={1}>
                  {t.title}
                </T>
                <T s={14} c={C.muted}>
                  {t.sub}
                </T>
              </View>
              <T w={700} s={17} c={t.amount > 0 ? C.green : C.ink}>
                {t.amount > 0 ? '+' : ''}
                {eur(t.amount)}
              </T>
            </View>
          ))}
        </View>
      </Body>
    </>
  );
}

const styles = StyleSheet.create({
  payday: {
    backgroundColor: C.yellow,
    borderRadius: 20,
    padding: 16,
    paddingLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
});
