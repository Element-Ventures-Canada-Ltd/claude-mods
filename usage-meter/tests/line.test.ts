// Handling: Unclassified — working
import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/register'

test('the meter reads like the design', async () => {
  expect(line({ tokens: 126_000, window: 1_000_000, percent: 13 }, false)).toBe(
    'Chat 13% full (126K of 1.0M) · cold',
  )
  expect(line({ tokens: 4_200, window: 200_000, percent: 2 }, true)).toBe(
    'Chat 2% full (4K of 200K) · warm',
  )
})
