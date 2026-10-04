// A chat UI as apps build it: a React 19 client root, finished messages memoized and kept mounted, the streaming
// reply re-rendered on every chunk. Both lanes render assistant messages with GFM, math and KaTeX.
import {createElement as h, memo, createRoot, flushSync} from './vendor.mjs'
import {conversation, stream} from './conversation.js'

const LANES = {
  'react-markdown': async () => {
    const {Markdown, remarkGfm, remarkMath, rehypeKatex} = await import('./upstream.mjs')
    const remarkPlugins = [remarkGfm, remarkMath], rehypePlugins = [rehypeKatex]
    return text => h(Markdown, {remarkPlugins, rehypePlugins}, text)
  },
  'lil2': async () => {
    const m = await import('./lil2.mjs')
    const plugins = [m.GFM, m.MATH, m.KATEX]
    return text => h(m.Markdown, {plugins}, text)
  },
}

let markdown, root, host, messages = [], convo = []
const Message = memo(function Message({role, text}) {
  return h('div', {className: `message ${role}`}, role === 'assistant' ? markdown(text) : h('p', null, text))
})
function App({list}) {
  return h('main', null, list.map((m, i) => h(Message, {key: i, role: m.role, text: m.text})))
}
const commit = () => flushSync(() => root.render(h(App, {list: messages})))

export async function setup(lane, {turns = 24} = {}) {
  markdown = await LANES[lane]()
  convo = conversation({turns})
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  messages = []
  commit()
  return {turns, characters: convo.reduce((n, m) => n + m.text.length, 0)}
}

const fnv = text => { let x = 0x811c9dc5; for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 16777619); return (x >>> 0).toString(36) }
const precise = () => performance.memory?.usedJSHeapSize ?? 0

// One turn: the user's message, then the reply streamed in chunks. Returns each update's ms, the heap's high-water
// mark during the stream (no forced collection), and with `fingerprint` a hash of the streaming message's DOM per update.
export function turn(index, {tokensPerUpdate = 3, fingerprint = false} = {}) {
  const user = convo[index * 2], reply = convo[index * 2 + 1]
  const times = [], prints = []
  let peak = 0
  messages = [...messages, user]
  let t = performance.now(); commit(); times.push(performance.now() - t)
  messages = [...messages, {role: 'assistant', text: ''}]
  for (const text of stream(reply.text, tokensPerUpdate)) {
    messages = [...messages.slice(0, -1), {role: 'assistant', text}]
    t = performance.now(); commit(); times.push(performance.now() - t)
    const used = precise(); if (used > peak) peak = used
    if (fingerprint) prints.push(fnv(host.lastChild.lastChild.innerHTML))
  }
  return {times, peak, prints, length: reply.text.length}
}

// Opening a saved chat: the whole conversation rendered at once into the DOM. Returns the ms of that render.
export function openHistory() {
  messages = convo.map(m => ({role: m.role, text: m.text}))
  const t = performance.now()
  commit()
  return performance.now() - t
}

export function clear() {
  messages = []
  commit()
}

export function heap() {
  if (typeof gc === 'function') { gc(); gc() }
  return precise()
}

export function dom() {
  return {elements: host.getElementsByTagName('*').length, html: fnv(host.innerHTML)}
}
