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

`skipHtml` and `unwrapDisallowed` are unchanged. `constants` (`TAG_*`, `PROP_*`, `tagNames`, `propNames`) is its
own entry, so importing a flavor costs nothing for them.

## Builds

`dist/` serves Node, workers, Deno and the other non-browser conditions; `dist/browser/` is the `browser`
condition. As upstream's browser graph does, the browser build decodes named character references with the
document, so the 2,125-entry entity table is neither downloaded nor unpacked at load.

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
