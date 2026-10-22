import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { DEMO_STAGES } from '@/data/demo';
import type { Booking, BookingStatus } from '@/data/types';
import { useStore } from '@/state/AppStore';
import { colors, fonts } from '@/theme';

import { Icon } from './Icon';
import { Card } from './Primitives';
import { Text } from './Text';

const EXTRA: { status: BookingStatus; label: string }[] = [
  { status: 'cancelled', label: 'Cancelled' },
  { status: 'declined', label: 'Declined' },
];
const ORDER = DEMO_STAGES.map((s) => s.status);
const STEP_MS = 3500;

/** Client-demo panel: jump the ride to any stage, or play it through to the end. */
export function DemoControls({ booking }: { booking: Booking }) {
  const { demoMode, setRideStatus } = useStore();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const at = ORDER.indexOf(booking.status);
    if (at < 0 || at >= ORDER.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setRideStatus(booking.id, ORDER[at + 1]), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, booking.status, booking.id, setRideStatus]);

  if (!demoMode) return null;

  const play = () => {
    if (playing) return setPlaying(false);
    if (!ORDER.includes(booking.status) || booking.status === 'completed') setRideStatus(booking.id, 'requested');
    setPlaying(true);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Icon name="sparkle" size={16} color={colors.primary} />
        <Text variant="bodyBold" style={{ flex: 1 }}>
          Demo controls
        </Text>
        <Pressable onPress={() => router.push('/demo')} hitSlop={8}>
          <RNText style={styles.link}>All scenarios</RNText>
        </Pressable>
      </View>
      <Text variant="tiny" style={{ marginTop: 4 }}>
        Simulates Robert’s side of the trip. Hidden outside demo mode.
      </Text>
      <View style={styles.chips}>
        {[...DEMO_STAGES, ...EXTRA].map((s) => {
          const on = booking.status === s.status;
          return (
            <Pressable
              key={s.status}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => (setPlaying(false), setRideStatus(booking.id, s.status))}
              style={[styles.chip, on && styles.chipOn]}>
              <RNText style={[styles.chipText, on && { color: colors.white }]}>{s.label}</RNText>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={play} accessibilityRole="button" style={styles.play}>
        <Icon name={playing ? 'close' : 'zap'} size={15} color={colors.primary} />
        <RNText style={styles.playText}>{playing ? 'Stop playback' : 'Play the whole trip'}</RNText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, borderColor: '#CFE4F7', backgroundColor: '#F6FAFE', borderStyle: 'dashed' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: '#DCE7F1' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bold, fontSize: 11.5, color: '#3F5A70' },
  play: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, paddingVertical: 11, borderRadius: 12, backgroundColor: '#E8F3FD' },
  playText: { fontFamily: fonts.extrabold, fontSize: 12.5, color: colors.primary },
});
