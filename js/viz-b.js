/* Guide du Vibe Coding : visualisations des chapitres 18 à 34.
   Contrat : docs/CONTRAT-VIZ.md. Aucune dépendance, classes préfixées vz-. */
(function () {
  'use strict';

  const VIZ = (window.VIZ = window.VIZ || {});
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TARIF = 'à vérifier, tarifs de septembre 2026';

  /* ---------- Helpers DOM ---------- */

  function setProps(el, p) {
    if (!p) return;
    for (const k in p) {
      const v = p[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.slice(0, 2) === '--') el.style.setProperty(sk, String(v[sk])); else el.style[sk] = v[sk]; } }
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  function add(el, ...kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false || k === '') continue;
      el.appendChild(typeof k === 'object' ? k : document.createTextNode(String(k)));
    }
    return el;
  }
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    setProps(el, props);
    return add(el, kids);
  }
  function sv(tag, props, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    setProps(el, props);
    return add(el, kids);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function canMove() {
    try { return window.matchMedia('(prefers-reduced-motion: no-preference)').matches; }
    catch (e) { return false; }
  }
  /* Déclenche cb une seule fois quand el entre dans l'écran. */
  function whenVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
    }, { threshold: 0.25 });
    io.observe(el);
  }
  function root(el, name, ctx) {
    el.classList.add('vz-b', 'vz-' + name);
    if (ctx && ctx.print) el.classList.add('vz-b--print');
    return el;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Nombres ---------- */

  const NF = {};
  function fmt(n, d = 0) {
    const key = d;
    if (!NF[key]) NF[key] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
    return NF[key].format(n);
  }
  const eur = (n, d = 0) => fmt(n, d) + ' €';
  const usd = (n, d = 0) => fmt(n, d) + ' $';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Composants ---------- */

  function kicker(text, extra) {
    return h('p', { class: 'vz-b-kicker' + (extra ? ' ' + extra : '') }, text);
  }
  function note(text, extra) {
    return h('p', { class: 'vz-b-note' + (extra ? ' ' + extra : '') }, text);
  }
  function btn(label, onclick, opts = {}) {
    return h('button', {
      type: 'button',
      class: 'vz-b-btn' + (opts.primary ? ' vz-b-btn--primary' : '') + (opts.small ? ' vz-b-btn--small' : '') + (opts.cls ? ' ' + opts.cls : ''),
      onclick, 'aria-label': opts.aria, title: opts.title, disabled: opts.disabled
    }, label);
  }
  /* Groupe de boutons à choix unique (aria-pressed). */
  function seg(options, current, onChange, label, cls) {
    const g = h('div', { class: 'vz-b-seg' + (cls ? ' ' + cls : ''), role: 'group', 'aria-label': label });
    const bs = options.map((o) => {
      const b = h('button', { type: 'button', class: 'vz-b-seg-btn', 'aria-pressed': String(o.value === current) }, o.label);
      b.addEventListener('click', () => {
        bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        onChange(o.value);
      });
      return b;
    });
    add(g, bs);
    g.set = (v) => bs.forEach((x, i) => x.setAttribute('aria-pressed', String(options[i].value === v)));
    return g;
  }
  function chip(label, pressed, onToggle, extra) {
    const b = h('button', { type: 'button', class: 'vz-b-chip' + (extra ? ' ' + extra : ''), 'aria-pressed': String(!!pressed) }, label);
    b.addEventListener('click', () => {
      const v = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(v));
      onToggle(v, b);
    });
    return b;
  }
  /* Curseur avec sortie lisible. */
  function range(o) {
    const out = h('output', { class: 'vz-b-range-out' });
    const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, class: 'vz-b-range-input' });
    const show = () => {
      const v = Number(input.value);
      const t = o.format ? o.format(v) : String(v);
      out.textContent = t;
      input.setAttribute('aria-valuetext', t);
    };
    input.addEventListener('input', () => { show(); o.onInput && o.onInput(Number(input.value)); });
    show();
    const lab = h('label', { class: 'vz-b-range' },
      h('span', { class: 'vz-b-range-head' }, h('span', { class: 'vz-b-range-label' }, o.label), out),
      input);
    lab.input = input;
    lab.refresh = show;
    return lab;
  }
  /* Champ numérique modifiable (prix, quotas). */
  function numIn(o) {
    const input = h('input', { type: 'number', inputmode: 'decimal', value: o.value, step: o.step || 'any', min: o.min != null ? o.min : 0, class: 'vz-b-num-input', 'aria-label': o.aria || o.label });
    input.addEventListener('input', () => {
      const v = parseFloat(String(input.value).replace(',', '.'));
      if (!isNaN(v)) o.onInput(v);
    });
    return h('label', { class: 'vz-b-num' + (o.cls ? ' ' + o.cls : '') },
      h('span', { class: 'vz-b-num-label' }, o.label),
      h('span', { class: 'vz-b-num-field' }, input, o.unit ? h('span', { class: 'vz-b-num-unit' }, o.unit) : null));
  }
  function copier(ctx, text, b) {
    if (ctx && typeof ctx.copier === 'function') return ctx.copier(text, b);
    try { navigator.clipboard.writeText(text); } catch (e) { /* sans presse-papiers */ }
  }
  function promptBlock(ctx, text) {
    if (ctx && typeof ctx.prompt === 'function') {
      const p = ctx.prompt(text);
      if (p) return p;
    }
    return h('pre', { class: 'vz-b-pre' }, text);
  }
  /* Onglets accessibles ; en impression, toutes les sections l'une sous l'autre. */
  function tabbed(host, ctx, defs, label) {
    if (ctx.print) {
      defs.forEach((d) => {
        const sec = h('section', { class: 'vz-b-printsec' }, kicker(d.label));
        host.appendChild(sec);
        d.render(sec);
      });
      return;
    }
    const list = h('div', { class: 'vz-b-tabs', role: 'tablist', 'aria-label': label });
    const panels = [];
    const tabs = defs.map((d, i) => {
      const t = h('button', { type: 'button', role: 'tab', class: 'vz-b-tab', 'aria-selected': String(i === 0), tabindex: i === 0 ? '0' : '-1' },
        h('span', { class: 'vz-b-tab-num' }, String(i + 1).padStart(2, '0')), h('span', null, d.label));
      const p = h('div', { role: 'tabpanel', class: 'vz-b-panel' });
      if (i !== 0) p.hidden = true;
      panels.push(p);
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const j = (i + (e.key === 'ArrowRight' ? 1 : defs.length - 1)) % defs.length;
          select(j); tabs[j].focus();
        }
      });
      return t;
    });
    const rendered = new Set();
    function select(i) {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = i !== j; });
      if (!rendered.has(i)) { rendered.add(i); defs[i].render(panels[i]); }
    }
    add(list, tabs);
    add(host, list, panels);
    rendered.add(0); defs[0].render(panels[0]);
  }
  /* Petite icône pixel (grille 8x8) dessinée en SVG. */
  function pixIcon(rows, color, size) {
    const s = sv('svg', { viewBox: '0 0 8 8', width: size || 16, height: size || 16, class: 'vz-b-pix', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' });
    rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c !== '.') s.appendChild(sv('rect', { x, y, width: 1, height: 1, fill: color || 'currentColor' })); }));
    return s;
  }
  const PIX = {
    check: ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
    cross: ['........', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '........', '........'],
    key: ['........', '.###....', '#...#...', '#...####', '#...#.#.', '.###..#.', '........', '........'],
    lock: ['..####..', '.#....#.', '.#....#.', '########', '###..###', '###..###', '########', '........'],
    bell: ['...##...', '..####..', '.######.', '.######.', '.######.', '########', '...##...', '........'],
    star: ['...#....', '...#....', '.#####..', '..###...', '..#.#...', '.#...#..', '........', '........'],
    hand: ['.#.#.#..', '.#.#.#..', '.#####.#', '.######.', '.#####..', '..####..', '..###...', '........'],
    robot: ['..####..', '.#....#.', '.#.##.#.', '.#....#.', '..####..', '.######.', '.#.##.#.', '........']
  };

  /* ================= ch18 : L'enquête ================= */

  const C18_SYMPTOMES = [
    { vu: 'L’IA annonce « corrigé », rien ne change', cause: 'Elle devine sans voir l’erreur', geste: 'Faites ajouter des traces dans la console, reproduisez le bug, donnez-lui ce qui s’affiche.' },
    { vu: 'Une fonction qui marchait a disparu', cause: 'Elle a réécrit tout un fichier pour une retouche', geste: 'Revenez à la version précédente, redemandez avec « ne modifie que [tel élément] ».' },
    { vu: 'Elle oublie des consignes données plus tôt', cause: 'La conversation déborde de sa fenêtre de contexte', geste: 'Nouvelle conversation avec un résumé de passation ; dans Claude Code, /compact ou /clear.' },
    { vu: 'Chaque correction crée deux bugs', cause: 'Demande trop grosse ou zone fragile', geste: 'Retour à la dernière version saine, puis une petite demande par message.' },
    { vu: 'Elle se contredit d’un message à l’autre', cause: 'Elle ignore la cause et tente au hasard', geste: 'Mode Plan dans Lovable ou dans Claude Code : elle enquête sans rien modifier.' },
    { vu: 'Rien de tout cela ne marche', cause: 'L’outil est à court d’idées', geste: 'Second avis dans une conversation Claude neuve, puis un humain.' }
  ];
  const C18_ERREURS = [
    { id: 'blanche', msg: 'Page blanche, sans message', re: /page blanche|blank|écran blanc|rien ne s.affiche/i, sens: 'Une erreur a bloqué l’affichage ; elle est écrite dans la console.', faire: 'Donnez la première ligne rouge à l’IA.' },
    { id: '401', msg: '401 Unauthorized', re: /401|unauthori[sz]ed/i, sens: 'L’application ne sait pas qui vous êtes : pas connecté, session expirée ou clé absente.', faire: 'Reconnectez-vous ; sinon, faites vérifier l’identification.' },
    { id: '403', msg: '403 Forbidden', re: /403|forbidden/i, sens: 'Elle sait qui vous êtes et vous refuse l’action.', faire: 'Vérifiez avec quel compte vous testez ; demandez quelle règle bloque.' },
    { id: 'rls', msg: 'permission denied / violates row-level security policy', re: /permission denied|row.level security|rls/i, sens: 'La RLS refuse l’opération.', faire: 'Demandez une règle précise, jamais la suppression de la RLS.', alerte: true },
    { id: 'build', msg: 'Build failed', re: /build failed|failed to compile|build error/i, sens: 'Le code ne peut pas être assemblé.', faire: 'Les premières lignes désignent le fichier fautif.' },
    { id: 'module', msg: 'Module not found', re: /module not found|cannot find module|failed to resolve import/i, sens: 'Une bibliothèque manque, ou un fichier est appelé à la mauvaise adresse.', faire: 'Le message tel quel à l’IA ; en local, installez les dépendances.' },
    { id: 'window', msg: 'window is not defined', re: /window is not defined|document is not defined/i, sens: 'Sur un projet TanStack Start, du code prévu pour le navigateur s’exécute sur le serveur.', faire: 'Signalez-le tel quel, en précisant la page concernée.' }
  ];
  const C18_EXEMPLE = {
    fait: 'Connecté comme relecteur, j’ai commenté le chapitre 9',
    attendu: 'Voir mon commentaire dans la liste',
    obtenu: 'La liste est restée vide après rechargement',
    message: ''
  };

  function c18Decrire(panel, ctx) {
    const champs = [
      { k: 'fait', court: 'Action', label: 'Ce que j’ai fait', ph: 'Connecté comme…, j’ai…' },
      { k: 'attendu', court: 'Attente', label: 'Ce que j’attendais', ph: 'Voir…' },
      { k: 'obtenu', court: 'Résultat', label: 'Ce qui s’est passé', ph: 'La liste est restée vide…' },
      { k: 'message', court: 'Message exact', label: 'Message d’erreur exact', ph: 'Collez le texte, pas une capture' }
    ];
    const val = { fait: '', attendu: '', obtenu: '', message: '' };
    if (ctx.print) {
      add(panel, h('dl', { class: 'vz-enq-pdl' }, champs.map((c) => [h('dt', null, c.label), h('dd', null, c.k === 'message' ? 'le texte exact, copié depuis la console ou Logs, jamais une clé' : C18_EXEMPLE[c.k])])));
      return;
    }
    const meter = h('div', { class: 'vz-enq-meter', 'aria-hidden': 'true' }, champs.map((c) => h('span', { class: 'vz-enq-meter-seg', dataset: { k: c.k } }, c.court)));
    const verdict = h('p', { class: 'vz-enq-verdict', 'aria-live': 'polite' });
    const alerte = h('p', { class: 'vz-b-alert', hidden: true }, 'Une clé secrète semble collée ici : retirez-la. On donne le message, jamais une clé.');
    const promptHost = h('div', { class: 'vz-enq-prompt' });
    const inputs = {};
    const form = h('div', { class: 'vz-enq-form' }, champs.map((c) => {
      const ta = h('textarea', { rows: 2, class: 'vz-b-textarea', placeholder: c.ph, 'aria-label': c.label });
      ta.value = val[c.k];
      ta.readOnly = !!ctx.print;
      ta.addEventListener('input', () => { val[c.k] = ta.value; update(); });
      inputs[c.k] = ta;
      return h('label', { class: 'vz-enq-field' }, h('span', { class: 'vz-enq-field-label' }, c.label), ta);
    }));
    let timer = null;
    function update() {
      const n = champs.filter((c) => val[c.k].trim().length > 3).length;
      meter.querySelectorAll('.vz-enq-meter-seg').forEach((s) => s.classList.toggle('vz-is-on', val[s.dataset.k].trim().length > 3));
      verdict.textContent = n === 0 ? 'Remplissez les trois parties, puis le message exact.'
        : n < 3 ? '« Ça ne marche pas » tient encore du soupir : il manque ' + (3 - Math.min(n, 3)) + ' partie' + (3 - n > 1 ? 's' : '') + '.'
        : n === 3 ? 'C’est un signalement. Ajoutez le message d’erreur exact, copié en texte.'
        : 'Signalement complet : action, attente, résultat, message exact.';
      verdict.dataset.niveau = String(n);
      alerte.hidden = !/(sk_live|sk_test|sk-ant|sb_secret|service_role|re_[A-Za-z0-9]{6})/.test(Object.values(val).join(' '));
      clearTimeout(timer);
      timer = setTimeout(renderPrompt, ctx.print ? 0 : 250);
    }
    function renderPrompt() {
      const f = (s, d) => (s.trim() ? s.trim() : d);
      const txt = 'Voici un bug dans L’Atelier. Ce que j’ai fait : ' + f(val.fait, '[action]') + '. Ce que j’attendais : ' + f(val.attendu, '[attente]') +
        '. Ce qui s’est passé : ' + f(val.obtenu, '[résultat]') + '. Message d’erreur exact : ' + f(val.message, '[collez-le]') +
        '.\n\nAvant de corriger quoi que ce soit, explique-moi en français simple la cause profonde, montre-moi le code ou la règle concernés et propose une correction. N’applique rien tant que je n’ai pas validé.';
      clear(promptHost).appendChild(ctx.print ? h('pre', { class: 'vz-b-pre' }, txt) : promptBlock(ctx, txt));
    }
    const actions = ctx.print ? null : h('div', { class: 'vz-b-row' },
      btn('Exemple du livre', () => { Object.assign(val, C18_EXEMPLE); champs.forEach((c) => { inputs[c.k].value = val[c.k]; }); update(); }, { small: true }),
      btn('Effacer', () => { champs.forEach((c) => { val[c.k] = ''; inputs[c.k].value = ''; }); update(); }, { small: true }));
    add(panel, h('div', { class: 'vz-enq-decrire' },
      h('div', null, form, actions),
      h('div', { class: 'vz-enq-side' }, kicker('Qualité du signalement'), meter, verdict, alerte)),
    ctx.print ? null : kicker('Le prompt « Chercher la cause avant la correction »'), ctx.print ? null : promptHost);
    update();
  }

  function c18Echecs(panel, ctx) {
    let echecs = ctx.print ? 2 : 0;
    let choix = ctx.print ? -1 : 0;
    const track = h('ol', { class: 'vz-enq-track', 'aria-label': 'Tentatives sur le même problème' });
    const etat = h('p', { class: 'vz-enq-etat', 'aria-live': 'polite' });
    const res = h('div', { class: 'vz-enq-result', 'aria-live': 'polite' });
    const sympt = h('div', { class: 'vz-enq-sympt', role: 'group', 'aria-label': 'Ce que vous voyez' });
    function drawTrack() {
      clear(track);
      ['Essai 1', 'Essai 2', 'Changer de geste'].forEach((t, i) => {
        const st = i < 2 ? (echecs > i ? 'fail' : 'idle') : (echecs >= 2 ? 'switch' : 'idle');
        track.appendChild(h('li', { class: 'vz-enq-node vz-is-' + st },
          h('span', { class: 'vz-enq-dot', 'aria-hidden': 'true' }, st === 'fail' ? pixIcon(PIX.cross, 'currentColor', 14) : st === 'switch' ? '↺' : String(i + 1)),
          h('span', { class: 'vz-enq-node-label' }, t + (st === 'fail' ? ' : échec' : ''))));
      });
      etat.textContent = echecs === 0 ? 'Une correction proposée par l’IA, un essai. Cliquez si elle échoue.'
        : echecs === 1 ? 'Un échec. On peut réessayer une fois, pas davantage.'
        : 'Deux échecs sur le même problème : on change de geste. Choisissez ce que vous voyez.';
      panel.classList.toggle('vz-enq-switch', echecs >= 2);
    }
    const sbtns = C18_SYMPTOMES.map((s, i) => {
      const b = h('button', { type: 'button', class: 'vz-enq-sbtn', 'aria-pressed': String(i === choix) }, s.vu);
      b.addEventListener('click', () => { choix = i; drawSympt(); drawRes(); });
      return b;
    });
    add(sympt, sbtns);
    function drawSympt() {
      sbtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === choix)));
    }
    function drawRes() {
      const s = C18_SYMPTOMES[choix];
      clear(res);
      if (!s) return;
      add(res,
        h('div', { class: 'vz-enq-res-row' }, h('span', { class: 'vz-enq-res-k' }, 'Cause probable'), h('span', null, s.cause)),
        h('div', { class: 'vz-enq-res-row vz-enq-res-geste' }, h('span', { class: 'vz-enq-res-k' }, 'Le geste'), h('span', null, s.geste)));
    }
    if (ctx.print) {
      drawTrack();
      add(panel, track, etat, h('table', { class: 'vz-b-table' },
        h('thead', null, h('tr', null, h('th', null, 'Ce que vous voyez'), h('th', null, 'Cause probable'), h('th', null, 'Le geste'))),
        h('tbody', null, C18_SYMPTOMES.map((s) => h('tr', null, h('td', null, s.vu), h('td', null, s.cause), h('td', null, s.geste))))));
      return;
    }
    const controls = h('div', { class: 'vz-b-row' },
      btn('La correction a échoué', () => { echecs = Math.min(2, echecs + 1); drawTrack(); }, { primary: true }),
      btn('Recommencer', () => { echecs = 0; drawTrack(); }, { small: true }));
    add(panel, track, etat, controls,
      h('div', { class: 'vz-enq-tree' }, h('div', null, kicker('Ce que vous voyez'), sympt), h('div', null, kicker('Diagnostic'), res)),
      note('Appelez un humain quand le problème touche aux paiements, aux données personnelles ou aux droits d’accès : une heure de développeur coûte moins qu’une semaine de crédits en boucle.'));
    drawTrack(); drawSympt(); drawRes();
  }

  function c18Decoder(panel, ctx) {
    if (ctx.print) {
      add(panel, h('table', { class: 'vz-b-table' },
        h('thead', null, h('tr', null, h('th', null, 'Message ou symptôme'), h('th', null, 'Ce que ça veut dire'), h('th', null, 'Quoi faire'))),
        h('tbody', null, C18_ERREURS.map((e) => h('tr', null, h('td', null, h('code', null, e.msg)), h('td', null, e.sens), h('td', null, e.faire))))),
      h('p', { class: 'vz-b-alert' }, 'Ne jamais « réparer » la sécurité en l’enlevant : le bon correctif ajoute une règle.'));
      return;
    }
    let sel = null;
    const out = h('div', { class: 'vz-enq-decode', 'aria-live': 'polite' });
    const input = h('input', { type: 'text', class: 'vz-b-input vz-enq-paste', placeholder: 'Collez ici un message, par exemple : new row violates row-level security policy', 'aria-label': 'Message d’erreur à décoder' });
    const chips = h('div', { class: 'vz-b-chips' }, C18_ERREURS.map((e) => {
      const b = h('button', { type: 'button', class: 'vz-b-chip vz-enq-code', 'aria-pressed': 'false' }, e.msg);
      b.addEventListener('click', () => { input.value = ''; show(e); });
      e.btn = b;
      return b;
    }));
    function show(e) {
      sel = e;
      C18_ERREURS.forEach((x) => x.btn.setAttribute('aria-pressed', String(x === e)));
      clear(out);
      if (!e) {
        if (input.value.trim()) add(out, h('p', { class: 'vz-enq-decode-none' }, 'Message inconnu du décodeur : donnez-le tel quel à l’IA, avec ce que vous faisiez juste avant.'));
        return;
      }
      add(out,
        h('p', { class: 'vz-enq-decode-msg' }, h('code', null, e.msg)),
        h('div', { class: 'vz-enq-res-row' }, h('span', { class: 'vz-enq-res-k' }, 'Ce que ça veut dire'), h('span', null, e.sens)),
        h('div', { class: 'vz-enq-res-row vz-enq-res-geste' }, h('span', { class: 'vz-enq-res-k' }, 'Quoi faire'), h('span', null, e.faire)),
        e.alerte ? h('p', { class: 'vz-b-alert' }, 'Si l’IA propose de désactiver la RLS, une règle qui laisse tout passer ou une clé qui contourne tout : refusez. L’erreur disparaît, la protection aussi.') : null);
    }
    input.addEventListener('input', () => {
      const v = input.value;
      show(v.trim() ? C18_ERREURS.find((e) => e.re.test(v)) || null : null);
    });
    add(panel, input, chips, out);
    show(C18_ERREURS[3]);
  }

  VIZ['ch18-enquete'] = {
    chapitre: 'ch18',
    titre: 'L’enquête',
    consigne: 'Décrivez le bug, comptez les échecs, puis décodez le message d’erreur.',
    ancre: 'La règle des deux échecs',
    render(el, ctx) {
      root(el, 'enquete', ctx);
      tabbed(el, ctx, [
        { label: 'Décrire', render: (p) => c18Decrire(p, ctx) },
        { label: 'Deux échecs', render: (p) => c18Echecs(p, ctx) },
        { label: 'Décoder', render: (p) => c18Decoder(p, ctx) }
      ], 'Étapes de l’enquête');
    }
  };

  /* ================= ch19 : L'escalier de l'autonomie ================= */

  const C19_MARCHES = [
    { n: 1, court: 'Règles', nom: 'Règles : Knowledge, AGENTS.md, skills', reprend: 'Les consignes que suit l’agent', assume: 'Tenir ces consignes à jour : elles deviennent les vôtres.', cout: 0, coutTxt: 'Gratuit à configurer', retour: 'Facile' },
    { n: 2, court: 'GitHub', nom: 'GitHub', reprend: 'Une copie du code hors de Lovable', assume: 'Savoir quel dépôt est relié : une reconnexion crée un nouveau dépôt.', cout: 0, coutTxt: 'Gratuit', retour: 'Facile' },
    { n: 3, court: 'Resend', nom: 'E-mails avec Resend', reprend: 'L’expéditeur, les modèles, les statistiques d’envoi', assume: 'Vérifier le domaine d’envoi et surveiller rebonds et indésirables.', cout: 0, coutTxt: 'Gratuit jusqu’à 3 000 e-mails par mois, puis 20 $', retour: 'Facile' },
    { n: 4, court: 'Clé Anthropic', nom: 'Clé Anthropic', reprend: 'Le choix du modèle et sa facture', assume: 'Qui a sa clé Anthropic surveille sa facture et règle son plafond.', cout: 0, coutTxt: 'Selon l’usage : saisissez votre estimation', retour: 'Facile' },
    { n: 5, court: 'Local', nom: 'Travail en local avec Claude Code', reprend: 'Le code, ligne par ligne', assume: 'En local, on touche les vraies données ; jamais de travail des deux côtés à la fois.', cout: 20, coutTxt: 'Inclus dans l’offre Pro de Claude, 20 $ par mois', retour: 'Facile' },
    { n: 6, court: 'Supabase', nom: 'Supabase à soi', reprend: 'La base, les comptes, les fichiers', assume: 'Qui a son propre Supabase gère ses sauvegardes. Aucune bascule en un clic.', cout: 25, coutTxt: 'À partir de 25 $ par mois, plus options', retour: 'Difficile' },
    { n: 7, court: 'Hébergement', nom: 'Hébergement indépendant', reprend: 'La mise en ligne', assume: 'Qui héberge ailleurs surveille ses déploiements ; une seule adresse de production.', cout: 0, coutTxt: '0 à 20 $ par mois', retour: 'Moyen' }
  ];
  const C19_PROFILS = {
    vous: { label: 'Votre projet', montees: [], txt: 'Montez d’abord les marches gratuites qui se redescendent sans effort. On peut s’arrêter sur n’importe quel palier.' },
    atelier: { label: 'L’Atelier', montees: [1, 2, 3, 4], txt: 'Les quatre premières marches sont montées dès sa construction. Outil interne d’une dizaine de relecteurs : il reste sur Lovable Cloud.' },
    saas: { label: 'Le SaaS', montees: [1, 2, 3, 4, 5, 6], txt: 'Données de clients payants : il démarre sur un Supabase à soi, en région Paris, relié à Lovable dès le premier jour.' }
  };

  VIZ['ch19-escalier'] = {
    chapitre: 'ch19',
    titre: 'L’escalier de l’autonomie',
    consigne: 'Choisissez une marche : ce que vous reprenez, ce que vous assumez, ce que cela coûte.',
    ancre: 'Marche 5 : travailler en local',
    render(el, ctx) {
      root(el, 'escalier', ctx);
      const couts = C19_MARCHES.map((m) => m.cout);
      let sel = ctx.print ? 6 : 4;
      let profil = 'vous';

      const stairs = h('div', { class: 'vz-esc-stairs', role: ctx.print ? null : 'group', 'aria-label': 'Les sept marches' });
      const climber = h('div', { class: 'vz-esc-climber', 'aria-hidden': 'true' }, pixIcon(['..##....', '..##....', '.####...', '#.##.#..', '..##....', '.#..#...', '.#..#...', '........'], 'currentColor', 26));
      const steps = C19_MARCHES.map((m, i) => {
        const tag = ctx.print ? 'div' : 'button';
        const b = h(tag, {
          type: ctx.print ? null : 'button',
          class: 'vz-esc-step vz-is-' + m.retour.toLowerCase(),
          style: { '--i': i },
          'aria-pressed': ctx.print ? null : String(i === sel),
          'aria-label': ctx.print ? null : 'Marche ' + m.n + ' : ' + m.nom + ', retour en arrière ' + m.retour.toLowerCase()
        },
        h('span', { class: 'vz-esc-step-badge', 'aria-hidden': 'true' }, 'montée'),
        h('span', { class: 'vz-esc-step-n' }, String(m.n)),
        h('span', { class: 'vz-esc-step-label' }, m.court));
        if (!ctx.print) b.addEventListener('click', () => { sel = i; update(); });
        return b;
      });
      add(stairs, steps, climber);

      const legend = h('div', { class: 'vz-esc-legend', 'aria-hidden': 'true' },
        ['Facile', 'Moyen', 'Difficile'].map((r) => h('span', { class: 'vz-esc-leg vz-is-' + r.toLowerCase() }, 'Retour ' + r.toLowerCase())));

      const detail = h('div', { class: 'vz-esc-detail', 'aria-live': 'polite' });
      const total = h('div', { class: 'vz-esc-total' });

      function update() {
        steps.forEach((s, i) => {
          if (!ctx.print) s.setAttribute('aria-pressed', String(i === sel));
          s.classList.toggle('vz-is-below', i <= sel);
          s.classList.toggle('vz-is-montee', C19_PROFILS[profil].montees.includes(i + 1));
        });
        climber.style.setProperty('--i', sel);
        const m = C19_MARCHES[sel];
        clear(detail);
        add(detail,
          h('div', { class: 'vz-esc-detail-head' },
            h('span', { class: 'vz-esc-detail-n' }, 'Marche ' + m.n),
            h('strong', { class: 'vz-esc-detail-nom' }, m.nom),
            h('span', { class: 'vz-esc-badge vz-is-' + m.retour.toLowerCase() }, 'Retour ' + m.retour.toLowerCase())),
          h('div', { class: 'vz-esc-cols' },
            h('div', null, kicker('Ce que vous reprenez'), h('p', null, m.reprend)),
            h('div', null, kicker('Ce que vous assumez'), h('p', null, m.assume)),
            h('div', null, kicker('Coût indicatif'), h('p', { class: 'vz-esc-couttxt' }, m.coutTxt),
              ctx.print ? null : numIn({ label: 'Votre chiffre', value: couts[sel], step: 1, unit: '$ / mois', onInput: (v) => { couts[sel] = v; drawTotal(); } }))));
        drawTotal();
      }
      function drawTotal() {
        const cum = couts.slice(0, sel + 1).reduce((a, b) => a + b, 0);
        const max = Math.max(1, couts.reduce((a, b) => a + b, 0));
        clear(total);
        add(total,
          h('div', { class: 'vz-esc-total-head' }, h('span', null, 'Jusqu’à la marche ' + (sel + 1)), h('strong', null, usd(cum) + ' / mois' + (sel >= 3 ? ' + usage de l’API' : ''))),
          h('div', { class: 'vz-esc-bar', 'aria-hidden': 'true' }, couts.map((c, i) => h('span', { class: 'vz-esc-bar-seg' + (i <= sel ? ' vz-is-on' : ''), style: { flexGrow: Math.max(c, max * 0.02) } }))),
          note('Coûts du tableau du chapitre, ' + TARIF + '. Chaque marche transfère aussi une responsabilité : sauvegardes, facture et surveillance deviennent les vôtres.'));
      }

      const profils = ctx.print ? null : seg(Object.keys(C19_PROFILS).map((k) => ({ value: k, label: C19_PROFILS[k].label })), profil, (v) => { profil = v; profTxt.textContent = C19_PROFILS[v].txt; update(); }, 'Profil de projet');
      const profTxt = h('p', { class: 'vz-esc-proftxt' }, C19_PROFILS[profil].txt);

      if (ctx.print) {
        profil = 'atelier';
        add(el, h('div', { class: 'vz-esc-scene' }, stairs), legend,
          h('table', { class: 'vz-b-table' },
            h('thead', null, h('tr', null, h('th', null, 'Marche'), h('th', null, 'Ce que vous reprenez'), h('th', null, 'Coût indicatif'), h('th', null, 'Retour'))),
            h('tbody', null, C19_MARCHES.map((m) => h('tr', null, h('td', null, m.n + '. ' + m.nom), h('td', null, m.reprend), h('td', null, m.coutTxt), h('td', null, m.retour))))),
          note('« montée » : marches déjà montées par L’Atelier. Coûts ' + TARIF + '. Même en haut de l’escalier, l’éditeur et son agent restent chez Lovable.'));
        update();
        return;
      }
      add(el, h('div', { class: 'vz-b-row vz-esc-top' }, profils), profTxt,
        h('div', { class: 'vz-esc-scene' }, stairs), legend, detail, total,
        note('Ce qui ne se reprend pas : même en haut de l’escalier, l’éditeur de Lovable et son agent restent chez Lovable.'));
      update();
      if (canMove()) {
        el.classList.add('vz-esc-pre');
        whenVisible(el, () => requestAnimationFrame(() => el.classList.remove('vz-esc-pre')));
      }
    }
  };

  /* ================= ch20 : Une question à chaque porte ================= */

  const C20_PORTES = [
    { court: 'Navigateur', nom: 'L’interface dans le navigateur', qui: 'Tout le monde, y compris un curieux', serrure: 'Aucune : tout ce qui est dans le navigateur est lisible', ex: 'Code, clés publiques et variables VITE_ s’y lisent. Une clé secrète (service_role, sb_secret_…, sk_live_…, re_…) n’y va jamais.', ouverte: true },
    { court: 'Base de données', nom: 'La base de données', qui: 'L’application, avec la clé publique', serrure: 'Les règles RLS de chaque table', ex: 'Un relecteur ne modifie que ses commentaires : une règle pour chaque opération.' },
    { court: 'Stockage', nom: 'Le stockage des captures', qui: 'L’application', serrure: 'Les règles propres au stockage', ex: 'L’adresse d’une capture ouverte dans une fenêtre privée, sans être connecté, ne doit rien afficher.' },
    { court: 'Fonctions serveur', nom: 'Les fonctions serveur (relecture Claude)', qui: 'Quiconque connaît leur adresse', serrure: 'La vérification de l’utilisateur connecté, dans la fonction', ex: 'La fonction de relecture refuse les appels anonymes et applique son quota mensuel.' },
    { court: 'Secrets', nom: 'Les secrets (clé Anthropic, clé Resend)', qui: 'Les fonctions serveur seulement', serrure: 'Le coffre des Secrets de Lovable Cloud', ex: 'Jamais dans le code, jamais dans le chat : seulement dans le coffre.' },
    { court: 'Vos comptes', nom: 'Vos comptes (Lovable, GitHub, Anthropic, registrar)', qui: 'Vous, et quiconque vole votre mot de passe', serrure: 'La double authentification', ex: 'Lovable, GitHub, Anthropic, Resend et votre registrar : double authentification partout.' }
  ];
  const C20_FAMILLES = [
    { id: 'rls', label: 'Tables sans règles' },
    { id: 'secret', label: 'Secret au mauvais endroit' },
    { id: 'agent', label: 'Agent avec trop de droits' }
  ];
  const C20_INCIDENTS = [
    { date: '20 mars 2025', court: 'CVE-2025-48757', t: 0, titre: 'Lovable et la CVE-2025-48757', fam: ['rls'], chiffres: [['170+', 'applications'], ['303', 'points d’accès']], recit: 'Des applications interrogent Supabase depuis le navigateur avec la clé publique, alors que les règles RLS manquent ou sont mal écrites. Noms, e-mails, téléphones, paiements et clés d’API exposés. Identifiant CVE attribué le 29 mai 2025.' },
    { date: '18 juillet 2025', court: 'Replit · SaaStr', t: 4.5, titre: 'Replit et la base de SaaStr', fam: ['agent'], chiffres: [['1 200+', 'dirigeants'], ['≈ 1 190', 'entreprises']], recit: 'En plein gel explicite, l’agent supprime la base de production, fabrique plus de 4 000 faux utilisateurs et affirme à tort qu’un retour en arrière est impossible. Pas de pirate : un agent avec trop de droits.' },
    { date: '31 janvier 2026', court: 'Moltbook', t: 10.4, titre: 'Moltbook', fam: ['rls', 'secret'], chiffres: [['1,5 M', 'jetons d’API'], ['35 000+', 'e-mails']], recit: 'Un « réseau social pour agents IA » entièrement vibecodé : une base Supabase sans RLS, la clé dans le code envoyé au navigateur. Messages privés lisibles et modifiables. L’erreur était la même qu’un an plus tôt.' },
    { date: '3 mars 2026', court: 'BOLA', t: 11.4, titre: 'La faille BOLA de Lovable', fam: ['secret'], chiffres: [['48', 'jours d’exposition'], ['20 avril 2026', 'rendue publique']], recit: 'Un compte gratuit permettait de lire le code, les identifiants Supabase écrits en dur et les historiques de chat. Leçon : aucun secret dans le code, aucun secret dans le chat.' }
  ];
  const C20_CLE = [
    'Révoquez la clé tout de suite dans le tableau de bord du service (Console d’Anthropic, Resend, Stripe).',
    'Générez-en une nouvelle et rangez-la dans les Secrets de Lovable Cloud, jamais dans le chat.',
    'Vérifiez que l’application fonctionne avec la nouvelle clé.',
    'Consultez la consommation du service sur les derniers jours pour repérer un usage anormal.',
    'Notez l’incident, sa cause et la correction dans le journal de décisions du projet.'
  ];
  const C20_ETATS = ['Exposée', 'Révoquée', 'Remplacée', 'Vérifiée', 'Surveillée', 'Consignée'];

  function c20Portes(panel, ctx) {
    let sel = 1;
    const detail = h('div', { class: 'vz-porte-detail', 'aria-live': 'polite' });
    const facade = h('div', { class: 'vz-porte-facade' + (ctx.print ? ' vz-is-print' : '') });
    const doors = C20_PORTES.map((p, i) => {
      const inner = [
        h('span', { class: 'vz-porte-arch', 'aria-hidden': 'true' }),
        h('span', { class: 'vz-porte-knob', 'aria-hidden': 'true' }, p.ouverte ? '' : pixIcon(PIX.lock, 'currentColor', 12)),
        h('span', { class: 'vz-porte-name' }, p.court),
        ctx.print ? h('span', { class: 'vz-porte-mini' }, p.serrure) : null
      ];
      const d = ctx.print ? h('div', { class: 'vz-porte' + (p.ouverte ? ' vz-is-ouverte' : '') }, inner)
        : h('button', { type: 'button', class: 'vz-porte' + (p.ouverte ? ' vz-is-ouverte' : ''), 'aria-pressed': String(i === sel), 'aria-label': 'Porte : ' + p.nom }, inner);
      if (!ctx.print) d.addEventListener('click', () => { sel = i; draw(); });
      return d;
    });
    add(facade, h('div', { class: 'vz-porte-roof', 'aria-hidden': 'true' }, h('span', null, 'L’Atelier')), doors);
    function draw() {
      doors.forEach((d, i) => d.setAttribute('aria-pressed', String(i === sel)));
      const p = C20_PORTES[sel];
      clear(detail);
      add(detail,
        h('p', { class: 'vz-porte-titre' }, p.nom),
        h('div', { class: 'vz-porte-q' },
          h('div', null, h('span', { class: 'vz-porte-qk' }, 'Qui frappe ?'), h('span', null, p.qui)),
          h('div', { class: p.ouverte ? 'vz-is-danger' : '' }, h('span', { class: 'vz-porte-qk' }, 'La serrure'), h('span', null, p.serrure))),
        h('p', { class: 'vz-porte-ex' }, p.ex));
    }
    /* Authentifier n'est pas autoriser : la relectrice badgée. */
    let serveur = true;
    const reqs = [
      { a: 'Lire le chapitre 9 (en relecture)', ok: true },
      { a: 'Lire le chapitre 20, resté en Brouillon, par son adresse directe', ok: false },
      { a: 'Envoyer la requête « Publier » sans le bouton', ok: false }
    ];
    const reqList = h('ul', { class: 'vz-porte-reqs' });
    function drawReqs() {
      clear(reqList);
      reqs.forEach((r) => {
        const passe = r.ok || !serveur;
        const grave = !r.ok && passe;
        reqList.appendChild(h('li', { class: 'vz-porte-req' + (grave ? ' vz-is-fuite' : passe ? ' vz-is-ok' : ' vz-is-refus') },
          h('span', { class: 'vz-porte-req-ic', 'aria-hidden': 'true' }, pixIcon(passe ? PIX.check : PIX.cross, 'currentColor', 12)),
          h('span', null, r.a),
          h('span', { class: 'vz-porte-req-st' }, grave ? 'passe : faille' : passe ? 'autorisé' : 'refusé')));
      });
    }
    const badge = h('div', { class: 'vz-porte-auth' },
      kicker('Authentifier n’est pas autoriser'),
      h('p', { class: 'vz-porte-auth-who' }, h('span', { class: 'vz-porte-auth-badge' }, 'Badge vérifié'), ' Relectrice inscrite, connectée : elle est authentifiée.'),
      ctx.print ? null : seg([{ value: true, label: 'Contrôle côté serveur' }, { value: false, label: 'Bouton caché seulement' }], serveur, (v) => { serveur = v; drawReqs(); }, 'Où se fait la vérification'),
      reqList,
      note('Cacher un bouton ne protège rien : la vérification se fait côté serveur, dans une règle RLS ou dans la fonction.'));
    if (ctx.print) add(panel, h('div', { class: 'vz-porte-grid' }, facade, badge));
    else add(panel, h('div', { class: 'vz-porte-grid' }, facade, detail), badge);
    if (!ctx.print) draw();
    drawReqs();
  }

  function c20Incidents(panel, ctx) {
    let sel = 0;
    let fam = null;
    const W = 100;
    const line = h('div', { class: 'vz-inc-line' });
    const axis = h('div', { class: 'vz-inc-axis', 'aria-hidden': 'true' }, ['2025', '2026'].map((y, i) => h('span', { style: { left: (i === 0 ? 0 : 75) + '%' } }, y)));
    const card = h('div', { class: 'vz-inc-card', 'aria-live': 'polite' });
    const dots = C20_INCIDENTS.map((inc, i) => {
      const d = h(ctx.print ? 'span' : 'button', { type: ctx.print ? null : 'button', class: 'vz-inc-dot vz-fam-' + inc.fam[0], style: { left: (inc.t / 13.5 * W) + '%' }, 'aria-label': inc.titre + ', ' + inc.date },
        h('span', { class: 'vz-inc-dot-label' }, inc.court));
      if (!ctx.print) d.addEventListener('click', () => { sel = i; draw(); });
      return d;
    });
    add(line, h('span', { class: 'vz-inc-rail', 'aria-hidden': 'true' }), dots);
    const filtres = h('div', { class: 'vz-b-chips', role: 'group', 'aria-label': 'Trois erreurs' }, C20_FAMILLES.map((f) => {
      const b = h('button', { type: 'button', class: 'vz-b-chip vz-inc-fam vz-fam-' + f.id, 'aria-pressed': 'false' }, f.label);
      b.addEventListener('click', () => { fam = fam === f.id ? null : f.id; draw(); });
      f.btn = b;
      return b;
    }));
    function cardOf(inc) {
      return h('article', { class: 'vz-inc-art' },
        h('p', { class: 'vz-inc-date' }, inc.date),
        h('p', { class: 'vz-inc-titre' }, inc.titre),
        h('div', { class: 'vz-inc-nums' }, inc.chiffres.map((c) => h('div', { class: 'vz-inc-num' }, h('strong', null, c[0]), h('span', null, c[1])))),
        h('p', { class: 'vz-inc-recit' }, inc.recit),
        h('p', { class: 'vz-inc-fams' }, inc.fam.map((f) => h('span', { class: 'vz-inc-tag vz-fam-' + f }, C20_FAMILLES.find((x) => x.id === f).label))));
    }
    function draw() {
      if (fam && !C20_INCIDENTS[sel].fam.includes(fam)) sel = C20_INCIDENTS.findIndex((x) => x.fam.includes(fam));
      dots.forEach((d, i) => {
        d.setAttribute('aria-pressed', String(i === sel));
        d.classList.toggle('vz-is-dim', !!fam && !C20_INCIDENTS[i].fam.includes(fam));
      });
      C20_FAMILLES.forEach((f) => f.btn.setAttribute('aria-pressed', String(fam === f.id)));
      clear(card).appendChild(cardOf(C20_INCIDENTS[sel]));
    }
    if (ctx.print) {
      add(panel, h('div', { class: 'vz-inc-printgrid' }, C20_INCIDENTS.map(cardOf)),
        note('Quatre histoires, trois erreurs : des tables sans règles, un secret au mauvais endroit, un agent avec trop de droits.'));
      return;
    }
    add(panel, h('div', { class: 'vz-inc-time' }, line, axis), kicker('Quatre histoires, trois erreurs'), filtres, card);
    draw();
  }

  function c20Cle(panel, ctx) {
    if (ctx.print) {
      add(panel, h('ol', { class: 'vz-cle-printlist' }, C20_CLE.map((s) => h('li', null, s))),
        note('Effacer la ligne ne sert à rien : une clé poussée une seule fois sur GitHub reste dans l’historique.'));
      return;
    }
    const faits = C20_CLE.map(() => false);
    let t0 = null, raf = null, fin = null;
    const clock = h('div', { class: 'vz-cle-clock', role: 'timer', 'aria-label': 'Chronomètre' }, '00:00');
    const etat = h('div', { class: 'vz-cle-etats', 'aria-hidden': 'true' }, C20_ETATS.map((e) => h('span', { class: 'vz-cle-etat' }, e)));
    const statut = h('p', { class: 'vz-cle-statut', 'aria-live': 'polite' }, 'Une clé secrète vient d’être poussée sur GitHub. Chaque minute compte.');
    const start = btn('Une clé a fui : démarrer', go, { primary: true });
    const steps = h('ol', { class: 'vz-cle-steps' });
    const checks = C20_CLE.map((s, i) => {
      const cb = h('input', { type: 'checkbox', class: 'vz-cle-cb', disabled: true });
      cb.addEventListener('change', () => { faits[i] = cb.checked; draw(); });
      steps.appendChild(h('li', { class: 'vz-cle-step' }, h('label', null, cb, h('span', null, s))));
      return cb;
    });
    function mmss(ms) { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    function tick() { if (t0 && !fin) { clock.textContent = mmss(Date.now() - t0); raf = setTimeout(tick, 250); } }
    function go() {
      t0 = Date.now(); fin = null;
      faits.fill(false);
      checks.forEach((c) => { c.checked = false; });
      start.textContent = 'Recommencer';
      panel.classList.add('vz-is-live');
      clearTimeout(raf); tick(); draw();
    }
    function draw() {
      const n = faits.filter(Boolean).length;
      let next = faits.indexOf(false);
      checks.forEach((c, i) => {
        c.disabled = !t0 || (i > next && !faits[i]);
        c.closest('li').classList.toggle('vz-is-next', !!t0 && i === next);
        c.closest('li').classList.toggle('vz-is-done', faits[i]);
      });
      etat.querySelectorAll('.vz-cle-etat').forEach((e, i) => { e.classList.toggle('vz-is-on', !!t0 && i <= n); e.classList.toggle('vz-is-cur', !!t0 && i === n); });
      etat.dataset.niveau = String(n);
      if (!t0) return;
      if (n === C20_CLE.length) {
        fin = Date.now();
        clearTimeout(raf);
        clock.textContent = mmss(fin - t0);
        statut.textContent = 'Clé révoquée, remplacée, vérifiée, consommation relue, incident noté en ' + mmss(fin - t0) + '.';
        panel.classList.remove('vz-is-live');
      } else {
        statut.textContent = n === 0 ? 'Première action : révoquer, tout de suite. Effacer la ligne ne sert à rien.' : 'Étape ' + (n + 1) + ' sur ' + C20_CLE.length + '.';
      }
    }
    add(panel, h('div', { class: 'vz-cle-head' }, h('div', { class: 'vz-cle-keyic', 'aria-hidden': 'true' }, pixIcon(PIX.key, 'currentColor', 30)), clock, start),
      etat, statut, steps,
      note('Depuis le 25 juillet 2026, Lovable révoque automatiquement certaines clés qui fuient sur GitHub, sans préciser lesquelles. Ne comptez pas dessus.'));
    draw();
  }

  VIZ['ch20-portes'] = {
    chapitre: 'ch20',
    titre: 'Une question à chaque porte',
    consigne: 'Frappez à chaque porte, revivez les incidents, puis chronométrez la réaction à une clé exposée.',
    ancre: 'Les outils de contrôle',
    render(el, ctx) {
      root(el, 'portes', ctx);
      tabbed(el, ctx, [
        { label: 'Les six portes', render: (p) => c20Portes(p, ctx) },
        { label: 'Ce qui est arrivé', render: (p) => c20Incidents(p, ctx) },
        { label: 'Si une clé fuit', render: (p) => c20Cle(p, ctx) }
      ], 'Sécurité de L’Atelier');
    }
  };

  /* ================= ch21 : Du service au SaaS (simulateur MRR) ================= */

  let UID = 0;
  const uid = (p) => p + '-' + (++UID) + '-' + Math.random().toString(36).slice(2, 7);
  function niceMax(v) {
    if (v <= 0) return 100;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const r = v / p;
    return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
  }
  function onResize(el, cb) {
    let last = 0;
    const run = () => { const w = Math.round(el.clientWidth); if (w && w !== last) { last = w; cb(w); } };
    if ('ResizeObserver' in window) new ResizeObserver(run).observe(el);
    else window.addEventListener('resize', run);
    requestAnimationFrame(run);
    return run;
  }

  VIZ['ch21-mrr'] = {
    chapitre: 'ch21',
    titre: 'Le seau percé',
    consigne: 'Faites varier prix, nouveaux clients et attrition : la courbe du revenu récurrent se redessine sur 24 mois.',
    ancre: 'Construire ou ne pas construire',
    render(el, ctx) {
      root(el, 'mrr', ctx);
      const S = { prix: 49, depart: 0, nouveaux: 4, attrition: 5, ia: 2, relecture: 10, cac: 150, fixes: 185 };
      let hover = null;
      let animated = !canMove() || ctx.print;
      let armed = false;

      const frais = (p) => p * 0.015 + 0.25 + p * 0.007;
      function simule() {
        const pts = [];
        let c = S.depart;
        const a = S.attrition / 100;
        for (let m = 0; m <= 24; m++) {
          pts.push({ m, c, mrr: c * S.prix });
          c = c * (1 - a) + S.nouveaux;
        }
        return pts;
      }

      /* --- Contrôles --- */
      const ranges = {
        prix: range({ label: 'Prix mensuel HT', min: 9, max: 149, value: S.prix, format: (v) => eur(v), onInput: (v) => { S.prix = v; draw(); } }),
        depart: range({ label: 'Applications abonnées au départ', min: 0, max: 200, value: S.depart, onInput: (v) => { S.depart = v; draw(); } }),
        nouveaux: range({ label: 'Nouveaux abonnés par mois', min: 0, max: 30, value: S.nouveaux, onInput: (v) => { S.nouveaux = v; draw(); } }),
        attrition: range({ label: 'Attrition mensuelle', min: 0.5, max: 15, step: 0.5, value: S.attrition, format: (v) => fmt(v, 1) + ' %', onInput: (v) => { S.attrition = v; draw(); } })
      };
      function setAll(o) {
        Object.assign(S, o);
        Object.keys(ranges).forEach((k) => { ranges[k].input.value = S[k]; ranges[k].refresh(); });
        draw();
      }
      const presets = h('div', { class: 'vz-b-chips', role: 'group', 'aria-label': 'Scénarios' },
        btn('Exemple du livre : 40 abonnés, 2 départs', () => setAll({ depart: 40, nouveaux: 2, attrition: 5, prix: 49 }), { small: true }),
        btn('Attrition à 10 %', () => setAll({ attrition: 10 }), { small: true }),
        btn('Partir de zéro', () => setAll({ depart: 0, nouveaux: 4, attrition: 5, prix: 49 }), { small: true }));
      const avance = h('details', { class: 'vz-mrr-adv' },
        h('summary', null, 'Marge et acquisition (hypothèses du chapitre)'),
        h('div', { class: 'vz-mrr-adv-grid' },
          numIn({ label: 'IA et infrastructure par abonné', value: S.ia, step: 0.5, unit: '€ / mois', onInput: (v) => { S.ia = v; draw(); } }),
          numIn({ label: 'Relecture humaine valorisée', value: S.relecture, step: 1, unit: '€ / mois', onInput: (v) => { S.relecture = v; draw(); } }),
          numIn({ label: 'Coût d’acquisition (CAC)', value: S.cac, step: 10, unit: '€', onInput: (v) => { S.cac = v; draw(); } }),
          numIn({ label: 'Charges fixes (≈ 185 $ au chapitre)', value: S.fixes, step: 5, unit: '€ / mois', onInput: (v) => { S.fixes = v; draw(); } })),
        note('Frais Stripe calculés comme au chapitre 23 : 1,5 % + 0,25 € + 0,7 % de Billing, ' + TARIF + '.'));

      /* --- Graphique --- */
      const chartHost = h('div', { class: 'vz-mrr-chart', tabindex: ctx.print ? null : '0', role: 'img' });
      const tip = h('div', { class: 'vz-mrr-tip', 'aria-hidden': 'true', hidden: true });
      chartHost.appendChild(tip);
      const kpis = h('div', { class: 'vz-mrr-kpis', 'aria-live': 'polite' });
      const gradId = uid('vz-mrr-grad');
      let width = 600;

      function drawChart() {
        const pts = simule();
        const W = width, H = clamp(Math.round(W * 0.48), 200, 280);
        const m = { l: 54, r: 14, t: 18, b: 30 };
        const a = S.attrition / 100;
        const plateau = S.nouveaux / a * S.prix;
        const maxV = niceMax(Math.max(...pts.map((p) => p.mrr), S.fixes * 1.15, Math.min(plateau, Math.max(...pts.map((p) => p.mrr)) * 1.6), 100) * 1.08);
        const x = (mm) => m.l + (W - m.l - m.r) * mm / 24;
        const y = (v) => m.t + (H - m.t - m.b) * (1 - v / maxV);
        const svg = sv('svg', { class: 'vz-mrr-svg', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true' });
        const defs = sv('defs', null, sv('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 },
          sv('stop', { offset: '0%', 'stop-color': 'var(--accent)', 'stop-opacity': 0.45 }),
          sv('stop', { offset: '100%', 'stop-color': 'var(--accent)', 'stop-opacity': 0.02 })));
        svg.appendChild(defs);
        for (let i = 0; i <= 4; i++) {
          const v = maxV * i / 4;
          svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'vz-mrr-grid' }));
          svg.appendChild(sv('text', { x: m.l - 8, y: y(v) + 4, class: 'vz-mrr-ylab', 'text-anchor': 'end' }, fmt(v) + ' €'));
        }
        [0, 6, 12, 18, 24].forEach((mm) => svg.appendChild(sv('text', { x: x(mm), y: H - 8, class: 'vz-mrr-xlab', 'text-anchor': mm === 0 ? 'start' : mm === 24 ? 'end' : 'middle' }, mm === 0 ? 'Mois 0' : String(mm))));
        if (S.fixes > 0 && S.fixes < maxV) {
          svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: y(S.fixes), y2: y(S.fixes), class: 'vz-mrr-fixes' }));
          svg.appendChild(sv('text', { x: W - m.r, y: y(S.fixes) - 6, class: 'vz-mrr-flab vz-mrr-flab--fixes', 'text-anchor': 'end' }, 'Charges fixes'));
        }
        if (plateau < maxV && S.nouveaux > 0) {
          svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: y(plateau), y2: y(plateau), class: 'vz-mrr-plateau' }));
          svg.appendChild(sv('text', { x: m.l + 6, y: y(plateau) - 6, class: 'vz-mrr-flab' }, 'Niveau où le seau se stabilise : ' + eur(plateau)));
        }
        const line = pts.map((p, i) => (i ? 'L' : 'M') + x(p.m).toFixed(1) + ' ' + y(p.mrr).toFixed(1)).join(' ');
        svg.appendChild(sv('path', { d: line + ' L' + x(24) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z', fill: 'url(#' + gradId + ')', class: 'vz-mrr-area' }));
        const path = sv('path', { d: line, class: 'vz-mrr-line' });
        svg.appendChild(path);
        const last = pts[24];
        svg.appendChild(sv('circle', { cx: x(24), cy: y(last.mrr), r: 4.5, class: 'vz-mrr-end' }));
        if (hover != null) {
          const p = pts[hover];
          svg.appendChild(sv('line', { x1: x(p.m), x2: x(p.m), y1: m.t, y2: H - m.b, class: 'vz-mrr-rule' }));
          svg.appendChild(sv('circle', { cx: x(p.m), cy: y(p.mrr), r: 5, class: 'vz-mrr-dot' }));
          tip.hidden = false;
          tip.textContent = 'Mois ' + p.m + ' · ' + fmt(p.c, 1) + ' abonnés · MRR ' + eur(p.mrr);
          tip.style.left = clamp(x(p.m), 90, W - 90) + 'px';
          tip.style.top = Math.max(0, y(p.mrr) - 44) + 'px';
        } else tip.hidden = true;
        const old = chartHost.querySelector('svg');
        if (old) old.remove();
        chartHost.insertBefore(svg, tip);
        chartHost.setAttribute('aria-label', 'Courbe du MRR sur 24 mois : de ' + eur(pts[0].mrr) + ' à ' + eur(last.mrr) + ' au mois 24.');
        if (!animated) {
          const len = path.getTotalLength ? path.getTotalLength() : 1000;
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          chartHost.classList.add('vz-is-pre');
          if (!armed) {
            armed = true;
            whenVisible(chartHost, () => {
              animated = true;
              const pth = chartHost.querySelector('.vz-mrr-line');
              pth.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.3,.7,.2,1)';
              requestAnimationFrame(() => requestAnimationFrame(() => { pth.style.strokeDashoffset = '0'; chartHost.classList.remove('vz-is-pre'); }));
              setTimeout(() => { pth.style.strokeDasharray = ''; pth.style.strokeDashoffset = ''; pth.style.transition = ''; }, 1600);
            });
          }
        }
        return { pts, x, W, m };
      }
      let geo = null;
      function pick(clientX) {
        if (!geo) return;
        const r = chartHost.getBoundingClientRect();
        const px = clientX - r.left;
        hover = clamp(Math.round((px - geo.m.l) / (geo.W - geo.m.l - geo.m.r) * 24), 0, 24);
        geo = drawChart();
      }
      if (!ctx.print) {
        chartHost.addEventListener('pointermove', (e) => pick(e.clientX));
        chartHost.addEventListener('pointerleave', () => { hover = null; geo = drawChart(); });
        chartHost.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          hover = clamp((hover == null ? 24 : hover) + (e.key === 'ArrowRight' ? 1 : -1), 0, 24);
          geo = drawChart();
        });
        chartHost.addEventListener('blur', () => { hover = null; geo = drawChart(); });
      }

      function kpi(label, value, sub, cls) {
        return h('div', { class: 'vz-mrr-kpi' + (cls ? ' ' + cls : '') }, h('span', { class: 'vz-mrr-kpi-l' }, label), h('strong', { class: 'vz-mrr-kpi-v' }, value), sub ? h('span', { class: 'vz-mrr-kpi-s' }, sub) : null);
      }
      function drawKpis(pts) {
        const a = S.attrition / 100;
        const vie = 1 / a;
        const marge = S.prix - frais(S.prix) - S.ia - S.relecture;
        const ltv = marge * vie;
        const ratio = S.cac > 0 ? ltv / S.cac : Infinity;
        const recup = marge > 0 ? S.cac / marge : Infinity;
        const last = pts[24];
        const couvre = pts.find((p) => p.mrr * (marge / S.prix) >= S.fixes);
        clear(kpis);
        add(kpis,
          kpi('MRR au mois 24', eur(last.mrr), fmt(last.c, 1) + ' abonnés'),
          kpi('ARR', eur(last.mrr * 12), 'MRR × 12, une photographie'),
          kpi('Durée de vie moyenne', fmt(vie, 1) + ' mois', '1 ÷ attrition'),
          kpi('Marge par abonné', eur(marge, 2), 'dont frais Stripe ' + eur(frais(S.prix), 2), marge <= 0 ? 'vz-is-bad' : ''),
          kpi('Valeur vie client', eur(ltv), 'marge × durée de vie', ltv <= 0 ? 'vz-is-bad' : ''),
          kpi('Valeur vie ÷ acquisition', isFinite(ratio) ? fmt(ratio, 1) : '∞', ratio >= 3 ? 'chaque euro investi rapporte ' + fmt(ratio, 1) + ' € de marge' : 'trop juste', ratio >= 3 ? 'vz-is-good' : 'vz-is-bad'),
          kpi('Délai de récupération', isFinite(recup) ? fmt(recup, 1) + ' mois' : 'jamais', 'CAC ÷ marge mensuelle'),
          kpi('Charges fixes couvertes', couvre ? 'mois ' + couvre.m : 'pas en 24 mois', 'par la marge des abonnés', couvre ? '' : 'vz-is-bad'));
      }
      function draw() {
        geo = drawChart();
        drawKpis(geo.pts);
      }

      onResize(chartHost, (w) => { width = Math.max(280, w); draw(); });
      add(el,
        ctx.print ? null : h('div', { class: 'vz-mrr-controls' }, Object.values(ranges)),
        ctx.print ? h('p', { class: 'vz-mrr-printparams' }, 'Prix 49 € HT · départ 0 abonné · 4 nouveaux par mois · attrition 5 %') : null,
        ctx.print ? null : presets,
        chartHost, kpis,
        ctx.print ? null : avance,
        note('Tous ces chiffres sont des hypothèses du chapitre, à recalculer avec les vôtres. Prix et frais ' + TARIF + '.'));
      width = Math.max(280, chartHost.clientWidth || 600);
      draw();
    }
  };

  /* ================= ch22 : L'architecture du cahier des charges ================= */

  const C22_SIGNAUX = [
    'Trois rôles ou plus, ou des droits qui dépendent d’une organisation',
    'Un abonnement ou une API payante',
    'Des données de clients ou du code de tiers',
    'Deux outils ou un développeur',
    'Plus d’une dizaine de « Must »',
    'Un service destiné à durer'
  ];
  const C22_ARBRE = [
    { nom: 'Page de garde', contenu: 'Nom, version, date, statut, auteur, outils', lit: 'Tout le monde', ex: 'Audit Vibe Coding, version 0.9, brouillon avancé, septembre 2026.' },
    { nom: 'Corps : rubriques 1 à 9', contenu: 'Les neuf rubriques du chapitre 10, dans le même ordre, en français courant', lit: 'Vous, vos testeurs, l’IA qui démarre', enfants: [
      { nom: '1. Vision', ex: 'Un rapport clair chaque mois, relu par une personne. Indicateur à six mois : trente applications abonnées.' },
      { nom: '2. Utilisateurs', ex: 'Quatre rôles : propriétaire, membre, auditeur, administrateur.', neuf: 'Qui paie ? L’organisation, par son propriétaire.' },
      { nom: '3. Parcours', ex: 'Compte, organisation, paiement, questionnaire, analyse, rapport relu, portail client.' },
      { nom: '4. Fonctionnalités priorisées', ex: 'Sept « Must », sous la limite d’une dizaine.' },
      { nom: '5. Données', ex: 'Chaque donnée appartient à une organisation ; aucune carte bancaire.', neuf: 'À qui appartient chaque donnée ? Quelles données confidentielles ? Le code source n’est pas une donnée personnelle, mais il mérite protection.' },
      { nom: '6. Règles métier', ex: 'Deux analyses par application et par mois ; aucun rapport envoyé sans validation humaine.' },
      { nom: '7. Contraintes', ex: 'Un Supabase à soi en région Paris dès le lot 0 ; interface en français, vouvoiement.' },
      { nom: '8. Hors périmètre', ex: 'Pas de test d’intrusion, pas de correction du code du client, pas de certification.' },
      { nom: '9. Critères d’acceptation', ex: 'De la création du compte à la première analyse en moins de quinze minutes.' }
    ] },
    { nom: 'Annexes A à G', contenu: 'Sept annexes techniques qui disent avec précision ce que le corps dit en français courant', lit: 'L’IA, le relecteur, vous dans six mois', enfants: [
      { nom: 'A. Écrans', contenu: 'Inventaire des écrans, rôle par rôle', lit: 'Lovable, le designer', piege: 'Un écran absent de tout parcours est suspect.', ex: 'Tableau de bord, questionnaire, rapport, file de relecture, abonnement.' },
      { nom: 'B. Données et droits', contenu: 'Tables, champs, relations, matrice des droits', lit: 'L’IA qui écrit la base et la RLS, le relecteur', piege: 'Dans la matrice, une case vide doit être un « non » décidé, pas un oubli.', matrice: true, risque: true },
      { nom: 'C. Intégrations et secrets', contenu: 'Services tiers, noms des clés, emplacements, plafonds', lit: 'Vous, le jour d’un incident', piege: 'On y note le nom d’une clé, jamais sa valeur.', ex: 'ANTHROPIC_API_KEY, dans les secrets des fonctions Supabase.' },
      { nom: 'D. Exigences non fonctionnelles', contenu: 'Sécurité, RGPD, performance, coûts', lit: 'Le relecteur, le développeur', piege: 'Un vœu ne se pèse pas : « rapide » non, « moins de deux secondes » oui.', ex: 'Le tableau de bord s’affiche en moins de deux secondes.' },
      { nom: 'E. Critères détaillés', contenu: 'Scénarios « étant donné, quand, alors »', lit: 'Les tests, vous à la recette', piege: 'Chaque critère : un cas nominal, un cas d’erreur, un cas d’accès interdit.', ex: 'Quand A vise par l’adresse un rapport de B, la base ne renvoie rien.' },
      { nom: 'F. Plan de lots', contenu: 'Livraisons successives', lit: 'Vous et l’IA, lot après lot', piege: 'Le lot zéro est toujours celui des fondations.', ex: 'Lot 0 : deux comptes de deux organisations ne voient rien l’un de l’autre.' },
      { nom: 'G. Décisions et questions ouvertes', contenu: 'Ce qui est tranché, pourquoi, et ce qui ne l’est pas', lit: 'Vous dans six mois', piege: 'Claude aura oublié vos raisons dès la conversation suivante.', ex: 'Son propre Supabase dès le lot 0 : restauration à la seconde, préproduction séparée.' }
    ] }
  ];
  const C22_ROLES = ['Propriétaire', 'Membre', 'Auditeur', 'Admin.'];
  const C22_MATRICE = [
    ['organisations', 'Lire, modifier la sienne', 'Lire la sienne', 'Rien', 'Lire toutes'],
    ['membres, invitations', 'Tout, son organisation', 'Lire', 'Rien', 'Lire toutes'],
    ['applications, questionnaires', 'Tout, son organisation', 'Lire ; modifier si autorisé', 'Lire, si à relire', 'Rien'],
    ['analyses, constats', 'Lire ; « corrigé »', 'Lire ; « corrigé »', 'Brouillons à relire', 'Rien'],
    ['abonnements', 'Lire ; écrit par le webhook', 'Rien', 'Rien', 'Lire tous'],
    ['usage_ia', 'Lire le sien', 'Rien', 'Rien', 'Lire les totaux']
  ];

  function c22Matrice() {
    return h('div', { class: 'vz-cdc-mat-wrap' }, h('table', { class: 'vz-cdc-mat' },
      h('thead', null, h('tr', null, h('th', null, 'Table'), C22_ROLES.map((r) => h('th', null, r)))),
      h('tbody', null, C22_MATRICE.map((row) => h('tr', null, row.map((c, i) => i === 0 ? h('th', { scope: 'row' }, c) : h('td', { class: c === 'Rien' ? 'vz-is-non' : '' }, c)))))));
  }
  function c22Fiche(n) {
    return h('div', { class: 'vz-cdc-fiche' },
      n.contenu ? h('p', null, h('span', { class: 'vz-cdc-k' }, 'Contenu'), n.contenu) : null,
      n.lit ? h('p', null, h('span', { class: 'vz-cdc-k' }, 'Qui la lit surtout'), n.lit) : null,
      n.neuf ? h('p', { class: 'vz-cdc-neuf' }, h('span', { class: 'vz-cdc-k' }, 'Nouveau pour un SaaS'), n.neuf) : null,
      n.ex ? h('p', null, h('span', { class: 'vz-cdc-k' }, 'Dans l’exemple'), n.ex) : null,
      n.risque ? h('p', null, h('span', { class: 'vz-cdc-k' }, 'Dans l’exemple'), 'Elle porte le plus gros du risque : sa matrice deviendra les règles RLS.') : null,
      n.matrice ? c22Matrice() : null,
      n.piege ? h('p', { class: 'vz-cdc-piege' }, h('span', { class: 'vz-cdc-k' }, 'Le piège'), n.piege) : null);
  }

  VIZ['ch22-cahier'] = {
    chapitre: 'ch22',
    titre: 'L’architecture du cahier des charges',
    consigne: 'Cochez vos signaux, puis dépliez chaque rubrique et chaque annexe pour voir son piège.',
    ancre: 'Le gabarit et ses pièges',
    render(el, ctx) {
      root(el, 'cdc', ctx);
      if (ctx.print) {
        const [garde, corps, annexes] = C22_ARBRE;
        add(el,
          h('div', { class: 'vz-cdc-print' },
            h('div', { class: 'vz-cdc-pcol' },
              h('p', { class: 'vz-cdc-ptitle' }, garde.nom), h('p', { class: 'vz-cdc-pline' }, garde.contenu),
              h('p', { class: 'vz-cdc-ptitle' }, corps.nom),
              h('ul', { class: 'vz-cdc-plist' }, corps.enfants.map((c) => h('li', null, h('strong', null, c.nom), ' : ', c.ex)))),
            h('div', { class: 'vz-cdc-pcol' },
              h('p', { class: 'vz-cdc-ptitle' }, annexes.nom),
              h('ul', { class: 'vz-cdc-plist' }, annexes.enfants.map((c) => h('li', null, h('strong', null, c.nom), ' : ', c.contenu, '. ', h('span', { class: 'vz-cdc-ppiege' }, 'Piège : ' + c.piege)))))),
          note('Un signal parmi les six justifie le modèle complet, deux le rendent nécessaire. « Audit Vibe Coding » les coche tous.'));
        return;
      }
      /* Signaux */
      const etats = C22_SIGNAUX.map(() => false);
      const jauge = h('div', { class: 'vz-cdc-jauge', 'aria-hidden': 'true' }, C22_SIGNAUX.map(() => h('span')));
      const verdict = h('p', { class: 'vz-cdc-verdict', 'aria-live': 'polite' });
      const chips = C22_SIGNAUX.map((s, i) => chip(s, false, (v) => { etats[i] = v; drawSig(); }, 'vz-cdc-sig'));
      function drawSig() {
        const n = etats.filter(Boolean).length;
        jauge.querySelectorAll('span').forEach((s, i) => s.classList.toggle('vz-is-on', i < n));
        jauge.dataset.n = String(Math.min(n, 2));
        verdict.textContent = n === 0 ? 'Aucun signal : le modèle court des chapitres 10 et 14 suffit.'
          : n === 1 ? 'Un signal : il justifie le modèle complet.'
          : n + ' signaux : le modèle complet devient nécessaire.';
      }
      const tous = btn('Le cas d’« Audit Vibe Coding »', () => { chips.forEach((c, i) => { c.setAttribute('aria-pressed', 'true'); etats[i] = true; }); drawSig(); }, { small: true });

      /* Arbre */
      const tree = h('ul', { class: 'vz-cdc-tree', 'aria-label': 'Cahier des charges complet' });
      const toggles = [];
      const parNom = new Map();
      function node(n, depth) {
        const kids = n.enfants;
        const id = uid('vz-cdc-n');
        const b = h('button', { type: 'button', class: 'vz-cdc-node' + (n.piege ? ' vz-has-piege' : '') + (kids ? ' vz-is-branch' : ''), 'aria-expanded': 'false', 'aria-controls': id },
          h('span', { class: 'vz-cdc-caret', 'aria-hidden': 'true' }),
          h('span', { class: 'vz-cdc-nom' }, n.nom),
          kids ? h('span', { class: 'vz-cdc-count' }, String(kids.length)) : null,
          n.piege ? h('span', { class: 'vz-cdc-warn', title: 'Piège', 'aria-label': 'contient un piège' }, '!') : null);
        const body = h('div', { class: 'vz-cdc-body', id, hidden: true });
        if (kids) {
          body.appendChild(h('p', { class: 'vz-cdc-branchtxt' }, n.contenu + '.'));
          body.appendChild(h('ul', { class: 'vz-cdc-sub' }, kids.map((k) => node(k, depth + 1))));
        } else body.appendChild(c22Fiche(n));
        const set = (open) => { b.setAttribute('aria-expanded', String(open)); body.hidden = !open; };
        b.addEventListener('click', () => set(b.getAttribute('aria-expanded') !== 'true'));
        toggles.push(set);
        parNom.set(n.nom, set);
        return h('li', { class: 'vz-cdc-li', style: { '--d': depth } }, b, body);
      }
      add(tree, h('li', { class: 'vz-cdc-rootli' }, h('div', { class: 'vz-cdc-root' }, h('span', { class: 'vz-cdc-root-ic', 'aria-hidden': 'true' }, 'CDC'), h('span', null, 'Cahier des charges complet'), h('span', { class: 'vz-cdc-root-path' }, 'docs/CAHIER_DES_CHARGES.md')),
        h('ul', { class: 'vz-cdc-sub vz-cdc-top' }, C22_ARBRE.map((n) => node(n, 0)))));
      const outils = h('div', { class: 'vz-b-row' },
        btn('Tout déplier', () => toggles.forEach((t) => t(true)), { small: true }),
        btn('Tout replier', () => toggles.forEach((t) => t(false)), { small: true }));

      add(el,
        h('div', { class: 'vz-cdc-signaux' },
          h('div', { class: 'vz-cdc-sighead' }, kicker('Quand passer au modèle complet'), jauge),
          h('div', { class: 'vz-b-chips' }, chips), h('div', { class: 'vz-b-row' }, verdict, tous)),
        h('div', { class: 'vz-cdc-treehead' }, kicker('L’architecture du document'), outils),
        tree,
        note('Le document vit dans le dépôt, versionné ; la Knowledge de Lovable n’en reçoit qu’une version condensée.'));
      drawSig();
      parNom.get('Annexes A à G')(true);
      parNom.get('B. Données et droits')(true);
    }
  };

  /* ================= ch23 : Le trajet d'un abonnement ================= */

  const C23_LANES = [
    { id: 'client', label: 'Client', sub: 'navigateur' },
    { id: 'app', label: 'App', sub: 'Lovable' },
    { id: 'stripe', label: 'Stripe', sub: 'Billing' },
    { id: 'hook', label: 'Webhook', sub: 'fonction' },
    { id: 'base', label: 'Base', sub: 'abonnements' },
    { id: 'mail', label: 'E-mail', sub: 'Resend' }
  ];
  const C23_SCENARIOS = {
    souscription: { label: 'Souscription', steps: [
      ['client', 'app', 'Clic sur « S’abonner »', 'Seul le propriétaire de l’organisation peut payer.'],
      ['app', 'stripe', 'Session Checkout', 'L’identifiant de l’organisation et celui de l’application partent avec le paiement.'],
      ['client', 'stripe', 'Paiement par carte', 'Sur la page hébergée par Stripe : un client Stripe par organisation, jamais par utilisateur.'],
      ['stripe', 'client', 'Page de retour « Merci »', 'Elle n’accorde aucun accès : on ne regarde jamais l’écran pour savoir si le client a payé.', 'faux'],
      ['stripe', 'hook', 'checkout.session.completed', 'Un événement signé, envoyé à la fonction serveur qui reçoit les webhooks.', 'event'],
      ['hook', 'hook', 'Signature, doublon, réponse', 'Vérifie la signature (secret whsec_), ignore un événement déjà reçu, répond aussitôt.'],
      ['hook', 'base', 'Écrit dans abonnements', 'Statut actif et fin de période. Cette fonction est la seule à écrire dans la table.', 'write'],
      ['hook', 'mail', 'E-mail en file d’attente', 'Les tâches longues (PDF, e-mails) partent dans une file, sinon Stripe renvoie l’événement.'],
      ['app', 'base', 'Lit abonnements', 'Tout le reste de l’application lit cette table : les analyses sont débloquées.', 'ok']
    ] },
    renouvellement: { label: 'Renouvellement', steps: [
      ['stripe', 'stripe', 'Échéance, un dimanche', 'Stripe prélève la carte enregistrée, sans que le client soit là.'],
      ['stripe', 'hook', 'invoice.paid', 'Le paiement de la facture a réussi.', 'event'],
      ['hook', 'base', 'Fin de période prolongée', 'La copie locale suit la vérité de Stripe.', 'write'],
      ['app', 'base', 'Lit abonnements', 'Rien ne change pour l’abonné : c’est voulu.', 'ok']
    ] },
    echec: { label: 'Paiement échoué', steps: [
      ['stripe', 'stripe', 'Carte expirée', 'Le prélèvement de l’échéance échoue.'],
      ['stripe', 'hook', 'invoice.payment_failed', 'Stripe prévient l’application par webhook.', 'event'],
      ['hook', 'base', 'Statut « impayé »', 'Seul le webhook modifie la table.', 'write'],
      ['app', 'base', 'Lit abonnements', 'Nouvelles analyses bloquées dans l’heure, sans intervention manuelle ; les rapports restent consultables.', 'stop']
    ] },
    resiliation: { label: 'Résiliation', steps: [
      ['client', 'app', 'Bouton « Abonnement »', 'Le bouton vers le portail client est visible.'],
      ['app', 'stripe', 'Ouvre le portail client', 'Une page hébergée par Stripe : carte, factures, offre, résiliation.'],
      ['client', 'stripe', 'Résilie en ligne', 'Pour un consommateur, la résiliation en ligne est obligatoire depuis le 1er juin 2023.'],
      ['stripe', 'hook', 'customer.subscription.deleted', 'À la fin de la période payée.', 'event'],
      ['hook', 'base', 'Statut « résilié »', 'Plus de nouvelle analyse ; l’application reste consultable en lecture.', 'write']
    ] },
    doublon: { label: 'Événement en double', steps: [
      ['stripe', 'hook', 'checkout.session.completed', 'Le même événement arrive une seconde fois.', 'event'],
      ['hook', 'hook', 'Déjà reçu : ignoré', 'L’identifiant de l’événement est connu : on répond aussitôt, sans rien refaire.'],
      ['base', 'base', 'Rien ne change', 'Pas de deuxième abonnement, pas de deuxième e-mail.', 'ok']
    ] }
  };

  function c23Trajet(panel, ctx) {
    let scen = 'souscription';
    let cur = ctx.print ? 99 : 0;
    let playing = false;
    let width = 600;
    const host = h('div', { class: 'vz-abo-seq' });
    const list = h('ol', { class: 'vz-abo-steps' });
    const live = h('p', { class: 'vz-b-sr', 'aria-live': 'polite' });
    function drawSeq() {
      const steps = C23_SCENARIOS[scen].steps;
      const W = width, top = 54, row = ctx.print ? 27 : 40;
      const H = top + steps.length * row + 14;
      const col = (W - 10) / C23_LANES.length;
      const lx = (id) => 5 + col * (C23_LANES.findIndex((l) => l.id === id) + 0.5);
      const svg = sv('svg', { class: 'vz-abo-svg', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true' });
      C23_LANES.forEach((l) => {
        const x = lx(l.id);
        svg.appendChild(sv('line', { x1: x, x2: x, y1: top - 8, y2: H - 6, class: 'vz-abo-life' }));
        svg.appendChild(sv('rect', { x: x - col / 2 + 3, y: 2, width: col - 6, height: 40, rx: 8, class: 'vz-abo-lane vz-lane-' + l.id }));
        svg.appendChild(sv('text', { x, y: 19, class: 'vz-abo-lane-t', 'text-anchor': 'middle' }, l.label));
        if (col >= 72) svg.appendChild(sv('text', { x, y: 33, class: 'vz-abo-lane-s', 'text-anchor': 'middle' }, l.sub));
      });
      steps.forEach((s, i) => {
        const y = top + 12 + i * row;
        const x1 = lx(s[0]), x2 = lx(s[1]);
        const st = i < cur ? 'done' : i === cur ? 'cur' : 'todo';
        const g = sv('g', { class: 'vz-abo-msg vz-is-' + st + (s[4] ? ' vz-k-' + s[4] : '') });
        if (x1 === x2) {
          g.appendChild(sv('path', { d: 'M' + x1 + ' ' + (y - 8) + ' h18 v16 h-18', class: 'vz-abo-arrow', fill: 'none' }));
        } else {
          const dir = x2 > x1 ? 1 : -1;
          g.appendChild(sv('line', { x1, x2: x2 - dir * 7, y1: y, y2: y, class: 'vz-abo-arrow' + (s[4] === 'faux' ? ' vz-is-dash' : '') }));
          g.appendChild(sv('path', { d: 'M' + x2 + ' ' + y + ' l' + (-dir * 8) + ' -5 v10 z', class: 'vz-abo-head' }));
        }
        const bx = x1 === x2 ? x1 + 26 : (x1 + x2) / 2;
        g.appendChild(sv('circle', { cx: bx, cy: y, r: 9, class: 'vz-abo-num' }));
        g.appendChild(sv('text', { x: bx, y: y + 3.5, 'text-anchor': 'middle', class: 'vz-abo-num-t' }, String(i + 1)));
        if (st === 'cur' && canMove() && x1 !== x2) {
          const pk = sv('circle', { cx: x1, cy: y, r: 5, class: 'vz-abo-packet' });
          pk.appendChild(sv('animate', { attributeName: 'cx', from: x1, to: x2, dur: '0.9s', fill: 'freeze', repeatCount: '1' }));
          g.appendChild(pk);
        }
        svg.appendChild(g);
      });
      clear(host).appendChild(svg);
      clear(list);
      steps.forEach((s, i) => {
        list.appendChild(h('li', { class: 'vz-abo-step vz-is-' + (i < cur ? 'done' : i === cur ? 'cur' : 'todo') + (s[4] ? ' vz-k-' + s[4] : '') },
          h('span', { class: 'vz-abo-step-n' }, String(i + 1)),
          h('span', null, h('strong', null, s[2]), h('span', { class: 'vz-abo-step-d' }, s[3]))));
      });
      if (!ctx.print) {
        const s = steps[Math.min(cur, steps.length - 1)];
        live.textContent = cur >= steps.length ? 'Trajet terminé.' : 'Étape ' + (cur + 1) + ' : ' + s[2] + '. ' + s[3];
      }
    }
    async function play() {
      if (playing) { playing = false; return; }
      playing = true;
      playBtn.textContent = 'Pause';
      const n = C23_SCENARIOS[scen].steps.length;
      if (cur >= n - 1) cur = -1;
      while (playing && cur < n - 1) {
        cur++; drawSeq();
        await wait(canMove() ? 1500 : 600);
      }
      playing = false;
      playBtn.textContent = 'Lecture';
    }
    const playBtn = btn('Lecture', play, { primary: true });
    const scenSeg = ctx.print ? null : seg(Object.keys(C23_SCENARIOS).map((k) => ({ value: k, label: C23_SCENARIOS[k].label })), scen,
      (v) => { scen = v; cur = 0; playing = false; playBtn.textContent = 'Lecture'; drawSeq(); }, 'Scénario', 'vz-abo-scen');
    const ctrls = ctx.print ? null : h('div', { class: 'vz-b-row' }, playBtn,
      btn('Étape suivante', () => { playing = false; cur = Math.min(cur + 1, C23_SCENARIOS[scen].steps.length - 1); drawSeq(); }, { small: true }),
      btn('Recommencer', () => { playing = false; cur = 0; drawSeq(); }, { small: true }));
    add(panel, scenSeg, ctrls, host, list, live,
      ctx.print ? null : note('La vérité vient de Stripe : l’application ne croit que sa table d’abonnements, tenue à jour par des webhooks signés, dédoublonnés et traités rapidement.'));
    onResize(host, (w) => { width = Math.max(300, w); drawSeq(); });
    width = Math.max(300, host.clientWidth || 600);
    drawSeq();
  }

  const C23_LIGNES = [
    { nom: 'Réservation coachs', org: 'alpha' },
    { nom: 'Planning du club', org: 'beta' },
    { nom: 'Atelier céramique', org: 'alpha' },
    { nom: 'Factures express', org: 'beta' },
    { nom: 'Menu du bistrot', org: 'beta' }
  ];
  const C23_ORGS = { alpha: 'Alpha', beta: 'Bêta' };

  function c23Locataires(panel, ctx) {
    const S = { qui: 'A', rls: true, voie: 'nav', filtre: true };
    const QUI = {
      A: { label: 'A, propriétaire d’Alpha', orgs: ['alpha'], active: 'alpha' },
      B: { label: 'B, propriétaire de Bêta', orgs: ['beta'], active: 'beta' },
      AB: { label: 'A invité dans Bêta, Bêta sélectionnée', orgs: ['alpha', 'beta'], active: 'beta' }
    };
    const table = h('div', { class: 'vz-abo-table', role: 'table', 'aria-label': 'Table applications' });
    const verdict = h('p', { class: 'vz-abo-verdict', 'aria-live': 'polite' });
    const sql = h('pre', { class: 'vz-b-pre vz-abo-sql' });
    function visible(l) {
      const q = QUI[S.qui];
      if (S.voie === 'nav') {
        if (!S.rls) return true;
        return q.orgs.includes(l.org) && l.org === q.active;
      }
      return S.filtre ? l.org === q.active : true;
    }
    function draw() {
      const q = QUI[S.qui];
      clear(table);
      table.appendChild(h('div', { class: 'vz-abo-tr vz-abo-th', role: 'row' }, ['nom', 'organisation_id', 'visible ?'].map((c) => h('span', { role: 'columnheader' }, c))));
      let n = 0, fuite = false;
      C23_LIGNES.forEach((l) => {
        const v = visible(l);
        if (v) n++;
        const autre = l.org !== q.active;
        if (v && autre) fuite = true;
        table.appendChild(h('div', { class: 'vz-abo-tr vz-org-' + l.org + (v ? ' vz-is-vis' : ' vz-is-hid') + (v && autre ? ' vz-is-fuite' : ''), role: 'row' },
          h('span', { role: 'cell' }, l.nom),
          h('span', { role: 'cell' }, h('span', { class: 'vz-abo-org vz-org-' + l.org }, C23_ORGS[l.org])),
          h('span', { role: 'cell', class: 'vz-abo-vis' }, pixIcon(v ? (autre ? PIX.cross : PIX.check) : PIX.lock, 'currentColor', 12), v ? (autre ? ' fuite' : ' oui') : ' non')));
      });
      verdict.textContent = (S.qui === 'B' ? 'B' : 'A') + ' voit ' + n + ' ligne' + (n > 1 ? 's' : '') + ' sur ' + C23_LIGNES.length + '. ' +
        (fuite ? (S.voie === 'nav' ? 'Sans règle, toutes les organisations dorment côte à côte : la séparation n’existe que si quelqu’un l’a écrite.' : 'La clé secrète passe à travers les murs : la fonction doit filtrer elle-même par organisation.')
          : 'Chaque organisation se croit seule.');
      verdict.classList.toggle('vz-is-bad', fuite);
      sql.textContent = S.voie === 'nav'
        ? (S.rls ? 'alter table public.applications enable row level security;\n\ncreate policy "Les membres lisent les applications de leur organisation"\non public.applications for select\nto authenticated\nusing ( public.est_membre(organisation_id) );' : '-- RLS désactivée : aucune règle, aucun mur.\nselect * from public.applications;')
        : (S.filtre ? '-- Fonction serveur, clé secrète : la RLS ne s’applique pas.\n-- Elle filtre donc elle-même :\nselect * from applications\nwhere organisation_id = :organisation_active\n  and est_membre_de(:utilisateur, :organisation_active);' : '-- Fonction serveur, clé secrète, sans filtre :\nselect * from applications;  -- toutes les organisations');
    }
    const qui = ctx.print ? null : seg(Object.keys(QUI).map((k) => ({ value: k, label: QUI[k].label })), S.qui, (v) => { S.qui = v; draw(); }, 'Utilisateur connecté', 'vz-abo-qui');
    const voie = ctx.print ? null : seg([{ value: 'nav', label: 'Requête du navigateur' }, { value: 'fn', label: 'Fonction serveur, clé secrète' }], S.voie, (v) => { S.voie = v; opt.hidden = false; drawOpt(); draw(); }, 'Origine de la requête');
    const opt = h('div', { class: 'vz-b-row' });
    function drawOpt() {
      clear(opt);
      if (S.voie === 'nav') opt.appendChild(chip('Règle RLS par appartenance', S.rls, (v) => { S.rls = v; draw(); }));
      else opt.appendChild(chip('Filtre par organisation dans la fonction', S.filtre, (v) => { S.filtre = v; draw(); }));
    }
    if (ctx.print) {
      add(panel, h('p', { class: 'vz-abo-printctx' }, 'Connecté : A, propriétaire d’Alpha · requête du navigateur · RLS par appartenance'), h('div', { class: 'vz-abo-tgrid' }, table, sql), verdict);
      draw();
      return;
    }
    drawOpt();
    add(panel, kicker('Qui est connecté ?'), qui, kicker('D’où vient la requête ?'), voie, opt,
      h('div', { class: 'vz-abo-tgrid' }, table, sql), verdict,
      note('Test minimal : deux comptes, deux organisations, deux navigateurs, une adresse de rapport collée de l’un à l’autre.'));
    draw();
  }

  VIZ['ch23-abonnement'] = {
    chapitre: 'ch23',
    titre: 'Le trajet d’un abonnement',
    consigne: 'Suivez un paiement de Stripe jusqu’à la base, puis vérifiez que chaque locataire reste chez lui.',
    ancre: 'La facture et la TVA',
    render(el, ctx) {
      root(el, 'abo', ctx);
      tabbed(el, ctx, [
        { label: 'Le trajet d’un paiement', render: (p) => c23Trajet(p, ctx) },
        { label: 'Une maison, des locataires', render: (p) => c23Locataires(p, ctx) }
      ], 'Abonnements et locataires');
    }
  };

  /* ================= ch24 : Le runbook J-14 → J+7 ================= */

  const C24_JALONS = [
    { j: 'J-14', d: -14, titre: 'Poser le décor', items: [
      'Le périmètre de la version est gelé : seulement des corrections.',
      'Les environnements existent, avec des clés distinctes.',
      'La surveillance des erreurs reçoit déjà celles de la préproduction.',
      'Une surveillance de disponibilité interroge l’adresse de préproduction.',
      'Trois à cinq tests de bout en bout couvrent les parcours qui rapportent.',
      'Un test de charge a tourné contre la préproduction, jamais contre la production.',
      'Une sauvegarde a été restaurée pour de vrai, au moins une fois.',
      'Les migrations en attente ont été relues : aucune ne supprime ni ne renomme une colonne utilisée.'
    ] },
    { j: 'J-7', d: -7, titre: 'Fermer les portes', items: [
      'Les listes du chapitre 20 et de l’annexe B sont cochées.',
      'Le SMTP de Resend remplace le serveur par défaut de Supabase.',
      'Les limites de débit de l’authentification sont ajustées à l’audience attendue.',
      'Le scan de sécurité de Lovable est propre.',
      'Des alertes de budget sont réglées chez chaque prestataire.',
      'Le plafond de la clé Anthropic de production est réglé, le quota d’analyses appliqué côté serveur.',
      'Le webhook Stripe de production a son secret, et un paiement live a débloqué l’accès.',
      'Le portail client de Stripe permet de résilier en ligne.',
      'La PITR est activée sur le projet de production.',
      'Une page de statut existe, et un modèle d’e-mail d’incident est prêt.'
    ] },
    { j: 'J-1', d: -1, titre: 'La veille', items: [
      'Sauvegarde manuelle de la base de production, rangée hors du projet.',
      'Identifiant de la version en ligne noté : c’est le point de retour.',
      'Variables de production relues une à une, comparées à .env.example.',
      'Version finale déployée en préproduction, tests de bout en bout déroulés.',
      'Gel : plus aucun commit sur la branche principale.',
      'Les personnes concernées connaissent l’heure et le canal.'
    ] },
    { j: 'J', d: 0, titre: 'Ouvrir, puis regarder', items: [
      'Publier la version validée.',
      'Créer un compte avec une adresse neuve, confirmation d’e-mail comprise.',
      'Souscrire le plus petit abonnement avec une vraie carte, vérifier, rembourser.',
      'Déposer une demande d’audit et attendre le rapport jusqu’au bout.',
      'Refaire le test des deux organisations.',
      'Garder ouverts une heure les erreurs, les journaux et la console Anthropic.',
      'Noter l’heure d’ouverture et tout ce qui a surpris.'
    ] },
    { j: 'J+7', d: 7, titre: 'Faire les comptes', items: [
      'Les erreurs de la semaine sont triées : corrigées, planifiées ou acceptées.',
      'Factures et compteurs correspondent aux prévisions, coût moyen d’un audit compris.',
      'Les journaux ne contiennent ni e-mail, ni mot de passe, ni jeton, ni code client.',
      'Chaque incident ou intervention manuelle a donné lieu à un postmortem.',
      'Les accès temporaires ouverts pour l’ouverture sont refermés.',
      'Le gel est levé, et la prochaine version a son propre J-14.'
    ] }
  ];
  const C24_KEY = 'vz-runbook-ch24';

  function ring(pct, size) {
    const r = size / 2 - 4, c = 2 * Math.PI * r;
    return sv('svg', { class: 'vz-run-ring', viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, 'aria-hidden': 'true' },
      sv('circle', { cx: size / 2, cy: size / 2, r, class: 'vz-run-ring-bg' }),
      sv('circle', { cx: size / 2, cy: size / 2, r, class: 'vz-run-ring-fg', 'stroke-dasharray': c, 'stroke-dashoffset': c * (1 - pct), transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')' }));
  }

  VIZ['ch24-runbook'] = {
    chapitre: 'ch24',
    titre: 'Le runbook, de J-14 à J+7',
    consigne: 'Choisissez un jalon de la frise et cochez ce qui est fait ; copiez le tout en RUNBOOK.md.',
    ancre: 'Surveiller : quatre sentinelles',
    render(el, ctx) {
      root(el, 'run', ctx);
      let etat = C24_JALONS.map((j) => j.items.map(() => false));
      let ouverture = '';
      if (!ctx.print) {
        try {
          const s = JSON.parse(localStorage.getItem(C24_KEY) || 'null');
          if (s && Array.isArray(s.etat) && s.etat.length === etat.length) { etat = etat.map((a, i) => a.map((_, k) => !!(s.etat[i] || [])[k])); ouverture = s.ouverture || ''; }
        } catch (e) { /* stockage indisponible */ }
      }
      const save = () => { try { localStorage.setItem(C24_KEY, JSON.stringify({ etat, ouverture })); } catch (e) { /* ignoré */ } };
      let sel = 0;

      if (ctx.print) {
        add(el, h('div', { class: 'vz-run-frise vz-is-print', 'aria-hidden': 'true' }, C24_JALONS.map((j) => h('div', { class: 'vz-run-node' }, h('span', { class: 'vz-run-dot' }), h('strong', null, j.j), h('span', null, j.titre)))),
          h('div', { class: 'vz-run-printgrid' }, C24_JALONS.map((j) => h('div', { class: 'vz-run-pcard' },
            h('p', { class: 'vz-run-ptitle' }, j.j + ' · ' + j.titre),
            h('ul', null, j.items.map((it) => h('li', null, h('span', { class: 'vz-run-box', 'aria-hidden': 'true' }), it)))))),
          note('À recopier dans RUNBOOK.md, à la racine du dépôt, pour que Claude le lise aussi. Cochez et datez chaque case.'));
        return;
      }

      const frise = h('div', { class: 'vz-run-frise', role: 'group', 'aria-label': 'Jalons du runbook' });
      const rail = h('div', { class: 'vz-run-rail', 'aria-hidden': 'true' }, h('span', { class: 'vz-run-rail-fill' }));
      const panel = h('div', { class: 'vz-run-panel' });
      const global = h('div', { class: 'vz-run-global', 'aria-live': 'polite' });
      const warn = h('p', { class: 'vz-b-alert', hidden: true });
      const dateIn = h('input', { type: 'date', class: 'vz-b-input vz-run-date', 'aria-label': 'Date d’ouverture (jour J)', value: ouverture });
      dateIn.addEventListener('input', () => { ouverture = dateIn.value; save(); draw(false); });

      function dateDe(d) {
        if (!ouverture) return '';
        const t = new Date(ouverture + 'T12:00:00');
        if (isNaN(t)) return '';
        t.setDate(t.getDate() + d);
        return t.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      const nodes = C24_JALONS.map((j, i) => {
        const b = h('button', { type: 'button', class: 'vz-run-node' });
        b.addEventListener('click', () => { sel = i; draw(true); });
        return b;
      });
      add(frise, rail, nodes);
      function draw(panelToo) {
        let tot = 0, ok = 0;
        C24_JALONS.forEach((j, i) => {
          const n = etat[i].filter(Boolean).length;
          tot += j.items.length; ok += n;
          const b = nodes[i];
          b.className = 'vz-run-node' + (i === sel ? ' vz-is-sel' : '') + (n === j.items.length ? ' vz-is-done' : '');
          b.setAttribute('aria-pressed', String(i === sel));
          b.setAttribute('aria-label', j.j + ', ' + j.titre + ' : ' + n + ' sur ' + j.items.length);
          clear(b);
          add(b, h('span', { class: 'vz-run-ringwrap' }, ring(n / j.items.length, 46), h('span', { class: 'vz-run-ringtxt' }, n === j.items.length ? '✓' : n + '/' + j.items.length)),
            h('strong', { class: 'vz-run-j' }, j.j),
            h('span', { class: 'vz-run-sub' }, j.titre),
            ouverture ? h('span', { class: 'vz-run-date-l' }, dateDe(j.d)) : null);
        });
        rail.firstChild.style.width = (ok / tot * 100) + '%';
        clear(global);
        add(global, h('strong', null, Math.round(ok / tot * 100) + ' %'), ' du runbook coché · ', ok + ' cases sur ' + tot);
        if (panelToo) drawPanel();
        if (ouverture) {
          const t = new Date(ouverture + 'T12:00:00');
          const wd = t.getDay();
          warn.hidden = !(wd === 5 || wd === 6 || wd === 0);
          warn.textContent = 'Le jour J tombe un ' + t.toLocaleDateString('fr-FR', { weekday: 'long' }) + ' : ouvrez en début de semaine et en journée, jamais un vendredi soir.';
        } else warn.hidden = true;
      }
      function drawPanel() {
        const j = C24_JALONS[sel];
        clear(panel);
        add(panel, h('div', { class: 'vz-run-phead' }, h('span', { class: 'vz-run-pj' }, j.j), h('strong', null, j.titre)),
          h('ul', { class: 'vz-run-list' }, j.items.map((it, k) => {
            const cb = h('input', { type: 'checkbox', class: 'vz-run-cb' });
            cb.checked = etat[sel][k];
            const li = h('li', { class: etat[sel][k] ? 'vz-is-ok' : '' }, h('label', null, cb, h('span', null, it)));
            cb.addEventListener('change', () => { etat[sel][k] = cb.checked; li.className = cb.checked ? 'vz-is-ok' : ''; save(); draw(false); });
            return li;
          })));
      }
      function markdown() {
        return '# RUNBOOK\n\n' + C24_JALONS.map((j, i) => '## ' + j.j + ' : ' + j.titre + (ouverture ? ' (' + dateDe(j.d) + ')' : '') + '\n\n' +
          j.items.map((it, k) => '- [' + (etat[i][k] ? 'x' : ' ') + '] ' + it).join('\n')).join('\n\n') +
          '\n\n## Retour arrière\n\n- Code :\n- Base de données :\n- Variables d’environnement :\n\n## Contacts\n';
      }
      const copyBtn = btn('Copier en RUNBOOK.md', () => copier(ctx, markdown(), copyBtn), { primary: true });
      add(el,
        h('div', { class: 'vz-run-top' }, h('label', { class: 'vz-run-datelab' }, h('span', null, 'Jour J, si vous le connaissez'), dateIn), global),
        warn, frise, panel,
        h('div', { class: 'vz-b-row' }, copyBtn, btn('Tout décocher', () => { etat = etat.map((a) => a.map(() => false)); save(); draw(true); }, { small: true })),
        note('Vos coches restent dans ce navigateur. Le modèle est écrit pour le SaaS relié à son propre Supabase.'));
      draw(true);
    }
  };

  /* ================= ch25 : Ce qui casse en premier ================= */

  const C25_PALIERS = [
    { max: 3000, label: '~1 000 MAU', infra: [45, 55], pitrInclus: false },
    { max: 30000, label: '~10 000 MAU', infra: [85, 130], pitrInclus: false },
    { max: Infinity, label: '~100 000 MAU', infra: [300, 700], pitrInclus: true }
  ];

  VIZ['ch25-ruptures'] = {
    chapitre: 'ch25',
    titre: 'Ce qui casse en premier',
    consigne: 'Faites monter le nombre d’abonnés : les ruptures s’allument dans l’ordre, appliquez le remède, lisez la facture.',
    ancre: 'Une échelle de décisions',
    render(el, ctx) {
      root(el, 'scale', ctx);
      const S = {
        pos: ctx.print ? 33.4 : 23.3, modele: 'sonnet', lots: false,
        tin: 150000, tout: 10000, prix: { sonnet: [2, 10], opus: [4, 20] },
        auditsPar: 2, plafond: 500, minutes: 15, heures: 150, pitr: 100,
        regle: {}
      };
      const users = () => Math.round(Math.pow(10, 2 + 3 * S.pos / 100) / 10) * 10;
      const posOf = (u) => (Math.log10(u) - 2) / 3 * 100;
      const coutAudit = () => { const p = S.prix[S.modele]; return (S.tin * p[0] + S.tout * p[1]) / 1e6 * (S.lots ? 0.5 : 1); };

      function ruptures() {
        const ca = coutAudit();
        const relSeuil = S.heures * (S.regle.relecture ? 2 : 1) * 60 / (S.auditsPar * S.minutes);
        const plafSeuil = S.plafond / (S.auditsPar * ca);
        return [
          { id: 'file', nom: 'Les audits bloquent les requêtes', seuil: 300, approx: true, mesure: 'Des centaines de demandes en un week-end : rapports en retard, erreurs 429.', remede: 'File d’attente, nouvelles tentatives espacées', saas: true },
          { id: 'relecture', nom: 'La relecture humaine', seuil: relSeuil, mesure: fmt(S.minutes) + ' min par rapport, ' + fmt(S.heures) + ' h disponibles par mois' + (S.regle.relecture ? ', deux personnes' : ''), remede: 'Une deuxième personne formée, une grille de relecture', partiel: true },
          { id: 'plafond', nom: 'Le plafond de dépense Anthropic', seuil: plafSeuil, mesure: 'Plafond ' + usd(S.plafond) + ' par mois, ' + usd(ca, 2) + ' par audit : les audits s’arrêtent pour tout le monde.', remede: 'Monter de palier avant d’en avoir besoin' },
          { id: 'rls', nom: 'Des règles RLS lentes', seuil: 1000, zone: 1, mesure: 'auth.uid() réévalué pour chaque ligne.', remede: '(select auth.uid()) et index sur organisation_id' },
          { id: 'cnx', nom: 'Les connexions saturent', seuil: 1600, zone: 2, mesure: '60 connexions directes sur la plus petite instance payante.', remede: 'Pooler en mode transaction' },
          { id: 'lignes', nom: 'Listes tronquées à 1 000 lignes', seuil: 2500, zone: 3, mesure: 'L’API de données plafonne, sans erreur.', remede: 'Pagination par curseur' },
          { id: 'ram', nom: 'Les données ne tiennent plus en mémoire', seuil: 4000, zone: 4, mesure: 'Chaque lecture devient deux ou trois fois plus lente.', remede: 'Taille d’instance au-dessus, après les index' }
        ].sort((a, b) => a.seuil - b.seuil);
      }

      const ruler = h('div', { class: 'vz-scale-ruler', 'aria-hidden': 'true' });
      const slider = h('input', { type: 'range', min: 0, max: 100, step: 0.1, value: S.pos, class: 'vz-b-range-input vz-scale-slider', 'aria-label': 'Nombre d’abonnés actifs' });
      slider.addEventListener('input', () => { S.pos = Number(slider.value); draw(); });
      const big = h('div', { class: 'vz-scale-big', 'aria-live': 'polite' });
      const list = h('ol', { class: 'vz-scale-list' });
      const cost = h('div', { class: 'vz-scale-cost' });

      function remChip(r) {
        const c = chip(r.remede, !!S.regle[r.id], (v) => {
          S.regle[r.id] = v; draw();
          const f = list.querySelector('[data-rid="' + r.id + '"]');
          if (f) f.focus();
        }, 'vz-scale-rem');
        c.dataset.rid = r.id;
        return c;
      }
      function draw() {
        const u = users();
        slider.setAttribute('aria-valuetext', fmt(u) + ' abonnés');
        const rs = ruptures();
        /* Règle graduée */
        clear(ruler);
        add(ruler, h('div', { class: 'vz-scale-zone', style: { left: posOf(1000) + '%', width: (posOf(10000) - posOf(1000)) + '%' } }, h('span', null, 'zone 1 000 → 10 000')));
        [100, 1000, 10000, 100000].forEach((t) => ruler.appendChild(h('span', { class: 'vz-scale-tick', style: { left: posOf(t) + '%' } }, fmt(t))));
        rs.forEach((r) => {
          if (r.seuil < 100 || r.seuil > 100000) return;
          const st = S.regle[r.id] && !r.partiel ? 'ok' : u >= r.seuil ? 'ko' : 'idle';
          ruler.appendChild(h('span', { class: 'vz-scale-pin vz-is-' + st, style: { left: posOf(r.seuil) + '%' }, title: r.nom }));
        });
        ruler.appendChild(h('span', { class: 'vz-scale-cursor', style: { left: S.pos + '%' } }));
        /* Chiffres clés */
        const audits = u * S.auditsPar;
        const heures = audits * S.minutes / 60;
        clear(big);
        add(big,
          h('div', { class: 'vz-scale-users' }, h('strong', null, fmt(u)), h('span', null, 'abonnés actifs')),
          h('div', { class: 'vz-scale-mini' }, h('span', null, h('strong', null, fmt(audits)), ' audits / mois'), h('span', null, h('strong', null, fmt(heures)), ' h de relecture')));
        /* Ruptures, dans l'ordre */
        clear(list);
        let premiere = true;
        rs.forEach((r) => {
          const regle = !!S.regle[r.id] && !r.partiel;
          const casse = !regle && u >= r.seuil;
          const proche = !regle && !casse && u >= r.seuil * 0.6;
          const st = regle ? 'ok' : casse ? 'ko' : proche ? 'warn' : 'idle';
          const seuilTxt = r.zone ? 'zone 1 000 → 10 000, rang ' + r.zone + ' sur 4' : r.approx ? 'dès quelques centaines' : 'vers ' + fmt(Math.round(r.seuil / 10) * 10) + ' abonnés';
          const li = h('li', { class: 'vz-scale-item vz-is-' + st + (casse && premiere ? ' vz-is-first' : '') },
            h('span', { class: 'vz-scale-ic', 'aria-hidden': 'true' }, st === 'ok' ? pixIcon(PIX.check, 'currentColor', 12) : st === 'ko' ? pixIcon(PIX.cross, 'currentColor', 12) : ''),
            h('div', { class: 'vz-scale-txt' },
              h('p', { class: 'vz-scale-nom' }, r.nom, r.saas ? h('span', { class: 'vz-scale-tag' }, 'pour notre SaaS, en premier') : null),
              h('p', { class: 'vz-scale-mes' }, r.mesure),
              h('p', { class: 'vz-scale-seuil' }, (casse ? 'Rompu · ' : st === 'warn' ? 'Sous tension · ' : regle ? 'Réglé · ' : '') + seuilTxt)),
            ctx.print ? h('p', { class: 'vz-scale-rem-p' }, 'Remède : ' + r.remede) : remChip(r));
          if (casse) premiere = false;
          list.appendChild(li);
        });
        /* Facture */
        const pal = C25_PALIERS.find((p) => u <= p.max);
        const ia = audits * coutAudit();
        const pitr = pal.pitrInclus ? 0 : S.pitr;
        const lo = pal.infra[0] + pitr + ia, hi = pal.infra[1] + pitr + ia;
        const parts = [
          { k: 'infra', l: 'Base, hébergement, surveillance (' + pal.label + ')', v: (pal.infra[0] + pal.infra[1]) / 2, t: usd(pal.infra[0]) + ' à ' + usd(pal.infra[1]) },
          { k: 'pitr', l: pal.pitrInclus ? 'Restauration à la seconde (incluse dans le palier)' : 'Restauration à la seconde (PITR)', v: pitr, t: usd(pitr) },
          { k: 'ia', l: 'Appels à Claude (' + (S.modele === 'sonnet' ? 'Sonnet 5' : 'Opus 5.5') + (S.lots ? ', par lots' : '') + ')', v: ia, t: usd(ia) }
        ];
        const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
        clear(cost);
        add(cost,
          h('div', { class: 'vz-scale-cost-head' }, h('span', null, 'Facture mensuelle estimée'), h('strong', null, usd(lo) + ' à ' + usd(hi))),
          h('div', { class: 'vz-scale-stack', 'aria-hidden': 'true' }, parts.map((p) => h('span', { class: 'vz-scale-seg vz-k-' + p.k, style: { flexGrow: Math.max(p.v, 0.0001) } }))),
          h('ul', { class: 'vz-scale-legend' }, parts.map((p) => h('li', null, h('span', { class: 'vz-scale-sw vz-k-' + p.k }), h('span', null, p.l), h('strong', null, p.t)))),
          ia > tot / 2 ? h('p', { class: 'vz-scale-hint' }, 'L’IA dépasse tout le reste réuni : c’est là qu’il faut regarder en premier.') : null);
      }

      const modele = seg([{ value: 'sonnet', label: 'Sonnet 5' }, { value: 'opus', label: 'Opus 5.5' }], S.modele, (v) => { S.modele = v; draw(); }, 'Modèle');
      const mode = seg([{ value: false, label: 'Appel direct' }, { value: true, label: 'Traitement par lots (÷ 2)' }], S.lots, (v) => { S.lots = v; draw(); }, 'Mode d’appel');
      const hyp = h('details', { class: 'vz-scale-hyp' },
        h('summary', null, 'Hypothèses modifiables'),
        h('div', { class: 'vz-scale-hyp-grid' },
          numIn({ label: 'Tokens envoyés par audit', value: S.tin, step: 10000, onInput: (v) => { S.tin = v; draw(); } }),
          numIn({ label: 'Tokens reçus par audit', value: S.tout, step: 1000, onInput: (v) => { S.tout = v; draw(); } }),
          numIn({ label: 'Sonnet 5, entrée', value: 2, step: 0.5, unit: '$ / M', onInput: (v) => { S.prix.sonnet[0] = v; draw(); } }),
          numIn({ label: 'Sonnet 5, sortie', value: 10, step: 0.5, unit: '$ / M', onInput: (v) => { S.prix.sonnet[1] = v; draw(); } }),
          numIn({ label: 'Opus 5.5, entrée', value: 4, step: 0.5, unit: '$ / M', onInput: (v) => { S.prix.opus[0] = v; draw(); } }),
          numIn({ label: 'Opus 5.5, sortie', value: 20, step: 0.5, unit: '$ / M', onInput: (v) => { S.prix.opus[1] = v; draw(); } }),
          numIn({ label: 'Analyses par abonné et par mois', value: S.auditsPar, step: 1, onInput: (v) => { S.auditsPar = Math.max(0.1, v); draw(); } }),
          numIn({ label: 'Plafond de dépense Anthropic', value: S.plafond, step: 50, unit: '$ / mois', onInput: (v) => { S.plafond = Math.max(1, v); draw(); } }),
          numIn({ label: 'Relecture par rapport', value: S.minutes, step: 1, unit: 'min', onInput: (v) => { S.minutes = Math.max(1, v); draw(); } }),
          numIn({ label: 'Heures de relecture disponibles (hypothèse)', value: S.heures, step: 10, unit: 'h / mois', onInput: (v) => { S.heures = Math.max(1, v); draw(); } }),
          numIn({ label: 'PITR sur sept jours', value: S.pitr, step: 10, unit: '$ / mois', onInput: (v) => { S.pitr = v; draw(); } })));

      if (ctx.print) {
        add(el, h('p', { class: 'vz-scale-printctx' }, 'État figé : 1 000 abonnés actifs, Sonnet 5 en appel direct, deux analyses par abonné et par mois.'),
          h('div', { class: 'vz-scale-head' }, big, h('div', { class: 'vz-scale-rulerwrap' }, ruler)),
          h('div', { class: 'vz-scale-grid' }, h('div', null, kicker('Ce qui casse, dans l’ordre'), list), cost),
          note('Ordres de grandeur du chapitre (appssemble, mai 2026, et grilles officielles), ' + TARIF + '.'));
        draw();
        return;
      }
      add(el,
        h('div', { class: 'vz-scale-head' }, big, h('div', { class: 'vz-scale-rulerwrap' }, ruler, slider)),
        h('div', { class: 'vz-b-row vz-scale-opts' }, modele, mode),
        h('div', { class: 'vz-scale-grid' }, h('div', null, kicker('Ce qui casse, dans l’ordre'), list), h('div', null, kicker('Ce que coûte ce palier'), cost)),
        hyp,
        note('Ordre et seuils indicatifs (appssemble, mai 2026 ; grilles officielles). Grossir ne corrige pas une requête mal écrite : réglez d’abord RLS, index et pagination. Prix ' + TARIF + '.'));
      draw();
    }
  };

  /* ================= ch26 : Boussole juridique ================= */

  const C26_AXES = [
    { id: 'rgpd', nom: 'RGPD', qs: [
      ['Chaque donnée collectée a une raison d’être, écrite dans le registre des traitements.', 'Tenez le registre des traitements (modèle de la CNIL) et retirez les champs sans raison d’être.'],
      ['L’accès aux dépôts des clients est en lecture seule, et le code copié est effacé après l’audit.', 'Demandez la lecture seule et fixez une durée de conservation, écrite dans vos conditions.'],
      ['La base est hébergée dans une région européenne.', 'Choisissez une région européenne quand l’outil le permet (Paris, pour la base du SaaS).'],
      ['Les accords de sous-traitance des prestataires sont acceptés, et le vôtre est prêt.', 'Acceptez ceux de Supabase, Lovable, Anthropic, Resend et Stripe ; préparez le vôtre pour vos clients.'],
      ['Une fuite à risque serait notifiée à la CNIL, en principe sous 72 heures.', 'Ajoutez cette ligne (article 33 du RGPD) à votre runbook d’incident.']
    ] },
    { id: 'cgv', nom: 'CGV', qs: [
      ['Vous savez si vous vendez à des consommateurs, à des professionnels, ou aux deux.', 'Tranchez, puis traitez les deux cas dans vos CGV ou séparez les parcours d’achat.'],
      ['L’abonnement se résilie en ligne, simplement.', 'Activez la résiliation dans le portail client de Stripe et rendez le bouton visible : jusqu’à 15 000 € d’amende pour une personne physique, 75 000 € pour une personne morale.'],
      ['Le droit de rétractation et le médiateur de la consommation figurent dans vos conditions.', 'Faites relire le passage sur la rétractation et désignez un médiateur.'],
      ['Les CGV sont acceptées avant le paiement, par une case à cocher.', 'Présentez-les au bon moment : des conditions cachées en pied de page protègent moins.'],
      ['Le rapport relève d’une obligation de moyens, pas d’une garantie de sécurité.', 'Écrivez-le dans l’offre, dans les CGV et en tête de chaque rapport.']
    ] },
    { id: 'pi', nom: 'Propriété', qs: [
      ['Vos CGV cèdent au client l’usage de son rapport ; vous gardez grille, prompts et skills.', 'Écrivez cette règle dans vos CGV.'],
      ['Vous conservez l’historique Git, le journal de décisions et le cahier des charges.', 'Gardez-les : ils témoignent de vos choix humains.'],
      ['Votre valeur repose sur la marque, la méthode et les clients, pas sur un droit d’auteur incertain.', 'Un code généré par IA peut n’appartenir à personne : bâtissez ailleurs votre protection.'],
      ['Votre déclaration d’usage de l’IA (KDP, avant-propos) est exacte.', 'Répondez exactement à KDP et dites-le dans l’avant-propos.']
    ] },
    { id: 'ai', nom: 'AI Act', qs: [
      ['Les personnes sont informées qu’elles interagissent avec une IA.', 'Article 50, depuis le 2 août 2026 : informez dès le questionnaire, avant l’envoi.'],
      ['Chaque rapport indique qu’il a été préparé avec une IA, puis relu par une personne.', 'Ajoutez la mention en tête du rapport : c’est aussi un argument de vente.'],
      ['Aucun usage « à haut risque » (recrutement, notation de crédit, évaluation scolaire).', 'Usage à haut risque : faites-vous accompagner, ce livre ne suffit pas.']
    ] }
  ];

  VIZ['ch26-boussole'] = {
    chapitre: 'ch26',
    titre: 'Boussole juridique',
    consigne: 'Répondez honnêtement : la boussole montre où vous êtes couvert et liste ce qu’il reste à faire.',
    ancre: 'Le RGPD commence au premier e-mail',
    render(el, ctx) {
      root(el, 'droit', ctx);
      const rep = C26_AXES.map((a) => a.qs.map(() => false));
      let ia = true;
      const CX = 180, CY = 135, R = 95;
      const ang = [-90, 0, 90, 180].map((d) => d * Math.PI / 180);
      const svg = sv('svg', { class: 'vz-droit-svg', viewBox: '0 0 360 270', 'aria-hidden': 'true' });
      const pt = (a, r) => (CX + Math.cos(a) * r).toFixed(1) + ',' + (CY + Math.sin(a) * r).toFixed(1);
      [0.25, 0.5, 0.75, 1].forEach((k) => svg.appendChild(sv('polygon', { class: 'vz-droit-ring', points: ang.map((a) => pt(a, R * k)).join(' ') })));
      ang.forEach((a) => svg.appendChild(sv('line', { class: 'vz-droit-axis', x1: CX, y1: CY, x2: CX + Math.cos(a) * R, y2: CY + Math.sin(a) * R })));
      const poly = sv('polygon', { class: 'vz-droit-poly', points: ang.map(() => CX + ',' + CY).join(' ') });
      svg.appendChild(poly);
      const pos = [[CX, CY - R - 14, 'middle'], [CX + R + 10, CY + 5, 'start'], [CX, CY + R + 24, 'middle'], [CX - R - 10, CY + 5, 'end']];
      const labels = C26_AXES.map((ax, i) => {
        const t = sv('text', { class: 'vz-droit-lab', x: pos[i][0], y: pos[i][1], 'text-anchor': pos[i][2] },
          sv('tspan', { class: 'vz-droit-lab-n' }, ax.nom), sv('tspan', { class: 'vz-droit-pct', dx: 6 }, ''));
        svg.appendChild(t);
        return t;
      });
      svg.appendChild(sv('circle', { cx: CX, cy: CY, r: 3.5, class: 'vz-droit-center' }));

      let cur = [0, 0, 0, 0], anim = null;
      function scores() {
        return C26_AXES.map((ax, i) => (ax.id === 'ai' && !ia) ? 1 : rep[i].filter(Boolean).length / ax.qs.length);
      }
      function setPoly(v) {
        poly.setAttribute('points', v.map((k, i) => pt(ang[i], R * Math.max(k, 0.04))).join(' '));
        v.forEach((k, i) => { labels[i].lastChild.textContent = ctx.print ? '' : Math.round(k * 100) + ' %'; });
      }
      function tween(to) {
        if (!canMove() || ctx.print) { cur = to; setPoly(cur); return; }
        const from = cur.slice(), t0 = performance.now();
        cancelAnimationFrame(anim);
        const step = (t) => {
          const p = Math.min(1, (t - t0) / 420), e = 1 - Math.pow(1 - p, 3);
          cur = from.map((f, i) => f + (to[i] - f) * e);
          setPoly(cur);
          if (p < 1) anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
      }

      const actions = h('ol', { class: 'vz-droit-actions' });
      let toutVoir = false;
      const resume = h('p', { class: 'vz-droit-resume', 'aria-live': 'polite' });
      function draw() {
        const sc = scores();
        tween(sc);
        clear(actions);
        let n = 0;
        const items = [];
        C26_AXES.forEach((ax, i) => {
          if (ax.id === 'ai' && !ia) return;
          ax.qs.forEach((q, k) => {
            if (rep[i][k]) return;
            n++;
            items.push(h('li', null, h('span', { class: 'vz-droit-tag vz-t-' + ax.id }, ax.nom), q[1]));
          });
        });
        const max = toutVoir ? items.length : 5;
        add(actions, items.slice(0, max));
        if (items.length > max) actions.appendChild(h('li', { class: 'vz-droit-more' }, btn('Voir les ' + (items.length - max) + ' autres actions', () => { toutVoir = true; draw(); }, { small: true })));
        const tot = C26_AXES.reduce((a, ax, i) => a + ((ax.id === 'ai' && !ia) ? 0 : ax.qs.length), 0);
        resume.textContent = n === 0 ? 'Tous les repères sont cochés. Faites maintenant relire vos documents par un professionnel.'
          : (tot - n) + ' repère' + (tot - n > 1 ? 's' : '') + ' sur ' + tot + ' en place, ' + n + ' action' + (n > 1 ? 's' : '') + ' à mener.';
      }

      const disclaimer = h('p', { class: 'vz-b-alert vz-droit-disc' }, 'Des repères, pas un avis juridique. Pour une activité établie en France et des clients en Europe, règles vérifiées en septembre 2026. Avant le premier euro, faites relire vos documents par un avocat ou un juriste.');

      if (ctx.print) {
        add(el, disclaimer, h('div', { class: 'vz-droit-printgrid' },
          h('div', { class: 'vz-droit-compass' }, svg),
          h('div', { class: 'vz-droit-plist' }, C26_AXES.map((ax) => h('div', { class: 'vz-droit-pgroup' },
            h('p', { class: 'vz-droit-pnom vz-t-' + ax.id }, ax.nom),
            h('ul', null, ax.qs.map((q) => h('li', null, h('span', { class: 'vz-run-box', 'aria-hidden': 'true' }), q[0]))))))),
          note('L’AI Act ne concerne une application à ce titre que si elle intègre elle-même de l’IA, comme L’Atelier ou le SaaS.'));
        setPoly([0, 0, 0, 0]);
        return;
      }

      const groups = C26_AXES.map((ax, i) => {
        const items = ax.qs.map((q, k) => {
          const cb = h('input', { type: 'checkbox', class: 'vz-droit-cb' });
          cb.addEventListener('change', () => { rep[i][k] = cb.checked; draw(); });
          return h('li', null, h('label', null, cb, h('span', null, q[0])));
        });
        const extra = ax.id === 'ai' ? chip('Mon application intègre elle-même de l’IA', ia, (v) => {
          ia = v;
          items.forEach((li) => { li.querySelector('input').disabled = !v; li.classList.toggle('vz-is-off', !v); });
          offTxt.hidden = v;
          draw();
        }, 'vz-droit-iachip') : null;
        const offTxt = ax.id === 'ai' ? h('p', { class: 'vz-droit-off', hidden: true }, 'Utiliser une IA pour écrire le code ne fait pas de votre application un « système d’IA » : non concernée à ce titre.') : null;
        return h('details', { class: 'vz-droit-group vz-t-' + ax.id, open: i === 0 ? true : null },
          h('summary', null, h('span', { class: 'vz-droit-gnom' }, ax.nom), h('span', { class: 'vz-droit-gcount' }, ax.qs.length + ' repères')),
          extra, offTxt, h('ul', { class: 'vz-droit-qs' }, items));
      });
      add(el, disclaimer,
        h('div', { class: 'vz-droit-grid' },
          h('div', { class: 'vz-droit-compass' }, svg, resume),
          h('div', { class: 'vz-droit-groups' }, groups)),
        kicker('Ce qu’il reste à faire'), actions);
      setPoly(cur);
      draw();
    }
  };

  /* ================= ch27 : Fabrique de skill ================= */

  const C27_EXEMPLE = {
    name: 'relecture-manuel',
    description: 'Relit un chapitre de Le Guide du Vibe Coding selon la charte : voix, mots proscrits, balisage, faits datés, renvois. À utiliser pour relire, corriger ou vérifier un chapitre.',
    titre: 'Relecture d’un chapitre du Guide',
    role: 'Tu relis un chapitre de « Le Guide du Vibe Coding », guide en français pour des lecteurs qui n’ont jamais codé. Tu es un relecteur exigeant, pas un réécrivain. Tu ne modifies rien sans accord.',
    etapes: [
      { t: 'La voix', l: 'Le lecteur est vouvoyé ; l’auteur dit « je » et « nous ».\nSignale les chutes en slogan et les séries de trois forcées.\n« vibe coding » en deux mots, « vibecodeur » pour la personne.' },
      { t: 'Les interdits mécaniques', l: 'Aucun tiret cadratin ni demi-cadratin. Cite chaque ligne fautive.\nMots proscrits : voir references/mots-proscrits.md.' },
      { t: 'Les faits', l: 'Chaque chiffre, prix, date ou citation doit être daté et sourcé. Sinon, signale-le.\nUn fait marqué [À VÉRIFIER] n’est jamais présenté comme sûr.' },
      { t: 'Le balisage et les renvois', l: 'Chaque « chapitre N » doit viser le bon chapitre ; en cas de doute, pose la question.' }
    ],
    rendu: 'Trois niveaux : Bloquant, Important, Confort.\nPour chaque point : la citation exacte, le problème, une proposition.\nAu plus 25 points ; s’il y en a davantage, les 25 plus graves et le nombre total.\nTermine par : « Voulez-vous que j’applique les corrections bloquantes et importantes ? »',
    commande: false
  };
  const C27_VIDE = { name: '', description: '', titre: '', role: '', etapes: [{ t: '', l: '' }], rendu: '', commande: false };

  function c27Md(S) {
    const lines = ['---', 'name: ' + (S.name || 'nom-de-la-skill'), 'description: ' + (S.description || 'Ce que fait la skill. À utiliser pour…')];
    if (S.commande) lines.push('disable-model-invocation: true');
    lines.push('---', '', '# ' + (S.titre || 'Titre de la procédure'), '');
    if (S.role.trim()) lines.push(S.role.trim(), '');
    S.etapes.forEach((e, i) => {
      if (!e.t.trim() && !e.l.trim()) return;
      lines.push('## Étape ' + (i + 1) + ' : ' + (e.t.trim() || '…'));
      e.l.split('\n').map((x) => x.trim()).filter(Boolean).forEach((x) => lines.push(x.startsWith('-') ? x : '- ' + x));
      lines.push('');
    });
    const r = S.rendu.split('\n').map((x) => x.trim()).filter(Boolean);
    if (r.length) { lines.push('## Rendu'); r.forEach((x, i) => lines.push((i + 1) + '. ' + x.replace(/^\d+\.\s*/, ''))); }
    return lines.join('\n').replace(/\n+$/, '') + '\n';
  }
  function c27Checks(S) {
    const md = c27Md(S);
    return [
      { ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(S.name) && S.name.length <= 64, t: 'Nom en minuscules, chiffres et tirets, 64 caractères au plus, identique au dossier' },
      { ok: S.description.length > 0 && S.description.length <= 200, t: 'Description sous 200 caractères (téléversement dans Claude)' },
      { ok: /à utiliser|use when|quand |lorsque/i.test(S.description) && S.description.length >= 60, t: 'La description dit quand l’utiliser, avec vos mots' },
      { ok: !S.commande, t: 'En-tête standard : la skill s’importe telle quelle dans Claude, Claude Code et Lovable' },
      { ok: md.split('\n').length < 500, t: 'Instructions sous 500 lignes' }
    ];
  }

  VIZ['ch27-skill'] = {
    chapitre: 'ch27',
    titre: 'Fabrique de skill',
    consigne: 'Remplissez la tranche et les étapes : le SKILL.md se compose sous vos yeux, prêt à copier.',
    ancre: 'Les hooks : ce qui doit arriver',
    render(el, ctx) {
      root(el, 'skill', ctx);
      let S = JSON.parse(JSON.stringify(C27_EXEMPLE));
      const tranche = h('div', { class: 'vz-skill-tranche' });
      const checks = h('ul', { class: 'vz-skill-checks', 'aria-live': 'polite' });
      const out = h('div', { class: 'vz-skill-out' });
      let timer = null;

      function drawSide() {
        const toks = Math.ceil((S.name.length + S.description.length + 20) / 4);
        clear(tranche);
        add(tranche,
          h('p', { class: 'vz-skill-tr-k' }, 'Ce que l’agent lit avant de décider · ≈ ' + toks + ' tokens'),
          h('div', { class: 'vz-skill-spine' },
            h('span', { class: 'vz-skill-spine-name' }, S.name || 'nom-de-la-skill'),
            h('span', { class: 'vz-skill-spine-desc' }, S.description || 'Une description floue, et la skill n’est jamais ouverte.')),
          h('p', { class: 'vz-skill-path' }, '.claude/skills/' + (S.name || '…') + '/SKILL.md'));
        clear(checks);
        c27Checks(S).forEach((c) => checks.appendChild(h('li', { class: c.ok ? 'vz-is-ok' : 'vz-is-ko' }, pixIcon(c.ok ? PIX.check : PIX.cross, 'currentColor', 12), h('span', null, c.t))));
      }
      function drawOut() {
        const md = c27Md(S);
        clear(out).appendChild(ctx.print ? h('pre', { class: 'vz-b-pre vz-skill-pre' }, md) : promptBlock(ctx, md));
      }
      function changed() {
        drawSide();
        clearTimeout(timer);
        timer = setTimeout(drawOut, 250);
      }

      if (ctx.print) {
        drawSide(); drawOut();
        add(el, h('div', { class: 'vz-skill-grid' }, h('div', null, kicker('La tranche du classeur'), tranche, checks), h('div', null, kicker('SKILL.md'), out)),
          note('La description reste sous 200 caractères et reprend les verbes de l’auteur. Une skill conseille, un hook impose.'));
        return;
      }

      const form = h('div', { class: 'vz-skill-form' });
      function field(label, key, opts = {}) {
        const inp = h(opts.area ? 'textarea' : 'input', { class: opts.area ? 'vz-b-textarea' : 'vz-b-input', rows: opts.rows || null, placeholder: opts.ph || '', spellcheck: key === 'name' ? 'false' : null });
        inp.value = S[key];
        const count = opts.count ? h('span', { class: 'vz-skill-count' }) : null;
        const upd = () => { if (count) { const n = inp.value.length; count.textContent = n + ' / 200'; count.classList.toggle('vz-is-over', n > 200); } };
        inp.addEventListener('input', () => {
          if (key === 'name') {
            const cleaned = inp.value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
            if (cleaned !== inp.value) inp.value = cleaned;
          }
          S[key] = inp.value; upd(); changed();
        });
        upd();
        return h('label', { class: 'vz-skill-field' }, h('span', { class: 'vz-skill-lab' }, label, count), inp, opts.hint ? h('span', { class: 'vz-skill-hint' }, opts.hint) : null);
      }
      const etapesHost = h('div', { class: 'vz-skill-etapes' });
      function drawEtapes() {
        clear(etapesHost);
        S.etapes.forEach((e, i) => {
          const t = h('input', { class: 'vz-b-input', placeholder: 'Titre de l’étape', 'aria-label': 'Titre de l’étape ' + (i + 1) });
          t.value = e.t;
          t.addEventListener('input', () => { e.t = t.value; changed(); });
          const l = h('textarea', { class: 'vz-b-textarea', rows: 2, placeholder: 'Une consigne par ligne', 'aria-label': 'Consignes de l’étape ' + (i + 1) });
          l.value = e.l;
          l.addEventListener('input', () => { e.l = l.value; changed(); });
          etapesHost.appendChild(h('div', { class: 'vz-skill-etape' },
            h('div', { class: 'vz-skill-etape-head' }, h('span', { class: 'vz-skill-etape-n' }, 'Étape ' + (i + 1)), t,
              S.etapes.length > 1 ? btn('Retirer', () => { S.etapes.splice(i, 1); drawEtapes(); changed(); }, { small: true, aria: 'Retirer l’étape ' + (i + 1) }) : null),
            l));
        });
      }
      function fill(src) {
        S = JSON.parse(JSON.stringify(src));
        build();
        changed();
      }
      function build() {
        clear(form);
        add(form,
          h('div', { class: 'vz-b-row' }, btn('Exemple : relecture-manuel', () => fill(C27_EXEMPLE), { small: true }), btn('Page blanche', () => fill(C27_VIDE), { small: true })),
          kicker('L’en-tête'),
          field('name', 'name', { ph: 'relecture-manuel', hint: 'Le même nom que le dossier.' }),
          field('description', 'description', { area: true, rows: 3, count: true, ph: 'Ce que fait la skill. À utiliser pour…', hint: 'Le seul texte que l’agent lit avant de décider : employez vos propres mots.' }),
          chip('Réservée à ma commande (Claude Code)', S.commande, (v) => { S.commande = v; warn.hidden = !v; changed(); }, 'vz-skill-opt'),
          warn,
          kicker('Les instructions'),
          field('Titre', 'titre', { ph: 'Relecture d’un chapitre' }),
          field('Rôle et limite, en une ou deux phrases', 'role', { area: true, rows: 3, ph: 'Tu es… Tu ne modifies rien sans accord.' }),
          etapesHost,
          btn('Ajouter une étape', () => { S.etapes.push({ t: '', l: '' }); drawEtapes(); changed(); }, { small: true }),
          field('Rendu : une consigne par ligne', 'rendu', { area: true, rows: 4, ph: 'Trois niveaux : Bloquant, Important, Confort.' }));
        warn.hidden = !S.commande;
        drawEtapes();
      }
      const warn = h('p', { class: 'vz-b-alert' }, 'disable-model-invocation est propre à Claude Code : dans Claude, l’import échoue avec « Unexpected key ». Gardez l’en-tête minimal si la skill doit servir partout.');
      build();
      add(el, h('div', { class: 'vz-skill-grid' }, form,
        h('div', { class: 'vz-skill-side' }, kicker('La tranche du classeur'), tranche, checks)),
        kicker('Votre SKILL.md'), out,
        note('Testez-la dans une conversation neuve sans la nommer, puis avec une demande sans rapport : elle doit rester muette.'));
      drawSide(); drawOut();
    }
  };

  /* ================= ch28 : Le mode mentor ================= */

  const C28_PROFILS = [
    { id: 'delegation', nom: 'Délégation complète', fait: 'Demander tout le code à l’IA', haut: false },
    { id: 'dependance', nom: 'Dépendance progressive', fait: 'Commencer seul, puis tout déléguer', haut: false },
    { id: 'debogage', nom: 'Débogage délégué', fait: 'Faire corriger chaque erreur sans chercher', haut: false },
    { id: 'generer', nom: 'Générer puis comprendre', fait: 'Faire générer, puis questionner le code', haut: true },
    { id: 'code', nom: 'Code et explication', fait: 'Demander le code avec son explication', haut: true },
    { id: 'concepts', nom: 'Questions de concepts', fait: 'Questions conceptuelles, erreurs corrigées soi-même', haut: true }
  ];
  const C28_BLOCS = [
    { nom: 'Terminal et fichiers', savoir: 'naviguer dans des dossiers, lancer le projet, lire un message d’erreur', ex: 'lancer L’Atelier en local avec Claude Code' },
    { nom: 'HTML et CSS', savoir: 'reconnaître une balise, une classe ; inspecter une page', ex: 'retrouver dans l’inspecteur la couleur du statut « Relecture »' },
    { nom: 'JavaScript', savoir: 'lire une fonction, une condition, un appel à un serveur', ex: 'lire le code du bouton qui change le statut d’un chapitre' },
    { nom: 'HTTP et API', savoir: 'distinguer requête et réponse, les codes 200, 403, 500, une clé d’API', ex: 'suivre l’appel à la fonction de relecture dans l’onglet Réseau' },
    { nom: 'SQL et données', savoir: 'lire un schéma, écrire un SELECT simple, comprendre une règle RLS', ex: 'reformuler en français chaque règle d’accès des relecteurs' },
    { nom: 'Git', savoir: 'faire un commit, une branche, revenir en arrière, lire un diff', ex: 'relire moi-même un diff avant de le faire relire par Claude' }
  ];
  const C28_NIVEAUX = {
    debut: { label: 'Je débute', txt: 'Je débute : définis chaque terme technique la première fois que tu l’emploies.' },
    bases: { label: 'J’ai les bases', txt: 'J’ai les bases : va à l’essentiel, mais vérifie ma compréhension à chaque étape.' },
    loin: { label: 'Je veux aller loin', txt: 'Je veux aller loin : sois exigeant, pose-moi des questions difficiles.' }
  };
  const C28_STYLES = {
    socratique: { label: 'Méthode socratique', profil: 'concepts' },
    diff: { label: 'Comprendre un diff', profil: 'generer' },
    feynman: { label: 'Feynman inversé', profil: 'concepts' },
    avocat: { label: 'Avocat du diable', profil: 'generer' }
  };

  function c28Prompt(S) {
    const b = C28_BLOCS[S.bloc], niv = C28_NIVEAUX[S.niveau].txt;
    if (!S.apprendre) {
      return 'Mode production : je veux que L’Atelier avance. Tâche : ' + b.ex + '.\n\n' +
        'Quand tu écris du code, explique en 2 ou 3 phrases ce qu’il fait et pourquoi ce choix. ' + niv + ' Si mon idée ou mon code a un défaut, dis-le franchement, même si je semble sûr de moi.';
    }
    switch (S.style) {
      case 'diff':
        return 'Avant que je valide : explique ce diff bloc par bloc, en langage simple. Contexte : ' + b.nom + ', exercice « ' + b.ex + ' ». ' + niv + '\n\n' +
          'Puis pose-moi 2 questions dont les réponses prouveraient que je l’ai compris, par exemple : que se passe-t-il si un relecteur bêta tente d’ouvrir un chapitre encore au statut Brouillon ?';
      case 'feynman':
        return 'Je vais t’expliquer avec mes mots ce que je sais faire en ' + b.nom + ' (' + b.savoir + '), à partir de cet exercice : ' + b.ex + '. ' + niv + '\n\n' +
          'Joue le rôle d’un élève curieux mais exigeant : relève chaque imprécision, chaque mot que j’emploie sans le comprendre et chaque trou dans mon explication. Ne complète pas à ma place : questionne-moi.';
      case 'avocat':
        return 'Critique mon plan sans ménagement. Sujet : ' + b.nom + ' dans L’Atelier, exercice « ' + b.ex + ' ». ' + niv + '\n\n' +
          'Je préfère un désaccord argumenté à une validation. Donne les 3 raisons les plus solides pour lesquelles cela pourrait échouer. Si tu es d’accord avec moi, explique pourquoi de manière vérifiable.';
      default:
        return 'Je veux comprendre ' + b.nom + ' : ' + b.savoir + '. Exercice sur L’Atelier : ' + b.ex + '. ' + niv + '\n\n' +
          'Ne me donne pas l’explication complète. Pose-moi une question à la fois pour me faire trouver par moi-même. Si je me trompe, pose une question qui me fait voir l’erreur. Si je bloque deux fois, donne un indice. Résume ce que j’ai trouvé à la fin.';
    }
  }

  VIZ['ch28-mentor'] = {
    chapitre: 'ch28',
    titre: 'Le mode mentor',
    consigne: 'Basculez l’interrupteur, choisissez votre niveau, une notion et un style : le prompt de mentorat se compose.',
    ancre: 'Les pièges du mentorat par IA',
    render(el, ctx) {
      root(el, 'mentor', ctx);
      const S = { apprendre: true, niveau: 'debut', bloc: 4, style: 'socratique' };
      const bars = h('div', { class: 'vz-mentor-bars' });
      const out = h('div', { class: 'vz-mentor-out' });
      const verdict = h('p', { class: 'vz-mentor-verdict', 'aria-live': 'polite' });

      function profilActif() { return S.apprendre ? C28_STYLES[S.style].profil : 'code'; }
      function drawBars() {
        const act = profilActif();
        clear(bars);
        add(bars, h('div', { class: 'vz-mentor-groups' },
          h('div', { class: 'vz-mentor-group' }, h('span', null, 'Avec IA'), h('span', { class: 'vz-mentor-gbar' }, h('span', { style: { width: '50%' } })), h('strong', null, '50 %')),
          h('div', { class: 'vz-mentor-group' }, h('span', null, 'Sans IA'), h('span', { class: 'vz-mentor-gbar vz-is-sans' }, h('span', { style: { width: '67%' } })), h('strong', null, '67 %'))));
        C28_PROFILS.forEach((p) => {
          bars.appendChild(h('div', { class: 'vz-mentor-row' + (p.haut ? ' vz-is-haut' : ' vz-is-bas') + (p.id === act ? ' vz-is-act' : '') },
            h('span', { class: 'vz-mentor-rnom' }, p.nom, h('span', { class: 'vz-mentor-rfait' }, p.fait)),
            h('span', { class: 'vz-mentor-rbar' }, h('span', { class: 'vz-mentor-rfill' })),
            h('span', { class: 'vz-mentor-rval' }, p.haut ? 'élevé' : 'faible')));
        });
        const p = C28_PROFILS.find((x) => x.id === act);
        verdict.textContent = 'Votre prompt correspond au profil « ' + p.nom + ' » : score ' + (p.haut ? 'élevé (65 % ou plus)' : 'faible') + ' dans l’étude.';
      }
      function drawOut() {
        const t = c28Prompt(S);
        clear(out).appendChild(ctx.print ? h('pre', { class: 'vz-b-pre' }, t) : promptBlock(ctx, t));
      }
      function update() { drawBars(); drawOut(); styleRow.hidden = !S.apprendre; sw.setAttribute('aria-checked', String(S.apprendre)); el.classList.toggle('vz-is-prod', !S.apprendre); modeTxt.textContent = S.apprendre ? 'Apprentissage : vous questionnez, l’objectif est que vous avanciez.' : 'Production : vous déléguez, l’objectif est que l’application avance. Le danger : croire apprendre quand on délègue.'; }

      const sw = h('button', { type: 'button', role: 'switch', class: 'vz-mentor-switch', 'aria-checked': 'true', 'aria-label': 'Mode apprentissage' },
        h('span', { class: 'vz-mentor-sw-l' }, 'Production'), h('span', { class: 'vz-mentor-sw-track', 'aria-hidden': 'true' }, h('span', { class: 'vz-mentor-sw-knob' })), h('span', { class: 'vz-mentor-sw-r' }, 'Apprentissage'));
      sw.addEventListener('click', () => { S.apprendre = !S.apprendre; update(); });
      const modeTxt = h('p', { class: 'vz-mentor-modetxt' });
      const niveau = seg(Object.keys(C28_NIVEAUX).map((k) => ({ value: k, label: C28_NIVEAUX[k].label })), S.niveau, (v) => { S.niveau = v; drawOut(); }, 'Niveau');
      const sel = h('select', { class: 'vz-b-select', 'aria-label': 'Notion à travailler' }, C28_BLOCS.map((b, i) => h('option', { value: i, selected: i === S.bloc ? true : null }, i + '. ' + b.nom)));
      sel.addEventListener('change', () => { S.bloc = Number(sel.value); drawOut(); });
      const styleRow = h('div', { class: 'vz-mentor-styles' }, kicker('Style de mentorat'),
        seg(Object.keys(C28_STYLES).map((k) => ({ value: k, label: C28_STYLES[k].label })), S.style, (v) => { S.style = v; update(); }, 'Style'));

      if (ctx.print) {
        add(el, h('div', { class: 'vz-mentor-grid' },
          h('div', null, kicker('Étude d’Anthropic, janvier 2026 : score au quiz'), bars, verdict),
          h('div', null, kicker('Exemple : méthode socratique, bloc SQL et données'), out)));
        drawBars(); drawOut();
        return;
      }
      add(el,
        h('div', { class: 'vz-mentor-top' }, sw, modeTxt),
        h('div', { class: 'vz-mentor-grid' },
          h('div', { class: 'vz-mentor-ctrls' },
            kicker('Votre niveau'), niveau,
            kicker('La notion, sur L’Atelier'), sel,
            styleRow),
          h('div', null, kicker('Étude d’Anthropic, janvier 2026 : score au quiz'), bars, verdict)),
        kicker('Votre prompt'), out,
        note('Parade contre la complaisance : ne révélez pas votre réponse avant de demander celle de Claude, et relisez dans une session neuve.'));
      update();
    }
  };

  /* ================= ch29 : Mythe ou réalité ================= */

  const C29_CARTES = [
    { t: 'Plus besoin de développeurs.', mythe: true, six: true, e: 'En 2025, 72 % des développeurs professionnels interrogés par Stack Overflow disaient que le vibe coding ne faisait pas partie de leur travail, et l’inventeur du mot a écrit à la main son projet sérieux suivant.' },
    { t: 'Dans l’étude de METR (juillet 2025), des développeurs expérimentés se croyaient plus rapides avec l’IA, alors qu’ils étaient plus lents.', mythe: false, e: '19 % plus lents, alors qu’ils se croyaient environ 20 % plus rapides. METR refuse d’en faire une loi, mais l’écart entre perception et mesure reste le résultat le plus instructif.' },
    { t: 'Si ça marche à l’écran, c’est bon.', mythe: true, six: true, e: 'Les applications exposées de 2025 et 2026 marchaient très bien à l’écran. L’écran montre ce que voit un utilisateur honnête, pas ce que peut faire un curieux.' },
    { t: 'L’IA amplifie ce qui existe : avec des tests et des versions solides, elle accélère ; sans eux, elle accélère aussi le désordre.', mythe: false, e: 'C’est la leçon du rapport DORA de Google Cloud (2025, près de 5 000 répondants) : plus de débit, moins de stabilité, sauf là où tests et versions sont solides.' },
    { t: 'L’IA sait ce qu’elle fait.', mythe: true, six: true, e: 'Elle sait produire ce qui ressemble à ce qu’on attend, et peut affirmer avoir testé ce qu’elle n’a pas testé. La recette du chapitre 18 existe pour cela : un résultat attendu écrit d’avance.' },
    { t: 'Une application endettée peut fonctionner très bien.', mythe: false, e: 'La dette technique n’est pas un bug : tout marche, jusqu’au jour où l’on veut modifier l’application. Ses intérêts se paient en nature.' },
    { t: 'L’IA me rend plus rapide.', mythe: true, six: true, e: 'Peut-être. Les mesures disent que la perception n’est pas un bon instrument. Le seul chiffre qui compte est le vôtre, mesuré sur vos projets, avec votre carnet de bord et votre budget de crédits.' },
    { t: 'Entre 2020 et 2024, la part de code dupliqué a augmenté pendant que la réorganisation du code reculait.', mythe: false, e: 'Selon GitClear (211 millions de lignes) : de 8,3 % à 12,3 % de code dupliqué, et un refactoring tombé de 25 % en 2021 à moins de 10 % en 2024.' },
    { t: 'Le prochain modèle réglera tout.', mythe: true, six: true, e: 'Il en réglera beaucoup, mais la part de code sûr ne suit pas : 56 % en moyenne selon Veracode (2026), stable d’une édition à l’autre. Et aucun modèle ne décidera si un relecteur bêta peut lire un chapitre en Brouillon.' },
    { t: 'L’IA rend idiot.', mythe: true, six: true, e: 'Le mythe inverse, nourri par des lectures hâtives d’une prépublication du MIT Media Lab sur 54 personnes, que ses auteurs ont dû recadrer. Tout dépend de la façon de s’en servir (chapitre 28).' }
  ];

  VIZ['ch29-mythes'] = {
    chapitre: 'ch29',
    titre: 'Mythe ou réalité',
    consigne: 'Dix affirmations sur le vibe coding : tranchez, puis lisez ce que disent les études.',
    ancre: 'La dette technique',
    render(el, ctx) {
      root(el, 'mythe', ctx);
      if (ctx.print) {
        add(el, h('ol', { class: 'vz-mythe-printlist' }, C29_CARTES.map((c) => h('li', null,
          h('span', { class: 'vz-mythe-badge ' + (c.mythe ? 'vz-is-mythe' : 'vz-is-reel') }, c.mythe ? 'Mythe' : 'Réalité'),
          h('strong', null, '« ' + c.t + ' »'), ' ', h('span', { class: 'vz-mythe-pe' }, c.e)))),
          note('Lisez chaque étude avec quatre questions : qui a mesuré, sur combien de cas, quoi, et qui a intérêt au résultat.'));
        return;
      }
      let i = 0;
      let rep = [];
      const dots = h('div', { class: 'vz-mythe-dots', 'aria-hidden': 'true' }, C29_CARTES.map(() => h('span')));
      const stage = h('div', { class: 'vz-mythe-stage' });
      const live = h('p', { class: 'vz-b-sr', 'aria-live': 'polite' });

      function drawDots() {
        dots.querySelectorAll('span').forEach((d, k) => {
          d.className = k < rep.length ? (rep[k] ? 'vz-is-ok' : 'vz-is-ko') : k === i ? 'vz-is-cur' : '';
        });
      }
      function carte() {
        const c = C29_CARTES[i];
        const front = h('div', { class: 'vz-mythe-card' },
          h('p', { class: 'vz-mythe-n' }, 'Affirmation ' + (i + 1) + ' sur ' + C29_CARTES.length),
          h('p', { class: 'vz-mythe-t' }, '« ' + c.t + ' »'));
        const actions = h('div', { class: 'vz-mythe-actions' },
          btn('Mythe', () => answer(true), { cls: 'vz-mythe-btn vz-is-mythe' }),
          btn('Réalité', () => answer(false), { cls: 'vz-mythe-btn vz-is-reel' }));
        front.appendChild(actions);
        clear(stage).appendChild(front);
        drawDots();
      }
      function answer(choixMythe) {
        const c = C29_CARTES[i];
        const ok = choixMythe === c.mythe;
        rep.push(ok);
        const card = stage.firstChild;
        card.classList.add('vz-is-answered', ok ? 'vz-is-ok' : 'vz-is-ko');
        if (canMove()) card.classList.add('vz-is-flip');
        const actions = card.querySelector('.vz-mythe-actions');
        actions.replaceWith(h('div', { class: 'vz-mythe-back' },
          h('p', { class: 'vz-mythe-verdict' }, h('span', { class: 'vz-mythe-badge ' + (c.mythe ? 'vz-is-mythe' : 'vz-is-reel') }, c.mythe ? 'Mythe' : 'Réalité'), ok ? ' Bien vu.' : ' Pas tout à fait.', c.six ? h('span', { class: 'vz-mythe-six' }, 'un des six mythes du chapitre') : null),
          h('p', { class: 'vz-mythe-e' }, c.e),
          btn(i < C29_CARTES.length - 1 ? 'Affirmation suivante' : 'Voir mon score', next, { primary: true, cls: 'vz-mythe-next' })));
        live.textContent = (ok ? 'Bonne réponse. ' : 'Mauvaise réponse. ') + (c.mythe ? 'C’est un mythe. ' : 'C’est une réalité. ') + c.e;
        drawDots();
        const nx = card.querySelector('.vz-mythe-next');
        if (nx) nx.focus({ preventScroll: true });
      }
      function next() {
        i++;
        if (i < C29_CARTES.length) { carte(); const b = stage.querySelector('.vz-mythe-btn'); if (b) b.focus({ preventScroll: true }); return; }
        const score = rep.filter(Boolean).length;
        drawDots();
        clear(stage).appendChild(h('div', { class: 'vz-mythe-card vz-mythe-final' },
          h('p', { class: 'vz-mythe-n' }, 'Votre score'),
          h('p', { class: 'vz-mythe-score' }, h('strong', null, String(score)), ' / ' + C29_CARTES.length),
          h('p', { class: 'vz-mythe-e' }, score >= 9 ? 'Vous lisez les études comme il faut : en sachant qui a mesuré quoi.' : score >= 6 ? 'Solide. Relisez les cartes manquées : ce sont souvent les intuitions les plus tenaces.' : 'Les mythes ont la vie dure. Relisez « Ce que disent les études », puis retentez.'),
          rep.some((x) => !x) ? h('ul', { class: 'vz-mythe-miss' }, C29_CARTES.filter((_, k) => !rep[k]).map((c) => h('li', null, h('span', { class: 'vz-mythe-badge ' + (c.mythe ? 'vz-is-mythe' : 'vz-is-reel') }, c.mythe ? 'Mythe' : 'Réalité'), ' ', c.t))) : null,
          btn('Recommencer', () => { i = 0; rep = []; carte(); }, { primary: true })));
        live.textContent = 'Score : ' + score + ' sur ' + C29_CARTES.length + '.';
      }
      add(el, dots, stage, live);
      carte();
    }
  };

  /* ================= ch30 : La boucle de l'agent ================= */

  const C30_NOEUDS = [
    { id: 'explorer', nom: 'Explorer', sous: 'lire ce qui existe', a: -90 },
    { id: 'planifier', nom: 'Planifier', sous: 'proposer, sans toucher', a: 0 },
    { id: 'coder', nom: 'Coder', sous: 'exécuter le plan', a: 90 },
    { id: 'verifier', nom: 'Vérifier', sous: 'tests, captures, navigateur', a: 180 }
  ];
  const C30_ZONES = {
    verte: { label: 'Zone verte', tache: 'Écrire des tests, documenter, renommer', txt: 'Autonomie large : le pire qui puisse arriver se défait d’une commande.', gates: [] },
    orange: { label: 'Zone orange', tache: 'Nouvelle fonctionnalité, correction de bug', txt: 'Validation du plan, puis exécution libre.', gates: ['planifier'] },
    rouge: { label: 'Zone rouge', tache: 'Règle d’accès, migration, paiement', txt: 'Validation à chaque étape, jamais en autonomie.', gates: ['planifier', 'coder', 'verifier'] }
  };

  function c30Boucle(panel, ctx) {
    const S = { zone: ctx.print ? 'orange' : 'rouge', plan: false, running: false };
    const R = 104, CX = 180, CY = 150;
    const P = (deg, r = R) => [CX + Math.cos(deg * Math.PI / 180) * r, CY + Math.sin(deg * Math.PI / 180) * r];
    const svg = sv('svg', { class: 'vz-agent-svg', viewBox: '0 0 360 300', 'aria-hidden': 'true' });
    svg.appendChild(sv('circle', { cx: CX, cy: CY, r: R, class: 'vz-agent-orbit' }));
    for (let k = 0; k < 4; k++) {
      const [x, y] = P(C30_NOEUDS[k].a + 45, R);
      const ang = C30_NOEUDS[k].a + 45 + 90;
      svg.appendChild(sv('path', { d: 'M -5 -5 L 4 0 L -5 5', class: 'vz-agent-chev', transform: 'translate(' + x + ' ' + y + ') rotate(' + ang + ')' }));
    }
    const gatesG = sv('g');
    svg.appendChild(gatesG);
    const nodesG = C30_NOEUDS.map((n) => {
      const [x, y] = P(n.a);
      const g = sv('g', { class: 'vz-agent-node vz-n-' + n.id, transform: 'translate(' + x + ' ' + y + ')' },
        sv('circle', { r: 30, class: 'vz-agent-node-c' }),
        sv('text', { y: 4, 'text-anchor': 'middle', class: 'vz-agent-node-t' }, n.nom));
      const lk = pixIcon(PIX.lock, 'currentColor', 12);
      lk.setAttribute('x', -6); lk.setAttribute('y', -6);
      const lockG = sv('g', { class: 'vz-agent-lock', transform: 'translate(20 -26)' }, sv('circle', { r: 11 }), lk);
      if (n.id === 'coder') g.appendChild(lockG);
      svg.appendChild(g);
      return g;
    });
    const token = sv('circle', { r: 8, class: 'vz-agent-token', cx: P(-90)[0], cy: P(-90)[1] });
    svg.insertBefore(token, nodesG[0]);
    const center = h('div', { class: 'vz-agent-center' });
    const log = h('ol', { class: 'vz-agent-log', 'aria-live': 'polite' });
    let angle = -90, gateResolve = null;

    function drawGates() {
      clear(gatesG);
      const z = C30_ZONES[S.zone];
      z.gates.forEach((after) => {
        const n = C30_NOEUDS.find((x) => x.id === after);
        const [x, y] = P(n.a + 45);
        gatesG.appendChild(sv('g', { class: 'vz-agent-gate', transform: 'translate(' + x + ' ' + y + ')' },
          sv('rect', { x: -9, y: -9, width: 18, height: 18, rx: 3, transform: 'rotate(45)' }),
          (() => { const ic = pixIcon(PIX.hand, 'currentColor', 12); ic.setAttribute('x', -6); ic.setAttribute('y', -6); return ic; })()));
      });
      panel.classList.toggle('vz-is-plan', S.plan);
      panel.dataset.zone = S.zone;
    }
    function setCenter(main, sub, action) {
      clear(center);
      add(center, h('p', { class: 'vz-agent-c-main' }, main), sub ? h('p', { class: 'vz-agent-c-sub' }, sub) : null, action || null);
    }
    function logLine(txt, kind) {
      log.appendChild(h('li', { class: 'vz-agent-li vz-k-' + (kind || 'info') }, txt));
      while (log.children.length > 7) log.removeChild(log.firstChild);
    }
    function moveTo(target, backwards) {
      return new Promise((res) => {
        let to = target;
        if (!backwards) { while (to <= angle) to += 360; } else { while (to >= angle) to -= 360; }
        const from = angle, dur = canMove() ? Math.abs(to - from) * 9 : 0, t0 = performance.now();
        const step = (t) => {
          const p = dur ? Math.min(1, (t - t0) / dur) : 1;
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          angle = from + (to - from) * e;
          const [x, y] = P(angle);
          token.setAttribute('cx', x); token.setAttribute('cy', y);
          if (p < 1) requestAnimationFrame(step); else { angle = ((to % 360) + 540) % 360 - 180; res(); }
        };
        requestAnimationFrame(step);
      });
    }
    function active(id) { nodesG.forEach((g, k) => g.classList.toggle('vz-is-on', C30_NOEUDS[k].id === id)); }
    function gate(label) {
      return new Promise((res) => {
        const b = btn(label, () => { gateResolve = null; res(); }, { primary: true });
        gateResolve = res;
        setCenter('Votre tour', 'Claude attend votre accord.', b);
        b.focus({ preventScroll: true });
      });
    }
    async function run() {
      if (S.running) return;
      S.running = true;
      clear(log);
      runBtn.disabled = true;
      const z = C30_ZONES[S.zone];
      angle = -90;
      token.setAttribute('cx', P(-90)[0]); token.setAttribute('cy', P(-90)[1]);
      active('explorer');
      setCenter('Explorer', 'Il liste les fichiers, lit les migrations et l’historique.');
      logLine('Explorer : « fais-moi la visite de ce projet », rien n’est modifié.');
      await wait(canMove() ? 1100 : 200);
      await moveTo(0); active('planifier');
      setCenter('Planifier', 'Une démarche étape par étape, sans toucher au code.');
      logLine('Plan : une migration, un test à deux comptes, la mise à jour de CLAUDE.md.');
      await wait(canMove() ? 1100 : 200);
      if (S.plan) {
        logLine('Mode plan : Claude lit et propose, il ne modifie rien. Fin de la séance.', 'stop');
        setCenter('Mode plan', 'Un trait de crayon s’efface, pas un trait de scie.');
        return done();
      }
      if (z.gates.includes('planifier')) { await gate('Valider le plan'); logLine('Vous relisez, corrigez un point, acceptez.', 'human'); }
      await moveTo(90); active('coder');
      setCenter('Coder', 'Il écrit d’abord un test qui reproduit le problème.');
      logLine('Coder : le test est écrit.');
      await wait(canMove() ? 900 : 200);
      if (z.gates.includes('coder')) { await gate('Valider cette étape'); logLine('Étape validée.', 'human'); }
      await moveTo(180); active('verifier');
      setCenter('Vérifier', 'Le test échoue : preuve que le problème existe.');
      logLine('Vérifier : le test échoue, comme prévu.', 'fail');
      await wait(canMove() ? 1000 : 200);
      await moveTo(90, true); active('coder');
      setCenter('Coder', 'Il écrit la correction.');
      logLine('Coder : correction écrite.');
      await wait(canMove() ? 800 : 200);
      if (z.gates.includes('verifier')) { await gate('Valider la correction'); logLine('Correction validée.', 'human'); }
      await moveTo(180); active('verifier');
      setCenter('Vérifier', 'Le test passe : l’agent sait qu’il a fini.');
      logLine('Vérifier : le test passe.', 'ok');
      await wait(canMove() ? 900 : 200);
      logLine('Consigner : une ligne dans « Erreurs déjà commises » du CLAUDE.md.', 'ok');
      setCenter('Terminé', 'Une modification prouvée, et une erreur qui a servi.');
      return done();
    }
    function done() { S.running = false; runBtn.disabled = false; runBtn.textContent = 'Relancer la séance'; active(null); }
    const runBtn = btn('Lancer une séance', run, { primary: true });
    function idle() {
      const z = C30_ZONES[S.zone];
      setCenter(z.label, z.tache + ' · ' + z.txt);
    }
    const zones = seg(Object.keys(C30_ZONES).map((k) => ({ value: k, label: C30_ZONES[k].label })), S.zone, (v) => { if (S.running) return zones.set(S.zone); S.zone = v; drawGates(); idle(); }, 'Zone de la tâche', 'vz-agent-zones');
    const planChip = chip('Mode plan (lecture seule)', S.plan, (v) => { S.plan = v; drawGates(); });

    drawGates();
    if (ctx.print) {
      active(null);
      add(panel, h('div', { class: 'vz-agent-grid' }, h('div', { class: 'vz-agent-wrap' }, svg, center),
        h('ul', { class: 'vz-agent-zlist' }, Object.keys(C30_ZONES).map((k) => h('li', { class: 'vz-z-' + k }, h('strong', null, C30_ZONES[k].label), ' · ' + C30_ZONES[k].tache + '. ' + C30_ZONES[k].txt)))),
        note('Les losanges marquent votre validation : ici, la zone orange (validation du plan, puis exécution libre).'));
      idle();
      return;
    }
    add(panel, h('div', { class: 'vz-b-row' }, zones, planChip),
      h('div', { class: 'vz-agent-grid' }, h('div', { class: 'vz-agent-wrap' }, svg, center), h('div', null, runBtn, log)),
      note('Le plan est le moment où l’on peut encore avoir tort à peu de frais. Les losanges marquent les points où vous validez.'));
    idle();
  }

  const C30_SESSIONS = [
    { nom: 'Claude 1', tache: 'écrit des tests', gate: true },
    { nom: 'Claude 2', tache: 'explore une question', gate: false },
    { nom: 'Sous-agent', tache: 'cherche dans le code, ne rapporte que sa conclusion', gate: false },
    { nom: 'Claude 3', tache: 'nouvelle fonctionnalité, plan à valider', gate: true }
  ];
  const C30_PHASES = ['Explorer', 'Planifier', 'Coder', 'Vérifier'];

  function c30Couloirs(panel, ctx) {
    let n = 2;
    let lanes = [];
    let raf = null, last = 0, sollicite = 0, waitingSince = null;
    const host = h('div', { class: 'vz-lanes' });
    const status = h('p', { class: 'vz-lanes-status', 'aria-live': 'polite' });
    function build() {
      cancelAnimationFrame(raf);
      clear(host);
      lanes = C30_SESSIONS.slice(0, n).map((s, i) => {
        const L = { s, p: ctx.print ? [3.0, 1.5, 4.0, 2.2][i] : 0, speed: [0.21, 0.27, 0.36, 0.18][i], waiting: false, validated: !s.gate, done: false };
        const fill = h('span', { class: 'vz-lane-fill' });
        const bell = h('span', { class: 'vz-lane-bell', 'aria-hidden': 'true' }, pixIcon(PIX.bell, 'currentColor', 14));
        const vb = btn('Valider le plan', () => { L.waiting = false; L.validated = true; vb.hidden = true; row.classList.remove('vz-is-wait'); tick(); }, { small: true, primary: true, cls: 'vz-lane-ok', aria: 'Valider le plan de ' + s.nom });
        vb.hidden = true;
        const phases = h('div', { class: 'vz-lane-track' }, C30_PHASES.map((p) => h('span', { class: 'vz-lane-ph' }, p)), fill);
        const row = h('div', { class: 'vz-lane' + (s.nom === 'Sous-agent' ? ' vz-is-sub' : '') },
          h('div', { class: 'vz-lane-head' }, h('span', { class: 'vz-lane-tab' }, String(i + 1)), h('strong', null, s.nom), h('span', { class: 'vz-lane-task' }, s.tache), bell, vb),
          phases);
        Object.assign(L, { fill, vb, row, phases });
        host.appendChild(row);
        return L;
      });
      paint();
    }
    function paint() {
      lanes.forEach((L) => {
        L.fill.style.width = (L.p / 4 * 100) + '%';
        L.phases.querySelectorAll('.vz-lane-ph').forEach((ph, k) => ph.classList.toggle('vz-is-on', L.p > k));
        L.row.classList.toggle('vz-is-done', L.done);
        L.row.classList.toggle('vz-is-wait', L.waiting);
        L.vb.hidden = !L.waiting;
      });
      const w = lanes.filter((L) => L.waiting).length;
      const d = lanes.filter((L) => L.done).length;
      status.textContent = d === lanes.length && lanes.length ? 'Toutes les sessions ont fini. Vous avez distribué, vérifié, tranché : temps où l’on vous a attendu, ' + fmt(sollicite / 1000, 1) + ' s.'
        : w ? w + ' session' + (w > 1 ? 's attendent' : ' attend') + ' votre accord.' : 'Les sessions travaillent, chacune dans sa copie du dépôt.';
    }
    function tick(t) {
      cancelAnimationFrame(raf);
      last = 0;
      const loop = (now) => {
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
        last = now;
        let running = false;
        const anyWait = lanes.some((L) => L.waiting);
        if (anyWait) { sollicite += dt * 1000; }
        lanes.forEach((L) => {
          if (L.done || L.waiting) return;
          L.p += dt * L.speed * (canMove() ? 1 : 6);
          if (L.p >= 2 && !L.validated) { L.p = 2; L.waiting = true; }
          if (L.p >= 4) { L.p = 4; L.done = true; }
          running = true;
        });
        paint();
        if (running) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    const nSeg = seg([1, 2, 3, 4].map((k) => ({ value: k, label: k + (k === 1 ? ' session' : ' sessions') })), n, (v) => { n = v; build(); }, 'Nombre de sessions');
    const go = btn('Lancer les sessions', () => { build(); sollicite = 0; tick(); }, { primary: true });
    if (ctx.print) {
      n = 4; build();
      lanes[3].waiting = true; paint();
      add(panel, host, note('Chaque session travaille dans sa propre copie du dépôt ; une cloche signale celle qui a besoin de vous. Commencez par deux.'));
      return;
    }
    add(panel, h('div', { class: 'vz-b-row' }, nSeg, go), host, status,
      note('Un chef d’orchestre ne joue d’aucun instrument pendant le concert. Commencez par deux sessions : l’une écrit des tests, l’autre explore une question.'));
    build();
  }

  VIZ['ch30-agent'] = {
    chapitre: 'ch30',
    titre: 'La boucle de l’agent',
    consigne: 'Choisissez la zone de la tâche et lancez une séance ; puis faites travailler plusieurs Claude en parallèle.',
    ancre: 'Mise en pratique : une séance complète',
    render(el, ctx) {
      root(el, 'agent', ctx);
      tabbed(el, ctx, [
        { label: 'Explorer, planifier, coder, vérifier', render: (p) => c30Boucle(p, ctx) },
        { label: 'Plusieurs Claude en parallèle', render: (p) => c30Couloirs(p, ctx) }
      ], 'Claude Code au travail');
    }
  };

  /* ================= ch31 : L'inspecteur ================= */

  function c31Site() {
    const q = {};
    const span = (cls, txt, key) => { const e = h('span', { class: cls }, txt); if (key) q[key] = e; return e; };
    const page = h('div', { class: 'vz-insp-page' },
      h('div', { class: 'vz-insp-hd' },
        span('vz-insp-logo', 'Le Guide du Vibe Coding', 'logo'),
        h('div', { class: 'vz-insp-nav' }, ['Le livre', 'Les chapitres', 'L’auteur', 'Ressources'].map((t) => span('vz-insp-link', t)), span('vz-insp-link vz-insp-buynav', 'Acheter')),
        span('vz-insp-burger', '≡')),
      h('div', { class: 'vz-insp-hero' },
        h('div', { class: 'vz-insp-herotxt' },
          span('vz-insp-h', 'Le Guide du Vibe Coding', 'titre'),
          span('vz-insp-p', 'Construire vos propres outils avec Claude et Lovable, sans savoir coder.'),
          span('vz-insp-cta', 'Lire un extrait', 'cta')),
        span('vz-insp-cover', '', 'cover')),
      h('div', { class: 'vz-insp-news' },
        span('vz-insp-newsl', 'Lettre d’information'),
        h('div', { class: 'vz-insp-newsrow' }, span('vz-insp-field', 'votre@adresse', 'field'), span('vz-insp-sub', 'S’inscrire', 'sub')),
        span('vz-insp-err', 'Indiquez une adresse e-mail valide.', 'err')),
      h('div', { class: 'vz-insp-ft' }, span('vz-insp-ftl', 'Mentions légales', 'mentions'), span('vz-insp-ftl', 'Confidentialité')),
      span('vz-insp-buy', 'Acheter', 'buy'),
      h('div', { class: 'vz-insp-cookies' }, span(null, 'Mesure d’audience : acceptez-vous les cookies ?', 'cookies'), span('vz-insp-ck', 'Accepter'), span('vz-insp-ck', 'Refuser')),
      span('vz-insp-404', '404 · Page introuvable', 'p404'));
    return { page, q };
  }
  function c31App() {
    const q = {};
    const span = (cls, txt, key) => { const e = h('span', { class: cls }, txt); if (key) q[key] = e; return e; };
    const page = h('div', { class: 'vz-insp-page vz-insp-app' },
      h('div', { class: 'vz-insp-hd' }, span('vz-insp-logo', 'Audit Vibe Coding'), span('vz-insp-who', 'non connecté', 'who')),
      h('div', { class: 'vz-insp-appbody' },
        span('vz-insp-h', 'Connexion', 'titre'),
        h('div', { class: 'vz-insp-newsrow' }, span('vz-insp-field', 'compte de test (variable d’environnement)', 'field'), span('vz-insp-sub', 'Se connecter', 'login')),
        span('vz-insp-report', 'Rapport : application « Réservation coachs » · 3 constats', 'report'),
        span('vz-insp-deny', 'Accès refusé : ce rapport n’existe pas pour vous.', 'deny'),
        span('vz-insp-leak', 'Rapport de A affiché au compte B', 'leak')));
    return { page, q };
  }

  VIZ['ch31-inspecteur'] = {
    chapitre: 'ch31',
    titre: 'L’inspecteur',
    consigne: 'Lancez la recette : le curseur robot parcourt le site, contrôle chaque point et rend son rapport.',
    ancre: 'Mise en pratique sur le site du livre',
    render(el, ctx) {
      root(el, 'insp', ctx);
      const S = { scen: 'site', corrige: false, i: -1, running: false, results: [] };
      const view = h('div', { class: 'vz-insp-view' });
      const url = h('span', { class: 'vz-insp-url' }, 'https://[votre-domaine]/');
      const widthTag = h('span', { class: 'vz-insp-wtag' }, 'Ordinateur');
      const browser = h('div', { class: 'vz-insp-browser', 'aria-hidden': 'true' },
        h('div', { class: 'vz-insp-chrome' }, h('span', { class: 'vz-insp-dots' }, h('i'), h('i'), h('i')), url, widthTag),
        view);
      const cursor = h('div', { class: 'vz-insp-cursor' }, pixIcon(PIX.robot, 'currentColor', 22));
      const consoleBox = h('div', { class: 'vz-insp-console' }, h('span', null, 'Console'), h('span', null, '0 erreur · 0 avertissement'));
      const log = h('ol', { class: 'vz-insp-log', 'aria-live': 'polite' });
      const report = h('div', { class: 'vz-insp-report-out' });
      let site = null;

      const W = { ordi: ['Ordinateur', 560], tablette: ['Tablette', 420], tel: ['Téléphone', 250] };
      function setWidth(k) { view.dataset.w = k; widthTag.textContent = W[k][0]; fit(); }
      function fit() {
        if (!site) return;
        const k = view.dataset.w || 'ordi';
        const vw = view.clientWidth || 560, vh = view.clientHeight || 300;
        const sc = Math.min(1, (vw - 12) / 560);
        site.page.style.width = W[k][1] + 'px';
        site.page.style.transform = 'scale(' + sc.toFixed(3) + ')';
        site.page.style.height = Math.round(vh / sc) + 'px';
      }
      onResize(view, fit);
      function mount() {
        site = S.scen === 'site' ? c31Site() : c31App();
        clear(view);
        add(view, site.page, consoleBox, cursor);
        view.classList.remove('vz-is-404', 'vz-is-a11y', 'vz-is-console', 'vz-is-err', 'vz-st-logA', 'vz-st-report', 'vz-st-logB', 'vz-st-deny', 'vz-st-leak', 'vz-is-cover');
        setWidth('ordi');
        url.textContent = S.scen === 'site' ? 'https://[votre-domaine]/' : 'https://staging.[votre-domaine]/connexion';
        cursor.style.transform = 'translate(12px, 12px)';
      }
      function point(elTarget) {
        if (!elTarget) return;
        const v = view.getBoundingClientRect(), r = elTarget.getBoundingClientRect();
        const x = clamp(r.left - v.left + r.width / 2, 6, v.width - 20), y = clamp(r.top - v.top + r.height / 2, 6, v.height - 20);
        cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      }
      const P = () => site.q;
      const STEPS = {
        site: [
          { t: 'Ouvrir la page d’accueil, navigateur visible', go: () => point(P().logo), r: () => ['ok', 'Titre « Le Guide du Vibe Coding », cinq liens dans le menu, bouton « Lire un extrait » visible sans défiler.'] },
          { t: 'Lire l’arbre d’accessibilité', go: () => { view.classList.add('vz-is-a11y'); point(P().titre); }, r: () => ['ok', 'Titres, boutons, champs et liens reçus avec leur texte et leur rôle.'], end: () => view.classList.remove('vz-is-a11y') },
          { t: 'Console du navigateur', go: () => view.classList.add('vz-is-console'), r: () => ['ok', 'Aucune erreur, aucun avertissement.'], end: () => view.classList.remove('vz-is-console') },
          { t: 'Largeur tablette', go: () => { setWidth('tablette'); }, r: () => ['ok', 'La mise en page tient.'] },
          { t: 'Largeur téléphone', go: () => { setWidth('tel'); setTimeout(() => point(P().buy), canMove() ? 650 : 0); }, r: () => ['ko', 'Le bouton « Acheter » passe sous le bandeau des cookies.', 'gênant'] },
          { t: 'Liens : chacun mène-t-il à une page ?', go: () => { setWidth('ordi'); setTimeout(() => { point(P().mentions); setTimeout(() => view.classList.add('vz-is-404'), canMove() ? 700 : 0); }, canMove() ? 500 : 0); }, r: () => ['ko', 'Le lien du pied de page vers les mentions légales mène à une page introuvable.', 'gênant'], end: () => view.classList.remove('vz-is-404') },
          { t: 'Images : chargées, avec texte alternatif ?', go: () => { view.classList.add('vz-is-cover'); point(P().cover); }, r: () => ['ko', 'Image de couverture sans texte alternatif.', 'cosmétique'], end: () => view.classList.remove('vz-is-cover') },
          { t: 'Formulaire envoyé vide', go: () => { point(P().sub); setTimeout(() => view.classList.add('vz-is-err'), canMove() ? 600 : 0); }, r: () => ['ok', 'Message d’erreur clair : « Indiquez une adresse e-mail valide. »'] },
          { t: 'Textes : fautes, démonstration oubliée', go: () => point(P().titre), r: () => ['ok', 'Aucun texte de démonstration oublié.'] }
        ],
        app: [
          { t: 'Connexion avec le compte de test A', go: () => { point(P().login); view.classList.add('vz-st-logA'); P().who.textContent = 'compte A'; }, r: () => ['ok', 'Identifiants lus dans les variables d’environnement, jamais affichés.'] },
          { t: 'Créer un rapport et noter son adresse', go: () => { view.classList.add('vz-st-report'); url.textContent = 'https://staging.[votre-domaine]/rapports/7f3a'; point(P().report); }, r: () => ['ok', 'Adresse notée : /rapports/7f3a.'] },
          { t: 'Se déconnecter, se connecter avec le compte B', go: () => { view.classList.remove('vz-st-report'); view.classList.add('vz-st-logB'); P().who.textContent = 'compte B'; url.textContent = 'https://staging.[votre-domaine]/connexion'; point(P().login); }, r: () => ['ok', 'Connecté avec le compte B.'] },
          { t: 'Ouvrir directement l’adresse du rapport de A', go: () => { url.textContent = 'https://staging.[votre-domaine]/rapports/7f3a'; view.classList.add(S.corrige ? 'vz-st-deny' : 'vz-st-leak'); point(S.corrige ? P().deny : P().leak); },
            r: () => S.corrige ? ['ok', 'Refus : le compte B ne voit rien du rapport de A.'] : ['ko', 'Le compte B lit le rapport de A : c’est la faille BOLA du chapitre 20.', 'bloquant'] },
          { t: 'Écrire le test de non-régression', go: () => {}, r: () => S.corrige ? ['ok', 'Le test d’isolation A et B devient une sentinelle permanente.'] : ['ko', 'Impossible de valider : corrigez d’abord la politique d’accès, puis relancez.', 'bloquant'] }
        ]
      };

      function drawLog() {
        clear(log);
        STEPS[S.scen].forEach((st, k) => {
          const res = S.results[k];
          log.appendChild(h('li', { class: 'vz-insp-li' + (k === S.i && !res ? ' vz-is-cur' : '') + (res ? ' vz-is-' + res[0] : '') },
            h('span', { class: 'vz-insp-li-ic', 'aria-hidden': 'true' }, res ? pixIcon(res[0] === 'ok' ? PIX.check : PIX.cross, 'currentColor', 12) : String(k + 1)),
            h('span', null, h('strong', null, st.t), res ? h('span', { class: 'vz-insp-li-d' }, res[1] + (res[2] ? ' · ' + res[2] : '')) : null)));
        });
      }
      function drawReport() {
        clear(report);
        const steps = STEPS[S.scen];
        if (S.results.length < steps.length) return;
        const ano = S.results.filter((r) => r[0] === 'ko');
        const okk = S.results.map((r, k) => [r, steps[k]]).filter((x) => x[0][0] === 'ok');
        add(report,
          h('p', { class: 'vz-insp-rtitle' }, 'qa/rapport-' + new Date().toISOString().slice(0, 10) + '.html'),
          h('p', { class: 'vz-insp-rsyn' }, ano.length ? ano.length + ' anomalie' + (ano.length > 1 ? 's' : '') + ', ' + (ano.some((a) => a[2] === 'bloquant') ? 'dont un bloquant en tête.' : 'aucun bloquant.') : 'Aucune anomalie : rapport vide de bloquants.'),
          ano.length ? h('table', { class: 'vz-b-table vz-insp-rtable' },
            h('thead', null, h('tr', null, h('th', null, 'Anomalie'), h('th', null, 'Gravité'))),
            h('tbody', null, ano.sort((a, b) => ['bloquant', 'gênant', 'cosmétique'].indexOf(a[2]) - ['bloquant', 'gênant', 'cosmétique'].indexOf(b[2])).map((a) => h('tr', null, h('td', null, a[1]), h('td', null, h('span', { class: 'vz-insp-grav vz-g-' + a[2].replace('ê', 'e').replace('é', 'e') }, a[2])))))) : null,
          h('p', { class: 'vz-insp-rok' }, 'Vérifié et fonctionne : ' + okk.map((x) => x[1].t.toLowerCase()).join(' ; ') + '.'));
      }
      async function stepOnce() {
        const steps = STEPS[S.scen];
        if (S.i >= 0 && steps[S.i] && steps[S.i].end) steps[S.i].end();
        if (S.results.length >= steps.length) { reset(); }
        S.i = S.results.length;
        const st = steps[S.i];
        drawLog();
        st.go();
        await wait(canMove() ? 1300 : 150);
        S.results.push(st.r());
        drawLog();
        drawReport();
      }
      async function runAll() {
        if (S.running) return;
        S.running = true; runBtn.disabled = true; stepBtn.disabled = true;
        if (S.results.length >= STEPS[S.scen].length || S.results.length === 0) reset();
        while (S.results.length < STEPS[S.scen].length) { await stepOnce(); await wait(canMove() ? 350 : 50); }
        S.running = false; runBtn.disabled = false; stepBtn.disabled = false;
        runBtn.textContent = 'Relancer la recette';
      }
      function reset() { S.i = -1; S.results = []; mount(); drawLog(); drawReport(); }
      const runBtn = btn('Lancer la recette', runAll, { primary: true });
      const stepBtn = btn('Pas à pas', () => { if (!S.running) stepOnce(); }, { small: true });
      const fix = chip('Politique d’accès corrigée', S.corrige, (v) => { S.corrige = v; if (!S.running) reset(); }, 'vz-insp-fix');
      fix.hidden = true;
      const scen = seg([{ value: 'site', label: 'Site du livre' }, { value: 'app', label: 'Audit Vibe Coding : deux comptes' }], S.scen,
        (v) => { if (S.running) return scen.set(S.scen); S.scen = v; fix.hidden = v !== 'app'; runBtn.textContent = 'Lancer la recette'; reset(); }, 'Projet inspecté');

      if (ctx.print) {
        mount();
        S.results = STEPS.site.map((st) => st.r());
        S.i = 99;
        setWidth('tel');
        add(el, h('div', { class: 'vz-insp-grid' }, browser, h('div', null, kicker('Journal de la recette'), log)), report);
        drawLog(); drawReport();
        return;
      }
      add(el, h('div', { class: 'vz-b-row' }, scen, fix),
        h('div', { class: 'vz-insp-grid' }, browser, h('div', { class: 'vz-insp-side' }, h('div', { class: 'vz-b-row' }, runBtn, stepBtn), log)),
        report,
        note('L’inspecteur constate, il ne corrige pas : aucun paiement réel, aucun envoi à une vraie adresse, uniquement des comptes de test.'));
      reset();
    }
  };

  /* ================= ch32 : Monter sur le texte ================= */

  const C32_TYPES = { p: 'parole', h: 'hésitation', s: 'silence', d: 'prise 1', x: 'digression' };
  const C32_SEGS = [
    ['x', 7.0, 'Bonjour à tous, alors aujourd’hui on va parler de plein de choses, installez-vous.'],
    ['p', 6.0, 'Vous avez une idée de site, et l’envie de le construire tout de suite.'],
    ['h', 1.4, 'Euh…'],
    ['p', 4.5, 'Avant d’ouvrir Lovable, partez du problème.'],
    ['s', 2.6, '[silence]'],
    ['d', 9.0, 'Bon, la formule, c’est… quand, je veux, pour… attendez, je reprends.'],
    ['p', 7.0, 'Une formule aide : « Quand [situation], je veux [motivation], pour [résultat attendu]. »'],
    ['p', 8.5, 'Pour le visiteur : « Quand j’arrive sur la page du livre, je veux comprendre en quelques secondes s’il est fait pour moi. »'],
    ['h', 1.8, 'Hum, voilà.'],
    ['x', 12.0, 'Petite parenthèse : j’ai longtemps hésité sur la couleur de la couverture, mais ce sera pour une autre vidéo.'],
    ['p', 5.0, 'Ce que le visiteur « embauche », c’est une réponse rapide.'],
    ['p', 6.5, 'Ensuite, créez un projet dans Claude, du même nom que le projet Lovable.'],
    ['s', 3.2, '[silence]'],
    ['p', 7.5, 'Demandez-lui de ne pas vous flatter : un modèle trouve volontiers toutes les idées excellentes.'],
    ['d', 6.5, 'Puis, euh, parlez à des lecteurs… non, je la refais.'],
    ['p', 8.0, 'Puis parlez à de vrais lecteurs, avec des questions sur des faits passés, pas sur leurs intentions.'],
    ['h', 1.2, 'Euh…'],
    ['x', 9.0, 'J’en parle bien plus longuement dans le livre, évidemment, au chapitre 9, qui est d’ailleurs l’un de mes préférés.'],
    ['p', 6.0, 'Cinq entretiens pour savoir si le problème existe, dix pour décider.'],
    ['x', 10.5, 'Je vous mets aussi le lien vers ma playlist préférée, ça n’a rien à voir, mais bon.'],
    ['p', 5.5, 'Et notez tout dans votre journal de décisions, avant d’oublier.'],
    ['s', 4.0, '[silence]']
  ];
  const C32_CIBLE = 90;

  function tc(s) { const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, '0') + ':' + r.toFixed(1).padStart(4, '0'); }
  function duree(s) { const m = Math.floor(s / 60), r = Math.round(s - m * 60); return (m ? m + ' min ' : '') + r + ' s'; }

  VIZ['ch32-montage'] = {
    chapitre: 'ch32',
    titre: 'Monter sur le texte',
    consigne: 'Barrez les phrases à couper : la durée et la timeline se recalculent, jusqu’au tutoriel de 90 secondes.',
    ancre: 'Mise en pratique : le tutoriel du chapitre 9',
    render(el, ctx) {
      root(el, 'montage', ctx);
      let t = 0;
      const segs = C32_SEGS.map((s, i) => { const o = { i, type: s[0], d: s[1], txt: s[2], start: t, cut: false }; t += s[1]; return o; });
      const brut = t;
      if (ctx.print) segs.forEach((s) => { s.cut = s.type !== 'p'; });

      const head = h('div', { class: 'vz-mont-head', 'aria-live': 'polite' });
      const tlSrc = h('div', { class: 'vz-mont-tl', 'aria-hidden': 'true' });
      const tlOut = h('div', { class: 'vz-mont-tl vz-mont-tl--out', 'aria-hidden': 'true' });
      const playhead = h('span', { class: 'vz-mont-playhead' });
      const lines = h('ol', { class: 'vz-mont-lines' });
      const edl = h('div', { class: 'vz-mont-edl' });
      let playing = null;

      const lineEls = segs.map((s) => {
        const inner = [h('span', { class: 'vz-mont-tc' }, tc(s.start)), h('span', { class: 'vz-mont-txt' }, s.txt), s.type !== 'p' ? h('span', { class: 'vz-mont-type vz-t-' + s.type }, C32_TYPES[s.type]) : null];
        const b = ctx.print ? h('div', { class: 'vz-mont-line vz-t-' + s.type }, inner)
          : h('button', { type: 'button', class: 'vz-mont-line vz-t-' + s.type, 'aria-pressed': 'false', 'aria-label': (s.cut ? 'Rétablir : ' : 'Couper : ') + s.txt }, inner);
        if (!ctx.print) b.addEventListener('click', () => { s.cut = !s.cut; draw(); });
        lines.appendChild(h('li', null, b));
        return b;
      });

      function draw() {
        const garde = segs.filter((s) => !s.cut);
        const dur = garde.reduce((a, s) => a + s.d, 0);
        lineEls.forEach((b, k) => {
          const s = segs[k];
          b.classList.toggle('vz-is-cut', s.cut);
          if (!ctx.print) { b.setAttribute('aria-pressed', String(s.cut)); b.setAttribute('aria-label', (s.cut ? 'Rétablir : ' : 'Couper : ') + s.txt); }
        });
        clear(head);
        const ok = dur <= C32_CIBLE;
        add(head,
          h('div', { class: 'vz-mont-big' + (ok ? ' vz-is-ok' : '') }, h('span', null, 'Montage'), h('strong', null, duree(dur)), h('span', null, 'cible 90 s')),
          h('div', { class: 'vz-mont-stats' },
            h('span', null, 'Rushes : ' + duree(brut)),
            h('span', null, 'Coupé : ' + duree(brut - dur)),
            h('span', null, garde.length + ' plans gardés sur ' + segs.length)),
          h('p', { class: 'vz-mont-verdict' }, ok ? (garde.some((s) => s.type !== 'p') ? 'Sous la cible. Il reste des hésitations ou des silences : les gardez-vous exprès ?' : 'Sous la cible, une seule idée forte. Le montage papier est prêt pour le rendu.') : 'Encore ' + duree(dur - C32_CIBLE) + ' de trop. Commencez par les hésitations, les silences et la première prise.'));
        clear(tlSrc);
        segs.forEach((s) => tlSrc.appendChild(h('span', { class: 'vz-mont-seg vz-t-' + s.type + (s.cut ? ' vz-is-cut' : ''), style: { flexGrow: s.d } })));
        clear(tlOut);
        const total = Math.max(dur, C32_CIBLE);
        garde.forEach((s) => tlOut.appendChild(h('span', { class: 'vz-mont-seg vz-t-' + s.type, style: { width: (s.d / total * 100) + '%' }, dataset: { i: s.i } })));
        tlOut.appendChild(h('span', { class: 'vz-mont-target', style: { left: (C32_CIBLE / total * 100) + '%' } }, h('span', null, '90 s')));
        tlOut.appendChild(playhead);
        clear(edl);
        let out = 0;
        const rows = garde.map((s) => { const r = tc(out) + '  ←  rush ' + tc(s.start) + ' → ' + tc(s.start + s.d); out += s.d; return r; });
        const txt = 'Liste de coupes (montage papier)\n' + rows.join('\n');
        add(edl, h('pre', { class: 'vz-b-pre vz-mont-pre' }, txt), ctx.print ? null : btnCopy(txt));
      }
      function btnCopy(txt) { const b = btn('Copier la liste de coupes', () => copier(ctx, txt, b), { small: true }); return b; }
      function play() {
        if (playing) { cancelAnimationFrame(playing); playing = null; playBtn.textContent = 'Lire le montage'; el.classList.remove('vz-is-playing'); return; }
        const garde = segs.filter((s) => !s.cut);
        const dur = garde.reduce((a, s) => a + s.d, 0);
        const total = Math.max(dur, C32_CIBLE);
        const speed = 8, t0 = performance.now();
        playBtn.textContent = 'Arrêter';
        el.classList.add('vz-is-playing');
        const step = (now) => {
          const pos = (now - t0) / 1000 * speed;
          playhead.style.left = (Math.min(pos, dur) / total * 100) + '%';
          let acc = 0, cur = null;
          for (const s of garde) { if (pos < acc + s.d) { cur = s; break; } acc += s.d; }
          lineEls.forEach((b, k) => b.classList.toggle('vz-is-play', !!cur && segs[k] === cur));
          if (cur) playing = requestAnimationFrame(step);
          else { playing = null; playBtn.textContent = 'Lire le montage'; el.classList.remove('vz-is-playing'); lineEls.forEach((b) => b.classList.remove('vz-is-play')); }
        };
        playing = requestAnimationFrame(step);
      }
      const playBtn = btn('Lire le montage', play, { primary: true });
      const auto = btn('Supprimer hésitations et silences', () => { segs.forEach((s) => { if (s.type === 'h' || s.type === 's') s.cut = true; }); draw(); }, { small: true });
      const prise = btn('Garder la deuxième prise', () => { segs.forEach((s) => { if (s.type === 'd') s.cut = true; }); draw(); }, { small: true });
      const reset = btn('Tout rétablir', () => { segs.forEach((s) => { s.cut = false; }); draw(); }, { small: true });

      if (ctx.print) {
        add(el, head, h('div', { class: 'vz-mont-tls' }, h('span', { class: 'vz-mont-tll' }, 'Rushes'), tlSrc, h('span', { class: 'vz-mont-tll' }, 'Montage'), tlOut), lines);
        draw();
        return;
      }
      add(el, head,
        h('div', { class: 'vz-mont-tls' }, h('span', { class: 'vz-mont-tll' }, 'Rushes'), tlSrc, h('span', { class: 'vz-mont-tll' }, 'Montage'), tlOut),
        h('div', { class: 'vz-b-row' }, canMove() ? playBtn : null, auto, prise, reset),
        kicker('Transcription horodatée : cliquez une phrase pour la couper'),
        lines, edl,
        note('L’agent ne regarde pas la vidéo : il lit la transcription au mot près, comme le monteur de documentaires travaillait sur papier. Les décisions de goût restent les vôtres.'));
      draw();
    }
  };

  /* ================= ch33 : Ce que nous avons construit ================= */

  const C33_TITRES = {
    1: 'L’ère du développeur augmenté', 2: 'Ce que « vibe coding » veut dire', 3: 'Anatomie d’une application, la maison', 4: 'Configurer Claude : votre atelier',
    5: 'Construire sa mémoire', 6: 'Lovable et GitHub, le socle', 7: 'Les vingt réflexes du premier jour', 8: 'Le lexique illustré',
    9: 'Imaginer : de l’idée au message', 10: 'Le cahier des charges du site vitrine', 11: 'Construire le site avec Lovable, pas à pas', 12: 'Mettre en ligne', 13: 'Vendre le livre depuis le site',
    14: 'Concevoir L’Atelier', 15: 'Lovable Cloud et la base de données', 16: 'Mettre Claude dans l’application', 17: 'MCP et connecteurs', 18: 'Déboguer, tester, recetter', 19: 'Reprendre la main, marche par marche', 20: 'La sécurité, sans jargon',
    21: 'Du service au SaaS', 22: 'Le cahier des charges complet d’un SaaS', 23: 'Abonnements, clients multiples et facturation', 24: 'Le modèle de mise en production', 25: 'Scaler l’application', 26: 'Le droit',
    27: 'Démultiplier avec les compétences', 28: 'Claude mentor', 29: 'Limites, mythes et dette technique', 30: 'Dans la tête de l’agent', 31: 'Donner des yeux à Claude', 32: 'Monter sans timeline', 33: 'Conclusion : l’art de demander', 34: 'Douze recettes'
  };
  const C33_GROUPES = [
    { id: 'site', nom: 'Le site vitrine', role: 'Il présente l’ouvrage et le vend.', ch: [9, 10, 11, 12, 13], x: 78, y: 200, r: 11, orb: 40 },
    { id: 'atelier', nom: 'L’Atelier', role: 'Il organise la fabrication et la relecture du livre.', ch: [14, 15, 16, 17, 18, 19, 20], x: 200, y: 168, r: 14, orb: 48 },
    { id: 'saas', nom: 'Audit Vibe Coding', role: 'Le SaaS, qui transforme ce que nous avons appris en service.', ch: [21, 22, 23, 24, 25, 26], x: 322, y: 200, r: 17, orb: 46 }
  ];
  const C33_GESTES = [
    { id: 'spec', nom: 'Spécifier', ch: [10, 14, 22] },
    { id: 'pas', nom: 'Petits pas', ch: [7, 11, 23] },
    { id: 'verif', nom: 'Vérifier', ch: [18, 24, 31] },
    { id: 'sauve', nom: 'Sauvegarder', ch: [6, 24, 34] },
    { id: 'secu', nom: 'Sécuriser', ch: [15, 20, 23] },
    { id: 'mesure', nom: 'Mesurer', ch: [12, 21, 25] },
    { id: 'doc', nom: 'Documenter', ch: [5, 22, 30] }
  ];

  VIZ['ch33-constellation'] = {
    chapitre: 'ch33',
    titre: 'La constellation du livre',
    consigne: 'Trois objets de complexité croissante, les mêmes gestes : choisissez un axe ou un geste pour relier les chapitres.',
    ancre: 'Trois convictions',
    render(el, ctx) {
      root(el, 'constel', ctx);
      const pos = {};
      /* Chapitres des axes, en orbite */
      C33_GROUPES.forEach((g) => g.ch.forEach((c, k) => {
        const a = (-90 + 360 * k / g.ch.length) * Math.PI / 180;
        pos[c] = { x: g.x + Math.cos(a) * g.orb, y: g.y + Math.sin(a) * g.orb, g: g.id };
      }));
      /* Socle (1 à 8) en arc en bas, Grandir (27 à 34) en arc en haut */
      const arc = (list, cy, ry, sens, gid) => list.forEach((c, k) => {
        const t = (k + 0.5) / list.length;
        const a = Math.PI * (1 - t);
        pos[c] = { x: 200 + Math.cos(a) * 170, y: cy + sens * Math.sin(a) * ry, g: gid };
      });
      arc([1, 2, 3, 4, 5, 6, 7, 8], 296, 26, 1, 'socle');
      arc([27, 28, 29, 30, 31, 32, 33, 34], 74, 40, -1, 'grandir');

      const svg = sv('svg', { class: 'vz-constel-svg', viewBox: '0 0 400 350', role: 'group', 'aria-label': 'Constellation des chapitres' });
      const bg = sv('g', { class: 'vz-constel-bg', 'aria-hidden': 'true' });
      for (let k = 0; k < 46; k++) {
        const x = (k * 97.3) % 400, y = (k * 61.7 + (k % 7) * 13) % 350;
        bg.appendChild(sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (k % 3) * 0.35 + 0.4, class: 'vz-constel-dust' }));
      }
      svg.appendChild(bg);
      const linksG = sv('g', { class: 'vz-constel-links', 'aria-hidden': 'true' });
      svg.appendChild(linksG);
      /* Liens fixes : complexité croissante */
      const fixed = sv('g', { class: 'vz-constel-fixed', 'aria-hidden': 'true' });
      for (let k = 0; k < 2; k++) {
        const a = C33_GROUPES[k], b = C33_GROUPES[k + 1];
        fixed.appendChild(sv('line', { x1: a.x + (b.x - a.x) * 0.3, y1: a.y + (b.y - a.y) * 0.3, x2: a.x + (b.x - a.x) * 0.7, y2: a.y + (b.y - a.y) * 0.7, class: 'vz-constel-arrow' }));
      }
      svg.insertBefore(fixed, linksG);
      svg.appendChild(sv('text', { x: 200, y: 340, 'text-anchor': 'middle', class: 'vz-constel-zone' }, 'le socle · chapitres 1 à 8'));
      svg.appendChild(sv('text', { x: 200, y: 16, 'text-anchor': 'middle', class: 'vz-constel-zone' }, 'grandir · chapitres 27 à 34'));

      const panel = h('div', { class: 'vz-constel-panel', 'aria-live': 'polite' });
      const starEls = {};
      let sel = { kind: null, id: null };

      function focusable(g, label, onAct) {
        if (ctx.print) return;
        setProps(g, { tabindex: '0', role: 'button', 'aria-label': label });
        g.addEventListener('click', onAct);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAct(); } });
      }
      Object.keys(pos).forEach((c, k) => {
        const p = pos[c];
        const g = sv('g', { class: 'vz-constel-star vz-g-' + p.g, transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')', style: '--k:' + k });
        g.appendChild(sv('circle', { r: 9, class: 'vz-constel-halo' }));
        g.appendChild(sv('circle', { r: p.g === 'socle' || p.g === 'grandir' ? 3 : 4, class: 'vz-constel-dot' }));
        g.appendChild(sv('text', { y: -8, 'text-anchor': 'middle', class: 'vz-constel-num' }, String(c)));
        focusable(g, 'Chapitre ' + c + ' : ' + C33_TITRES[c], () => select('ch', Number(c)));
        svg.appendChild(g);
        starEls[c] = g;
      });
      const axisEls = {};
      C33_GROUPES.forEach((gr, k) => {
        const g = sv('g', { class: 'vz-constel-axis vz-a-' + gr.id, transform: 'translate(' + gr.x + ' ' + gr.y + ')', style: '--k:' + (k + 30) });
        g.appendChild(sv('circle', { r: gr.r + 8, class: 'vz-constel-glow' }));
        const pts = [];
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? gr.r * 0.45 : gr.r; const a = (-90 + i * 36) * Math.PI / 180; pts.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr).toFixed(1)); }
        g.appendChild(sv('polygon', { points: pts.join(' '), class: 'vz-constel-astar' }));
        g.appendChild(sv('text', { y: gr.orb + 22, 'text-anchor': 'middle', class: 'vz-constel-alab' }, gr.nom));
        focusable(g, 'Axe : ' + gr.nom, () => select('axe', gr.id));
        svg.appendChild(g);
        axisEls[gr.id] = g;
      });

      function connect(list, cls) {
        const ordered = list.slice().sort((a, b) => a - b);
        for (let k = 0; k < ordered.length - 1; k++) {
          const a = pos[ordered[k]], b = pos[ordered[k + 1]];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 18;
          linksG.appendChild(sv('path', { d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1), class: 'vz-constel-link ' + cls }));
        }
      }
      function select(kind, id) {
        sel = sel.kind === kind && sel.id === id ? { kind: null, id: null } : { kind, id };
        draw();
      }
      function draw() {
        clear(linksG);
        let on = [];
        Object.values(axisEls).forEach((g) => g.classList.remove('vz-is-on'));
        gestes.forEach((b) => b.setAttribute('aria-pressed', String(sel.kind === 'geste' && b.dataset.id === sel.id)));
        clear(panel);
        if (sel.kind === 'axe') {
          const gr = C33_GROUPES.find((x) => x.id === sel.id);
          on = gr.ch;
          axisEls[gr.id].classList.add('vz-is-on');
          gr.ch.forEach((c) => linksG.appendChild(sv('line', { x1: gr.x, y1: gr.y, x2: pos[c].x, y2: pos[c].y, class: 'vz-constel-ray' })));
          add(panel, h('p', { class: 'vz-constel-ptitle' }, gr.nom), h('p', null, gr.role), h('ul', { class: 'vz-constel-plist' }, gr.ch.map((c) => h('li', null, h('span', null, String(c)), C33_TITRES[c]))));
        } else if (sel.kind === 'geste') {
          const ge = C33_GESTES.find((x) => x.id === sel.id);
          on = ge.ch;
          connect(ge.ch, 'vz-is-geste');
          add(panel, h('p', { class: 'vz-constel-ptitle' }, ge.nom), h('p', null, 'Le même geste, à des niveaux de complexité différents :'), h('ul', { class: 'vz-constel-plist' }, ge.ch.map((c) => h('li', null, h('span', null, String(c)), C33_TITRES[c]))));
        } else if (sel.kind === 'ch') {
          on = [sel.id];
          const g = (C33_GROUPES.find((x) => x.ch.includes(sel.id)) || {}).nom || (sel.id <= 8 ? 'Le socle' : 'Grandir');
          add(panel, h('p', { class: 'vz-constel-ptitle' }, 'Chapitre ' + sel.id), h('p', null, C33_TITRES[sel.id]), h('p', { class: 'vz-constel-pmeta' }, g));
        } else {
          add(panel, h('p', { class: 'vz-constel-ptitle' }, 'Spécifier, construire par petits pas, vérifier, sauvegarder, sécuriser, mesurer, documenter.'),
            h('p', null, 'Trois objets de complexité croissante partagent ces gestes. Choisissez un axe, un geste ou une étoile.'));
        }
        Object.keys(starEls).forEach((c) => {
          starEls[c].classList.toggle('vz-is-on', on.includes(Number(c)));
          starEls[c].classList.toggle('vz-is-dim', on.length > 0 && !on.includes(Number(c)));
        });
      }
      const gestes = C33_GESTES.map((ge) => {
        const b = h('button', { type: 'button', class: 'vz-b-chip vz-constel-geste', 'aria-pressed': 'false', dataset: { id: ge.id } }, ge.nom);
        b.addEventListener('click', () => select('geste', ge.id));
        return b;
      });

      if (ctx.print) {
        el.classList.add('vz-is-in');
        add(el, h('div', { class: 'vz-constel-wrap' }, svg),
          h('ul', { class: 'vz-constel-plegend' }, C33_GESTES.map((ge) => h('li', null, h('strong', null, ge.nom), ' : chapitres ' + ge.ch.join(', ')))));
        return;
      }
      add(el, h('div', { class: 'vz-constel-grid' }, h('div', { class: 'vz-constel-wrap' }, svg), panel),
        kicker('Les gestes partagés'), h('div', { class: 'vz-b-chips' }, gestes));
      draw();
      if (canMove()) whenVisible(el, () => el.classList.add('vz-is-in'));
      else el.classList.add('vz-is-in');
    }
  };

  /* ================= ch34 : Le menu des recettes ================= */

  const C34_RECETTES = [
    { n: 1, titre: 'Mini-outil dans un artefact Claude', outils: ['Claude'], comptes: 'Non', cout: (P) => '0 $ (Free) à ' + P.claude + ' $/mois (Pro)', gratuit: true, guide: 'ecriture', pour: 'Le « contrôleur de chapitre » : compter les mots, repérer les tirets interdits.' },
    { n: 2, titre: 'Page d’atterrissage pour tester une idée', outils: ['Lovable'], comptes: 'Une table, sans comptes', cout: () => '0 $ (Free)', gratuit: true, guide: 'saas', pour: 'La liste d’attente d’« Audit Vibe Coding », avant d’écrire une ligne.' },
    { n: 3, titre: 'Site vitrine d’un indépendant', outils: ['Lovable'], comptes: 'Non', cout: (P) => P.lovable + ' $/mois pour un domaine à soi', gratuit: false, guide: 'site', pour: 'Une présence sobre : qui vous êtes, ce que vous proposez, comment vous joindre.' },
    { n: 4, titre: 'Formulaire de contact avec e-mail', outils: ['Lovable'], comptes: 'Une table, sans comptes', cout: (P) => '0 à ' + P.lovable + ' $/mois', gratuit: true, guide: 'site', pour: 'Enregistrer la demande, vous prévenir, garder une trace.' },
    { n: 5, titre: 'Calculateur de devis', outils: ['Lovable'], comptes: 'Facultatif', cout: (P) => '0 à ' + P.lovable + ' $/mois', gratuit: true, guide: 'saas', pour: '« Estimer une mission de conseil » : une fourchette immédiate.' },
    { n: 6, titre: 'Annuaire filtrable', outils: ['Lovable'], comptes: 'Une table, un administrateur', cout: (P) => P.lovable + ' $/mois', gratuit: false, guide: 'site', pour: 'La page « Outils et ressources », version vivante de l’annexe I.' },
    { n: 7, titre: 'Tableau de bord depuis un tableur', outils: ['Claude', 'Lovable'], comptes: 'Selon la version', cout: (P) => '0 à ' + P.lovable + ' $/mois', gratuit: true, guide: 'ecriture', pour: 'L’avancement du Guide : chapitres par statut, mots contre l’objectif.' },
    { n: 8, titre: 'Lettre d’information', outils: ['Lovable', 'Resend'], comptes: 'Une table d’abonnés', cout: (P) => P.lovable + ' $/mois, Resend gratuit au départ', gratuit: false, guide: 'site', pour: 'Double consentement, liste propre, envoi par un service spécialisé.' },
    { n: 9, titre: 'Prise de rendez-vous', outils: ['Lovable'], comptes: 'Oui', cout: (P) => P.lovable + ' $/mois', gratuit: false, guide: 'saas', pour: 'L’appel de conseil réservé après le rapport d’audit.' },
    { n: 10, titre: 'Espace membre', outils: ['Lovable'], comptes: 'Oui, avec rôles', cout: (P) => P.lovable + ' $/mois', gratuit: false, guide: 'atelier', pour: 'La même mécanique sert aux relecteurs bêta de L’Atelier.' },
    { n: 11, titre: 'Assistant de FAQ avec Claude', outils: ['Claude', 'Lovable', 'API'], comptes: 'Selon la version', cout: (P) => '0 à ' + P.lovable + ' $/mois + API à l’usage', gratuit: true, guide: 'site', pour: 'Répondre à partir de vos textes, et seulement d’eux.' },
    { n: 12, titre: 'Export de données et sauvegarde', outils: ['Lovable', 'GitHub'], comptes: 'Oui', cout: () => 'Inclus', gratuit: true, guide: 'tous', pour: 'L’assurance de toutes les autres : « depuis quand avez-vous une copie ? »' }
  ];
  const C34_GUIDE = { site: 'Site vitrine', atelier: 'L’Atelier', ecriture: 'Écriture du livre', saas: 'SaaS', tous: 'Les trois axes' };
  const C34_NIVEAUX = {
    tous: { label: 'Toutes', test: () => true },
    debut: { label: 'Pour débuter (1 à 5)', test: (r) => r.n <= 5 },
    droits: { label: 'Base et droits (6 à 11)', test: (r) => r.n >= 6 && r.n <= 11 },
    assur: { label: 'Assurance (12)', test: (r) => r.n === 12 }
  };

  VIZ['ch34-menu'] = {
    chapitre: 'ch34',
    titre: 'Le menu des recettes',
    consigne: 'Filtrez les douze recettes, puis composez votre menu : une recette par séance.',
    ancre: 'Recette 1. Un mini-outil',
    render(el, ctx) {
      root(el, 'recettes', ctx);
      const P = { lovable: 25, claude: 20 };
      const F = { niveau: 'tous', outils: new Set(), gratuit: false, guide: 'tout' };
      const menu = [];
      const grid = h('div', { class: 'vz-rec-grid' });
      const count = h('p', { class: 'vz-rec-count', 'aria-live': 'polite' });
      const tray = h('div', { class: 'vz-rec-tray' });

      function gauge(n) {
        return h('span', { class: 'vz-rec-gauge', 'aria-label': 'Exigence ' + n + ' sur 12', role: 'img' }, Array.from({ length: 12 }, (_, k) => h('span', { class: k < n ? 'vz-is-on' : '' })));
      }
      const cards = C34_RECETTES.map((r) => {
        const costEl = h('span', { class: 'vz-rec-cout' });
        const addBtn = ctx.print ? null : h('button', { type: 'button', class: 'vz-rec-add', 'aria-pressed': 'false', 'aria-label': 'Ajouter la recette ' + r.n + ' à mon menu' }, '+ Menu');
        if (addBtn) addBtn.addEventListener('click', () => toggleMenu(r.n));
        const card = h('article', { class: 'vz-rec-card' + (r.n <= 5 ? ' vz-lv-debut' : r.n <= 11 ? ' vz-lv-droits' : ' vz-lv-assur') },
          h('div', { class: 'vz-rec-top' }, h('span', { class: 'vz-rec-n' }, String(r.n).padStart(2, '0')), gauge(r.n), addBtn),
          h('p', { class: 'vz-rec-titre' }, r.titre),
          ctx.print ? null : h('p', { class: 'vz-rec-pour' }, r.pour),
          h('p', { class: 'vz-rec-tags' }, r.outils.map((o) => h('span', { class: 'vz-rec-tag' }, o))),
          h('dl', { class: 'vz-rec-dl' },
            h('dt', null, 'Comptes et base'), h('dd', null, r.comptes),
            h('dt', null, 'Coût de départ'), h('dd', null, costEl),
            ctx.print ? null : h('dt', null, 'Dans le Guide'), ctx.print ? null : h('dd', null, C34_GUIDE[r.guide])));
        return { r, card, costEl, addBtn };
      });
      add(grid, cards.map((c) => c.card));

      function drawCosts() { cards.forEach((c) => { c.costEl.textContent = c.r.cout(P); }); }
      function visible(r) {
        if (!C34_NIVEAUX[F.niveau].test(r)) return false;
        if (F.gratuit && !r.gratuit) return false;
        if (F.outils.size && !r.outils.some((o) => F.outils.has(o))) return false;
        if (F.guide !== 'tout' && r.guide !== F.guide && r.guide !== 'tous') return false;
        return true;
      }
      function drawGrid() {
        let n = 0;
        cards.forEach((c) => {
          const v = visible(c.r);
          if (v) n++;
          const was = !c.card.hidden;
          c.card.hidden = !v;
          if (v && !was && canMove()) { c.card.classList.remove('vz-is-pop'); void c.card.offsetWidth; c.card.classList.add('vz-is-pop'); }
          if (c.addBtn) { const inMenu = menu.includes(c.r.n); c.addBtn.setAttribute('aria-pressed', String(inMenu)); c.addBtn.textContent = inMenu ? '✓ Au menu' : '+ Menu'; c.card.classList.toggle('vz-is-menu', inMenu); }
        });
        count.textContent = n + ' recette' + (n > 1 ? 's' : '') + ' sur 12';
        grid.classList.toggle('vz-is-empty', n === 0);
      }
      function toggleMenu(n) {
        const k = menu.indexOf(n);
        if (k >= 0) menu.splice(k, 1); else menu.push(n);
        drawGrid(); drawTray();
      }
      function drawTray() {
        clear(tray);
        if (!menu.length) {
          add(tray, h('p', { class: 'vz-rec-tray-empty' }, 'Votre menu est vide. Ajoutez des recettes, ou partez d’un menu du livre.'));
          return;
        }
        const seances = menu.map((n, i) => {
          const r = C34_RECETTES[n - 1];
          const comptes = r.n >= 6;
          return h('li', { class: 'vz-rec-seance' },
            h('span', { class: 'vz-rec-sn' }, 'Séance ' + (i + 1)),
            h('div', null, h('strong', null, 'Recette ' + r.n + ' · ' + r.titre),
              h('span', { class: 'vz-rec-chain' }, ['plan relu', comptes ? 'recette à deux comptes' : 'recette', 'commit', 'carnet de bord'].map((s) => h('span', null, s)))),
            h('button', { type: 'button', class: 'vz-rec-x', 'aria-label': 'Retirer la recette ' + r.n, onclick: () => toggleMenu(r.n) }, '×'));
        });
        add(tray, h('ol', { class: 'vz-rec-seances' }, seances),
          !menu.includes(12) ? h('p', { class: 'vz-b-alert' }, 'Ajoutez la recette 12 : export et sauvegarde servent d’assurance à toutes les autres.') : null,
          menu.some((n) => n >= 6) ? note('À partir de la recette 6, la base et ses règles d’accès entrent en jeu : le chapitre 20 devient une lecture obligatoire.') : null);
      }
      if (ctx.print) {
        drawCosts();
        add(el, grid, note('Classées de la plus simple à la plus exigeante. Coûts ' + TARIF + '. Les recettes 1 à 5 se passent de comptes utilisateurs ; la 12 s’applique à toutes.'));
        return;
      }
      const niv = seg(Object.keys(C34_NIVEAUX).map((k) => ({ value: k, label: C34_NIVEAUX[k].label })), F.niveau, (v) => { F.niveau = v; drawGrid(); }, 'Niveau');
      const outils = h('div', { class: 'vz-b-chips', role: 'group', 'aria-label': 'Outils' }, ['Claude', 'Lovable', 'Resend', 'GitHub', 'API'].map((o) => chip(o, false, (v) => { if (v) F.outils.add(o); else F.outils.delete(o); drawGrid(); })),
        chip('Démarrage gratuit possible', false, (v) => { F.gratuit = v; drawGrid(); }, 'vz-rec-free'));
      const guide = h('select', { class: 'vz-b-select', 'aria-label': 'Usage dans le Guide' },
        h('option', { value: 'tout' }, 'Dans le Guide : tous les usages'),
        Object.keys(C34_GUIDE).filter((k) => k !== 'tous').map((k) => h('option', { value: k }, C34_GUIDE[k])));
      guide.addEventListener('change', () => { F.guide = guide.value; drawGrid(); });
      const presets = h('div', { class: 'vz-b-row' },
        btn('Le menu du site du Guide', () => { menu.length = 0; menu.push(3, 4, 6, 8, 11, 12); drawGrid(); drawTray(); }, { small: true }),
        btn('Le menu du SaaS', () => { menu.length = 0; menu.push(2, 5, 9, 12); drawGrid(); drawTray(); }, { small: true }),
        btn('Vider', () => { menu.length = 0; drawGrid(); drawTray(); }, { small: true }));
      const prix = h('details', { class: 'vz-rec-prix' }, h('summary', null, 'Prix utilisés (' + TARIF + ')'),
        h('div', { class: 'vz-b-row' },
          numIn({ label: 'Lovable Pro', value: P.lovable, step: 1, unit: '$ / mois', onInput: (v) => { P.lovable = v; drawCosts(); } }),
          numIn({ label: 'Claude Pro', value: P.claude, step: 1, unit: '$ / mois', onInput: (v) => { P.claude = v; drawCosts(); } })));
      add(el,
        h('div', { class: 'vz-rec-filters' }, niv, outils, h('div', { class: 'vz-b-row' }, guide, count)),
        grid, prix,
        h('div', { class: 'vz-rec-menu' }, h('div', { class: 'vz-rec-menuhead' }, kicker('Mon menu, une recette par séance'), presets), tray));
      drawCosts(); drawGrid(); drawTray();
    }
  };

})();
