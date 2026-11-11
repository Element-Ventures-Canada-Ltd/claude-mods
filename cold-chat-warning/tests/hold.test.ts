// Handling: Unclassified — working
import { expect, test } from 'claude-code/testing'

const HOUR = 60 * 60 * 1000

test('a message to a cold, full chat is held once, then sent when repeated', async ($, on) => {
  let clock = 1_000_000
  on('clock.now', () => ({ value: clock }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 126_000, window: 1_000_000, percent: 13 }, rateLimits: [] } }))
  on('turn.complete', () => ({ text: 'done' }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'done', durationMs: 1, isAborted: false })
  clock += 2 * HOUR

  const first = await $.prompt.submit({ text: 'next step?', origin: { kind: 'composer' }, wait: false } as never)
  expect(typeof first.drop).toBe('string')

  const second = await $.prompt.submit({ text: 'next step?', origin: { kind: 'composer' }, wait: false } as never)
  expect(second.text).toBe('next step?')
})

test('a warm chat is never interrupted', async ($, on) => {
  let clock = 1_000_000
  on('clock.now', () => ({ value: clock }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 126_000, window: 1_000_000, percent: 13 }, rateLimits: [] } }))
  on('turn.complete', () => ({ text: 'done' }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'done', durationMs: 1, isAborted: false })
  clock += 5 * 60 * 1000

  const sent = await $.prompt.submit({ text: 'hi', origin: { kind: 'composer' }, wait: false } as never)
  expect(sent.text).toBe('hi')
})
