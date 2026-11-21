/* =========================================================================
   TRUST NOTHING - core/tn.js
   -------------------------------------------------------------------------
   This is the "root" module. It creates one global object called TN and puts
   the boring-but-important things on it:

     1. Screen settings (how big the game canvas is, how big a tile is).
     2. The colour palette used by every level.
     3. A handful of tiny helper functions used everywhere else.

   Everything else in the project attaches itself to TN, for example
   TN.Player, TN.Camera, TN.TrapManager. That keeps file order simple and
   lets the game run straight from a double-clicked index.html.
   ========================================================================= */

window.TN = window.TN || {};

/* -------------------------------------------------------------------------
   1. Screen and world settings
   ------------------------------------------------------------------------- */

TN.VERSION    = '0.1.0-prototype';
TN.GAME_TITLE = 'TRUST NOTHING';

/* The internal resolution of the canvas. The canvas element is always
   480x270; CSS scales it up by a whole number. 480x270 is exactly 1/4 of
   1920x1080, so it fills modern screens without any letterboxing math. */
TN.VIEW_W = 480;
TN.VIEW_H = 270;

/* Everything in the world is measured in 16x16 pixel tiles. */
TN.TILE = 16;

/* The fixed physics step. We always advance the world in 1/60th of a second
   chunks, which makes jumping feel exactly the same on a 60Hz and a 144Hz
   monitor. */
TN.STEP = 1 / 60;

/* -------------------------------------------------------------------------
   2. Colour palette
   -------------------------------------------------------------------------
   A small, consistent palette keeps the whole game looking like one piece of
   art instead of five unrelated levels. */
TN.C = {
  /* Sky / background (level 1 is a dusk canyon at night). */
  sky0:      '#080a18',
  sky1:      '#171436',
  sky2:      '#33204a',
  sky3:      '#5a2f4e',
  star:      '#e8e4ff',
  hillFar:   '#241a3d',
  hillNear:  '#1a1230',
  cloud:     '#3b2a55',

  /* Terrain */
  dirt:      '#6b4a34',
  dirtDark:  '#4a3224',
  dirtLight: '#8a6244',
  grass:     '#4f9e4a',
  grassDark: '#357a36',
  rock:      '#5a5570',

  /* Player character */
  skin:      '#f2c49b',
  hair:      '#3a2a2a',
  shirt:     '#e0574f',
  shirtDark: '#a83c37',
  pants:     '#3f5c8a',
  shoe:      '#25242f',
  eye:       '#1b1b22',

  /* Objects */
  spike:     '#c9d2e0',
  spikeDark: '#7c8798',
  coin:      '#f5c542',
  coinDark:  '#c9922a',
  coinShine: '#fff3b0',
  gem:       '#b46cff',
  gemDark:   '#7a3fc0',
  gemShine:  '#e6c8ff',
  crate:     '#8a6a45',
  crateDark: '#5c452c',
  crusher:   '#77809c',
  crusherDk: '#4a5169',
  door:      '#2f8f6a',
  doorDark:  '#1d5c45',
  doorFake:  '#a8402f',
  doorFakeDk:'#6d271b',
  flag:      '#f0f0f0',
  flagOn:    '#5ad07a',
  flagOff:   '#6b6b7d',
  metal:     '#98a0b8',
  wood:      '#8a6a45',
  woodDark:  '#5c452c',

  /* UI */
  uiBg:      'rgba(8,8,18,0.78)',
  uiText:    '#eae6ff',
  uiDim:     '#9c94bb',
  uiGood:    '#6fe08a',
  uiBad:     '#ff6b6b',
  uiWarn:    '#ffcf5c',

  /* Death effects */
  blood:     '#d63a3a',
  bone:      '#e7e3d6',
  fire1:     '#ffd35c',
  fire2:     '#ff8a3d',
  fire3:     '#e0472f',
  smoke:     '#4a4458'
};

/* -------------------------------------------------------------------------
   3. Helper functions
   ------------------------------------------------------------------------- */
TN.utils = {

  /* Force a value to stay inside a range. */
  clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  },

  /* Blend from a to b. t = 0 gives a, t = 1 gives b. */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /* Move "current" towards "target" by at most "maxDelta".
     Used for smooth acceleration and deceleration. */
  approach(current, target, maxDelta) {
    if (current < target) return Math.min(current + maxDelta, target);
    if (current > target) return Math.max(current - maxDelta, target);
    return target;
  },

  /* Frame-rate independent smoothing. Instead of a fixed lerp amount we use
     an exponential curve so the result feels the same at any frame rate.
     "speed" is roughly "how quickly it catches up". */
  smooth(current, target, speed, dt) {
    return TN.utils.lerp(current, target, 1 - Math.exp(-speed * dt));
  },

  /* Do two rectangles overlap? Rectangles look like {x, y, w, h}. */
  aabb(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  },

  /* Is a point inside a rectangle? */
  pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  },

  /* -1, 0 or 1 depending on the sign of a number. */
  sign(v) {
    return v < 0 ? -1 : (v > 0 ? 1 : 0);
  },

  /* A whole number between min and max, both included. */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /* A decimal number between min and max. */
  randRange(min, max) {
    return min + Math.random() * (max - min);
  },

  /* Fairly-pick a random item from an array, but avoid the ones in "avoid".
     This is what stops the death messages from repeating themselves. */
  pickFresh(list, avoid) {
    if (!list || list.length === 0) return '';
    if (!avoid || avoid.length === 0) {
      return list[Math.floor(Math.random() * list.length)];
    }
    const fresh = list.filter(function (item) { return avoid.indexOf(item) === -1; });
    const pool = fresh.length > 0 ? fresh : list;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  /* Deterministic pseudo-random number based on tile coordinates.
     Same input = same output, which lets us make dirt look "randomly" speckled
     without storing anything or flickering from frame to frame. */
  hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  },

  /* Format seconds as M:SS, used by the HUD timer. */
  formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  },

  /* Draw one solid pixel rectangle. Nearly all game art is made of these. */
  rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
};
