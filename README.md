# lil2-react-markdown

[react-markdown](https://github.com/remarkjs/react-markdown) 10.1.0 on the typed, flat **lil2** pipeline.
It renders the same output, is smaller, and is about twice as fast.

The whole stack is one LilScript program: [lil2-micromark](https://github.com/yeargun/lil2-micromark) →
[lil2-mdast-util-from-markdown](https://github.com/yeargun/lil2-mdast-util-from-markdown) →
[lil2-mdast-util-to-hast](https://github.com/yeargun/lil2-mdast-util-to-hast) →
[lil2-hast-util-to-jsx-runtime](https://github.com/yeargun/lil2-hast-util-to-jsx-runtime) → React. Tokens,
events and tree nodes are ints in parallel arrays. React props are the only objects.

## Use

```jsx
import {Markdown} from '@itslil/lil2-react-markdown'

<Markdown skipHtml>{'# Hello, *world*!'}</Markdown>
```

The props are react-markdown's (`children`, `components`, `allowedElements`, `disallowedElements`,
`unwrapDisallowed`, `skipHtml`, `urlTransform`, `allowElement`), with one change: nodes are ids into `tree`,
the hast columns, and never objects.

- `urlTransform(url, key, node, tree)`
- `allowElement(node, index, parent, tree)`
- custom components get `props.node` (an id) and `props.tree`

Plugins (GFM, math, KaTeX) are compiled into the program: lil2-remark-gfm and friends are in progress.

## Measured (2026-10-04, development build)

Rendering through `renderToString` in a fresh browser context per lane, after an identical-HTML check (Playwright;
Chromium 151, Firefox 153), compared with react-markdown 10.1.0's browser build:

| document | Chromium | Firefox |
|---|---:|---:|
| chat (1 KB) | 0.83 → 0.40 ms (0.49×) | 1.43 → 0.80 ms (0.56×) |
| readme (26 KB) | 16.5 → 8.6 ms (0.52×) | 36.0 → 16.0 ms (0.44×) |
| large (227 KB) | 188 → 106 ms (0.56×) | 416 → 221 ms (0.53×) |
| first render, cold | 20.4 → 19.1 ms | 15.5 → 13.0 ms |

For comparison, react-markdownlil runs at 0.86–0.95× of react-markdown on the same documents.

## Behaviour

`test/differential.test.mjs` renders 736 documents with react-markdown and with lil2 under nine option sets
(defaults, `skipHtml`, allowed and disallowed elements with and without unwrapping, `allowElement`,
`urlTransform`, custom components). The rendered HTML is equal in every case.

## License

MIT; see NOTICE.md.
