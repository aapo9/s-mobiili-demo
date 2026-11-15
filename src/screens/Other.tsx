import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { demoSets } from '../data';
import { useNav } from '../nav';
import { useSave } from '../state';
import { LANGS, useLang } from '../i18n';
import { Icon } from '../components/Icon';
import { Body, Btn, Card, Header, Press, T, success } from '../components/ui';

/** A tab that exists only so the tab bar looks real: no content, just a notice. */
export function NotInDemo({ title }: { title: string }) {
  const { t } = useLang();
  return (
    <>
      <Header title={title} />
      <View style={styles.notInDemo}>
        <T w={600} s={17} c={C.muted} style={{ textAlign: 'center', lineHeight: 24 }}>
          {t.notInDemo}
        </T>
      </View>
    </>
  );
}

export function EtuCard() {
  return <NotInDemo title="S-Etukortti" />;
}

/** A selectable row with a round check, used by the language and demo-set pickers. */
function Option({ on, onPress, label, children }: { on: boolean; onPress: () => void; label: string; children: React.ReactNode }) {
  const { t } = useLang();
  return (
    <Press
      onPress={() => {
        if (on) return;
        success();
        onPress();
      }}
      style={[styles.option, on && styles.optionOn]}
      accessibilityLabel={`${label}${on ? t.selected : ''}`}
    >
      <View style={[styles.radio, on && styles.radioOn]}>
        {on ? <Icon name="check" size={14} color={C.white} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>{children}</View>
    </Press>
  );
}

export function Me() {
  const st = useSave();
  const nav = useNav();
  const { lang, setLang, t } = useLang();
  return (
    <>
      <Header title={t.me} />
      <Body>
        {/* Switching language keeps every decision: only the texts change. */}
        <Card style={{ gap: 12 }}>
          <T w={800} s={20}>
            {/* Bilingual heading, so it's findable whichever language is on. */}
            {lang === 'fi' ? 'Kieli · Language' : 'Language · Kieli'}
          </T>
          <T s={16} c={C.ink2} style={{ lineHeight: 22 }}>
            {t.languageBody}
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {LANGS.map((l) => (
              <View key={l.id} style={{ flex: 1 }}>
                <Option on={l.id === lang} onPress={() => setLang(l.id)} label={l.name}>
                  <T w={700} s={17}>
                    {l.name}
                  </T>
                </Option>
              </View>
            ))}
          </View>
        </Card>

        {/* Demo only: pick the scenario to present. Switching starts the demo over. */}
        <Card style={{ gap: 12 }}>
          <T w={800} s={20}>
            {t.demoSet}
          </T>
          <T s={16} c={C.ink2} style={{ lineHeight: 22 }}>
            {t.demoSetBody}
          </T>
          <View style={{ gap: 10 }}>
            {demoSets(lang).map((d) => (
              <Option key={d.id} on={d.id === st.demo.id} onPress={() => st.chooseSet(d.id)} label={d.name}>
                <T w={700} s={17}>
                  {d.name}
                </T>
                <T s={14} c={C.muted} style={{ lineHeight: 19 }}>
                  {d.description}
                </T>
                <T w={700} s={14} c={d.baseline < 0 ? C.red : C.green}>
                  {t.demoSetSummary(d.baseline, d.baseline + d.maxSaving, d.suggestions.length)}
                </T>
              </Option>
            ))}
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <T w={800} s={20}>
            {t.demo}
          </T>
          <T s={17} c={C.ink2} style={{ lineHeight: 24 }}>
            {t.demoResetBody}
          </T>
          <View>
            <Btn
              label={t.resetDemo}
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

const styles = StyleSheet.create({
  notInDemo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
  },
  optionOn: { borderColor: C.green, backgroundColor: C.greenTint },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.grey,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioOn: { backgroundColor: C.green, borderColor: C.green },
});
