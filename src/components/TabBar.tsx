import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface TabItem {
  href: Href;
  /** Path used to decide which tab is active. */
  path: string;
  label: string;
  icon: IconName;
  dot?: boolean;
}

export function TabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {items.map((t) => {
        const active = pathname === t.path;
        const tint = active ? colors.primary : '#8B99A8';
        return (
          <Pressable
            key={t.path}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(t.href)}
            style={styles.item}>
            <View>
              <Icon name={t.icon} size={22} color={tint} />
              {t.dot ? <View style={styles.dot} /> : null}
            </View>
            <Text style={[styles.label, { color: tint }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#EEF2F5',
    backgroundColor: colors.white,
  },
  item: { alignItems: 'center', gap: 4, minWidth: 64, paddingVertical: 2 },
  label: { fontFamily: fonts.bold, fontSize: 11 },
  dot: { position: 'absolute', top: -1, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F29A2E', borderWidth: 1.5, borderColor: colors.white },
});
