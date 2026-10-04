// Same rendered output as react-markdown 10.1.0, across its options.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import Upstream from 'react-markdown'
import {jsx} from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'
import {corpus} from './corpus.mjs'
const {Markdown} = await import(new URL(process.env.LIL2_ARTIFACT ?? '../.dev/dist/react-markdown.js', import.meta.url))
const C = await import(new URL(process.env.LIL2_CONSTANTS ?? '../.dev/dist/constants.js', import.meta.url))

// lil2's API passes nodes as ids into `tree` (the hast columns) and names tags and properties by int id;
// upstream passes objects and strings. Each option set is written once per API with the same meaning.
const T = {kind: 0, tag: 4, start: 6, flags: 8, meta: 9, lineStarts: 16, tagNames: 17}
const H_ROOT = 0
const lineOf = (tree, offset) => { const starts = tree[T.lineStarts]; let low = 0, high = starts.length - 1; while (low < high) { const mid = (low + high + 1) >> 1; if (starts[mid] <= offset) low = mid; else high = mid - 1 } return low + 1 }
const upstreamComponents = {
  h2: function H2(props) { return jsx('h2', {id: 'line-' + props.node.position.start.line, children: props.children}) },
  a: function A(props) { return jsx('a', {href: props.href, title: props.title, rel: 'nofollow', children: props.children}) },
  img: function Img(props) { return jsx('img', {src: props.src, alt: props.alt, 'data-tag': props.node.tagName}) },
  code: function Code(props) { return jsx('code', {className: props.className, 'data-meta': props.node.data?.meta, children: props.children}) }
}
const lil2Components = [
  C.TAG_H2, function H2(props) { return jsx('h2', {id: 'line-' + lineOf(props.tree, props.tree[T.start][props.node]), children: props.children}) },
  C.TAG_A, upstreamComponents.a,
  C.TAG_IMG, function Img(props) { const {tree, node} = props; return jsx('img', {src: props.src, alt: props.alt, 'data-tag': tree[T.tagNames][tree[T.tag][node]]}) },
  C.TAG_CODE, function Code(props) { const {tree, node} = props; return jsx('code', {className: props.className, 'data-meta': tree[T.flags][node] & 2 ? tree[T.meta][node] : undefined, children: props.children}) }
]
const optionSets = [
  [{}, {}],
  [{skipHtml: true}, {skipHtml: true}],
  [{allowedElements: ['p', 'strong', 'em', 'a']}, {allowedElements: [C.TAG_P, C.TAG_STRONG, C.TAG_EM, C.TAG_A]}],
  [{allowedElements: ['p', 'strong', 'em', 'li', 'ul'], unwrapDisallowed: true}, {allowedElements: [C.TAG_P, C.TAG_STRONG, C.TAG_EM, C.TAG_LI, C.TAG_UL], unwrapDisallowed: true}],
  [{disallowedElements: ['a', 'img', 'h1'], unwrapDisallowed: true}, {disallowedElements: [C.TAG_A, C.TAG_IMG, C.TAG_H1], unwrapDisallowed: true}],
  [{disallowedElements: ['code', 'pre']}, {disallowedElements: [C.TAG_CODE, C.TAG_PRE]}],
  [{allowElement: (node, index, parent) => !(node.tagName === 'em' && index === 0) && parent.tagName !== 'blockquote'},
   {allowElement: (node, index, parent, tree) => !(tree[T.tag][node] === C.TAG_EM && index === 0) && tree[T.tag][parent] !== C.TAG_BLOCKQUOTE}],
  [{urlTransform: (url, key, node) => key + ':' + node.tagName + ':' + url},
   {urlTransform: (url, key, node, tree) => C.propNames[key] + ':' + tree[T.tagNames][tree[T.tag][node]] + ':' + url}],
  [{components: upstreamComponents}, {components: lil2Components}]
]

for (const [i, [options, lil2Options]] of optionSets.entries()) {
  test(`renders like react-markdown (option set ${i}: ${Object.keys(options).join(', ') || 'defaults'})`, () => {
    const failures = []
    for (const c of corpus()) {
      const expected = renderToStaticMarkup(jsx(Upstream, {...options, children: c.markdown}))
      let actual
      try {
        actual = renderToStaticMarkup(jsx(Markdown, {...lil2Options, children: c.markdown}))
      } catch (error) {
        actual = 'THREW ' + error.stack.split('\n').slice(0, 3).join(' | ')
      }
      if (actual !== expected) {
        let at = 0
        while (actual[at] === expected[at]) at++
        failures.push({name: c.name, markdown: c.markdown.slice(0, 120), expected: expected.slice(Math.max(0, at - 60), at + 120), actual: actual.slice(Math.max(0, at - 60), at + 120)})
      }
    }
    if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 3)}, null, 1))
    assert.equal(failures.length, 0)
  })
}

// Misuse renders as upstream's production build does (its devlop checks throw only in development).
test('misuse renders like react-markdown', () => {
  const render = (component, props) => { try { return renderToStaticMarkup(jsx(component, props)) } catch (error) { return 'THREW ' + error.message } }
  for (const children of [42, ['a'], undefined, null, 0, true, {}]) assert.equal(render(Markdown, {children}), render(Upstream, {children}))
  assert.equal(render(Markdown, {children: '*a* b', allowedElements: [C.TAG_P], disallowedElements: [C.TAG_P]}), render(Upstream, {children: '*a* b', allowedElements: ['p'], disallowedElements: ['p']}))
})
