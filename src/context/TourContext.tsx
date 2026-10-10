// The guided tour a new account gets the first time it sees each screen.
//
// A boarding house finder is not obvious on first opening. The heart saves a
// listing, the compare button builds a shortlist somewhere else, the funnel
// sets filters that also drive the alerts tab -- none of which a person
// discovers by looking, and all of which they need before the app is worth
// anything to them. Everybody who demonstrated this build had to be told what
// the buttons did. That is the gap this closes.
//
// Per screen, not one long tour across the app.
//
// A single tour that walks somebody from Home to Search to Details has to
// drive the navigator itself, and then it has to cope with a back press, a
// tab tapped out of order, and a listing that does not exist yet. It breaks
// constantly and it breaks in front of an audience. Instead each screen
// explains itself the first time it is opened, which means every step runs
// against a screen that is definitely on display, and a tour interrupted
// half-way simply resumes the next time that screen is reached.
//
// What is remembered is which screens have been toured, stored per account so
// that a second person signing in on the same phone gets their own
// introduction, and so that one person is not introduced twice.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Where a highlighted control actually is on the display, in the same
// coordinates as the root overlay. Measured, never assumed: a tooltip pinned
// to a guessed position is wrong on the first phone with a different screen.
export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Just enough of a View to ask it where it is. Typed structurally rather than
// as React Native's View so the overlay can measure the host view behind a ref
// without either side importing the other's component.
export interface MeasurableView {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
}

export interface TourStep {
  // Matches the id a TourTarget on the screen registers itself under. A step
  // with no target is a plain centred message, which is how a tour opens and
  // closes.
  target?: string;
  title: string;
  body: string;
}

interface TourContextValue {
  // The step on display, or null when no tour is running.
  activeStep: TourStep | null;
  activeIndex: number;
  stepCount: number;
  next: () => void;
  // Ends the tour and marks the screen seen, so skipping is a decision that
  // sticks rather than a postponement.
  skip: () => void;
  // Called by TourTarget with the view itself, not with a position.
  //
  // The first version registered coordinates, measured in the target's own
  // onLayout. Inside a ScrollView that fires before the content has settled
  // into its final position, so what got cached was an intermediate layout and
  // every ring was drawn from numbers that had since stopped being true.
  // Holding the view instead lets the overlay measure it at the moment it is
  // about to draw, which is the only moment the answer is certainly right.
  registerTarget: (id: string, node: MeasurableView | null) => void;
  // The view a step wants to point at, or null if nothing has claimed that id.
  getTarget: (id: string) => MeasurableView | null;
  // Called by useScreenTour.
  startIfUnseen: (screen: string, steps: TourStep[]) => void;
  // Forgets every screen for this account, so the tour can be shown again.
  // Profile offers this, because a tour that can only ever be seen once is
  // one a person cannot go back to when they need it.
  replayAll: () => Promise<void>;
  // False until the seen list has been read back. Nothing may start before
  // then, or a returning user is toured again on every cold start.
  isReady: boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const storageKey = (uid: string) => `boardease.tourSeen.${uid}`;

export function TourProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [seen, setSeen] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const [screen, setScreen] = useState<string | null>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);

  // The registered views, in a ref rather than state: a control reporting in
  // must not re-render every screen that happens to be mounted.
  const targets = useRef<Record<string, MeasurableView>>({});

  // Read the seen list whenever the account changes. A logged-out app has no
  // list and starts no tours.
  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    setScreen(null);
    setSteps([]);
    setIndex(0);
    targets.current = {};

    if (!userId) {
      setSeen([]);
      setIsReady(true);
      return;
    }

    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (cancelled) return;
        try {
          const parsed = raw ? JSON.parse(raw) : [];
          setSeen(Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : []);
        } catch {
          // Corrupt value. Treating it as empty shows the tour once more,
          // which is a far smaller problem than throwing on startup.
          setSeen([]);
        }
      })
      .catch(() => {
        if (!cancelled) setSeen([]);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markSeen = useCallback(
    (name: string) => {
      setSeen((current) => {
        if (current.includes(name)) return current;
        const nextSeen = [...current, name];
        if (userId) {
          // Not awaited. The tour is over either way, and a storage failure
          // costs one repeated introduction rather than a stuck screen.
          AsyncStorage.setItem(storageKey(userId), JSON.stringify(nextSeen)).catch(
            () => undefined
          );
        }
        return nextSeen;
      });
    },
    [userId]
  );

  const end = useCallback(() => {
    if (screen) markSeen(screen);
    setScreen(null);
    setSteps([]);
    setIndex(0);
  }, [screen, markSeen]);

  const next = useCallback(() => {
    // Read the index rather than update from it. A state updater has to be a
    // pure function of its argument, and the first version ended the tour from
    // inside one -- which React is free to call twice, and does in development,
    // so the last Next ended the tour twice over.
    if (index + 1 >= steps.length) {
      end();
      return;
    }
    setIndex(index + 1);
  }, [index, steps.length, end]);

  const startIfUnseen = useCallback(
    (name: string, nextSteps: TourStep[]) => {
      if (!isReady || !userId || nextSteps.length === 0) return;
      if (seen.includes(name)) return;
      // Already running, on this screen or another. Two tours at once would
      // stack two scrims.
      if (screen !== null) return;

      setScreen(name);
      setSteps(nextSteps);
      setIndex(0);
    },
    [isReady, userId, seen, screen]
  );

  const registerTarget = useCallback((id: string, node: MeasurableView | null) => {
    if (node) {
      targets.current[id] = node;
    } else {
      delete targets.current[id];
    }
  }, []);

  const getTarget = useCallback((id: string) => targets.current[id] ?? null, []);

  const activeStep = screen !== null ? (steps[index] ?? null) : null;

  const replayAll = useCallback(async () => {
    setSeen([]);
    setScreen(null);
    setSteps([]);
    setIndex(0);
    if (userId) {
      await AsyncStorage.removeItem(storageKey(userId)).catch(() => undefined);
    }
  }, [userId]);

  const value = useMemo<TourContextValue>(
    () => ({
      activeStep,
      activeIndex: index,
      stepCount: steps.length,
      next,
      skip: end,
      registerTarget,
      getTarget,
      startIfUnseen,
      replayAll,
      isReady,
    }),
    [activeStep, index, steps.length, next, end, registerTarget, getTarget, startIfUnseen, replayAll, isReady]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour() must be called from inside a <TourProvider>');
  }
  return context;
}

// What a screen calls to offer its own tour. Starts once, the first time this
// account opens that screen, and never again unless the tour is replayed.
export function useScreenTour(screen: string, steps: TourStep[]) {
  const { startIfUnseen, isReady } = useTour();

  // The steps array is written inline at the call site and so is a new array
  // on every render. Comparing its content keeps that from restarting the
  // effect forever.
  const signature = JSON.stringify(steps);

  useEffect(() => {
    if (!isReady) return;
    // A beat after mount, so the screen's own targets have laid out and the
    // first step opens pointing at something rather than snapping onto it.
    const timer = setTimeout(() => startIfUnseen(screen, steps), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, signature, isReady, startIfUnseen]);
}
