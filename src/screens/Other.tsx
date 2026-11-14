import React from 'react';
import { View } from 'react-native';
import { C } from '../theme';
import { useNav } from '../nav';
import { useSave } from '../state';
import { Body, Btn, Card, Header, T } from '../components/ui';

export function EtuCard() {
  return (
    <>
      <Header title="S-Etukortti" />
      <Body>
        <Card style={{ gap: 8 }}>
          <T w={800} s={20}>
            Ostotiedot
          </T>
          <T s={17} c={C.ink2} style={{ lineHeight: 24 }}>
            Säästä-ehdotukset käyttävät S-Etukortin tuotetason ostotietojasi. Ehdotukset ovat vain sinun nähtävissäsi.
          </T>
          <T w={700} s={17} c={C.green}>
            Ostotietojen käyttö: päällä
          </T>
        </Card>
      </Body>
    </>
  );
}

export function Me() {
  const st = useSave();
  const nav = useNav();
  return (
    <>
      <Header title="Minä" />
      <Body>
        <Card style={{ gap: 12 }}>
          <T w={800} s={20}>
            Demo
          </T>
          <T s={17} c={C.ink2} style={{ lineHeight: 24 }}>
            Palauta kaikki ehdotukset alkutilaan ja aloita esittely alusta.
          </T>
          <View>
            <Btn
              label="Nollaa demo"
              kind="outline"
              onPress={() => {
                st.resetAll();
                nav.goTab('home');
              }}
            />
          </View>
        </Card>
      </Body>
    </>
  );
}
