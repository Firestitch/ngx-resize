/**
 * How the panels are laid out inside `<fs-resize>`.
 *
 * `horizontal` puts them side by side and the seams between them are dragged
 * left/right; `vertical` stacks them and the seams are dragged up/down.
 */
export type FsResizeOrientation = 'horizontal' | 'vertical';

/**
 * Which side of a box a handle sits on.
 *
 * Used two ways. A panel puts one on the edge that faces its neighbour, so the
 * seam belongs to neither of them. `[fsResizeEdge]` puts one on the outside of a
 * single element that has no neighbour to trade with — a side nav against the
 * page, a drawer against the window — and drags that element's own size.
 */
export type FsResizeEdge = 'left' | 'right' | 'top' | 'bottom';

/** The axis an edge is dragged along. */
export function resizeEdgeOrientation(edge: FsResizeEdge): FsResizeOrientation {
  return edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical';
}
