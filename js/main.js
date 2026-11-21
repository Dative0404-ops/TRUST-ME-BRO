/* =========================================================================
   TRUST NOTHING - main.js
   -------------------------------------------------------------------------
   The bootstrap: the smallest possible file that gets the game running.

   It does four things:
     1. finds the canvas and tells it to keep pixels hard-edged,
     2. starts the keyboard listener,
     3. creates the Game,
     4. runs the main loop.

   The loop uses a FIXED TIMESTEP. Physics always advances in 1/60 second
   chunks no matter how fast the monitor is, so a 144Hz screen plays exactly
   the same as a 60Hz one. If the browser is slow and a frame takes longer
   than one chunk, we run the step more than once to catch up (up to a cap,
   so a background tab that has been asleep for a minute cannot freeze the
   game while it simulates thousands of frames).
   ========================================================================= */

(function () {
  'use strict';

  function boot() {
    var canvas = document.getElementById('game');
    if (!canvas) {
      console.error('TRUST NOTHING: could not find <canvas id="game">.');
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('TRUST NOTHING: this browser does not support canvas 2D.');
      return;
    }

    /* Never interpolate between pixels - that is what keeps the art crisp. */
    ctx.imageSmoothingEnabled = false;

    /* ----- Fit the canvas to the window -----
       The canvas is always drawn at 480x270 internally. Here we work out the
       largest WHOLE number (1x, 2x, 3x, ...) that fits the window and let CSS
       do the scaling. A whole number keeps every pixel a perfect square, so
       the art stays sharp instead of turning into blurry mush. The canvas
       itself never changes size, so no drawing code has to know about this. */
    function fitToWindow() {
      var scale = Math.max(1, Math.floor(Math.min(
        window.innerWidth / TN.VIEW_W,
        window.innerHeight / TN.VIEW_H
      )));
      canvas.style.width = (TN.VIEW_W * scale) + 'px';
      canvas.style.height = (TN.VIEW_H * scale) + 'px';
    }

    fitToWindow();
    window.addEventListener('resize', fitToWindow);

    /* Start listening for keys. */
    TN.Input.init();

    /* Build the game. The Game constructor loads level 1 and positions the
       player, so after this line everything is ready to be drawn. */
    var game = new TN.Game(ctx, canvas);

    /* The most physics steps we will run in a single frame. Without a cap, a
       long stall would trigger a spiral where each frame takes longer than
       the last. Five steps is 1/12th of a second of catch-up. */
    var MAX_STEPS_PER_FRAME = 5;

    var lastTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    var accumulator = 0;

    function frame(now) {
      /* Seconds since the previous frame. */
      var elapsed = (now - lastTime) / 1000;
      lastTime = now;

      /* If the tab was in the background, do not simulate the gap. */
      if (elapsed > 0.25) elapsed = 0.25;

      accumulator += elapsed;

      var steps = 0;
      while (accumulator >= TN.STEP && steps < MAX_STEPS_PER_FRAME) {
        game.update(TN.STEP);
        accumulator -= TN.STEP;
        steps += 1;

        /* Clear the one-frame "just pressed / just released" input flags
           after a step has consumed them. Doing it here (rather than once
           per frame) means a key press can never be swallowed twice by two
           physics steps in the same frame.

           Important: if NO step ran this frame, we deliberately do NOT clear
           the flags, so a press made during a very short frame is still
           waiting for us next time round. */
        TN.Input.endFrame();
      }

      /* Too far behind to catch up? Throw away the backlog. */
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

      /* Draw once per frame, no matter how many physics steps ran. */
      game.render();

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* The scripts are loaded at the end of <body>, so the document is almost
     always ready already. We still check, to be safe. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
