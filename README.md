# @firestitch/resize

Resizable panels for Angular. A row or column of panels with draggable seams
between them — the sidebar-and-preview layout, the three-column editor, the
console over the terminal.

```
npm install @firestitch/resize --save
```

## Usage

```html
<fs-resize>
  <fs-resize-panel [size]="260" [min]="180">…tree…</fs-resize-panel>
  <fs-resize-panel>…preview…</fs-resize-panel>
</fs-resize>
```

Handles are not written by hand. Each panel renders the seam on its own leading
edge, so the markup is just the panels.

**Give at least one panel no `size`.** A panel that declares one is *fixed* — it
keeps its size while the container grows and shrinks. A panel without one is
*flexible* and absorbs the difference. With every panel fixed, resizing the
window has nowhere to put the change.

The container needs a height of its own. A row of panels is only as tall as
whatever contains it.

## `<fs-resize>`

| Input | Type | Default | |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | `horizontal` puts the panels side by side, `vertical` stacks them |
| `disabled` | `boolean` | `false` | Handles stay visible but stop responding |
| `step` | `number` | `10` | How far one arrow-key press moves a handle, in pixels |
| `persist` | `string \| null` | `null` | Remember the sizes under this key across reloads, via `FsStore` |

| Output | Type | |
|---|---|---|
| `sizesChange` | `(number \| null)[]` | Every panel's size after a drag; `null` for each flexible one |

## `<fs-resize-panel>`

| Input | Type | Default | |
|---|---|---|---|
| `size` | `number \| null` | `null` | Starting size in pixels along the container's axis. Omit it to make the panel flexible |
| `min` | `number` | `0` | |
| `max` | `number` | unbounded | |
| `resizable` | `boolean` | `true` | `false` removes this panel's leading handle, pinning it to its neighbour |
| `label` | `string` | `'Resize panel'` | Accessible name for the handle |

## Persistence

```html
<fs-resize persist="design-workspace">
```

Sizes are written through `FsStore` from `@firestitch/store`, so provide
`FsStoreModule.forRoot()` if you use this. Without `persist` the store is never
injected and the dependency is not needed.

A saved layout is discarded if the number of panels has changed since it was
written, so adding a panel cannot restore sizes onto the wrong ones.

## Keyboard

The handle is a `role="separator"` widget per the
[ARIA window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter),
reachable with Tab and reporting `aria-valuenow` / `aria-valuemin` /
`aria-valuemax` as it moves.

| Key | |
|---|---|
| `←` `→` (or `↑` `↓` when stacked) | Move by `step` |
| `Home` / `End` | Run to the panel's minimum / maximum |
| `Enter`, or double-click | Back to the declared `size` |

## Styling

The handle is a 1px line painted over the seam. Its grab zone and highlight are
drawn outside that box, so they cost the layout nothing and the panels meet edge
to edge. Restyle with the custom properties rather than by overriding the rules:

```scss
.fs-resize-handle {
  --fs-resize-handle-size: 1px;
  --fs-resize-handle-slop: 7px;            // how far either side is grabbable
  --fs-resize-handle-color: #dcdcdc;
  --fs-resize-handle-active-color: #2196f3;
  --fs-resize-handle-fade: 100ms;
  --fs-resize-handle-hover-delay: 150ms;
}
```

There is no stylesheet to import. The two rules that have to reach `<body>` — the
cursor and text selection pinned for the duration of a drag — ship with the
component.

## Nesting

A panel is an ordinary box, so it holds a whole second layout:

```html
<fs-resize>
  <fs-resize-panel [size]="220">…files…</fs-resize-panel>
  <fs-resize-panel>
    <fs-resize class="fill" orientation="vertical">
      <fs-resize-panel>…editor…</fs-resize-panel>
      <fs-resize-panel [size]="100">…problems…</fs-resize-panel>
    </fs-resize>
  </fs-resize-panel>
</fs-resize>
```

Give the inner container `width: 100%; height: 100%` so it fills the panel.
