/* =========================================================================
   TRUST NOTHING - levels/level1.js
   -------------------------------------------------------------------------
   LEVEL 1: THE WELCOME TRAP

   This file is PURE DATA. There is not a single line of game logic in here,
   which means levels 2 to 5 are just four more files exactly like this one.

   Coordinate system
   -----------------
   Everything is in TILE coordinates. A tile is 16x16 pixels, the world is
   118 tiles wide and 20 tiles tall (1888 x 320 pixels).

   The GROUND ROW is 15, which means the walkable surface is at y = 240.
   Everything above the ground occupies rows 14, 13, 12 and so on.

   Walkthrough of the level, in order of betrayal
   ----------------------------------------------
     cols 0-12   A friendly flat start. A sign promises nothing can hurt you.
     cols 13-17  HIDDEN SPIKES under a coin. The floor cracks a moment before
                 they come up, which is your only warning.
     cols 20-26  A checkpoint, because the game has to look fair.
     cols 27-40  COLLAPSING BRIDGE over a bottomless pit, with a 2 tile hole
                 in the middle. Keep moving.
     cols 41-46  A checkpoint, then two honest, visible spikes. These exist to
                 teach you that visible spikes can be trusted.
     cols 51-54  A secret ledge that lets you escape the next trap.
     cols 55-60  A FREE UPGRADE gem. Grabbing it triggers a spike eruption.
                 Skilled players can double jump out. Greedy ones cannot.
     cols 67-75  A CRUSHER block. It shakes for a third of a second, then
                 drops. Run, do not think.
     cols 81-86  A sign that says SAFE ZONE. It is lying. Hidden spikes again.
     cols 94-100 The EXIT door. It is not a real exit. Getting there the first
                 time is the punchline of the level.
     cols 104    The real exit, which rises out of the ground to mock you.
   ========================================================================= */

TN.Levels = TN.Levels || {};

TN.Levels.LEVEL_1 = {

  id: 1,
  name: 'THE WELCOME TRAP',
  tagline: 'Nothing here can hurt you. Promise.',

  /* Size of the level, in tiles. */
  world: { cols: 118, rows: 20 },

  /* Where the player starts. ty is the ground row. */
  spawn: { tx: 3, ty: 15 },

  /* Palette overrides, so level 1 has its own dusk-time look while still
     using the same tile artwork as every other level. */
  theme: {
    dirt: '#5d4433',
    dirtDark: '#3d2c21',
    dirtLight: '#7d5c42',
    grass: '#43873f',
    grassDark: '#2c5f2e'
  },

  /* -----------------------------------------------------------------------
     SOLID GROUND - simple rectangles of tiles.
     Everything else in the level is placed on top of these.
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,  y: 15, w: 27, h: 5 },   /* the starting ground, cols 0-26  */
    { x: 41, y: 15, w: 26, h: 5 },   /* after the collapsing bridge     */
    { x: 67, y: 15, w: 25, h: 5 },   /* the crusher corridor            */
    { x: 92, y: 15, w: 26, h: 5 },   /* the exit chamber                */

    /* The secret ledge above the gem trap. Only reachable with a well timed
       jump, and it is the safe way to survive the eruption. */
    { x: 52, y: 12, w: 3, h: 1 }
  ],

  /* -----------------------------------------------------------------------
     PERMANENT (HONEST) SPIKES
     Always visible, always lethal, never move. Two tiles wide.
     ----------------------------------------------------------------------- */
  spikes: [
    { tx: 48, ty: 14, tw: 2 }
  ],

  /* -----------------------------------------------------------------------
     HIDDEN SPIKES
     Invisible until the player is close, then they shoot up out of the floor
     in a tenth of a second. "reveal" is the trigger distance in pixels - the
     bigger it is, the fairer the trap is.
     ----------------------------------------------------------------------- */
  hiddenSpikes: [
    /* Group 1: the very first betrayal, under an innocent looking coin. */
    { tx: 14, ty: 14, tw: 3, reveal: 48 },
    /* Group 2: under the sign that says SAFE ZONE. It is not a safe zone. */
    { tx: 84, ty: 14, tw: 3, reveal: 42 }
  ],

  /* -----------------------------------------------------------------------
     CRUMBLING BRIDGE
     "delay" is how long the platform lasts after it is stepped on, in
     seconds. Lower = meaner. Note the deliberate hole at cols 34-35.
     ----------------------------------------------------------------------- */
  crumble: [
    { tx: 27, ty: 15, tw: 7, delay: 0.30 },   /* cols 27-33 */
    { tx: 36, ty: 15, tw: 5, delay: 0.26 }    /* cols 36-40, meaner */
  ],

  /* -----------------------------------------------------------------------
     COINS
     17 of them. All completely safe. This is important: the gem later only
     works as a trap because a normal coin has never once hurt you.
     ----------------------------------------------------------------------- */
  coins: [
    { tx: 8,   ty: 13 },
    { tx: 9,   ty: 13 },
    { tx: 15,  ty: 13 },   /* bait, directly above the hidden spikes   */
    { tx: 24,  ty: 13 },
    { tx: 25,  ty: 13 },
    { tx: 31,  ty: 12 },   /* sits on a platform that is about to fall */
    { tx: 34,  ty: 12 },   /* over the hole in the bridge              */
    { tx: 45,  ty: 13 },
    { tx: 46,  ty: 13 },
    { tx: 53,  ty: 11 },   /* reward for finding the secret ledge      */
    { tx: 62,  ty: 13 },   /* reward for surviving the gem trap        */
    { tx: 63,  ty: 13 },
    { tx: 80,  ty: 13 },
    { tx: 85,  ty: 13 },   /* bait, above the "safe zone" spikes       */
    { tx: 96,  ty: 13 },
    { tx: 97,  ty: 13 },
    { tx: 100, ty: 10 }    /* above the fake exit door, cruel but fair */
  ],

  /* -----------------------------------------------------------------------
     CHECKPOINTS
     ty is the ground row the flag is planted into.
     ----------------------------------------------------------------------- */
  checkpoints: [
    { tx: 22, ty: 15 },
    { tx: 43, ty: 15 },
    { tx: 78, ty: 15 }
  ],

  /* -----------------------------------------------------------------------
     SIGNS
     The board is always drawn; the text pops up when you walk up to it.
     ----------------------------------------------------------------------- */
  signs: [
    { tx: 6,  ty: 13, text: 'WELCOME! NOTHING HERE CAN HURT YOU.' },
    { tx: 18, ty: 13, text: 'GOOD JOB. FEELING CONFIDENT?' },
    { tx: 46, ty: 13, text: 'THESE SPIKES ARE THE HONEST ONES.' },
    { tx: 55, ty: 13, text: 'FREE UPGRADE ABOVE. NO CATCH WHATSOEVER.' },
    { tx: 68, ty: 13, text: 'STAND STILL. RELAX. NOTHING DROPS HERE.' },
    { tx: 81, ty: 13, text: 'SAFE ZONE - PLEASE REST HERE.' },
    { tx: 94, ty: 13, text: 'EXIT THIS WAY ->' }
  ],

  /* -----------------------------------------------------------------------
     TRAPS
     Each one is a type the Trap Manager knows how to build.
     ----------------------------------------------------------------------- */
  traps: [
    /* The crusher. triggerTx is the column the player must reach to set it
       off. It is deliberately far enough away that running saves you. */
    { type: 'crusher', tx: 71, ty: 11, tw: 2, th: 2, triggerTx: 69 },

    /* The gem and its spike eruption. Eruption covers cols 55-59 at ground
       level, so the safe landing spot is col 60 or beyond. */
    { type: 'gem', tx: 57, ty: 11, eruption: { tx: 55, ty: 14, tw: 5 } }
  ],

  /* -----------------------------------------------------------------------
     EXITS
     The fake one is listed first because that is the one you will find.
     The real one is hidden until the fake one has been triggered.
     ----------------------------------------------------------------------- */
  exits: [
    { kind: 'fake', tx: 100, ty: 15 },
    { kind: 'real', tx: 104, ty: 15, hidden: true }
  ],

  /* No lava in level 1. Kept here so the shape of every level config is the
     same and later levels can just fill it in. */
  lava: []
};

/* -------------------------------------------------------------------------
   Sarcastic intro lines. The Level Manager fires one of these on load.
   ------------------------------------------------------------------------- */
TN.Levels.LEVEL_1.introLines = [
  'LEVEL 1. NOTHING HERE CAN HURT YOU.',
  'TRUST THE FLOOR. TRUST THE DOOR. TRUST EVERYTHING.',
  'WELCOME. PLEASE TRY TO ENJOY IT.'
];
