import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { IconTile, Notice } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { DEMO_RIDE_ID, type DemoScenario } from '@/data/demo';
import { useStore } from '@/state/AppStore';
import { colors, fonts } from '@/theme';

type Item = { icon: IconName; title: string; sub: string; to: Href; scenario?: DemoScenario };

const ride = `/ride/${DEMO_RIDE_ID}` as Href;
const nav = { pathname: '/driver/navigate', params: { id: DEMO_RIDE_ID } } as Href;

const RIDER: Item[] = [
  { icon: 'lock', title: 'Sign in and sign up', sub: 'First screen a rider sees', to: { pathname: '/sign-in', params: { role: 'rider' } } },
  { icon: 'home', title: 'Plan and book a ride', sub: 'Route on the map, fare estimate, payment', to: '/home', scenario: { role: 'rider' } },
  { icon: 'clock', title: 'Waiting for the driver', sub: 'Request sent, not yet accepted', to: ride, scenario: { role: 'rider', ride: 'requested' } },
  { icon: 'check', title: 'Ride confirmed', sub: 'Robert accepted the booking', to: ride, scenario: { role: 'rider', ride: 'accepted' } },
  { icon: 'car', title: 'Driver on the way', sub: 'Car moving towards the pickup', to: ride, scenario: { role: 'rider', ride: 'enroute' } },
  { icon: 'pin', title: 'Driver arrived', sub: 'Waiting at the pickup point', to: ride, scenario: { role: 'rider', ride: 'arrived' } },
  { icon: 'navigation', title: 'On the trip', sub: 'Car moving along the route', to: ride, scenario: { role: 'rider', ride: 'inprogress' } },
  { icon: 'receipt', title: 'Trip completed', sub: 'Receipt and star rating', to: ride, scenario: { role: 'rider', ride: 'completed' } },
  { icon: 'close', title: 'Cancelled with a fee', sub: 'Rider cancelled after confirmation', to: ride, scenario: { role: 'rider', ride: 'cancelled' } },
  { icon: 'alert', title: 'Declined by the driver', sub: 'Robert could not take the booking', to: ride, scenario: { role: 'rider', ride: 'declined' } },
  { icon: 'history', title: 'My rides', sub: 'Upcoming, completed and cancelled trips', to: '/trips', scenario: { role: 'rider', ride: 'accepted' } },
  { icon: 'bell', title: 'Updates', sub: 'Ride notifications', to: '/notifications', scenario: { role: 'rider', ride: 'enroute' } },
  { icon: 'user', title: 'Account', sub: 'Profile, fees and cancellation info', to: '/profile', scenario: { role: 'rider' } },
];

const DRIVER: Item[] = [
  { icon: 'lock', title: 'Owner sign in', sub: 'Robert’s login', to: { pathname: '/sign-in', params: { role: 'driver' } } },
  { icon: 'chart', title: 'Dashboard with new requests', sub: 'Available, today’s numbers', to: '/driver', scenario: { role: 'driver', ride: 'requested' } },
  { icon: 'zap', title: 'Dashboard while offline', sub: 'Availability switched off', to: '/driver', scenario: { role: 'driver', ride: 'requested', driverOnline: false } },
  { icon: 'list', title: 'Booking requests', sub: 'Accept or decline, clash check', to: '/driver/requests', scenario: { role: 'driver', ride: 'requested' } },
  { icon: 'navigation', title: 'Heading to pickup', sub: 'Trip just accepted', to: nav, scenario: { role: 'driver', ride: 'accepted' } },
  { icon: 'car', title: 'Approaching pickup', sub: 'Car moving on the map', to: nav, scenario: { role: 'driver', ride: 'enroute' } },
  { icon: 'pin', title: 'At the pickup', sub: 'Ready to start the trip', to: nav, scenario: { role: 'driver', ride: 'arrived' } },
  { icon: 'route', title: 'On the journey', sub: 'Ready to complete the ride', to: nav, scenario: { role: 'driver', ride: 'inprogress' } },
  { icon: 'wallet', title: 'Earnings', sub: 'Cash and online totals', to: '/driver/earnings', scenario: { role: 'driver', ride: 'completed' } },
  { icon: 'settings', title: 'Fare and fee settings', sub: 'Rates and cancellation fee', to: '/driver/settings', scenario: { role: 'driver' } },
  { icon: 'bell', title: 'Owner updates', sub: 'Request and cancellation alerts', to: '/driver/notifications', scenario: { role: 'driver', ride: 'requested' } },
];

export default function Demo() {
  const { startDemo, resetDemo } = useStore();

  const open = (item: Item) => {
    startDemo(item.scenario ?? { role: item.to.toString().includes('driver') ? 'driver' : 'rider' });
    router.push(item.to);
  };

  const section = (title: string, sub: string, items: Item[], owner?: boolean) => (
    <View style={{ marginTop: 20 }}>
      <Text variant="sectionTitle">{title}</Text>
      <Text variant="small" style={{ marginTop: 4, marginBottom: 10 }}>
        {sub}
      </Text>
      <View style={styles.list}>
        {items.map((item, i) => (
          <Pressable key={item.title} onPress={() => open(item)} accessibilityRole="button" style={[styles.row, i > 0 && styles.rowLine]}>
            <IconTile name={item.icon} bg={owner ? '#EEF1F6' : undefined} color={owner ? colors.ink : undefined} />
            <View style={{ flex: 1 }}>
              <RNText style={styles.title}>{item.title}</RNText>
              <RNText style={styles.sub}>{item.sub}</RNText>
            </View>
            <Icon name="chevron" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <Screen header={<BackHeader title="Client demo" />}>
      <Hero eyebrow="Preview mode" title={'Every screen,\nevery stage.'} sub="Tap a scenario to open the app exactly at that point. Both demo accounts are signed in, so you can switch sides at any time." />
      <Notice>On a ride screen, the demo panel lets you move the trip to any stage or play it from start to finish.</Notice>
      {section('Rider app', 'What Robert’s customers see', RIDER)}
      {section('Driver app', 'Robert’s owner workspace', DRIVER, true)}
      <Button
        style={{ marginTop: 24 }}
        variant="outline"
        icon="refresh"
        label="Exit demo and reset data"
        onPress={() => {
          resetDemo();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7EDF3', borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowLine: { borderTopWidth: 1, borderColor: '#EEF2F6' },
  title: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
});
