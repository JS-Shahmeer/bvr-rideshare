import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { FareBreakdownList, RouteStops } from '@/components/Booking';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Card, Divider, Pill, TitleRow } from '@/components/Primitives';
import { BackHeader, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import type { PaymentMethod } from '@/data/types';
import { fareEstimate, money } from '@/lib/fare';
import { useStore } from '@/state/AppStore';
import { colors } from '@/theme';

export default function FareAndPayment() {
  const { draft, settings, updateDraft, submitBooking } = useStore();
  const toast = useToast();
  const fare = fareEstimate(draft.pickup, draft.destination, settings);

  const request = () => {
    const r = submitBooking();
    if (!r.ok) return toast(r.error);
    toast('Ride request sent to Robert.');
    router.dismissTo('/home');
    router.push(`/ride/${r.id}`);
  };

  return (
    <Screen header={<BackHeader title="Fare & payment" trailing={<Pill label="Step 2 / 2" tone="blue" />} />}>
      <Card flat>
        <RouteStops pickup={draft.pickup} destination={draft.destination} />
        <Divider style={{ marginVertical: 12 }} />
        <View style={styles.stats}>
          <Stat icon="clock" label={`${fare.min} min approx`} />
          <Stat icon="route" label={`${fare.km} km approx`} />
        </View>
      </Card>

      <TitleRow title="Your fare breakdown" right={<Pill label="AUD" tone="blue" />} style={{ marginTop: 24 }} />
      <Card style={{ marginTop: 12 }}>
        <FareBreakdownList fare={fare} />
      </Card>

      <TitleRow title="Choose how to pay" style={{ marginTop: 24, marginBottom: 3 }} />
      <PayChoice value="cash" current={draft.payment} icon="cash" name="Cash" sub="Pay the driver after your ride" onPick={(payment) => updateDraft({ payment })} />
      <PayChoice
        value="card"
        current={draft.payment}
        icon="credit"
        name="Online payment"
        sub="Card, Apple Pay or Google Pay"
        onPick={(payment) => updateDraft({ payment })}
      />

      <Text variant="tiny" style={{ marginVertical: 15, lineHeight: 16 }}>
        Rates: {money(settings.kmRate)}/km and {money(settings.minRate)}/min, plus the NSW point-to-point, CTP and administration fees. Final fare is
        confirmed by your driver.
      </Text>
      <Button label="Request my ride" trailingIcon="arrow" onPress={request} />
    </Screen>
  );
}

function Stat({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={15} color={colors.muted} />
      <Text variant="bodyBold" style={{ fontSize: 12, color: '#4A6074' }}>
        {label}
      </Text>
    </View>
  );
}

function PayChoice({
  value,
  current,
  icon,
  name,
  sub,
  onPick,
}: {
  value: PaymentMethod;
  current: PaymentMethod;
  icon: IconName;
  name: string;
  sub: string;
  onPick: (v: PaymentMethod) => void;
}) {
  const sel = value === current;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: sel }}
      onPress={() => onPick(value)}
      style={[styles.choice, sel && styles.choiceSel]}>
      <View style={[styles.choiceIcon, sel && { backgroundColor: '#DCEEFA' }]}>
        <Icon name={icon} size={19} color={sel ? '#0D74C3' : '#557084'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">{name}</Text>
        <Text variant="tiny" style={{ marginTop: 3 }}>
          {sub}
        </Text>
      </View>
      <View style={[styles.radio, sel && styles.radioSel]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1.5, borderColor: '#E7EDF2', borderRadius: 13, marginTop: 9, backgroundColor: colors.white },
  choiceSel: { borderColor: '#75B7EB', backgroundColor: '#F0F8FF' },
  choiceIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#C5D3DF' },
  radioSel: { borderWidth: 6, borderColor: colors.primary },
});
