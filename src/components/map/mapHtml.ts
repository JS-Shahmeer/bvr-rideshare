import { SERVICE_REGION } from '@/lib/geo';
import { colors } from '@/theme';

import { LEAFLET_CSS, LEAFLET_JS } from './leaflet';

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
 * (web). Tiles come from OpenStreetMap (Esri as a fallback), so no API key is
 * needed while the app is in development; module 2 can swap in a keyed provider.
 */
export const MAP_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>${LEAFLET_CSS}
html,body,#map{margin:0;height:100%;width:100%;background:#eef2ee}
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
  var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([${SERVICE_REGION.latitude},${SERVICE_REGION.longitude}],10);
  map.attributionControl.setPrefix(false);
  // OpenStreetMap's own tiles need no key. If they fail to load (blocked or
  // offline), fall back to Esri's keyless street basemap.
  var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  var failures=0;
  tiles.on('tileerror',function(){
    if(++failures!==3) return;
    map.removeLayer(tiles);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}).addTo(map);
  });
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
    if(p.length>1) map.fitBounds(p,{paddingTopLeft:[40,64],paddingBottomRight:[40,72],maxZoom:14});
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
