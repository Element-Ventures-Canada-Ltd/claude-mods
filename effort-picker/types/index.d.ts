// Handling: Unclassified — working
export type Level = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Pick = { level: Level | null; from: Level | null; reason: string }

declare module 'claude-code' {
  interface PluginState {
    'effort-picker': { last: Shaped<Pick | null>; isOff: boolean }
  }
}
