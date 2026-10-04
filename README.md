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

## Use

```jsx
import {Markdown} from '@itslil/lil2-react-markdown'                   // CommonMark
import {Markdown, GFM} from '@itslil/lil2-react-markdown/gfm'          // + remark-gfm
import {Markdown, GFM, MATH, KATEX, BREAKS} from '@itslil/lil2-react-markdown/full' // + math, KaTeX, breaks
import {TAG_H1, TAG_A, PROP_HREF} from '@itslil/lil2-react-markdown/constants'

<Markdown plugins={[GFM, MATH, KATEX]} components={[TAG_H1, Title]}>{markdown}</Markdown>
```

A flavor is a file: the core carries no plugin, `gfm` carries remark-gfm, `full` carries all four. `plugins`
applies them, in upstream's order (`[GFM, MATH, KATEX]` is `remarkPlugins={[remarkGfm, remarkMath]}` plus
`rehypePlugins={[rehypeKatex]}`). Plugin options are props: `singleTilde` (remark-gfm), `singleDollarTextMath`
(remark-math) and `katex` (rehype-katex, KaTeX's options). KaTeX itself is the `katex` package.

The other props are react-markdown's, with ints for names and ids for nodes:

| react-markdown | lil2-react-markdown |
|---|---|
| `components={{h1: Title}}` | `components={[TAG_H1, Title]}` (tag, component pairs) |
| `allowedElements={['p', 'em']}`, `disallowedElements` | `allowedElements={[TAG_P, TAG_EM]}` |
| `urlTransform(url, 'href', node)` | `urlTransform(url, PROP_HREF, node, tree)` |
| `allowElement(node, index, parent)` | `allowElement(node, index, parent, tree)` |
| a component's `props.node` (an object) | `props.node`, an id into `props.tree` (the hast columns) |

`tree` is one array of columns per render, shared by every element:
`[kind, parent, firstChild, nextSibling, tag, value, startOffset, endOffset, flags, meta, propHead, propName,
propKind, propString, propNumber, propNext, lineStarts, tagNames]`.

`skipHtml` and `unwrapDisallowed` are unchanged. remark-rehype's footnote options are props too: `clobberPrefix`,
`footnoteLabel`, `footnoteLabelTag` (a tag id), and `footnoteBackLabel` and `footnoteBackContent` (a string, or a
function of the reference and rereference index returning one). `constants` (`TAG_*`, `PROP_*`, `tagNames`, `propNames`) is its
own entry, so importing a flavor costs nothing for them.

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
