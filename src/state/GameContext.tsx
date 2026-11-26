import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SAVE_VERSION } from '../engine/data';
import { GameError } from '../engine/sim';
import type { GameState } from '../engine/types';

const SAVE_KEY = 'motorsport-empire-save';

interface Ctx {
  game: GameState | null;
  loaded: boolean;
  /** Run an engine action. Returns true on success; failures show a toast. */
  act: (fn: (s: GameState) => GameState) => boolean;
  setGame: (g: GameState | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  resetGame: () => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, setGameState] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameRef = useRef<GameState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as GameState;
          if (parsed.version === SAVE_VERSION) {
            gameRef.current = parsed;
            setGameState(parsed);
          }
        }
      } catch {
        // storage unavailable or corrupt save: start fresh
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((g: GameState | null) => {
    try {
      if (g) AsyncStorage.setItem(SAVE_KEY, JSON.stringify(g)).catch(() => {});
      else AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const setGame = useCallback((g: GameState | null) => {
    gameRef.current = g;
    setGameState(g);
    persist(g);
  }, [persist]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const act = useCallback((fn: (s: GameState) => GameState) => {
    const cur = gameRef.current;
    if (!cur) return false;
    try {
      setGame(fn(cur));
      return true;
    } catch (e) {
      if (e instanceof GameError) showToast(e.message);
      else {
        console.error(e);
        showToast('Something went wrong.');
      }
      return false;
    }
  }, [setGame, showToast]);

  const resetGame = useCallback(() => setGame(null), [setGame]);

  return (
    <GameCtx.Provider value={{ game, loaded, act, setGame, toast, showToast, resetGame }}>{children}</GameCtx.Provider>
  );
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error('useGame outside provider');
  return c;
}

/** For screens that only render once a game exists. */
export function useActiveGame() {
  const c = useGame();
  if (!c.game) throw new Error('No active game');
  return { ...c, game: c.game };
}
