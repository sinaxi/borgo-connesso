/* Timeline animata del soggiorno: vedi css/timeline.css per i colori. */
/* =========================================================================
   COME FUNZIONA
   Timeline "Il soggiorno in 4 passi". Si attiva da sola se trova [data-tl-track] nella pagina.
   1. Lo script dispone i 4 passi lungo uno zigzag a onde SVG
      (destra, curva, sinistra, curva, destra…).
   2. Mentre scorri, "linea di lettura" (CONFIG.focus) = punto dello schermo
      che il percorso deve raggiungere. La curva si disegna fino a lì.
   3. Quando il segnalino supera un cerchio, il cerchio si riempie e il testo compare.
   4. Al passo 4 parte un impulso che ripercorre tutto il tragitto:
      "dall'inizio alla fine è lo stesso soggiorno".
   Con "riduci movimento" attivo nel sistema, mostra tutto già completo.
   ========================================================================= */
(() => {
  const CONFIG = {
    focus: 0.55,     // 0 = bordo alto dello schermo, 1 = bordo basso. Più basso = il percorso "corre avanti"
    smooth: 0.14,    // inerzia del segnalino (0.05 molto lento · 0.3 quasi scattante)
    anticipate: 260, // px di anticipo con cui compare il testo prima che arrivi il segnalino
    pulseMs: 1900    // durata dell'impulso finale
  };

  const root   = document.querySelector('[data-tl-track]');
  if (!root) return;
  const steps  = [...root.querySelectorAll('[data-tl-step]')];
  const svg    = root.querySelector('.tl-track__svg');
  const ghost  = svg.querySelector('.tl-track__ghost');
  const line   = svg.querySelector('.tl-track__line');
  const pulses = [...svg.querySelectorAll('.tl-track__pulse')];
  const dotA   = svg.querySelector('.tl-track__start');
  const dotB   = svg.querySelector('.tl-track__end');
  const marker = svg.querySelector('.tl-track__marker');
  const capA   = root.querySelector('.tl-cap--start');
  const capB   = root.querySelector('.tl-cap--end');
  const capM   = root.querySelector('.tl-cap--mail');
  const plane  = svg.querySelector('.tl-track__plane');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;



  const V = { topOff: 54, nodeUp: 36, gap: 34, pinOff: 38 }  // misure: spazio sopra il testo, altezza del cerchio, respiro tra corsie, posizione del cerchio;
  let total = 0, N = 900, nodeLen = [], aY = [], aL = [], shown = 0, target = 0, raf = 0;
  let completed = false, pulseAnim = [];

  /* Costruisce (e ricostruisce al resize) il percorso a S: una curva continua, senza tratti dritti.
     Parte con un piccolo arco, scende dolcemente a destra, fa una curva alta e tonda, torna a sinistra, e così via.
     Ogni tratto è una curva di Bézier tra due "apici" (destra / sinistra) con tangente verticale: così gli
     estremi sono tondi e il centro di ogni tratto resta quasi piatto.
     1) misura i testi  2) trova l'altezza minima che li lascia liberi  3) posiziona testi e tappe  4) disegna. */
  function build() {
    const W = root.clientWidth, narrow = W < 640, n = steps.length, last = n - 1;
    const pad = narrow ? 12 : 30;               // margine esterno
    const XL = pad, XR = W - pad, S = XR - XL;  // apice sinistro / destro della curva
    const TW = narrow ? 244 : 430;              // larghezza delle schede
    const pinOff = narrow ? 70 : 48;            // distanza della tappa dall'inizio della scheda
    const FLAT = 0.82;                          // 0.5 = onda più inclinata · 0.9 = centro quasi piatto, curve più verticali
    const Y0 = narrow ? 108 : 114;               // altezza del punto di partenza
    const goesRight = i => i % 2 === 0;         // tratti 1,3: sinistra→destra · tratti 2,4: destra→sinistra

    steps.forEach(s => { s.style.width = TW + 'px'; });
    const hs = steps.map(s => s.offsetHeight);

    /* Posizione orizzontale di testi e tappe (la tappa sta nel punto più piatto del tratto). */
    const left = [], px = [];
    steps.forEach((_, i) => {
      if (goesRight(i)) { px[i] = XL + 0.30 * S; left[i] = narrow ? 8 : Math.max(pad, px[i] - pinOff); }
      else { left[i] = W - (narrow ? 8 : pad) - TW; px[i] = left[i] + pinOff; }
    });

    const bz = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
    /* Genera i tratti della curva (4 punti di controllo ciascuno) per una data distanza verticale tra gli apici. */
    function makeSegs(delta) {
      const k = FLAT * delta;
      const P = []; for (let m = 0; m <= n; m++) P.push({ x: m % 2 === 0 ? XL : XR, y: Y0 + m * delta });
      return P.slice(0, n).map((a, i) => {
        const b = P[i + 1];
        const c1 = i === 0 ? { x: a.x + 0.35 * (b.x - a.x), y: a.y - 44 } : { x: a.x, y: a.y + k };   // il primo tratto parte con un arco
        const c2 = i === n - 1 ? { x: b.x + 0.30 * (a.x - b.x), y: b.y - 30 } : { x: b.x, y: b.y - k };// l'ultimo arriva dolce
        return { p: [a, c1, c2, b] };
      });
    }
    const pts = (sg, m = 64) => Array.from({ length: m + 1 }, (_, j) => {
      const t = j / m, [a, b, c, d] = sg.p;
      return { x: bz(a.x, b.x, c.x, d.x, t), y: bz(a.y, b.y, c.y, d.y, t) };
    });
    /* Altezza della curva a una data x (la x è monotona lungo il tratto: bisezione). */
    function yAtX(sg, x) {
      const [a, b, c, d] = sg.p; let lo = 0, hi = 1; const inc = d.x > a.x;
      for (let k = 0; k < 40; k++) { const t = (lo + hi) / 2, xv = bz(a.x, b.x, c.x, d.x, t); ((xv < x) === inc) ? lo = t : hi = t; }
      return bz(a.y, b.y, c.y, d.y, (lo + hi) / 2);
    }

    /* Prova distanze crescenti finché ogni testo sta sotto il suo tratto e sopra il successivo (e il suo perno). */
    let delta = narrow ? 200 : 240, plan;
    for (; delta < 900; delta += 8) {
      const sg = makeSegs(delta), sp = sg.map(s => pts(s));
      const pinY = sg.map((s, i) => yAtX(s, px[i]));
      const textTop = [], bottom = []; let ok = true;
      for (let i = 0; i < n && ok; i++) {
        const inR = q => q.x >= left[i] - 6 && q.x <= left[i] + TW + 6;
        textTop[i] = Math.max(...sp[i].filter(inR).map(q => q.y)) + V.topOff;
        bottom[i] = textTop[i] + hs[i];
        if (i === last) break;
        const next = sp[i + 1].filter(inR);
        if (next.length && Math.min(...next.map(q => q.y)) < bottom[i] + 14) ok = false;
        const overlap = !(px[i + 1] + 36 < left[i] || px[i + 1] - 36 > left[i] + TW);
        if (overlap && pinY[i + 1] - V.nodeUp < bottom[i] + 8) ok = false;
      }
      plan = { sg, pinY, textTop, bottom };
      if (ok) break;
    }
    const { sg, pinY, textTop, bottom } = plan;
    const E = sg[last].p[3], B0 = sg[0].p[0];
    const endX = E.x, endY = E.y;
    const H = Math.max(endY + 205, bottom[last] + 50);
    root.style.height = H + 'px';
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const nodes = steps.map((s, i) => {
      s.style.left = left[i] + 'px';
      s.style.top = textTop[i] + 'px';
      const nd = s.querySelector('.tl-node');
      nd.style.left = (px[i] - left[i]) + 'px';
      nd.style.top = (pinY[i] - textTop[i]) + 'px';
      return { x: px[i], y: pinY[i] };
    });

    let d = `M${B0.x} ${B0.y}`;
    sg.forEach(s => { const [, c1, c2, e] = s.p; d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${e.x} ${e.y}`; });
    [ghost, line, ...pulses].forEach(p => p.setAttribute('d', d));

    total = line.getTotalLength(); line.style.strokeDasharray = total;
    const smp = [];
    for (let i = 0; i <= N; i++) smp.push(line.getPointAtLength(total * i / N));
    /* Lunghezza di percorso a cui si trova ogni tappa = punto della curva più vicino ad essa. */
    nodeLen = nodes.map(p => {
      let best = 0, bd = 1e12;
      smp.forEach((q, i) => { const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (dd < bd) { bd = dd; best = i; } });
      return total * best / N;
    });
    /* Ancore scroll → lunghezza: la rotta avanza in modo proporzionale tra una tappa e la successiva. */
    aY = [Y0 - 150, ...pinY.map(v => v + 30), H - 40];
    aL = [0, ...nodeLen, total];

    const startX = B0.x, startY = B0.y;
    dotA.setAttribute('cx', startX); dotA.setAttribute('cy', startY);
    dotB.setAttribute('cx', endX);   dotB.setAttribute('cy', endY);
    capA.style.left = startX + 'px'; capA.style.top = startY + 'px';
    capB.style.left = endX + 'px';   capB.style.top = endY + 'px';
    capM.style.left = startX + 'px'; capM.style.top = startY + 'px';   // busta sotto il pallino di partenza
    steps.forEach((s, i) => s.style.setProperty('--pd', (nodeLen[i] / total * CONFIG.pulseMs / 1000).toFixed(2) + 's'));
  }

  /* Dove deve arrivare la rotta, in base allo scroll. */
  function computeTarget() {
    const de = document.documentElement;
    if (innerHeight + scrollY >= de.scrollHeight - 2) return total;   // fondo pagina: rotta completa
    const fy = innerHeight * CONFIG.focus - root.getBoundingClientRect().top;
    if (fy <= aY[0]) return 0;
    for (let i = 1; i < aY.length; i++)
      if (fy <= aY[i]) return aL[i - 1] + (aL[i] - aL[i - 1]) * (fy - aY[i - 1]) / (aY[i] - aY[i - 1]);
    return total;
  }

  function runPulse() {
    pulseAnim.forEach(a => a.cancel());
    pulseAnim = pulses.map((p, i) => {
      const seg = total * 0.16;
      p.style.strokeDasharray = `${seg} ${total}`;
      return p.animate(
        [{ strokeDashoffset: seg, opacity: 1 }, { strokeDashoffset: -total, opacity: 1 }],
        { duration: CONFIG.pulseMs, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'none' });
    });
  }

  function paint() {
    line.style.strokeDashoffset = total - shown;
    const p = line.getPointAtLength(shown);
    marker.setAttribute('transform', `translate(${p.x} ${p.y})`);

    /* Dal "Primo contatto" al cerchio 01 il cursore è l'aeroplanino, orientato come la linea. */
    const flying = shown > 4 && shown < nodeLen[0];
    root.classList.toggle('tl-is-flying', flying);
    if (flying) {
      const pa = line.getPointAtLength(Math.max(shown - 4, 0)), pb = line.getPointAtLength(shown + 4);
      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI;
      plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang.toFixed(1)})`);
    }

    steps.forEach((s, i) => {
      s.classList.toggle('tl-is-reached', shown >= nodeLen[i] - 8);
      if (shown + CONFIG.anticipate >= nodeLen[i]) s.classList.add('tl-is-seen');
    });

    const last = nodeLen.length - 1;
    const done = shown >= nodeLen[last] - 8;
    if (done && !completed) { completed = true; root.classList.add('tl-is-complete'); if (!reduce) runPulse(); }
    if (!done && completed && shown < nodeLen[last] - 260) { completed = false; root.classList.remove('tl-is-complete'); }
    root.classList.toggle('tl-is-started', shown > 4);
    root.classList.toggle('tl-is-end', shown >= total - 6);
  }

  function frame() {
    raf = 0;
    const diff = target - shown;
    shown = Math.abs(diff) < 0.4 ? target : shown + diff * CONFIG.smooth;
    paint();
    if (shown !== target) raf = requestAnimationFrame(frame);
  }
  function update() { target = computeTarget(); if (!raf) raf = requestAnimationFrame(frame); }

  /* ----- Avvio ----- */
  function init() {
    build();
    if (reduce) {
      root.classList.add('tl-is-static');
      target = shown = total;
      steps.forEach(s => s.classList.add('tl-is-seen'));
      paint();
    } else {
      target = shown = computeTarget();
      paint();
    }
  }
  init();

  if (!reduce) {
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', () => { build(); update(); });
  }
  /* Se i font arrivano dopo, le altezze cambiano: ricostruisci il percorso. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { build(); reduce ? paint() : update(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { build(); reduce ? paint() : update(); }).observe(root);
})();
