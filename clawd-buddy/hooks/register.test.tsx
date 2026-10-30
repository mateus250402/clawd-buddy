import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'clawd-buddy',
  component: 'Pane',
  requestId: 'clawd',
  props: {
    title: 'Clawd',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('Clawd reacts to the prompt and a Bash call, and is happy after the turn', async ($, on) => {
  on('clock.now', () => ({ value: 1000 }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, percent: 7 }, rateLimits: [{ kind: 'five_hour', percentUsed: 12 }] },
  }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: 'ok' }))

  let ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBeTruthy()
  await ui.unmount()

  await $.prompt.submit({ text: 'oi' })
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBeTruthy()
  await ui.unmount()

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBeTruthy()
  await ui.unmount()

  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1' })
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBeTruthy()
  await ui.unmount()
})
