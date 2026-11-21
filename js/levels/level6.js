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
     cols 78-87   A WIDE lava pit - far too wide to jump - crossed only by a
                  sliding platform. Fall in and you burn.
     cols 88-119  Fake doors at 93, 99, 106, 112, then at col 116 the
                  spike "pit" that is really the exit.

   ON TOP OF ALL THAT, the loose spikes scattered along the floor are
   re-rolled every single run (see randomSpikes below), so no two attempts
   are ever quite the same.
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
     SOLID GROUND - three long slabs with a gap and a wide lava pit between
     them.
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,   y: 15, w: 38, h: 5 },   /* cols 0-37   the door hall          */
    { x: 41,  y: 15, w: 37, h: 5 },   /* cols 41-77  the second door hall   */
    { x: 88,  y: 15, w: 32, h: 5 }    /* cols 88-119 the last door hall     */
  ],

  /* No hidden spikes anywhere. That would spoil the theme. */
  spikes: [],
  hiddenSpikes: [],

  traps: [],

  /* -----------------------------------------------------------------------
     RANDOM SPIKES
     These are re-rolled on every run so the player can never memorise the
     level. Every tile below is flat, open floor, at least three tiles clear
     of any door, gap, lava pit or the real exit - so whichever ones come up,
     the corridor is always still finishable.
     ----------------------------------------------------------------------- */
  randomSpikes: {
    count: 10,
    ty: 14,
    candidates: [
      /* First hall (doors at 8, 17, 26, 33). */
      11, 14, 20, 23, 29,
      /* Second hall (doors at 46, 55, 64, 72). */
      49, 51, 60, 61, 67, 68,
      /* Last hall (doors at 93, 99, 106, 112). */
      96, 103, 109
    ]
  },

  /* -----------------------------------------------------------------------
     LAVA - a pit ten tiles wide in the middle. Ten tiles is well past the
     furthest the player can jump at full speed, so there is no running
     across it: the platform is the only way. Fall in and you burn.
     ----------------------------------------------------------------------- */
  lava: [
    { tx: 78, ty: 18, tw: 10, th: 2 }
  ],

  movingPlatforms: [
    { axis: "x", tx: 78, ty: 13, tw: 3, th: 1, toTx: 85, speed: 34, pause: 0.35 }
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

    /* Last hall. Note the first door sits well clear of col 88, which is where
       the platform sets you down - nobody should be killed by a door the
       instant they land. */
    { kind: "fake", tx: 93,  ty: 15 },
    { kind: "fake", tx: 99,  ty: 15 },
    { kind: "fake", tx: 106, ty: 15 },
    { kind: "fake", tx: 112, ty: 15 },

    /* The real way out: a tiny spike pit. Step in. */
    { kind: "spikeExit", tx: 116, ty: 15 }
  ]
};

/* No intro lines. The doors do not introduce themselves either. */
