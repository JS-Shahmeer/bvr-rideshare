import { Pressable, StyleSheet, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';

import type { BookingStatus } from '@/data/types';
import { STATUS_INFO, type Tone } from '@/lib/format';
import { colors, fonts, radius, shadows } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Card({ children, style, flat, raised }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; flat?: boolean; raised?: boolean }) {
  return <View style={[flat ? styles.flatCard : styles.card, !flat && (raised ? shadows.raised : shadows.card), style]}>{children}</View>;
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: '#E7F3FF', fg: '#0B70BF' },
  green: { bg: '#E2F8EF', fg: '#168D6D' },
  orange: { bg: '#FFF2E1', fg: '#BD751C' },
  red: { bg: '#FFF0F0', fg: '#CE4356' },
  gray: { bg: '#F0F3F6', fg: '#6F8090' },
};

export function Pill({ label, tone = 'gray', icon, dot }: { label: string; tone?: Tone; icon?: IconName; dot?: boolean }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      {icon ? <Icon name={icon} size={13} color={t.fg} /> : null}
      <RNText style={[styles.pillText, { color: t.fg }]}>{label}</RNText>
    </View>
  );
}

export function StatusPill({ status }: { status: BookingStatus }) {
  const s = STATUS_INFO[status];
  return <Pill label={s.label} tone={s.tone} dot />;
}

export function Notice({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.notice, style]}>
      <RNText style={styles.noticeText}>{children}</RNText>
    </View>
  );
}

export function Divider({ dashed, style }: { dashed?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, dashed && { borderStyle: 'dashed', borderColor: '#CFDFED' }, style]} />;
}

export function TitleRow({ title, right, style }: { title: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.titleRow, style]}>
      <Text variant="sectionTitle">{title}</Text>
      {right}
    </View>
  );
}

export function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.textAction} accessibilityRole="button">
      <RNText style={styles.textActionLabel}>{label}</RNText>
      <Icon name="chevron" size={15} color={colors.primary} />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, sel && [styles.segmentSel, shadows.card]]}>
            {o.icon ? <Icon name={o.icon} size={15} color={sel ? colors.primary : '#8B9CAD'} /> : null}
            <RNText style={[styles.segmentText, sel && { color: colors.primary }]} numberOfLines={1}>
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={onChange}
      hitSlop={8}
      style={[styles.toggle, value && { backgroundColor: colors.successBright }]}>
      <View style={[styles.knob, shadows.card, value && { transform: [{ translateX: 18 }] }]} />
    </Pressable>
  );
}

export function InfoPair({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoPair, last && { borderBottomWidth: 0 }]}>
      <Text variant="small" style={{ color: '#91A1AE' }}>
        {label}
      </Text>
      <Text variant="bodyBold" style={{ fontSize: 12, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text variant="subhead" style={{ textAlign: 'center', maxWidth: 260, marginBottom: 16 }}>
        {body}
      </Text>
      {action}
    </View>
  );
}

export function IconTile({ name, bg = '#E9F4FF', color = '#0C74C2', size = 37 }: { name: IconName; bg?: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={17} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7EDF3', borderRadius: radius.xl, padding: 17 },
  flatCard: { backgroundColor: colors.flat, borderWidth: 1, borderColor: '#EDF3FA', borderRadius: 16, padding: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 11, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.extrabold, fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  notice: { padding: 11, backgroundColor: colors.noticeBg, borderWidth: 1, borderColor: colors.noticeBorder, borderRadius: radius.md },
  noticeText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, color: colors.noticeText },
  divider: { borderTopWidth: 1, borderColor: colors.lineSoft, marginVertical: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  textAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  textActionLabel: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.primary },
  segmented: { flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: '#EDF1F4', backgroundColor: '#F3F7FB', borderRadius: 13, padding: 4 },
  segment: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10 },
  segmentSel: { backgroundColor: colors.white },
  segmentText: { fontFamily: fonts.extrabold, fontSize: 12, color: '#8B9CAD' },
  toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#D3DFEC', padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
  infoPair: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderColor: colors.lineSoft },
  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 18 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink, marginBottom: 8 },
});
