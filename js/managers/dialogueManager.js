/* =========================================================================
   TRUST NOTHING - managers/dialogueManager.js
   -------------------------------------------------------------------------
   The game's voice. Every sarcastic comment, checkpoint note and hint comes
   out of here.

   Two jobs:

     1. Show a message box at the bottom of the screen. Messages queue up so
        two things happening at once do not overwrite each other, but an
        important message (a death) is allowed to jump the queue.

     2. Never repeat itself. pickLine() remembers the last few lines it used
        and avoids them, which is the difference between "funny" and "why is
        it saying the same thing again".
   ========================================================================= */

TN.DialogueManager = function () {

  /* The line currently on screen: { text, timer, duration, style } */
  this.current = null;

  /* Waiting lines. Capped so a disaster cannot build up a huge backlog. */
  this.queue = [];

  /* The last handful of lines used, so we can avoid repeating them. */
  this.history = [];

  /* How many lines to remember. 5 is enough for the pools in this game. */
  this.historySize = 5;

  /* Smooth fade in / out of the box. */
  this.alpha = 0;
  this.targetAlpha = 0;
};

/* -------------------------------------------------------------------------
   The message pools, grouped by what killed you. Keeping them together here
   makes it easy to add more jokes later without touching any game logic.
   ------------------------------------------------------------------------- */
TN.DialogueManager.MESSAGES = {

  spike: [
    'You trusted the floor?',
    'The floor looked fine, did it not?',
    'Pointy things. Who knew?',
    'Spikes 1 - You 0.',
    'That was unfortunate.',
    'Fun fact: spikes are sharp.',
    'Your shoes were not spike proof.'
  ],

  crush: [
    'You have been flattened.',
    'Splat. Elegant.',
    'Gravity is undefeated.',
    'That ceiling had other plans.',
    'Pancake mode activated.',
    'You are now 2D. Even more 2D.'
  ],

  lava: [
    'NICE SKIN COLOR, JUST LIKE RAF.'
  ],

  explosion: [
    'Skill issue detected.',
    'Physics said no.',
    'That escalated quickly.',
    'KABOOM. Rude.',
    'You were briefly very bright.'
  ],

  void: [
    'Gravity is undefeated.',
    'It is a long way down.',
    'The void says hello.',
    'You left the map. Please come back.',
    'You have successfully found the bottom.'
  ],

  fakeExit: [
    'The door is not accepting visitors.',
    'Congratulations! You played yourself.',
    'That door was a lie. And so was everything else.',
    'Fake door. Classic.',
    'The exit has filed a restraining order.'
  ],

  collect: [
    'Congratulations! You played yourself.',
    'Shiny object syndrome is fatal.',
    'That coin had a subscription fee.',
    'Curiosity killed the player. Again.',
    'You really do trust everything, huh?'
  ],

  switch: [
    'Click. Something opened. Probably.',
    'You found a switch. Suspicious.',
    'The door heard you. Do not celebrate.',
    'Hidden switch located. Well spotted, briefly.',
    'One more of those and the way out wakes up.'
  ],

  checkpoint: [
    'Checkpoint saved. Bold choice.',
    'Progress stored. Confidence unearned.',
    'A flag. Surely this one is safe.',
    'Noted. Try not to waste it.'
  ],

  fakeCheckpoint: [
    'That flag was a lie too.',
    'A fake checkpoint. Of course it was.',
    'Checkpoint saved. Just kidding.',
    'The flag stabbed you. Very on brand.',
    'That was not mercy. That was bait.'
  ],

  /* A door that looked like the exit but threw you backwards a whole level. */
  warp: [
    'Wrong way. Thanks for playing.',
    'That door leads backwards. Obviously.',
    'You have been re-routed. How unfortunate.',
    'Not the exit. Not even close.',
    'Progress is a social construct anyway.'
  ],

  levelStart: [
    'Remember: nothing here can hurt you.',
    'Good luck. You will need it.',
    'Trust nothing.'
  ],

  taunt: [
    'That was unfortunate.',
    'Have you tried not dying?',
    'Skill issue detected.',
    'Better luck next time. Probably not.',
    'The level is not hard. You are just early.',
    'Somewhere, a developer is laughing.'
  ]
};

TN.DialogueManager.prototype = {

  /* -----------------------------------------------------------------------
     Show a line.

     options:
       style    - 'normal' | 'bad' | 'good' | 'hint'
       duration - seconds on screen (default depends on text length)
       priority - true to clear the queue and show this immediately
     ----------------------------------------------------------------------- */
  say: function (text, options) {
    if (!text) return;
    options = options || {};

    var duration = options.duration ||
      /* Longer lines get a little more time, but never too much. */
      TN.utils.clamp(1.5 + text.length * 0.035, 1.8, 3.6);

    var message = {
      text: String(text),
      timer: duration,
      duration: duration,
      style: options.style || 'normal'
    };

    if (options.priority) {
      this.queue.length = 0;
      this.current = message;
    } else if (!this.current) {
      this.current = message;
    } else if (this.queue.length < 4) {
      this.queue.push(message);
    }
  },

  /* Pick a fresh line out of one of the pools above and show it.
     "poolName" is a key of TN.DialogueManager.MESSAGES. */
  sayFrom: function (poolName, options) {
    var pool = TN.DialogueManager.MESSAGES[poolName];
    if (!pool) return;
    this.say(this.pickLine(pool), options);
  },

  /* Pick a random line while avoiding the last few we used. */
  pickLine: function (pool) {
    var line = TN.utils.pickFresh(pool, this.history);

    this.history.push(line);
    while (this.history.length > this.historySize) this.history.shift();

    return line;
  },

  /* Drop whatever is on screen. Used when a level restarts so a stale death
     message does not follow the player into the next attempt. */
  clear: function () {
    this.current = null;
    this.queue.length = 0;
    this.alpha = 0;
    this.targetAlpha = 0;
  },

  /* -----------------------------------------------------------------------
     Tick the timers.
     ----------------------------------------------------------------------- */
  update: function (dt) {
    if (this.current) {
      this.current.timer -= dt;
      if (this.current.timer <= 0) {
        this.current = this.queue.shift() || null;
      }
    }

    /* Fade the box in while there is something to read, and out when there
       is not. Uses smoothing instead of a hard cut so it feels polished. */
    this.targetAlpha = this.current ? 1 : 0;
    this.alpha = TN.utils.smooth(this.alpha, this.targetAlpha, 16, dt);
    if (this.alpha < 0.01) this.alpha = 0;
  },

  /* -----------------------------------------------------------------------
     Draw the box.
     ----------------------------------------------------------------------- */
  draw: function (ctx) {
    if (this.alpha <= 0.01 || !this.current) return;

    var scale = 1;
    var maxWidth = 330;
    var lines = TN.Font.wrap(this.current.text, maxWidth, scale);
    var lineHeight = (TN.Font.GLYPH_H + 3) * scale;
    var textHeight = lines.length * lineHeight - 3;
    var boxWidth = 0;
    var i;

    for (i = 0; i < lines.length; i++) {
      boxWidth = Math.max(boxWidth, TN.Font.width(lines[i], scale));
    }
    boxWidth += 16;

    var boxHeight = textHeight + 12;
    var boxX = Math.round((TN.VIEW_W - boxWidth) / 2);
    var boxY = TN.VIEW_H - boxHeight - 10;

    ctx.save();
    /* Everything inside this block gets faded by this.alpha. */
    ctx.globalAlpha = this.alpha;

    /* Coloured tab on the left edge tells you at a glance what kind of news
       this is: red = you died, green = good news, yellow = hint. */
    var tabColor = TN.C.uiDim;
    var textColor = TN.C.uiText;
    if (this.current.style === 'bad') { tabColor = TN.C.uiBad; textColor = '#ffdede'; }
    else if (this.current.style === 'good') { tabColor = TN.C.uiGood; textColor = '#e0ffe6'; }
    else if (this.current.style === 'hint') { tabColor = TN.C.uiWarn; textColor = '#fff4d8'; }

    /* Box background: dark fill plus a 2px border. */
    TN.utils.rect(ctx, boxX, boxY, boxWidth, boxHeight, 'rgba(6,6,14,0.86)');
    TN.utils.rect(ctx, boxX, boxY, boxWidth, 1, '#3b3564');
    TN.utils.rect(ctx, boxX, boxY + boxHeight - 1, boxWidth, 1, '#3b3564');
    TN.utils.rect(ctx, boxX, boxY, 1, boxHeight, '#3b3564');
    TN.utils.rect(ctx, boxX + boxWidth - 1, boxY, 1, boxHeight, '#3b3564');

    /* The coloured tab. */
    TN.utils.rect(ctx, boxX + 2, boxY + 3, 3, boxHeight - 6, tabColor);

    /* The text itself, centred in the box. */
    for (i = 0; i < lines.length; i++) {
      TN.Font.draw(ctx, lines[i], TN.VIEW_W / 2, boxY + 7 + i * lineHeight, {
        scale: scale,
        color: textColor,
        align: 'center',
        shadow: '#000000'
      });
    }

    ctx.restore();
  }
};
