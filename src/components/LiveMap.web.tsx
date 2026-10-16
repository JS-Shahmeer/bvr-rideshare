import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AREA_COORDS, SERVICE_REGION } from '@/lib/geo';
import { colors, fonts, shadows } from '@/theme';

import { Icon } from './Icon';
import type { LiveMapProps } from './LiveMap';

/**
 * Web preview: react-native-maps is native only, so the browser build embeds
 * an OpenStreetMap view of the same area with the drop-off (or pickup) pinned.
 */
export function LiveMap({ height = 220, pickup, destination, label = 'Live map', footer }: LiveMapProps) {
  const points = [pickup, destination].filter(Boolean).map((a) => AREA_COORDS[a!]);
  const lats = points.length ? points.map((p) => p.latitude) : [SERVICE_REGION.latitude - 0.2, SERVICE_REGION.latitude + 0.2];
  const lngs = points.length ? points.map((p) => p.longitude) : [SERVICE_REGION.longitude - 0.35, SERVICE_REGION.longitude + 0.35];
  const pad = 0.06;
  const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad].join(',');
  const pin = points.at(-1);
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${pin ? `&marker=${pin.latitude},${pin.longitude}` : ''}`;

  return (
    <View style={[styles.box, { height }]}>
      {createElement('iframe', { src, title: 'Map', style: { border: 0, width: '100%', height: '100%' }, loading: 'lazy' })}
      <View style={styles.topRow} pointerEvents="none">
        <View style={[styles.chip, shadows.card]}>
          <Icon name="route" size={14} color="#466274" />
          <Text style={styles.chipText}>{label}</Text>
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
  box: { borderRadius: 19, overflow: 'hidden', backgroundColor: '#edf3ec' },
  topRow: { position: 'absolute', top: 11, left: 12, right: 12, flexDirection: 'row' },
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
