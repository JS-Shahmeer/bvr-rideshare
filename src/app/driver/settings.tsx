import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Fields';
import { Card, Divider, InfoPair, Notice, TitleRow, Toggle } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { FIXED_FEES, money } from '@/lib/fare';
import { useStore } from '@/state/AppStore';

function parseRate(v: string, max: number): number | null {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

export default function DriverSettings() {
  const { settings, updateSettings, driverOnline, toggleOnline, signOut, setActiveRole, sessions } = useStore();
  const toast = useToast();
  const [km, setKm] = useState(String(settings.kmRate));
  const [min, setMin] = useState(String(settings.minRate));
  const [fee, setFee] = useState(String(settings.cancellationFee));

  const save = () => {
    const kmRate = parseRate(km, 99);
    const minRate = parseRate(min, 99);
    const cancellationFee = parseRate(fee, 500);
    if (kmRate === null || minRate === null || cancellationFee === null) return toast('Enter valid, non-negative amounts.');
    updateSettings({ kmRate, minRate, cancellationFee });
    toast('Fare settings saved.');
  };

  return (
    <Screen header={<BackHeader title="Driver settings" />}>
      <Hero title="Your business, your rules." sub="Set your availability, fare rates and cancellation policy." />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text variant="bodyBold">Taking bookings</Text>
            <Text variant="tiny" style={{ marginTop: 4 }}>
              {driverOnline ? 'Riders can request trips now' : 'New requests are paused'}
            </Text>
          </View>
          <Toggle label="Taking bookings" value={driverOnline} onChange={toggleOnline} />
        </View>
      </Card>

      <TitleRow title="Fare calculator" style={{ marginTop: 24 }} />
      <Text variant="subhead" style={{ marginTop: 6 }}>
        Every fare is distance × your km rate plus time × your minute rate, then the fixed fees below.
      </Text>
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="AUD / km" style={{ flex: 1, marginTop: 0 }}>
            <Input value={km} onChangeText={setKm} keyboardType="decimal-pad" />
          </Field>
          <Field label="AUD / minute" style={{ flex: 1, marginTop: 0 }}>
            <Input value={min} onChangeText={setMin} keyboardType="decimal-pad" />
          </Field>
        </View>
        <Divider />
        <InfoPair label="NSW point-to-point fee" value={money(FIXED_FEES.nsw)} />
        <InfoPair label="CTP fee" value={money(FIXED_FEES.ctp)} />
        <InfoPair label="Administration fee" value={money(FIXED_FEES.admin)} last />
      </Card>

      <TitleRow
        title="Cancellation fee"
        style={{ marginTop: 24 }}
        right={<Toggle label="Cancellation fee" value={settings.cancellationEnabled} onChange={() => updateSettings({ cancellationEnabled: !settings.cancellationEnabled })} />}
      />
      <Text variant="subhead" style={{ marginTop: 6 }}>
        Charged when a rider cancels after you have accepted the ride.
      </Text>
      <Field label="Cancellation fee (AUD)">
        <Input value={fee} onChangeText={setFee} keyboardType="decimal-pad" editable={settings.cancellationEnabled} />
      </Field>

      <Button style={{ marginTop: 20 }} icon="check" label="Save settings" onPress={save} />

      <Notice style={{ marginTop: 20 }}>Final rates, fees and the cancellation policy should be confirmed against current NSW point-to-point rules before launch.</Notice>

      <Button style={{ marginTop: 20 }} variant="outline" icon="eye" label="Client demo scenarios" onPress={() => router.push('/demo')} />
      <Button
        style={{ marginTop: 10 }}
        variant="outline"
        icon="user"
        label="Switch to rider view"
        onPress={() => {
          setActiveRole('rider');
          router.replace(sessions.rider ? '/home' : { pathname: '/sign-in', params: { role: 'rider' } });
        }}
      />
      <Button
        style={{ marginTop: 10 }}
        variant="danger"
        icon="logout"
        label="Sign out of driver account"
        onPress={() => {
          signOut('driver');
          router.replace({ pathname: '/sign-in', params: { role: 'driver' } });
        }}
      />
    </Screen>
  );
}
