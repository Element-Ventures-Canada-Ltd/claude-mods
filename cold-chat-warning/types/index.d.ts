// Handling: Unclassified — working
export type Held = { text: string; minutes: number; tokens: number }

declare module 'claude-code' {
  interface PluginState {
    'cold-chat-warning': { held: Shaped<Held | null>; lastTurnAt: number }
  }
}
