import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useStore } from '@/state/AppStore';
import { colors, fonts } from '@/theme';

const SPLASH_MS = 1800;

/** Branded splash, then routes to the signed-in home for the last-used role, or sign in. */
export default function Splash() {
  const { activeRole, sessions } = useStore();
  const progress = useRef(new Animated.Value(0)).current;
  const owner = activeRole === 'driver';

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: SPLASH_MS, easing: Easing.linear, useNativeDriver: false }).start();
    const t = setTimeout(() => {
      if (sessions[activeRole]) router.replace(owner ? '/driver' : '/home');
      else router.replace({ pathname: '/sign-in', params: { role: activeRole } });
    }, SPLASH_MS);
    return () => clearTimeout(t);
    // Runs once on launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LinearGradient colors={colors.splashGradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Text style={styles.mark}>BVR / RIDESHARE</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{owner ? 'OWNER EXPERIENCE' : 'PASSENGER EXPERIENCE'}</Text>
          </View>
        </View>

        <View style={styles.center}>
          <View style={styles.logoRing}>
            <View style={styles.logoPanel}>
              <Image source={require('@/../assets/images/logo.png')} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            </View>
          </View>
          <Text style={styles.h1}>{owner ? 'Your business. In motion.' : 'Your journey starts here.'}</Text>
          <Text style={styles.p}>
            {owner
              ? 'Manage bookings, keep moving and stay in control of every ride.'
              : 'A more personal way to travel around Newcastle and beyond.'}
          </Text>
        </View>

        <Svg width="100%" height={64} viewBox="0 0 320 64" fill="none" style={{ opacity: 0.75 }}>
          <Path d="M12 50C61 50 61 13 107 13S163 51 214 51s58-35 92-35" stroke="white" strokeOpacity={0.46} strokeWidth={2.5} strokeDasharray="5 8" strokeLinecap="round" />
          <Circle cx="12" cy="50" r="7" fill="#fff" />
          <Circle cx="306" cy="16" r="7" fill="#78d0ff" stroke="white" strokeWidth={2} />
          <Circle cx="157" cy="33" r="13" fill="#ffffff" fillOpacity={0.2} stroke="#fff" strokeOpacity={0.55} />
        </Svg>

        <View>
          <Text style={styles.row}>{owner ? 'Setting up your workspace' : 'Preparing your ride experience'}</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.row}>NEWCASTLE · NSW</Text>
            <Text style={styles.row}>Made for your journey</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 28, paddingVertical: 18, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mark: { color: colors.white, fontFamily: fonts.black, fontSize: 12, letterSpacing: 2.2 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.11)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 11 },
  chipText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 1.1 },
  center: { alignItems: 'center' },
  logoRing: { padding: 10, borderRadius: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.33)' },
  logoPanel: { width: 190, height: 136, backgroundColor: colors.white, borderRadius: 28, padding: 16 },
  h1: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -0.9, marginTop: 34, textAlign: 'center' },
  p: { color: '#C7E2F9', fontFamily: fonts.medium, fontSize: 14, lineHeight: 22, maxWidth: 270, textAlign: 'center', marginTop: 10 },
  track: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginVertical: 14 },
  bar: { height: '100%', backgroundColor: colors.white, borderRadius: 4 },
  row: { color: '#D7EAFF', fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
});
