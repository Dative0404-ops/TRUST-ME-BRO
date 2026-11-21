/* =========================================================================
   TRUST NOTHING - Moving Platform module
   -------------------------------------------------------------------------
   A moving platform is a solid slab that slides back and forth along a
   fixed line (left-right or up-down). It is NOT part of the tilemap because
   the tilemap is a fixed grid, and this thing moves. Instead the platform
   lives in the world as a normal rectangle {x, y, w, h} and is handled in
   two steps every frame:

     1. carry()   - if the player is standing on top, move the player the
                    exact same distance the platform moved, so the player
                    rides along instead of sliding off.
     2. resolve() - if the player still overlaps the platform (walked into
                    its side, or bumped it from below), push them out along
                    the smallest axis. This makes the slab feel solid.

   That is all a moving platform needs to feel correct.
   ========================================================================= */

TN.Platform = function (cfg) {
  /* Position is stored in TILES in the level config, but in PIXELS here,
     because all the physics code works in pixels. */
  this.w = cfg.tw * TN.TILE;
  this.h = (cfg.th || 1) * TN.TILE;

  /* The two ends of the platform's journey, in pixels. */
  this.fromX = cfg.tx * TN.TILE;
  this.fromY = cfg.ty * TN.TILE;
  this.toX = (cfg.toTx !== undefined ? cfg.toTx : cfg.tx) * TN.TILE;
  this.toY = (cfg.toTy !== undefined ? cfg.toTy : cfg.ty) * TN.TILE;

  /* Where the platform is right now. */
  this.x = this.fromX;
  this.y = this.fromY;

  /* How far it moved this frame. The player is carried by exactly this. */
  this.dx = 0;
  this.dy = 0;

  /* 'x' slides left-right, 'y' slides up-down. */
  this.axis = cfg.axis || 'x';
  this.speed = cfg.speed || 32;   /* pixels per second */

  /* The two ends of the journey, sorted low-to-high. Keeping them sorted
     means a platform works the same whether its "to" end is to the right,
     to the left, above or below its "from" end. */
  if (this.axis === 'x') {
    this.lo = Math.min(this.fromX, this.toX);
    this.hi = Math.max(this.fromX, this.toX);
    this.dir = this.toX >= this.fromX ? 1 : -1;   /* head for the far end */
  } else {
    this.lo = Math.min(this.fromY, this.toY);
    this.hi = Math.max(this.fromY, this.toY);
    this.dir = this.toY >= this.fromY ? 1 : -1;
  }

  this.pause = cfg.pause || 0.35;  /* little breather at each end */
  this.wait = 0;

  this.t = 0;                      /* used for a small blinking light */
};

TN.Platform.prototype = {

  /* Move the platform. Called once per frame by the Level Manager. */
  update: function (dt) {
    var prevX = this.x;
    var prevY = this.y;
    this.t += dt;

    if (this.wait > 0) {
      /* Waiting at one end before heading back. */
      this.wait -= dt;
    } else {
      var step = this.speed * dt;

      if (this.axis === 'x') {
        this.x += this.dir * step;
        if (this.x >= this.hi) { this.x = this.hi; this.dir = -1; this.wait = this.pause; }
        else if (this.x <= this.lo) { this.x = this.lo; this.dir = 1; this.wait = this.pause; }
      } else {
        this.y += this.dir * step;
        if (this.y >= this.hi) { this.y = this.hi; this.dir = -1; this.wait = this.pause; }
        else if (this.y <= this.lo) { this.y = this.lo; this.dir = 1; this.wait = this.pause; }
      }
    }

    /* Remember how far we moved so carry() can copy it onto the player. */
    this.dx = this.x - prevX;
    this.dy = this.y - prevY;
  },

  /* If the player is standing on me, take them along for the ride. */
  carry: function (player) {
    var feet = player.y + player.h;
    var onTop = feet >= this.y - 2 &&          /* feet near my top surface */
                feet <= this.y + 8 &&           /* but not deep inside me */
                player.x + player.w > this.x + 1 &&
                player.x < this.x + this.w - 1 &&
                player.vy >= -1;                /* not rocketing upward */
    if (!onTop) return;

    player.x += this.dx;
    player.y += this.dy;

    /* Snap the feet exactly onto my top edge so riding never jitters. */
    player.y = this.y - player.h;
    player.vy = 0;
    player.onGround = true;
  },

  /* If the player is still inside me, push them out the shortest way. */
  resolve: function (player) {
    if (!TN.utils.aabb(player, this)) return;

    var overlapX = Math.min(player.x + player.w, this.x + this.w) - Math.max(player.x, this.x);
    var overlapY = Math.min(player.y + player.h, this.y + this.h) - Math.max(player.y, this.y);

    if (overlapY <= overlapX) {
      /* Vertical push: land on top, or bonk the underside. */
      if (player.y + player.h * 0.5 < this.y + this.h * 0.5) {
        player.y = this.y - player.h;
        if (player.vy > 0) player.vy = 0;
        player.onGround = true;
      } else {
        player.y = this.y + this.h;
        if (player.vy < 0) player.vy = 0;
      }
    } else {
      /* Horizontal push: shove them out of whichever side they entered. */
      if (player.x + player.w * 0.5 < this.x + this.w * 0.5) player.x = this.x - player.w;
      else player.x = this.x + this.w;
      player.vx = 0;
    }
  },

  /* Draw the slab. Deliberately smooth and metallic so it never gets mixed
     up with the spiky crushers (which are red-striped). */
  draw: function (ctx, cam) {
    var x = Math.round(this.x - cam.x + cam.offsetX);
    var y = Math.round(this.y - cam.y + cam.offsetY);
    if (x + this.w < -24 || x > TN.VIEW_W + 24) return;

    var R = TN.utils.rect;
    R(ctx, x, y, this.w, this.h, TN.C.metal);                 /* body */
    R(ctx, x, y, this.w, 2, '#cdd6ea');                       /* bright top lip */
    R(ctx, x + 1, y + 2, this.w - 2, this.h - 4, TN.C.crusherDk); /* inset panel */
    R(ctx, x, y + this.h - 2, this.w, 2, '#5b6377');          /* dark underside */

    /* Two gold bolts so it reads as a built machine. */
    R(ctx, x + 2, y + Math.floor(this.h / 2) - 1, 2, 2, '#e8c44a');
    R(ctx, x + this.w - 4, y + Math.floor(this.h / 2) - 1, 2, 2, '#e8c44a');

    /* A tiny light that blinks as it moves, so it feels alive. */
    var on = Math.floor(this.t * 4) % 2 === 0;
    R(ctx, x + Math.floor(this.w / 2) - 1, y + Math.floor(this.h / 2) - 1, 2, 2, on ? '#7fe3a0' : '#2a2e3d');
  }
};
