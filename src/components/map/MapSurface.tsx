import { useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { MAP_HTML, type MapCommand, type MapEvent } from './mapHtml';

export type MapSurfaceHandle = { send: (cmd: MapCommand) => void };

export function MapSurface({ ref, onEvent, style }: { ref: React.Ref<MapSurfaceHandle>; onEvent: (e: MapEvent) => void; style?: StyleProp<ViewStyle> }) {
  const web = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({
    send: (cmd) => web.current?.injectJavaScript(`window.__bvr && window.__bvr({ data: ${JSON.stringify(JSON.stringify(cmd))} }); true;`),
  }));
  return (
    <WebView
      ref={web}
      style={[{ backgroundColor: '#eef2ee' }, style]}
      originWhitelist={['*']}
      source={{ html: MAP_HTML, baseUrl: 'https://bvr-rideshare.local/' }}
      onMessage={(e) => {
        try {
          onEvent(JSON.parse(e.nativeEvent.data) as MapEvent);
        } catch {}
      }}
      scrollEnabled={false}
      nestedScrollEnabled
      overScrollMode="never"
      bounces={false}
      setSupportMultipleWindows={false}
      javaScriptEnabled
    />
  );
}
