/**
 * Type declarations for Lytics tracking library
 */

interface LyticsJstag {
  send: (data: Record<string, unknown>) => void;
  identify?: (data: Record<string, unknown>) => void;
  pageView?: () => void;
  getSegments?: (callback?: (segments: string[]) => void) => string[] | void;
  getProfile?: () => Record<string, unknown>;
  init?: (config: { src: string }) => void;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  once?: (event: string, callback: (...args: unknown[]) => void) => void;
  [key: string]: unknown;
}

interface LyticsLio {
  (command: string, ...args: unknown[]): void;
}

declare global {
  interface Window {
    jstag?: LyticsJstag;
    lio?: LyticsLio;
  }
}

export {};

