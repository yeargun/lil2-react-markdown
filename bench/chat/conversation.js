// A reproducible chat: user questions and LLM-style markdown replies (paragraphs with emphasis, inline code and
// links, lists, fenced code, GFM tables, headings, quotes, inline and display math), and the token stream a UI
// re-renders from (about four characters per token, as LLM tokenizers average).

function random(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const words = ('state component render effect cache request response stream token buffer parser tree node value index ' +
  'array object string number function module import export async await promise error retry timeout queue worker ' +
  'thread memory heap allocation garbage collector benchmark latency throughput server client browser network ' +
  'database query index transaction schema migration deploy build bundle compile type interface generic option ' +
  'config environment variable secret token session cookie header route handler middleware test coverage').split(' ')
const identifiers = ['useEffect', 'fetchUser', 'retryCount', 'parseConfig', 'cache.get', 'Promise.all', 'AbortController', 'JSON.parse', 'createRoot', 'tsconfig.json', 'npm run build', 'process.env', 'Map<string, User>', 'git rebase']
const questions = ['How do I cache API responses in a React app without stale data?', 'Can you explain why my Node server leaks memory under load?',
  'What is the difference between a process and a thread, with an example?', 'Write a function that retries a fetch with exponential backoff.',
  'Compare Postgres and SQLite for a small SaaS. Give me a table.', 'Explain big-O of quicksort and show the recurrence.',
  'Why does my TypeScript generic lose its type here?', 'How should I structure a monorepo with shared packages?',
  'Summarize the CAP theorem with a practical example.', 'Derive the gradient of the softmax cross-entropy loss.',
  'How do I debounce a search input in React?', 'What are good defaults for HTTP timeouts and retries?']

export function conversation({turns = 24, seed = 7} = {}) {
  const r = random(seed)
  const pick = list => list[Math.floor(r() * list.length)]
  const int = (a, b) => a + Math.floor(r() * (b - a + 1))
  const sentence = () => {
    const n = int(8, 20), out = []
    for (let i = 0; i < n; i++) {
      const roll = r()
      let w = pick(words)
      if (roll < 0.05) w = `**${w}**`
      else if (roll < 0.09) w = `*${w}*`
      else if (roll < 0.14) w = '`' + pick(identifiers) + '`'
      else if (roll < 0.16) w = `[${w}](https://example.com/docs/${w})`
      out.push(w)
    }
    const s = out.join(' ')
    return s[0].toUpperCase() + s.slice(1) + pick(['.', '.', '.', ':', '?'])
  }
  const paragraph = () => Array.from({length: int(2, 4)}, sentence).join(' ')
  const list = ordered => Array.from({length: int(3, 6)}, (_, i) => `${ordered ? `${i + 1}.` : '-'} ${sentence()}`).join('\n')
  const code = () => {
    const lang = pick(['ts', 'js', 'python', 'bash'])
    const lines = []
    for (let i = 0, n = int(6, 22); i < n; i++) {
      const indent = '  '.repeat(int(0, 2))
      lines.push(lang === 'python'
        ? `${indent}${pick(['result = ', 'if ', 'for item in ', 'return ', 'await '])}${pick(words)}_${pick(words)}(${pick(words)}, ${int(1, 99)})${pick(['', ':', ''])}`
        : lang === 'bash' ? `${pick(['npm', 'git', 'curl', 'docker'])} ${pick(words)} --${pick(words)}=${int(1, 9)}`
          : `${indent}${pick(['const ', 'let ', 'return ', 'await ', 'if (', ''])}${pick(words)}${pick(['', '.', '?.'])}${pick(words)}(${pick(words)}, ${int(0, 500)})${pick([';', ' {', ';', ');'])}`)
    }
    return '```' + lang + '\n' + lines.join('\n') + '\n```'
  }
  const table = () => {
    const cols = int(3, 4), rows = int(3, 6)
    const head = Array.from({length: cols}, (_, i) => i ? pick(words) : 'Option')
    const body = Array.from({length: rows}, () => Array.from({length: cols}, (_, i) => i ? pick(['yes', 'no', `${int(1, 99)} ms`, '`' + pick(identifiers) + '`', pick(words)]) : pick(words)))
    return [`| ${head.join(' | ')} |`, `|${head.map((_, i) => i ? ':---:' : ':---').join('|')}|`, ...body.map(row => `| ${row.join(' | ')} |`)].join('\n')
  }
  const math = () => pick([
    '$$\nT(n) = 2T\\left(\\frac{n}{2}\\right) + O(n) \\implies T(n) = O(n \\log n)\n$$',
    '$$\n\\frac{\\partial L}{\\partial z_i} = \\hat{y}_i - y_i, \\quad \\hat{y}_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}\n$$',
    '$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$',
    '$$\nP(A \\mid B) = \\frac{P(B \\mid A) P(A)}{P(B)}\n$$'])
  const inlineMath = () => pick(['$O(n \\log n)$', '$e^{i\\pi} + 1 = 0$', '$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$', '$p < 0.05$'])
  const reply = () => {
    const blocks = [paragraph()]
    const usesMath = r() < 0.3
    for (let i = 0, n = int(3, 7); i < n; i++) {
      const roll = r()
      if (roll < 0.22) blocks.push(paragraph() + (usesMath && r() < 0.5 ? ` For example ${inlineMath()} holds.` : ''))
      else if (roll < 0.38) blocks.push(list(false))
      else if (roll < 0.48) blocks.push(list(true))
      else if (roll < 0.66) blocks.push(code())
      else if (roll < 0.76) blocks.push(table())
      else if (roll < 0.84) blocks.push(`### ${sentence().replace(/[.:?]$/, '')}`)
      else if (roll < 0.9) blocks.push(`> ${sentence()}`)
      else blocks.push(usesMath ? math() : paragraph())
    }
    blocks.push(pick(['Let me know if you want a deeper example.', 'Hope this helps!', 'Want me to turn this into a checklist?']))
    return blocks.join('\n\n')
  }
  const out = []
  for (let i = 0; i < turns; i++) out.push({role: 'user', text: pick(questions)}, {role: 'assistant', text: reply()})
  return out
}

// The text a UI holds after each streamed chunk of `tokensPerUpdate` tokens (tokens are word pieces of at most four
// characters, with their leading whitespace); the last is the whole reply.
export function stream(text, tokensPerUpdate = 3) {
  const tokens = text.match(/\s*[^\s]{1,4}|\s+/g)
  const prefixes = []
  let at = 0
  for (let i = 0; i < tokens.length; i += tokensPerUpdate) {
    for (let j = i; j < Math.min(i + tokensPerUpdate, tokens.length); j++) at += tokens[j].length
    prefixes.push(text.slice(0, at))
  }
  if (prefixes[prefixes.length - 1] !== text) prefixes.push(text)
  return prefixes
}
