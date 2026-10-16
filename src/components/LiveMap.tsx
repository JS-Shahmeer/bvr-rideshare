import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BookingStatus, ServiceArea } from '@/data/types';
import { SERVICE_AREAS } from '@/lib/fare';
import { AREA_COORDS, bearing, driverPosition, routePath, type LatLng } from '@/lib/geo';
import { colors, fonts, shadows } from '@/theme';

import { Icon } from './Icon';
import { MapSurface, type MapSurfaceHandle } from './map/MapSurface';
import type { MapEvent, MapState } from './map/mapHtml';

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

export function LiveMap({ height = 220, pickup, destination, status, showAreas, onAreaPress, locate, label = 'Live map', footer }: LiveMapProps) {
  const surface = useRef<MapSurfaceHandle>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [me, setMe] = useState<LatLng | undefined>();

  const from = pickup ? AREA_COORDS[pickup] : undefined;
  const to = destination && destination !== pickup ? AREA_COORDS[destination] : undefined;

  // Simulated movement along the current leg until module 2 streams live GPS.
  const moving = !!status && MOVING.includes(status);
  useEffect(() => {
    setProgress(0);
    if (!moving) return;
    const t = setInterval(() => setProgress((p) => Math.min(p + 0.02, 1)), 1000);
    return () => clearInterval(t);
  }, [moving, status]);

  const state = useMemo<MapState>(() => {
    const car = status && from && to ? driverPosition(status, from, to, progress) : null;
    const ahead = status && from && to ? driverPosition(status, from, to, Math.min(progress + 0.05, 1)) : null;
    const heading = car && ahead && (car.latitude !== ahead.latitude || car.longitude !== ahead.longitude) ? bearing(car, ahead) : 0;
    return {
      areas: showAreas ? SERVICE_AREAS.filter((a) => a !== pickup && a !== destination).map((name) => ({ name, ...AREA_COORDS[name] })) : [],
      pickup: from && pickup ? { name: pickup, ...from } : undefined,
      destination: to && destination ? { name: destination, ...to } : undefined,
      route: from && to ? routePath(from, to).map((p) => [p.latitude, p.longitude] as [number, number]) : [],
      car: car ? { ...car, heading } : undefined,
      me,
    };
  }, [showAreas, pickup, destination, from, to, status, progress, me]);

  // Re-frame when the trip itself changes, not on every tick of the car.
  const tripKey = `${pickup}|${destination}|${status}`;
  const framed = useRef('');
  useEffect(() => {
    if (!ready) return;
    const fit = framed.current !== tripKey;
    framed.current = tripKey;
    surface.current?.send({ type: 'apply', state, fit });
  }, [ready, state, tripKey]);

  const onEvent = (e: MapEvent) => {
    if (e.type === 'ready') {
      framed.current = '';
      setReady(true);
    } else if (e.type === 'area' && onAreaPress) onAreaPress(e.name as ServiceArea);
  };

  const findMe = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return;
    const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setMe({ latitude: here.coords.latitude, longitude: here.coords.longitude });
    setTimeout(() => surface.current?.send({ type: 'focus' }), 50);
  };

  return (
    <View style={[styles.box, { height }]}>
      <MapSurface ref={surface} onEvent={onEvent} style={StyleSheet.absoluteFill} />

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
          <Pressable accessibilityLabel="Recentre map" onPress={() => surface.current?.send({ type: 'frame' })} style={[styles.roundBtn, shadows.card]}>
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

const styles = StyleSheet.create({
  box: { borderRadius: 19, overflow: 'hidden', backgroundColor: '#eef2ee' },
  topRow: { position: 'absolute', top: 11, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10 },
  chipText: { fontFamily: fonts.extrabold, fontSize: 11, color: '#466274' },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    bottom: 26,
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
