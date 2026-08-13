"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

function getListeners(): Set<Listener> {
  const w = globalThis as unknown as { __antojos_listeners__?: Set<Listener> };
  if (!w.__antojos_listeners__) w.__antojos_listeners__ = new Set();
  return w.__antojos_listeners__;
}

const w = globalThis as unknown as { __antojos_version__?: number };
if (typeof w.__antojos_version__ !== "number") w.__antojos_version__ = 0;

function subscribe(cb: Listener): () => void {
  const listeners = getListeners();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getVersion(): number {
  return w.__antojos_version__ ?? 0;
}

export function bumpStorageVersion(): void {
  w.__antojos_version__ = (w.__antojos_version__ ?? 0) + 1;
  getListeners().forEach((listener) => listener());
}

export function useStorageVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}