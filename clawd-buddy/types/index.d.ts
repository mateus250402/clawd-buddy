export type Mood = 'idle' | 'listening' | 'working' | 'coding' | 'writing' | 'happy' | 'sad'
export type Meter = { label: string; percent: number; resets?: string; elapsed?: number; detail?: string }
export type Feeling = { mood: Mood; line: string; stamp: number; until: number }

declare module 'claude-code' {
  interface PluginState {
    'clawd-buddy': { feeling: Shaped<Feeling>; tools: Shaped<number>; meters: Shaped<Meter[]>; isInfoOn: Shaped<boolean> }
  }
}
