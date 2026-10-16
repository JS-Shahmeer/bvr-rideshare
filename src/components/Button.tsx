import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, shadows } from '@/theme';

import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'owner' | 'success' | 'outline' | 'danger' | 'neutral';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TEXT: Record<Variant, string> = {
  primary: colors.white,
  owner: colors.white,
  success: colors.white,
  outline: '#0769B6',
  danger: '#DF5661',
  neutral: '#31516B',
};

export function Button({ label, onPress, variant = 'primary', icon, trailingIcon, disabled, loading, style, testID }: Props) {
  const color = TEXT[variant];
  const content = (
    <View style={styles.row}>
      {loading ? <ActivityIndicator color={color} size="small" /> : icon ? <Icon name={icon} size={16} color={color} /> : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon && !loading ? <Icon name={trailingIcon} size={16} color={color} /> : null}
    </View>
  );

  const filled = variant === 'primary' || variant === 'owner';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        filled && shadows.button,
        variant === 'success' && styles.success,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        variant === 'neutral' && styles.neutral,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}>
      {filled ? (
        <LinearGradient
          colors={variant === 'owner' ? ['#0A72B6', '#163F68'] : colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.md + 1 }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md + 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.extrabold, fontSize: 14 },
  success: { backgroundColor: '#079C73' },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#C8E2FA', minHeight: 47 },
  danger: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.dangerBorder, minHeight: 47 },
  neutral: { backgroundColor: '#F4F8FC', borderWidth: 1, borderColor: '#E6EDF3', minHeight: 47 },
});
