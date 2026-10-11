"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type CameraStreamContextValue = {
  streams: Record<string, string>;
  replace: (alias: string, src: string) => void;
};

const CameraStreamContext = createContext<CameraStreamContextValue>({
  streams: {},
  replace: () => {},
});

export function CameraStreamProvider({
  streams,
  replace,
  children,
}: CameraStreamContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ streams, replace }), [streams, replace]);
  return <CameraStreamContext.Provider value={value}>{children}</CameraStreamContext.Provider>;
}

export function useCameraStreams() {
  return useContext(CameraStreamContext);
}
