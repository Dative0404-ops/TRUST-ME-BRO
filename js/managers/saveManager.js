/* =========================================================================
   TRUST NOTHING - managers/saveManager.js
   -------------------------------------------------------------------------
   Progress saving with localStorage. There is no backend and no database in
   this project, so the browser's own storage is the database.

   What gets saved:
     - global statistics (deaths, playtime, traps, coins, fake exits)
     - how far the player has unlocked
     - per level: the last checkpoint, which coins were already taken, and
       whether the level has been completed

   Note that this is NOT "progress that survives a refresh". The Game calls
   reset() the moment it starts, so reloading the page always throws the
   player back to level 1. Everything here only has to survive for one
   session, and only so the statistics and checkpoints work within it.

   IMPORTANT: everything is wrapped in try/catch. Some browsers block
   localStorage in private mode, and older ones block it on file:// URLs.
   If storage is unavailable the game must still run, it just forgets things
   when you close the tab. A save file being unavailable should never crash
   the game.
   ========================================================================= */

TN.SaveManager = function () {
  this.key = 'trustNothing.save.v1';
  /* If localStorage is blocked we quietly keep the data here instead. */
  this.memoryOnly = false;
  this.data = this.load();
};

TN.SaveManager.prototype = {

  /* A brand new save file. */
  defaults: function () {
    return {
      version: 1,
      stats: {
        deaths: 0,
        playtime: 0,
        traps: 0,
        coins: 0,
        fakeExits: 0,
        levelsCompleted: 0
      },
      unlocked: 1,          /* highest level the player may enter */
      levels: {}
    };
  },

  /* Make sure a level has a record, creating it on first visit. */
  ensureLevel: function (levelId) {
    var id = String(levelId);
    if (!this.data.levels[id]) {
      this.data.levels[id] = {
        checkpointId: -1,
        checkpoint: null,
        coins: [],
        complete: false
      };
    }
    return this.data.levels[id];
  },

  load: function () {
    var fresh = this.defaults();
    try {
      var raw = window.localStorage.getItem(this.key);
      if (!raw) return fresh;

      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return fresh;

      /* Merge with the defaults so a save file from an older build (which
         might be missing a field) still loads correctly. */
      var merged = this.defaults();
      if (parsed.stats) {
        for (var k in merged.stats) {
          if (typeof parsed.stats[k] === 'number') merged.stats[k] = parsed.stats[k];
        }
      }
      if (typeof parsed.unlocked === 'number') merged.unlocked = parsed.unlocked;
      if (parsed.levels && typeof parsed.levels === 'object') merged.levels = parsed.levels;
      merged.version = fresh.version;
      return merged;
    } catch (e) {
      /* Storage is not available, or the saved JSON was corrupted.
         Either way: start clean and keep going. */
      this.memoryOnly = true;
      return fresh;
    }
  },

  save: function () {
    if (this.memoryOnly) return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      this.memoryOnly = true;
    }
  },

  /* Wipe everything. Exposed for a "reset progress" button later. */
  reset: function () {
    this.data = this.defaults();
    try {
      window.localStorage.removeItem(this.key);
    } catch (e) { /* nothing we can do, and nothing that matters */ }
    this.save();
  },

  /* -----------------------------------------------------------------------
     Statistics
     ----------------------------------------------------------------------- */

  recordDeath: function () {
    this.data.stats.deaths += 1;
    this.save();
  },

  recordTrap: function () {
    this.data.stats.traps += 1;
    this.save();
  },

  recordFakeExit: function () {
    this.data.stats.fakeExits += 1;
    this.save();
  },

  /* Returns false if this coin was already collected in a previous session. */
  recordCoin: function (levelId, coinId) {
    var lv = this.ensureLevel(levelId);
    if (lv.coins.indexOf(coinId) !== -1) return false;
    lv.coins.push(coinId);
    this.data.stats.coins += 1;
    this.save();
    return true;
  },

  hasCoin: function (levelId, coinId) {
    var lv = this.ensureLevel(levelId);
    return lv.coins.indexOf(coinId) !== -1;
  },

  /* Playtime is measured in seconds and only added in chunks while playing. */
  addPlaytime: function (seconds) {
    this.data.stats.playtime += seconds;
  },

  /* -----------------------------------------------------------------------
     Checkpoints
     ----------------------------------------------------------------------- */

  setCheckpoint: function (levelId, checkpointId, x, y) {
    var lv = this.ensureLevel(levelId);
    /* Only ever move forwards. Walking back over an old checkpoint should not
       send you back to it if you die later. */
    if (checkpointId < lv.checkpointId) return;
    lv.checkpointId = checkpointId;
    lv.checkpoint = { x: x, y: y };
    this.save();
  },

  getCheckpoint: function (levelId) {
    return this.ensureLevel(levelId).checkpoint;
  },

  getCheckpointId: function (levelId) {
    return this.ensureLevel(levelId).checkpointId;
  },

  /* -----------------------------------------------------------------------
     Level progress
     ----------------------------------------------------------------------- */

  markComplete: function (levelId, nextLevel) {
    var lv = this.ensureLevel(levelId);
    if (!lv.complete) {
      lv.complete = true;
      this.data.stats.levelsCompleted += 1;
    }
    if (nextLevel && nextLevel > this.data.unlocked) {
      this.data.unlocked = nextLevel;
    }
    this.save();
  },

  isComplete: function (levelId) {
    return !!this.ensureLevel(levelId).complete;
  },

  /* Handy one-liner for the title/HUD screens. */
  summary: function () {
    return this.data.stats;
  }
};
