/* =========================================================================
   TRUST NOTHING - managers/levelManager.js
   -------------------------------------------------------------------------
   The Level Manager turns one entry of TN.Levels (pure data) into a live,
   playable level. It builds:

     - the collision tilemap from the config's solid rectangles,
     - the Trap Manager (which adds spikes, crumbling bridge, crushers, gem
       and the doors),
     - the Checkpoint Manager,
     - harmless collectibles (coins) and readable wooden signs,
     - the parallax night-time background.

   Draw order matters and is split into two calls so the player can be drawn
   in between:
       draw(ctx, cam)      -> background, tiles, traps, coins, signs
       drawFront(ctx, cam) -> sign speech bubbles, which sit on top of you
   ========================================================================= */

TN.LevelManager = function (game, levelId) {
  this.game = game;
  this.id = levelId;
  this.config = TN.Levels.get(levelId);

  if (!this.config) {
    throw new Error('TRUST NOTHING: no level config found for id ' + levelId);
  }

  this.name = this.config.name;
  this.cols = this.config.world.cols;
  this.rows = this.config.world.rows;
  this.worldW = this.cols * TN.TILE;
  this.worldH = this.rows * TN.TILE;

  /* ---- 1. collision world ---- */
  this.map = new TN.Tilemap(this.cols, this.rows);
  var solids = this.config.solids || [];
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    this.map.fill(s.x, s.y, s.w, s.h, TN.T_SOLID);
  }

  /* Fake walls: written into the tilemap as T_FAKE. They look exactly like
     solid ground but the collision code ignores them, so the player walks
     straight through. */
  var fakeWalls = this.config.fakeWalls || [];
  for (var fw = 0; fw < fakeWalls.length; fw++) {
    var f = fakeWalls[fw];
    this.map.fill(f.x, f.y, f.w, f.h, TN.T_FAKE);
  }

  /* ---- 2. the managers that belong to this level ---- */
  this.traps = new TN.TrapManager(game, this.config, this.map);
  this.checkpoints = new TN.CheckpointManager(game, this.config);

  /* ---- 3. coins ---- */
  this.coins = [];
  var coinList = this.config.coins || [];
  for (var c = 0; c < coinList.length; c++) {
    var coin = coinList[c];
    this.coins.push({
      id: c,
      x: coin.tx * TN.TILE + 3,
      y: coin.ty * TN.TILE + 3,
      w: 10,
      h: 10,
      /* Coins already collected in a previous session stay collected. */
      collected: game.save.hasCoin(levelId, c),
      anim: Math.random() * 10
    });
  }

  /* ---- 4. signs ---- */
  this.signs = [];
  var signList = this.config.signs || [];
  for (var s2 = 0; s2 < signList.length; s2++) {
    var sign = signList[s2];
    this.signs.push({
      tx: sign.tx,
      ty: sign.ty,
      text: sign.text,
      /* Which sign is currently showing its bubble. */
      highlight: false
    });
  }
  /* The sign whose bubble is visible right now (only ever one at a time). */
  this.activeSign = null;

  /* ---- 5. hazards that are not traps ---- */
  this.lavaRects = [];
  var lavas = this.config.lava || [];
  for (var l = 0; l < lavas.length; l++) {
    this.lavaRects.push({
      x: lavas[l].tx * TN.TILE,
      y: lavas[l].ty * TN.TILE,
      w: lavas[l].tw * TN.TILE,
      h: lavas[l].th * TN.TILE
    });
  }

  /* ---- 5b. moving platforms ----
     Slabs that slide back and forth. They are NOT tiles (tiles cannot move),
     so they get their own little module and their own update/draw step. */
  this.platforms = [];
  var platformList = this.config.movingPlatforms || [];
  for (var p = 0; p < platformList.length; p++) {
    this.platforms.push(new TN.Platform(platformList[p]));
  }

  /* How far below the world counts as "fell into the void". */
  this.killY = this.worldH + 40;

  /* ---- 6. background ---- */
  this.buildBackground();

  /* ---- 7. gameplay counters for the HUD ---- */
  this.coinsCollected = 0;
  this.coinTotal = this.coins.length;
  for (var k = 0; k < this.coins.length; k++) {
    if (this.coins[k].collected) this.coinsCollected += 1;
  }
};

TN.LevelManager.prototype = {

  /* Deterministic star field, so the sky looks the same every time you play
     but is still full of little dots. */
  buildBackground: function () {
    this.stars = [];
    var fieldWidth = TN.VIEW_W + 90;
    for (var i = 0; i < 80; i++) {
      this.stars.push({
        x: TN.utils.hash2(i, 7) * fieldWidth,
        y: TN.utils.hash2(i, 13) * 150 + 4,
        size: TN.utils.hash2(i, 21) > 0.82 ? 2 : 1,
        phase: TN.utils.hash2(i, 29) * 6.28
      });
    }
  },

  /* -----------------------------------------------------------------------
     UPDATE
     ----------------------------------------------------------------------- */
  update: function (dt) {
    var player = this.game.player;

    /* Traps do most of the killing themselves, they know their own rules. */
    this.traps.update(dt);

    /* Moving platforms slide, then carry and push the player. This runs AFTER
       the player has already moved this frame, so the carry/snap keeps him
       glued to the slab instead of sinking through it. */
    this.updatePlatforms(dt, player);

    this.checkpoints.update(dt);

    this.updateCoins(dt, player);
    this.updateSigns(player);
    this.updateFatalHazards(player);
  },

  /* Slide every platform, then let each one pick the player up and/or shove
     them out of its way. */
  updatePlatforms: function (dt, player) {
    for (var i = 0; i < this.platforms.length; i++) {
      var p = this.platforms[i];
      p.update(dt);
      if (player.alive) {
        p.carry(player);
        p.resolve(player);
      }
    }
  },

  /* Coins are the only friendly collectible in the game, which is exactly why
     the gem later on feels convincing. */
  updateCoins: function (dt, player) {
    for (var i = 0; i < this.coins.length; i++) {
      var coin = this.coins[i];
      coin.anim += dt;
      if (coin.collected) continue;
      if (!player.alive) continue;

      if (TN.utils.aabb(player, coin)) {
        coin.collected = true;
        this.coinsCollected += 1;

        /* Save it. recordCoin returns false if we somehow already had it. */
        this.game.save.recordCoin(this.id, coin.id);

        TN.FX.burst(coin.x + 5, coin.y + 5, 9, {
          colors: [TN.C.coin, TN.C.coinShine, '#ffffff'],
          speedMin: 25, speedMax: 110, gravity: 260,
          lifeMin: 0.2, lifeMax: 0.5, size: 2
        });
      }
    }
  },

  /* Work out which sign (if any) should be showing its bubble. */
  updateSigns: function (player) {
    this.activeSign = null;
    if (!player || !player.alive) return;

    var best = null;
    var bestDist = 52;

    for (var i = 0; i < this.signs.length; i++) {
      var sign = this.signs[i];
      sign.highlight = false;

      var dist = Math.abs(player.centreX() - (sign.tx * TN.TILE + 8));
      var vertical = Math.abs(player.centreY() - (sign.ty * TN.TILE + 6));

      if (dist < bestDist && vertical < 56) {
        bestDist = dist;
        best = sign;
      }
    }

    if (best) {
      best.highlight = true;
      this.activeSign = best;
    }
  },

  /* Falling out of the world and lava are handled here rather than in the
     Trap Manager, because they are properties of the level itself. */
  updateFatalHazards: function (player) {
    if (!player.alive) return;

    /* Fell off the bottom of the map. */
    if (player.y > this.killY) {
      this.game.deathManager.kill('void');
      return;
    }

    /* Lava (no lava in level 1, but the machinery is ready for later levels). */
    for (var i = 0; i < this.lavaRects.length; i++) {
      if (TN.utils.aabb(player, this.lavaRects[i])) {
        this.game.deathManager.kill('lava');
        return;
      }
    }
  },

  /* Put the level back to its starting state without rebuilding everything.
     Called when the player presses R. */
  reset: function () {
    this.traps.reset();
    this.checkpoints.resetVisuals();
    this.activeSign = null;
  },

  /* -----------------------------------------------------------------------
     DRAW (behind the player)
     ----------------------------------------------------------------------- */
  draw: function (ctx, cam) {
    this.drawBackground(ctx, cam);
    this.map.draw(ctx, cam, this.config.theme);
    this.drawLava(ctx, cam);
    this.drawPlatforms(ctx, cam);
    /* Traps first, so coins and checkpoints sit on top of doors and spikes. */
    this.traps.draw(ctx, cam);
    this.drawCoins(ctx, cam);
    this.checkpoints.draw(ctx, cam);
    this.drawSigns(ctx, cam);
  },

  /* Draw the moving slabs. */
  drawPlatforms: function (ctx, cam) {
    for (var i = 0; i < this.platforms.length; i++) {
      this.platforms[i].draw(ctx, cam);
    }
  },

  /* -----------------------------------------------------------------------
     DRAW (in front of the player)
     ----------------------------------------------------------------------- */
  drawFront: function (ctx, cam) {
    this.drawSignBubble(ctx, cam);
  },

  /* ---------------------------------------------------------------------
     Background: a night sky, twinkling stars, two layered mountain ranges
     and a few drifting clouds. Everything uses the camera multiplied by a
     small number, which is the whole trick behind parallax.
     --------------------------------------------------------------------- */
  drawBackground: function (ctx, cam) {
    var R = TN.utils.rect;

    /* --- sky, drawn as 10 horizontal bands so it stays pixel-friendly --- */
    var bands = 10;
    var bandH = Math.ceil(TN.VIEW_H / bands);
    for (var b = 0; b < bands; b++) {
      var t = b / (bands - 1);
      var color;
      if (t < 0.34) color = TN.C.sky0;
      else if (t < 0.55) color = TN.C.sky1;
      else if (t < 0.78) color = TN.C.sky2;
      else color = TN.C.sky3;
      R(ctx, 0, b * bandH, TN.VIEW_W, bandH, color);
    }

    /* --- stars --- */
    var starShift = -cam.x * 0.05;
    for (var i = 0; i < this.stars.length; i++) {
      var star = this.stars[i];
      var sx = star.x + starShift;
      if (sx < 0) sx += TN.VIEW_W + 90;
      if (sx > TN.VIEW_W) continue;

      /* Twinkle: most stars are steady, some pulse. */
      var bright = 0.55 + 0.45 * Math.sin(this.game.time * 2 + star.phase);
      ctx.save();
      ctx.globalAlpha = bright;
      R(ctx, sx, star.y, star.size, star.size, TN.C.star);
      ctx.restore();
    }

    /* --- far mountains --- */
    this.drawHillLayer(ctx, cam, 0.18, 96, 150, 0.010, 22, TN.C.hillFar);
    /* --- near hills --- */
    this.drawHillLayer(ctx, cam, 0.34, 122, 170, 0.016, 14, TN.C.hillNear);

    /* --- clouds --- */
    var cloudShift = -cam.x * 0.12 - this.game.time * 5;
    for (var c = 0; c < 5; c++) {
      var baseX = ((c * 173 + cloudShift) % 700) - 120;
      if (baseX < 0) baseX += 700;
      if (baseX > TN.VIEW_W + 60) continue;
      var cy2 = 26 + (c % 3) * 22;
      ctx.save();
      ctx.globalAlpha = 0.5;
      R(ctx, baseX, cy2, 34, 6, TN.C.cloud);
      R(ctx, baseX + 8, cy2 - 5, 20, 6, TN.C.cloud);
      R(ctx, baseX + 16, cy2 - 9, 12, 5, TN.C.cloud);
      ctx.restore();
    }
  },

  /* One layer of rolling hills, drawn as columns of pixels.
     Using two sine waves of different speeds gives an irregular, natural
     looking silhouette without needing any art assets. */
  drawHillLayer: function (ctx, cam, parallax, baseHeight, horizon, frequency, amplitude, color) {
    var shift = cam.x * parallax;
    var groundY = horizon + 40;

    for (var x = 0; x < TN.VIEW_W; x += 2) {
      var wx = x + shift;
      var h = baseHeight
        + Math.sin(wx * frequency) * amplitude
        + Math.sin(wx * frequency * 3.3 + 1.7) * (amplitude * 0.45);
      TN.utils.rect(ctx, x, groundY - h, 2, h + 60, color);
    }
  },

  /* Lava pools, with a slow animated surface. Unused in level 1. */
  drawLava: function (ctx, cam) {
    for (var i = 0; i < this.lavaRects.length; i++) {
      var r = this.lavaRects[i];
      var x = Math.round(r.x - cam.x + cam.offsetX);
      var y = Math.round(r.y - cam.y + cam.offsetY);

      TN.utils.rect(ctx, x, y, r.w, r.h, TN.C.fire3);
      TN.utils.rect(ctx, x, y, r.w, 4, TN.C.fire2);
      /* Bubbling surface: a few moving highlights. */
      for (var b = 0; b < r.w; b += 12) {
        var bob = Math.round(Math.sin(this.game.time * 2 + b * 0.1) * 1.5);
        TN.utils.rect(ctx, x + b + 3, y + 1 + bob, 4, 2, TN.C.fire1);
      }
    }
  },

  /* ---------------------------------------------------------------------
     Coins: spinning gold discs. The spin is faked by squashing the width,
     which is exactly how it was done in 16 bit games.
     --------------------------------------------------------------------- */
  drawCoins: function (ctx, cam) {
    for (var i = 0; i < this.coins.length; i++) {
      var coin = this.coins[i];
      if (coin.collected) continue;

      var x = coin.x - cam.x + cam.offsetX;
      var y = coin.y - cam.y + cam.offsetY;
      if (x < -16 || x > TN.VIEW_W + 16) continue;

      var spin = Math.sin(coin.anim * 3.4);
      var width = Math.max(2, Math.round(Math.abs(spin) * 10));
      var cx = Math.round(x + 5);
      var top = Math.round(y) + Math.round(Math.sin(coin.anim * 2) * 1);

      var R = TN.utils.rect;
      R(ctx, cx - width / 2, top, width, 10, TN.C.coin);
      R(ctx, cx - width / 2, top, width, 2, TN.C.coinShine);
      R(ctx, cx - width / 2, top + 8, width, 2, TN.C.coinDark);
      /* The bright sliver that makes it read as metal. */
      if (width > 5) {
        R(ctx, cx - 1, top + 2, 2, 6, TN.C.coinShine);
      }
    }
  },

  /* ---------------------------------------------------------------------
     Signs: a wooden board on a post. The board itself is always visible so
     you can spot the joke coming; the text appears when you walk up to it.
     --------------------------------------------------------------------- */
  drawSigns: function (ctx, cam) {
    for (var i = 0; i < this.signs.length; i++) {
      var sign = this.signs[i];
      var x = sign.tx * TN.TILE;
      var bx = Math.round(x - cam.x + cam.offsetX);
      if (bx < -40 || bx > TN.VIEW_W + 40) continue;

      var by = Math.round(sign.ty * TN.TILE - cam.y + cam.offsetY);
      var R = TN.utils.rect;

      /* Post down to the ground. */
      R(ctx, bx + 7, by + 10, 2, 22, TN.C.woodDark);

      /* Board. */
      R(ctx, bx, by, 16, 11, TN.C.wood);
      R(ctx, bx, by, 16, 2, '#a5825a');
      R(ctx, bx, by + 9, 16, 2, TN.C.woodDark);
      R(ctx, bx, by, 1, 11, TN.C.woodDark);
      R(ctx, bx + 15, by, 1, 11, TN.C.woodDark);

      /* Two nails. */
      R(ctx, bx + 2, by + 2, 1, 1, '#e8dcc0');
      R(ctx, bx + 13, by + 2, 1, 1, '#e8dcc0');
    }
  },

  /* The speech bubble above whichever sign the player is standing at. */
  drawSignBubble: function (ctx, cam) {
    var sign = this.activeSign;
    if (!sign) return;

    var scale = 1;
    var maxWidth = 150;
    var lines = TN.Font.wrap(sign.text, maxWidth, scale);
    var lineHeight = (TN.Font.GLYPH_H + 3) * scale;
    var textHeight = lines.length * lineHeight - 3;

    var boxWidth = 14;
    for (var i = 0; i < lines.length; i++) {
      boxWidth = Math.max(boxWidth, TN.Font.width(lines[i], scale) + 12);
    }
    var boxHeight = textHeight + 11;

    var cx = Math.round(sign.tx * TN.TILE + 8 - cam.x + cam.offsetX);
    var cy = Math.round(sign.ty * TN.TILE - cam.y + cam.offsetY);
    var boxX = Math.round(TN.utils.clamp(cx - boxWidth / 2, 3, TN.VIEW_W - boxWidth - 3));
    var boxY = cy - boxHeight - 10;

    var R = TN.utils.rect;
    R(ctx, boxX, boxY, boxWidth, boxHeight, 'rgba(6,6,14,0.88)');
    R(ctx, boxX, boxY, boxWidth, 1, '#5a5286');
    R(ctx, boxX, boxY + boxHeight - 1, boxWidth, 1, '#5a5286');
    R(ctx, boxX, boxY, 1, boxHeight, '#5a5286');
    R(ctx, boxX + boxWidth - 1, boxY, 1, boxHeight, '#5a5286');
    /* Little tail pointing down at the sign. */
    R(ctx, cx - 2, boxY + boxHeight, 4, 3, '#5a5286');

    for (var n = 0; n < lines.length; n++) {
      TN.Font.draw(ctx, lines[n], boxX + boxWidth / 2, boxY + 6 + n * lineHeight, {
        color: TN.C.uiWarn,
        align: 'center',
        shadow: '#000000'
      });
    }
  },

  /* -----------------------------------------------------------------------
     Small helpers the Game and HUD need.
     ----------------------------------------------------------------------- */

  /* Everything the player must not touch this frame. Traps plus the level's
     own permanent hazards. Used by the Game for the "one last check" pass. */
  allHazards: function () {
    return this.traps.hazards();
  },

  coinRatio: function () {
    if (this.coinTotal === 0) return 1;
    return this.coinsCollected / this.coinTotal;
  }
};
