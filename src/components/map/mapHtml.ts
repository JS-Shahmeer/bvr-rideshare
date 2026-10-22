import { SERVICE_REGION } from '@/lib/geo';
import { colors } from '@/theme';

import { BASEMAP } from './basemap';
import { LEAFLET_CSS, LEAFLET_JS } from './leaflet';

/** Optional raster tiles (e.g. a MapTiler or Mapbox URL with its key). Unset = offline basemap only. */
const TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL ?? '';

/** Extra place names drawn on the offline basemap: [name, lat, lng, kind]. */
const PLACES: [string, number, number, 'town' | 'water'][] = [
  ['Raymond Terrace', -32.761, 151.744, 'town'],
  ['Williamtown', -32.8, 151.84, 'town'],
  ['Kurri Kurri', -32.819, 151.479, 'town'],
  ['Cessnock', -32.834, 151.356, 'town'],
  ['Stockton', -32.909, 151.785, 'town'],
  ['Anna Bay', -32.779, 152.085, 'town'],
  ['Tea Gardens', -32.664, 152.157, 'town'],
  ['Port Stephens', -32.705, 152.02, 'water'],
  ['Tasman Sea', -32.98, 152.2, 'water'],
  ['Lake Macquarie', -33.07, 151.6, 'water'],
];

/** Everything the page draws. Sent in from React whenever it changes. */
export type MapState = {
  areas: { name: string; latitude: number; longitude: number }[];
  pickup?: { name: string; latitude: number; longitude: number };
  destination?: { name: string; latitude: number; longitude: number };
  route: [number, number][];
  car?: { latitude: number; longitude: number; heading: number };
  me?: { latitude: number; longitude: number };
};

export type MapCommand = { type: 'apply'; state: MapState; fit: boolean } | { type: 'frame' } | { type: 'focus' };
export type MapEvent = { type: 'ready' } | { type: 'area'; name: string };

/**
 * Self-contained Leaflet page rendered by a WebView (native) or an iframe
 * (web). It draws an offline basemap of the service region, so it works with no
 * tile server or API key. Set EXPO_PUBLIC_MAP_TILE_URL to layer street tiles on top.
 */
export const MAP_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>${LEAFLET_CSS}
html,body,#map{margin:0;height:100%;width:100%;background:#B5DCEE}
.leaflet-container{background:#B5DCEE}
.place{font:600 10px -apple-system,Roboto,sans-serif;color:#7C8A93;text-align:center;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff}
.place-water{font-style:italic;color:#4E8FB4;text-shadow:none;letter-spacing:.4px}
.leaflet-control-attribution{font:9px/1.3 -apple-system,Roboto,sans-serif;background:rgba(255,255,255,.75)!important}
.car{width:32px;height:32px;border-radius:16px;background:${colors.ink};border:3px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(23,44,66,.35)}
.pin{width:28px;height:36px}
.area{width:14px;height:14px;border-radius:7px;background:#7FA7C6;border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.area-label{font:700 11px -apple-system,Roboto,sans-serif;color:#466274;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff}
</style></head>
<body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
(function(){
  var BLUE='${colors.primary}', RED='${colors.danger}';
  var map=L.map('map',{zoomControl:false,attributionControl:true,minZoom:9,maxZoom:14,maxBounds:[[-33.4,150.9],[-32.1,152.8]],maxBoundsViscosity:0.8}).setView([${SERVICE_REGION.latitude},${SERVICE_REGION.longitude}],10);
  map.attributionControl.setPrefix(false);
  // Offline basemap: always drawn, needs no network or key.
  var B=${JSON.stringify(BASEMAP)}, P=${JSON.stringify(PLACES)};
  var base=L.layerGroup().addTo(map);
  L.polygon(B.land,{stroke:false,fillColor:'#EEF2EA',fillOpacity:1,interactive:false}).addTo(base);
  L.polygon(B.urban,{stroke:false,fillColor:'#E2E6DE',fillOpacity:1,interactive:false}).addTo(base);
  L.polyline(B.rivers,{color:'#A9D3E8',weight:3,opacity:1,interactive:false}).addTo(base);
  L.polyline(B.rail,{color:'#B9C1C7',weight:2,dashArray:'5 5',opacity:1,interactive:false}).addTo(base);
  L.polyline(B.roads,{color:'#E7C48E',weight:6,opacity:1,lineCap:'round',interactive:false}).addTo(base);
  L.polyline(B.roads,{color:'#FFF6E4',weight:3,opacity:1,lineCap:'round',interactive:false}).addTo(base);
  P.forEach(function(p){
    L.marker([p[1],p[2]],{interactive:false,icon:L.divIcon({className:'',iconSize:[120,14],iconAnchor:[60,7],html:'<div class="place place-'+p[3]+'">'+p[0]+'</div>'})}).addTo(base);
  });
  // Optional street tiles on top, when a tile URL (with its key) is configured.
  var TILE_URL=${JSON.stringify(TILE_URL)};
  if(TILE_URL){
    var tiles=L.tileLayer(TILE_URL,{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    var failures=0;
    tiles.on('tileerror',function(){ if(++failures===3) map.removeLayer(tiles); });
  } else {
    map.attributionControl.addAttribution('Natural Earth');
  }
  var layer=L.layerGroup().addTo(map), car=null, me=null, state=null;

  function send(msg){
    var s=JSON.stringify(msg);
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if(window.parent!==window) window.parent.postMessage(s,'*');
  }
  function icon(html,size,anchor){return L.divIcon({html:html,className:'',iconSize:size,iconAnchor:anchor});}
  var pinSvg='<svg class="pin" viewBox="0 0 28 36"><path d="M14 1C6.8 1 1 6.6 1 13.6 1 23 14 35 14 35s13-12 13-21.4C27 6.6 21.2 1 14 1Z" fill="'+RED+'" stroke="#fff" stroke-width="2.5"/><circle cx="14" cy="13.5" r="4.8" fill="#fff"/></svg>';
  var carSvg='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" style="transform:rotate(-45deg)"><path d="m3 11 19-9-9 19-2.3-8L3 11Z"/></svg>';

  function points(){
    if(!state) return [];
    var p=[];
    if(state.pickup) p.push([state.pickup.latitude,state.pickup.longitude]);
    if(state.destination) p.push([state.destination.latitude,state.destination.longitude]);
    if(state.car) p.push([state.car.latitude,state.car.longitude]);
    if(!p.length) state.areas.forEach(function(a){p.push([a.latitude,a.longitude]);});
    return p;
  }
  function frame(){
    var p=points();
    if(p.length>1) map.fitBounds(p,{paddingTopLeft:[40,64],paddingBottomRight:[40,72],maxZoom:12});
    else if(p.length===1) map.setView(p[0],12);
  }
  function apply(s,fit){
    state=s; layer.clearLayers();
    s.areas.forEach(function(a){
      L.marker([a.latitude,a.longitude],{icon:icon('<div class="area"></div>',[14,14],[7,7])}).on('click',function(){send({type:'area',name:a.name});}).addTo(layer);
      L.marker([a.latitude,a.longitude],{interactive:false,icon:icon('<div class="area-label">'+a.name+'</div>',[80,14],[-10,7])}).addTo(layer);
    });
    if(s.route.length){
      L.polyline(s.route,{color:'#fff',weight:9,opacity:1,lineCap:'round'}).addTo(layer);
      L.polyline(s.route,{color:BLUE,weight:5,opacity:1,lineCap:'round'}).addTo(layer);
    }
    if(s.pickup) L.circleMarker([s.pickup.latitude,s.pickup.longitude],{radius:8,color:'#fff',weight:4,fillColor:BLUE,fillOpacity:1}).bindTooltip('Pickup · '+s.pickup.name).addTo(layer);
    if(s.destination) L.marker([s.destination.latitude,s.destination.longitude],{icon:icon(pinSvg,[28,36],[14,35])}).bindTooltip('Drop-off · '+s.destination.name).addTo(layer);
    if(s.car){
      var html='<div class="car" style="transform:rotate('+s.car.heading+'deg)">'+carSvg+'</div>';
      if(!car) car=L.marker([s.car.latitude,s.car.longitude],{icon:icon(html,[32,32],[16,16]),zIndexOffset:1000}).addTo(map);
      else { car.setLatLng([s.car.latitude,s.car.longitude]); car.setIcon(icon(html,[32,32],[16,16])); }
    } else if(car){ map.removeLayer(car); car=null; }
    if(s.me){
      if(!me) me=L.circleMarker([s.me.latitude,s.me.longitude],{radius:7,color:'#fff',weight:3,fillColor:'#2D8CFF',fillOpacity:1}).addTo(map);
      else me.setLatLng([s.me.latitude,s.me.longitude]);
    }
    if(fit) frame();
  }
  function onMessage(e){
    try{
      var m=typeof e.data==='string'?JSON.parse(e.data):e.data;
      if(m.type==='apply') apply(m.state,m.fit);
      else if(m.type==='frame') frame();
      else if(m.type==='focus' && state && state.me) map.setView([state.me.latitude,state.me.longitude],13);
    }catch(err){}
  }
  window.addEventListener('message',onMessage);
  document.addEventListener('message',onMessage);
  window.__bvr=onMessage;
  send({type:'ready'});
})();
</script></body></html>`;
