/**
 * dd-resizable-handle.ts 12.2.2-dev
 * Copyright (c) 2021-2024  Alain Dumesny - see GridStack root license
 */

import { isTouch, pointerdown, touchend, touchmove, touchstart } from './dd-touch';
import { GridItemHTMLElement } from './gridstack';

export interface DDResizableHandleOpt {
  start?: (event) => void;
  move?: (event) => void;
  stop?: (event) => void;
}

export class DDResizableHandle {
  /** @internal */
  protected el: HTMLElement;
  /** @internal true after we've moved enough pixels to start a resize */
  protected moving = false;
  /** @internal */
  protected mouseDownEvent: MouseEvent;
  /** @internal */
  protected static prefix = 'ui-resizable-';

  constructor(protected host: GridItemHTMLElement, protected dir: string, protected option: DDResizableHandleOpt) {
    // create var event binding so we can easily remove and still look like TS methods (unlike anonymous functions)
    this._mouseDown = this._mouseDown.bind(this);
    this._mouseMove = this._mouseMove.bind(this);
    this._mouseUp = this._mouseUp.bind(this);
    this._keyEvent = this._keyEvent.bind(this);

    this._init();
  }

  /** @internal */
  protected _init(): DDResizableHandle {
    const el = this.el = document.createElement('div');
    el.classList.add('ui-resizable-handle');
    el.classList.add(`${DDResizableHandle.prefix}${this.dir}`);
    el.style.zIndex = '100';
    el.style.userSelect = 'none';
    this.host.appendChild(this.el);
    this.el.addEventListener('mousedown', this._mouseDown);
    if (isTouch) {
      this.el.addEventListener('touchstart', touchstart);
      this.el.addEventListener('pointerdown', pointerdown);
      // this.el.style.touchAction = 'none'; // not needed unlike pointerdown doc comment
    }
    return this;
  }

  /** call this when resize handle needs to be removed and cleaned up */
  public destroy(): DDResizableHandle {
    if (this.moving) this._mouseUp(this.mouseDownEvent);
    this.el.removeEventListener('mousedown', this._mouseDown);
    if (isTouch) {
      this.el.removeEventListener('touchstart', touchstart);
      this.el.removeEventListener('pointerdown', pointerdown);
    }
    this.host.removeChild(this.el);
    delete this.el;
    delete this.host;
    return this;
  }

  /** @internal called on mouse down on us: capture move on the entire document (mouse might not stay on us) until we release the mouse */
  protected _mouseDown(e: MouseEvent): void {
    this.mouseDownEvent = e;
    document.addEventListener('mousemove', this._mouseMove, { capture: true, passive: true}); // capture, not bubble
    document.addEventListener('mouseup', this._mouseUp, true);
    if (isTouch) {
      this.el.addEventListener('touchmove', touchmove);
      this.el.addEventListener('touchend', touchend);
    }
    e.stopPropagation();
    e.preventDefault();
  }

  /** @internal */
  protected _mouseMove(e: MouseEvent): void {
    const s = this.mouseDownEvent;
    if (this.moving) {
      this._triggerEvent('move', e);
    } else if (Math.abs(e.x - s.x) + Math.abs(e.y - s.y) > 2) {
      // don't start unless we've moved at least 3 pixels
      this.moving = true;
      this._triggerEvent('start', this.mouseDownEvent);
      this._triggerEvent('move', e);
      // now track keyboard events to cancel
      document.addEventListener('keydown', this._keyEvent);
    }
    e.stopPropagation();
    // e.preventDefault(); passive = true
  }

  /** @internal */
  protected _mouseUp(e: MouseEvent): void {
    if (this.moving) {
      this._triggerEvent('stop', e);
      document.removeEventListener('keydown', this._keyEvent);
    }
    document.removeEventListener('mousemove', this._mouseMove, true);
    document.removeEventListener('mouseup', this._mouseUp, true);
    if (isTouch) {
      this.el.removeEventListener('touchmove', touchmove);
      this.el.removeEventListener('touchend', touchend);
    }
    delete this.moving;
    delete this.mouseDownEvent;
    e.stopPropagation();
    e.preventDefault();
  }

  /** @internal call when keys are being pressed - use Esc to cancel */
  protected _keyEvent(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.host.gridstackNode?.grid?.engine.restoreInitial();
      this._mouseUp(this.mouseDownEvent);
    }
  }



  /** @internal */
  protected _triggerEvent(name: string, event: MouseEvent): DDResizableHandle {
    if (this.option[name]) this.option[name](event);
    return this;
  }
}
