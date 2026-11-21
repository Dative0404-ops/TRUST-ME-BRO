/* =========================================================================
   TRUST NOTHING - core/physics.js
   -------------------------------------------------------------------------
   The physics "rules of the universe". These numbers are what decide whether
   the game feels tight and responsive or floaty and horrible, so they are
   collected in one place instead of being scattered through the code.

   All speeds are in pixels per SECOND and all accelerations are in pixels
   per second squared, which makes the numbers easy to reason about.

   The player is 12x16 pixels and a tile is 16x16, so:
     - a jump of about 65px clears just over 4 tiles,
     - running at 215 px/s crosses about 6 tiles before landing.
   Level 1 is designed around those two facts.
   ========================================================================= */

TN.Physics = {

  /* -----------------------------------------------------------------------
     Global gravity settings
     ----------------------------------------------------------------------- */

  /* How hard things are pulled down. Higher = snappier, less floaty. */
  GRAVITY: 2400,

  /* Terminal velocity. Prevents falling so fast that collision could ever
     miss a tile, and stops long falls from feeling out of control. */
  MAX_FALL: 900,

  /* Gravity multiplier while the jump button is being held and the player is
     still rising. Values below 1 give a slightly "floatier" arc at the top of
     the jump, which players read as "the jump feels good". */
  JUMP_HOLD_GRAVITY: 0.72,

  /* -----------------------------------------------------------------------
     Player tuning
     ----------------------------------------------------------------------- */

  WALK_SPEED: 150,          /* px/s when walking */
  RUN_SPEED: 215,           /* px/s when holding Shift */
  GROUND_ACCEL: 1500,       /* how quickly we reach top speed on the ground */
  AIR_ACCEL: 950,           /* in the air we have less control */
  GROUND_FRICTION: 2000,    /* how quickly we stop on the ground */
  AIR_FRICTION: 420,        /* in the air we keep our momentum */

  /* Upward launch speeds. Remember: in canvas coordinates negative Y is UP. */
  JUMP_VELOCITY: -560,
  DOUBLE_JUMP_VELOCITY: -480,

  /* Small quality-of-life windows that make a platformer feel fair. */
  COYOTE_TIME: 0.09,        /* you can still jump this long after walking off a ledge */
  JUMP_BUFFER: 0.10,        /* pressing jump this early still counts when you land */
  JUMP_CUT: 0.45,           /* release jump early -> upward speed is cut to this fraction */
  MAX_JUMPS: 2,             /* ground jump + one air jump */

  /* How much knockback a hit gives, and how long the player is invulnerable
     afterwards. Used by the health system for small hits. */
  HIT_KNOCKBACK_X: 180,
  HIT_KNOCKBACK_Y: -260,
  INVULNERABLE_TIME: 1.1,

  /* -----------------------------------------------------------------------
     Helper functions
     ----------------------------------------------------------------------- */

  /* Pull a body downwards for one step.
     "lighten" is used while the jump button is held on the way up. */
  applyGravity: function (body, dt, lighten) {
    var g = TN.Physics.GRAVITY;
    if (lighten) g *= TN.Physics.JUMP_HOLD_GRAVITY;

    body.vy += g * dt;

    /* Never fall faster than the terminal velocity. */
    if (body.vy > TN.Physics.MAX_FALL) body.vy = TN.Physics.MAX_FALL;
  },

  /* Speed up towards a target sideways speed, or slow down towards zero.
     Having this as one function is what makes both walking and stopping feel
     like the same character. */
  applyHorizontal: function (body, targetSpeed, accel, dt) {
    var delta = targetSpeed - body.vx;
    var maxChange = accel * dt;
    if (delta > maxChange) body.vx += maxChange;
    else if (delta < -maxChange) body.vx -= maxChange;
    else body.vx = targetSpeed;
  }
};
