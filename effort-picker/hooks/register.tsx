// Handling: Unclassified — working
// Effort Picker: chooses how hard Claude thinks about each message you send.
// Quick, simple messages get `low`; security, design and debugging work gets
// `high`; everything else keeps the session's own setting. Subagents are
// never touched. Turn it off with the band's button or /effort-auto.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Level, Pick } from '../types'

const last = atom({ plugin: 'effort-picker', key: 'last' } as const, null, {
  shape: 'pick-1',
})
const isOff = atom({ plugin: 'effort-picker', key: 'isOff' } as const, false)

// Work where thinking harder is worth the cost. Checked first, so a short
// message about security is never turned down.
const HEAVY =
  /\b(security|secure|red[- ]?team|threat|vulnerab|exploit|attack|audit|compliance|architect|design|plan|refactor|debug|investigate|root cause|migrat|review|why (does|is|did)|prove|verify)/i
// Small talk and quick checks.
const LIGHT =
  /^(yes|no|ok|okay|thanks|thank you|go|go ahead|continue|sounds good|looks good|do it|ship it|stop|cancel)\b|^(what|which|where|when|who) (is|are|was)\b/i

export function choose(text: string): { level: Level | null; reason: string } {
  const t = text.trim()
  if (t.startsWith('/')) return { level: null, reason: 'a slash command' }
  if (HEAVY.test(t)) return { level: 'high', reason: 'security, design or debugging work' }
  if (t.length > 600) return { level: 'high', reason: 'a long, detailed request' }
  if (t.length <= 80 && LIGHT.test(t)) return { level: 'low', reason: 'a quick reply or question' }

  return { level: null, reason: 'an ordinary request' }
}

export const register: Register = on => {
  let pending: { level: Level | null; reason: string } | undefined
  const turns = new Map<string, { level: Level; reason: string }>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'effort-auto',
      description: 'Turn automatic per-message effort on or off',
    })

    return next(e)
  })

  on('command.run', { command: 'effort-auto' }, async $ => {
    const off = await update($, isOff, was => !was)
    $.ui.status(off ? 'Effort: auto off' : undefined)

    return { text: off ? 'Automatic effort is off.' : 'Automatic effort is on.' }
  })

  on('prompt.submit', async ($, e, next) => {
    const isPersons = e.origin.kind === 'composer' || e.origin.kind === 'bridge'
    pending =
      isPersons && !e.command && !e.isMeta && !(await read($, isOff))
        ? choose(e.text)
        : undefined

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined && pending?.level) {
      turns.set(e.turnId, { level: pending.level, reason: pending.reason })
    } else if (e.agentId === undefined && pending) {
      void update($, last, () => ({ level: null, from: null, reason: pending!.reason }))
    }
    if (e.agentId === undefined) pending = undefined

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const chosen = e.agentId === undefined ? turns.get(e.turnId) : undefined
    if (!chosen || typeof e.effort === 'number') return yield* next(e)

    if (e.index === 0) {
      const from = (e.effort ?? null) as Level | null
      const pick: Pick = { level: chosen.level, from, reason: chosen.reason }
      await update($, last, () => pick)
      $.ui.status(`Effort ${chosen.level}${from ? ` (was ${from})` : ''}`)
    }

    return yield* next({ ...e, effort: chosen.level })
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) turns.delete(e.turnId)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const pick = await read($, last)
    if (e.props.hasSurvey || pick === null || pick.level === null) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const dir =
      pick.from === null || pick.from === pick.level
        ? ''
        : `, ${rank(pick.level) < rank(pick.from) ? 'down' : 'up'} from ${pick.from}`
    const off = await read($, isOff)

    return (
      <Box>
        <Text dimColor>
          Effort {pick.level} for this message{dir}: {pick.reason}{' '}
        </Text>
        <Button
          key="toggle"
          label={off ? 'Turn on' : 'Turn off'}
          onPress={() => update($, isOff, was => !was)}
        />
      </Box>
    )
  })
}

function rank(level: Level): number {
  return ['low', 'medium', 'high', 'xhigh', 'max'].indexOf(level)
}
