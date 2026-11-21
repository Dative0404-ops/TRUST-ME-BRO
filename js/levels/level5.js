/* =========================================================================
   TRUST NOTHING - levels/level5.js
   -------------------------------------------------------------------------
   LEVEL 5: TRUST NOBODY

   The last one, so it stops being coy. Everything the game has taught you is
   here at once, packed tighter than anywhere else:

     - hidden spike strips with no seam and the shortest reveal window yet
     - proximity mines on almost every flat run, with hair-trigger fuses
     - a roofed tunnel with a fake wall, and a mine waiting behind it
     - a crumbling bridge over a bottomless pit
     - a lava pit crossed by a single sliding platform
     - THREE doors labelled EXIT. Two of them are lying. The real one does
       not even exist until you have fallen for one of the lies.

   There are no signs, no hints, no arrival message and no control reminder.
   The level begins the instant it loads and it never once tells you anything
   true on purpose.

   Walkthrough, in order of betrayal
   ----------------------------------
     cols 0-31    Opening spike strip plus three mines.
     cols 32-36   A plain gap.
     cols 37-58   Two crushers, three mines, a spike strip.
     cols 59-63   A plain gap.
     cols 64-83   A roofed tunnel: FAKE WALL at col 74, mine behind it, the
                  first "EXIT" door at col 80 - in the middle of the level.
     cols 84-89   A crumbling bridge over a void. Keep moving.
     cols 90-111  Three mines and a spike strip, under a falling crusher.
     cols 112-117 A LAVA pit, crossed only by a sliding platform.
     cols 118-137 Three more mines, one more spike strip.
     cols 138-143 A plain gap.
     cols 144-159 The second "EXIT" door, the third "EXIT" door, and the
                  real one hiding behind them.
   ========================================================================= */

TN.Levels = TN.Levels || {};

TN.Levels.LEVEL_5 = {

  id: 5,
  name: "TRUST NOBODY",
  tagline: "Including this tagline.",

  world: { cols: 162, rows: 20 },

  spawn: { tx: 3, ty: 15 },

  /* The void palette: almost no colour left at all. */
  theme: {
    dirt: "#2a2a35",
    dirtDark: "#1a1a22",
    dirtLight: "#3d3d4d",
    grass: "#5a5a7a",
    grassDark: "#33334d"
  },

  /* -----------------------------------------------------------------------
     SOLID GROUND
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,   y: 15, w: 32, h: 5 },   /* cols 0-31   the opening          */
    { x: 37,  y: 15, w: 22, h: 5 },   /* cols 37-58  crushers and mines   */
    { x: 64,  y: 15, w: 20, h: 5 },   /* cols 64-83  the fake-wall tunnel */
    { x: 64,  y: 0,  w: 20, h: 4 },   /* the tunnel roof, cols 64-83      */
    { x: 90,  y: 15, w: 22, h: 5 },   /* cols 90-111 the long run         */
    { x: 118, y: 15, w: 20, h: 5 },   /* cols 118-137 after the lava      */
    { x: 144, y: 15, w: 16, h: 5 }    /* cols 144-159 the final chamber   */
  ],

  spikes: [],

  /* -----------------------------------------------------------------------
     HIDDEN SPIKES - the shortest reveal distances in the game.
     ----------------------------------------------------------------------- */
  hiddenSpikes: [
    { tx: 7,   ty: 14, tw: 3, reveal: 42 },
    { tx: 50,  ty: 14, tw: 3, reveal: 40 },
    { tx: 70,  ty: 14, tw: 3, reveal: 40 },
    { tx: 96,  ty: 14, tw: 3, reveal: 40 },
    { tx: 124, ty: 14, tw: 3, reveal: 38 }
    /* NOTE: a strip used to sit at tx 150, directly UNDER the fake door at
       tx 151 - the spike and the door occupied the same tiles. Dodging one
       meant touching the other. It has been removed; the mine at 148 still
       keeps this final stretch honest. */
  ],

  /* -----------------------------------------------------------------------
     FAKE WALL - fills the tunnel at cols 74-75. The only way on is through.
     ----------------------------------------------------------------------- */
  fakeWalls: [
    { x: 74, y: 4, w: 2, h: 11 }
  ],

  /* -----------------------------------------------------------------------
     PROXIMITY MINES - the whole level is mined. Fuses are down to about a
     quarter of a second, so the amber light is the last warning you get.
     ----------------------------------------------------------------------- */
  traps: [
    /* Opening. */
    { type: "mine", tx: 12, ty: 14, radius: 34, fuse: 0.28 },
    { type: "mine", tx: 19, ty: 14, radius: 32, fuse: 0.26 },
    { type: "mine", tx: 27, ty: 14, radius: 32, fuse: 0.26 },

    /* Crushers and mines. */
    { type: "crusher", tx: 44, ty: 10, tw: 2, th: 2, triggerTx: 42 },
    { type: "mine",    tx: 46, ty: 14, radius: 32, fuse: 0.26 },
    { type: "mine",    tx: 53, ty: 14, radius: 30, fuse: 0.24 },
    { type: "crusher", tx: 56, ty: 10, tw: 2, th: 2, triggerTx: 54 },

    /* Inside the tunnel: mine, the fake wall at 74, then a mine right behind
       it, so running blindly through the wall costs you. */
    { type: "mine", tx: 68, ty: 14, radius: 32, fuse: 0.26 },
    { type: "mine", tx: 78, ty: 14, radius: 30, fuse: 0.24 },

    /* The long run, with a crusher to keep you honest. */
    { type: "mine",    tx: 94,  ty: 14, radius: 32, fuse: 0.26 },
    { type: "crusher", tx: 104, ty: 10, tw: 3, th: 2, triggerTx: 102 },
    { type: "mine",    tx: 100, ty: 14, radius: 30, fuse: 0.24 },
    { type: "mine",    tx: 108, ty: 14, radius: 30, fuse: 0.24 },

    /* After the lava. */
    { type: "mine", tx: 122, ty: 14, radius: 32, fuse: 0.26 },
    { type: "mine", tx: 130, ty: 14, radius: 30, fuse: 0.24 },
    { type: "mine", tx: 135, ty: 14, radius: 30, fuse: 0.24 },

    /* The final chamber. */
    { type: "mine", tx: 148, ty: 14, radius: 32, fuse: 0.26 }
  ],

  /* -----------------------------------------------------------------------
     CRUMBLING BRIDGE over the void at cols 84-85. The remaining four tiles
     of the gap are a straight jump. Keep moving.
     ----------------------------------------------------------------------- */
  crumble: [
    { tx: 84, ty: 15, tw: 2, delay: 0.22 }
  ],

  /* -----------------------------------------------------------------------
     LAVA over the pit at cols 112-117.
     ----------------------------------------------------------------------- */
  lava: [
    { tx: 112, ty: 18, tw: 6, th: 2 }
  ],

  /* -----------------------------------------------------------------------
     MOVING PLATFORM - the only way across the lava.
     ----------------------------------------------------------------------- */
  movingPlatforms: [
    { axis: "x", tx: 112, ty: 13, tw: 3, th: 1, toTx: 115, speed: 32, pause: 0.35 }
  ],

  /* -----------------------------------------------------------------------
     COINS
     ----------------------------------------------------------------------- */
  coins: [
    { tx: 5,   ty: 13 },
    { tx: 8,   ty: 13 },    /* bait, above the first spike strip */
    { tx: 13,  ty: 13 },    /* bait, above a mine */
    { tx: 22,  ty: 13 },
    { tx: 30,  ty: 13 },
    { tx: 44,  ty: 13 },
    { tx: 51,  ty: 13 },    /* bait */
    { tx: 66,  ty: 13 },
    { tx: 72,  ty: 13 },
    { tx: 79,  ty: 13 },    /* bait, behind the fake wall */
    { tx: 86,  ty: 12 },    /* over the crumbling bridge  */
    { tx: 97,  ty: 13 },    /* bait */
    { tx: 105, ty: 13 },
    { tx: 114, ty: 11 },    /* over the lava              */
    { tx: 125, ty: 13 },    /* bait */
    { tx: 141, ty: 13 },
    { tx: 153, ty: 13 },
    { tx: 158, ty: 9 }
  ],

  checkpoints: [
    { tx: 5,   ty: 15 },
    { tx: 40,  ty: 15 },
    { tx: 66,  ty: 15 },
    { tx: 93,  ty: 15 },
    /* SCAM FLAG. The first thing you run into after surviving the lava pit,
       so it catches you while you are feeling good about yourself. */
    { tx: 119, ty: 15, fake: true },
    { tx: 121, ty: 15 },
    { tx: 146, ty: 15 }
  ],

  signs: [],

  /* -----------------------------------------------------------------------
     EXITS
     Three doors, all labelled EXIT. The first is in the middle of the tunnel;
     the next two sit together at the very end to look like the finish line.
     Touching ANY of them kills you and wakes the real door - the single
     hidden one, tucked behind the pair at the back.
     ----------------------------------------------------------------------- */
  exits: [
    { kind: "fake", tx: 80,  ty: 15 },
    { kind: "fake", tx: 151, ty: 15 },
    { kind: "real", tx: 157, ty: 15, hidden: true }
  ]
};

/* No intro lines. Trust nobody, including the narrator. */
