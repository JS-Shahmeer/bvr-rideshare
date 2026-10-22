import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text as RNText, TextInput, View, type TextInputProps } from 'react-native';

import { SERVICE_AREAS } from '@/lib/fare';
import { dateNice } from '@/lib/format';
import { colors, fonts, radius } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ marginTop: 14 }, style]}>
      <Text variant="label" style={{ marginBottom: 8 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function Input({ icon, right, style, ...props }: TextInputProps & { icon?: IconName; right?: React.ReactNode }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[styles.control, focus && styles.focus]}>
      {icon ? <Icon name={icon} size={16} color="#7D93A6" /> : null}
      <TextInput
        placeholderTextColor="#A3B1BE"
        {...props}
        onFocus={(e) => {
          setFocus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, style]}
      />
      {right}
    </View>
  );
}

/** A tappable field that opens a bottom-sheet list of options. */
export function SelectField<T extends string | number>({
  value,
  options,
  onChange,
  icon,
  title,
  format = (v) => String(v),
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  icon?: IconName;
  title: string;
  format?: (v: T) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${format(value)}`} onPress={() => setOpen(true)} style={styles.control}>
        {icon ? <Icon name={icon} size={16} color="#7D93A6" /> : null}
        <RNText style={[styles.input, styles.selectText]} numberOfLines={1}>
          {format(value)}
        </RNText>
        <Icon name="down" size={16} color="#7D93A6" />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        {options.map((o) => {
          const sel = o === value;
          return (
            <Pressable
              key={String(o)}
              onPress={() => {
                onChange(o);
                setOpen(false);
              }}
              style={[styles.option, sel && styles.optionSel]}>
              <RNText style={[styles.optionText, sel && { color: colors.primary }]}>{format(o)}</RNText>
              {sel ? <Icon name="check" size={17} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

export function LocationField(props: { value: (typeof SERVICE_AREAS)[number]; onChange: (v: (typeof SERVICE_AREAS)[number]) => void; icon: IconName; title: string }) {
  return <SelectField {...props} options={SERVICE_AREAS} format={(v) => `${v}, NSW`} />;
}

/** Pickup date/time selector; native pickers on iOS/Android, datetime-local on web. */
export function DateTimeField({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const date = value ? new Date(value) : new Date(Date.now() + 3_600_000);
  const [mode, setMode] = useState<'date' | 'time' | null>(null);

  if (Platform.OS === 'web') {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    return (
      <View style={styles.control}>
        <Icon name="calendar" size={16} color="#7D93A6" />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <input
          type="datetime-local"
          value={local}
          min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
          onChange={(e: { target: { value: string } }) => e.target.value && onChange(new Date(e.target.value).toISOString())}
          style={{ flex: 1, border: 0, background: 'transparent', fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft, outline: 'none' }}
        />
      </View>
    );
  }

  const handle = (e: DateTimePickerEvent, picked?: Date) => {
    const current = mode;
    if (Platform.OS === 'android') setMode(null);
    if (e.type === 'dismissed' || !picked) return;
    const next = new Date(date);
    if (current === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes());
    onChange(next.toISOString());
    if (Platform.OS === 'android' && current === 'date') setMode('time');
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setMode('date')} style={styles.control}>
        <Icon name="calendar" size={16} color="#7D93A6" />
        <RNText style={[styles.input, styles.selectText]}>{dateNice(date.toISOString())}</RNText>
        <Icon name="edit" size={15} color="#7D93A6" />
      </Pressable>
      {Platform.OS === 'android' && mode ? (
        <DateTimePicker value={date} mode={mode} minimumDate={new Date()} onChange={handle} />
      ) : null}
      {Platform.OS === 'ios' ? (
        <Sheet visible={!!mode} onClose={() => setMode(null)} title="Pickup date and time">
          <DateTimePicker
            value={date}
            mode="datetime"
            display="spinner"
            minimumDate={new Date()}
            onChange={(_e, d) => d && onChange(d.toISOString())}
          />
          <Pressable onPress={() => setMode(null)} style={[styles.option, styles.optionSel, { justifyContent: 'center' }]}>
            <RNText style={[styles.optionText, { color: colors.primary }]}>Done</RNText>
          </Pressable>
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  control: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E4EDF4',
    backgroundColor: colors.field,
    borderRadius: radius.md,
    paddingHorizontal: 13,
  },
  focus: { borderColor: '#6AAEF0', backgroundColor: colors.white },
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft, paddingVertical: 12 },
  selectText: { paddingVertical: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  optionSel: { backgroundColor: '#F0F8FF', borderColor: '#75B7EB' },
  optionText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
