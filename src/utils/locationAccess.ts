// Asking for the device's location, with the explanation that has to come
// first.
//
// Every screen used to call requestForegroundPermissionsAsync() directly. That
// puts the operating system's permission dialog on screen with no context: the
// person is asked to hand over their location a second after opening a screen,
// having been told nothing about why. People decline prompts they do not
// understand, and on both platforms a decline is close to permanent -- iOS will
// not ask twice, and Android stops asking after the second refusal. The one
// chance to ask is worth spending an explanation on.
//
// It also failed silently. If the permission was refused, or the handset's
// location switch was simply off, the screen carried on with no position and no
// word about it, so the distances quietly disappeared and nothing said why.
//
// Both platforms are handled here rather than at each call site:
//   - the explanation and the Settings escape hatch use Alert and
//     Linking.openSettings, which behave the same on iOS and Android;
//   - turning the location switch back on differs, so it is branched: Android
//     can raise the system dialog in place, iOS can only be sent to Settings.

import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

export type LocationOutcome =
  | { ok: true; coords: Coords }
  | { ok: false; reason: 'declined' | 'denied' | 'disabled' | 'unavailable' };

/** What the person is told this screen wants their location for. */
export type Purpose =
  | 'nearby'      // ordering boarding houses by distance
  | 'directions'  // drawing a walking route
  | 'compare'     // distances in the comparison
  | 'pin';        // pinning a listing being added

const EXPLANATION: Record<Purpose, { title: string; message: string }> = {
  nearby: {
    title: 'Show boarding houses near you',
    message:
      'BoardEase uses your location to sort boarding houses by how far they are '
      + 'from you and to score them for distance.\n\n'
      + 'Your location stays on this device. It is never saved to your account '
      + 'or shared with anyone.',
  },
  directions: {
    title: 'Walking directions need your location',
    message:
      'BoardEase uses your location to draw the walking route from where you are '
      + 'to the boarding house, and to follow you along it.\n\n'
      + 'Your location stays on this device.',
  },
  compare: {
    title: 'Compare by distance',
    message:
      'BoardEase uses your location to show how far each listing in the '
      + 'comparison is from you.\n\nYour location stays on this device.',
  },
  pin: {
    title: 'Pin this listing to where you are',
    message:
      'BoardEase can use your current position as the coordinates of the '
      + 'listing you are adding, so you do not have to type them.',
  },
};

/** Alert.alert, awaited, so the flow can wait on the answer. */
function ask(
  title: string,
  message: string,
  confirmLabel: string
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Make sure the application may read the location, explaining why before the
 * system is allowed to ask. Returns false if the person said no at any step.
 */
export async function ensureLocationPermission(purpose: Purpose): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;

  const copy = EXPLANATION[purpose];

  // Already refused, and the system will not ask again. The only way back is
  // the Settings app, so offer to open it rather than pretending to re-ask.
  if (!existing.canAskAgain) {
    const toSettings = await ask(
      'Location is turned off for BoardEase',
      copy.message
        + '\n\nPermission was declined earlier, so it has to be turned back on in '
        + 'Settings.',
      'Open Settings'
    );
    if (toSettings) await Linking.openSettings();
    return false;
  }

  // The explanation, before the system dialog rather than after it.
  const proceed = await ask(copy.title, copy.message, 'Continue');
  if (!proceed) return false;

  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.granted;
}

/**
 * Make sure the handset's location switch is on. Android can raise the system
 * dialog without leaving the application; iOS has no equivalent, so the person
 * is sent to Settings.
 */
export async function ensureLocationServices(): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;

  if (Platform.OS === 'android') {
    const turnOn = await ask(
      'Turn on location',
      'Location is switched off on this phone, so BoardEase cannot tell how far '
      + 'away each boarding house is.',
      'Turn on'
    );
    if (!turnOn) return false;
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      return false; // the person dismissed the system dialog
    }
    return Location.hasServicesEnabledAsync();
  }

  const toSettings = await ask(
    'Turn on Location Services',
    'Location Services are switched off, so BoardEase cannot tell how far away '
    + 'each boarding house is.\n\nTurn them on in Settings › Privacy & Security › '
    + 'Location Services.',
    'Open Settings'
  );
  if (toSettings) await Linking.openSettings();
  return false;
}

/**
 * The whole sequence: explain, ask, check the switch, then read the position.
 * Every screen that wants a position goes through this.
 */
export async function requestLocation(purpose: Purpose): Promise<LocationOutcome> {
  const permitted = await ensureLocationPermission(purpose);
  if (!permitted) {
    const after = await Location.getForegroundPermissionsAsync();
    return { ok: false, reason: after.canAskAgain ? 'declined' : 'denied' };
  }

  if (!(await ensureLocationServices())) return { ok: false, reason: 'disabled' };

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      coords: { lat: position.coords.latitude, lng: position.coords.longitude },
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** One line a screen can show when there is no position, saying which case it is. */
export function describeLocationOutcome(
  reason: Exclude<LocationOutcome, { ok: true }>['reason']
): string {
  switch (reason) {
    case 'declined':
      return 'Distances are hidden because location was not allowed. Tap to try again.';
    case 'denied':
      return 'Location is turned off for BoardEase. Turn it on in Settings to see distances.';
    case 'disabled':
      return 'Location is switched off on this phone, so distances are hidden.';
    default:
      return 'Your position could not be read, so distances are hidden.';
  }
}
