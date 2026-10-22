import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, IconTile } from '@/components/Primitives';
import { BackHeader, Hero, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Role } from '@/data/types';
import { dateNice } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors } from '@/theme';

export function NotificationsScreen({ role, onBack }: { role: Role; onBack?: () => void }) {
  const { notifications, markNotificationsRead } = useStore();
  const list = notifications.filter((n) => n.role === role);

  // Mark as read when the user leaves the screen, so unread items stay highlighted while visible.
  const markRead = useRef(markNotificationsRead);
  markRead.current = markNotificationsRead;
  useFocusEffect(useCallback(() => () => markRead.current(role), [role]));

  return (
    <Screen header={<BackHeader title="Notifications" onBack={onBack} />}>
      <Hero title="You’re in the loop." sub="Booking and ride updates as they happen." />
      {list.length ? (
        list.map((n) => (
          <View key={n.id} style={styles.item}>
            <IconTile name="bell" bg={n.read ? '#F0F4F8' : '#E9F4FF'} color={n.read ? '#7D93A6' : '#0C74C2'} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{n.title}</Text>
              <Text variant="small" style={{ marginTop: 4, lineHeight: 17 }}>
                {n.message}
              </Text>
              <Text variant="tiny" style={{ marginTop: 5, color: '#ACB7C3' }}>
                {dateNice(n.createdAt)}
              </Text>
            </View>
            {!n.read ? <View style={styles.unread} /> : null}
          </View>
        ))
      ) : (
        <EmptyState icon="bell" title="No updates yet" body="New trip activity will show up here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderColor: '#EDF1F5' },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
