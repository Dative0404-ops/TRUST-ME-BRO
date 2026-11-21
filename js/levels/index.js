/* =========================================================================
   TRUST NOTHING - levels/index.js
   -------------------------------------------------------------------------
   The level registry.

   Each level lives in its own file (level1.js, level2.js, ...) and simply
   drops a pure-data object onto TN.Levels, for example:

       TN.Levels.LEVEL_1 = { id: 1, name: '...', world: {...}, ... };

   This file collects all of those into one ordered list and gives the rest
   of the game a single, safe way to look them up:

       TN.Levels.get(1)   -> the level 1 config, or null if it does not exist
       TN.Levels.exists(1)-> true / false
       TN.Levels.next(1)  -> the config for level 2, or null

   Levels 1 and 2 exist in this build. Levels 3-5 are added by creating more
   files in this folder and adding them to the loop below - no other code
   anywhere needs to change.
   ========================================================================= */

TN.Levels = TN.Levels || {};

(function () {
  var L = TN.Levels;

  /* -----------------------------------------------------------------------
     Build the ordered list.

     We look for LEVEL_1, LEVEL_2, ... up to MAX_LEVELS. Anything missing is
     silently skipped, which is why this build (with only levels 1 and 2)
     still works.
     ----------------------------------------------------------------------- */
  var MAX_LEVELS = 5;
  var list = [];

  for (var id = 1; id <= MAX_LEVELS; id++) {
    var config = L['LEVEL_' + id];
    if (config) list.push(config);
  }

  /* Keep the list sorted by id, just in case a config was written out of
     order. Sorting by id also makes next() trustworthy. */
  list.sort(function (a, b) { return a.id - b.id; });

  L.LIST = list;

  /* How many levels exist right now. The HUD and the (future) victory
     screen use this so they do not have to hard-code "five". */
  L.COUNT = list.length;

  /* The id of the highest level in the build. */
  L.MAX_ID = list.length > 0 ? list[list.length - 1].id : 0;

  /* -----------------------------------------------------------------------
     get(levelId) -> config | null

     The Level Manager calls this and throws if it gets nothing back, so it
     must never explode on a silly input.
     ----------------------------------------------------------------------- */
  L.get = function (levelId) {
    for (var i = 0; i < L.LIST.length; i++) {
      if (L.LIST[i].id === levelId) return L.LIST[i];
    }
    return null;
  };

  /* Does this level exist in this build? */
  L.exists = function (levelId) {
    return !!L.get(levelId);
  };

  /* The first level. This is where a fresh save file starts. */
  L.first = function () {
    return L.LIST.length > 0 ? L.LIST[0] : null;
  };

  /* The level after this one, or null if this was the last. */
  L.next = function (levelId) {
    var current = L.get(levelId);
    if (!current) return null;
    var index = L.LIST.indexOf(current);
    if (index === -1 || index + 1 >= L.LIST.length) return null;
    return L.LIST[index + 1];
  };
})();
