// Why does a map need a WebView??
//
// Leaflet is a JavaScript library made for websites (it draws maps using
// HTML/CSS/JS in a browser). React Native does not have a browser -- it
// draws real native UI components instead. So there is no direct way to
// run Leaflet's code in a normal React Native screen.
//
// The trick: react-native-webview gives us a tiny embedded web browser
// inside our app. We load a small HTML page (written below, as a plain
// string) into that mini-browser, and that HTML page runs Leaflet exactly
// like it would on a website, using free OpenStreetMap map tiles.
//
// The two worlds talk to each other by passing notes:
//   - React Native -> WebView: injectJavaScript(), which runs a line of
//     JavaScript inside the mini-browser (we call updateMap there)
//   - WebView -> React Native: window.ReactNativeWebView.postMessage(),
//     which we read in the onMessage handler below

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { Palette } from '../theme';
import { Text } from './ui';

// One pin on the map.
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  // When set, the marker is drawn as a price card instead of a dot -- e.g.
  // "₱2,500". The Map screen passes it; the Navigation screen does not,
  // because there is only one destination there.
  price?: string;
}

// One step of walking/driving directions, e.g. "Turn right onto Main St".
export interface RouteStep {
  instruction: string;
  distanceMeters: number;
}

interface LeafletMapProps {
  markers: MapMarker[];
  // The user's own GPS position, shown as a blue dot (optional).
  userLocation?: { lat: number; lng: number } | null;
  // A list of [lat, lng] points to draw as the route line. The Navigation
  // screen fills this with the real road-following route from OSRM.
  routeLine?: [number, number][] | null;
  // Called with the marker's id when the user taps a pin.
  onMarkerPress?: (id: string) => void;
  // The marker currently highlighted, kept in step with the card carousel on
  // the Map screen.
  selectedId?: string | null;
  // How much of the bottom of the map is covered by floating UI, so the
  // initial fit leaves those markers visible.
  bottomInset?: number;
}

// The starting map position, used before we know the user's real location.
// This is Tagum City, Philippines -- where this app is meant to be used.
const DEFAULT_CENTER = { lat: 7.4478, lng: 125.8078 };

// This is the full HTML page that will run inside the WebView.
// It is plain HTML + JavaScript (not React), because it runs inside the
// mini-browser, completely separately from our React Native code.
//
// The page is built per theme rather than being one fixed string. A map is a
// big bright rectangle, and leaving it on light tiles while the rest of the
// app is dark is the single most jarring thing dark mode can do -- so the
// tile layer, the page background and the pin colours all swap with it.
function buildLeafletHtml(isDark: boolean, palette: Palette) {
  // Plain OpenStreetMap tiles, which are genuinely free and need no key.
  //
  // Do NOT switch this to CARTO's basemaps.cartocdn.com. Those now require an
  // API key, and the way they refuse is nasty: the request still returns
  // HTTP 200 with a valid PNG, but the image itself has "API KEY REQUIRED"
  // printed across it. A status-code check passes and the map looks broken
  // only on a real device.
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Every colour below comes from the live palette. They used to be hand-typed
  // copies, which silently kept pointing at an older palette after it changed
  // -- the map chrome no longer matched the app and nothing flagged it.
  const pageBackground = palette.canvas;
  const pinColor = palette.brand;
  const pinRing = palette.canvas;
  const surface = palette.surface;
  const ink = palette.ink;
  const inkSoft = palette.inkSoft;
  const line = palette.line;
  const onBrand = palette.onBrand;
  const scrimRgba = isDark ? 'rgba(13,18,20,0.85)' : 'rgba(255,255,255,0.85)';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: ${pageBackground}; }
      /* OpenStreetMap has no dark tile set, and every free dark basemap
         (CARTO, Stadia, Mapbox) now wants an API key. So dark mode is done by
         inverting the tiles in CSS instead: invert() flips light to dark, and
         hue-rotate(180deg) puts the hues back the right way round so water
         stays blue rather than turning orange.
         Costs nothing, needs no key, and no extra request.
         It is scoped to the TILE pane only -- our own markers and route line
         are drawn in other panes and must not be inverted. */
      ${isDark
        ? `.leaflet-tile-pane {
             filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);
           }`
        : ''}
      /* Our own pin, drawn with CSS instead of an image file. Leaflet's
         built-in pin uses .png files that don't load reliably inside a
         WebView, which is why we draw our own. */
      .boardease-pin {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${pinColor};
        border: 3px solid ${pinRing};
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      }
      /* The price marker: a small card rather than a dot, so the map answers
         "how much?" without anything being tapped. This is the single biggest
         difference between a map that is decoration and a map that is a
         comparison tool. */
      /* The marker is a label with a POINTER TAIL, not a floating pill. The
         tail matters: without it a label hovering near a road does not say
         which exact spot it belongs to. The whole thing sits above its
         coordinate and the tail tip lands on it. */
      /* ONE solid object, not a pin sitting next to a label.
         The previous version drew three separate shapes in three colours and
         read as loose parts scattered over the map. This is a single filled
         capsule: brand fill, white text, a white ring to lift it off the map,
         and a tail in the same fill so the whole thing is one silhouette. */
      .be-price-wrap {
        transform: translate(-50%, -100%);
        transition: transform 140ms ease;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,${isDark ? '0.65' : '0.3'}));
        /* Everything inside is centred on the same axis so the label and its
           tail can never sit off to one side of each other. */
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .be-price {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        white-space: nowrap;
        /* Height is fixed rather than derived from padding, so every marker is
           exactly the same height whatever its price string. */
        height: 28px;
        padding: 0 11px;
        border-radius: 999px;
        font-family: -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        line-height: 28px;
        background: ${pinColor};
        color: ${onBrand};
        border: 2px solid ${surface};
        box-sizing: border-box;
      }
      /* The tail. Overlaps the capsule by 1px so there is never a hairline
         gap between them at any pixel ratio. */
      .be-tail {
        width: 0; height: 0;
        margin-top: -2px;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${surface};
      }
      /* The location dot: a plain filled circle. A rotated teardrop looked
         lopsided next to upright text, which is what made the old marker read
         as uneven. */
      .be-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${onBrand};
        flex: none;
      }
      /* Selected inverts the fill AND grows. A colour change on its own is too
         quiet to pick out on a busy map. */
      .be-price-wrap.be-selected { transform: translate(-50%, -100%) scale(1.14); z-index: 1000; }
      .be-price-wrap.be-selected .be-price {
        background: ${surface};
        color: ${pinColor};
        border-color: ${pinColor};
      }
      .be-price-wrap.be-selected .be-tail { border-top-color: ${pinColor}; }
      .be-price-wrap.be-selected .be-dot { background: ${pinColor}; }
      /* Leaflet's popups and attribution bar are white boxes by default,
         which is a flashlight in the corner of a dark map. */
      .leaflet-popup-content-wrapper, .leaflet-popup-tip {
        background: ${surface};
        color: ${ink};
      }
      .leaflet-control-attribution {
        background: ${scrimRgba} !important;
        color: ${inkSoft} !important;
      }
      .leaflet-control-attribution a { color: ${pinColor} !important; }
      .leaflet-control-zoom a {
        background: ${surface} !important;
        color: ${ink} !important;
        border-color: ${line} !important;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      // Sends a message back to the React Native side.
      function sendToReactNative(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      // Marker labels are built by string concatenation, so anything coming
      // from a listing has to be escaped before it goes in. A property titled
      // with a stray angle bracket would otherwise break the marker, and a
      // deliberately crafted one could inject script into this page.
      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // If anything at all goes wrong in here, tell React Native so it can
      // show a real error message instead of a blank white screen.
      window.onerror = function (message) {
        sendToReactNative({ type: 'error', message: String(message) });
        return true;
      };

      var map = null;
      var currentMarkers = [];
      var currentUserMarker = null;
      var currentRouteLine = null;

      // Removes everything we previously drew, so we can redraw fresh.
      function clearMap() {
        currentMarkers.forEach(function (marker) { map.removeLayer(marker); });
        currentMarkers = [];
        if (currentUserMarker) {
          map.removeLayer(currentUserMarker);
          currentUserMarker = null;
        }
        if (currentRouteLine) {
          map.removeLayer(currentRouteLine);
          currentRouteLine = null;
        }
      }

      // Draws everything described by the data sent from React Native.
      function updateMap(data) {
        if (!map) return;
        clearMap();

        // Lift Leaflet's attribution above whatever floats over the bottom of
        // the map (the card carousel on the Map screen). Left where it is, the
        // "OpenStreetMap contributors" line prints straight through the card.
        var attribution = document.querySelector('.leaflet-control-attribution');
        if (attribution) {
          attribution.style.marginBottom = (data.bottomInset || 0) + 'px';
        }

        var boundsPoints = [];

        // Draw one marker per property. When a price is supplied we draw the
        // price card; otherwise we fall back to the plain dot, which is what
        // the Navigation screen wants (there is only one destination there,
        // and its price is already on the screen above).
        data.markers.forEach(function (item) {
          var isSelected = data.selectedId && data.selectedId === item.id;
          var icon;

          if (item.price) {
            icon = L.divIcon({
              className: '',
              html:
                '<div class="be-price-wrap' + (isSelected ? ' be-selected' : '') + '">' +
                  '<div class="be-price">' +
                    '<span class="be-dot"></span>' +
                    escapeHtml(item.price) +
                  '</div>' +
                  '<div class="be-tail"></div>' +
                '</div>',
              // Sized at zero so our own CSS transform does the positioning.
              // Leaflet's iconSize cannot know how wide a price string is.
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
          } else {
            icon = L.divIcon({
              className: '',
              html: '<div class="boardease-pin"></div>',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
          }

          var marker = L.marker([item.lat, item.lng], {
            icon: icon,
            zIndexOffset: isSelected ? 1000 : 0,
          }).addTo(map);

          marker.on('click', function () {
            sendToReactNative({ type: 'markerPress', id: item.id });
          });
          currentMarkers.push(marker);
          boundsPoints.push([item.lat, item.lng]);
        });

        // Draw the user's own position as a distinct green dot.
        if (data.userLocation) {
          currentUserMarker = L.circleMarker(
            [data.userLocation.lat, data.userLocation.lng],
            { radius: 8, color: '#ffffff', weight: 3, fillColor: '#10b981', fillOpacity: 1 }
          ).addTo(map);
          currentUserMarker.bindPopup('You are here');
          boundsPoints.push([data.userLocation.lat, data.userLocation.lng]);
        }

        // Draw the route line (the real road-following path from OSRM).
        if (data.routeLine && data.routeLine.length > 0) {
          currentRouteLine = L.polyline(data.routeLine, {
            color: '#0284c7',
            weight: 5,
            opacity: 0.85,
          }).addTo(map);
          data.routeLine.forEach(function (point) { boundsPoints.push(point); });
        }

        // Zoom/pan the map so everything we just drew is visible.
        if (boundsPoints.length === 1) {
          map.setView(boundsPoints[0], 16);
        } else if (boundsPoints.length > 1) {
          map.fitBounds(boundsPoints, {
            // Bottom padding clears the card carousel that floats over the
            // lower third of the Map screen, so a marker is never hidden
            // underneath the card describing it.
            paddingTopLeft: [40, 90],
            paddingBottomRight: [40, data.bottomInset || 40],
          });
        }
      }

      // Pans to one marker without changing the zoom. Used when the user
      // swipes the card carousel: refitting the bounds on every swipe would
      // make the map lurch around, so we glide to the new selection instead.
      window.focusOnPoint = function (lat, lng) {
        if (!map) return;
        map.panTo([lat, lng], { animate: true, duration: 0.35 });
      };

      // React Native calls this directly through injectJavaScript.
      window.updateMapFromReactNative = function (data) {
        updateMap(data);
      };

      // Start the map. If Leaflet failed to download, "L" won't exist, so
      // we report that clearly instead of failing silently.
      if (typeof L === 'undefined') {
        sendToReactNative({
          type: 'error',
          message: 'Could not load the map library. Check your internet connection.',
        });
      } else {
        map = L.map('map', { zoomControl: false }).setView([${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lng}], 14);
        map.attributionControl.setPrefix(false);
        var tiles = L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        tiles.on('tileerror', function () {
          sendToReactNative({ type: 'tileError' });
        });
        // Only the FIRST successful tile is reported. Firing on every tile
        // sent dozens of bridge messages per pan or zoom, and paired with
        // tileerror it made the offline banner flicker on and off as tiles
        // arrived out of order.
        var reportedFirstTile = false;
        tiles.on('tileload', function () {
          if (!reportedFirstTile) {
            reportedFirstTile = true;
            sendToReactNative({ type: 'tileLoaded' });
          }
        });

        // Tell React Native we're ready to receive markers. We wait for
        // this instead of guessing, so markers are never sent too early.
        sendToReactNative({ type: 'ready' });
      }
    </script>
  </body>
</html>
`;
}

export default function LeafletMap({
  markers,
  userLocation,
  routeLine,
  onMarkerPress,
  selectedId = null,
  bottomInset = 40,
}: LeafletMapProps) {
  const webViewRef = useRef<WebView>(null);
  const t = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tileError, setTileError] = useState(false);

  // The page is rebuilt only when the theme flips, not on every render --
  // it is a few kilobytes of string.
  const html = useMemo(
    () => buildLeafletHtml(t.isDark, t.colors),
    [t.isDark, t.colors]
  );

  // Flipping the theme remounts the WebView (see the key on it below), which
  // means the new page has not reported "ready" yet. Without this reset we
  // would go on believing the old, destroyed page was still listening and the
  // markers would never be redrawn.
  const lastSentRef = useRef('');
  useEffect(() => {
    setIsReady(false);
    setErrorMessage('');
    setTileError(false);
    lastSentRef.current = '';
  }, [t.isDark]);

  // Builds the one line of JavaScript we run inside the mini-browser to
  // redraw the map. The trailing "true;" is required by react-native-webview.
  function buildUpdateScript() {
    const payload = {
      markers,
      userLocation: userLocation || null,
      routeLine: routeLine || null,
      selectedId,
      bottomInset,
    };
    return `window.updateMapFromReactNative(${JSON.stringify(payload)}); true;`;
  }

  // Redraw whenever the data changes, but only once the map has told us
  // it's ready. We compare the data as text so this doesn't re-run on
  // every single render just because the array is a new object.
  const dataKey = JSON.stringify({ markers, userLocation, routeLine, selectedId, bottomInset });
  useEffect(() => {
    if (isReady && dataKey !== lastSentRef.current) {
      lastSentRef.current = dataKey;
      webViewRef.current?.injectJavaScript(`window.updateMapFromReactNative(${dataKey}); true;`);
    }
  }, [isReady, dataKey]);

  // Panning is separate from redrawing. When only the selection changes we
  // glide to it rather than refitting the whole view, which would make the
  // map jump on every swipe of the carousel.
  const lastFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isReady || !selectedId || selectedId === lastFocusRef.current) {
      return;
    }
    const target = markers.find((marker) => marker.id === selectedId);
    if (target) {
      lastFocusRef.current = selectedId;
      webViewRef.current?.injectJavaScript(
        `window.focusOnPoint(${target.lat}, ${target.lng}); true;`
      );
    }
  }, [isReady, selectedId, markers]);

  // Called whenever the HTML page sends a message back to us.
  function handleWebViewMessage(event: WebViewMessageEvent) {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === 'ready') {
      setIsReady(true);
      // Draw the current data immediately now that the map exists.
      webViewRef.current?.injectJavaScript(buildUpdateScript());
      lastSentRef.current = dataKey;
    } else if (message.type === 'error') {
      setErrorMessage(message.message);
    } else if (message.type === 'tileError') {
      setTileError(true);
    } else if (message.type === 'tileLoaded') {
      setTileError(false);
    } else if (message.type === 'markerPress' && onMarkerPress) {
      onMarkerPress(message.id);
    }
  }

  const overlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.canvas,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: t.spacing.lg,
    gap: t.spacing.sm,
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <WebView
        // Keyed by theme: the page's tiles and CSS are baked into the HTML
        // string, so switching light/dark has to reload it. Without the key
        // the map would keep its old tiles until the screen was revisited.
        key={t.isDark ? 'dark' : 'light'}
        ref={webViewRef}
        originWhitelist={['*']}
        applicationNameForUserAgent="BoardEase/1.0"
        // baseUrl matters: without it, Android treats the page as having no
        // origin and blocks loading Leaflet and the map tiles from the web.
        source={{ html, baseUrl: 'https://unpkg.com' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={handleWebViewMessage}
        onError={() => setErrorMessage('The map failed to load.')}
        style={{ flex: 1, backgroundColor: t.colors.canvas }}
      />

      {tileError && <View style={{ position: 'absolute', top: 100, left: 16, right: 16, padding: 12, backgroundColor: t.colors.surface }}>
        <Text variant="caption" tone="danger">Some map tiles could not load. Check your connection.</Text>
      </View>}

      {!isReady && errorMessage === '' && (
        <View style={overlayStyle}>
          <ActivityIndicator size="large" color={t.colors.brand} />
          <Text variant="caption" tone="faint">
            Loading map…
          </Text>
        </View>
      )}

      {errorMessage !== '' && (
        <View style={overlayStyle}>
          <Text variant="body" tone="danger" center>
            {errorMessage}
          </Text>
          <Text variant="caption" tone="faint" center>
            Map tiles need an internet connection.
          </Text>
        </View>
      )}
    </View>
  );
}
