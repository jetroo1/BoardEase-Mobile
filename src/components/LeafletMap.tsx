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

import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { colors, spacing } from '../theme';

// One pin on the map.
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
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
}

// The starting map position, used before we know the user's real location.
// This is Tagum City, Philippines -- where this app is meant to be used.
const DEFAULT_CENTER = { lat: 7.4478, lng: 125.8078 };

// This is the full HTML page that will run inside the WebView.
// It is plain HTML + JavaScript (not React), because it runs inside the
// mini-browser, completely separately from our React Native code.
const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      /* Our own pin, drawn with CSS instead of an image file. Leaflet's
         built-in pin uses .png files that don't load reliably inside a
         WebView, which is why we draw our own. */
      .boardease-pin {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #0ea5e9;
        border: 3px solid #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
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

        var boundsPoints = [];

        // Draw one pin per property, using our CSS pin (see the style above).
        data.markers.forEach(function (item) {
          var icon = L.divIcon({
            className: '',
            html: '<div class="boardease-pin"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          var marker = L.marker([item.lat, item.lng], { icon: icon }).addTo(map);
          marker.bindPopup(item.title);
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
          map.fitBounds(boundsPoints, { padding: [40, 40] });
        }
      }

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
        map = L.map('map').setView([${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lng}], 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Tell React Native we're ready to receive markers. We wait for
        // this instead of guessing, so markers are never sent too early.
        sendToReactNative({ type: 'ready' });
      }
    </script>
  </body>
</html>
`;

export default function LeafletMap({
  markers,
  userLocation,
  routeLine,
  onMarkerPress,
}: LeafletMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Builds the one line of JavaScript we run inside the mini-browser to
  // redraw the map. The trailing "true;" is required by react-native-webview.
  function buildUpdateScript() {
    const payload = {
      markers,
      userLocation: userLocation || null,
      routeLine: routeLine || null,
    };
    return `window.updateMapFromReactNative(${JSON.stringify(payload)}); true;`;
  }

  // Redraw whenever the data changes, but only once the map has told us
  // it's ready. We compare the data as text so this doesn't re-run on
  // every single render just because the array is a new object.
  const dataKey = JSON.stringify({ markers, userLocation, routeLine });
  const lastSentRef = useRef('');
  if (isReady && dataKey !== lastSentRef.current) {
    lastSentRef.current = dataKey;
    webViewRef.current?.injectJavaScript(buildUpdateScript());
  }

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
    } else if (message.type === 'markerPress' && onMarkerPress) {
      onMarkerPress(message.id);
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        // baseUrl matters: without it, Android treats the page as having no
        // origin and blocks loading Leaflet and the map tiles from the web.
        source={{ html: LEAFLET_HTML, baseUrl: 'https://unpkg.com' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={handleWebViewMessage}
        onError={() => setErrorMessage('The map failed to load.')}
        style={styles.webview}
      />

      {!isReady && errorMessage === '' && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.sky} />
          <Text style={styles.overlayText}>Loading map...</Text>
        </View>
      )}

      {errorMessage !== '' && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  // Covers the whole map area, used for the loading spinner / error text.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  overlayText: { color: colors.muted },
  errorText: { color: colors.danger, textAlign: 'center' },
});
