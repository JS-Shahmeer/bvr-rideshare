import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts, shadows } from '@/theme';

import { Icon } from './Icon';

/**
 * Illustrative service-area map from the prototype. Module 2 replaces this
 * with a live map (pickup, destination and driver position).
 */
export function MapIllustration({ height = 220, showCar = true, footer }: { height?: number; showCar?: boolean; footer?: React.ReactNode }) {
  return (
    <View style={[styles.box, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 380 270" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <Pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <Path d="M44 0H0V44" fill="none" stroke="#d9e8df" strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="380" height="270" fill="#edf3ec" />
        <Path d="M270-15C244 32 255 51 227 81c-38 42-27 63-10 88 28 40 54 44 48 118h140V-15Z" fill="#a9d9ec" />
        <Path d="M284 0c-24 49-9 51-37 84-35 42-38 53-20 85 31 47 55 64 41 101" fill="none" stroke="#f7faf6" strokeWidth={5} />
        <Path d="M-5 89c57-21 85 4 112-13 39-25 66-9 97-23C231 40 249 13 259-5" fill="none" stroke="#dbe9d3" strokeWidth={35} />
        <Path d="M-15 205c52-10 77-36 123-9 29 16 54 1 82-11" fill="none" stroke="#dcead5" strokeWidth={38} />
        <Rect width="380" height="270" fill="url(#grid)" opacity={0.46} />
        <G stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round">
          <Path d="M-30 38 59 82 99 141 155 200 259 268" />
          <Path d="M-20 218 64 201 106 140 186 109 268 33" />
          <Path d="M43-10 73 80 147 109 216 169 330 241" />
          <Path d="M-20 153 69 145 161 154 236 112 297 73" />
          <Path d="M140-20 157 52 188 109 213 173 228 278" />
        </G>
        <Path d="M83 218 C97 197 111 184 139 165 S188 139 198 103 S215 71 238 50" fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" />
        <Path d="M83 218 C97 197 111 184 139 165 S188 139 198 103 S215 71 238 50" fill="none" stroke={colors.primary} strokeWidth={6} strokeLinecap="round" />
        <Circle cx="83" cy="218" r="10" fill="white" />
        <Circle cx="83" cy="218" r="6" fill={colors.primary} />
        <Path d="M238 37c-12 0-21 9-21 21 0 15 21 34 21 34s21-19 21-34c0-12-9-21-21-21Z" fill="#e95d69" stroke="white" strokeWidth={3} />
        <Circle cx="238" cy="57" r="7" fill="#fff" />
        <G fill="#647f85" fontSize="10" fontWeight="700" fontFamily={fonts.bold}>
          <SvgText x="28" y="237">Newcastle</SvgText>
          <SvgText x="45" y="51">Maitland</SvgText>
          <SvgText x="149" y="62">Medowie</SvgText>
          <SvgText x="266" y="115">Nelson Bay</SvgText>
        </G>
        {showCar ? (
          <G transform="translate(154,154) rotate(-31)">
            <Rect x="-13" y="-23" width="26" height="47" rx="7" fill="#fff" stroke="#075fa9" strokeWidth={3} />
            <Rect x="-9" y="-10" width="18" height="18" rx="3" fill="#89bce0" />
            <Rect x="-9" y="11" width="18" height="5" rx="2" fill="#d1deeb" />
          </G>
        ) : null}
      </Svg>
      <View style={styles.topRow} pointerEvents="none">
        <View style={[styles.chip, shadows.card]}>
          <Icon name="route" size={14} color="#466274" />
          <Text style={styles.chipText}>Service map</Text>
        </View>
        <View style={[styles.chip, shadows.card]}>
          <Text style={styles.chipText}>NSW, Australia</Text>
        </View>
      </View>
      {footer ? <View style={[styles.footer, shadows.card]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 19, overflow: 'hidden', backgroundColor: '#edf3ec' },
  topRow: { position: 'absolute', top: 11, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10 },
  chipText: { fontFamily: fonts.extrabold, fontSize: 11, color: '#466274' },
  footer: {
    position: 'absolute',
    bottom: 11,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
