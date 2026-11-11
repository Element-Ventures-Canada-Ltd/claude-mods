// Handling: Unclassified — working
// Cold Chat Warning: when you send a message to a chat that has sat idle long
// enough for its prompt cache to expire, Claude would reread the whole
// conversation at full price. This holds the message and asks first:
// Send anyway, Start fresh (take the message to a new chat), or Cancel.
// Where no buttons can be drawn (the phone app), sending the same message a
// second time sends it anyway, so a message is never lost.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Held } from '../types'

// Matches usage-meter: about an hour for this session's cache (an estimate).
export const COLD_MS = 60 * 60 * 1000
// Below this, a reread is cheap and not worth interrupting you for.
export const MIN_TOKENS = 20_000

const held = atom({ plugin: 'cold-chat-warning', key: 'held' } as const, null, {
  shape: 'held-1',
})
const lastTurnAt = atom({ plugin: 'cold-chat-warning', key: 'lastTurnAt' } as const, 0)

export function message(h: Held): string {
  return `This chat went cold ${h.minutes}m ago. Sending makes Claude reread about ${Math.round(h.tokens / 1000)}K tokens at full cost.`
}

export const register: Register = on => {
  // Text the person already chose to send anyway: let it through once.
  let allowOnce: string | undefined

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      const t = await $.clock.now()
      await update($, lastTurnAt, () => t)
    }

    return done
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'plugin' && allowOnce === e.text) {
      allowOnce = undefined
      return next(e)
    }
    const isPersons = e.origin.kind === 'composer' || e.origin.kind === 'bridge'
    if (!isPersons || e.command || e.isMeta || e.turnId) return next(e)

    const at = await read($, lastTurnAt)
    const t = await $.clock.now()
    const { context } = await $.session.usage()
    const tokens = context.tokens ?? 0
    const isCold = at > 0 && t - at >= COLD_MS && tokens >= MIN_TOKENS
    if (!isCold) return next(e)

    // Sent again after a warning: the person means it.
    const before = await read($, held)
    if (before?.text === e.text) {
      await update($, held, () => null)
      return next(e)
    }

    const h: Held = { text: e.text, minutes: Math.round((t - at) / 60_000), tokens }
    await update($, held, () => h)

    return { drop: `${message(h)} Send the same message again to send it anyway.` }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const h = await read($, held)
    if (e.props.hasSurvey || h === null) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const clear = () => update($, held, () => null)

    return (
      <Box flexDirection="column">
        <Text>{message(h)}</Text>
        <Box>
          <Button
            key="send"
            label="Send anyway"
            onPress={async () => {
              await clear()
              allowOnce = h.text
              void $.prompt.submit({ text: h.text })
            }}
          />
          <Button
            key="fresh"
            label="Start fresh"
            onPress={async () => {
              await clear()
              await $.prompt.fill({ text: h.text })
              // A handoff note would itself reread the cold chat, so none is asked.
              $.ui.toast('Your message is back in the box: open a new chat (or /clear) and send it there.')
            }}
          />
          <Button
            key="cancel"
            label="Cancel"
            onPress={async () => {
              await clear()
              await $.prompt.fill({ text: h.text })
            }}
          />
        </Box>
      </Box>
    )
  })
}
