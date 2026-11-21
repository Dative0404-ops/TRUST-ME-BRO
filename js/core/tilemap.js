/* =========================================================================
   TRUST NOTHING - core/tilemap.js
   -------------------------------------------------------------------------
   The tilemap is the collision world. It is a flat grid where every cell is
   one of three things:

       0 = empty      (you fall through it)
       1 = solid      (normal ground / platforms)
       2 = crumbling  (looks solid, but the Trap Manager can delete it)
       3 = fake wall  (looks solid, but you walk straight through it)

   The tilemap only knows about its own grid. It does not decide WHEN a
   crumbling tile breaks - the Trap Manager does that and then calls
   set(x, y, 0). That keeps the two modules independent of each other.

   Special rule for the edges of the world:
     - Left and right edges behave like walls, so the player cannot walk out
       of the level sideways.
     - The bottom edge is open, so falling off the world is possible (and is
       exactly how the "void" death works).
   ========================================================================= */

TN.T_EMPTY = 0;
TN.T_SOLID = 1;
TN.T_CRUMBLE = 2;
/* A fake wall. It is drawn to look exactly like solid ground, so the player
   believes it blocks the way, but it is NOT solid. Walking into it takes you
   straight through to whatever is hidden behind it. */
TN.T_FAKE = 3;

TN.Tilemap = function (cols, rows) {
  this.cols = cols;
  this.rows = rows;
  /* One flat array is faster and simpler than an array of arrays. */
  this.grid = new Int8Array(cols * rows);
};

TN.Tilemap.prototype = {

  /* Turn two tile coordinates into one array index. */
  index: function (tx, ty) {
    return ty * this.cols + tx;
  },

  /* Are these tile coordinates inside the map at all? */
  inside: function (tx, ty) {
    return tx >= 0 && tx < this.cols && ty >= 0 && ty < this.rows;
  },

  /* What is stored in this cell?
     Note the special handling of the world edges described above. */
  at: function (tx, ty) {
    if (tx < 0 || tx >= this.cols) return TN.T_SOLID;   /* side walls */
    if (ty < 0 || ty >= this.rows) return TN.T_EMPTY;   /* open sky / open pit */
    return this.grid[this.index(tx, ty)];
  },

  /* Write a cell. Anything outside the map is ignored silently. */
  set: function (tx, ty, type) {
    if (!this.inside(tx, ty)) return;
    this.grid[this.index(tx, ty)] = type;
  },

  /* Fill a rectangle of tiles, used while building a level from its config. */
  fill: function (x, y, w, h, type) {
    for (var ty = y; ty < y + h; ty++) {
      for (var tx = x; tx < x + w; tx++) {
        this.set(tx, ty, type);
      }
    }
  },

  /* THE important question for physics: can the player stand on this cell?
     Crumbling tiles count as solid until the Trap Manager removes them. */
  solid: function (tx, ty) {
    var v = this.at(tx, ty);
    return v === TN.T_SOLID || v === TN.T_CRUMBLE;
  },

  /* Same question but asked in pixel coordinates. */
  solidAtPx: function (px, py) {
    return this.solid(Math.floor(px / TN.TILE), Math.floor(py / TN.TILE));
  },

  /* Is this tile a crumbling one that has not broken yet? */
  isCrumble: function (tx, ty) {
    return this.at(tx, ty) === TN.T_CRUMBLE;
  },

  /* Walk straight down from a pixel position and return the Y pixel of the
     first solid surface we hit (or null if there is nothing below).
     Used by the crusher trap so it knows where to stop falling. */
  firstSolidBelow: function (px, startY) {
    var tx = Math.floor(px / TN.TILE);
    var ty = Math.floor(startY / TN.TILE);
    for (; ty < this.rows; ty++) {
      if (this.solid(tx, ty)) return ty * TN.TILE;
    }
    return null;
  },

  /* ---------------------------------------------------------------------
     Draw only the tiles that the camera can currently see.
     Each tile gets a deterministic speckle pattern from TN.utils.hash2 so
     the dirt looks textured but never flickers between frames.
     --------------------------------------------------------------------- */
  draw: function (ctx, cam, theme) {
    theme = theme || {};
    var dirt = theme.dirt || TN.C.dirt;
    var dirtDark = theme.dirtDark || TN.C.dirtDark;
    var dirtLight = theme.dirtLight || TN.C.dirtLight;
    var grass = theme.grass || TN.C.grass;
    var grassDark = theme.grassDark || TN.C.grassDark;

    /* Convert the camera view into tile coordinates, with a 1 tile margin. */
    var x0 = Math.max(0, Math.floor(cam.x / TN.TILE) - 1);
    var x1 = Math.min(this.cols - 1, Math.floor((cam.x + TN.VIEW_W) / TN.TILE) + 1);
    var y0 = Math.max(0, Math.floor(cam.y / TN.TILE) - 1);
    var y1 = Math.min(this.rows - 1, Math.floor((cam.y + TN.VIEW_H) / TN.TILE) + 1);

    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var v = this.at(tx, ty);
        if (v === TN.T_EMPTY) continue;

        var sx = tx * TN.TILE - Math.round(cam.x);
        var sy = ty * TN.TILE - Math.round(cam.y);
        var seed = TN.utils.hash2(tx, ty);

        if (v === TN.T_CRUMBLE) {
          /* Crumbling platforms look like a broken-up bridge: a wooden / stone
             slab with visible cracks, so a sharp player can spot the danger. */
          TN.utils.rect(ctx, sx, sy, TN.TILE, TN.TILE, TN.C.crate);
          TN.utils.rect(ctx, sx, sy, TN.TILE, 3, TN.C.crateDark);
          TN.utils.rect(ctx, sx, sy + TN.TILE - 2, TN.TILE, 2, TN.C.crateDark);
          /* Two deterministic cracks per tile. */
          TN.utils.rect(ctx, sx + 3, sy + 3, 1, 6, TN.C.crateDark);
          TN.utils.rect(ctx, sx + 2 + Math.floor(seed * 8), sy + 10, 1, 4, TN.C.crateDark);
        } else if (v === TN.T_FAKE) {
          /* A FAKE WALL. Deliberately drawn like ordinary ground (same dirt,
             same speckles) but WITHOUT grass, so a wall of these tiles reads
             as a solid dirt face filling the corridor. There is no visual
             giveaway on purpose - the sign next to it is the only clue, and
             the joke is that the player walks into it and pops out the other
             side. */
          TN.utils.rect(ctx, sx, sy, TN.TILE, TN.TILE, dirt);
          TN.utils.rect(ctx, sx, sy + TN.TILE - 3, TN.TILE, 3, dirtDark);
          var fakeSpeckles = 3;
          for (var fs = 0; fs < fakeSpeckles; fs++) {
            var fx = TN.utils.hash2(tx * 29 + fs, ty * 43 + fs * 7);
            var fy = TN.utils.hash2(tx * 17 + fs * 5, ty * 59 + fs);
            TN.utils.rect(ctx, sx + 2 + Math.floor(fx * 12), sy + 3 + Math.floor(fy * 10), 2, 2, dirtDark);
          }
        } else {
          /* Normal ground: dark base, a lighter top edge, and speckles. */
          TN.utils.rect(ctx, sx, sy, TN.TILE, TN.TILE, dirt);
          TN.utils.rect(ctx, sx, sy + TN.TILE - 3, TN.TILE, 3, dirtDark);

          /* Speckles: 2 or 3 per tile depending on the hash. */
          var speckles = 2 + Math.floor(seed * 2);
          for (var i = 0; i < speckles; i++) {
            var hx = TN.utils.hash2(tx * 31 + i, ty * 17 + i * 5);
            var hy = TN.utils.hash2(tx * 13 + i * 3, ty * 47 + i);
            TN.utils.rect(ctx, sx + 2 + Math.floor(hx * 12), sy + 4 + Math.floor(hy * 9), 2, 2, dirtDark);
          }

          /* Only put grass on tiles that have open air directly above them,
             which gives the world a proper "surface" line. */
          var above = this.at(tx, ty - 1);
          if (above === TN.T_EMPTY) {
            TN.utils.rect(ctx, sx, sy, TN.TILE, 4, grass);
            TN.utils.rect(ctx, sx, sy + 4, TN.TILE, 2, grassDark);
            /* A few grass blades poking up for character. */
            if (seed > 0.55) TN.utils.rect(ctx, sx + 3, sy - 2, 1, 2, grass);
            if (seed < 0.3) TN.utils.rect(ctx, sx + 10, sy - 2, 1, 2, grass);
          } else {
            /* Buried tile: add a highlight so deep dirt is not just flat brown. */
            TN.utils.rect(ctx, sx, sy, TN.TILE, 1, dirtLight);
          }
        }
      }
    }
  }
};
