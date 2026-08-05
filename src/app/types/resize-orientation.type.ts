/**
 * How the panels are laid out inside `<fs-resize>`.
 *
 * `horizontal` puts them side by side and the handles between them are dragged
 * left/right; `vertical` stacks them and the handles are dragged up/down.
 *
 * Note this names the LAYOUT, not the handle. ARIA names the separator itself,
 * so a horizontal layout reports `aria-orientation="vertical"` — the handle
 * component does that conversion rather than leaving it to callers.
 */
export type FsResizeOrientation = 'horizontal' | 'vertical';
