import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import type { Booking, FareBreakdown, ServiceArea } from '@/data/types';
import { money } from '@/lib/fare';
import { whenLabel } from '@/lib/format';
import { colors, fonts } from '@/theme';

import { Icon } from './Icon';
import { Card, StatusPill } from './Primitives';
import { Text } from './Text';

export function RouteStops({ pickup, destination }: { pickup: ServiceArea; destination: ServiceArea }) {
  return (
    <View>
      <Stop label="Pickup location" place={pickup} />
      <View style={styles.connector} />
      <Stop label="Destination" place={destination} to />
    </View>
  );
}

function Stop({ label, place, to }: { label: string; place: string; to?: boolean }) {
  return (
    <View style={styles.stop}>
      <View style={[styles.stopIcon, to && { backgroundColor: colors.dangerTint }]}>
        <Icon name="pin" size={15} color={to ? '#E05D69' : colors.primary} />
      </View>
      <View>
        <Text variant="small" style={{ fontSize: 11 }}>
          {label}
        </Text>
        <Text variant="bodyBold" style={{ fontSize: 14, marginTop: 1 }}>
          {place}, NSW
        </Text>
      </View>
    </View>
  );
}

export function FareBreakdownList({ fare }: { fare: FareBreakdown }) {
  const lines: [string, number][] = [
    [`Distance (${fare.km} km)`, fare.distance],
    [`Estimated trip time (${fare.min} min)`, fare.time],
    ['NSW point-to-point fee', fare.nsw],
    ['CTP fee', fare.ctp],
    ['Administration fee', fare.admin],
  ];
  return (
    <View>
      {lines.map(([label, value]) => (
        <View key={label} style={styles.fareLine}>
          <Text variant="body" style={{ color: '#6F8090' }}>
            {label}
          </Text>
          <Text variant="bodyBold">{money(value)}</Text>
        </View>
      ))}
      <View style={styles.fareTotal}>
        <Text variant="bodyBold" style={{ fontSize: 14 }}>
          Estimated total
        </Text>
        <RNText style={styles.total}>{money(fare.total)}</RNText>
      </View>
    </View>
  );
}

export function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Booking ${booking.id}`}>
      <Card style={{ marginBottom: 12 }}>
        <View style={styles.cardHead}>
          <Text variant="bodyBold">{booking.id}</Text>
          <StatusPill status={booking.status} />
        </View>
        <RouteStops pickup={booking.pickup} destination={booking.destination} />
        <View style={styles.cardFoot}>
          <View>
            <Text variant="tiny">{whenLabel(booking)}</Text>
            <Text variant="bodyBold" style={{ fontSize: 15, marginTop: 2 }}>
              {money(booking.fare.total)}
            </Text>
          </View>
          <View style={styles.more}>
            <RNText style={styles.moreText}>View details</RNText>
            <Icon name="chevron" size={15} color={colors.primary} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  stopIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E5F2FE', alignItems: 'center', justifyContent: 'center' },
  connector: { width: 0, height: 16, marginLeft: 14.5, borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: '#BBD3E6', marginVertical: 3 },
  fareLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  fareTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CFDFED',
  },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.primary },
  total: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.8, color: colors.primary },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.lineSoft,
  },
});
