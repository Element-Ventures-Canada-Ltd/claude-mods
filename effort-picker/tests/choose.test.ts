// Handling: Unclassified — working
import { expect, test } from 'claude-code/testing'

import { choose } from '../hooks/register'

test('quick replies go low, security work goes high, the rest is left alone', async () => {
  expect(choose('thanks').level).toBe('low')
  expect(choose('ok go ahead').level).toBe('low')
  expect(choose('red team the login flow').level).toBe('high')
  // Short but about security: never turned down.
  expect(choose('yes, audit it').level).toBe('high')
  expect(choose('add a footer to the page').level).toBe(null)
  expect(choose('/start').level).toBe(null)
})
