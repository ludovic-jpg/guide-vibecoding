/* Guide du Vibe Coding : moteur de pixel art 2.0 (personnages-guides, pictogrammes, objets).
   Aucun module, aucune dépendance. Expose window.Pixel. Voir docs/CONTRAT-VIZ.md (API Pixel).
   Sprites : lignes de caractères ; '.' = transparent ; chaque lettre renvoie à une couleur de la palette.
   Convention de palette : MAJUSCULE = ton de base, minuscule = ombre calculée, chiffre = reflet calculé. */
(function () {
  'use strict';

  const OUT = '#0B0D12';            // contour d'un pixel
  const W = 26, H = 28;             // grille du personnage

  /* ---------- couleurs ---------- */
  const rgb = (h) => {
    h = String(h || '#888').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
  };
  const hex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const dk = (c, f = 0.3) => mix(c, '#1A1238', f);          // ombre : plus sombre et légèrement froide
  const lt = (c, f = 0.38) => mix(c, '#FFF7E6', f);         // reflet : plus clair et légèrement chaud
  const lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const dist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Couleurs fixes partagées (objets, chapeaux) : base, ombre, reflet */
  const FIXES = {
    N: '#AEB8C8', O: '#FBBF24', D: '#B7804A', Q: '#EF4444', U: '#3B82F6', V: '#7DBA4F',
    T: '#F3E9D2', W: '#F4F6FA', K: '#2B303D', Y: '#5B47A8'
  };
  const LIGHT = { N: '6', O: '7', D: '8', Q: '9', U: '0', S: '1', H: '2', C: '3', A: '4', Z: '5' };

  function role(P, base, c) {
    P[base] = c; P[base.toLowerCase()] = dk(c, 0.28);
    if (LIGHT[base]) P[LIGHT[base]] = lt(c, 0.38);
  }

  function palette(g, a, z) {
    const P = {};
    role(P, 'S', g.peau || '#E8B796');
    role(P, 'H', g.habit || '#8B5CF6');
    role(P, 'C', g.cheveux || '#3A2A1A');
    for (const k in FIXES) role(P, k, FIXES[k]);
    P.w = '#C5CDDA'; P.k = '#1B1E27';
    role(P, 'A', a || '#E5484D');
    role(P, 'Z', z || '#2B2F3D');
    P.P = g.robot ? dk(g.peau, 0.3) : mix(g.habit || '#555', '#232838', 0.62); P.p = dk(P.P, 0.3);
    P.F = g.robot ? '#5B6478' : '#3A3F52'; P.f = dk(P.F, 0.35);
    P.R = mix(g.peau || '#E8B796', '#FF5C7A', 0.38);
    P.E = '#151826';
    P.M = dk(g.peau || '#E8B796', 0.5);
    const glow = g.robot ? mix(g.habit, '#FFFFFF', 0.25) : '#7CF7FF';
    P.e = glow; P.j = mix(glow, '#FFFFFF', 0.75);
    P.g = '#FFFFFFCC';
    return P;
  }

  /* ---------- grille ---------- */
  function grille(w, h) {
    return { w, h, c: Array.from({ length: h }, () => Array(w).fill(null)), t: Array.from({ length: h }, () => Array(w).fill('')) };
  }
  // Peint un sprite. opts : {tag, item}
  function peindre(G, art, ox, oy, P, opts = {}) {
    for (let y = 0; y < art.length; y++) {
      const row = art[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const X = ox + x, Y = oy + y;
        if (X < 0 || Y < 0 || X >= G.w || Y >= G.h) continue;
        if (ch === 'G') { // verre : teinte ce qui est dessous
          const cur = G.c[Y][X];
          G.c[Y][X] = cur ? mix(cur.slice(0, 7), '#DDF0FF', 0.4) : '#BFE3FF88';
          if (opts.item) G.t[Y][X] = 'item';
          continue;
        }
        const col = P[ch];
        if (!col) continue;
        G.c[Y][X] = col;
        G.t[Y][X] = opts.tag ? opts.tag(ch) : (opts.item ? 'item' : '');
      }
    }
  }
  // Contour sombre d'un pixel autour de toute forme (4-voisinage)
  function contour(G) {
    const add = [];
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      if (G.c[y][x]) continue;
      let n = false, it = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < G.w && Y < G.h && G.c[Y][X]) { n = true; if (G.t[Y][X] === 'item') it = true; }
      }
      if (n) add.push([x, y, it]);
    }
    for (const [x, y, it] of add) { G.c[y][x] = OUT; G.t[y][x] = it ? 'item' : 'out'; }
  }
  // Fusionne les pixels contigus d'une même couleur sur une ligne : un chemin par couleur
  function chemins(G, filtre) {
    const parCouleur = new Map();
    for (let y = 0; y < G.h; y++) {
      let x = 0;
      while (x < G.w) {
        const c = G.c[y][x];
        if (!c || !filtre(x, y)) { x++; continue; }
        let n = 1;
        while (x + n < G.w && G.c[y][x + n] === c && filtre(x + n, y)) n++;
        if (!parCouleur.has(c)) parCouleur.set(c, []);
        parCouleur.get(c).push(`M${x} ${y}h${n}v1h-${n}z`);
        x += n;
      }
    }
    let s = '';
    for (const [c, d] of parCouleur) {
      const op = c.length === 9 ? ` fill-opacity="${(parseInt(c.slice(7), 16) / 255).toFixed(2)}"` : '';
      s += `<path fill="${c.slice(0, 7)}"${op} d="${d.join('')}"/>`;
    }
    return s;
  }

  /* ---------- corps de base (26 × 28) ---------- */
  const CORPS = [
    '', '', '', '', '',
    '.............SSSSSS.......',
    '............SSSSSSSS......',
    '...........1SSSSSSSSs.....',
    '...........SSSSSSSSSs.....',
    '...........SSSESSESSs.....',
    '...........SSSESSESSs.....',
    '...........SSRSSSSRSs.....',
    '...........SSSSMMSSSs.....',
    '............sSSSSSSs......',
    '.............ssssss.......',
    '............HHHssHHH......',
    '..........HHHHHHHHHHHH....',
    '.........hH.2HHHHHHh.Hh...',
    '........hH..2HHHHHHh.Hh...',
    '.......SS...2HHHHHHh.SS...',
    '.......ss...hhhhhhhh.ss...',
    '............PPPPPPPP......',
    '............PPP..PPP......',
    '............PPP..PPP......',
    '............pPP..PPp......',
    '...........FFFF..FFFF.....',
    '...........ffff..ffff.....'
  ];
  const TETE_ROBOT = [ // décalage (10,4)
    '..66NNNNNn..',
    '.66NNNNNNNn.',
    '.6KKKKKKKKn.',
    'nNKeeKKeeKnn',
    'nNKjeKKjeKnn',
    '.NKKKKKKKKn.',
    '.NKKeeeeKKn.',
    '.NKKKKKKKKn.',
    '.nNNNNNNNNn.',
    '..nnnnnnnn..'
  ];
  const TETE_ROBOT_VISIERE = [ // décalage (10,4)
    '...6NNNNn...',
    '..6NNNNNNn..',
    '.6NNNNNNNNn.',
    'nNKKKKKKKKnn',
    'nNKjeeeejKnn',
    '.NKKKKKKKKn.',
    '.NNNNNNNNNn.',
    '.NNKNKNKNNn.',
    '.nNNNNNNNNn.',
    '..nnnnnnnn..'
  ];
  const PLASTRON_ROBOT = ['.ZZZZ.', '.Z0O9Z', '.ZZZZ.']; // décalage (13,17)

  /* ---------- coiffures (sous les chapeaux) ---------- */
  const COIFFURES = {
    court: [10, 3, [
      '............',
      '...CCCCCC...',
      '..CC3CCCCC..',
      '.CC3CCCCCCC.',
      '.CCCC.CCCCC.',
      '.C........C.',
      '.c........c.'
    ]],
    meche: [10, 1, [
      '.....C..C...',
      '....CC.CC...',
      '...CCCCCCC..',
      '...CCCCCCC..',
      '..CC3CCCCCC.',
      '.CC3CCCCCCCC',
      '.CCC.CC.CCC.',
      '.C........C.',
      '.c........c.'
    ]],
    long: [10, 3, [
      '............',
      '...CCCCCC...',
      '..CC3CCCCC..',
      '.CC3CCCCCCC.',
      'CCCCCC.CCCCC',
      'CC........CC',
      'CC........CC',
      'Cc........cC',
      'Cc........cC',
      'Cc........cC',
      'cc........cc',
      '.c........c.',
      '.c........c.'
    ]],
    queue: [10, 3, [
      '............',
      '...CCCCCC...',
      '..CC3CCCCCC.',
      '.CC3CCCCCCCC',
      '.CCCCCCC.CCCC',
      '.C........CCc',
      '.c........cCc',
      '...........Cc',
      '...........Cc',
      '...........cc',
      '...........c.'
    ]],
    chignon: [10, 0, [
      '....CCCC....',
      '...C3CCCc...',
      '...CCCCCc...',
      '....cccc....',
      '...CCCCCC...',
      '..CC3CCCCC..',
      '.CC3CCCCCCC.',
      '.CCCCC.CCCC.',
      '.C........C.',
      '.c........c.'
    ]]
  };
  const BARBE = [11, 11, [
    'C........C',
    'CCCC..CCCC',
    '.CCCCCCCC.',
    '..CcCCcC..',
    '...cCCc...'
  ]];

  /* ---------- chapeaux ---------- */
  // a/z : couleurs d'accent ('hash' = choisie par le nom parmi une liste, en évitant la couleur de l'habit)
  const TEINTES = ['#2563EB', '#F59E0B', '#10B981', '#E11D48', '#7C3AED', '#0EA5E9', '#F8FAFC', '#14B8A6', '#F97316', '#84CC16'];
  const CHAPEAUX = {
    antenne: { art: [[14, 0, ['.4A.', '.Aa.', '..N.', '.nNn']]], a: (g) => g.habit },
    bandeau: { art: [[11, 7, ['4AAAAAAAAAAa.', '..........aA.', '...........aA']]], a: '#E5484D' },
    'bandeau-sport': { art: [[11, 7, ['WWWWWWWWWW', 'HHHHHHHHHH']]] },
    beret: { art: [[10, 2, ['......a.......', '...A4AAAAAA...', '.AA4AAAAAAAAa.', '.aAAAAAAAAAaa.', '..aaa.........']]], a: 'hash' },
    bonnet: { art: [[10, 0, [
      '.....WW.....', '.....ww.....', '....AAAA....', '...A4AAAA...', '..A4AAAAAa..',
      '.AAAAAAAAAa.', '.AAAAAAAAAa.', '.4a4a4a4a4a.']]], a: 'hash', cheveux: 'cache' },
    'casque-audio': { art: [[9, 3, [
      '...KKKKKKKK...', '..K........K..', '.K..........K.', '.K..........K.',
      'AA..........AA', '4A..........4A', 'AA..........AA', 'aa..........aa']]], a: 'hash' },
    'casque-chantier': { art: [[9, 2, [
      '......AA......', '....A4AAAa....', '...A4AAAAAa...', '..A4AAAAAAAa..',
      '..AAAAAAAAAa..', 'aAAAAAAAAAAAAa']]], a: (g) => ['#FBBF24', '#F8FAFC', '#F97316'][hash(g.nom + 'a') % 3] },
    'casque-spatial': { special: 'bulle' },
    casquette: { art: [[10, 3, [
      '...AA4AA......', '..A4AZAAA.....', '.AAAAAAAAAa...', '.aaaaaaaaaAAAA']]], a: 'hash', z: '#F8FAFC' },
    'chapeau-detective': { art: [[8, 1, [
      '......A4AA......', '....AA4AAAAa....', '....A4AAAAAa....', '....ZZZZZZZZ....',
      '.aAAAAAAAAAAAAa.', '..aa........aa..']]], a: '#6B5E52', z: '#22252F' },
    'chapeau-mage': { art: [[9, 0, [
      '..........Aa..', '.........AAa..', '........AAA...', '.......4AAA...',
      '......4AOAAa..', '.....AAAAAAa..', '....AAAAAAAAa.', 'aAAAAAAAAAAAAa']]], a: '#3730A3' },
    'cheveux-courts': { cheveux: 'court' },
    chignon: { cheveux: 'chignon' },
    foulard: { art: [[10, 3, [
      '...AAAAAA.....', '..AWAAWAAA....', '.AAAAWAAAWA...', '.AWAAAAAWAAAa.',
      '.aaaaaaaaaaAAa', '...........aA.']]], a: 'hash' },
    'haut-de-forme': { art: [[10, 0, [
      '..Z5ZZZZz...', '..Z5ZZZZz...', '..Z5ZZZZz...', '..Z5ZZZZz...',
      '..HHHHHHHH..', '..Z5ZZZZz...', 'zZZZZZZZZZZz']]], z: '#2B2F3D' },
    heaume: { art: [[10, 0, [
      '.....AA.....', '....A4AA....', '.....Aa.....', '..NNNNNNNN..',
      '.N6NNNNNNNn.', 'N66NNNNNNNNn', 'N6NNNNNNNNNn', 'N6NNNNNNNNNn',
      'NnnnnnnnnnnN', 'NNKKWKKWKKNn', 'NNNNNNNNNNNn', 'NNNnNNNNnNNn',
      '.NNNNNNNNNn.', '..nNNNNNNn..', '..nnnnnnnn..']]], a: '#E5484D', cheveux: 'aucun' },
    lunettes: { art: [[11, 8, ['.AAAAAAAA.', 'AAGGGGGGAA', '.AGGGGGGA.']]], a: 'hash' },
    'lunettes-noires': { art: [[11, 9, ['KZ5ZZZZ5ZK', '.ZZZ..ZZZ.']]], z: '#11131A' },
    'lunettes-rondes': { art: [[11, 8, ['...A..A...', '..A.AA.A..', '..A.AA.A..', '...A..A...']]], a: '#E2B33C' },
    perruque: { art: [[8, 2, [
      '....WWWWWWWW....', '...WwWWwWWwWW...', '..WWWwWWWwWWWW..', '..WwWWWWWWWWwW..',
      '..WWW......WWW..', '.WWw........wWW.', '.wWW........WWw.', '.WWw........wWW.',
      '.wWW........WWw.', '.WWw........wWW.', '.wWW........WWw.', '.WWw........wWW.',
      '..ww........ww..']]], cheveux: 'aucun' },
    plume: { art: [[9, 0, [
      '............Z.', '...........Z5.', '..........Z5..', '.....AAA.Z5...',
      '...AA4AAAZAA..', '..A4AAAAAAAAa.', '.aAAAAAAAAAaa.', '..aaa.........']]], a: 'hash', z: '#F4F6FA' },
    tablier: { art: [[12, 15, [
      '.A....A.', '..AAAA..', '..A4AA..', '..AAAA..', 'aAAAAAAa',
      'AAAAAAAA', 'AAaaaaAA', 'AAAAAAAA', 'aaaaaaaa']]], a: '#7A2340' },
    toque: { art: [[10, 0, [
      '...WWWWWW...', '..WWWWWWWW..', '.WWwWWWwWWW.', '.WWWWwWWWWW.',
      '..WWWWWWWW..', '..wWWWWWWw..', '.wwwwwwwwww.']], [14, 15, ['.QQ.']]] }
  };

  /* ---------- accessoires (g = point de prise, devant = tenu devant la main) ---------- */
  const OBJETS = {
    ampoule: { g: [2, 8], art: ['.OOO.', 'O77OO', 'O7OOo', 'OOOOo', '.OOo.', '.NNn.', '.nNn.', '..n..'] },
    baguette: { g: [1, 7], art: ['.O.', 'O7O', '.O.', '.W.', '.Y.', '.Y.', '.Y.', '.Y.', '.Y.', '.y.'] },
    balance: { g: [4, 7], art: ['....7....', '.OOOOOOO.', '.n..O..n.', 'n.n.O.n.n', 'OOo.O.OOo', '....O....', '....O....', '....O....', '...OOo...'] },
    bambou: { g: [1, 10], art: ['Vv..', '.VV.', '.VV.', '.vv.', '.VV.', '.VV.', '.VV.', '.vv.', '.VV.', '.VV.', '.VV.', '.vv.', '.VV.', '.VV.', '.vv.'] },
    bouclier: { g: [3, 4], devant: true, art: ['NNNNNNN', 'NU0UUUn', 'NUUOUUn', 'NUOOOUn', 'NUUOUUn', '.NUUUn.', '..NUn..', '...n...'] },
    carnet: { g: [2, 3], devant: true, teinte: 1, art: ['NQQQQq', 'QQWWQq', 'NQQQQq', 'QQQQQq', 'NQQQQq', 'qqqqqq'] },
    clap: { g: [3, 4], devant: true, art: ['.KWKWKW', 'KWKWKW.', 'KKKKKKK', 'KWWKWWK', 'KKKKKKK', 'KWWWKWK', 'KKKKKKK'] },
    'cle-allen': { g: [4, 6], art: ['6NNNNn', 'NNNNNn', '....Nn', '....Nn', '....Nn', '....Nn', '....Nn', '....nn', '....nn'] },
    crayon: { g: [0, 5], art: ['Qq', 'Nn', '7O', '7O', '7O', '7O', '7O', 'Dd', 'K.'] },
    cylindre: { g: [3, 4], devant: true, art: ['.0000.', '0UUUU0', 'UUUUUu', 'u0uuuu', 'UUUUUu', 'u0uuuu', 'UUUUUu', '.uuuu.'] },
    drapeau: { g: [5, 10], art: ['.....O', 'QQWWQN', 'QQWWQN', 'WWQQWN', 'WWQQWN', '.....N', '.....N', '.....N', '.....N', '.....N', '.....N', '.....n', '.....n'] },
    fusee: { g: [2, 5], art: ['..Q..', '.QQq.', '.WUw.', '.WWw.', '.WWw.', 'QWWwq', 'Q.O.q', '..O..'] },
    haltere: { g: [4, 1], art: ['KK....KK', 'KKNNNNKK', 'KK....KK'] },
    jumelles: { g: [3, 2], devant: true, art: ['KKK.KKK', 'K0KKK0K', 'KUK.KUK', 'KKK.KKK'] },
    livre: { g: [3, 3], devant: true, teinte: 1, art: ['QQQQQT', 'Q9QQQT', 'QOOOQT', 'QQQQQT', 'QQQQQT', 'qqqqqt'] },
    louche: { g: [2, 8], art: ['.NNN.', 'N6NNn', 'nNNNn', '.nnn.', '..N..', '..N..', '..N..', '..N..', '..N..', '..n..'] },
    loupe: { g: [2, 7], art: ['.OOO.', 'OGGGo', 'OGGGo', 'OGGGo', '.ooo.', '..D..', '..D..', '..d..', '..d..'] },
    luth: { g: [2, 4], art: ['dd...', '.dD..', '..D..', '..D..', '..D..', '..D..', '.888.', '8DDDd', 'DDKDd', 'DDDDd', '.ddd.'] },
    mallette: { g: [3, 0], art: ['..KKK..', '..K.K..', 'DDDDDDD', 'D8DDDDd', 'DDDODDd', 'DDDDDDd', 'ddddddd'] },
    marteau: { g: [2, 6], art: ['6NNNNn', 'NNNNnn', '..D...', '..D...', '..D...', '..D...', '..d...', '..d...', '..d...'] },
    pancarte: { g: [4, 10], art: ['WWWWWWW', 'WWQWQWW', 'WWWQWWW', 'WWQWQWW', 'wwwwwww', '....D..', '....D..', '....D..', '....D..', '....D..', '....D..', '....d..', '....d..'] },
    parchemin: { g: [2, 3], devant: true, art: ['tTTTTt', '.TTTt.', '.TKKt.', '.TTTt.', '.TKKt.', '.TTTt.', 'tTTTTt'] },
    piece: { g: [2, 6], art: ['.OOOO.', 'O7OoOo', 'OOOoOo', 'OOOoOo', 'OOOOoo', '.oooo.'] },
    piolet: { g: [4, 9], art: ['6NNNNNn', 'n...D..', '....D..', '....D..', '....D..', '....D..', '....D..', '....d..', '....d..', '....d..', '....d..', '....N..'] },
    plan: { g: [3, 3], devant: true, art: ['UUUUUUU', 'UWWWWUU', 'UWUUWUU', 'UWUUWWU', 'UWWWWWU', 'uuuuuuu'] },
    prise: { g: [2, 6], art: ['.N.N.', '.N.N.', 'WWWWw', 'WWWWw', '.WWw.', '..K..', '..K..', '..K..'] },
    puce: { g: [3, 3], devant: true, art: ['.O.O.O.', 'OKKKKKO', '.KUUUK.', 'OKUjUKO', '.KUUUK.', 'OKKKKKO', '.O.O.O.'] },
    sablier: { g: [2, 7], art: ['8DDDd', 'GOOOG', '.GOG.', '..O..', '.GOG.', 'GOOOG', '8DDDd'] },
    sifflet: { g: [2, 4], art: ['.7OOOO', '7OOKOo', 'OOOOo.', '.oo...'] },
    truelle: { g: [2, 8], art: ['..6..', '.6NN.', '.NNNn', '6NNNn', 'NNNNn', '.nnn.', '..n..', '..D..', '..D..', '..d..'] }
  };
  const MAIN = [7, 19]; // pixel haut-gauche de la main droite du personnage (à gauche à l'écran)

  /* ---------- CSS d'animation (injecté une seule fois) ---------- */
  let cssPose = false;
  function injecterCSS() {
    if (cssPose || typeof document === 'undefined' || !document.head) return;
    cssPose = true;
    const st = document.createElement('style');
    st.setAttribute('data-pixel', '');
    st.textContent =
      '.px-oeil{transform-box:fill-box;transform-origin:50% 100%}' +
      '@media (prefers-reduced-motion:no-preference){' +
      '.px-anime .px-haut{animation:px-respire 2.4s steps(1,end) infinite}' +
      '.px-anime .px-oeil{animation:px-cligne 4.6s steps(1,end) infinite}' +
      '@keyframes px-respire{0%{transform:translateY(0)}50%{transform:translateY(1px)}}' +
      '@keyframes px-cligne{0%{transform:scaleY(1)}92%{transform:scaleY(.5)}95%{transform:scaleY(1)}}' +
      '}';
    document.head.appendChild(st);
  }

  function choisirTeinte(g, cle) {
    const h = hash((g.nom || '') + cle);
    for (let i = 0; i < TEINTES.length; i++) {
      const c = TEINTES[(h + i) % TEINTES.length];
      if (dist(c, g.habit || '#000') > 110 && dist(c, g.cheveux || '#000') > 60) return c;
    }
    return TEINTES[h % TEINTES.length];
  }
  function resoudre(v, g, cle) {
    if (typeof v === 'function') return v(g);
    if (v === 'hash') return choisirTeinte(g, cle + 'a');
    return v;
  }
  function feminin(role) {
    const r = String(role || '').toLowerCase();
    return /^la\s/.test(r) || /^l['’]\S*(euse|ière|eure|trice|enne|esse|onne)\b/.test(r);
  }

  /* ---------- personnage ---------- */
  function construire(guide) {
    const g = Object.assign({ peau: '#E8B796', habit: '#8B5CF6', cheveux: '#3A2A1A', chapeau: 'cheveux-courts', accessoire: 'livre' }, guide || {});
    const hat = CHAPEAUX[g.chapeau] || CHAPEAUX['cheveux-courts'];
    const a = resoudre(g.couleurChapeau || hat.a, g, g.chapeau);
    const z = resoudre(hat.z, g, g.chapeau + 'z');
    const P = palette(g, a, z);
    const G = grille(W, H);
    const tagOeil = (ch) => (ch === 'E' || ch === 'e' || ch === 'j') ? 'oeil' : '';

    // corps
    peindre(G, CORPS, 0, 0, P, { tag: tagOeil });
    if (g.robot) {
      for (let y = 4; y < 15; y++) for (let x = 9; x < 23; x++) { G.c[y][x] = null; G.t[y][x] = ''; }
      const vis = hash(g.nom || '') % 2 === 1;
      peindre(G, vis ? TETE_ROBOT_VISIERE : TETE_ROBOT, 10, 4, P, { tag: tagOeil });
      peindre(G, PLASTRON_ROBOT, 13, 17, Object.assign({}, P, { Z: dk(g.habit, 0.4) }));
    }
    // coiffure
    const h0 = hash(g.nom || '');
    let coiffure = g.coiffure || hat.cheveux || 'auto';
    if (coiffure === 'auto' || coiffure === 'cache') {
      const fem = feminin(g.role);
      coiffure = fem ? (h0 % 3 === 0 ? 'queue' : 'long') : (h0 % 2 ? 'meche' : 'court');
      if (hat.cheveux === 'cache' && coiffure === 'meche') coiffure = 'court';
    }
    if (!g.robot && coiffure !== 'aucun' && COIFFURES[coiffure]) {
      const [ox, oy, art] = COIFFURES[coiffure];
      peindre(G, art, ox, oy, P);
    }
    // barbe : hommes aux cheveux clairs (sages, mages…), ou demandée
    const barbe = g.barbe !== undefined ? g.barbe : (!g.robot && /^le\s/i.test(g.role || '') && lum(g.cheveux) > 0.68);
    if (barbe && g.chapeau !== 'heaume') peindre(G, BARBE[2], BARBE[0], BARBE[1], P);

    // chapeau
    if (hat.special === 'bulle') bulle(G, P);
    for (const [ox, oy, art] of hat.art || []) peindre(G, art, ox, oy, P);

    // accessoire
    const obj = OBJETS[g.accessoire];
    if (obj) {
      const ox = MAIN[0] - obj.g[0], oy = MAIN[1] - obj.g[1];
      let PO = P;
      if (obj.teinte) { PO = Object.assign({}, P); role(PO, 'Q', choisirTeinte(g, g.accessoire)); PO['9'] = lt(PO.Q, 0.38); }
      peindre(G, obj.art, ox, oy, PO, { item: true });
      if (!obj.devant) { // la main repasse par-dessus le manche
        const sk = [[P.S, P.S], [P.s, P.s]];
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          G.c[MAIN[1] + dy][MAIN[0] + dx] = sk[dy][dx]; G.t[MAIN[1] + dy][MAIN[0] + dx] = '';
        }
      }
    }
    contour(G);
    return { G, g };
  }

  // Casque spatial : bulle de verre transparente autour de la tête
  function bulle(G, P) {
    const cx = 15.5, cy = 9.2, r = 7.6;
    for (let y = 0; y < 17; y++) for (let x = 6; x < 25; x++) {
      const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5);
      if (d > r) continue;
      if (d > r - 1.05) { if (!G.c[y][x] || y < 15) { if (!G.c[y][x]) { G.c[y][x] = '#CFE8FFE6'; G.t[y][x] = ''; } } }
      else if (!G.c[y][x]) { G.c[y][x] = '#8EC9FF2E'; G.t[y][x] = ''; }
    }
    // reflets
    for (const [x, y] of [[10, 5], [10, 6], [11, 4], [9, 7]]) if (!G.c[y][x] || G.c[y][x].length === 9) G.c[y][x] = '#FFFFFFD9';
    // col du scaphandre
    peindre(G, ['NNNNNNNNNN', '6NNNNNNNNn'], 11, 14, P);
  }

  function perso(guide, opts = {}) {
    const taille = opts.taille || 128;
    const anime = opts.anime !== false;
    const { G, g } = construire(guide);
    if (anime) injecterCSS();
    const h = hash(g.nom || '');
    const haut = (x, y) => G.t[y][x] === 'item' || y <= 20;
    const fixe = (x, y) => !haut(x, y);
    const oeil = (x, y) => G.t[y][x] === 'oeil';
    const label = `${g.nom || 'Guide'}, ${g.role || ''}`.replace(/,\s*$/, '');
    const ombre = '<path fill="#000" fill-opacity=".35" d="M9 27h14v1h-14z"/>';
    const d1 = -((h % 24) / 10).toFixed(1), d2 = -((h % 41) / 10).toFixed(1);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 0 28 28" width="${taille}" height="${taille}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}" class="px-perso${anime ? ' px-anime' : ''}">` +
      ombre +
      `<g class="px-fixe">${chemins(G, fixe)}</g>` +
      `<g class="px-haut" style="animation-delay:${d1}s">${chemins(G, (x, y) => haut(x, y) && !oeil(x, y))}` +
      `<g class="px-oeil" style="animation-delay:${d2}s">${chemins(G, (x, y) => haut(x, y) && oeil(x, y))}</g></g></svg>`;
  }

  /* ---------- objet seul ---------- */
  function objet(nom, opts = {}) {
    const taille = opts.taille || 48;
    const o = OBJETS[nom];
    if (!o) return '';
    const w = Math.max(...o.art.map((r) => r.length)), h = o.art.length;
    const n = Math.max(w, h) + 2;
    const G = grille(n, n);
    const P = palette({ peau: '#E8B796', habit: '#8B5CF6', cheveux: '#3A2A1A' });
    peindre(G, o.art, Math.floor((n - w) / 2), Math.floor((n - h) / 2), P);
    contour(G);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${taille}" height="${taille}" shape-rendering="crispEdges" role="img" aria-label="${esc(nom)}" class="px-objet">${chemins(G, () => true)}</svg>`;
  }

  /* ---------- pictogrammes 12 × 12 (X = couleur, o = reflet) ---------- */
  const ICONES = {
    sommaire: ['............', '.oo.XXXXXXX.', '.oo.XXXXXXX.', '............', '.XX.XXXXX...', '.XX.XXXXX...', '............', '.XX.XXXXXXX.', '.XX.XXXXXXX.', '............', '.XX.XXXX....', '.XX.XXXX....'],
    stack: ['............', '..oooooooo..', '.XooooooooX.', '..XXXXXXXX..', '............', '..XXXXXXXX..', '.XXXXXXXXXX.', '..XXXXXXXX..', '............', '..XXXXXXXX..', '.XXXXXXXXXX.', '..XXXXXXXX..'],
    annexes: ['............', '............', '.XXXX.......', '.XXXXX......', '.XXXXXXXXXX.', '.XooooooooX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '............', '............'],
    videos: ['............', '.XXXXXXXXXX.', 'XoXXXXXXXXXX', 'XXXX.XXXXXXX', 'XXXX..XXXXXX', 'XXXX...XXXXX', 'XXXX....XXXX', 'XXXX...XXXXX', 'XXXX..XXXXXX', 'XXXX.XXXXXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.'],
    tableau: ['............', '.XXXXXXXXXX.', '.XooooooooX.', '.XXXXXXXXXX.', '.X..X..X..X.', '.X..X..X..X.', '.XXXXXXXXXX.', '.X..X..X..X.', '.X..X..X..X.', '.XXXXXXXXXX.', '............', '............'],
    miroir: ['....XXXX....', '...XX..XX...', '..XX.o..XX..', '..X..o...X..', '..X...o..X..', '..X......X..', '..XX....XX..', '...XX..XX...', '....XXXX....', '.....XX.....', '.....XX.....', '...XXXXXX...'],
    lexique: ['............', '..XX........', '.XXXX.......', 'XX..XX......', 'XX..XX.XXXX.', 'XXXXXX....XX', 'XX..XX.XXXXX', 'XX..XXXX..XX', 'XX..XX.XXXXX', '............', '.oooooooooo.', '............'],
    recherche: ['..XXXXX.....', '.XX...XX....', 'XX.o...XX...', 'X.o.....X...', 'X.......X...', 'X.......X...', 'XX.....XX...', '.XX...XX....', '..XXXXXXX...', '.......XXX..', '........XXX.', '.........XX.'],
    pdf: ['.XXXXXX.....', '.X....XX....', '.X....XoX...', '.X....XXXX..', '.X.......X..', 'XXXXXXXXXXXX', 'XooXoXXooXXX', 'XoXXoXXoXXXX', 'XXXXXXXXXXXX', '.X.......X..', '.XXXXXXXXX..', '............'],
    check: ['............', '..........XX', '.........XXX', '........XXX.', '.......XXX..', '.XX...XXX...', '.XXX.XXX....', '..XXXXX.....', '...XXX......', '....X.......', '............', '............'],
    coeur: ['............', '..XX....XX..', '.XXXX..XXXX.', 'XXooXXXXXXXX', 'XoXXXXXXXXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXXXXX...', '....XXXX....', '.....XX.....', '............'],
    etoile: ['.....XX.....', '.....XX.....', '....XooX....', '....XoXX....', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXXXXX...', '...XXXXXX...', '..XXX..XXX..', '..XX....XX..', '.XX......XX.'],
    eclair: ['.......XXX..', '......XXX...', '.....XoX....', '....XoX.....', '...XXXXXXX..', '..XXXXXXX...', '......XXX...', '.....XXX....', '....XXX.....', '...XX.......', '..X.........', '............'],
    cadenas: ['....XXXX....', '...XX..XX...', '...X....X...', '...X....X...', '..XXXXXXXX..', '..XooXXXXX..', '..XoXXXXXX..', '..XXXX.XXX..', '..XXX...XX..', '..XXXX.XXX..', '..XXXXXXXX..', '............'],
    maison: ['.....XX.....', '....XXXX....', '...XXooXX...', '..XXoXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '.XXXXXXoo.X.', '.XX..XXoo.X.', '.XX..XXXXXX.', '.XX..XXXXXX.', '............'],
    fusee: ['.....XX.....', '....XXXX....', '....XXXX....', '...XXooXX...', '...XXooXX...', '...XXXXXX...', '...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XX.XXXX.XX.', '....oooo....', '.....oo.....'],
    robot: ['.....XX.....', '.....oo.....', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XX..XX..XX.', '.XX..XX..XX.', '.XXXXXXXXXX.', '.XXX....XXX.', '.XXXXXXXXXX.', '..XXXXXXXX..', '.X.X....X.X.', '............'],
    brique: ['............', '..oo....oo..', '..XX....XX..', 'XXXXXXXXXXXX', 'XooooooooooX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '............', '............'],
    engrenage: ['.....XX.....', '..X.XXXX.X..', '.XXXXXXXXXX.', '..XXooXXXX..', '.XXo...XXXX.', 'XXXX....XXXX', 'XXXX....XXXX', '.XXXX..XXXX.', '..XXXXXXXX..', '.XXXXXXXXXX.', '..X.XXXX.X..', '.....XX.....'],
    cylindre: ['...XXXXXX...', '.XXooooooXX.', '.XXXXXXXXXX.', '.X.XXXXXX.X.', '.XX......XX.', '.XXXXXXXXXX.', '.X.XXXXXX.X.', '.XX......XX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '...XXXXXX...', '............'],
    piece: ['...XXXXXX...', '.XXXXXXXXXX.', '.XX......XX.', 'XX.oooXXX.XX', 'XX.oXXXXX.XX', 'XX.oXXXXX.XX', 'XX.XXXXXX.XX', 'XX.XXXXXX.XX', '.XX......XX.', '.XXXXXXXXXX.', '...XXXXXX...', '............'],
    loupe: ['..XXXXX.....', '.XXXXXXX....', 'XXoo..XXX...', 'XXo....XX...', 'XX.....XX...', 'XX.....XX...', 'XXX...XXX...', '.XXXXXXX....', '..XXXXXXX...', '.......XXX..', '........XXX.', '.........XX.'],
    camera: ['............', '...XXX......', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXXX....XXXX', 'XXX..oo..XXX', 'XXX..o...XXX', 'XXX......XXX', 'XXXX....XXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '............'],
    livre: ['............', '.XXXXXXXXXX.', '.X.XXXXXXXX.', '.X.XooooooX.', '.X.XXXXXXXX.', '.X.XXXXXXXX.', '.X.XXXXXXXX.', '.X.XXXXXXXX.', '.X.XXXXXXXX.', '.XX........X', '.XXXXXXXXXXX', '............'],
    ampoule: ['...XXXXXX...', '..XXooXXXX..', '.XXoXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXXXXX...', '............', '....XXXX....', '............', '....XXXX....', '.....XX.....'],
    cle: ['............', '............', '............', '.XXXX.......', 'XX..XX......', 'X....XXXXXXX', 'Xo...XXXXXXX', 'XX..XX..X.XX', '.XXXX...X.X.', '............', '............', '............'],
    prise: ['...X....X...', '...X....X...', '...X....X...', '.XXXXXXXXXX.', '.XooooooooX.', '..XXXXXXXX..', '..XXXXXXXX..', '...XXXXXX...', '.....XX.....', '.....XX.....', '.....XX.....', '.....XX.....'],
    bouclier: ['.XXXXXXXXXX.', '.XooXXXXXXX.', '.XoXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '..XXXXXXXX..', '..XXXXXXXX..', '...XXXXXX...', '....XXXX....', '.....XX.....', '............'],
    graphe: ['............', '.........oo.', '.........XX.', '......XX.XX.', '......XX.XX.', '...XX.XX.XX.', '...XX.XX.XX.', 'XX.XX.XX.XX.', 'XX.XX.XX.XX.', 'XX.XX.XX.XX.', 'XXXXXXXXXXXX', '............'],
    horloge: ['...XXXXXX...', '.XXXXXXXXXX.', '.XoXX.XXXXX.', 'XoXXX.XXXXXX', 'XXXXX.XXXXXX', 'XXXXX...XXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '...XXXXXX...', '............'],
    bulle: ['............', '..XXXXXXXX..', '.XooXXXXXXX.', 'XXoXXXXXXXXX', 'XXXXXXXXXXXX', 'XX..XX..XX.X', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..', '..XX........', '..X.........', '............'],
    carte: ['............', 'XXX...XXX...', 'XXXoooXXXooo', 'XXXoooXXXooo', 'XXXoooXXXooo', 'XXXoooXXXooo', 'XXXoooXXXooo', 'XXXoooXXXooo', 'XXXoooXXXooo', '...oooXXX...', '............', '............']
  };

  function icone(nom, opts = {}) {
    const taille = opts.taille || 20;
    const art = ICONES[nom] || ICONES.brique;
    const main = [], refl = [];
    for (let y = 0; y < 12; y++) {
      const r = art[y] || '';
      let x = 0;
      while (x < 12) {
        const ch = r[x];
        if (ch !== 'X' && ch !== 'o') { x++; continue; }
        let n = 1;
        while (x + n < 12 && (r[x + n] === 'X' || r[x + n] === 'o')) n++;
        main.push(`M${x} ${y}h${n}v1h-${n}z`);
        x += n;
      }
      x = 0;
      while (x < 12) {
        if (r[x] !== 'o') { x++; continue; }
        let n = 1;
        while (x + n < 12 && r[x + n] === 'o') n++;
        refl.push(`M${x} ${y}h${n}v1h-${n}z`);
        x += n;
      }
    }
    const c = opts.couleur;
    const fill = c ? c : 'currentColor';
    const reflet = c ? `<path fill="${lt(c, 0.5)}" d="${refl.join('')}"/>` : `<path fill="#fff" fill-opacity=".45" d="${refl.join('')}"/>`;
    const aria = opts.label ? `role="img" aria-label="${esc(opts.label)}"` : 'aria-hidden="true" focusable="false"';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="${taille}" height="${taille}" shape-rendering="crispEdges" ${aria} class="px-icone"><path fill="${fill}" d="${main.join('')}"/>${refl.length ? reflet : ''}</svg>`;
  }

  /* ---------- pièce de boîte → pictogramme ---------- */
  const REGLES = [
    [/base de donn|donnees|database|\bsql\b|supabase|table(s)? |schema|\brls\b/, 'cylindre'],
    [/securi|cadenas|\bauth|mot de passe|chiffr|permission|acces/, 'cadenas'],
    [/\bcle(s)?\b|secret|token|api key|variable(s)? d.environnement|\.env/, 'cle'],
    [/prix|cout|factur|budget|tarif|abonnement|paiement|euro|€|stripe|argent|devis/, 'piece'],
    [/prompt|conversation|dialogue|message|discussion|chat|question/, 'bulle'],
    [/\btest|bug|audit|verif|debog|erreur|revue|controle|inspect/, 'loupe'],
    [/mise en ligne|deploi|heberg|production|lancement|publier|publication|domaine|\bdns\b/, 'fusee'],
    [/memoire|journal|agents\.md|claude\.md|readme|documentation|\bdoc\b|notes?\b|cahier|carnet|livre/, 'livre'],
    [/maquette|design|wireframe|ecran|interface|\bui\b|\bux\b|croquis|figma|parcours|plan\b/, 'carte'],
    [/temps|runbook|j-\d+|calendrier|planning|delai|horaire|minute|heure|semaine|jour/, 'horloge'],
    [/reflexe|idee|astuce|conseil|inspiration|intuition/, 'ampoule'],
    [/agent|robot|\bia\b|\bllm\b|modele|automatis/, 'robot'],
    [/outil|config|reglage|parametr|atelier|integration|connecteur|mcp/, 'engrenage'],
    [/protection|sauvegarde|backup|rgpd|sentinelle|garde/, 'bouclier'],
    [/statisti|mesure|metrique|analytics|graph|courbe|kpi|indicateur/, 'graphe'],
    [/electri|branch|connex|webhook|prise/, 'prise'],
    [/video|tournage|demo|enregistr/, 'camera'],
    [/lexique|vocabulaire|definition|glossaire|mot(s)?\b/, 'lexique'],
    [/checklist|liste|valid|etape|critere/, 'check'],
    [/maison|accueil|fondation|architecture|pieces?\b/, 'maison'],
    [/rapide|vitesse|performance|instantan/, 'eclair'],
    [/stack|couche|pile/, 'stack'],
    [/favori|qualite|note\b|avis|etoile/, 'etoile']
  ];
  function piece(texte) {
    const t = String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const [re, nom] of REGLES) if (re.test(t)) return nom;
    return 'brique';
  }

  const Pixel = {
    perso, icone, objet, piece,
    icones: Object.keys(ICONES),
    objets: Object.keys(OBJETS),
    chapeaux: Object.keys(CHAPEAUX)
  };
  if (typeof window !== 'undefined') window.Pixel = Pixel;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pixel;
})();
