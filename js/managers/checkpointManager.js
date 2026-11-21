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

   AND THEN THERE ARE THE FAKE ONES.

   From level 4 onward a flag can be marked with "fake: true" in the level
   data. While it is armed a fake flag is drawn IDENTICALLY to a real one -
   same pole, same colours, same little flag - so the player has no way to
   tell them apart. Walking into one springs a spike trap and kills the
   player. It saves nothing and heals nothing.

   Once a fake flag has gone off it collapses and stays harmless for good, so
   it can never trap a player in a death loop: respawning beside it and
   walking forward again is always safe.

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
      popT: 0,
      /* A SCAM flag. Looks real while armed, springs spikes when touched. */
      fake: !!c.fake,
      /* Set the moment a fake flag bites. It stays harmless after that. */
      sprung: false
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

      /* A flag that has already bitten is inert from then on. */
      if (cp.sprung) continue;

      /* Only the plain rectangle test matters here. */
      if (!cp.active && TN.utils.aabb(player, cp)) {
        if (cp.fake) {
          this.springScam(cp);
        } else {
          this.activate(cp);
        }
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

  /* -----------------------------------------------------------------------
     The scam flag goes off.

     It does NOT heal, does NOT save and does NOT turn green - it just opens
     the floor. This is the whole joke: a checkpoint is the one thing in the
     game the player is allowed to relax about, so it is the perfect place to
     put a trap.

     The flag is marked "sprung" first, so even if the player respawns right
     next to it they can walk past safely.
     ----------------------------------------------------------------------- */
  springScam: function (cp) {
    cp.sprung = true;
    cp.touched = true;
    cp.popT = 0.001;
    this.game.registerTrap();

    /* Spikes slam out of the ground under the pole. The Trap Manager owns
       spike groups, so we borrow its helpers rather than making our own. */
    var traps = this.game.level && this.game.level.traps;
    if (traps) {
      var g = traps.addSpikeGroup(cp.tx - 1, cp.ty - 1, 3, true);
      traps.revealSpikeGroup(g);
    }

    /* A cloud of rust instead of the usual cheerful confetti. */
    TN.FX.burst(cp.x + TN.TILE / 2, cp.y + 10, 20, {
      colors: [TN.C.spike, TN.C.spikeDark, '#ffffff', '#8a3030'],
      speedMin: 40, speedMax: 170, gravity: 500,
      lifeMin: 0.25, lifeMax: 0.7, size: 2
    });

    this.game.camera.shake(11, 0.4);

    /* Kill first, THEN speak. kill() picks its own "spike" line, so saying our
       line afterwards is what makes sure the player actually reads the
       fake-checkpoint joke instead of the generic spike one. */
    this.game.deathManager.kill('spike');
    this.game.dialogue.sayFrom('fakeCheckpoint', { style: 'bad', priority: true });
  },

  /* Bring every flag back to its "not yet reached" visual state. Used when
     the level is restarted with R. The current spawn is left alone because
     the player is standing at it. */
  resetVisuals: function () {
    var savedId = this.game.save.getCheckpointId(this.level.id);
    for (var i = 0; i < this.checkpoints.length; i++) {
      var cp = this.checkpoints[i];
      /* A scam flag is never "the live checkpoint", and a flag that has
         already sprung stays sprung (and therefore harmless) across respawns. */
      cp.active = (!cp.fake && i === savedId);
      cp.popT = 0;
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

      /* --- a flag that has already bitten: snapped pole, flag in the dirt.
             It must look obviously dead, because it is now harmless and the
             player is expected to walk straight over it. --- */
      if (cp.sprung) {
        R(ctx, x, y + 30, 16, 2, TN.C.rock);
        R(ctx, x + 1, y + 24, 3, 7, '#5a5f70');
        R(ctx, x + 5, y + 26, 9, 4, TN.C.flagOff);
        R(ctx, x + 5, y + 29, 6, 2, TN.C.flagOff);
        continue;
      }

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
