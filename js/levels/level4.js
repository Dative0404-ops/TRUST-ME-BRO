/* =========================================================================
   TRUST NOTHING - levels/level4.js
   -------------------------------------------------------------------------
   LEVEL 4: PURE BETRAYAL

   Level 3 took the hints away. Level 4 takes the last few tiles of floor you
   were standing on and replaces them with lava, then hides a mine directly
   behind a wall that is not a wall.

   What is new here:
     lava            - an actual pit of fire, reached by falling off the
                       moving platform you were told (by nobody) to trust
     fakeWalls       - a solid looking column inside a roofed tunnel. The
                       only way past it is straight through it. There is a
                       mine on the other side.
     a MID-LEVEL fake exit - the first door you meet is bright, green and
                       labelled EXIT, and it is in the MIDDLE of the level,
                       which is somehow worse.

   Nothing is signposted. Nothing is hinted. A checkpoint looks like mercy
   and is really just a place for the level to hurt you again from.

   Walkthrough, in order of betrayal
   ----------------------------------
     cols 0-29    A mine field, three deep, with a spike strip you must spot.
     cols 30-34   A plain gap.
     cols 35-58   A roofed tunnel. Two crushers, then a FAKE WALL at col 46,
                  then a mine immediately behind it, then a spike strip.
     cols 59-66   A LAVA pit, crossed only by a sliding platform.
     cols 67-86   A spike strip and two mines, then the "EXIT". It is not the
                  exit, and it is nowhere near the end of the level.
     cols 87-91   A plain gap.
     cols 92-115  Three more mines and a spike strip.
     cols 116-120 A plain gap.
     cols 121-139 Two more mines, one more spike strip, and the real door -
                  which only appears once you have fallen for the lie.
   ========================================================================= */

TN.Levels = TN.Levels || {};

TN.Levels.LEVEL_4 = {

  id: 4,
  name: "PURE BETRAYAL",
  tagline: "The floor was lava the whole time.",

  world: { cols: 142, rows: 20 },

  spawn: { tx: 3, ty: 15 },

  /* A dried-blood palette. Everything is a little too red. */
  theme: {
    dirt: "#4a2b2b",
    dirtDark: "#2e1a1a",
    dirtLight: "#6b3b3b",
    grass: "#8a3a3a",
    grassDark: "#5e2222"
  },

  /* -----------------------------------------------------------------------
     SOLID GROUND
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,   y: 15, w: 30, h: 5 },   /* cols 0-29   opening mine field  */
    { x: 35,  y: 15, w: 24, h: 5 },   /* cols 35-58  the tunnel          */
    { x: 36,  y: 0,  w: 24, h: 4 },   /* the tunnel roof, cols 36-59     */
    { x: 67,  y: 15, w: 20, h: 5 },   /* cols 67-86  the mid-level "exit"*/
    { x: 92,  y: 15, w: 24, h: 5 },   /* cols 92-115 the long run        */
    { x: 121, y: 15, w: 19, h: 5 }    /* cols 121-139 the real exit      */
  ],

  spikes: [],

  /* -----------------------------------------------------------------------
     HIDDEN SPIKES - reveal distances tightened a little from level 3. The
     game is getting meaner.
     ----------------------------------------------------------------------- */
  hiddenSpikes: [
    { tx: 8,   ty: 14, tw: 3, reveal: 44 },
    { tx: 52,  ty: 14, tw: 3, reveal: 40 },  /* behind the fake wall      */
    { tx: 72,  ty: 14, tw: 3, reveal: 42 },
    { tx: 100, ty: 14, tw: 3, reveal: 42 },
    { tx: 130, ty: 14, tw: 3, reveal: 40 }
  ],

  /* -----------------------------------------------------------------------
     FAKE WALL
     A column that fills the tunnel from the roof to the floor and looks
     exactly like the solid ground around it. Walk into it. There is a mine
     waiting on the other side.
     ----------------------------------------------------------------------- */
  fakeWalls: [
    { x: 46, y: 4, w: 2, h: 11 }
  ],

  /* -----------------------------------------------------------------------
     PROXIMITY MINES - more of them, and with shorter fuses than level 3.
     ----------------------------------------------------------------------- */
  traps: [
    /* Opening field. */
    { type: "mine", tx: 14,  ty: 14, radius: 36, fuse: 0.30 },
    { type: "mine", tx: 21,  ty: 14, radius: 34, fuse: 0.28 },
    { type: "mine", tx: 26,  ty: 14, radius: 32, fuse: 0.26 },

    /* Tunnel: crusher, mine, crusher, then the fake wall at 46, then the
       mine at 49 that the wall was hiding. */
    { type: "crusher", tx: 40, ty: 10, tw: 2, th: 2, triggerTx: 38 },
    { type: "mine",    tx: 42, ty: 14, radius: 32, fuse: 0.26 },
    { type: "crusher", tx: 44, ty: 10, tw: 2, th: 2, triggerTx: 42 },
    { type: "mine",    tx: 49, ty: 14, radius: 30, fuse: 0.24 },
    { type: "mine",    tx: 56, ty: 14, radius: 32, fuse: 0.26 },

    /* After the lava. */
    { type: "mine", tx: 70,  ty: 14, radius: 34, fuse: 0.28 },
    { type: "mine", tx: 78,  ty: 14, radius: 32, fuse: 0.26 },

    /* The long run. */
    { type: "mine", tx: 96,  ty: 14, radius: 34, fuse: 0.28 },
    { type: "mine", tx: 106, ty: 14, radius: 32, fuse: 0.26 },
    { type: "mine", tx: 111, ty: 14, radius: 32, fuse: 0.26 },

    /* The final stretch. */
    { type: "mine", tx: 126, ty: 14, radius: 34, fuse: 0.28 }
  ],

  /* -----------------------------------------------------------------------
     LAVA
     Fills the bottom of the pit at cols 59-66, so a mistimed jump off the
     platform is a long, warm, fatal drop.
     ----------------------------------------------------------------------- */
  lava: [
    { tx: 59, ty: 18, tw: 8, th: 2 }
  ],

  /* -----------------------------------------------------------------------
     MOVING PLATFORM
     The only way over the lava. Slow and steady, because the trap here is
     the lava, not the ride.
     ----------------------------------------------------------------------- */
  movingPlatforms: [
    { axis: "x", tx: 59, ty: 13, tw: 3, th: 1, toTx: 63, speed: 30, pause: 0.4 }
  ],

  /* -----------------------------------------------------------------------
     COINS
     ----------------------------------------------------------------------- */
  coins: [
    { tx: 6,   ty: 13 },
    { tx: 16,  ty: 13 },    /* bait, above a mine */
    { tx: 22,  ty: 13 },    /* bait, above a mine */
    { tx: 27,  ty: 13 },
    { tx: 44,  ty: 13 },
    { tx: 50,  ty: 13 },    /* bait, behind the fake wall */
    { tx: 61,  ty: 12 },    /* over the lava        */
    { tx: 75,  ty: 13 },    /* bait, above a mine   */
    { tx: 83,  ty: 12 },
    { tx: 98,  ty: 13 },
    { tx: 107, ty: 13 },    /* bait                 */
    { tx: 128, ty: 13 },
    { tx: 137, ty: 10 }
  ],

  checkpoints: [
    { tx: 5,   ty: 15 },
    { tx: 45,  ty: 15 },
    { tx: 69,  ty: 15 },
    { tx: 95,  ty: 15 },
    { tx: 124, ty: 15 }
  ],

  /* No signs, no hints, no sympathy. */
  signs: [],

  /* -----------------------------------------------------------------------
     EXITS
     TWO fake doors and one real one. The first fake door sits right in the
     middle of the level and is the first door you see, so most players will
     touch it, die, and only then discover the real door exists at all.
     ----------------------------------------------------------------------- */
  exits: [
    { kind: "fake", tx: 84,  ty: 15 },
    { kind: "fake", tx: 133, ty: 15 },
    { kind: "real", tx: 138, ty: 15, hidden: true }
  ]
};

/* No intro lines. Level 4 does not greet you. */
