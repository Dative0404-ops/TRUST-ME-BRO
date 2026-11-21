/* =========================================================================
   TRUST NOTHING - levels/level3.js
   -------------------------------------------------------------------------
   LEVEL 3: THE GAME IS CHEATING

   This is the level where the game stops pretending to be fair.

   Two things change here, on purpose:
     1. THE TRAINING WHEELS COME OFF. There is no control hint, no arrival
        message and no friendly little sign telling you what is coming. You
        are dropped in and expected to cope.
     2. A NEW TRAP IS INTRODUCED: the PROXIMITY MINE. A small drum on the
        floor with a steady amber light. Walk near it and the light goes red
        and starts strobing, a fuse burns for a fraction of a second, and then
        it takes a bite out of the floor. Sprint past it and you live. Stop
        to admire it and you do not.

   The hidden spikes also stop showing their tell-tale floor seam from this
   level onward, so a spike strip now gets exactly one warning: the sound of
   it coming up.

   Walkthrough, in order of betrayal
   ----------------------------------
     cols 0-28    Two mines and an unmarked spike strip, back to back.
     cols 29-33   A plain gap. Enjoy it, they get rarer.
     cols 34-57   A low roofed tunnel: two dropping crushers and two more
                   mines, all inside a space you cannot jump out of.
     cols 58-62   A plain gap.
     cols 63-84   A mine gauntlet - five drums spaced so that a careless
                   sprint sets off the next one while you are still moving
                   away from the last.
     cols 85-89   A plain gap.
     cols 90-107  One last spike strip and two mines, then the "exit".
     cols 112-131 The EXIT chamber. The door is a lie. It always was.
   ========================================================================= */

TN.Levels = TN.Levels || {};

TN.Levels.LEVEL_3 = {

  id: 3,
  name: "THE GAME IS CHEATING",
  tagline: "There is no hint. Read the room.",

  world: { cols: 132, rows: 20 },

  spawn: { tx: 3, ty: 15 },

  /* A sickly violet palette, so the mood curdles the moment the level loads. */
  theme: {
    dirt: "#3f2f4a",
    dirtDark: "#2a1f33",
    dirtLight: "#5b4470",
    grass: "#7a3f8a",
    grassDark: "#4e2960"
  },

  /* -----------------------------------------------------------------------
     SOLID GROUND
     Five generous slabs with a short gap between each. Every gap here is
     four or five tiles, which a running jump clears comfortably - the gaps
     are not the trap, they are the breather between them.
     ----------------------------------------------------------------------- */
  solids: [
    { x: 0,   y: 15, w: 29, h: 5 },   /* cols 0-28   the mine field     */
    { x: 34,  y: 15, w: 24, h: 5 },   /* cols 34-57  the crusher tunnel */
    { x: 38,  y: 0,  w: 18, h: 4 },   /* the tunnel roof, cols 38-55    */
    { x: 63,  y: 15, w: 22, h: 5 },   /* cols 63-84  the mine gauntlet  */
    { x: 90,  y: 15, w: 18, h: 5 },   /* cols 90-107 the run to the door*/
    { x: 113, y: 15, w: 19, h: 5 }    /* cols 113-131 the exit chamber  */
  ],

  /* -----------------------------------------------------------------------
     HONEST SPIKES - still none. Nothing in this level is honest.
     ----------------------------------------------------------------------- */
  spikes: [],

  /* -----------------------------------------------------------------------
     HIDDEN SPIKES
     From level 3 the floor seam that used to give these away is gone, so
     "reveal" is the ONLY fairness budget left. Keeping it around 44 means a
     sharp-eyed player gets most of a second to react; a distracted one gets
     a very short lesson.
     ----------------------------------------------------------------------- */
  hiddenSpikes: [
    { tx: 8,   ty: 14, tw: 3, reveal: 46 },   /* the unmarked first betrayal */
    { tx: 70,  ty: 14, tw: 3, reveal: 44 },   /* middle of the gauntlet      */
    { tx: 100, ty: 14, tw: 3, reveal: 44 }    /* one last reminder           */
  ],

  /* -----------------------------------------------------------------------
     PROXIMITY MINES
     ty is the row the drum RESTS ON THE FLOOR OF, so ty: 14 puts it on top
     of the row 15 ground. "radius" is how close you must get to light the
     fuse; "fuse" is how long it burns (shorter = meaner). The trigger radius
     is always wider than the blast, so a player who notices the light and
     stops in time is genuinely safe - this trap punishes running blind.
     ----------------------------------------------------------------------- */
  traps: [
    /* The opening one-two, right after the first spike strip. */
    { type: "mine", tx: 13,  ty: 14, radius: 38, fuse: 0.34 },
    { type: "mine", tx: 22,  ty: 14, radius: 36, fuse: 0.32 },

    /* The crusher tunnel: a crusher, a mine, another crusher, another mine.
       There is nowhere to dodge upward, so it is a footrace. */
    { type: "crusher", tx: 41, ty: 10, tw: 2, th: 2, triggerTx: 39 },
    { type: "mine",    tx: 45, ty: 14, radius: 34, fuse: 0.30 },
    { type: "crusher", tx: 52, ty: 10, tw: 3, th: 2, triggerTx: 50 },
    { type: "mine",    tx: 55, ty: 14, radius: 34, fuse: 0.28 },

    /* The gauntlet: five drums, packed close enough that a careless sprint
       chains them. */
    { type: "mine", tx: 66, ty: 14, radius: 38, fuse: 0.32 },
    { type: "mine", tx: 73, ty: 14, radius: 36, fuse: 0.30 },
    { type: "mine", tx: 79, ty: 14, radius: 34, fuse: 0.28 },

    /* The run to the door. */
    { type: "mine", tx: 94,  ty: 14, radius: 36, fuse: 0.30 },
    { type: "mine", tx: 103, ty: 14, radius: 34, fuse: 0.28 }
  ],

  /* -----------------------------------------------------------------------
     COINS
     Several of these are placed directly above a spike strip or a mine.
     There are no signs any more, so nothing warns you. That is the point.
     ----------------------------------------------------------------------- */
  coins: [
    { tx: 6,   ty: 13 },
    { tx: 9,   ty: 13 },    /* bait, above the first spike strip */
    { tx: 14,  ty: 13 },    /* bait, above the first mine        */
    { tx: 26,  ty: 13 },
    { tx: 40,  ty: 13 },
    { tx: 51,  ty: 13 },    /* bait, inside the tunnel           */
    { tx: 67,  ty: 13 },    /* bait, above a gauntlet mine        */
    { tx: 76,  ty: 12 },
    { tx: 92,  ty: 13 },
    { tx: 101, ty: 13 },    /* bait                              */
    { tx: 118, ty: 13 },
    { tx: 126, ty: 10 }     /* above the fake door, cruel but fair */
  ],

  /* -----------------------------------------------------------------------
     CHECKPOINTS - one after each hard stretch, so the game looks like it is
     being kind even while it is being awful.
     ----------------------------------------------------------------------- */
  checkpoints: [
    { tx: 5,   ty: 15 },
    { tx: 43,  ty: 15 },
    { tx: 68,  ty: 15 },
    { tx: 93,  ty: 15 }
  ],

  /* -----------------------------------------------------------------------
     NO SIGNS. Levels 1 and 2 held your hand. Level 3 does not.
     ----------------------------------------------------------------------- */
  signs: [],

  /* -----------------------------------------------------------------------
     EXITS
     The same cruel joke as level 1, and by now you should know better - but
     the level has spent twenty seconds teaching you that nothing here is
     trustworthy, and the door is bright and green and labelled EXIT.
     ----------------------------------------------------------------------- */
  exits: [
    { kind: "fake", tx: 120, ty: 15 },
    { kind: "real", tx: 127, ty: 15, hidden: true }
  ],

  lava: []
};

/* No intro lines, on purpose. The game says nothing. */
