import { Text as RNText, type TextProps } from 'react-native';

import { type as t } from '@/theme';

type Variant = keyof typeof t;

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[t[variant], style]} />;
}
