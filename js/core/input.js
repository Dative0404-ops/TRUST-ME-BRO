/* =========================================================================
   TRUST NOTHING - core/input.js
   -------------------------------------------------------------------------
   All keyboard handling lives here.

   Two important details:

   1. We listen on the window so the game still reacts when the canvas is not
      focused, and we call preventDefault() on the keys we use. Without that,
      the page would scroll every time somebody presses the space bar.

   2. We track three states for every action:
        - down    : held right now
        - pressed : went down during this frame (a single-frame "tap")
        - released: came back up during this frame

      The pressed/released sets are cleared at the very end of each frame by
      endFrame(), which is why the game loop must call it exactly once.
   ========================================================================= */

TN.Input = (function () {

  /* Which physical keys map to which game action. Every action accepts
     several keys so players can use arrows, WASD, or a mix. */
  var ACTIONS = {
    left:    ['ArrowLeft', 'KeyA'],
    right:   ['ArrowRight', 'KeyD'],
    up:      ['ArrowUp', 'KeyW'],
    down:    ['ArrowDown', 'KeyS'],
    jump:    ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
    run:     ['ShiftLeft', 'ShiftRight'],
    pause:   ['Escape', 'KeyP'],
    restart: ['KeyR'],
    confirm: ['Enter', 'Space', 'NumpadEnter'],
    debug:   ['Backquote']
  };

  /* Keys whose default browser behaviour we always want to block. */
  var BLOCK = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'];

  var down = {};        /* keyCode -> true while held */
  var pressed = {};     /* keyCode -> true for the frame it went down */
  var released = {};    /* keyCode -> true for the frame it came up */

  /* Used by the debug overlay so we can show "last key seen". */
  var lastKey = '';

  /* Is any of the keys for this action currently held? */
  function action(name) {
    var keys = ACTIONS[name];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) {
      if (down[keys[i]]) return true;
    }
    return false;
  }

  /* Did this action start during the current frame? */
  function actionPressed(name) {
    var keys = ACTIONS[name];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) {
      if (pressed[keys[i]]) return true;
    }
    return false;
  }

  /* Did this action stop during the current frame? */
  function actionReleased(name) {
    var keys = ACTIONS[name];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) {
      if (released[keys[i]]) return true;
    }
    return false;
  }

  /* Raw access, handy for the debug overlay. */
  function isDown(code) {
    return !!down[code];
  }

  function onKeyDown(e) {
    lastKey = e.code;

    if (BLOCK.indexOf(e.code) !== -1) e.preventDefault();

    /* Ignore the auto-repeat that the OS sends while a key is held. We only
       want the very first press so jump buffering works correctly. */
    if (down[e.code]) return;

    down[e.code] = true;
    pressed[e.code] = true;
  }

  function onKeyUp(e) {
    if (BLOCK.indexOf(e.code) !== -1) e.preventDefault();
    down[e.code] = false;
    released[e.code] = true;
  }

  /* If the window loses focus, release everything. Otherwise the player
     would keep running to the right forever after an alt-tab. */
  function releaseAll() {
    for (var key in down) {
      if (down[key]) {
        down[key] = false;
        released[key] = true;
      }
    }
  }

  function init() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
  }

  /* Called at the END of each frame to clear the one-frame flags. */
  function endFrame() {
    pressed = {};
    released = {};
  }

  return {
    ACTIONS: ACTIONS,
    init: init,
    action: action,
    actionPressed: actionPressed,
    actionReleased: actionReleased,
    isDown: isDown,
    endFrame: endFrame,
    releaseAll: releaseAll,
    lastKey: function () { return lastKey; }
  };
})();
