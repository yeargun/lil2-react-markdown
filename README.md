# lil2-react-markdown

[react-markdown](https://github.com/remarkjs/react-markdown) 10.1.0 on the typed, flat **lil2** stack, with
remark-gfm, remark-math, rehype-katex and remark-breaks compiled in. It renders the same HTML, it is smaller, and
it is about twice as fast.

The whole stack is one LilScript program, from characters to React elements:
[lil2-micromark](https://github.com/yeargun/lil2-micromark) →
[lil2-mdast-util-from-markdown](https://github.com/yeargun/lil2-mdast-util-from-markdown) →
[lil2-mdast-util-to-hast](https://github.com/yeargun/lil2-mdast-util-to-hast) →
[lil2-hast-util-to-jsx-runtime](https://github.com/yeargun/lil2-hast-util-to-jsx-runtime) → React, plus
[lil2-remark-gfm](https://github.com/yeargun/lil2-remark-gfm),
[lil2-remark-math](https://github.com/yeargun/lil2-remark-math),
[lil2-rehype-katex](https://github.com/yeargun/lil2-rehype-katex) and
[lil2-remark-breaks](https://github.com/yeargun/lil2-remark-breaks). Tokens, events and tree nodes are ints in
parallel arrays, and every id and enum is an int (token types, construct ids, node kinds, tags, properties,
enumerated values, plugins). React props are the only objects.

## In a chat app

A chat of LLM-style replies (lists, code, tables, math, about 2.5 KB of markdown each), every reply streamed into the
page a few tokens at a time and rendered by React with GFM, math and KaTeX: react-markdown 10.1.0 with remark-gfm,
remark-math and rehype-katex → **this package's `/full` flavor**. Main-thread time, measured with Playwright in
Chromium 151, with Chrome's CPU throttling standing in for phones (4×: Lighthouse's mid-tier mobile; 6×: DevTools'
low-end mobile); median of 2 runs, libraries alternating, each in a fresh tab.

| | short chat (5 replies) | average chat (20 replies) | long chat (60 replies) |
|---|---:|---:|---:|
| CPU while the replies stream, mid-tier phone (4×) | 7.1 s → **3.2 s** (2.2×) | 29.1 s → **11.5 s** (2.5×) | 1.3 min → **31.0 s** (2.5×) |
| CPU while the replies stream, low-end phone (6×) | 11.2 s → **4.7 s** (2.4×) | 45.9 s → **17.7 s** (2.6×) | 2.0 min → **47.4 s** (2.5×) |
| CPU while the replies stream, this machine | 1.6 s → **0.8 s** (2.1×) | 6.8 s → **2.7 s** (2.5×) | 17.6 s → **7.0 s** (2.5×) |
| updates slower than a frame (16.7 ms), low-end phone (6×) | 125 → **6 of 1,053** | 671 → **6 of 4,615** | 1,318 → **67 of 12,897** |
| opening the saved chat, low-end phone (6×) | 417 ms → **317 ms** (1.3×) | 843 ms → **519 ms** (1.6×) | 1.77 s → **960 ms** (1.8×) |

Every streamed update renders exactly react-markdown's DOM ([`test/chat.test.mjs`](test/chat.test.mjs), Chromium and Firefox).
Reproduce with `npm run bench:chat`; the numbers are in [`bench/chat/results/mobile.json`](bench/chat/results/mobile.json).
The machine is one core of an AMD EPYC 7763; real phones vary.

## Install

```bash
npm install @itslil/lil2-react-markdown react
npm install katex   # only for the /full flavor's math
```

TypeScript types are included. Each flavor is one ES module; Node, Deno, Bun and workers get `dist/`, bundlers
targeting browsers get `dist/browser/` through the `browser` condition.

## Use

```tsx
import {Markdown} from '@itslil/lil2-react-markdown'

export function Post({source}: {source: string}) {
  return <Markdown>{source}</Markdown>
}
```

A flavor is a file: the core is CommonMark, `/gfm` adds remark-gfm, `/full` adds remark-gfm, remark-math,
rehype-katex and remark-breaks. `plugins` turns them on, in upstream's order, and their options are props:

```tsx
import 'katex/dist/katex.min.css'
import {Markdown, GFM, MATH, KATEX} from '@itslil/lil2-react-markdown/full'

// Hoisted, so every render passes the same plugins.
const plugins = [GFM, MATH, KATEX]

export function Answer({source}: {source: string}) {
  return <Markdown plugins={plugins} singleTilde={false} katex={{macros: {'\\R': '\\mathbb{R}'}}}>{source}</Markdown>
}
```

`[GFM, MATH, KATEX]` is `remarkPlugins={[remarkGfm, remarkMath]}` plus `rehypePlugins={[rehypeKatex]}`. The options
are `singleTilde` (remark-gfm), `singleDollarTextMath` (remark-math) and `katex` (rehype-katex: KaTeX's options).

### Components

```tsx
import type {ReactNode} from 'react'
import {Markdown, type ExtraProps} from '@itslil/lil2-react-markdown'
import {TAG_A, TAG_CODE, tagNames} from '@itslil/lil2-react-markdown/constants'

function Link({href, children}: {href?: string, children?: ReactNode}) {
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>
}

// `node` is an id into `tree`, the hast columns of this render.
function Code({node, tree, className, children}: ExtraProps & {className?: string, children?: ReactNode}) {
  const [, parent, , , tag] = tree
  const block = tagNames[tag[parent[node]]] === 'pre'
  return <code className={block ? className : 'inline'}>{children}</code>
}

export function Doc({source}: {source: string}) {
  return <Markdown components={[TAG_A, Link, TAG_CODE, Code]}>{source}</Markdown>
}
```

`components` is a list of pairs, a `TAG_*` id then the component; the types check the pairing. A component gets the
element's properties, `children`, `node` and `tree` (`HastTree`: `[kind, parent, firstChild, nextSibling, tag, value,
startOffset, endOffset, flags, meta, propHead, propName, propKind, propString, propNumber, propNext, lineStarts,
tagNames]`).

### Chat apps: streaming replies

Re-render the reply as it streams, and keep finished messages memoized so only the growing one renders:

```tsx
import {memo} from 'react'
import {Markdown, GFM, MATH, KATEX} from '@itslil/lil2-react-markdown/full'

const plugins = [GFM, MATH, KATEX]

export const Message = memo(function Message({text}: {text: string}) {
  return <Markdown plugins={plugins}>{text}</Markdown>
})

export function Chat({messages}: {messages: readonly string[]}) {
  return <main>{messages.map((text, index) => <Message key={index} text={text} />)}</main>
}
```

Every partial reply renders exactly as react-markdown renders it (checked after every streamed update; see
[In practice](#in-practice)).

### Options, from react-markdown

| react-markdown | lil2-react-markdown |
|---|---|
| `remarkPlugins={[remarkGfm, remarkMath]}`, `rehypePlugins={[rehypeKatex]}` | `plugins={[GFM, MATH, KATEX]}` from `/full` |
| `components={{h1: Title}}` | `components={[TAG_H1, Title]}` (tag, component pairs) |
| `allowedElements={['p', 'em']}`, `disallowedElements` | `allowedElements={[TAG_P, TAG_EM]}` |
| `urlTransform(url, 'href', node)` | `urlTransform(url, PROP_HREF, node, tree)` |
| `allowElement(node, index, parent)` | `allowElement(node, index, parent, tree)` |
| a component's `props.node` (an object) | `props.node`, an id into `props.tree` |
| `remarkRehypeOptions` footnote fields | props: `clobberPrefix`, `footnoteLabel`, `footnoteLabelTag` (a tag id), `footnoteBackLabel`, `footnoteBackContent` |

`skipHtml`, `unwrapDisallowed` and `children` are unchanged. The constants (`TAG_*`, `PROP_*`, `tagNames`,
`propNames`) come from `@itslil/lil2-react-markdown/constants`, a separate entry with literal types.

### Without React components: an HTML string

```ts
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {Markdown, GFM, MATH, KATEX} from '@itslil/lil2-react-markdown/full'

const html = renderToStaticMarkup(createElement(Markdown, {plugins: [GFM, MATH, KATEX]}, '| a |\n|---|\n| $x^2$ |'))
console.log(html) // <table>…<span class="katex">…
```

### Which package

| you want | package |
|---|---|
| React elements | [`@itslil/lil2-react-markdown`](https://github.com/yeargun/lil2-react-markdown) (`/gfm`, `/full` for GFM, math, KaTeX) |
| an HTML string, CommonMark | [`@itslil/lil2-micromark`](https://github.com/yeargun/lil2-micromark) |
| an HTML string with GFM, math or KaTeX | `renderToStaticMarkup` of lil2-react-markdown's `/full` flavor (below) |
| mdast (syntax tree) | [`lil2-mdast-util-from-markdown`](https://github.com/yeargun/lil2-mdast-util-from-markdown); with GFM [`lil2-remark-gfm`](https://github.com/yeargun/lil2-remark-gfm), math [`lil2-remark-math`](https://github.com/yeargun/lil2-remark-math), breaks [`lil2-remark-breaks`](https://github.com/yeargun/lil2-remark-breaks) |
| elements from hast columns through any JSX runtime | [`lil2-hast-util-to-jsx-runtime`](https://github.com/yeargun/lil2-hast-util-to-jsx-runtime) |
| hast (HTML tree) | [`lil2-mdast-util-to-hast`](https://github.com/yeargun/lil2-mdast-util-to-hast) and the same three, or [`lil2-rehype-katex`](https://github.com/yeargun/lil2-rehype-katex) with formulas rendered |

Every package is one self-contained ES module with no runtime dependencies (React and KaTeX aside), ships its
TypeScript types, and resolves to a Node build or a browser build through its `exports` conditions.
## Builds

`dist/` serves Node, workers, Deno and the other non-browser conditions; `dist/browser/` is the `browser`
condition. As upstream's browser graph does, the browser build decodes named character references with the
document, so the 2,125-entry entity table is neither downloaded nor unpacked at load.

## Measured (2026-10-04)

Each flavor's `browser` build against react-markdown 10.1.0 with the same plugins, bundled for the browser with
esbuild and minified by Terser, esbuild and Oxc (the smallest shown). Each objective is its own LilScript build
(effort level 12, `lazy_functions`).

| flavor | | lil2 | upstream, best minifier | difference |
|---|---|---:|---:|---:|
| core | raw | 65,669 | 118,031 (Terser) | −44.4% |
| core | gzip (9) | 22,230 | 35,017 (Terser) | −36.5% |
| core | Brotli (11) | 19,341 | 31,169 (Terser) | −37.9% |
| `/gfm` | raw | 83,077 | 156,074 (Oxc) | −46.8% |
| `/gfm` | gzip (9) | 27,257 | 45,497 (Terser) | −40.1% |
| `/gfm` | Brotli (11) | 23,607 | 39,846 (Terser) | −40.8% |
| `/full` | raw | 93,288 | 171,098 (Oxc) | −45.5% |
| `/full` | gzip (9) | 30,403 | 50,244 (Terser) | −39.5% |
| `/full` | Brotli (11) | 26,369 | 43,331 (Terser) | −39.1% |

Speed: react-markdown / react-markdownlil / **lil2**, median time per render in a fresh browser context per lane,
after checking that all three render the same HTML (Playwright; Chromium 151, Firefox 153; AMD EPYC 7763 64-Core Processor). The `math`
document uses the full flavor (GFM, math, KaTeX). Cold rows are the first import and the first render.

| | Chromium | Firefox |
|---|---:|---:|
| chat | 0.82 / 0.69 / **0.31** ms | 1.57 / 1.25 / **0.67** ms |
| readme | 16.3 / 15.0 / **7.80** ms | 34.0 / 33.5 / **14.0** ms |
| large | 180 / 163 / **70.2** ms | 410 / 408 / **136** ms |
| gfm | 15.7 / 12.7 / **5.50** ms | 26.0 / 26.0 / **11.0** ms |
| math | 17.8 / 13.4 / **9.80** ms | 21.0 / 20.5 / **15.0** ms |
| import, cold | 9.80 / 8.50 / **5.40** ms | 18.0 / 16.0 / **12.0** ms |
| first render, cold | 19.9 / 20.3 / **15.8** ms | 15.0 / 14.0 / **14.0** ms |

## In practice

Measured 2026-10-04 on one core of an AMD EPYC 7763 (a fast server core: a mid-range phone takes roughly 3 to 5
times longer), headless Chromium 151 and Firefox 153, React 19.2. Every side renders GFM, math and KaTeX: lil2's
`/full` flavor against react-markdown 10.1.0 with remark-gfm, remark-math and rehype-katex.

### A streaming chat

A 24-turn conversation of LLM-style replies (paragraphs, lists, code blocks, tables, headings, math in a third of
them; 60 KB of markdown), each reply streamed about 12 characters per update, 5,368 updates in all. Every update
renders the growing reply into the DOM with React; finished messages stay mounted and memoized, as in a chat app.

| | react-markdown | react-markdownlil | **lil2** |
|---|---:|---:|---:|
| one update, median / p95 / worst, Chromium | 2.0 / 6.1 / 117 ms | 1.5 / 4.9 / 106 ms | **0.6 / 2.1 / 48 ms** |
| one update, median / p95 / worst, Firefox | 2 / 5 / 10 ms | 2 / 4 / 11 ms | **1 / 2 / 8 ms** |
| main thread for the whole chat, fresh tab, Chromium | 20.8 s | 17.0 s | **7.1 s** |
| main thread for the whole chat, warm, Chromium / Firefox | 13.1 / 11.7 s | 10.1 / 10.9 s | **4.4 / 5.3 s** |
| JavaScript allocated while the chat streams | 4.6 GB (901 KB per update) | 3.9 GB (768 KB) | **2.8 GB (551 KB)** |
| JavaScript heap high-water mark while streaming | 69 MB | 68 MB | **44 MB** |
| heap of the loaded library | 2.2 MB | 2.1 MB | **1.8 MB** |
| heap per message on screen | 122 KB | 119 KB | 121 KB |
| streamed updates whose DOM equals react-markdown's | | 5,344 of 5,344 | 5,344 of 5,344 |

What it means:

- **Each token is cheaper.** A streamed update takes a third of react-markdown's time. Scaled to a phone, react-markdown's
  p95 update (6 ms here) lands around 20 to 30 ms, past a 60 Hz frame (16.7 ms), while lil2's (2 ms) stays at 6 to 10 ms.
- **The whole chat costs a third of the CPU:** 7 s instead of 21 s of main thread in a fresh tab, which is battery on a
  laptop or phone, and time the page could spend on input and scrolling.
- **Less garbage, lower peaks.** 39% fewer bytes allocated means less garbage-collection work, and the heap peaks 25 MB
  lower while a reply streams. 97 to 99% of what any of the three allocates while streaming is the markdown pipeline
  re-run over the whole reply on every update; React's share is under 1%.
- **What stays on screen is the same.** A mounted message keeps about 120 KB (React's fibers and the DOM) with every
  library; lil2 keeps nothing extra.
- **Behaviour is the same at every step**, including half-written tables, code fences and formulas mid-stream.

Rendering the whole reply on every update is how `<Markdown>{text}</Markdown>` works for every library; updating at
most once per animation frame (or every 30 to 50 ms) instead of per token cuts the work for any of them.

### Memory leaks

None in any of the three. Playing six turns and clearing the chat ten times, heap snapshots diffed between the second
and the tenth cycle by object type show growth only in V8's own compiled code (about 110 KB, JIT warm-up); no array,
string, map or closure type grows by 16 KB. lil2's module-level state is bounded caches: the last combined syntax
(one entry), named references decoded by the browser build (at most 2,231), and the tag and property names KaTeX
writes (its vocabulary; with KaTeX's `trust` and `\htmlData`, one entry per distinct attribute name).

### Server rendering

The whole 24-turn transcript rendered to HTML per request with `renderToString` (Node 20; 108,943 identical
characters out):

| | react-markdown | **lil2** |
|---|---:|---:|
| time per request (median) | 122 ms, 8.2 requests/s per core | **45 ms, 22.2 requests/s per core** |
| JavaScript allocated per request | 82 MB | **55 MB** |
| heap after 500 requests | 17.4 MB | **12.6 MB** |
| process RSS | 123 MB | **115 MB** |
| heap over 500 requests | flat (16.8 to 17.4 MB) | flat (12.3 to 12.6 MB) |

## Behaviour

- `test/differential.test.mjs`: 736 documents (CommonMark spec, every named entity, edge cases, bench documents)
  rendered by react-markdown and by lil2 under nine option sets (defaults, `skipHtml`, allowed and disallowed
  elements with and without unwrapping, `allowElement`, `urlTransform`, custom components).
- `test/gfm.test.mjs`: 1,453 documents (the GFM spec, cmark-gfm's extension tests, edge cases, CommonMark) against
  react-markdown + remark-gfm under seven option sets.
- `test/full.test.mjs`: 182 KaTeX formulas as text, display and fenced math, a math document and GFM documents
  against react-markdown + remark-gfm + remark-math + rehype-katex + remark-breaks under eight option sets.

The rendered HTML is equal in every case. Browser builds are checked in Chromium and Firefox by the speed
harness, which compares every document's HTML before timing.

## License

MIT; see NOTICE.md.
