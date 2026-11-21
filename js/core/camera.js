/* =========================================================================
   TRUST NOTHING - core/camera.js
   -------------------------------------------------------------------------
   The camera is the window into the level. It has three jobs:

     1. Follow the player smoothly instead of snapping around.
     2. Never show anything outside the level (clamped to the world bounds).
     3. Shake when something violent happens, because that is fun.

   The camera keeps two values:
     - x, y         : the final position INCLUDING shake (use these to draw)
     - offsetX/Y    : the shake component on its own
   ========================================================================= */

TN.Camera = function (worldWidth, worldHeight) {
  this.worldW = worldWidth;
  this.worldH = worldHeight;

  /* Where the camera actually is, in world pixels. */
  this.x = 0;
  this.y = 0;

  /* Shake offset applied on top of x / y. */
  this.offsetX = 0;
  this.offsetY = 0;

  /* How long (seconds) and how hard (pixels) we are currently shaking. */
  this.shakeTime = 0;
  this.shakeTimer = 0;
  this.shakeMagnitude = 0;

  /* Look-ahead: the camera leans slightly in the direction the player is
     running, so you can see more of what is coming. */
  this.lookAhead = 0;
};

TN.Camera.prototype = {

  /* Maximum camera position. If the level is smaller than the screen on an
     axis, lock the camera at 0 so we never show the void around the edges. */
  maxX: function () {
    return Math.max(0, this.worldW - TN.VIEW_W);
  },

  maxY: function () {
    return Math.max(0, this.worldH - TN.VIEW_H);
  },

  /* Jump the camera straight to the target with no smoothing. Used when the
     player respawns so the screen does not fly across the level. */
  snapTo: function (target) {
    this.x = TN.utils.clamp(
      target.x + target.w / 2 - TN.VIEW_W / 2,
      0, this.maxX()
    );
    this.y = TN.utils.clamp(
      target.y + target.h / 2 - TN.VIEW_H * 0.58,
      0, this.maxY()
    );
    this.lookAhead = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  },

  /* Called once per frame while the level is being played. */
  follow: function (target, dt) {
    /* --- work out where the camera WANTS to be --- */

    /* Lean up to 26 pixels in the direction of travel, scaled by how fast the
       player is actually moving. */
    var speedRatio = TN.utils.clamp(Math.abs(target.vx) / TN.Physics.RUN_SPEED, 0, 1);
    var wantedLook = target.facing * 26 * speedRatio;
    this.lookAhead = TN.utils.smooth(this.lookAhead, wantedLook, 4, dt);

    var wantedX = target.x + target.w / 2 - TN.VIEW_W / 2 + this.lookAhead;

    /* Vertically the player sits a bit below centre, which shows more of the
       ceiling and less of the floor. Standard platformer framing. */
    var wantedY = target.y + target.h / 2 - TN.VIEW_H * 0.58;

    /* Outside a small vertical deadzone we do not move vertically at all,
       which stops the screen bobbing up and down while the player jumps. */
    var centreY = this.y + TN.VIEW_H / 2;
    var playerY = target.y + target.h / 2;
    if (Math.abs(playerY - centreY) < 46 && !target.onGround) {
      wantedY = this.y;
    }

    /* --- move towards it --- */
    this.x = TN.utils.smooth(this.x, wantedX, 9, dt);
    this.y = TN.utils.smooth(this.y, wantedY, 6, dt);

    /* --- never show outside the level --- */
    this.x = TN.utils.clamp(this.x, 0, this.maxX());
    this.y = TN.utils.clamp(this.y, 0, this.maxY());

    this.updateShake(dt);
  },

  /* Start a screen shake. A new shake never makes an existing one weaker. */
  shake: function (magnitude, duration) {
    if (magnitude >= this.shakeMagnitude || this.shakeTime <= 0) {
      this.shakeMagnitude = magnitude;
      this.shakeTimer = duration;
      this.shakeTime = duration;
    }
  },

  updateShake: function (dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeMagnitude = 0;
        this.offsetX = 0;
        this.offsetY = 0;
      } else {
        /* Fade the shake out over its lifetime. */
        var strength = this.shakeMagnitude * (this.shakeTimer / this.shakeTime);
        this.offsetX = TN.utils.randRange(-strength, strength);
        this.offsetY = TN.utils.randRange(-strength, strength);
      }
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  },

  update: function (dt) {
    this.updateShake(dt);
  },

  /* Convenience: turn a world X into a screen X, including shake. */
  screenX: function (worldX) {
    return worldX - this.x + this.offsetX;
  },

  screenY: function (worldY) {
    return worldY - this.y + this.offsetY;
  },

  /* Is this world-space rectangle visible? Used to skip drawing things the
     player cannot see. */
  isVisible: function (rect, margin) {
    margin = margin || 32;
    return rect.x + rect.w > this.x - margin &&
           rect.x < this.x + TN.VIEW_W + margin &&
           rect.y + rect.h > this.y - margin &&
           rect.y < this.y + TN.VIEW_H + margin;
  }
};
