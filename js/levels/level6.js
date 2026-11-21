/* =========================================================================
   TRUST NOTHING - levels/level6.js
   -------------------------------------------------------------------------
   LEVEL 6: EVERY DOOR IS A TRAP

   By now the player has learned two things the hard way:

     1. a door marked EXIT is probably going to kill you, and
     2. spikes on the floor are the one honest hazard in the game.

   This level weaponises both of those lessons against them.

   THE GIMMICK
   -----------
   Every single trap in this level is a DOOR. There are no hidden spike
   strips, no proximity mines, no crushers. Just door after door after door,
   all labelled EXIT, spread along one long corridor. Walk into any of them
   and you die (and, cruelly, the game congratulates itself for it).

   So the player does the sensible thing: they learn to walk PAST every door.

   THE PUNCHLINE
   -------------
   At the very end there is a small, obvious clump of spikes sitting on the
   floor - no door, no frame, no EXIT sign, just spikes, the thing they have
   spent five levels dodging. It is the ONLY way to finish the level. The one
   hazard they were right to trust is the one that is lying.

   There are no signs, no hints and no arrival message. Of course there are
   not.

   Walkthrough
   -----------
     cols 0-37    Fake doors at 8, 17, 26, 33.
     cols 38-40   A small gap. Jump it.
     cols 41-77   Fake doors at 46, 55, 64, 72.
     cols 78-83   A LAVA pit, crossed only by a sliding platform.
     cols 84-119  Fake doors at 88, 97, 106, 112, then at col 116 the
                  spike "pit" that is really the exit.
   ========================================================================= */

TN.Levels = TN.Levels || {};

TN.Levels.LEVEL_6 = {

  id: 6,
  name: "EVERY DOOR IS A TRAP",
  tagline: "The only honest thing here is a lie.",

  world: { cols: 120, rows: 20 },

  spawn: { tx: 3, ty: 15 },

  /* A warm wood-and-brass palette, because doors are made of wood, and so is
     every coffin this level has prepared for you. */
  theme: {
    dirt: "#3a2a1c",
    dirtDark: "#241a10",
    dirtLight: "#5a4230",
    grass: "#7a5a3a",
    grassDark: "#4a3520"
  },

  /* -----------------------------------------------------------------------
     SOLID GROUND - three long slabs with a gap and a lava pit between them.
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,   y: 15, w: 38, h: 5 },   /* cols 0-37   the door hall          */
    { x: 41,  y: 15, w: 37, h: 5 },   /* cols 41-77  the second door hall   */
    { x: 84,  y: 15, w: 36, h: 5 }    /* cols 84-119 the last door hall     */
  ],

  /* No hidden spikes anywhere. That would spoil the theme. */
  spikes: [],
  hiddenSpikes: [],

  traps: [],

  /* -----------------------------------------------------------------------
     LAVA - the one pit, in the middle, so the run has a rhythm.
     ----------------------------------------------------------------------- */
  lava: [
    { tx: 78, ty: 18, tw: 6, th: 2 }
  ],

  movingPlatforms: [
    { axis: "x", tx: 78, ty: 13, tw: 3, th: 1, toTx: 82, speed: 32, pause: 0.35 }
  ],

  /* -----------------------------------------------------------------------
     COINS - a little bait, never a threat. This level has enough threats.
     ----------------------------------------------------------------------- */
  coins: [
    { tx: 6,   ty: 13 },
    { tx: 21,  ty: 13 },
    { tx: 39,  ty: 12 },   /* over the gap      */
    { tx: 60,  ty: 13 },
    { tx: 80,  ty: 12 },   /* over the lava     */
    { tx: 95,  ty: 13 },
    { tx: 118, ty: 9 }     /* high above the spikes, because of course */
  ],

  checkpoints: [
    { tx: 5,   ty: 15 },
    { tx: 44,  ty: 15 },
    { tx: 58,  ty: 15 },
    /* One scam flag for the road, because a checkpoint is just a door you did
       not have to open. */
    { tx: 101, ty: 15, fake: true },
    { tx: 90,  ty: 15 }
  ],

  signs: [],

  /* -----------------------------------------------------------------------
     EXITS - HERE IS THE WHOLE LEVEL.

     Twelve doors, every one of them labelled EXIT, every one of them a lie.
     They spring spikes and kill you. Then, at the very end, one thing that
     is NOT a door: a small, obvious spike pit at col 116. That is the exit.
     ----------------------------------------------------------------------- */
  exits: [
    /* First hall. */
    { kind: "fake", tx: 8,   ty: 15 },
    { kind: "fake", tx: 17,  ty: 15 },
    { kind: "fake", tx: 26,  ty: 15 },
    { kind: "fake", tx: 33,  ty: 15 },

    /* Second hall. */
    { kind: "fake", tx: 46,  ty: 15 },
    { kind: "fake", tx: 55,  ty: 15 },
    { kind: "fake", tx: 64,  ty: 15 },
    { kind: "fake", tx: 72,  ty: 15 },

    /* Last hall. */
    { kind: "fake", tx: 88,  ty: 15 },
    { kind: "fake", tx: 97,  ty: 15 },
    { kind: "fake", tx: 106, ty: 15 },
    { kind: "fake", tx: 112, ty: 15 },

    /* The real way out: a tiny spike pit. Step in. */
    { kind: "spikeExit", tx: 116, ty: 15 }
  ]
};

/* No intro lines. The doors do not introduce themselves either. */
