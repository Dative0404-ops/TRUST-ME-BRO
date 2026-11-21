/* =========================================================================
   TRUST NOTHING - core/fx.js
   -------------------------------------------------------------------------
   A very small shared particle system ("effects").

   Both the Death Manager and the Trap Manager need to spit out dust, sparks
   and blood, so instead of writing that twice we keep one shared pool of
   particles here. Particles are dumb: position, velocity, gravity, lifetime
   and a colour. They are intentionally simple because there can be a few
   hundred on screen at once.
   ========================================================================= */

TN.FX = (function () {

  /* The live particles. */
  var particles = [];

  /* Hard cap so a bug can never flood memory with particles. */
  var MAX_PARTICLES = 420;

  /* Add a single particle. */
  function add(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({
      x: p.x,
      y: p.y,
      vx: p.vx || 0,
      vy: p.vy || 0,
      gravity: p.gravity === undefined ? 900 : p.gravity,
      life: p.life || 0.5,
      maxLife: p.life || 0.5,
      color: p.color || '#ffffff',
      size: p.size || 2,
      /* How much the particle slows down sideways each second. */
      drag: p.drag === undefined ? 0.06 : p.drag
    });
  }

  /* Throw a round of particles outwards from one point. */
  function burst(x, y, count, options) {
    options = options || {};
    var spread = options.spread === undefined ? 1 : options.spread;
    for (var i = 0; i < count; i++) {
      var angle = options.angle === undefined
        ? Math.random() * Math.PI * 2
        : options.angle + (Math.random() - 0.5) * spread;
      var speed = TN.utils.randRange(options.speedMin || 40, options.speedMax || 180);
      add({
        x: x + TN.utils.randRange(-3, 3),
        y: y + TN.utils.randRange(-3, 3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: options.gravity === undefined ? 900 : options.gravity,
        life: TN.utils.randRange(options.lifeMin || 0.3, options.lifeMax || 0.8),
        color: options.colors
          ? options.colors[TN.utils.randInt(0, options.colors.length - 1)]
          : (options.color || '#ffffff'),
        size: options.size || 2,
        drag: options.drag === undefined ? 0.06 : options.drag
      });
    }
  }

  /* Advance every particle. Called once per fixed physics step. */
  function update(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      /* Exponential drag keeps fast particles from flying off forever. */
      var d = Math.exp(-p.drag * 60 * dt);
      p.vx *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /* Draw every particle. "cam" is the camera so we can convert world
     coordinates into screen coordinates. */
  function draw(ctx, cam) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var sx = p.x - cam.x;
      var sy = p.y - cam.y;
      /* Skip anything clearly off screen. */
      if (sx < -8 || sx > TN.VIEW_W + 8 || sy < -8 || sy > TN.VIEW_H + 8) continue;
      /* Fade out over the last part of the lifetime by shrinking the pixel. */
      var t = p.life / p.maxLife;
      var size = Math.max(1, Math.round(p.size * (t > 0.4 ? 1 : t / 0.4)));
      TN.utils.rect(ctx, sx, sy, size, size, p.color);
    }
  }

  /* Wipe everything, used when the level restarts. */
  function clear() {
    particles.length = 0;
  }

  function count() {
    return particles.length;
  }

  return {
    add: add,
    burst: burst,
    update: update,
    draw: draw,
    clear: clear,
    count: count
  };
})();
