/* =========================================================================
   TRUST NOTHING - managers/checkpointManager.js
   -------------------------------------------------------------------------
   Checkpoints are the game being generous, which makes the next betrayal
   hurt more.

   A checkpoint is a flag. Walk into it and the game:
     1. remembers that spot as the respawn point,
     2. heals the player back to full health,
     3. writes the position into the save file,
     4. turns the flag green and puffs some confetti.

   After that, dying puts the player back here instead of at the start.

   Coordinate convention used all over this project:
     tx, ty are TILE coordinates and "ty" is the GROUND row.
     A checkpoint at (22, 15) therefore stands ON row 15, its flag box
     occupies rows 13 and 14, and the player respawns with his feet on row 15.
   ========================================================================= */

TN.CheckpointManager = function (game, level) {
  this.game = game;
  this.level = level;

  /* The default spawn from the level config, used before any checkpoint. */
  this.defaultSpawn = {
    x: level.spawn.tx * TN.TILE + 2,
    y: level.spawn.ty * TN.TILE - 16
  };

  /* Where the player currently respawns. */
  this.spawn = { x: this.defaultSpawn.x, y: this.defaultSpawn.y };

  /* Build one object per checkpoint in the level config. */
  this.checkpoints = [];
  var list = level.checkpoints || [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    this.checkpoints.push({
      id: i,
      tx: c.tx,
      ty: c.ty,
      /* The flag graphic, drawn standing on the ground. */
      x: c.tx * TN.TILE,
      y: c.ty * TN.TILE - 32,
      w: TN.TILE,
      h: 32,
      /* The respawn position: just to the right of the pole, standing up. */
      spawnX: c.tx * TN.TILE + 2,
      spawnY: c.ty * TN.TILE - 16,
      /* Is it currently the active one? */
      active: false,
      /* Have we ever touched it this run? (used for the little hit animation) */
      touched: false,
      /* 0..1 animation used for the confetti puff. */
      popT: 0
    });
  }

  /* Restore whatever the save file says we already reached. */
  this.restoreFromSave();
};

TN.CheckpointManager.prototype = {

  /* Read the save file and re-activate the correct flag without replaying
     the celebration (that would be confusing on level load). */
  restoreFromSave: function () {
    var saved = this.game.save.getCheckpoint(this.level.id);
    var savedId = this.game.save.getCheckpointId(this.level.id);

    if (saved && savedId >= 0) {
      this.spawn.x = saved.x;
      this.spawn.y = saved.y;
      if (this.checkpoints[savedId]) this.checkpoints[savedId].active = true;
    }
  },

  /* The position the player should respawn at right now. */
  getSpawn: function () {
    return this.spawn;
  },

  /* -----------------------------------------------------------------------
     Called once per physics step while the player is alive.
     ----------------------------------------------------------------------- */
  update: function (dt) {
    var player = this.game.player;
    if (!player || !player.alive) return;

    for (var i = 0; i < this.checkpoints.length; i++) {
      var cp = this.checkpoints[i];

      /* Grow the confetti animation, if one is playing. */
      if (cp.popT > 0) cp.popT = Math.min(1, cp.popT + dt * 2.2);

      /* Only the plain rectangle test matters here. */
      if (!cp.active && TN.utils.aabb(player, cp)) {
        this.activate(cp);
      }
    }
  },

  /* Make this checkpoint the new respawn point. */
  activate: function (cp) {
    /* Turn the old flag off and the new one on. */
    for (var i = 0; i < this.checkpoints.length; i++) {
      this.checkpoints[i].active = false;
    }
    cp.active = true;
    cp.touched = true;
    cp.popT = 0.001;

    /* Remember the spot. */
    this.spawn.x = cp.spawnX;
    this.spawn.y = cp.spawnY;

    /* Kindness: a fresh checkpoint also refills the health bar. */
    this.game.player.heal();

    /* Persist it. */
    this.game.save.setCheckpoint(this.level.id, cp.id, cp.spawnX, cp.spawnY);

    /* Feedback. */
    TN.FX.burst(cp.x + TN.TILE / 2, cp.y + 6, 14, {
      colors: ['#ffffff', TN.C.flagOn, '#bfffd0'],
      speedMin: 30, speedMax: 120, gravity: 260,
      lifeMin: 0.35, lifeMax: 0.8, size: 2
    });
    this.game.camera.shake(2, 0.15);
    this.game.dialogue.sayFrom('checkpoint', { style: 'good' });
  },

  /* Bring every flag back to its "not yet reached" visual state. Used when
     the level is restarted with R. The current spawn is left alone because
     the player is standing at it. */
  resetVisuals: function () {
    var savedId = this.game.save.getCheckpointId(this.level.id);
    for (var i = 0; i < this.checkpoints.length; i++) {
      this.checkpoints[i].active = (i === savedId);
      this.checkpoints[i].popT = 0;
    }
  },

  /* -----------------------------------------------------------------------
     Drawing
     ----------------------------------------------------------------------- */
  draw: function (ctx, cam) {
    for (var i = 0; i < this.checkpoints.length; i++) {
      var cp = this.checkpoints[i];

      /* Do not draw flags that are far off screen. */
      var sx = cp.x - cam.x;
      if (sx < -40 || sx > TN.VIEW_W + 40) continue;

      var x = Math.round(sx + cam.offsetX);
      var y = Math.round(cp.y - cam.y + cam.offsetY);
      var R = TN.utils.rect;

      /* --- base plate --- */
      R(ctx, x, y + 30, 16, 2, TN.C.rock);

      /* --- pole --- */
      R(ctx, x + 2, y, 2, 31, TN.C.metal);
      R(ctx, x + 1, y + 29, 4, 2, '#6e7688');

      /* --- flag cloth: wavy when active, limp when not --- */
      var color = cp.active ? TN.C.flagOn : TN.C.flagOff;
      var wave = cp.active ? Math.round(Math.sin(this.game.time * 4 + i) * 1) : 0;
      R(ctx, x + 4, y + 2 + wave, 8, 6, color);
      R(ctx, x + 4, y + 8, 6, 4, color);
      R(ctx, x + 4, y + 12, 4, 3, color);

      /* --- a shiny pip on top when this is the live checkpoint --- */
      if (cp.active) {
        R(ctx, x + 2, y - 3, 2, 3, TN.C.flagOn);
        var blink = (Math.floor(this.game.time * 3) % 2) === 0;
        if (blink) R(ctx, x + 1, y - 5, 4, 2, '#ffffff');
      }
    }
  }
};
