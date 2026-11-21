/* =========================================================================
   TRUST NOTHING - core/player.js
   -------------------------------------------------------------------------
   The player character. Everything about the little red-shirted guy lives
   here: how he moves, how he jumps, how many jumps he has left, his health,
   his animation state and how he is drawn.

   Things this file deliberately does NOT do:
     - It does not decide that the player died. The game sees a spike overlap
       and asks the Death Manager to kill him.
     - It does not move the camera.
     - It does not reset the level.
   Keeping those out of here is what keeps the file short enough to read.

   Movement tools used:
     TN.Input      - keyboard
     TN.Physics    - the tuning numbers (gravity, speeds)
     TN.Collision  - turning velocity into "stop at the wall" behaviour
   ========================================================================= */

TN.Player = function (x, y) {
  /* --- position and size (the box everything else is measured from) --- */
  this.x = x;
  this.y = y;
  this.w = 12;
  this.h = 16;

  /* --- motion --- */
  this.vx = 0;
  this.vy = 0;
  this.facing = 1;          /* 1 = right, -1 = left */

  /* --- jumping bookkeeping --- */
  this.onGround = false;
  this.jumpsLeft = TN.Physics.MAX_JUMPS;
  this.coyote = 0;          /* seconds of "I only just left the ledge" left */
  this.jumpBuffer = 0;      /* seconds of "I pressed jump slightly too early" left */
  this.jumpCutUsed = false; /* has this jump already been shortened? */

  /* --- health --- */
  this.maxHealth = 3;
  this.health = 3;
  this.invulnerable = 0;    /* seconds of invulnerability after taking a hit */

  /* --- state used by the renderer --- */
  this.alive = true;
  this.state = 'idle';      /* idle | run | jump | fall | hurt */
  this.animTime = 0;
  this.wasOnGround = false;
  this.landedThisFrame = false;

  /* Flags for whatever we bumped into this step (set by the collision code). */
  this.collided = { left: false, right: false, top: false, bottom: false };

  /* Where this player started, so "reset" always means the same thing. */
  this.spawnX = x;
  this.spawnY = y;
};

TN.Player.prototype = {

  /* -----------------------------------------------------------------------
     Put the player back to a known-good state at a given position.
     Used on respawn. Note that health is restored and all momentum is wiped.
     ----------------------------------------------------------------------- */
  reset: function (x, y) {
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumpsLeft = TN.Physics.MAX_JUMPS;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCutUsed = false;
    this.alive = true;
    this.health = this.maxHealth;
    this.invulnerable = 0;
    this.state = 'idle';
    this.animTime = 0;
  },

  /* The centre of the player, handy for effects and camera work. */
  centreX: function () { return this.x + this.w / 2; },
  centreY: function () { return this.y + this.h / 2; },

  /* -----------------------------------------------------------------------
     One fixed physics step.
     ----------------------------------------------------------------------- */
  update: function (dt, map) {
    if (!this.alive) return;

    this.animTime += dt;
    this.wasOnGround = this.onGround;

    /* Timers that always tick down. */
    if (this.invulnerable > 0) this.invulnerable -= dt;

    /* -------------------------------------------------------------------
       1. Horizontal movement
       ------------------------------------------------------------------- */
    var dir = 0;
    if (TN.Input.action('right')) dir += 1;
    if (TN.Input.action('left')) dir -= 1;

    var running = TN.Input.action('run');
    var topSpeed = running ? TN.Physics.RUN_SPEED : TN.Physics.WALK_SPEED;

    if (dir !== 0) {
      var accel = this.onGround ? TN.Physics.GROUND_ACCEL : TN.Physics.AIR_ACCEL;
      TN.Physics.applyHorizontal(this, dir * topSpeed, accel, dt);
      this.facing = dir;
    } else {
      /* No input: slide to a stop. Much slower in the air, which is what
         makes mid-air adjustments possible. */
      var friction = this.onGround ? TN.Physics.GROUND_FRICTION : TN.Physics.AIR_FRICTION;
      TN.Physics.applyHorizontal(this, 0, friction, dt);
    }

    /* -------------------------------------------------------------------
       2. Gravity
       While the jump key is held and we are still moving upwards the gravity
       is reduced, which is the classic "hold jump to go higher" feel.
       ------------------------------------------------------------------- */
    var holdingJump = TN.Input.action('jump');
    TN.Physics.applyGravity(this, dt, holdingJump && this.vy < 0);

    /* -------------------------------------------------------------------
       3. Jumping (ground jump + one air jump)
       ------------------------------------------------------------------- */
    if (this.onGround) {
      /* Standing on something: full set of jumps available again. */
      this.jumpsLeft = TN.Physics.MAX_JUMPS;
      this.coyote = TN.Physics.COYOTE_TIME;
    } else {
      this.coyote -= dt;
      /* Walking off a ledge without jumping uses up the ground jump but
         leaves the air jump, so you never feel robbed of a jump. */
      if (this.jumpsLeft === TN.Physics.MAX_JUMPS && this.coyote <= 0) {
        this.jumpsLeft = TN.Physics.MAX_JUMPS - 1;
      }
    }

    /* Remember a jump press for a moment so slightly-early presses still work
       when the player hits the ground. */
    if (TN.Input.actionPressed('jump')) {
      this.jumpBuffer = TN.Physics.JUMP_BUFFER;
    } else if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
    }

    if (this.jumpBuffer > 0 && this.jumpsLeft > 0) {
      var isGroundJump = this.jumpsLeft === TN.Physics.MAX_JUMPS;
      var isFromLedge = this.coyote > 0;

      this.vy = (isGroundJump && isFromLedge)
        ? TN.Physics.JUMP_VELOCITY
        : TN.Physics.DOUBLE_JUMP_VELOCITY;

      this.jumpsLeft -= 1;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.onGround = false;
      this.jumpCutUsed = false;

      if (isGroundJump && isFromLedge) {
        /* Dust puff from the ground jump. */
        TN.FX.burst(this.centreX(), this.y + this.h, 5, {
          colors: ['#b9a48d', '#8a7a68', '#d8cbb6'],
          speedMin: 20, speedMax: 70, gravity: 400,
          lifeMin: 0.18, lifeMax: 0.35, size: 2, angle: -Math.PI / 2, spread: 2.4
        });
      } else {
        /* A little white ring in mid air, so the double jump reads clearly. */
        TN.FX.burst(this.centreX(), this.y + this.h / 2, 7, {
          colors: ['#ffffff', '#cfd8ff', '#9fb0e8'],
          speedMin: 30, speedMax: 90, gravity: 120,
          lifeMin: 0.15, lifeMax: 0.3, size: 2
        });
      }
    }

    /* Variable jump height: letting go of the button early cuts the rise. */
    if (TN.Input.actionReleased('jump') && this.vy < 0 && !this.jumpCutUsed) {
      this.vy *= TN.Physics.JUMP_CUT;
      this.jumpCutUsed = true;
    }

    /* -------------------------------------------------------------------
       4. Move, and resolve every collision on the way
       ------------------------------------------------------------------- */
    var flags = TN.Collision.moveAndCollide(this, dt, map);
    this.onGround = flags.bottom;

    /* Did we just land this step? Used for the landing dust and by the Trap
       Manager to trigger crumbling platforms. */
    this.landedThisFrame = this.onGround && !this.wasOnGround;
    if (this.landedThisFrame) {
      var impact = Math.min(1, Math.abs(this.vy) / 500);
      TN.FX.burst(this.centreX(), this.y + this.h, 3, {
        colors: ['#b9a48d', '#8a7a68'],
        speedMin: 15, speedMax: 60, gravity: 500,
        lifeMin: 0.12, lifeMax: 0.3, size: 2, angle: -Math.PI / 2, spread: 2.2
      });
      if (impact > 0.2) this.jumpCutUsed = true;
    }

    /* -------------------------------------------------------------------
       5. Pick the pose the renderer should use
       ------------------------------------------------------------------- */
    if (!this.onGround) {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(this.vx) > 12) {
      this.state = 'run';
    } else {
      this.state = 'idle';
    }
  },

  /* -----------------------------------------------------------------------
     Take a non-fatal hit. Returns true if the hit actually landed (it can be
     ignored while the player is still invulnerable).
     "sourceX" is where the hit came from, so we knock the player away.
     ----------------------------------------------------------------------- */
  takeDamage: function (amount, sourceX) {
    if (!this.alive) return false;
    if (this.invulnerable > 0) return false;

    this.health -= amount;
    this.invulnerable = TN.Physics.INVULNERABLE_TIME;
    this.state = 'hurt';

    var away = this.centreX() < sourceX ? -1 : 1;
    this.vx = away * TN.Physics.HIT_KNOCKBACK_X;
    this.vy = TN.Physics.HIT_KNOCKBACK_Y;
    this.onGround = false;

    TN.FX.burst(this.centreX(), this.centreY(), 10, {
      colors: [TN.C.blood, '#ff8a8a', '#8a2020'],
      speedMin: 40, speedMax: 150, lifeMin: 0.25, lifeMax: 0.55, size: 2
    });

    return this.health <= 0 ? 'dead' : true;
  },

  /* Heal back to full. Used when a checkpoint is activated, so far-apart
     checkpoints are not a death sentence for your health bar. */
  heal: function () {
    this.health = this.maxHealth;
  },

  /* -----------------------------------------------------------------------
     Drawing
     ----------------------------------------------------------------------- */

  /* Draw the player in world space. The Death Manager draws the player
     itself during a death animation, so this is only called while alive.
     It is also called with an alpha and rotation of 0 by other systems. */
  draw: function (ctx, cam) {
    if (!this.alive) return;

    /* Blink while invulnerable so the player can see they are protected.
       The blink is a square wave, not a fade, which reads better at 480x270. */
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 16) % 2 === 0) {
      return;
    }

    this.drawCharacter(
      ctx,
      Math.round(this.x - cam.x + cam.offsetX),
      Math.round(this.y - cam.y + cam.offsetY),
      this.state,
      this.animTime,
      this.facing
    );
  },

  /* ---------------------------------------------------------------------
     The actual pixel art of the character, drawn as a pile of rectangles.
     Kept separate from draw() so the Death Manager can reuse it (for example
     to draw a spinning, falling version of the same character).

     x, y     : top-left corner on screen
     state    : idle | run | jump | fall | hurt
     animTime : seconds, used to pick the walk frame
     facing   : 1 = right, -1 = left
     --------------------------------------------------------------------- */
  drawCharacter: function (ctx, x, y, state, animTime, facing) {
    var R = TN.utils.rect;
    var skin = TN.C.skin, hair = TN.C.hair, shirt = TN.C.shirt;
    var shirtDark = TN.C.shirtDark, pants = TN.C.pants, shoe = TN.C.shoe;

    /* Whole-body offsets used to bring the poses to life. */
    var bodyBob = 0;
    var legPose = 0;   /* which walk frame */
    var armLift = 0;

    if (state === 'idle') {
      /* Gentle 1 pixel breathing bob. */
      bodyBob = (Math.floor(animTime * 2.5) % 2) ? 0 : 1;
    } else if (state === 'run') {
      /* 4 frame walk cycle at roughly 12 frames per second. */
      legPose = Math.floor(animTime * 12) % 4;
      bodyBob = (legPose === 1 || legPose === 3) ? 1 : 0;
    } else if (state === 'jump') {
      legPose = -1;   /* tucked */
      armLift = -2;   /* arms up */
    } else if (state === 'fall') {
      legPose = -2;   /* spread */
      armLift = -1;
    }

    var top = y + bodyBob;

    /* ---- head ---- */
    /* Hair sits behind, then the face on top of it. */
    R(ctx, x + 2, top, 8, 3, hair);
    R(ctx, x + 1, top + 1, 10, 2, hair);
    R(ctx, x + 2, top + 2, 8, 5, skin);

    /* ---- eyes (shifted by 1 pixel so you can tell which way he faces) ---- */
    var eyeShift = facing > 0 ? 1 : -1;
    R(ctx, x + 4 + eyeShift, top + 4, 2, 2, TN.C.eye);
    R(ctx, x + 8 + eyeShift, top + 4, 2, 2, TN.C.eye);

    /* ---- torso ---- */
    R(ctx, x + 2, top + 7, 8, 5, shirt);
    R(ctx, x + 2, top + 11, 8, 1, shirtDark);

    /* ---- arms (offset by armLift so they swing / raise) ---- */
    R(ctx, x + 0, top + 7 + armLift, 2, 4, shirt);
    R(ctx, x + 10, top + 7 - armLift, 2, 4, shirt);
    /* little hands */
    R(ctx, x + 0, top + 10 + armLift, 2, 1, skin);
    R(ctx, x + 10, top + 10 - armLift, 2, 1, skin);

    /* ---- legs ---- */
    if (legPose === -1) {
      /* Jumping: knees tucked up. */
      R(ctx, x + 2, top + 12, 3, 3, pants);
      R(ctx, x + 7, top + 12, 3, 3, pants);
      R(ctx, x + 1, top + 14, 4, 2, shoe);
      R(ctx, x + 7, top + 14, 4, 2, shoe);
    } else if (legPose === -2) {
      /* Falling: legs pushed apart, like a cartoon plummet. */
      R(ctx, x + 1, top + 12, 3, 4, pants);
      R(ctx, x + 8, top + 12, 3, 4, pants);
      R(ctx, x + 1, top + 15, 4, 1, shoe);
      R(ctx, x + 8, top + 15, 3, 1, shoe);
    } else if (legPose === 1) {
      /* Left leg lifted. */
      R(ctx, x + 3, top + 12, 3, 3, pants);
      R(ctx, x + 7, top + 12, 3, 4, pants);
      R(ctx, x + 2, top + 14, 4, 2, shoe);
      R(ctx, x + 7, top + 15, 3, 1, shoe);
    } else if (legPose === 3) {
      /* Right leg lifted. */
      R(ctx, x + 2, top + 12, 3, 4, pants);
      R(ctx, x + 7, top + 12, 3, 3, pants);
      R(ctx, x + 2, top + 15, 3, 1, shoe);
      R(ctx, x + 7, top + 14, 4, 2, shoe);
    } else if (legPose === 2) {
      /* Both feet down, one slightly forward. */
      R(ctx, x + 1, top + 12, 3, 4, pants);
      R(ctx, x + 8, top + 12, 3, 4, pants);
      R(ctx, x + 1, top + 15, 4, 1, shoe);
      R(ctx, x + 8, top + 15, 3, 1, shoe);
    } else {
      /* Standing / default. */
      R(ctx, x + 3, top + 12, 3, 4, pants);
      R(ctx, x + 7, top + 12, 3, 4, pants);
      R(ctx, x + 2, top + 15, 4, 1, shoe);
      R(ctx, x + 7, top + 15, 4, 1, shoe);
    }
  }
};
