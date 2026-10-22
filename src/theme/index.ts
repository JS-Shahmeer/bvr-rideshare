import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * BVR Rideshare design tokens.
 * Brand blue and grey are sampled from the client logo; supporting tones come
 * from the approved interactive prototype.
 */
export const colors = {
  brandBlue: '#0868B5',
  brandBlueDeep: '#075DA6',
  brandGrey: '#727A85',
  brandGreyDark: '#5F6973',

  primary: '#0877CD',
  primaryDark: '#07519D',
  primaryGradient: ['#087CCD', '#075FBA'] as const,
  ownerGradient: ['#0C3761', '#106DC0'] as const,
  statGradient: ['#0C3B70', '#0C80D2'] as const,
  splashGradient: ['#0A7BD0', '#0858A8', '#0B3563'] as const,

  ink: '#172C42',
  inkSoft: '#30475D',
  navy: '#112A44',
  muted: '#7C8B9B',
  mutedLight: '#9AABBA',
  line: '#E4EBF2',
  lineSoft: '#EFF3F5',

  surface: '#FFFFFF',
  background: '#FFFFFF',
  field: '#F7F9FC',
  flat: '#F7FAFF',
  tint: '#EEF5FD',
  tintStrong: '#E7F3FF',

  success: '#129C73',
  successBright: '#18B88B',
  successTint: '#E2F8EF',
  danger: '#E85862',
  dangerTint: '#FFF0F0',
  dangerBorder: '#FFD0D4',
  warning: '#BD751C',
  warningTint: '#FFF2E1',
  noticeBg: '#FFF8EC',
  noticeBorder: '#FCE7C8',
  noticeText: '#9B752F',

  white: '#FFFFFF',
  overlay: 'rgba(17, 42, 68, 0.45)',
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};

export const radius = { sm: 10, md: 12, lg: 15, xl: 19, xxl: 26, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

/** Horizontal page padding used by every screen. */
export const PAD_X = 22;

function shadow(y: number, blur: number, opacity: number, color = '#142C40'): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${y}px ${blur}px rgba(20,44,64,${opacity})` } as ViewStyle,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation: Math.max(1, Math.round(y / 2)),
    },
  })!;
}

export const shadows = {
  card: shadow(5, 22, 0.07),
  raised: shadow(10, 34, 0.1),
  button: shadow(10, 20, 0.18, '#0878C9'),
  toast: shadow(12, 22, 0.3),
};

export const type = {
  eyebrow: {
    fontFamily: fonts.extrabold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  headline: {
    fontFamily: fonts.extrabold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.85,
    color: colors.ink,
  },
  subhead: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: '#8896A5' },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: -0.3, color: colors.ink },
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 17, letterSpacing: -0.4, color: colors.ink },
  label: {
    fontFamily: fonts.extrabold,
    fontSize: 10.5,
    letterSpacing: 0.75,
    textTransform: 'uppercase',
    color: '#8E9BAB',
  },
  body: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  bodyBold: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.ink },
  small: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  tiny: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted },
} satisfies Record<string, TextStyle>;
