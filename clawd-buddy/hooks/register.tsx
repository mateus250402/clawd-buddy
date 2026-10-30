import { atom, read, update } from 'claude-code'
import type { EngineInterface as Dollar, Register } from 'claude-code'

import type { Feeling, Meter, Mood } from '../types'

const PANE = 'clawd'
const BODY = '#D97757'
const INK = '#1f1f1f'

const feeling = atom(
  { plugin: 'clawd-buddy', key: 'feeling' } as const,
  { mood: 'idle', line: 'O que temos para hoje? ✨', stamp: 0, until: 0 } as Feeling,
  { shape: 'feeling-2' },
)
const tools = atom({ plugin: 'clawd-buddy', key: 'tools' } as const, 0, {
  shape: 'tools-1',
})

const IDLE = [
  'O que temos para hoje? ✨',
  'Bora codar? 🚀',
  'Pronto para o que vier!',
  'Qual é a missão de hoje?',
  'Estou por aqui 🧡',
  'Manda ver!',
]
const THINK = ['Hmm, deixa eu pensar…', 'Pensando aqui… 🤔', 'Boa pergunta…', 'Analisando… 🧠', 'Deixa eu ver…']
const WRITE = ['Escrevendo a resposta… ✍️', 'Organizando as ideias… ✍️', 'Anotando aqui… ✍️', 'Montando a resposta…']
const NOTEBOOK = ['Digitando no notebook… 💻', 'Rodando um comando… 💻', 'Mãos no teclado! ⌨️', 'Terminal na mão! 💻']
const HAPPY = ['Pronto! 🎉', 'Feito! 🎉', 'Missão cumprida! ✨', 'Tá aí! 🧡']
const STOPPED = ['Ah, você me parou…', 'Parei! Pode falar…', 'Opa, interrompido…']
const FAILED = ['Ops, algo deu errado 😢', 'Eita, deu ruim 😢', 'Tropecei aqui… 😢']

const meters = atom({ plugin: 'clawd-buddy', key: 'meters' } as const, [] as Meter[], {
  shape: 'meters-4',
})

const isInfoOn = atom({ plugin: 'clawd-buddy', key: 'isInfoOn' } as const, false, {
  shape: 'info-1',
})

const TRACK = '#9a9aa5'
const TEXT = '#8a8a94'

const labelOf = (kind: string) => {
  const name = kind.toLowerCase()
  if (name.includes('five') || name.includes('5h')) return '5h'
  if (name.includes('seven') || name.includes('7d') || name.includes('week')) return '7d'
  return name.replace(/_/g, ' ')
}

const WINDOW_MS: Record<string, number> = { '5h': 5 * 3600000, '7d': 7 * 86400000 }

const colorOf = (m: Meter) =>
  m.percent >= 95 ? '#D9534F' : m.percent >= 80 ? '#E0A030' : m.label === '5h' ? '#D97757' : m.label === '7d' ? '#8b5cf6' : '#3b82e6'

const BAR_W = 150

// The bright part is what was used; the faint part, the share of the window that has passed.
const barSvg = (m: Meter) => {
  const w = (percent: number) => ((BAR_W * percent) / 100).toFixed(1)
  const color = colorOf(m)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BAR_W} 8" width="${BAR_W}" height="8">
    <rect width="${BAR_W}" height="8" rx="4" fill="${TRACK}" fill-opacity="0.25"/>
    ${m.elapsed === undefined ? '' : `<rect width="${w(m.elapsed)}" height="8" rx="4" fill="${color}" fill-opacity="0.35"/>`}
    <rect width="${Math.max(8, Number(w(m.percent)))}" height="8" rx="4" fill="${color}"/></svg>`
}

// Token counts as `36k` or `1.2M`.
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

// The time left until a reset, to the minute: `3d4h`, `1h05`, `12m`, and `now` once it is due.
function countdownOf(ms: number) {
  const minutes = Math.ceil(ms / 60000)
  if (minutes <= 0) return 'now'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days > 0) return `${days}d${hours}h`
  return hours > 0 ? `${hours}h${String(rest).padStart(2, '0')}` : `${rest}m`
}

const TOOL_LINES: Record<string, string[]> = {
  Read: ['Lendo um arquivo…', 'Dando uma olhada… 👀'],
  Edit: ['Editando código…', 'Mexendo no código…'],
  Write: ['Escrevendo um arquivo…', 'Criando um arquivo…'],
  Grep: ['Procurando por aí…', 'Caçando uma pista… 🔎'],
  Glob: ['Procurando arquivos…', 'Explorando as pastas…'],
  WebSearch: ['Pesquisando na web…', 'Buscando na internet… 🌐'],
  WebFetch: ['Lendo uma página…', 'Abrindo um site… 🌐'],
  Agent: ['Chamando um ajudante!', 'Acionando a equipe! 🤝'],
}

function pick(lines: string | string[], seed: number) {
  return typeof lines === 'string' ? lines : lines[seed % lines.length]
}

const eyes = (mood: Mood) => {
  if (mood === 'happy')
    return `<path d="M40 42 L46 32 L52 42" stroke="${INK}" stroke-width="4" fill="none"/>
      <path d="M68 42 L74 32 L80 42" stroke="${INK}" stroke-width="4" fill="none"/>`
  if (mood === 'sad')
    return `<rect x="42" y="38" width="8" height="6" fill="${INK}"/><rect x="70" y="38" width="8" height="6" fill="${INK}"/>`
  const h = mood === 'listening' ? 6 : 12
  const y = mood === 'listening' ? 36 : 32
  const dx = mood === 'listening'
    ? `<animateTransform attributeName="transform" type="translate" values="-3 -3;3 -3;3 -3;-3 -3;-3 -3" dur="3s" repeatCount="indefinite"/>`
    : mood === 'working' || mood === 'coding' ? `<animateTransform attributeName="transform" type="translate" values="-2 0;2 0;-2 0" dur="1s" repeatCount="indefinite"/>` : ''
  const blink = mood === 'idle' ? `<animate attributeName="height" values="${h};${h};1;${h}" keyTimes="0;0.9;0.95;1" dur="4s" repeatCount="indefinite"/>` : ''
  return `<g>${dx}<rect x="42" y="${y}" width="8" height="${h}" fill="${INK}">${blink}</rect>
    <rect x="70" y="${y}" width="8" height="${h}" fill="${INK}">${blink}</rect></g>`
}

const extras = (mood: Mood) => {
  if (mood === 'coding')
    return `<g>
      <rect x="32" y="66" width="56" height="20" fill="#4a4a52"/>
      <rect x="55" y="73" width="10" height="6" fill="${BODY}"/>
      <rect x="26" y="86" width="68" height="4" fill="#6b6b75"/></g>
      <rect x="22" y="72" width="12" height="14" fill="${BODY}"><animate attributeName="y" values="70;76;70" dur="0.3s" repeatCount="indefinite"/></rect>
      <rect x="86" y="72" width="12" height="14" fill="${BODY}"><animate attributeName="y" values="76;70;76" dur="0.3s" repeatCount="indefinite"/></rect>`
  if (mood === 'working')
    return `<g fill="${INK}" opacity="0.5">
      <rect x="44" y="84" width="6" height="4"><animate attributeName="opacity" values="1;0;1" dur="0.4s" repeatCount="indefinite"/></rect>
      <rect x="56" y="84" width="6" height="4"><animate attributeName="opacity" values="0;1;0" dur="0.4s" repeatCount="indefinite"/></rect>
      <rect x="68" y="84" width="6" height="4"><animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="indefinite"/></rect></g>`
  if (mood === 'happy')
    return `<g fill="#F2C94C"><rect x="22" y="10" width="5" height="5"><animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite"/></rect>
      <rect x="95" y="8" width="5" height="5"><animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite"/></rect>
      <rect x="60" y="2" width="5" height="5"><animate attributeName="opacity" values="1;0;1" dur="0.6s" repeatCount="indefinite"/></rect></g>`
  if (mood === 'sad')
    return `<rect x="52" y="44" width="4" height="8" fill="#6AA9E9"><animate attributeName="y" values="44;60;44" dur="1.4s" repeatCount="indefinite"/></rect>`
  if (mood === 'writing') {
    const line = (y: number, w: string, begin: string) =>
      `<rect x="98" y="${y}" width="2" height="2" fill="${INK}"><animate attributeName="width" values="2;${w};${w}" keyTimes="0;0.6;1" dur="1.4s" begin="${begin}" repeatCount="indefinite"/></rect>`
    return `<rect x="94" y="23" width="3" height="3" fill="#d9d4c7"/>
      <rect x="94" y="2" width="26" height="16" fill="#f5f0e8" stroke="#cfc8b8" stroke-width="1"/>
      ${line(5, '18', '0s')}${line(9, '14', '0.4s')}${line(13, '20', '0.8s')}
      <rect x="102" y="30" width="3" height="14" fill="#F2C94C"><animate attributeName="y" values="30;34;30" dur="0.35s" repeatCount="indefinite"/></rect>
      <rect x="102" y="44" width="3" height="3" fill="${INK}"><animate attributeName="y" values="44;48;44" dur="0.35s" repeatCount="indefinite"/></rect>`
  }
  if (mood === 'listening') {
    const dot = (x: number, begin: string) =>
      `<rect x="${x}" y="9" width="4" height="4" fill="${INK}"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="${begin}" repeatCount="indefinite"/></rect>`
    return `<rect x="94" y="23" width="3" height="3" fill="#d9d4c7"/><rect x="98" y="19" width="5" height="5" fill="#d9d4c7"/>
      <rect x="94" y="2" width="26" height="16" fill="#f5f0e8" stroke="#cfc8b8" stroke-width="1"/><rect x="92" y="4" width="2" height="12" fill="#f5f0e8"/>
      ${dot(100, '0s')}${dot(106, '0.4s')}${dot(112, '0.8s')}
      <rect x="90" y="29" width="12" height="14" fill="${BODY}"><animate attributeName="y" values="29;26;29" dur="1.5s" repeatCount="indefinite"/></rect>`
  }
  return ''
}

const clawd = (mood: Mood) => {
  const bounce: Record<Mood, [string, string]> = {
    idle: ['0 -4', '1.6s'],
    listening: ['0 -2', '0.8s'],
    working: ['0 -3', '0.5s'],
    coding: ['0 -2', '0.6s'],
    writing: ['0 -2', '0.7s'],
    happy: ['0 -14', '0.5s'],
    sad: ['0 2', '2.4s'],
  }
  const [dy, dur] = bounce[mood]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
  <g>
    <animateTransform attributeName="transform" type="translate" values="0 0;${dy};0 0" dur="${dur}" repeatCount="indefinite"/>
    <rect x="30" y="20" width="60" height="40" fill="${BODY}"/>
    ${mood === 'coding' ? '' : `<rect x="18" y="34" width="12" height="14" fill="${BODY}">${mood === 'happy' ? `<animate attributeName="y" values="34;18;34" dur="0.5s" repeatCount="indefinite"/>` : ''}</rect>`}
    ${mood === 'coding' || mood === 'listening' ? '' : `<rect x="90" y="34" width="12" height="14" fill="${BODY}">${mood === 'happy' ? `<animate attributeName="y" values="34;18;34" dur="0.5s" repeatCount="indefinite"/>` : ''}</rect>`}
    <rect x="35" y="60" width="8" height="16" fill="${BODY}"/><rect x="49" y="60" width="8" height="16" fill="${BODY}"/>
    <rect x="63" y="60" width="8" height="16" fill="${BODY}"/><rect x="77" y="60" width="8" height="16" fill="${BODY}"/>
    ${eyes(mood)}
    ${extras(mood)}
  </g>
  <ellipse cx="60" cy="90" rx="26" ry="4" fill="#000" opacity="0.15"/>
</svg>`
}

async function feel($: Dollar, mood: Mood, lines: string | string[], ttlMs = 0) {
  const stamp = await $.clock.now()
  const line = pick(lines, Math.floor(stamp / 1000))
  await update($, feeling, () => ({ mood, line, stamp, until: ttlMs ? stamp + ttlMs : 0 }))
}

async function refreshMeters($: Dollar) {
  const usage = await $.session.usage()
  const now = await $.clock.now()
  const next: Meter[] = [
    ...(usage.context.percent === undefined
      ? []
      : [
          {
            label: 'context',
            percent: usage.context.percent,
            ...(usage.context.tokens === undefined
              ? {}
              : { detail: `${compact(usage.context.tokens)} de ${compact(usage.context.window)}` }),
          },
        ]),
    ...usage.rateLimits.map(limit => {
      const at = limit.resetsAt === undefined ? NaN : Date.parse(limit.resetsAt)
      return {
        label: labelOf(limit.kind),
        percent: limit.percentUsed,
        ...(Number.isNaN(at)
          ? {}
          : {
              resets: countdownOf(at - now),
              ...(WINDOW_MS[labelOf(limit.kind)] === undefined
                ? {}
                : { elapsed: Math.max(0, Math.min(100, Math.round(100 * (1 - (at - now) / WINDOW_MS[labelOf(limit.kind)])))) }),
            }),
      }
    }),
  ].map(m => ({ ...m, percent: Math.max(0, Math.min(100, Math.round(m.percent))) }))
  const old = await read($, meters)
  if (JSON.stringify(old) !== JSON.stringify(next)) await update($, meters, () => next)
}

async function rest($: Dollar) {
  const now = await $.clock.now()
  await update($, feeling, (f: Feeling) =>
    f.until > 0 && now >= f.until
      ? { mood: 'idle', line: pick(IDLE, Math.floor(now / 1000)), stamp: now, until: 0 }
      : f,
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clawd',
      description: 'Abre o Clawd grande num painel; "/clawd info" liga ou desliga as barras de uso na faixa',
    })
    const saved = await $.store.get('isInfoOn')
    await update($, isInfoOn, () => saved === true)
    $.clock.every(500, () => {
      void rest($)
    })
    $.clock.every(20000, () => {
      void refreshMeters($)
    })
    void refreshMeters($)
    return next(e)
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'info') {
      const next = !(await read($, isInfoOn))
      await update($, isInfoOn, () => next)
      await $.store.set('isInfoOn', next)
      if (next) await refreshMeters($)
      return { text: next ? 'Faixa do Clawd: com informações de uso.' : 'Faixa do Clawd: só o Clawd.' }
    }
    await $.ui.open({ id: PANE, title: 'Clawd' })
    return { text: 'Clawd chegou! 🧡' }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, tools, () => 0)
    await feel($, 'listening', THINK)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await update($, tools, (n: number) => n + 1)
    if (e.tool === 'Bash') {
      await feel($, 'coding', NOTEBOOK)
      return next(e)
    }
    await feel($, 'working', TOOL_LINES[e.tool] ?? [`Usando ${e.tool}…`])
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    let kind = ''
    const stream = next(e)
    for await (const chunk of stream) {
      if ((chunk.kind === 'text' || chunk.kind === 'thinking') && chunk.kind !== kind) {
        kind = chunk.kind
        if (kind === 'text') await feel($, 'writing', WRITE)
        else await feel($, 'listening', THINK)
      }
      yield chunk
    }
    return await stream.result
  })

  on('turn.complete', async ($, e, next) => {
    await refreshMeters($)
    if (e.reason === 'answer') {
      await feel($, 'happy', HAPPY, 3000)
    } else if (e.reason === 'aborted') {
      await feel($, 'sad', STOPPED, 4000)
    } else {
      await feel($, 'sad', FAILED, 5000)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { Box, Svg, Text } = $.ui.resolve(e)
    if (!Svg || e.props.hasSurvey) return next(e)
    const f = await read($, feeling)
    const order = ['5h', '7d', 'context']
    const rank = (label: string) => (order.includes(label) ? order.indexOf(label) : order.length)
    const isOn = await read($, isInfoOn)
    const list = isOn ? [...(await read($, meters))].sort((a, b) => rank(a.label) - rank(b.label)) : []
    return (
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" paddingX={2}>
        <Box flexDirection="row" alignItems="center" gap={2}>
          <Svg source={clawd(f.mood)} alt={`Clawd, ${f.mood}`} width={72} height={60} isInteractive />
          <Text dimColor>{f.line}</Text>
        </Box>
        <Box flexDirection="row" alignItems="flex-start" gap={8}>
          {list.map(m => (
            <Box key={m.label} flexDirection="column" gap={0}>
              <Text dimColor>
                {m.label} · {m.percent}% de uso
              </Text>
              <Svg source={barSvg(m)} alt={`${m.label} ${m.percent}%`} width={BAR_W} height={8} />
              <Text dimColor>
                {m.detail ?? ''}
                {m.elapsed === undefined ? '' : `${m.elapsed}% tempo`}
                {m.resets === undefined ? '' : ` · reinicia ${m.resets}`}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Svg, Text } = $.ui.resolve(e)
    const f = await read($, feeling)
    if (!Svg) return <Text>{f.line}</Text>
    return (
      <Box flexDirection="column" alignItems="center">
        <Svg source={clawd(f.mood)} alt={`Clawd, ${f.mood}`} width={140} isInteractive />
        <Text dimColor>{f.line}</Text>
      </Box>
    )
  })
}
