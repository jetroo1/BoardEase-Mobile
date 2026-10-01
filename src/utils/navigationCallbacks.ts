// Somewhere for a screen to leave a callback for the screen it is opening.
//
// Two screens here hand a result back to the one that opened them: Filter
// returns the chosen filters, and PickLocation returns a point on the map.
// Both used to do it by putting the function straight into the navigation
// params, which works, and which React Navigation warns about every single
// time:
//
//   Non-serializable values were found in the navigation state...
//
// In a release build that warning is invisible. In Expo Go it is a yellow
// toast across the bottom of the screen, and it appears the moment you open
// the filters -- during a demonstration, in front of whoever is watching.
//
// The warning is also right. A function cannot be written to disk, so a
// navigation state holding one cannot be saved and restored.
//
// So the function stays here, in ordinary module scope, and the params carry
// only the name of the slot it is in -- a string, which serialises fine. The
// slots are fixed rather than generated, so a screen opened twice replaces its
// own callback instead of leaving the old one behind for ever.

type Callback = (value: any) => void;

export type CallbackSlot = 'filter' | 'pickLocation';

const slots = new Map<CallbackSlot, Callback>();

export function setCallback<T>(slot: CallbackSlot, callback: (value: T) => void): void {
  slots.set(slot, callback as Callback);
}

export function getCallback<T>(slot: CallbackSlot): ((value: T) => void) | undefined {
  return slots.get(slot) as ((value: T) => void) | undefined;
}

// Called by the screen that consumed the callback, once it is done with it, so
// a stale one cannot be invoked by a later visit that was cancelled.
export function clearCallback(slot: CallbackSlot): void {
  slots.delete(slot);
}
