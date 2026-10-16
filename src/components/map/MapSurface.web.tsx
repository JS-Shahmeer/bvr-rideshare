import { createElement, useEffect, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { MAP_HTML, type MapCommand, type MapEvent } from './mapHtml';

export type MapSurfaceHandle = { send: (cmd: MapCommand) => void };

/** Browser build: the same Leaflet page in an iframe, talking over postMessage. */
export function MapSurface({ ref, onEvent }: { ref: React.Ref<MapSurfaceHandle>; onEvent: (e: MapEvent) => void; style?: StyleProp<ViewStyle> }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useImperativeHandle(ref, () => ({ send: (cmd) => frame.current?.contentWindow?.postMessage(JSON.stringify(cmd), '*') }));

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        handler.current(JSON.parse(e.data) as MapEvent);
      } catch {}
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return createElement('iframe', { ref: frame, srcDoc: MAP_HTML, title: 'Map', style: { border: 0, width: '100%', height: '100%', display: 'block' } });
}
