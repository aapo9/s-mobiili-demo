import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { C, eur, eur0 } from '../theme';
import { ACCOUNT_BALANCE, PAYDAY } from '../data';
import { useNav } from '../nav';
import { useSave } from '../state';
import { Icon, IconName } from '../components/Icon';
import { Cta, Press, T } from '../components/ui';

const QUICK: { label: string; icon: IconName }[] = [
  { label: 'Uusi maksu', icon: 'plus' },
  { label: 'Oma siirto', icon: 'transfer' },
  { label: 'Edut lähellä', icon: 'pin' },
  { label: 'Tallennetut', icon: 'bookmark' },
];

export function Home() {
  const nav = useNav();
  const { pendingIds, pendingSaving } = useSave();
  // The card is only an invitation to new suggestions; with none left it goes away.
  // Opens the Säästä tab first, so the user sees the outcome before reviewing suggestions.
  const openSave = () => nav.goTab('save');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <Icon name="logout" size={26} strokeWidth={1.8} />
          <Icon name="chat" size={26} strokeWidth={1.8} />
        </View>
        <View style={styles.bonus}>
          <View style={{ gap: 2 }}>
            <T w={600} s={16} c={C.white}>
              Bonusta tulossa
            </T>
            <T w={800} s={30} c={C.white}>
              4,12 €
            </T>
          </View>
          <T w={600} s={16} c={C.white} style={{ textDecorationLine: 'underline' }}>
            Kokonaishyöty
          </T>
        </View>
      </View>

      <View style={{ padding: 16, gap: 18 }}>
        {pendingIds.length > 0 ? (
          <View style={styles.saveCard}>
            <T w={800} s={27} style={{ lineHeight: 33 }}>
              Löysimme sinulle helppoja säästöjä
            </T>
            <Cta
              title={`Säästä ${eur0(pendingSaving)} nyt`}
              sub={`${pendingIds.length} ${pendingIds.length === 1 ? 'pieni säästö' : 'pientä säästöä'}`}
              onPress={openSave}
              height={66}
            />
          </View>
        ) : null}

        <View style={styles.quick}>
          {QUICK.map((q) => (
            <View key={q.label} style={styles.quickItem}>
              <View style={styles.quickIcon}>
                <Icon name={q.icon} size={26} color={C.white} />
              </View>
              <T s={14} style={{ textAlign: 'center' }}>
                {q.label}
              </T>
            </View>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <T w={800} s={22} c={C.green}>
            Tilit ja kortit
          </T>
          <Press onPress={() => nav.goTab('account')} style={styles.account}>
            <T w={500} s={19}>
              S-Tili
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T w={800} s={21} c={C.green}>
                {eur(ACCOUNT_BALANCE)}
              </T>
              <Icon name="chevron" size={20} color={C.muted} strokeWidth={2.2} />
            </View>
          </Press>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 9, paddingVertical: 9 },
  bonus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  saveCard: { backgroundColor: C.white, borderRadius: 22, paddingVertical: 22, paddingHorizontal: 20, gap: 14 },
  quick: { flexDirection: 'row', gap: 8 },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  account: {
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
