import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { BookingStatus, ServiceArea } from '@/data/types';
import { AREA_COORDS, bearing, driverPosition, routePath, SERVICE_REGION, type LatLng } from '@/lib/geo';
import { SERVICE_AREAS } from '@/lib/fare';
import { colors, fonts, shadows } from '@/theme';

import { Icon } from './Icon';

export type LiveMapProps = {
  height?: number;
  pickup?: ServiceArea;
  destination?: ServiceArea;
  /** Shows the driver's car, positioned for this ride status. */
  status?: BookingStatus;
  /** Shows the four service areas as tappable dots. */
  showAreas?: boolean;
  onAreaPress?: (area: ServiceArea) => void;
  /** Adds a button that centres the map on the user's location. */
  locate?: boolean;
  label?: string;
  footer?: React.ReactNode;
};

const MOVING: BookingStatus[] = ['enroute', 'inprogress'];
const EDGE = { top: 70, right: 50, bottom: 80, left: 50 };

export function LiveMap({ height = 220, pickup, destination, status, showAreas, onAreaPress, locate, label = 'Live map', footer }: LiveMapProps) {
  const map = useRef<MapView>(null);
  const [progress, setProgress] = useState(0);
  const [showMe, setShowMe] = useState(false);

  const from = pickup ? AREA_COORDS[pickup] : undefined;
  const to = destination && destination !== pickup ? AREA_COORDS[destination] : undefined;
  const path = useMemo(() => (from && to ? routePath(from, to) : []), [from, to]);

  // Simulated movement along the current leg until module 2 streams live GPS.
  const moving = !!status && MOVING.includes(status);
  useEffect(() => {
    setProgress(0);
    if (!moving) return;
    const t = setInterval(() => setProgress((p) => Math.min(p + 0.02, 1)), 1000);
    return () => clearInterval(t);
  }, [moving, status]);

  const car = status && from && to ? driverPosition(status, from, to, progress) : null;
  const carNext = status && from && to ? driverPosition(status, from, to, Math.min(progress + 0.05, 1)) : null;
  const heading = car && carNext && (car.latitude !== carNext.latitude || car.longitude !== carNext.longitude) ? bearing(car, carNext) : 0;

  const frame = () => {
    const points = [from, to, car].filter(Boolean) as LatLng[];
    if (points.length >= 2) map.current?.fitToCoordinates(points, { edgePadding: EDGE, animated: true });
    else if (points.length === 1) map.current?.animateToRegion({ ...points[0], latitudeDelta: 0.12, longitudeDelta: 0.12 }, 400);
    else map.current?.animateToRegion(SERVICE_REGION, 400);
  };

  useEffect(() => {
    const t = setTimeout(frame, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, status]);

  const findMe = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return;
    setShowMe(true);
    const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    map.current?.animateToRegion({ latitude: here.coords.latitude, longitude: here.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500);
  };

  return (
    <View style={[styles.box, { height }]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={SERVICE_REGION}
        onMapReady={frame}
        showsUserLocation={showMe}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {showAreas
          ? SERVICE_AREAS.filter((a) => a !== pickup && a !== destination).map((a) => (
              <Marker key={a} coordinate={AREA_COORDS[a]} title={a} anchor={{ x: 0.5, y: 0.5 }} onPress={() => onAreaPress?.(a)} tracksViewChanges={false}>
                <View style={styles.areaDot} />
              </Marker>
            ))
          : null}

        {path.length ? (
          <>
            <Polyline coordinates={path} strokeColor={colors.white} strokeWidth={9} lineCap="round" />
            <Polyline coordinates={path} strokeColor={colors.primary} strokeWidth={5} lineCap="round" />
          </>
        ) : null}

        {from ? (
          <Marker coordinate={from} title={`Pickup · ${pickup}`} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.pickupRing}>
              <View style={styles.pickupDot} />
            </View>
          </Marker>
        ) : null}

        {to ? <Marker coordinate={to} title={`Drop-off · ${destination}`} pinColor={colors.danger} /> : null}

        {car ? (
          <Marker coordinate={car} title="Robert · BVR Rideshare" anchor={{ x: 0.5, y: 0.5 }} flat rotation={heading}>
            <View style={styles.car}>
              {/* The navigation glyph points north-east; turn it to face north before the marker rotation. */}
              <View style={{ transform: [{ rotate: '-45deg' }] }}>
                <Icon name="navigation" size={15} color={colors.white} strokeWidth={2.4} />
              </View>
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.topRow} pointerEvents="box-none">
        <View style={[styles.chip, shadows.card]} pointerEvents="none">
          <Icon name="route" size={14} color="#466274" />
          <Text style={styles.chipText}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {locate ? (
            <Pressable accessibilityLabel="Show my location" onPress={findMe} style={[styles.roundBtn, shadows.card]}>
              <Icon name="compass" size={17} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable accessibilityLabel="Recentre map" onPress={frame} style={[styles.roundBtn, shadows.card]}>
            <Icon name="refresh" size={16} color="#466274" />
          </Pressable>
        </View>
      </View>
      {footer ? (
        <View style={[styles.footer, shadows.card]} pointerEvents="none">
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const mapStyles = StyleSheet.create({
  box: { borderRadius: 19, overflow: 'hidden', backgroundColor: '#edf3ec' },
  topRow: { position: 'absolute', top: 11, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10 },
  chipText: { fontFamily: fonts.extrabold, fontSize: 11, color: '#466274' },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
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

const styles = StyleSheet.create({
  ...mapStyles,
  areaDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#7FA7C6', borderWidth: 3, borderColor: colors.white },
  pickupRing: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pickupDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary },
  car: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
