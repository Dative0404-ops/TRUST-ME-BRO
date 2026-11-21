/* =========================================================================
   TRUST NOTHING - core/game.js
   -------------------------------------------------------------------------
   The Game is the conductor. Every other file is a specialist that does one
   job well; this file is the one that knows the running order.

   It owns:
     - the player and the camera,
     - the current Level Manager (which in turn owns the traps, the
       checkpoints, the coins and the background),
     - the Death Manager, the Dialogue Manager and the Save Manager,
     - the HUD (hearts, coins, timer, death counter),
     - pause, restart and the "level cleared" screen.

   It also provides the small set of hooks the managers call back into:

     registerTrap()       - a trap went off; count it
     registerFakeExit()   - the player touched a lying door; count it
     onPlayerDeath(cause)- the Death Manager started an animation; count it
     respawnPlayer()      - the animation finished; put the player back
     onLevelComplete()    - the real door was reached

   Nothing in here is allowed to reach inside the managers to change their
   state. Everything the managers need, they ask the Game for.
   ========================================================================= */

TN.Game = function (ctx, canvas) {
  this.ctx = ctx;
  this.canvas = canvas;

  /* -----------------------------------------------------------------------
     Clocks and counters.

     this.time    - drives every little animation (stars, flags, doors).
                    It only advances while the world is actually running.
     sessionTime  - what the HUD clock shows. Resets when the page reloads.
     ----------------------------------------------------------------------- */
  this.time = 0;
  this.sessionTime = 0;
  this.deathCount = 0;
  this.trapCount = 0;

  /* Game states. Only one of these is ever true at a time. */
  this.paused = false;
  this.completed = false;
  /* The clock reading at the moment the level was beaten (see update()). */
  this.completedAt = 0;

  /* How long the control hint stays on screen at the start. */
  this.hintTimer = 7;

  /* We only write the save file every few seconds, not every frame. */
  this.saveTimer = 0;

  /* -----------------------------------------------------------------------
     Build the shared services first, because the Level Manager reads from
     some of them while it is being constructed.
     ----------------------------------------------------------------------- */
  this.save = new TN.SaveManager();
  this.dialogue = new TN.DialogueManager();
  this.deathManager = new TN.DeathManager(this);

  /* -----------------------------------------------------------------------
     Which level do we start on? The save file remembers how far the player
     has unlocked, but only levels that actually exist in this build can be
     loaded. Anything else falls back to level 1.
     ----------------------------------------------------------------------- */
  this.levelId = this.save.data.unlocked || 1;
  if (!TN.Levels.exists(this.levelId)) this.levelId = 1;

  this.level = null;
  this.player = null;
  this.camera = null;

  /* Load the level and say hello. */
  this.loadLevel(this.levelId, true);
};

TN.Game.prototype = {

  /* -----------------------------------------------------------------------
     LEVEL SETUP
     ----------------------------------------------------------------------- */

  /* Create the level, put the player at the right spawn point and snap the
     camera there. "initial" is true only for the very first load, which is
     the only time we play the intro line. */
  loadLevel: function (levelId, initial) {
    if (!TN.Levels.exists(levelId)) {
      console.error('TRUST NOTHING: level ' + levelId + ' does not exist.');
      return;
    }

    this.levelId = levelId;
    this.level = new TN.LevelManager(this, levelId);

    /* Where should the player appear? The checkpoint manager knows: it is
       either the level's default spawn or the last flag that was touched. */
    var spawn = this.level.checkpoints.getSpawn();

    if (!this.player) {
      /* First ever load - create the player. */
      this.player = new TN.Player(spawn.x, spawn.y);
    } else {
      this.player.reset(spawn.x, spawn.y);
    }

    /* A camera sized to this particular level, then jump straight to the
       player so the screen does not fly across the map on load. */
    this.camera = new TN.Camera(this.level.worldW, this.level.worldH);
    this.camera.snapTo(this.player);

    /* Start each level clean. */
    this.completed = false;
    this.completedAt = 0;
    this.paused = false;
    this.hintTimer = 7;
    this.saveTimer = 0;
    TN.FX.clear();
    this.dialogue.clear();

    /* A sarcastic one-liner on arrival. Not on a restart, only on load. */
    if (initial) this.sayIntro();
  },

  /* Pick one of the level's intro lines and show it as a hint. */
  sayIntro: function () {
    var lines = this.level.config.introLines;
    if (!lines || lines.length === 0) return;
    this.dialogue.say(TN.utils.pickFresh(lines, []), {
      style: 'hint',
      duration: 3.4
    });
  },

  /* -----------------------------------------------------------------------
     CALLBACKS THE MANAGERS USE
     ----------------------------------------------------------------------- */

  /* A trap went off (spikes revealed, a platform broke, a crusher dropped,
     the gem was grabbed). Count it in the save file's statistics. */
  registerTrap: function () {
    this.trapCount += 1;
    this.save.recordTrap();
  },

  /* The player walked into the fake exit door. Statistical gold. */
  registerFakeExit: function () {
    this.save.recordFakeExit();
  },

  /* The Death Manager called this the instant something killed the player,
     before the animation has even started. */
  onPlayerDeath: function (cause) {
    this.deathCount += 1;
    this.save.recordDeath();
  },

  /* The death animation has finished. Put the level back to its armed state
     and drop the player onto the current checkpoint. */
  respawnPlayer: function () {
    var spawn = this.level.checkpoints.getSpawn();
    this.level.reset();
    this.player.reset(spawn.x, spawn.y);
    this.camera.snapTo(this.player);
  },

  /* The real door was reached. Mark the level done and freeze the world on
     the victory panel. */
  onLevelComplete: function () {
    if (this.completed) return;
    this.completed = true;
    /* Remember WHEN, so the "press enter to continue" prompt cannot be
       triggered by the same jump that touched the door. */
    this.completedAt = this.time;
    this.save.markComplete(this.level.id, this.level.id + 1);
    this.save.save();
    this.dialogue.clear();
  },

  /* -----------------------------------------------------------------------
     RESTART (the R key)
     -----------------------------------------------------------------------
     R does NOT wipe progress. It puts the player back on the last checkpoint
     with the level re-armed, which is the "I am stuck, let me try again"
     button. A full wipe would be a much bigger, much ruder gesture.
     ----------------------------------------------------------------------- */
  restartLevel: function () {
    this.deathManager.clear();
    this.completed = false;
    this.paused = false;

    var spawn = this.level.checkpoints.getSpawn();
    this.level.reset();
    this.player.reset(spawn.x, spawn.y);
    this.camera.snapTo(this.player);

    TN.FX.clear();
    this.dialogue.clear();
  },

  /* -----------------------------------------------------------------------
     THE FIXED PHYSICS STEP
     -----------------------------------------------------------------------
     dt is always TN.STEP (1/60 second). Whether the player can perform an
     action, not how long it takes, is what matters here.
     ----------------------------------------------------------------------- */
  update: function (dt) {

    /* These two work in every state, including paused and completed, so the
       player is never trapped. */
    if (TN.Input.actionPressed('pause')) this.paused = !this.paused;
    if (TN.Input.actionPressed('restart')) {
      this.restartLevel();
      return;
    }

    /* While paused nothing in the world ticks. */
    if (this.paused) return;

    /* Clocks and presentation always run, so the victory screen still has
       twinkling stars behind it. */
    this.time += dt;
    this.sessionTime += dt;
    this.dialogue.update(dt);
    TN.FX.update(dt);

    /* The level is beaten: stop simulating and leave the panel up. After a
       short beat, pressing confirm (Enter / Space) moves straight on to the
       next level, if one exists in this build. */
    if (this.completed) {
      if (this.time - this.completedAt > 0.5 &&
          TN.Input.actionPressed('confirm')) {
        var nextLevel = TN.Levels.next(this.level.id);
        if (nextLevel) this.loadLevel(nextLevel.id, true);
      }
      return;
    }

    if (this.hintTimer > 0) this.hintTimer -= dt;

    /* -------------------------------------------------------------------
       While a death animation is playing the player is not updated at all;
       the Death Manager is driving. Only the camera (for screen shake) and
       the particles keep going.
       ------------------------------------------------------------------- */
    if (this.deathManager.active) {
      this.camera.update(dt);
      this.deathManager.update(dt);
      return;
    }

    /* -------------------------------------------------------------------
       Normal play, in the order that matters:

         1. the player moves and collides,
         2. the level reacts (traps fire, coins are taken, hazards checked),
         3. the camera catches up.
       ------------------------------------------------------------------- */
    this.player.update(dt, this.level.map);
    this.level.update(dt);
    this.camera.follow(this.player, dt);

    /* Total playtime is a statistic, so it goes into the save file too - but
       only written to storage every few seconds, not 60 times a second. */
    this.save.addPlaytime(dt);
    this.saveTimer += dt;
    if (this.saveTimer >= 5) {
      this.saveTimer = 0;
      this.save.save();
    }
  },

  /* -----------------------------------------------------------------------
     RENDER
     ----------------------------------------------------------------------- */
  render: function () {
    var ctx = this.ctx;
    var cam = this.camera;

    /* Belt and braces: keep every rectangle hard-edged. */
    ctx.imageSmoothingEnabled = false;

    /* Clear, in case a level ever leaves part of the screen unpainted. */
    TN.utils.rect(ctx, 0, 0, TN.VIEW_W, TN.VIEW_H, '#05050c');

    /* --- 1. everything behind the player --- */
    this.level.draw(ctx, cam);

    /* --- 2. the player, or the death animation of the player --- */
    if (this.deathManager.active) {
      this.deathManager.draw(ctx, cam);
    } else {
      this.player.draw(ctx, cam);
    }

    /* --- 3. things that sit in front of the player (sign bubbles) --- */
    this.level.drawFront(ctx, cam);

    /* --- 4. particles on top of everything in the world --- */
    TN.FX.draw(ctx, cam);

    /* --- 5. the dialogue box (the sarcastic message), in front of the world
           but behind the pause / victory panels so it never covers them --- */
    this.dialogue.draw(ctx);

    /* --- 6. the interface --- */
    this.drawHUD(ctx);

    if (this.paused) this.drawPause(ctx);
    if (this.completed) this.drawVictory(ctx);
  },

  /* -----------------------------------------------------------------------
     HUD
     -----------------------------------------------------------------------
     Kept deliberately small: hearts, level name, coins, timer and the death
     counter. Anything more would clutter a 480x270 screen.
     ----------------------------------------------------------------------- */
  drawHUD: function (ctx) {
    var C = TN.C;

    /* ---- hearts, top left ---- */
    for (var i = 0; i < this.player.maxHealth; i++) {
      this.drawHeart(ctx, 6 + i * 10, 7, i < this.player.health);
    }

    /* ---- level name, under the hearts ---- */
    TN.Font.draw(
      ctx,
      'LV' + this.level.id + ' - ' + this.level.name,
      6, 18,
      { color: C.uiDim, shadow: '#000000' }
    );

    /* ---- right hand column ---- */
    var coins = this.level.coinsCollected + '/' + this.level.coinTotal;
    TN.Font.draw(ctx, coins, TN.VIEW_W - 6, 7, {
      color: C.coin, align: 'right', shadow: '#000000'
    });
    TN.Font.draw(ctx, TN.utils.formatTime(this.sessionTime), TN.VIEW_W - 6, 16, {
      color: C.uiDim, align: 'right', shadow: '#000000'
    });
    TN.Font.draw(ctx, 'DEATHS ' + this.deathCount, TN.VIEW_W - 6, 25, {
      color: C.uiBad, align: 'right', shadow: '#000000'
    });

    /* ---- the starting control hint, which fades away ---- */
    if (this.hintTimer > 0) {
      var alpha = TN.utils.clamp(this.hintTimer, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      TN.Font.draw(
        ctx,
        'ARROWS OR WASD MOVE - SPACE JUMPS (TWICE) - SHIFT RUNS - R RESTARTS',
        TN.VIEW_W / 2, 34,
        { color: C.uiWarn, align: 'center', shadow: '#000000' }
      );
      ctx.restore();
    }
  },

  /* A 7x6 pixel heart. Full hearts are red, empty ones are a dark husk. */
  drawHeart: function (ctx, x, y, full) {
    var R = TN.utils.rect;
    var body = full ? TN.C.uiBad : '#3a2a30';
    var shine = full ? '#ffd0d0' : '#4a3840';

    R(ctx, x + 1, y, 2, 2, body);
    R(ctx, x + 4, y, 2, 2, body);
    R(ctx, x, y + 2, 7, 2, body);
    R(ctx, x + 1, y + 4, 5, 1, body);
    R(ctx, x + 2, y + 5, 3, 1, body);
    if (full) R(ctx, x + 2, y + 1, 1, 1, shine);
  },

  /* -----------------------------------------------------------------------
     A simple centred panel, used by the pause and victory screens.
     ----------------------------------------------------------------------- */
  panel: function (ctx, x, y, w, h) {
    var R = TN.utils.rect;
    R(ctx, x, y, w, h, 'rgba(6,6,16,0.92)');
    R(ctx, x, y, w, 1, '#5a5286');
    R(ctx, x, y + h - 1, w, 1, '#5a5286');
    R(ctx, x, y, 1, h, '#5a5286');
    R(ctx, x + w - 1, y, 1, h, '#5a5286');
  },

  drawPause: function (ctx) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    TN.utils.rect(ctx, 0, 0, TN.VIEW_W, TN.VIEW_H, '#05050c');
    ctx.restore();

    var w = 200, h = 54;
    var x = (TN.VIEW_W - w) / 2;
    var y = (TN.VIEW_H - h) / 2;
    this.panel(ctx, x, y, w, h);

    TN.Font.draw(ctx, 'PAUSED', TN.VIEW_W / 2, y + 12, {
      color: TN.C.uiWarn, align: 'center', shadow: '#000000'
    });
    TN.Font.draw(ctx, 'ESC OR P TO RESUME', TN.VIEW_W / 2, y + 26, {
      color: TN.C.uiDim, align: 'center'
    });
    TN.Font.draw(ctx, 'R TO RESTART AT CHECKPOINT', TN.VIEW_W / 2, y + 38, {
      color: TN.C.uiDim, align: 'center'
    });
  },

  /* -----------------------------------------------------------------------
     VICTORY / LEVEL CLEARED
     -----------------------------------------------------------------------
     A modest version of the future "secret ending" screen. It still shows
     the five statistics the brief asks for, so the plumbing is already in
     place for when all five levels exist.
     ----------------------------------------------------------------------- */
  drawVictory: function (ctx) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    TN.utils.rect(ctx, 0, 0, TN.VIEW_W, TN.VIEW_H, '#05050c');
    ctx.restore();

    var stats = this.save.summary();

    var w = 250, h = 116;
    var x = (TN.VIEW_W - w) / 2;
    var y = (TN.VIEW_H - h) / 2;
    this.panel(ctx, x, y, w, h);

    var cx = TN.VIEW_W / 2;
    var left = x + 16;
    var right = x + w - 16;

    TN.Font.draw(ctx, 'LEVEL ' + this.level.id + ' CLEARED', cx, y + 10, {
      color: TN.C.uiGood, align: 'center', shadow: '#000000'
    });
    TN.Font.draw(ctx, 'OF COURSE IT WAS A TRAP. WELL DONE.', cx, y + 22, {
      color: TN.C.uiDim, align: 'center'
    });

    /* ---- the five statistics, label left, value right ---- */
    var rows = [
      ['TOTAL DEATHS', String(stats.deaths)],
      ['TOTAL PLAY TIME', TN.utils.formatTime(stats.playtime)],
      ['TRAPS TRIGGERED', String(stats.traps)],
      ['COINS COLLECTED', String(stats.coins)],
      ['FAKE EXITS FOUND', String(stats.fakeExits)]
    ];

    for (var i = 0; i < rows.length; i++) {
      var ry = y + 40 + i * 11;
      TN.Font.draw(ctx, rows[i][0], left, ry, { color: TN.C.uiDim });
      TN.Font.draw(ctx, rows[i][1], right, ry, {
        color: TN.C.uiText, align: 'right'
      });
    }

    var nextLevel = TN.Levels.next(this.level.id);
    if (nextLevel) {
      TN.Font.draw(ctx, 'PRESS ENTER FOR LEVEL ' + nextLevel.id, cx, y + h - 16, {
        color: TN.C.uiGood, align: 'center'
      });
    } else {
      TN.Font.draw(ctx, 'MORE LEVELS COMING SOON.', cx, y + h - 16, {
        color: TN.C.uiWarn, align: 'center'
      });
    }
    TN.Font.draw(ctx, 'PRESS R TO PLAY THIS LEVEL AGAIN', cx, y + h - 6, {
      color: TN.C.uiDim, align: 'center'
    });
  }
};
