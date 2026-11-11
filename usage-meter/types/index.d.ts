// Handling: Unclassified — working
export type Meter = { tokens: number; window: number; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-meter': { meter: Shaped<Meter | null>; lastTurnAt: number; now: number }
  }
}
