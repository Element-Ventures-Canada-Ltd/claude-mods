// Handling: Unclassified — working
// Usage Meter + Handoff: shows how full the chat's context window is and
// whether its prompt cache is likely still warm, and offers a handoff note
// once the chat is getting full, so a fresh chat can pick the work up.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Meter } from '../types'

// How long the prompt cache is assumed to stay warm after a turn ends. This
// session's cache lasts about an hour; on usage overage it drops to 5 minutes,
// so "warm" is an estimate, never a promise.
export const WARM_MS = 60 * 60 * 1000
// From this fill, the meter offers a handoff.
const HANDOFF_AT = 60

const meter = atom({ plugin: 'usage-meter', key: 'meter' } as const, null, {
  shape: 'meter-1',
})
const lastTurnAt = atom({ plugin: 'usage-meter', key: 'lastTurnAt' } as const, 0)
const now = atom({ plugin: 'usage-meter', key: 'now' } as const, 0)

export const HANDOFF_PROMPT = [
  'Write a handoff note so a fresh chat can continue this work without rereading this one.',
  'Use these headings: Goal; Decisions made; Files and branches touched; Open items; Next step.',
  'Keep it under 300 words, plain language, no secrets or credentials.',
  'Put it in one fenced block I can paste into a new chat.',
].join(' ')

export function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`

  return String(n)
}

export function line(m: Meter, isWarm: boolean): string {
  return `Chat ${m.percent}% full (${short(m.tokens)} of ${short(m.window)}) · ${isWarm ? 'warm' : 'cold'}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'handoff',
      description: 'Ask Claude for a handoff note to continue in a fresh chat',
    })
    const started = await $.clock.now()
    await update($, now, () => started)
    // Redraw once a minute so "warm" turns "cold" without a new message.
    $.clock.every(60_000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
      const m = await read($, meter)
      const at = await read($, lastTurnAt)
      if (m && at > 0) $.ui.status(line(m, t - at < WARM_MS))
    })

    return next(e)
  })

  on('command.run', { command: 'handoff' }, async $ => {
    void $.prompt.submit({ text: HANDOFF_PROMPT })

    return { text: 'Asking Claude for a handoff note.' }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      const t = await $.clock.now()
      await update($, lastTurnAt, () => t)
      await update($, now, () => t)
      const { context } = await $.session.usage()
      if (context.tokens !== undefined && context.percent !== undefined) {
        const m: Meter = { tokens: context.tokens, window: context.window, percent: context.percent }
        await update($, meter, () => m)
        $.ui.status(line(m, true))
      }
    }

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, meter)
    if (e.props.hasSurvey || m === null) return next(e)

    const at = await read($, lastTurnAt)
    const t = await read($, now)
    const isWarm = e.props.isWorking || (at > 0 && t - at < WARM_MS)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>{line(m, isWarm)} </Text>
        {m.percent >= HANDOFF_AT && !e.props.isWorking && (
          <Button
            key="handoff"
            label="Hand off"
            onPress={() => void $.prompt.submit({ text: HANDOFF_PROMPT })}
          />
        )}
      </Box>
    )
  })
}
