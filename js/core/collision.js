/* =========================================================================
   TRUST NOTHING - core/collision.js
   -------------------------------------------------------------------------
   Solid, predictable tile collision.

   The technique used here is called "separate axis resolution" and it is the
   standard way to do platformer collision:

     1. Move the body horizontally by vx * dt.
        If it is now inside a wall, snap it flush against the wall and set
        vx to 0. Record that we touched a wall on the left or right.

     2. Move the body vertically by vy * dt.
        If it is now inside the floor or a ceiling, snap it flush and set vy
        to 0. Record whether we landed on something or bumped our head.

   Doing the two axes one after the other (instead of both at once) is what
   gives you the smooth "slide along the wall" feel instead of the player
   sticking in corners.

   Everything works on a "body", which is just an object with x, y, w, h, vx
   and vy. The Player and the crusher trap both use it.
   ========================================================================= */

TN.Collision = (function () {

  /* A tiny nudge used when converting pixels to tiles. Without it, a body
     resting EXACTLY on a tile boundary would be counted as overlapping the
     next tile over and would jitter. */
  var EPS = 0.001;

  /* The biggest distance we move in one go. If a body wants to move further
     than this in a single step we split it up, so nothing can ever tunnel
     through a 16 pixel wall. */
  var MAX_STEP = 8;

  /* Which tile columns does this body currently cover? */
  function columnsOf(body) {
    return {
      first: Math.floor((body.x + EPS) / TN.TILE),
      last: Math.floor((body.x + body.w - EPS) / TN.TILE)
    };
  }

  /* Which tile rows does this body currently cover? */
  function rowsOf(body) {
    return {
      first: Math.floor((body.y + EPS) / TN.TILE),
      last: Math.floor((body.y + body.h - EPS) / TN.TILE)
    };
  }

  /* ---------------------------------------------------------------------
     Move horizontally.
     Returns { left: bool, right: bool } describing what we bumped into.
     --------------------------------------------------------------------- */
  function moveX(body, dx, map) {
    var hit = { left: false, right: false };
    if (dx === 0) return hit;

    body.x += dx;

    var rows = rowsOf(body);

    if (dx > 0) {
      /* We moved right, so only the right edge of the body matters. */
      var tx = Math.floor((body.x + body.w - EPS) / TN.TILE);
      for (var ty = rows.first; ty <= rows.last; ty++) {
        if (map.solid(tx, ty)) {
          body.x = tx * TN.TILE - body.w;   /* snap flush to the wall */
          body.vx = 0;
          hit.right = true;
          break;
        }
      }
    } else {
      /* We moved left, so only the left edge matters. */
      var tx2 = Math.floor((body.x + EPS) / TN.TILE);
      for (var ty2 = rows.first; ty2 <= rows.last; ty2++) {
        if (map.solid(tx2, ty2)) {
          body.x = (tx2 + 1) * TN.TILE;     /* snap flush to the wall */
          body.vx = 0;
          hit.left = true;
          break;
        }
      }
    }
    return hit;
  }

  /* ---------------------------------------------------------------------
     Move vertically.
     Returns { top: bool, bottom: bool }. "bottom" true means we landed.
     --------------------------------------------------------------------- */
  function moveY(body, dy, map) {
    var hit = { top: false, bottom: false };
    if (dy === 0) return hit;

    body.y += dy;

    var cols = columnsOf(body);

    if (dy > 0) {
      /* Falling: check the row under our feet. */
      var ty = Math.floor((body.y + body.h - EPS) / TN.TILE);
      for (var tx = cols.first; tx <= cols.last; tx++) {
        if (map.solid(tx, ty)) {
          body.y = ty * TN.TILE - body.h;   /* sit exactly on the surface */
          body.vy = 0;
          hit.bottom = true;
          break;
        }
      }
    } else {
      /* Rising: check the row just above our head. */
      var ty2 = Math.floor((body.y + EPS) / TN.TILE);
      for (var tx2 = cols.first; tx2 <= cols.last; tx2++) {
        if (map.solid(tx2, ty2)) {
          body.y = (ty2 + 1) * TN.TILE;
          body.vy = 0;
          hit.top = true;
          break;
        }
      }
    }
    return hit;
  }

  /* ---------------------------------------------------------------------
     The one call the game actually uses: apply this step's velocity to the
     body and resolve every collision along the way.
     --------------------------------------------------------------------- */
  function moveAndCollide(body, dt, map) {
    var flags = { left: false, right: false, top: false, bottom: false };

    /* Work out how far we would like to travel this step. */
    var totalX = body.vx * dt;
    var totalY = body.vy * dt;

    /* Split the movement into small steps so nothing tunnels. */
    var steps = Math.ceil(Math.max(Math.abs(totalX), Math.abs(totalY)) / MAX_STEP);
    if (steps < 1) steps = 1;

    var stepX = totalX / steps;
    var stepY = totalY / steps;

    for (var i = 0; i < steps; i++) {
      var hx = moveX(body, stepX, map);
      if (hx.left) flags.left = true;
      if (hx.right) flags.right = true;

      var hy = moveY(body, stepY, map);
      if (hy.top) flags.top = true;
      if (hy.bottom) flags.bottom = true;

      /* If we already stopped moving on an axis, stop sub-stepping it. */
      if (hx.left || hx.right) stepX = 0;
      if (hy.top || hy.bottom) stepY = 0;
      if (stepX === 0 && stepY === 0) break;
    }

    body.collided = flags;
    return flags;
  }

  /* ---------------------------------------------------------------------
     Helper used by traps: which tiles are directly under this body's feet?
     The Trap Manager uses it to find crumbling platforms to knock down.
     --------------------------------------------------------------------- */
  function tilesUnderFeet(body) {
    var list = [];
    var cols = columnsOf(body);
    var ty = Math.floor((body.y + body.h + 1) / TN.TILE);
    for (var tx = cols.first; tx <= cols.last; tx++) {
      list.push({ tx: tx, ty: ty });
    }
    return list;
  }

  return {
    moveX: moveX,
    moveY: moveY,
    moveAndCollide: moveAndCollide,
    tilesUnderFeet: tilesUnderFeet,
    columnsOf: columnsOf,
    rowsOf: rowsOf
  };
})();
