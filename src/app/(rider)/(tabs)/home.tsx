import { router } from 'expo-router';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField, Field, LocationField } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { LiveMap } from '@/components/LiveMap';
import { Card, Pill, Segmented, StatusPill, TitleRow } from '@/components/Primitives';
import { Hero, RiderHeader, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { routeMetrics } from '@/lib/fare';
import { OPEN_STATUSES } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors, fonts } from '@/theme';

export default function RiderHome() {
  const { draft, updateDraft, bookings, sessions } = useStore();
  const toast = useToast();
  const active = bookings.find((b) => b.riderId === sessions.rider?.email && OPEN_STATUSES.includes(b.status));

  const next = () => {
    if (draft.pickup === draft.destination) return toast('Pickup and destination must be different.');
    router.push('/book');
  };

  return (
    <Screen header={<RiderHeader />}>
      <Hero eyebrow="Your local ride partner" title="Where to today?" sub="Reliable local travel, made effortless." />

      {active ? (
        <Card style={{ marginBottom: 14, backgroundColor: '#EAF5FF', borderColor: '#D5E9FA' }}>
          <View style={styles.activeRow}>
            <Icon name="car" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold" style={{ color: '#0B70B9' }}>
                {active.pickup} → {active.destination}
              </Text>
              <Text variant="tiny" style={{ marginTop: 3 }}>
                Booking {active.id}
              </Text>
            </View>
            <StatusPill status={active.status} />
          </View>
          <Button style={{ marginTop: 12 }} variant="outline" label="View ride status" trailingIcon="arrow" onPress={() => router.push(`/ride/${active.id}`)} />
        </Card>
      ) : null}

      <LiveMap
        height={260}
        label="Your route"
        pickup={draft.pickup}
        destination={draft.destination}
        showAreas
        locate
        onAreaPress={(destination) => updateDraft({ destination })}
        footer={
          <>
            <Icon name="navigation" size={15} color={colors.ink} />
            <RNText style={styles.footerText} numberOfLines={1}>
              {draft.pickup === draft.destination ? 'Tap a town to set your destination' : `${draft.pickup} → ${draft.destination}`}
            </RNText>
            {draft.pickup !== draft.destination ? (
              <RNText style={styles.footerAccent}>
                {routeMetrics(draft.pickup, draft.destination).km} km · {routeMetrics(draft.pickup, draft.destination).min} min
              </RNText>
            ) : null}
          </>
        }
      />

      <Card raised style={{ marginTop: 15 }}>
        <TitleRow title="Plan your journey" right={<Pill label="Local service" tone="green" icon="check" />} />
        <Field label="Pickup location">
          <LocationField title="Pickup location" icon="pin" value={draft.pickup} onChange={(pickup) => updateDraft({ pickup })} />
        </Field>
        <Field label="Where to?">
          <LocationField title="Destination" icon="navigation" value={draft.destination} onChange={(destination) => updateDraft({ destination })} />
        </Field>
        <Segmented
          style={{ marginTop: 16 }}
          value={draft.when}
          onChange={(when) =>
            updateDraft({ when, scheduledAt: when === 'scheduled' && !draft.scheduledAt ? new Date(Date.now() + 3_600_000).toISOString() : draft.scheduledAt })
          }
          options={[
            { value: 'now', label: 'Ride now', icon: 'zap' },
            { value: 'scheduled', label: 'Schedule ride', icon: 'calendar' },
          ]}
        />
        {draft.when === 'scheduled' ? (
          <Field label="Pickup date and time">
            <DateTimeField value={draft.scheduledAt} onChange={(scheduledAt) => updateDraft({ scheduledAt })} />
          </Field>
        ) : null}
        <Button style={{ marginTop: 16 }} label="Continue to booking" trailingIcon="arrow" onPress={next} />
      </Card>

      <TitleRow title="Why ride with BVR?" style={{ marginTop: 26 }} />
      <View style={styles.tags}>
        <Tag icon="shield" label="Local driver" />
        <Tag icon="clock" label="Flexible pickup" />
        <Tag icon="credit" label="Cash or card" />
      </View>
    </Screen>
  );
}

function Tag({ icon, label }: { icon: 'shield' | 'clock' | 'credit'; label: string }) {
  return (
    <View style={styles.tag}>
      <Icon name={icon} size={15} color={colors.primary} />
      <RNText style={styles.tagText}>{label}</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerText: { flex: 1, fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink },
  footerAccent: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.primary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.tint },
  tagText: { fontFamily: fonts.bold, fontSize: 12, color: '#31516B' },
});
