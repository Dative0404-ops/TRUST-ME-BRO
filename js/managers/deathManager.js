/* =========================================================================
   TRUST NOTHING - managers/deathManager.js
   -------------------------------------------------------------------------
   Dying, in five different flavours.

   The Death Manager takes control of the player the moment something kills
   him, plays the right animation for that cause, shows the sarcastic
   message, and then hands control back to the game so the checkpoint system
   can put him back on his feet.

   The five animations:
     spike      - impaled, then flung off the spikes, spinning
     crush      - squashed flat into a puddle of dust
     lava       - burns down until the skin goes brown... and stays brown
     explosion  - blown apart into a shower of sparks
     void       - plummets forever, spinning and shrinking

   Adding a sixth is easy: add an entry to DEATHS, then handle its style in
   update() and draw().
   ========================================================================= */

TN.DeathManager = function (game) {
  this.game = game;

  this.active = false;
  this.cause = null;
  this.style = 'void';
  this.pool = 'taunt';
  this.t = 0;
  this.duration = 1.2;

  /* A frozen copy of the player's position and look at the moment of death.
     The real player object is stood still while the animation plays. */
  this.snap = { x: 0, y: 0, w: 12, h: 16, facing: 1, state: 'fall', animTime: 0, vy: 0 };

  /* Extra bits the animations need. */
  this.flash = 0;      /* 0..1 white flash used by the explosion */
  this.squash = 0;     /* 0..1 used by the crush animation */
  this.sink = 0;       /* how far the player has sunk into lava */
  this.gone = false;   /* true once the character should not be drawn */
};

/* Which cause produces which animation, message pool and screen shake.
   Defined AFTER the constructor above so that TN.DeathManager already exists
   when these properties are attached to it. (Attaching to it first, as an
   earlier draft did, throws before the game can even load.) */
TN.DeathManager.DEATHS = {
  spike:      { style: 'spike',     pool: 'spike',     shake: 5,  duration: 1.35 },
  crush:      { style: 'crush',     pool: 'crush',     shake: 11, duration: 1.45 },
  lava:       { style: 'lava',      pool: 'lava',      shake: 5,  duration: 1.75 },
  explosion:  { style: 'explosion', pool: 'explosion', shake: 12, duration: 1.30 },
  void:       { style: 'void',      pool: 'void',      shake: 2,  duration: 1.50 },
  fakeExit:   { style: 'explosion', pool: 'fakeExit',  shake: 12, duration: 1.40 },
  collect:    { style: 'spike',     pool: 'collect',   shake: 5,  duration: 1.35 }
};

TN.DeathManager.prototype = {

  /* -----------------------------------------------------------------------
     Kill the player.

     "cause" is a key of TN.DeathManager.DEATHS:
        spike, crush, lava, explosion, void, fakeExit, collect
     ----------------------------------------------------------------------- */
  kill: function (cause) {
    if (this.active) return;
    var player = this.game.player;
    if (!player || !player.alive) return;

    var info = TN.DeathManager.DEATHS[cause] || TN.DeathManager.DEATHS.void;

    this.active = true;
    this.cause = cause;
    this.style = info.style;
    this.pool = info.pool;
    this.t = 0;
    this.duration = info.duration;
    this.flash = 0;
    this.squash = 0;
    this.sink = 0;
    this.gone = false;

    /* Take a snapshot, then stop the real player from doing anything. */
    this.snap.x = player.x;
    this.snap.y = player.y;
    this.snap.w = player.w;
    this.snap.h = player.h;
    this.snap.facing = player.facing;
    this.snap.state = player.state;
    this.snap.animTime = player.animTime;
    this.snap.vy = 0;

    player.alive = false;
    player.vx = 0;
    player.vy = 0;

    /* A lava death leaves a permanent mark on the character: he comes back,
       every time, with brown skin. Nothing washes it off except reloading the
       page, because the Game rebuilds the player from scratch on boot. */
    if (cause === 'lava') player.skinColor = TN.C.skinBrown;

    /* Screen shake and the message. */
    this.game.camera.shake(info.shake, 0.35);
    this.game.dialogue.sayFrom(info.pool, { style: 'bad', priority: true });

    /* Let the game count the death and save it. */
    this.game.onPlayerDeath(cause);

    /* Per-cause opening burst of particles. */
    this.spawnOpeningBurst();
  },

  spawnOpeningBurst: function () {
    var cx = this.snap.x + this.snap.w / 2;
    var cy = this.snap.y + this.snap.h / 2;

    if (this.style === 'spike') {
      TN.FX.burst(cx, cy, 18, {
        colors: [TN.C.blood, '#ff6b6b', '#9c1f1f'],
        speedMin: 40, speedMax: 190, lifeMin: 0.3, lifeMax: 0.8, size: 2
      });
    } else if (this.style === 'crush') {
      TN.FX.burst(cx, this.snap.y + this.snap.h, 22, {
        colors: ['#c8b79c', '#8a7a68', '#efe6d6'],
        speedMin: 50, speedMax: 200, gravity: 700,
        lifeMin: 0.3, lifeMax: 0.7, size: 2, angle: -Math.PI / 2, spread: 3.0
      });
    } else if (this.style === 'lava') {
      TN.FX.burst(cx, cy, 20, {
        colors: [TN.C.fire1, TN.C.fire2, TN.C.fire3, '#fff1c9'],
        speedMin: 30, speedMax: 130, gravity: -180,
        lifeMin: 0.35, lifeMax: 0.9, size: 2
      });
    } else if (this.style === 'explosion') {
      TN.FX.burst(cx, cy, 40, {
        colors: [TN.C.fire1, TN.C.fire2, TN.C.fire3, '#ffffff', TN.C.smoke],
        speedMin: 60, speedMax: 320, gravity: 350,
        lifeMin: 0.25, lifeMax: 0.85, size: 3
      });
      this.flash = 1;
      /* The character disappears immediately in an explosion. */
      this.gone = true;
    } else if (this.style === 'void') {
      TN.FX.burst(cx, cy, 8, {
        colors: ['#ffffff', '#b9a8ff'],
        speedMin: 20, speedMax: 60, gravity: -60,
        lifeMin: 0.4, lifeMax: 0.9, size: 2
      });
    }
  },

  /* -----------------------------------------------------------------------
     Animation step.
     ----------------------------------------------------------------------- */
  update: function (dt) {
    if (!this.active) return;
    this.t += dt;

    this.snap.animTime += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 6);

    var cx = this.snap.x + this.snap.w / 2;
    var cy = this.snap.y + this.snap.h / 2;

    if (this.style === 'spike') {
      /* First a quarter second of being stuck on the spike, then launch. */
      if (this.t < 0.22) {
        this.snap.x += TN.utils.randRange(-1, 1);
        this.snap.y += TN.utils.randRange(-0.6, 0.6);
      } else if (this.snap.vy === 0) {
        this.snap.vy = -320;   /* the "pop off the spikes" moment */
        this.game.camera.shake(4, 0.2);
        TN.FX.burst(cx, cy, 8, {
          colors: [TN.C.blood, '#ff6b6b'],
          speedMin: 30, speedMax: 120, lifeMin: 0.2, lifeMax: 0.5, size: 2
        });
      } else {
        this.snap.vy += 1500 * dt;
        this.snap.y += this.snap.vy * dt;
      }
      /* A little trailing blood while airborne. */
      if (this.snap.vy > 0 && Math.random() < 0.35) {
        TN.FX.add({
          x: cx, y: cy, vx: TN.utils.randRange(-20, 20), vy: 20,
          gravity: 600, life: 0.45, color: TN.C.blood, size: 2
        });
      }

    } else if (this.style === 'crush') {
      /* Squash from 0 to 1 over the first fifth of a second. */
      this.squash = TN.utils.clamp(this.t / 0.16, 0, 1);
      if (this.t < 0.3 && Math.random() < 0.4) {
        TN.FX.add({
          x: cx + TN.utils.randRange(-14, 14), y: this.snap.y + this.snap.h - 2,
          vx: TN.utils.randRange(-60, 60), vy: TN.utils.randRange(-90, -20),
          gravity: 500, life: 0.5, color: '#c8b79c', size: 2
        });
      }

    } else if (this.style === 'lava') {
      /* Sink downwards while burning. */
      this.sink = TN.utils.clamp(this.t / 1.1, 0, 1) * 26;
      if (Math.random() < 0.75) {
        TN.FX.add({
          x: cx + TN.utils.randRange(-7, 7),
          y: this.snap.y + this.snap.h - this.sink,
          vx: TN.utils.randRange(-25, 25),
          vy: TN.utils.randRange(-140, -50),
          gravity: -120, life: TN.utils.randRange(0.3, 0.7),
          color: [TN.C.fire1, TN.C.fire2, TN.C.fire3][TN.utils.randInt(0, 2)],
          size: 2
        });
      }
      /* Turn into a skeleton around 60% of the way through. */
      if (this.t > this.duration * 0.6 && Math.random() < 0.5) {
        TN.FX.add({
          x: cx + TN.utils.randRange(-6, 6), y: cy,
          vx: TN.utils.randRange(-40, 40), vy: TN.utils.randRange(-90, -30),
          gravity: -40, life: 0.8, color: TN.C.smoke, size: 3
        });
      }

    } else if (this.style === 'explosion') {
      /* Nothing to animate on the body - it is particles. */
      if (this.t < 0.18 && Math.random() < 0.8) {
        TN.FX.add({
          x: cx + TN.utils.randRange(-8, 8), y: cy + TN.utils.randRange(-8, 8),
          vx: TN.utils.randRange(-150, 150), vy: TN.utils.randRange(-150, 60),
          gravity: 200, life: 0.4,
          color: [TN.C.fire1, TN.C.fire2, '#ffffff'][TN.utils.randInt(0, 2)],
          size: 3
        });
      }

    } else if (this.style === 'void') {
      /* Fall, spin and shrink. The camera is frozen so this reads as the
         player dropping away from you. */
      this.snap.vy += 900 * dt;
      this.snap.y += this.snap.vy * dt;
      this.snap.x += Math.sin(this.t * 8) * 24 * dt;
      if (Math.random() < 0.5) {
        TN.FX.add({
          x: cx + TN.utils.randRange(-6, 6), y: this.snap.y,
          vx: TN.utils.randRange(-20, 20), vy: TN.utils.randRange(-70, -20),
          gravity: -30, life: 0.7, color: '#b9a8ff', size: 1
        });
      }
    }

    /* Animation finished: give control back to the game. */
    if (this.t >= this.duration) {
      this.active = false;
      this.game.respawnPlayer();
    }
  },

  /* -----------------------------------------------------------------------
     Draw the death.
     ----------------------------------------------------------------------- */
  draw: function (ctx, cam) {
    if (!this.active) return;

    var progress = this.t / this.duration;
    var style = this.style;
    var alpha = 1;
    var rot = 0;
    var kx = 1, ky = 1;
    var pivotBottom = false;
    var skinOverride = null;

    if (style === 'spike') {
      /* Spin faster and faster as it flies. */
      rot = this.snap.vy === 0 ? 0 : this.t * 9;
      /* Fade out over the last 20%. */
      if (progress > 0.8) alpha = (1 - progress) / 0.2;

    } else if (style === 'crush') {
      /* Squash: get wide and short, keeping the feet on the ground. */
      kx = 1 + this.squash * 0.55;
      ky = 1 - this.squash * 0.72;
      pivotBottom = true;
      if (progress > 0.75) alpha = (1 - progress) / 0.25;

    } else if (style === 'lava') {
      /* Burns down, and partway through the burn the skin goes brown. The
         colour is permanent for the rest of the session (see kill()). */
      if (progress > 0.35) skinOverride = TN.C.skinBrown;
      if (progress > 0.85) alpha = (1 - progress) / 0.15;

    } else if (style === 'explosion') {
      if (this.gone) alpha = 0;

    } else if (style === 'void') {
      /* Spin and shrink into the distance. */
      rot = this.t * 6;
      var shrink = 1 - progress * 0.65;
      kx = shrink;
      ky = shrink;
      alpha = Math.max(0, 1 - progress * 0.9);
    }

    if (alpha > 0.02) {
      this.drawSnap(ctx, cam, {
        alpha: alpha, rot: rot, kx: kx, ky: ky,
        pivotBottom: pivotBottom, skin: skinOverride
      });
    }

    /* Heat haze / lava glow is drawn on top of the character. */
    if (style === 'lava') this.drawLavaGlow(ctx, cam);

    /* White flash for explosions, drawn last so it covers everything. */
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash * 0.75;
      TN.utils.rect(ctx, 0, 0, TN.VIEW_W, TN.VIEW_H, '#ffffff');
      ctx.restore();
    }
  },

  /* Draw the frozen snapshot of the character with a transform applied. */
  drawSnap: function (ctx, cam, opts) {
    var player = this.game.player;
    var s = this.snap;

    var sx = Math.round(s.x - cam.x + cam.offsetX);
    var sy = Math.round(s.y - cam.y + cam.offsetY);

    ctx.save();
    ctx.globalAlpha = opts.alpha;

    if (opts.pivotBottom) {
      /* Rotate / squash around the feet, which is what makes the crush look
         like the character is being flattened onto the floor. */
      ctx.translate(sx + s.w / 2, sy + s.h);
      ctx.rotate(opts.rot);
      ctx.scale(opts.kx, opts.ky);
      ctx.translate(-s.w / 2, -s.h);
    } else {
      /* Rotate / shrink around the middle of the body. */
      ctx.translate(sx + s.w / 2, sy + s.h / 2);
      ctx.rotate(opts.rot);
      ctx.scale(opts.kx, opts.ky);
      ctx.translate(-s.w / 2, -s.h / 2);
    }

    player.drawCharacter(ctx, 0, 0, s.state, s.animTime, s.facing, opts.skin || null);
    ctx.restore();
  },

  /* A soft orange glow that grows around the burning player. */
  drawLavaGlow: function (ctx, cam) {
    var s = this.snap;
    var cx = s.x + s.w / 2 - cam.x;
    var cy = s.y + s.h / 2 - cam.y;
    var radius = 10 + this.t * 10;

    ctx.save();
    ctx.globalAlpha = 0.18;
    for (var i = 3; i >= 1; i--) {
      var r = radius * (i / 3);
      ctx.fillStyle = i === 1 ? TN.C.fire1 : (i === 2 ? TN.C.fire2 : TN.C.fire3);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  /* Cancel the animation without respawning. Used when a level is restarted. */
  clear: function () {
    this.active = false;
    this.cause = null;
    this.t = 0;
    this.flash = 0;
    this.gone = false;
  }
};
