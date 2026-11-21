/* =========================================================================
   TRUST NOTHING - core/font.js
   -------------------------------------------------------------------------
   A tiny 5x5 pixel font.

   Why write our own font instead of using ctx.fillText?
   Because the canvas is 480x270 and gets scaled up 3x or 4x. Browser text is
   anti-aliased, which turns into grey mush once it is blown up. This font is
   drawn as literal square pixels, so it stays perfectly sharp at any scale,
   exactly like the rest of the artwork.

   Every glyph is 5 pixels wide and 5 pixels tall, described as 5 strings.
   A '#' means "put a pixel here", anything else means "leave it empty".
   ========================================================================= */

TN.Font = (function () {

  /* ---------------------------------------------------------------------
     The glyph table. Uppercase only - the draw() function converts text to
     uppercase automatically, which also keeps everything readable at 5px.
     --------------------------------------------------------------------- */
  var GLYPHS = {
    'A': ['.###.', '#...#', '#####', '#...#', '#...#'],
    'B': ['####.', '#...#', '####.', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '####.', '#....', '#####'],
    'F': ['#####', '#....', '####.', '#....', '#....'],
    'G': ['.###.', '#....', '#..##', '#...#', '.###.'],
    'H': ['#...#', '#...#', '#####', '#...#', '#...#'],
    'I': ['#####', '..#..', '..#..', '..#..', '#####'],
    'J': ['....#', '....#', '....#', '#...#', '.###.'],
    'K': ['#...#', '#..#.', '##...', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '####.', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '####.', '#..#.', '#...#'],
    'S': ['.####', '#....', '.###.', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
    'X': ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..'],
    'Z': ['#####', '...#.', '..#..', '.#...', '#####'],

    '0': ['.###.', '#..##', '#.#.#', '##..#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '..##.', '.#...', '#####'],
    '3': ['####.', '....#', '.###.', '....#', '####.'],
    '4': ['#..#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '####.'],
    '6': ['.###.', '#....', '####.', '#...#', '.###.'],
    '7': ['#####', '...#.', '..#..', '.#...', '.#...'],
    '8': ['.###.', '#...#', '.###.', '#...#', '.###.'],
    '9': ['.###.', '#...#', '.####', '....#', '.###.'],

    ' ': ['.....', '.....', '.....', '.....', '.....'],
    '.': ['.....', '.....', '.....', '.....', '..#..'],
    ',': ['.....', '.....', '.....', '..#..', '.#...'],
    ':': ['.....', '..#..', '.....', '..#..', '.....'],
    ';': ['.....', '..#..', '.....', '..#..', '.#...'],
    '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '..##.', '.....', '..#..'],
    '-': ['.....', '.....', '.###.', '.....', '.....'],
    '_': ['.....', '.....', '.....', '.....', '#####'],
    '+': ['.....', '..#..', '.###.', '..#..', '.....'],
    '=': ['.....', '.###.', '.....', '.###.', '.....'],
    '/': ['....#', '...#.', '..#..', '.#...', '#....'],
    '\\':['#....', '.#...', '..#..', '...#.', '....#'],
    '(': ['..##.', '.#...', '.#...', '.#...', '..##.'],
    ')': ['.##..', '...#.', '...#.', '...#.', '.##..'],
    '[': ['..##.', '..#..', '..#..', '..#..', '..##.'],
    ']': ['.##..', '..#..', '..#..', '..#..', '.##..'],
    '%': ['##..#', '##.#.', '..#..', '.#.##', '#..##'],
    '"': ['.#.#.', '.#.#.', '.....', '.....', '.....'],
    "'": ['..#..', '..#..', '.....', '.....', '.....'],
    '*': ['.....', '#.#.#', '.###.', '#.#.#', '.....'],
    '>': ['#....', '.#...', '..#..', '.#...', '#....'],
    '<': ['....#', '...#.', '..#..', '...#.', '....#'],
    '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
    '@': ['.###.', '#..##', '#.#.#', '#....', '.###.'],
    '^': ['..#..', '.#.#.', '.....', '.....', '.....'],
    '~': ['.....', '.##.#', '#..#.', '.....', '.....'],
    '|': ['..#..', '..#..', '..#..', '..#..', '..#..'],
    '&': ['.##..', '#.#..', '.##.#', '#..#.', '.##.#']
  };

  /* Every glyph is 5 wide. We add 1 pixel of gap when drawing several of
     them next to each other. */
  var GLYPH_W = 5;
  var GLYPH_H = 5;
  var SPACING = 1;

  /* Width in pixels of a piece of text at a given scale. */
  function width(text, scale) {
    scale = scale || 1;
    var t = String(text);
    if (t.length === 0) return 0;
    return (t.length * (GLYPH_W + SPACING) - SPACING) * scale;
  }

  /* Height in pixels of one line of text at a given scale. */
  function height(scale) {
    scale = scale || 1;
    return GLYPH_H * scale;
  }

  /* Low-level routine that stamps the actual pixels onto the canvas. */
  function blit(ctx, text, x, y, scale, color) {
    ctx.fillStyle = color;
    var cursor = Math.round(x);
    var top = Math.round(y);
    for (var i = 0; i < text.length; i++) {
      var rows = GLYPHS[text[i]];
      if (rows) {
        for (var r = 0; r < GLYPH_H; r++) {
          var row = rows[r];
          for (var c = 0; c < GLYPH_W; c++) {
            if (row[c] === '#') {
              ctx.fillRect(cursor + c * scale, top + r * scale, scale, scale);
            }
          }
        }
      }
      /* Unknown characters (including lowercase that somehow got through)
         simply advance the cursor so text never overlaps itself. */
      cursor += (GLYPH_W + SPACING) * scale;
    }
  }

  /* ---------------------------------------------------------------------
     Public: draw one line of text.

     options:
       scale   - pixel multiplier (default 1)
       color   - text colour (default white)
       align   - 'left' | 'center' | 'right'   (default 'left')
       shadow  - colour drawn 1px down-right for readability (optional)
       outline - colour drawn in 4 directions around the text (optional)
     --------------------------------------------------------------------- */
  function draw(ctx, text, x, y, options) {
    options = options || {};
    var scale = options.scale || 1;
    var color = options.color || '#ffffff';
    var t = String(text).toUpperCase();
    var w = width(t, scale);

    var px = x;
    if (options.align === 'center') px = x - w / 2;
    else if (options.align === 'right') px = x - w;

    if (options.outline) {
      blit(ctx, t, px - scale, y, scale, options.outline);
      blit(ctx, t, px + scale, y, scale, options.outline);
      blit(ctx, t, px, y - scale, scale, options.outline);
      blit(ctx, t, px, y + scale, scale, options.outline);
    }
    if (options.shadow) {
      blit(ctx, t, px + scale, y + scale, scale, options.shadow);
    }
    blit(ctx, t, px, y, scale, color);
    return w;
  }

  /* ---------------------------------------------------------------------
     Public: break a long string into lines that fit inside maxWidth pixels.
     Returns an array of strings. Words that are too long on their own are
     left on their own line rather than being cut in half.
     --------------------------------------------------------------------- */
  function wrap(text, maxWidth, scale) {
    scale = scale || 1;
    var words = String(text).toUpperCase().split(' ');
    var lines = [];
    var line = '';

    for (var i = 0; i < words.length; i++) {
      var test = line.length === 0 ? words[i] : line + ' ' + words[i];
      if (width(test, scale) <= maxWidth || line.length === 0) {
        line = test;
      } else {
        lines.push(line);
        line = words[i];
      }
    }
    if (line.length > 0) lines.push(line);
    return lines;
  }

  /* Draw wrapped text. Returns the total height that was used so callers can
     position whatever comes next. */
  function drawWrapped(ctx, text, x, y, maxWidth, options) {
    options = options || {};
    var scale = options.scale || 1;
    var lineHeight = (GLYPH_H + 3) * scale;
    var lines = wrap(text, maxWidth, scale);
    var align = options.align || 'left';

    /* When centering, x is the middle of the block; when aligning right, x is
       the right edge. Convert that into a left edge for each individual line. */
    for (var i = 0; i < lines.length; i++) {
      var lx = x;
      if (align === 'center') lx = x - width(lines[i], scale) / 2;
      else if (align === 'right') lx = x - width(lines[i], scale);
      draw(ctx, lines[i], lx, y + i * lineHeight, options);
    }
    return lines.length * lineHeight;
  }

  return {
    GLYPH_W: GLYPH_W,
    GLYPH_H: GLYPH_H,
    width: width,
    height: height,
    draw: draw,
    wrap: wrap,
    drawWrapped: drawWrapped
  };
})();
