// Chats on a phone-speed CPU: npm run bench:chat (node bench/chat/build.mjs && node bench/chat/mobile.mjs [--rates 1,4,6] [--rounds 2])
// Chromium with Chrome's CPU throttling (4x: Lighthouse's mid-tier mobile; 6x: DevTools' low-end mobile; 1x: this
// machine), each chat length (short 5 replies, average 20, long 60), each library, in a fresh tab: every reply streamed
// into the DOM a few tokens at a time (the update times), then in another fresh tab the whole saved chat opened at once.
import {createServer} from 'node:http'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {extname, join, normalize} from 'node:path'
import os from 'node:os'
import * as playwright from 'playwright-core'

const flag = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1] }
const rates = flag('rates', '1,4,6').split(',').map(Number), rounds = Number(flag('rounds', 2))
const lanes = flag('lanes', 'react-markdown,lil2').split(',')
const sizes = [['short', 5], ['average', 20], ['long', 60]]
const site = new URL('./site/', import.meta.url).pathname
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript'}
const server = createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  if (path === '/') path = '/chat.html'
  try { const body = await readFile(join(site, path)); res.writeHead(200, {'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'max-age=3600'}); res.end(body) } catch { res.writeHead(404); res.end() }
}).listen(0)
const origin = `http://127.0.0.1:${server.address().port}`
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2 }
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }

const browser = await playwright.chromium.launch()
async function tab(rate) {
  const context = await browser.newContext(), page = await context.newPage()
  await page.goto(`${origin}/`); await page.waitForFunction(() => window.chat)
  if (rate > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate})
  return {page, context}
}
const runs = []
for (let round = 0; round < rounds; round++) for (const rate of rates) for (const [size, turns] of sizes) {
  for (const lane of round % 2 ? [...lanes].reverse() : lanes) {
    let {page, context} = await tab(rate)
    const info = await page.evaluate(([lane, turns]) => window.chat.setup(lane, {turns}), [lane, turns])
    const times = []
    for (let i = 0; i < turns; i++) times.push(...(await page.evaluate(i => window.chat.turn(i), i)).times)
    await context.close()
    ;({page, context} = await tab(rate))
    await page.evaluate(([lane, turns]) => window.chat.setup(lane, {turns}), [lane, turns])
    const history = await page.evaluate(() => window.chat.openHistory())
    await context.close()
    const run = {round, rate, size, turns, lane, characters: info.characters, updates: times.length, totalMs: times.reduce((a, b) => a + b, 0),
      p50: quantile(times, 0.5), p95: quantile(times, 0.95), overFrame: times.filter(t => t > 16.7).length, historyMs: history}
    runs.push(run)
    console.log(`round ${round + 1} ${rate}x ${size.padEnd(7)} ${lane.padEnd(15)} streaming ${(run.totalMs / 1000).toFixed(1).padStart(6)} s, p50 ${run.p50.toFixed(1)} ms, p95 ${run.p95.toFixed(1)} ms, ${run.overFrame}/${run.updates} updates over a frame; opening ${run.historyMs.toFixed(0)} ms`)
  }
}
await browser.close(); server.close()
const summary = []
for (const rate of rates) for (const [size, turns] of sizes) for (const lane of lanes) {
  const rs = runs.filter(r => r.rate === rate && r.size === size && r.lane === lane)
  summary.push({rate, size, turns, lane, characters: rs[0].characters, updates: rs[0].updates, totalMs: median(rs.map(r => r.totalMs)),
    p50: median(rs.map(r => r.p50)), p95: median(rs.map(r => r.p95)), overFrame: median(rs.map(r => r.overFrame)), historyMs: median(rs.map(r => r.historyMs))})
}
await mkdir(new URL('results/', import.meta.url), {recursive: true})
await writeFile(new URL('results/mobile.json', import.meta.url), JSON.stringify({measuredAt: new Date().toISOString(), cpu: os.cpus()[0]?.model,
  chromium: (await playwright.chromium.launch().then(async b => { const v = b.version(); await b.close(); return v })), rates, rounds, summary, runs}, null, 1) + '\n')
console.log('wrote results/mobile.json')
process.exit(0)
