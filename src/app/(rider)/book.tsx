import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField, Field, Input, LocationField, SelectField } from '@/components/Fields';
import { Card, Notice, Pill, Segmented } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useStore } from '@/state/AppStore';

const PASSENGERS = [1, 2, 3, 4] as const;

export default function BookRide() {
  const { draft, updateDraft, validateDraft } = useStore();
  const toast = useToast();

  const next = () => {
    const r = validateDraft();
    if (!r.ok) return toast(r.error);
    router.push('/fare');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<BackHeader title="Book your ride" trailing={<Pill label="Step 1 / 2" tone="blue" />} />}>
        <Hero eyebrow="Journey details" title="Let’s get you moving." sub="A few details, then you’re ready to go." />

        <Card flat>
          <Text variant="bodyBold">Your route</Text>
          <Field label="Pickup">
            <LocationField title="Pickup location" icon="pin" value={draft.pickup} onChange={(pickup) => updateDraft({ pickup })} />
          </Field>
          <Field label="Destination">
            <LocationField title="Destination" icon="navigation" value={draft.destination} onChange={(destination) => updateDraft({ destination })} />
          </Field>
        </Card>

        <Field label="When would you like to travel?" style={{ marginTop: 18 }}>
          <Segmented
            value={draft.when}
            onChange={(when) =>
              updateDraft({ when, scheduledAt: when === 'scheduled' && !draft.scheduledAt ? new Date(Date.now() + 3_600_000).toISOString() : draft.scheduledAt })
            }
            options={[
              { value: 'now', label: 'Ride now', icon: 'zap' },
              { value: 'scheduled', label: 'Schedule for later', icon: 'calendar' },
            ]}
          />
        </Field>
        {draft.when === 'scheduled' ? (
          <Field label="Pickup date and time">
            <DateTimeField value={draft.scheduledAt} onChange={(scheduledAt) => updateDraft({ scheduledAt })} />
          </Field>
        ) : null}

        <Field label="Passengers">
          <SelectField
            title="Passengers"
            icon="users"
            value={draft.passengers}
            options={PASSENGERS}
            format={(n) => `${n} passenger${n > 1 ? 's' : ''}`}
            onChange={(passengers) => updateDraft({ passengers })}
          />
        </Field>
        <Field label="Your name">
          <Input icon="user" value={draft.name} onChangeText={(name) => updateDraft({ name })} maxLength={60} autoComplete="name" />
        </Field>
        <Field label="Phone number">
          <Input icon="phone" value={draft.phone} onChangeText={(phone) => updateDraft({ phone })} maxLength={30} keyboardType="phone-pad" autoComplete="tel" />
        </Field>

        <Notice style={{ marginVertical: 18 }}>Driver availability and final pickup time are subject to Robert’s confirmation.</Notice>
        <Button label="See fare estimate" trailingIcon="arrow" onPress={next} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
