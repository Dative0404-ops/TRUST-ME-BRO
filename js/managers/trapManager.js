/* =========================================================================
   TRUST NOTHING - managers/trapManager.js
   -------------------------------------------------------------------------
   THE module that makes this game a troll game.

   It owns every reusable trap mechanic. Level configs do not contain code,
   they just describe traps with a type and some tile coordinates, and this
   file knows how to bring each of those types to life:

     hiddenSpikes      - spikes that are invisible until you are nearly on
                         top of them, then shoot up out of the floor
     crumble           - platforms that look solid, then fall away underfoot
     crusher           - a block that shakes, drops, kills, and then politely
                         winches itself back up (so the level can never become
                         impossible to finish)
     gem               - a shiny "upgrade" that triggers a spike eruption
     exits             - the fake exit door, and the real one it is hiding
     switch            - a hidden lever; press every one in the level and the
                         real exit door unlocks (used by Level 2)

   Traps are all restore-able: on respawn everything re-arms except the things
   that are supposed to stay revealed (like the real door you have unlocked).
   ========================================================================= */

TN.TrapManager = function (game, level, map) {
  this.game = game;
  this.level = level;
  this.map = map;

  /* Live trap data, filled in by build(). */
  this.spikeGroups = []; /* hidden spike strips */
  this.crumbleTiles = []; /* crumbling platform tiles */
  this.crushers = []; /* falling blocks */
  this.gems = []; /* trap collectibles */
  this.exits = []; /* fake and real doors */
  this.switches = []; /* hidden levers that unlock the real door */
  this.mines = []; /* proximity mines (levels 3 and up) */

  /* Remember the original state of crumbling tiles so reset() can rebuild
     the bridge exactly as it was. */
  this.crumbleLayout = [];

  /* Small timer used to space out dust particles. */
  this.dustTimer = 0;

  this.build();
};

TN.TrapManager.prototype = {
  /* -----------------------------------------------------------------------
     BUILD: turn the level config into live trap objects.
     ----------------------------------------------------------------------- */
  build: function () {
    var L = this.level;
    var self = this;
    var i;

    /* --- hidden spike strips --- */
    var spikes = L.hiddenSpikes || [];
    for (i = 0; i < spikes.length; i++) {
      this.addSpikeGroup(
        spikes[i].tx,
        spikes[i].ty,
        spikes[i].tw,
        false,
        spikes[i].reveal,
      );
    }

    /* --- permanent spikes ---
       These are always visible and always lethal. They exist so the level can
       teach the player what an honest hazard looks like before it starts
       cheating. They never retract, so they are marked permanent. */
    var permanent = L.spikes || [];
    for (i = 0; i < permanent.length; i++) {
      var pg = this.addSpikeGroup(
        permanent[i].tx,
        permanent[i].ty,
        permanent[i].tw,
        true,
      );
      pg.state = "up";
      pg.t = 1;
      pg.triggered = true;
      pg.permanent = true;
    }

    /* --- crumbling platforms ---
       These are written straight into the tilemap, so the normal collision
       code treats them as solid ground until we delete them. */
    var crumble = L.crumble || [];
    for (i = 0; i < crumble.length; i++) {
      var row = crumble[i];
      for (var k = 0; k < row.tw; k++) {
        var tx = row.tx + k;
        var ty = row.ty;
        this.map.set(tx, ty, TN.T_CRUMBLE);
        var tile = {
          tx: tx,
          ty: ty,
          delay: row.delay || 0.3,
          state: "idle" /* idle | shaking | broken */,
          t: 0,
        };
        this.crumbleTiles.push(tile);
        this.crumbleLayout.push({ tx: tx, ty: ty, delay: tile.delay });
      }
    }

    /* --- other traps --- */
    var traps = L.traps || [];
    for (i = 0; i < traps.length; i++) {
      var t = traps[i];

      if (t.type === "crusher") {
        this.crushers.push({
          x: t.tx * TN.TILE,
          y: t.ty * TN.TILE,
          w: t.tw * TN.TILE,
          h: t.th * TN.TILE,
          homeY: t.ty * TN.TILE,
          triggerX: t.triggerTx * TN.TILE,
          shakeDelay: 0.35,
          state: "idle" /* idle | shaking | falling | landed | retracting */,
          t: 0,
          vy: 0,
        });
      } else if (t.type === "gem") {
        /* The gem creates its own "eruption" spike group. Marked manual so it
           does NOT reveal itself by proximity - only the gem sets it off. */
        var group = null;
        if (t.eruption) {
          group = this.addSpikeGroup(
            t.eruption.tx,
            t.eruption.ty,
            t.eruption.tw,
            true,
          );
        }
        this.gems.push({
          x: t.tx * TN.TILE + 2,
          y: t.ty * TN.TILE + 2,
          w: 12,
          h: 12,
          tx: t.tx,
          ty: t.ty,
          collected: false,
          bob: 0,
          eruption: group,
        });
      } else if (t.type === "mine") {
        /* A small drum sitting on the floor. Walk within "radius" pixels of
           its centre and a short fuse starts burning; a moment later it goes
           off. The trigger circle is deliberately WIDER than the blast, so a
           player who spots it and stops in time is safe - and a player who
           just keeps sprinting can outrun the blast.

           FUSE SAFETY CLAMP
           The level data chooses radius and fuse, but a fuse can easily be
           set short enough to make the mine IMPOSSIBLE to survive. Work it
           out: the fuse only lights once the player's centre is (radius +
           half the player width) from the middle of the drum, and to stay
           clear the player's near edge must then travel all the way past the
           far side of the 40px blast box. That is a sprint of (radius + 32)
           pixels, so the fuse has to last at least

               (radius + 32) / RUN_SPEED   seconds

           or even a flawless full-speed run ends inside the explosion. We
           clamp to that with a small margin, so a player who is still picking
           up speed also gets through. Result: every mine in the game is
           beatable by running, and easier still by stopping. */
        var minFuse = (((t.radius || 40) + 32) / TN.Physics.RUN_SPEED) * 1.15;

        this.mines.push({
          tx: t.tx,
          ty: t.ty,
          /* The mine box, resting on the floor (ty is the tile it stands in). */
          x: t.tx * TN.TILE + 1,
          y: t.ty * TN.TILE + 4,
          w: 14,
          h: 12,
          /* How close the player must get for the fuse to light. */
          radius: t.radius || 40,
          /* How long the fuse burns before it detonates. */
          fuse: Math.max(t.fuse || 0.35, minFuse),
          /* How long it stays blown up before quietly re-arming. */
          cooldown: 0.9,
          state: "idle" /* idle | armed | boom */,
          t: 0,
          anim: 0,
        });
      }
    }

    /* --- exits --- */
    var exits = L.exits || [];
    for (i = 0; i < exits.length; i++) {
      var e = exits[i];
      this.exits.push({
        kind: e.kind /* 'fake' or 'real' */,
        x: e.tx * TN.TILE + 1,
        y: e.ty * TN.TILE - 30,
        w: 14,
        h: 30,
        tx: e.tx,
        ty: e.ty,
        /* Fake doors start closed; real doors start invisible. */
        state: e.kind === "fake" ? "idle" : "hidden",
        t: 0,
        /* Used by the real door's rise-out-of-the-ground animation. */
        riseOffset: 30,
      });
    }

    /* --- hidden switches ---
       Small levers. Walk into one and it flips. Once EVERY switch in the level
       has been flipped, the real exit door rises out of the ground. Unlike the
       other traps these are NOT re-armed on respawn, so the player never has to
       hunt down a switch they already found. */
    var switches = L.switches || [];
    for (i = 0; i < switches.length; i++) {
      var sw = switches[i];
      this.switches.push({
        tx: sw.tx,
        ty: sw.ty,
        x: sw.tx * TN.TILE + 3,
        y: sw.ty * TN.TILE + 3,
        w: 10,
        h: 10,
        active: false,
        anim: 0,
      });
    }
  },

  /* Create one hidden spike strip and return it. */
  addSpikeGroup: function (tx, ty, tw, manual, revealDistance) {
    var group = {
      tx: tx,
      ty: ty,
      tw: tw,
      x: tx * TN.TILE,
      y: ty * TN.TILE,
      w: tw * TN.TILE,
      h: TN.TILE,
      state: "hidden" /* hidden | up */,
      t: 0 /* 0 = still in the floor, 1 = fully out */,
      manual: !!manual,
      revealDistance: revealDistance || 36,
      triggered: false,
    };
    this.spikeGroups.push(group);
    return group;
  },

  /* -----------------------------------------------------------------------
     RESET: called on respawn and on level restart.
     Re-arms everything the player can be surprised by again, but keeps the
     permanent reveals (the real door) so nobody has to trigger the fake exit
     twice.
     ----------------------------------------------------------------------- */
  reset: function () {
    var i;
    var L = this.level;

    /* Spike strips go back into the floor... (permanent ones never do) */
    for (i = 0; i < this.spikeGroups.length; i++) {
      var g = this.spikeGroups[i];
      if (g.permanent) continue;
      g.state = "hidden";
      g.t = 0;
      g.triggered = false;
    }

    /* ...and rebuild the crumbling bridge. */
    for (i = 0; i < this.crumbleTiles.length; i++) {
      var tile = this.crumbleTiles[i];
      tile.state = "idle";
      tile.t = 0;
      this.map.set(tile.tx, tile.ty, TN.T_CRUMBLE);
    }

    /* Crushers winch back up. */
    for (i = 0; i < this.crushers.length; i++) {
      var c = this.crushers[i];
      c.state = "idle";
      c.t = 0;
      c.y = c.homeY;
      c.vy = 0;
    }

    /* The gem reappears, because a trap you can only fall for once is not a
       trap, it is a plot point. */
    for (i = 0; i < this.gems.length; i++) {
      var gem = this.gems[i];
      gem.collected = false;
      if (gem.eruption) {
        gem.eruption.state = "hidden";
        gem.eruption.t = 0;
        gem.eruption.triggered = false;
      }
    }

    /* Mines quietly re-arm and start blinking again. */
    for (i = 0; i < this.mines.length; i++) {
      var mine = this.mines[i];
      mine.state = "idle";
      mine.t = 0;
    }

    /* Doors: a fake door that already bit you stays open and harmless, and a
       real door that has been unlocked stays unlocked. Nothing to do here. */

    /* Switches are deliberately left alone: once you have found one it stays
       found, so a death never sends you back to re-search the level. */
    for (i = 0; i < this.exits.length; i++) {
      var e = this.exits[i];
      if (e.kind === "real" && e.state !== "hidden") {
        e.state = "open";
        e.riseOffset = 0;
      }
    }
  },

  /* True if the real door has been unlocked this session. */
  realExitRevealed: function () {
    for (var i = 0; i < this.exits.length; i++) {
      if (this.exits[i].kind === "real" && this.exits[i].state !== "hidden")
        return true;
    }
    return false;
  },

  /* -----------------------------------------------------------------------
     UPDATE: one fixed physics step.
     ----------------------------------------------------------------------- */
  update: function (dt) {
    var player = this.game.player;
    this.dustTimer += dt;

    this.updateSpikeGroups(dt, player);
    this.updateCrumble(dt, player);
    this.updateCrushers(dt, player);
    this.updateGems(dt, player);
    this.updateMines(dt, player);
    this.updateSwitches(dt, player);
    this.updateExits(dt, player);
  },

  /* ---- hidden spikes ---------------------------------------------------- */
  updateSpikeGroups: function (dt, player) {
    for (var i = 0; i < this.spikeGroups.length; i++) {
      var g = this.spikeGroups[i];

      if (g.state === "hidden") {
        /* Manual groups only come up when something else triggers them. */
        if (g.manual) continue;

        /* Not while the player is dead - it would look like a bug. */
        if (!player.alive) continue;

        var dx = Math.abs(player.centreX() - (g.x + g.w / 2));
        var dy = Math.abs(player.centreY() - (g.y + g.h / 2));

        /* Only spring when the player is genuinely close AND roughly level
           with the strip. Otherwise spikes would pop up while you are five
           tiles above them on a platform. */
        if (dx < g.revealDistance + g.w / 2 && dy < 44) {
          this.revealSpikeGroup(g);
        }
      } else if (g.t < 1) {
        /* Rise out of the floor over a tenth of a second. */
        g.t = Math.min(1, g.t + dt / 0.1);
      }

      /* Lethal once it is more than half way up. */
      if (g.state === "up" && g.t > 0.5) {
        var hit = {
          x: g.x + 1,
          y: g.y + 4,
          w: g.w - 2,
          h: g.h - 4,
        };
        if (TN.utils.aabb(player, hit)) {
          this.game.deathManager.kill("spike");
          return; /* stop processing this frame, the player is busy dying */
        }
      }
    }
  },

  /* Pop a spike strip out of the ground. */
  revealSpikeGroup: function (g) {
    if (g.state === "up") return;
    g.state = "up";
    g.t = 0;

    if (!g.triggered) {
      g.triggered = true;
      this.game.registerTrap();
    }

    /* Dust along the whole strip so the player gets a visual "something is
       happening right under you" cue. */
    for (var x = g.x; x < g.x + g.w; x += 8) {
      TN.FX.burst(x + 4, g.y + TN.TILE, 3, {
        colors: ["#a08e78", "#d6c6ab", "#6b5c4a"],
        speedMin: 15,
        speedMax: 70,
        gravity: 620,
        lifeMin: 0.18,
        lifeMax: 0.45,
        size: 2,
        angle: -Math.PI / 2,
        spread: 2.6,
      });
    }
    this.game.camera.shake(3, 0.16);
  },

  /* ---- crumbling platforms --------------------------------------------- */
  updateCrumble: function (dt, player) {
    for (var i = 0; i < this.crumbleTiles.length; i++) {
      var tile = this.crumbleTiles[i];

      if (tile.state === "broken") continue;

      if (tile.state === "idle") {
        /* Is the player standing on me? Ask the collision helper which tiles
           are directly under his feet and look for a match. */
        if (player.alive && player.onGround) {
          var under = TN.Collision.tilesUnderFeet(player);
          for (var k = 0; k < under.length; k++) {
            if (under[k].tx === tile.tx && under[k].ty === tile.ty) {
              tile.state = "shaking";
              tile.t = 0;
              break;
            }
          }
        }
      } else if (tile.state === "shaking") {
        tile.t += dt;

        /* Little bits of dust trickling off the tile while it wobbles. */
        if (Math.random() < 0.35) {
          TN.FX.add({
            x: tile.tx * TN.TILE + TN.utils.randRange(2, 14),
            y: tile.ty * TN.TILE + 14,
            vx: TN.utils.randRange(-10, 10),
            vy: TN.utils.randRange(10, 40),
            gravity: 500,
            life: TN.utils.randRange(0.2, 0.45),
            color: "#a08e78",
            size: 1,
          });
        }

        if (tile.t >= tile.delay) {
          tile.state = "broken";
          this.map.set(tile.tx, tile.ty, TN.T_EMPTY);
          this.game.registerTrap();

          /* A proper puff of debris when it goes. */
          TN.FX.burst(tile.tx * TN.TILE + 8, tile.ty * TN.TILE + 8, 8, {
            colors: [TN.C.crate, TN.C.crateDark, "#a08e78"],
            speedMin: 20,
            speedMax: 90,
            gravity: 700,
            lifeMin: 0.3,
            lifeMax: 0.7,
            size: 2,
          });
          this.game.camera.shake(2, 0.12);
        }
      }
    }
  },

  /* ---- crushers --------------------------------------------------------- */
  updateCrushers: function (dt, player) {
    for (var i = 0; i < this.crushers.length; i++) {
      var c = this.crushers[i];

      if (c.state === "idle") {
        /* Trigger when the player walks in from the left and reaches the
           trigger line. Approaching from the right does nothing, so respawning
           past the crusher is safe. */
        if (
          player.alive &&
          player.x < c.x &&
          player.x + player.w > c.triggerX
        ) {
          c.state = "shaking";
          c.t = 0;
          this.game.registerTrap();
          this.game.camera.shake(2, 0.2);
        }
      } else if (c.state === "shaking") {
        /* A third of a second of warning. This is the whole fairness budget:
           run, and you live; hesitate, and you do not. */
        c.t += dt;
        if (Math.random() < 0.5) {
          TN.FX.add({
            x: c.x + TN.utils.randRange(0, c.w),
            y: c.y + c.h,
            vx: TN.utils.randRange(-20, 20),
            vy: TN.utils.randRange(-30, 10),
            gravity: 300,
            life: TN.utils.randRange(0.15, 0.35),
            color: "#b8bfd0",
            size: 1,
          });
        }
        if (c.t >= c.shakeDelay) {
          c.state = "falling";
          c.vy = 0;
        }
      } else if (c.state === "falling") {
        c.vy += 3600 * dt;
        c.y += c.vy * dt;

        /* Where is the floor underneath me? */
        var surface = this.map.firstSolidBelow(c.x + c.w / 2, c.y + c.h);
        if (surface === null) surface = this.map.rows * TN.TILE;

        if (c.y + c.h >= surface) {
          c.y = surface - c.h;
          c.state = "landed";
          c.t = 0;
          this.game.camera.shake(9, 0.3);
          TN.FX.burst(c.x + c.w / 2, c.y + c.h, 16, {
            colors: ["#c8b79c", "#8a7a68", "#e8ddc9"],
            speedMin: 40,
            speedMax: 160,
            gravity: 800,
            lifeMin: 0.25,
            lifeMax: 0.6,
            size: 2,
            angle: -Math.PI / 2,
            spread: 3.0,
          });
        }
      } else if (c.state === "landed") {
        /* Wait, then winch back up. This is what stops a landed crusher from
           permanently blocking the corridor. */
        c.t += dt;
        if (c.t > 1.1) {
          c.state = "retracting";
          c.t = 0;
        }
      } else if (c.state === "retracting") {
        c.y -= 46 * dt;
        if (c.y <= c.homeY) {
          c.y = c.homeY;
          c.state = "idle";
          c.t = 0;
          c.vy = 0;
        }
      }

      /* Touching a crusher is always fatal unless it is parked back home. */
      if (c.state !== "idle" && TN.utils.aabb(player, c)) {
        this.game.deathManager.kill("crush");
        return;
      }
    }
  },

  /* ---- the "free upgrade" gem ------------------------------------------ */
  updateGems: function (dt, player) {
    for (var i = 0; i < this.gems.length; i++) {
      var gem = this.gems[i];
      gem.bob += dt;

      if (gem.collected) continue;
      if (!player.alive) continue;

      if (TN.utils.aabb(player, gem)) {
        gem.collected = true;
        this.game.registerTrap();
        this.game.camera.shake(5, 0.25);

        TN.FX.burst(gem.x + 6, gem.y + 6, 20, {
          colors: [TN.C.gem, TN.C.gemShine, "#ffffff", TN.C.gemDark],
          speedMin: 40,
          speedMax: 170,
          gravity: 320,
          lifeMin: 0.3,
          lifeMax: 0.8,
          size: 2,
        });

        /* The nasty part: an instant spike eruption around the player. */
        if (gem.eruption) {
          this.revealSpikeGroup(gem.eruption);
        }

        /* The joke lands a beat later, so the player has time to feel clever
           for grabbing the shiny thing. */
        var self = this;
        setTimeout(function () {
          self.game.dialogue.sayFrom("collect", { style: "bad" });
        }, 260);
      }
    }
  },

  /* ---- proximity mines -------------------------------------------------- */
  updateMines: function (dt, player) {
    for (var i = 0; i < this.mines.length; i++) {
      var m = this.mines[i];
      m.anim += dt;

      if (m.state === "idle") {
        if (!player.alive) continue;

        /* How far is the player's centre from the middle of the mine? */
        var dx = Math.abs(player.centreX() - (m.x + m.w / 2));
        var dy = Math.abs(player.centreY() - (m.y + m.h / 2));

        if (dx < m.radius + player.w / 2 && dy < 22) {
          m.state = "armed";
          m.t = 0;
          this.game.registerTrap();
          this.game.camera.shake(2, 0.15);

          /* A little spark off the fuse so the blink has a sound-alike. */
          TN.FX.burst(m.x + m.w / 2, m.y, 5, {
            colors: ["#ffd35c", "#ff8a3d", "#ffffff"],
            speedMin: 20,
            speedMax: 70,
            gravity: -40,
            lifeMin: 0.15,
            lifeMax: 0.4,
            size: 1,
          });
        }
      } else if (m.state === "armed") {
        m.t += dt;
        if (m.t >= m.fuse) {
          m.state = "boom";
          m.t = 0;
          this.explodeMine(m, player);
        }
      } else if (m.state === "boom") {
        m.t += dt;
        if (m.t >= m.cooldown) {
          m.state = "idle";
          m.t = 0;
        }
      }
    }
  },

  /* Go off. Anything inside the blast box dies immediately. */
  explodeMine: function (m, player) {
    var cx = m.x + m.w / 2;
    var cy = m.y + m.h / 2;

    TN.FX.burst(cx, cy, 26, {
      colors: [TN.C.fire1, TN.C.fire2, TN.C.fire3, "#ffffff", TN.C.smoke],
      speedMin: 50,
      speedMax: 230,
      gravity: 420,
      lifeMin: 0.25,
      lifeMax: 0.8,
      size: 3,
    });

    this.game.camera.shake(13, 0.35);

    /* The blast is a square around the mine centre. */
    var blast = { x: cx - 20, y: cy - 20, w: 40, h: 40 };
    if (player.alive && TN.utils.aabb(player, blast)) {
      this.game.deathManager.kill("explosion");
    }
  },

  /* ---- doors ----------------------------------------------------------- */
  updateExits: function (dt, player) {
    for (var i = 0; i < this.exits.length; i++) {
      var e = this.exits[i];

      /* The real door rises out of the ground once it is unlocked. */
      if (e.state === "rising") {
        e.t += dt;
        var p = TN.utils.clamp(e.t / 0.6, 0, 1);
        e.riseOffset = 30 * (1 - p);
        if (p >= 1) {
          e.state = "open";
          e.riseOffset = 0;
          TN.FX.burst(e.x + e.w / 2, e.y + e.h, 14, {
            colors: ["#c8b79c", "#8fa06a", "#efe6d6"],
            speedMin: 30,
            speedMax: 130,
            gravity: 700,
            lifeMin: 0.3,
            lifeMax: 0.7,
            size: 2,
          });
          this.game.camera.shake(4, 0.25);
        }
      }

      if (!player.alive) continue;

      if (e.kind === "fake" && e.state === "idle") {
        if (TN.utils.aabb(player, e)) {
          this.springFakeExit(e, player);
          return;
        }
      } else if (e.kind === "real" && e.state === "open") {
        if (TN.utils.aabb(player, e)) {
          this.game.onLevelComplete();
          return;
        }
      }
    }
  },

  /* The moment the player finally touches the exit door. */
  springFakeExit: function (e, player) {
    e.state = "sprung";
    e.t = 0;

    /* Statistics: was this the first time this level's fake door got us? */
    this.game.registerFakeExit();

    /* Spikes slam out of the doorway. */
    var g = this.addSpikeGroup(e.tx - 1, e.ty - 1, 3, true);
    this.revealSpikeGroup(g);

    TN.FX.burst(e.x + e.w / 2, e.y + e.h / 2, 26, {
      colors: ["#d8d8e8", "#9aa3b8", "#ffffff", "#8a3030"],
      speedMin: 50,
      speedMax: 220,
      gravity: 500,
      lifeMin: 0.25,
      lifeMax: 0.7,
      size: 2,
    });

    this.game.camera.shake(12, 0.4);

    /* Unlock the real door. It rises nearby with a very smug little puff. */
    this.revealRealExit();

    this.game.deathManager.kill("fakeExit");
  },

  /* Raise the real exit door out of the ground. Safe to call more than once:
     it only ever acts on a door that is still hidden. */
  revealRealExit: function () {
    for (var i = 0; i < this.exits.length; i++) {
      var e = this.exits[i];
      if (e.kind === "real" && e.state === "hidden") {
        e.state = "rising";
        e.t = 0;
      }
    }
  },

  /* ---- hidden switches -------------------------------------------------- */
  updateSwitches: function (dt, player) {
    for (var i = 0; i < this.switches.length; i++) {
      var s = this.switches[i];
      s.anim += dt;
      if (s.active) continue;
      if (!player.alive) continue;

      if (TN.utils.aabb(player, s)) {
        s.active = true;
        TN.FX.burst(s.x + 5, s.y + 5, 16, {
          colors: ["#7fe3a0", "#ffffff", "#3fae82"],
          speedMin: 30,
          speedMax: 130,
          gravity: 220,
          lifeMin: 0.3,
          lifeMax: 0.7,
          size: 2,
        });
        this.game.camera.shake(3, 0.18);
        this.game.dialogue.sayFrom("switch", { style: "good" });

        /* Every switch pressed? Then let the player out. */
        if (this.allSwitchesActive()) {
          this.game.dialogue.say("ALL SWITCHES FOUND. THE DOOR IS AWAKE.", {
            style: "good",
          });
          this.revealRealExit();
        }
      }
    }
  },

  allSwitchesActive: function () {
    if (this.switches.length === 0) return false;
    for (var i = 0; i < this.switches.length; i++) {
      if (!this.switches[i].active) return false;
    }
    return true;
  },

  /* -----------------------------------------------------------------------
     DRAW: traps, drawn BEFORE the player so the player is always visible.
     ----------------------------------------------------------------------- */
  draw: function (ctx, cam) {
    this.drawCrumbleOverlay(ctx, cam);
    this.drawExits(ctx, cam);
    this.drawSwitches(ctx, cam);
    this.drawSpikeGroups(ctx, cam);
    this.drawCrushers(ctx, cam);
    this.drawGems(ctx, cam);
    this.drawMines(ctx, cam);
  },

  /* ---- spikes ----------------------------------------------------------- */
  drawSpikeGroups: function (ctx, cam) {
    for (var i = 0; i < this.spikeGroups.length; i++) {
      var g = this.spikeGroups[i];
      var sx = g.x - cam.x;
      if (sx + g.w < -20 || sx > TN.VIEW_W + 20) continue;

      var x = Math.round(sx + cam.offsetX);
      var y = Math.round(g.y - cam.y + cam.offsetY);

      if (g.state === "hidden") {
        /* Levels 1 and 2 show a very faint seam in the floor - blink and you
           miss it, but it IS there, so those deaths are never unfair.
           From level 3 onward the game stops pointing, so the seam is gone. */
        if (this.level.id >= 3) continue;

        ctx.save();
        ctx.globalAlpha = 0.28;
        for (var bx = 0; bx < g.w; bx += 4) {
          TN.utils.rect(ctx, x + bx, y + TN.TILE - 1, 2, 1, "#2c2030");
        }
        ctx.restore();
        continue;
      }

      this.drawSpikeRow(ctx, x, y, g.w, TN.TILE, g.t);
    }
  },

  /* A strip of upward pointing pixel triangles. */
  drawSpikeRow: function (ctx, x, y, w, h, progress) {
    var visible = Math.max(1, Math.round(h * progress));
    var count = Math.max(1, Math.floor(w / 8));
    var spikeW = w / count;
    var baseY = y + h;

    for (var i = 0; i < count; i++) {
      var cx = x + i * spikeW + spikeW / 2;

      /* Build the triangle one pixel row at a time: narrow at the tip and
         widening towards the base. */
      for (var row = 0; row < visible; row++) {
        var half = Math.max(0.5, ((row + 1) * (spikeW / 2)) / visible);
        TN.utils.rect(
          ctx,
          cx - half,
          baseY - visible + row,
          half * 2,
          1,
          TN.C.spike,
        );
      }
      /* Dark base and a highlight down the left side for a metallic look. */
      TN.utils.rect(ctx, cx - spikeW / 2, baseY - 1, spikeW, 1, TN.C.spikeDark);
      if (visible > 4) {
        TN.utils.rect(
          ctx,
          cx - 1,
          baseY - visible + 2,
          1,
          visible - 3,
          "#ffffff",
        );
      }
    }
  },

  /* ---- crumbling platforms --------------------------------------------- */
  drawCrumbleOverlay: function (ctx, cam) {
    /* The tiles themselves are drawn by the Tilemap. This only adds the
       "about to fall" wobble on top of the tiles that are currently shaking. */
    for (var i = 0; i < this.crumbleTiles.length; i++) {
      var tile = this.crumbleTiles[i];
      if (tile.state !== "shaking") continue;

      var x = Math.round(tile.tx * TN.TILE - cam.x + cam.offsetX);
      var y = Math.round(tile.ty * TN.TILE - cam.y + cam.offsetY);

      /* A 1 pixel shudder that grows as the tile gets closer to breaking. */
      var strength = TN.utils.clamp(tile.t / tile.delay, 0, 1);
      var jitter =
        (Math.floor(tile.t * 40) % 2 === 0 ? 1 : -1) * Math.round(strength);
      TN.utils.rect(ctx, x + jitter, y, TN.TILE, 1, TN.C.crateDark);
      TN.utils.rect(ctx, x + 2 + jitter, y + 3, TN.TILE - 4, 1, TN.C.crateDark);
      TN.utils.rect(
        ctx,
        x + 3,
        y + TN.TILE - 3,
        TN.TILE - 6,
        1,
        TN.C.crateDark,
      );
    }
  },

  /* ---- crushers --------------------------------------------------------- */
  drawCrushers: function (ctx, cam) {
    for (var i = 0; i < this.crushers.length; i++) {
      var c = this.crushers[i];
      var x = Math.round(c.x - cam.x + cam.offsetX);
      var y = Math.round(c.y - cam.y + cam.offsetY);

      if (x + c.w < -20 || x > TN.VIEW_W + 20) continue;

      var R = TN.utils.rect;

      /* Main body. */
      R(ctx, x, y, c.w, c.h, TN.C.crusher);
      R(ctx, x, y, c.w, 2, "#98a2bc");
      R(ctx, x + 1, y + 2, c.w - 2, c.h - 6, TN.C.crusherDk);

      /* Hazard stripes across the middle. */
      for (var s = 0; s < c.w - 4; s += 4) {
        R(ctx, x + 2 + s, y + Math.floor(c.h / 2) - 2, 2, 4, "#e8c44a");
      }

      /* Rivets. */
      R(ctx, x + 1, y + 3, 2, 2, TN.C.metal);
      R(ctx, x + c.w - 3, y + 3, 2, 2, TN.C.metal);

      /* Spiky underside, so touching it obviously means death. */
      var teeth = Math.floor(c.w / 6);
      for (var t = 0; t < teeth; t++) {
        var tx = x + t * (c.w / teeth);
        for (var row = 0; row < 4; row++) {
          var half = Math.max(0.5, (4 - row) * 1.2);
          R(
            ctx,
            tx + c.w / teeth / 2 - half,
            y + c.h + row,
            half * 2,
            1,
            TN.C.spike,
          );
        }
      }
    }
  },

  /* ---- gem -------------------------------------------------------------- */
  drawGems: function (ctx, cam) {
    for (var i = 0; i < this.gems.length; i++) {
      var gem = this.gems[i];
      if (gem.collected) continue;

      /* Bob up and down gently to look valuable and inviting. */
      var bob = Math.round(Math.sin(gem.bob * 3) * 2);
      var x = Math.round(gem.x - cam.x + cam.offsetX);
      var y = Math.round(gem.y - cam.y + cam.offsetY) + bob;
      var R = TN.utils.rect;

      /* Sparkle behind the gem. */
      var sparkle = Math.floor(gem.bob * 4) % 3;
      if (sparkle === 0) {
        R(ctx, x - 3, y + 5, 2, 2, "#ffffff");
        R(ctx, x + 13, y + 4, 2, 2, "#ffffff");
      }
      if (sparkle === 1) {
        R(ctx, x + 5, y - 3, 2, 2, TN.C.gemShine);
      }

      /* A diamond: wide in the middle, pointed top and bottom. */
      R(ctx, x + 4, y, 4, 2, TN.C.gemShine);
      R(ctx, x + 2, y + 2, 8, 3, TN.C.gem);
      R(ctx, x + 1, y + 5, 10, 3, TN.C.gem);
      R(ctx, x + 3, y + 8, 6, 2, TN.C.gemDark);
      R(ctx, x + 5, y + 10, 2, 2, TN.C.gemDark);
      /* Facet highlight. */
      R(ctx, x + 4, y + 3, 2, 3, "#ffffff");
    }
  },

  /* ---- proximity mines -------------------------------------------------- */
  drawMines: function (ctx, cam) {
    var R = TN.utils.rect;
    for (var i = 0; i < this.mines.length; i++) {
      var m = this.mines[i];
      var x = Math.round(m.x - cam.x + cam.offsetX);
      var y = Math.round(m.y - cam.y + cam.offsetY);
      if (x + m.w < -20 || x > TN.VIEW_W + 20) continue;

      /* For a split second after it goes off the drum is nothing but a
         ball of fire, then it fades back to a harmless-looking little box. */
      if (m.state === "boom") {
        var f = 1 - m.t / m.cooldown;
        var r = 16 + (1 - f) * 12;
        R(ctx, x + m.w / 2 - r, y + m.h / 2 - r, r * 2, r * 2, TN.C.fire3);
        R(ctx, x - 2, y - 4, m.w + 4, m.h + 2, TN.C.fire2);
        R(ctx, x + 3, y - 1, m.w - 6, m.h - 6, TN.C.fire1);
        R(ctx, x + m.w / 2 - 2, y + 3, 4, 4, "#ffffff");
        continue;
      }

      /* The drum: a squat cylinder of dark metal. */
      R(ctx, x, y + 2, m.w, m.h - 2, "#3a3f52");
      R(ctx, x + 1, y + 1, m.w - 2, 3, "#565d75"); /* top rim catches light */
      R(ctx, x, y + m.h - 2, m.w, 2, "#22273a"); /* shadowed base */

      /* Two little bolts so it reads as something man-made. */
      R(ctx, x + 2, y + 6, 2, 2, TN.C.metal);
      R(ctx, x + m.w - 4, y + 6, 2, 2, TN.C.metal);

      /* Indicator light in the middle.
         Idle  -> slow, calm amber pulse (obvious if you actually look).
         Armed -> frantic red strobe, so a player who stops in time can back off. */
      var lit;
      var col;
      if (m.state === "armed") {
        lit = Math.floor(m.t * 18) % 2 === 0;
        col = "#ff2f2f";
      } else {
        lit = Math.floor(m.anim * 3) % 2 === 0;
        col = "#ffb020";
      }
      R(ctx, x + m.w / 2 - 2, y + 5, 4, 4, lit ? col : "#262a38");
    }
  },

  /* ---- hidden switches -------------------------------------------------- */
  drawSwitches: function (ctx, cam) {
    var R = TN.utils.rect;
    for (var i = 0; i < this.switches.length; i++) {
      var s = this.switches[i];
      var x = Math.round(s.x - cam.x + cam.offsetX);
      var y = Math.round(s.y - cam.y + cam.offsetY);
      if (x + 20 < -20 || x > TN.VIEW_W + 20) continue;

      /* Base plate bolted to the floor. */
      R(ctx, x - 1, y + 8, 12, 4, "#3a3f52");
      R(ctx, x - 1, y + 12, 12, 2, "#262a38");

      /* The lever itself: red while it needs pressing, green once it is on. */
      if (s.active) {
        R(ctx, x + 1, y + 2, 8, 7, "#2f7d5c");
        R(ctx, x + 2, y + 3, 6, 5, "#7fe3a0");
      } else {
        R(ctx, x + 1, y + 2, 8, 7, "#7a3a36");
        R(ctx, x + 2, y + 3, 6, 5, "#d4593f");
      }

      /* A blinking indicator light so an unused switch catches the eye. */
      var lit = s.active || Math.floor(s.anim * 3) % 2 === 0;
      R(ctx, x + 9, y + 3, 2, 2, lit ? "#fff3b0" : "#33384a");
    }
  },

  /* ---- doors ------------------------------------------------------------ */
  drawExits: function (ctx, cam) {
    for (var i = 0; i < this.exits.length; i++) {
      var e = this.exits[i];
      if (e.state === "hidden") continue;

      var x = Math.round(e.x - cam.x + cam.offsetX);
      var y = Math.round(e.y - cam.y + cam.offsetY);
      if (x + e.w < -30 || x > TN.VIEW_W + 30) continue;

      /* The real door slides up out of the ground, so clip it to only draw
         the part that has "arrived". */
      var clipped = e.riseOffset > 0;
      if (clipped) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 4, y + e.riseOffset - 6, e.w + 8, e.h + 12);
        ctx.clip();
      }

      var R = TN.utils.rect;
      var yy = y + Math.round(e.riseOffset);
      var sprung = e.state === "sprung";

      /* Ground plate / step in front of the door. */
      R(ctx, x - 2, yy + e.h - 3, e.w + 4, 3, TN.C.rock);

      /* Frame. */
      R(ctx, x, yy, e.w, e.h, sprung ? "#4a2b22" : TN.C.woodDark);
      /* Door panel. */
      R(ctx, x + 2, yy + 3, e.w - 4, e.h - 5, sprung ? "#1d1410" : TN.C.door);
      R(
        ctx,
        x + 3,
        yy + 4,
        e.w - 6,
        e.h - 7,
        sprung ? "#120c09" : TN.C.doorDark,
      );
      /* Two lighter inlay panels, purely decoration. */
      R(ctx, x + 4, yy + 6, e.w - 8, 7, sprung ? "#2a1c15" : "#3fae82");
      R(ctx, x + 4, yy + 16, e.w - 8, 8, sprung ? "#2a1c15" : "#3fae82");
      /* Handle. */
      R(ctx, x + e.w - 5, yy + 14, 2, 3, "#ffd35c");

      if (!sprung) {
        /* A soft glow, because a glowing door is obviously the way out. */
        ctx.save();
        ctx.globalAlpha = 0.16 + Math.sin(this.game.time * 3 + i) * 0.06;
        R(ctx, x - 3, yy, e.w + 6, e.h, "#8effc4");
        ctx.restore();
      }

      if (clipped) ctx.restore();

      /* Label above the door. The fake one says EXIT too - that is the joke. */
      var label = sprung ? "NICE TRY" : "EXIT";
      var labelColor = sprung ? TN.C.uiBad : TN.C.uiGood;
      TN.Font.draw(ctx, label, x + e.w / 2, yy - 12, {
        color: labelColor,
        align: "center",
        shadow: "#000000",
      });

      /* If it has sprung, show the spikes that came out of it. */
      if (sprung) {
        R(ctx, x + 3, yy + 12, e.w - 6, 2, "#3a3a48");
      }
    }
  },

  /* -----------------------------------------------------------------------
     Anything the player must not touch this frame, as a list of rectangles
     with a "cause". The Level Manager merges this with its own hazards.
     ----------------------------------------------------------------------- */
  hazards: function () {
    var list = [];
    for (var i = 0; i < this.spikeGroups.length; i++) {
      var g = this.spikeGroups[i];
      if (g.state === "up" && g.t > 0.5) {
        list.push({ x: g.x, y: g.y + 4, w: g.w, h: g.h - 4, cause: "spike" });
      }
    }
    return list;
  },
};
