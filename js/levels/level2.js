/* =========================================================================
   TRUST NOTHING - levels/level2.js
   -------------------------------------------------------------------------
   LEVEL 2: DON'T TRUST THE GROUND

   Like level 1, this file is PURE DATA. The Trap Manager, Level Manager and
   the Platform module already know how to bring every entry below to life,
   so this file only describes WHAT is in the level, never HOW it works.

   The theme of this level is simple: the floor is unreliable. Spikes hide in
   it, ceilings drop on it, some of it is fake, and the only way to finish is
   to find two hidden switches that wake up the exit door.

   New mechanics level 2 introduces (all defined in other files):
     fakeWalls        - walls drawn as solid ground that you walk through
     movingPlatforms  - slabs that slide across the bottomless pit
     switches         - levers; press them all and the real exit rises

   Walkthrough, in order of betrayal
   ----------------------------------
     cols 0-12    Friendly ground. A sign swears the floor is solid.
     cols 9-11    INVISIBLE SPIKES under a coin. First betrayal.
     cols 17-22   FALLING CEILINGS. Two crushers drop out of the roof. The
                  sign invites you to stand still, which is a terrible idea.
     cols 25-44   THE BOTTOMLESS PIT. Two MOVING PLATFORMS and a resting
                  ledge get you across. Fall and it is a void death.
     cols 51-52   A FAKE WALL filling the tunnel. The sign says it is solid.
                  Walk into it anyway.
     col 56       HIDDEN SWITCH #1, waiting just behind the fake wall.
     cols 63-67   A CRUMBLING BRIDGE over one more pit. Keep moving.
     cols 80-87   A VERTICAL MOVING PLATFORM lifts you to a high ledge holding
                  HIDDEN SWITCH #2.
     col 112      The EXIT, which only appears once both switches are pressed.
   ========================================================================= */

TN.Levels = TN.Levels || {};

TN.Levels.LEVEL_2 = {

  id: 2,
  name: "DON'T TRUST THE GROUND",
  tagline: 'The floor is a suggestion.',

  world: { cols: 120, rows: 20 },

  spawn: { tx: 3, ty: 15 },

  /* A cold, stony cave look so level 2 feels different from level 1 at a
     glance, even though it is drawn with the same tile artwork. */
  theme: {
    dirt: '#4a4a5a',
    dirtDark: '#33333f',
    dirtLight: '#63637a',
    grass: '#4a6f8a',
    grassDark: '#2f4a5e'
  },

  /* -----------------------------------------------------------------------
     SOLID GROUND - the only thing in this level you can actually rely on,
     and even that is a stretch.
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,  y: 15, w: 25, h: 5 },   /* start + falling ceiling corridor */
    { x: 45, y: 15, w: 18, h: 5 },   /* fake wall chamber, cols 45-62     */
    { x: 68, y: 15, w: 52, h: 5 },   /* the long run to the exit          */

    /* A rock roof that turns the fake-wall stretch into a tunnel, so the
       fake wall is the ONLY way through. There is no jumping around it. */
    { x: 44, y: 0, w: 20, h: 4 },

    /* A small resting ledge in the middle of the pit. A breather, not a
       safe haven. */
    { x: 32, y: 13, w: 3, h: 1 },

    /* The high ledge holding hidden switch #2, reached by the lift platform. */
    { x: 84, y: 9, w: 4, h: 1 }
  ],

  /* -----------------------------------------------------------------------
     FAKE WALL
     Looks like solid ground filling the tunnel, is not solid at all. A column
     two tiles wide from the roof down to the floor.
     ----------------------------------------------------------------------- */
  fakeWalls: [
    { x: 51, y: 4, w: 2, h: 11 }
  ],

  /* -----------------------------------------------------------------------
     HONEST SPIKES - none. Everything in this level is hiding.
     ----------------------------------------------------------------------- */
  spikes: [],

  /* -----------------------------------------------------------------------
     INVISIBLE SPIKES
     ----------------------------------------------------------------------- */
  hiddenSpikes: [
    { tx: 9,  ty: 14, tw: 3, reveal: 46 },  /* the first betrayal          */
    { tx: 57, ty: 14, tw: 3, reveal: 44 },  /* right after the fake wall   */
    { tx: 72, ty: 14, tw: 3, reveal: 44 },  /* out in the open run         */
    { tx: 96, ty: 14, tw: 3, reveal: 44 }   /* a last reminder near the end */
  ],

  /* -----------------------------------------------------------------------
     CRUMBLING BRIDGE over the pit at cols 63-67.
     ----------------------------------------------------------------------- */
  crumble: [
    { tx: 63, ty: 15, tw: 5, delay: 0.28 }
  ],

  /* -----------------------------------------------------------------------
     MOVING PLATFORMS
     axis 'x' slides left-right, axis 'y' slides up-down. Positions are in
     tiles; "toTx"/"toTy" are the far end of the journey. Slow and generous,
     because a pit you cannot cross is not funny, it is broken.
     ----------------------------------------------------------------------- */
  movingPlatforms: [
    /* Carries you off the starting ground, across the pit, to the ledge. */
    { axis: 'x', tx: 25, ty: 13, tw: 3, th: 1, toTx: 30, speed: 28, pause: 0.5 },
    /* Picks you up at the ledge and delivers you to the far side. */
    { axis: 'x', tx: 35, ty: 13, tw: 3, th: 1, toTx: 41, speed: 32, pause: 0.5 },
    /* The vertical lift up to the switch-2 ledge. */
    { axis: 'y', tx: 80, ty: 13, tw: 3, th: 1, toTy: 9,  speed: 26, pause: 0.4 }
  ],

  /* -----------------------------------------------------------------------
     HIDDEN SWITCHES
     Walk into one to flip it. Flip every switch in the level and the real
     exit rises out of the ground.
     ----------------------------------------------------------------------- */
  switches: [
    { tx: 56, ty: 14 },   /* behind the fake wall                */
    { tx: 86, ty: 8 }     /* on top of the lift-platform ledge   */
  ],

  /* -----------------------------------------------------------------------
     COINS
     ----------------------------------------------------------------------- */
  coins: [
    { tx: 7,   ty: 13 },
    { tx: 8,   ty: 13 },
    { tx: 10,  ty: 13 },   /* bait, above the first hidden spikes */
    { tx: 14,  ty: 13 },
    { tx: 23,  ty: 13 },
    { tx: 28,  ty: 12 },   /* over the pit, needs the first platform */
    { tx: 33,  ty: 12 },   /* reward on the resting ledge            */
    { tx: 38,  ty: 12 },   /* over the pit, needs the second platform */
    { tx: 47,  ty: 13 },
    { tx: 50,  ty: 13 },
    { tx: 54,  ty: 12 },   /* near switch #1                          */
    { tx: 58,  ty: 13 },   /* bait, above the spikes past the wall    */
    { tx: 65,  ty: 13 },   /* over the crumbling bridge               */
    { tx: 73,  ty: 13 },   /* bait                                    */
    { tx: 85,  ty: 6 },    /* high reward above the switch-2 ledge    */
    { tx: 97,  ty: 13 },   /* bait                                    */
    { tx: 108, ty: 13 },
    { tx: 110, ty: 10 }
  ],

  /* -----------------------------------------------------------------------
     CHECKPOINTS
     ----------------------------------------------------------------------- */
  checkpoints: [
    { tx: 13,  ty: 15 },
    { tx: 46,  ty: 15 },
    { tx: 77,  ty: 15 },
    { tx: 100, ty: 15 }
  ],

  /* -----------------------------------------------------------------------
     SIGNS
     ----------------------------------------------------------------------- */
  signs: [
    { tx: 4,  ty: 13, text: 'THE GROUND IS SOLID HERE. WE CHECKED.' },
    { tx: 15, ty: 13, text: 'LOOK UP. ACTUALLY, NEVER MIND.' },
    { tx: 24, ty: 13, text: 'MIND THE GAP. AND THE NEXT ONE.' },
    { tx: 49, ty: 13, text: 'SOLID WALL. DO NOT TOUCH. SERIOUSLY.' },
    { tx: 54, ty: 13, text: 'YOU TOUCHED IT. OF COURSE YOU DID.' },
    { tx: 59, ty: 13, text: 'SOMETIMES THE GROUND LIES. MOSTLY IT DOES.' },
    { tx: 61, ty: 13, text: 'THE BRIDGE IS FINE. PROBABLY. HURRY.' },
    { tx: 75, ty: 13, text: 'THE DOOR NEEDS TWO SWITCHES. GOOD LUCK.' },
    { tx: 95, ty: 13, text: 'ALMOST THERE. THAT IS ALL WE WILL SAY.' }
  ],

  /* -----------------------------------------------------------------------
     TRAPS
     Level 2's ceiling drops. Two crushers falling from the roof - run through
     them and you live; stop and admire the architecture and you do not.
     ----------------------------------------------------------------------- */
  traps: [
    { type: 'crusher', tx: 17, ty: 10, tw: 3, th: 2, triggerTx: 16 },
    { type: 'crusher', tx: 21, ty: 10, tw: 2, th: 2, triggerTx: 20 }
  ],

  /* -----------------------------------------------------------------------
     EXITS
     Only the real door, and it is hidden until BOTH switches are pressed.
     ----------------------------------------------------------------------- */
  exits: [
    { kind: 'real', tx: 112, ty: 15, hidden: true }
  ],

  lava: []
};

/* Sarcastic intro lines, fired by the Level Manager on load. */
TN.Levels.LEVEL_2.introLines = [
  'LEVEL 2. THE FLOOR IS A SUGGESTION.',
  'DO NOT TRUST THE GROUND. IT HAS PLANS.',
  'TWO SWITCHES HIDE THE WAY OUT. FIND THEM.'
];
