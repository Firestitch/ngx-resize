import { FsResizeOrientation } from '../types/resize-orientation.type';


/**
 * What the container needs from a panel to do its sizing math.
 *
 * Declared here rather than importing the panel component because the container
 * already imports the panel (to query its content children). Going back the
 * other way for the concrete class would make the two files circular.
 */
export interface IFsResizePanel {
  /** The panel's own element, measured along the container's axis. */
  readonly element: HTMLElement;

  /** The size the panel was declared with, and the one `reset` goes back to. */
  size(): number | null;
  min(): number;
  max(): number;
  resizable(): boolean;

  /**
   * The panel's size right now, or `null` while it is flexible — i.e. it has no
   * size of its own and is absorbing whatever the fixed panels leave over.
   */
  currentSize(): number | null;
  setSize(size: number | null): void;

  /** Drop back to the declared `size`, whatever dragging has done since. */
  reset(): void;

  /** The panel's rendered size along the container's axis. */
  measure(): number;
}

/** The three values `role="separator"` reports for a handle. */
export interface IFsResizeHandleAria {
  now: number;
  min: number;
  max: number;
}

/**
 * The container's surface, as an injection token.
 *
 * A panel renders its own leading handle and hands drag deltas back up here,
 * because the boundary between two panels belongs to neither of them — only the
 * container knows what sits on the other side of it.
 */
export abstract class FsResizeContainer {

  public abstract orientation(): FsResizeOrientation;

  public abstract disabled(): boolean;

  /** How far one arrow-key press moves a handle, in pixels. */
  public abstract step(): number;

  /** False for the first panel, which has nothing before it to resize against. */
  public abstract hasHandle(panel: IFsResizePanel): boolean;

  public abstract handleAria(panel: IFsResizePanel): IFsResizeHandleAria;

  public abstract dragStart(panel: IFsResizePanel): void;

  /** @param delta Pixels moved along the axis since `dragStart`. */
  public abstract dragMove(panel: IFsResizePanel, delta: number): void;

  public abstract dragEnd(): void;

  /** Put the two panels either side of this handle back to their declared sizes. */
  public abstract dragReset(panel: IFsResizePanel): void;

}
