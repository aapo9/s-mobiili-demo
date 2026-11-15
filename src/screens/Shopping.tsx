import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { C, eur } from '../theme';
import { useNav } from '../nav';
import { useSave } from '../state';
import { Icon } from '../components/Icon';
import { Body, Btn, Card, Header, Pill, Press, T, success } from '../components/ui';
import { useT } from '../i18n';

type Line = { id: string; name: string; qty: number; price: number; unit?: string; note?: string; saved?: number; was?: string };

export function Shopping() {
  const nav = useNav();
  const st = useSave();
  const t = useT();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [preparing, setPreparing] = useState(false);

  // Build the next trip's list from habits + accepted changes.
  const cheese = st.demo.find('s-cheese');
  const battery = st.demo.find('s-battery');
  const lines: Line[] = [...st.demo.shoppingBase];
  if (cheese?.kind === 'swap') {
    const swapped = st.decisions[cheese.id] === 'accepted';
    lines.splice(2, 0, {
      id: 'l-cheese',
      name: swapped ? cheese.to.name : cheese.from.name,
      qty: 1,
      price: swapped ? cheese.to.price : cheese.from.price,
      saved: swapped ? cheese.from.price - cheese.to.price : undefined,
      was: swapped ? cheese.from.name : undefined,
    });
  }
  if (battery?.kind === 'reduce') {
    const reduced = st.decisions[battery.id] === 'accepted';
    const before = Math.ceil(battery.current / 2);
    const n = reduced ? Math.ceil((st.qty[battery.id] ?? battery.suggested) / 2) : before;
    if (n > 0) {
      lines.push({
        id: 'l-battery',
        name: battery.product,
        qty: n,
        price: battery.unitPrice,
        saved: reduced && n < before ? (before - n) * battery.unitPrice : undefined,
        was: reduced && n < before ? `${before} ${t.pcs}` : undefined,
      });
    }
  }
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const listSaving = lines.reduce((s, l) => s + (l.saved ?? 0), 0);
  const todo = ['s-hbo'].flatMap((id) => st.demo.find(id) ?? []).filter((s) => st.decisions[s.id] === 'accepted');

  const prepare = () => {
    setPreparing(true);
    setTimeout(() => {
      setPreparing(false);
      st.setBasketReady(true);
      success();
    }, 1100);
  };

  return (
    <>
      <Header title={t.shoppingList} />
      <Body>
        <Card style={{ gap: 2, paddingVertical: 16 }}>
          <T w={800} s={20}>
            {t.nextTrip}
          </T>
          <T s={16} c={C.muted}>
            {t.tripWhere}
          </T>
          {listSaving > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Pill label={t.listSaves(listSaving)} bg={C.greenFlash} color={C.greenDark} icon="check" />
            </View>
          ) : null}
        </Card>

        <View style={styles.list}>
          {lines.map((l, i) => (
            <Press
              key={l.id}
              onPress={() => setChecked((c) => ({ ...c, [l.id]: !c[l.id] }))}
              style={[styles.row, i < lines.length - 1 && styles.divider, l.saved ? { backgroundColor: C.greenTint } : null]}
              accessibilityLabel={l.name}
            >
              <View style={[styles.box, checked[l.id] && { backgroundColor: C.green, borderColor: C.green }]}>
                {checked[l.id] ? <Icon name="check" size={16} color={C.white} strokeWidth={3} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T w={600} s={17} style={checked[l.id] ? styles.strike : undefined}>
                  {l.name}
                </T>
                <T s={14} c={C.muted}>
                  {l.unit ?? `${l.qty} ${t.pcs}`}
                  {l.was ? t.was(l.was) : ''}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <T w={700} s={17}>
                  {eur(l.qty * l.price)}
                </T>
                {l.saved ? (
                  <T w={700} s={13} c={C.green}>
                    −{eur(l.saved)}
                  </T>
                ) : null}
              </View>
            </Press>
          ))}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: C.divider }]}>
            <T w={800} s={18} style={{ flex: 1 }}>
              {t.total}
            </T>
            <T w={800} s={18}>
              {eur(total)}
            </T>
          </View>
        </View>

        {st.basketReady ? (
          <BasketReady count={lines.length} total={total} />
        ) : (
          <Press onPress={prepare} disabled={preparing} style={styles.basketBtn}>
            {preparing ? <ActivityIndicator color={C.white} /> : <Icon name="cart" size={22} color={C.white} strokeWidth={2.2} />}
            <T w={700} s={20} c={C.white}>
              {preparing ? t.preparingBasket : t.prepareBasket}
            </T>
          </Press>
        )}

        {todo.length > 0 ? (
          <View style={{ gap: 8, marginTop: 6 }}>
            <T w={800} s={20} c={C.green}>
              {t.alsoRemember}
            </T>
            {todo.map((s) => (
              <Press key={s.id} onPress={() => nav.push({ name: 'detail', id: s.id })} style={styles.todo}>
                <Icon name="info" size={22} color={C.orangeInk} strokeWidth={2.2} />
                <T w={700} s={17} c={C.orangeInkDark} style={{ flex: 1 }}>
                  {t.cancelBefore('HBO Max', s.kind === 'pause' ? s.nextCharge : '')}
                </T>
                <Icon name="chevron" size={18} color={C.orangeInk} strokeWidth={2.2} />
              </Press>
            ))}
          </View>
        ) : null}
      </Body>
    </>
  );
}

function BasketReady({ count, total }: { count: number; total: number }) {
  const t = useT();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }).start();
  }, [a]);
  return (
    <Animated.View style={[styles.ready, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={styles.readyTick}>
          <Icon name="check" size={20} color={C.white} strokeWidth={3} />
        </View>
        <T w={800} s={20} style={{ flex: 1 }}>
          {t.basketReady}
        </T>
      </View>
      <T s={16} c={C.ink2} style={{ lineHeight: 23 }}>
        {t.basketReadyBody(count, total)}
      </T>
      <Btn label={t.openSKaupat} kind="outline" height={54} onPress={() => {}} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  strike: { textDecorationLine: 'line-through', color: C.muted },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketBtn: {
    height: 62,
    borderRadius: 31,
    backgroundColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ready: { backgroundColor: C.white, borderRadius: 22, padding: 20, gap: 12, borderWidth: 3, borderColor: C.green },
  readyTick: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.orangeTint,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
