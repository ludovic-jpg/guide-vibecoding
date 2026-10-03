/* Guide du Vibe Coding : visualisations des chapitres 1 à 17.
   Contrat : docs/CONTRAT-VIZ.md. Aucune dépendance externe, classes préfixées vz-. */
(function () {
  "use strict";

  var VIZ = (window.VIZ = window.VIZ || {});
  var SVGNS = "http://www.w3.org/2000/svg";
  var NB = " "; // espace insécable
  var DATE_TARIFS = "À vérifier, tarifs de septembre 2026.";

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function motionOK() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: no-preference)").matches);
    } catch (e) {
      return false;
    }
  }

  function setProps(el, p) {
    if (!p) return;
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") el.setAttribute("class", v);
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.keys(v).forEach(function (s) { el.style.setProperty(s, v[s]); });
      else el.setAttribute(k, v === true ? "" : String(v));
    });
  }
  function addKids(el, kids) {
    kids.forEach(function (k) {
      if (k === null || k === undefined || k === false) return;
      if (Array.isArray(k)) return addKids(el, k);
      el.appendChild(typeof k === "object" ? k : document.createTextNode(String(k)));
    });
  }
  function h(tag, props) {
    var el = document.createElement(tag);
    setProps(el, props);
    addKids(el, [].slice.call(arguments, 2));
    return el;
  }
  function s(tag, props) {
    var el = document.createElementNS(SVGNS, tag);
    setProps(el, props);
    addKids(el, [].slice.call(arguments, 2));
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  function nf(n, d) {
    d = d === undefined ? 0 : d;
    if (!isFinite(n)) return "–";
    return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function eur(n, d) { return nf(n, d === undefined ? 2 : d) + NB + "€"; }
  function usd(n, d) { return nf(n, d === undefined ? 2 : d) + NB + "$"; }
  function parseNum(v) {
    var x = parseFloat(String(v).replace(/[\s  ]/g, "").replace(",", "."));
    return isFinite(x) ? x : NaN;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function onVisible(el, ctx, fn) {
    if (ctx.print || !("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); fn(); }
      });
    }, { threshold: 0.2 });
    io.observe(el);
  }

  function tween(ms, step, done) {
    if (!motionOK()) { step(1); if (done) done(); return function () {}; }
    var t0 = null, stop = false;
    function frame(t) {
      if (stop) return;
      if (t0 === null) t0 = t;
      var k = clamp((t - t0) / ms, 0, 1);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      step(e);
      if (k < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
    return function () { stop = true; };
  }

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem("vz-a:" + key) || "null");
      localStorage.setItem("vz-a:" + key, JSON.stringify(val));
    } catch (e) { return null; }
    return null;
  }

  function root(el, ctx, name) {
    clear(el);
    var r = h("div", { class: "vz-a vz-" + name + (ctx.print ? " vz-a--print" : "") });
    el.appendChild(r);
    return r;
  }

  /* Petite boîte à outils d'interface, consciente du mode impression. */
  function UI(ctx) {
    var P = !!ctx.print;
    return {
      P: P,
      btn: function (label, onClick, cls, aria) {
        return h("button", { type: "button", class: "vz-a-btn " + (cls || ""), onclick: onClick, "aria-label": aria || null, disabled: P || null }, label);
      },
      seg: function (aria, options, value, onChange) {
        var wrap = h("div", { class: "vz-a-seg", role: "group", "aria-label": aria });
        var buttons = options.map(function (o) {
          var b = h("button", {
            type: "button", class: "vz-a-seg-b", "aria-pressed": String(o.v === value),
            disabled: P || null,
            onclick: function () { api.set(o.v); onChange(o.v); }
          }, o.label);
          if (o.sub) b.appendChild(h("small", null, o.sub));
          wrap.appendChild(b);
          return b;
        });
        var api = {
          el: wrap,
          set: function (v) { buttons.forEach(function (b, i) { b.setAttribute("aria-pressed", String(options[i].v === v)); }); }
        };
        return api;
      },
      field: function (o) {
        // o: label, value, unit, dec, min, max, onChange, hint
        var dec = o.dec === undefined ? 2 : o.dec;
        if (P) {
          return h("div", { class: "vz-a-field vz-a-field--static" },
            h("span", { class: "vz-a-field-l" }, o.label),
            h("span", { class: "vz-a-field-v" }, nf(o.value, dec) + (o.unit ? NB + o.unit : "")));
        }
        var input = h("input", {
          type: "text", inputmode: "decimal", class: "vz-a-input", value: nf(o.value, dec).replace(/[  ]/g, " "),
          "aria-label": o.label + (o.unit ? " (" + o.unit + ")" : ""),
          oninput: function () {
            var x = parseNum(input.value);
            if (isFinite(x)) {
              if (o.min !== undefined) x = Math.max(o.min, x);
              if (o.max !== undefined) x = Math.min(o.max, x);
              input.removeAttribute("aria-invalid");
              o.onChange(x);
            } else input.setAttribute("aria-invalid", "true");
          }
        });
        var lab = h("label", { class: "vz-a-field" },
          h("span", { class: "vz-a-field-l" }, o.label),
          h("span", { class: "vz-a-field-box" }, input, o.unit ? h("span", { class: "vz-a-unit" }, o.unit) : null));
        lab.setValue = function (v) { input.value = nf(v, dec).replace(/[  ]/g, " "); };
        return lab;
      },
      slider: function (o) {
        // o: label, min, max, step, value, fmt, onInput
        var fmt = o.fmt || function (v) { return nf(v); };
        var out = h("output", { class: "vz-a-slider-v" }, fmt(o.value));
        if (P) {
          return h("div", { class: "vz-a-slider vz-a-slider--static" }, h("span", { class: "vz-a-slider-l" }, o.label), out);
        }
        var input = h("input", {
          type: "range", class: "vz-a-range", min: o.min, max: o.max, step: o.step || 1, value: o.value,
          "aria-label": o.label,
          oninput: function () { var v = parseFloat(input.value); out.textContent = fmt(v); paint(); o.onInput(v); }
        });
        function paint() {
          var k = (parseFloat(input.value) - o.min) / (o.max - o.min);
          input.style.setProperty("--k", (k * 100).toFixed(1) + "%");
        }
        paint();
        var w = h("label", { class: "vz-a-slider" },
          h("span", { class: "vz-a-slider-top" }, h("span", { class: "vz-a-slider-l" }, o.label), out), input);
        w.setValue = function (v) { input.value = v; out.textContent = fmt(v); paint(); };
        w.input = input;
        return w;
      },
      kicker: function (t) { return h("div", { class: "vz-a-kicker" }, t); },
      note: function (t) { return h("p", { class: "vz-a-note" }, t || DATE_TARIFS); },
      prompt: function (text) {
        if (ctx.prompt) {
          try { var p = ctx.prompt(text); if (p) return p; } catch (e) { /* repli ci-dessous */ }
        }
        return h("pre", { class: "vz-a-prompt" }, text);
      },
      kpi: function (label, value, cls) {
        var v = h("div", { class: "vz-a-kpi-v" }, value);
        var k = h("div", { class: "vz-a-kpi " + (cls || "") }, h("div", { class: "vz-a-kpi-l" }, label), v);
        k.set = function (t) { v.textContent = t; };
        return k;
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* ch01 : Les murs qui tombent                                         */
  /* ------------------------------------------------------------------ */

  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var MURS = [
    { nom: "Brancher chaque outil à la main", t: idx(2024, 11), quand: "25 novembre 2024",
      fait: "Anthropic présente MCP, une prise commune pour brancher une IA sur des services sans pont sur mesure (chapitre 17)." },
    { nom: "Parler la langue des machines", t: idx(2025, 2), quand: "2 février 2025",
      fait: "Andrej Karpathy nomme le « vibe coding » : on décrit, l'IA écrit, on juge au résultat (chapitre 2)." },
    { nom: "Serveur, base de données, comptes", t: idx(2025, 9), quand: "29 septembre 2025",
      fait: "Lovable Cloud fournit la base PostgreSQL, les comptes, le stockage et le code serveur, sans compte séparé à créer (chapitre 3)." },
    { nom: "Écrire chaque ligne soi-même", t: idx(2026, 2), quand: "4 février 2026",
      fait: "Karpathy parle d'ingénierie agentique : 99 % du temps, on n'écrit plus le code, on orchestre et on supervise (chapitre 2)." },
    { nom: "Être lisible par les moteurs", t: idx(2026, 5), quand: "13 mai 2026",
      fait: "Les nouveaux projets Lovable reposent sur TanStack Start : le visiteur et le moteur de recherche reçoivent une page complète (chapitre 3)." },
    { nom: "Le site vitrine facturé par une agence", t: idx(2026, 9), quand: "septembre 2026",
      fait: "Le site vitrine qu'une agence facturait il y a trois ans se construit en un après-midi (chapitre 1)." }
  ];
  var RESTE = ["Savoir quoi construire", "Vérifier que c'est juste", "Protéger les données", "Faire durer l'outil"];
  function idx(y, m) { return (y - 2016) * 12 + (m - 1); }
  var T_MAX = idx(2026, 9);

  VIZ["ch01-murs"] = {
    chapitre: "ch01",
    titre: "Les murs qui tombent",
    consigne: "Faites glisser le curseur de 2016 à 2026 : regardez ce qui s'effondre, et ce qui reste debout.",
    ancre: "Une onde de choc sur le travail",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "murs");
      var t = ctx.print ? T_MAX : 0, playing = null;

      var dateEl = h("div", { class: "vz-murs-date", "aria-live": "polite" });
      var head = h("div", { class: "vz-murs-head" }, ui.kicker("Ce qui séparait le désir de l'outil"), dateEl);
      var scene = h("div", { class: "vz-murs-scene" });
      var murs = MURS.map(function (m, i) {
        var b = h("button", { type: "button", class: "vz-murs-mur", disabled: ctx.print || null, "aria-label": m.nom + ", tombé le " + m.quand,
          onclick: function () { setT(Math.max(t, m.t)); caption(m); } },
          h("span", { class: "vz-murs-briques", "aria-hidden": "true" }),
          h("span", { class: "vz-murs-nom" }, m.nom),
          h("span", { class: "vz-murs-quand" }, m.quand));
        b.style.setProperty("--i", i);
        scene.appendChild(b);
        return b;
      });

      var piliers = h("div", { class: "vz-murs-piliers" });
      var pEls = RESTE.map(function (p) {
        var col = h("div", { class: "vz-murs-pilier" }, h("span", { class: "vz-murs-pilier-barre" }), h("span", { class: "vz-murs-pilier-l" }, p));
        piliers.appendChild(col);
        return col;
      });
      var socle = h("div", { class: "vz-murs-socle" }, h("strong", null, "Savoir demander"), " : l'art de la spécification");
      var reste = h("div", { class: "vz-murs-reste" }, ui.kicker("Ce qui reste, et prend de la valeur"), piliers, socle);

      var cap = h("p", { class: "vz-murs-cap", "aria-live": "polite" });
      function caption(m) {
        cap.textContent = m ? m.quand.charAt(0).toUpperCase() + m.quand.slice(1) + " · " + m.fait
          : "Pendant un demi-siècle, fabriquer un logiciel a demandé de parler la langue des machines : des années d'apprentissage, des syntaxes tatillonnes, des points-virgules oubliés.";
      }

      var slider = ui.slider({
        label: "Date", min: 0, max: T_MAX, step: 1, value: t,
        fmt: function (v) { return MOIS[v % 12] + " " + (2016 + Math.floor(v / 12)); },
        onInput: function (v) { stopPlay(); setT(v); }
      });
      var ticks = h("div", { class: "vz-murs-ticks", "aria-hidden": "true" });
      for (var y = 2016; y <= 2026; y += 2) ticks.appendChild(h("span", null, String(y)));

      var play = ui.btn("▶ Rejouer dix ans", function () {
        stopPlay();
        var from = t >= T_MAX ? 0 : t;
        playing = tween(7000 * (1 - from / T_MAX) + 400, function (k) { setT(Math.round(lerp(from, T_MAX, k))); }, function () { playing = null; });
      }, "vz-a-btn--accent");
      function stopPlay() { if (playing) { playing(); playing = null; } }

      function setT(v) {
        t = v;
        if (slider.setValue) slider.setValue(v);
        dateEl.textContent = MOIS[v % 12] + " " + (2016 + Math.floor(v / 12));
        var tombes = 0, dernier = null;
        MURS.forEach(function (m, i) {
          var down = v >= m.t;
          murs[i].classList.toggle("is-tombe", down);
          if (down) { tombes++; dernier = m; }
        });
        var k = tombes / MURS.length;
        pEls.forEach(function (p, i) { p.style.setProperty("--h", (28 + 72 * k * (0.85 + 0.05 * i)).toFixed(1) + "%"); });
        reste.classList.toggle("is-plein", tombes === MURS.length);
        caption(dernier);
      }

      r.appendChild(head);
      r.appendChild(scene);
      if (!ctx.print) {
        r.appendChild(h("div", { class: "vz-murs-ctrl" }, h("div", { class: "vz-murs-sl" }, slider, ticks), play));
      }
      r.appendChild(cap);
      r.appendChild(reste);
      setT(t);
      if (ctx.print) {
        cap.textContent = "Septembre 2026 : les six murs sont tombés. Le prix de l'exécution simple s'effondre ; la valeur se déplace vers le jugement.";
      } else {
        onVisible(r, ctx, function () { if (motionOK()) play.click(); else setT(T_MAX); });
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch02 (a) : L'échelle des cinq manières de faire                     */
  /* ------------------------------------------------------------------ */

  var MANIERES = [
    { nom: "No-code", qui: "On assemble des blocs visuels prédéfinis.", voit: "Non", livre: "Hors sujet",
      ecrit: 0, ecritL: "Personne : des blocs", lit: 0, litL: "Il n'y a rien à lire", prop: 0, propL: "Enfermé dans l'éditeur", risque: 1, risqueL: "Faible : on reste dans le cadre de la plateforme" },
    { nom: "Low-code", qui: "Blocs visuels, plus un peu de code pour les cas particuliers.", voit: "En partie", livre: "Hors sujet",
      ecrit: 1, ecritL: "Vous, pour les cas particuliers", lit: 1, litL: "En partie", prop: 1, propL: "En partie", risque: 1, risqueL: "Faible à modéré" },
    { nom: "Développement assisté par IA", qui: "On code soi-même, l'IA suggère et explique ; on relit tout.", voit: "Oui, et on le comprend", livre: "Claude en conversation, pour comprendre",
      ecrit: 2, ecritL: "Vous, avec les suggestions de l'IA", lit: 3, litL: "Tout, et vous l'expliquez", prop: 3, propL: "Code standard, à vous", risque: 1, risqueL: "Faible : chaque ligne est relue" },
    { nom: "Vibe coding", qui: "On décrit en français, l'IA écrit tout, on juge au résultat.", voit: "Le code existe, on l'ignore", livre: "Lovable, tant qu'on ne lit pas le code",
      ecrit: 3, ecritL: "L'IA, entièrement", lit: 0, litL: "Rien : on juge au résultat", prop: 3, propL: "Code standard (React, TypeScript), à vous", risque: 3, risqueL: "Élevé dès qu'on stocke des e-mails, des comptes ou des paiements" },
    { nom: "Ingénierie agentique", qui: "Des agents planifient, écrivent, testent et corrigent en boucle ; l'humain fixe le cap et vérifie.", voit: "Oui, par la supervision et les tests", livre: "Claude Code, ou Lovable quand on planifie et vérifie",
      ecrit: 3, ecritL: "Des agents, que vous supervisez", lit: 2, litL: "Par la supervision et les tests", prop: 3, propL: "Code standard, à vous", risque: 2, risqueL: "Modéré : tenu par les tests et la vérification" }
  ];

  VIZ["ch02-echelle"] = {
    chapitre: "ch02",
    titre: "L'échelle des cinq manières de faire",
    consigne: "Déplacez le curseur d'un barreau à l'autre : qui écrit le code, qui le lit, et ce que l'on risque.",
    ancre: "Ce que fait une IA quand elle écrit",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "echelle");
      var cur = 3;

      function meter(label, val, txt, cls) {
        var segs = h("span", { class: "vz-echelle-segs", "aria-hidden": "true" });
        for (var i = 0; i < 3; i++) segs.appendChild(h("span", { class: "vz-echelle-seg" + (i < val ? " is-on" : "") }));
        return h("div", { class: "vz-echelle-m " + (cls || "") },
          h("span", { class: "vz-echelle-ml" }, label), segs, h("span", { class: "vz-echelle-mt" }, txt));
      }

      if (ctx.print) {
        var tbl = h("div", { class: "vz-echelle-print" });
        MANIERES.forEach(function (m, i) {
          tbl.appendChild(h("div", { class: "vz-echelle-prow" + (i === 3 ? " is-vibe" : "") },
            h("div", { class: "vz-echelle-pnom" }, h("span", { class: "vz-echelle-num" }, String(i + 1)), m.nom),
            h("div", { class: "vz-echelle-pm" },
              meter("Écrit par l'IA", m.ecrit, m.ecritL),
              meter("Code relu", m.lit, m.litL),
              meter("Risque", m.risque, m.risqueL, "is-risque")),
            h("div", { class: "vz-echelle-plivre" }, "Dans ce livre : " + m.livre)));
          if (i === 2) tbl.appendChild(h("div", { class: "vz-echelle-willison" }, "Critère de Simon Willison : au-dessus, on lit et on peut expliquer le code ; en dessous, non."));
        });
        r.appendChild(tbl);
        return;
      }

      var rungs = h("div", { class: "vz-echelle-rungs", role: "group", "aria-label": "Les cinq manières de faire" });
      var rb = MANIERES.map(function (m, i) {
        var b = h("button", { type: "button", class: "vz-echelle-rung", "aria-pressed": "false", onclick: function () { set(i); } },
          h("span", { class: "vz-echelle-num" }, String(i + 1)), h("span", null, m.nom));
        rungs.appendChild(b);
        return b;
      });
      var wil = h("div", { class: "vz-echelle-willison-mark", "aria-hidden": "true" }, h("span", null, "critère de Willison"));
      var slider = ui.slider({ label: "Manière de faire", min: 0, max: 4, step: 1, value: cur, fmt: function (v) { return MANIERES[v].nom; }, onInput: function (v) { set(v); } });

      var card = h("div", { class: "vz-echelle-card", "aria-live": "polite" });
      function set(i) {
        cur = i;
        slider.setValue(i);
        rb.forEach(function (b, j) { b.setAttribute("aria-pressed", String(i === j)); });
        var m = MANIERES[i];
        clear(card);
        card.appendChild(h("div", { class: "vz-echelle-ct" }, h("span", { class: "vz-echelle-num" }, String(i + 1)), m.nom));
        card.appendChild(h("p", { class: "vz-echelle-qui" }, m.qui));
        card.appendChild(meter("Qui écrit le code", m.ecrit, m.ecritL));
        card.appendChild(meter("Ce que l'humain relit", m.lit, m.litL));
        card.appendChild(meter("Le code vous appartient", m.prop, m.propL));
        card.appendChild(meter("Risque si personne ne vérifie", m.risque, m.risqueL, "is-risque"));
        card.appendChild(h("p", { class: "vz-echelle-livre" }, h("strong", null, "Voit-on le code ? "), m.voit + ". ", h("strong", null, "Dans ce livre : "), m.livre + "."));
        card.appendChild(h("p", { class: "vz-echelle-crit" }, i >= 3
          ? "Vous ne relisez pas le code : selon le critère de Simon Willison, c'est du vibe coding" + (i === 4 ? ", sauf si la supervision et les tests vous permettent de l'expliquer." : ".")
          : i === 2 ? "Vous relisez, testez et savez expliquer le code : ce n'est plus du vibe coding." : "Aucun code standard n'est produit pour vous : ce n'est pas du vibe coding."));
        card.classList.remove("is-flash"); void card.offsetWidth; card.classList.add("is-flash");
      }
      r.appendChild(h("div", { class: "vz-echelle-top" }, rungs, wil));
      r.appendChild(slider);
      r.appendChild(card);
      set(cur);
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch02 (b) : Compteur de jetons                                       */
  /* ------------------------------------------------------------------ */

  var CAR_PAR_JETON = 3.6;
  var CHAPITRE_CAR = 20000;  // un chapitre du livre, Markdown compris
  var LIVRE_CAR = 750000;    // chapitres et annexes

  function decoupe(texte) {
    // Découpage illustratif : mots courts entiers, mots longs en morceaux de 3 à 4 lettres, ponctuation à part.
    var out = [];
    (texte.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]|\s+/gu) || []).forEach(function (w) {
      if (/^\s+$/.test(w)) { out.push({ t: w, sp: true }); return; }
      if (w.length <= 4) { out.push({ t: w }); return; }
      var i = 0;
      while (i < w.length) {
        var n = w.length - i <= 5 ? w.length - i : (i === 0 ? 4 : 3);
        out.push({ t: w.slice(i, i + n) });
        i += n;
      }
    });
    return out;
  }

  VIZ["ch02-jetons"] = {
    chapitre: "ch02",
    titre: "Le compteur de jetons",
    consigne: "Écrivez ou collez un texte, puis posez des chapitres sur le plan de travail jusqu'à le faire déborder.",
    ancre: "Les hallucinations",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "jetons");
      var texte = "Une page qui présente le livre, montre trois extraits, recueille l'adresse e-mail des lecteurs intéressés et renvoie vers Amazon pour l'achat.";
      var fenetre = 200000, chapitres = ctx.print ? 3 : 0, livres = 0;

      var ta = h("textarea", { class: "vz-jetons-ta", rows: 4, "aria-label": "Votre texte", disabled: ctx.print || null, oninput: function () { texte = ta.value; maj(); } });
      ta.value = texte;
      var decoupeEl = h("p", { class: "vz-jetons-dec", "aria-hidden": "true" });
      var nb = h("div", { class: "vz-jetons-nb" });
      var calc = h("div", { class: "vz-jetons-calc" });

      var segF = ui.seg("Taille de la fenêtre de contexte", [
        { v: 200000, label: "200 000", sub: "Haiku 4.5" },
        { v: 1000000, label: "1 000 000", sub: "Sonnet 5, Opus 5.5, Fable 5.1" }
      ], fenetre, function (v) { fenetre = v; fField.setValue && fField.setValue(v); maj(); });
      var fField = ui.field({ label: "Fenêtre (jetons)", value: fenetre, dec: 0, min: 1000, onChange: function (v) { fenetre = v; segF.set(v); maj(); } });

      var bar = h("div", { class: "vz-jetons-bar", role: "img" });
      var segT = h("span", { class: "vz-jetons-s vz-jetons-s--t" });
      var segC = h("span", { class: "vz-jetons-s vz-jetons-s--c" });
      var segL = h("span", { class: "vz-jetons-s vz-jetons-s--l" });
      var over = h("span", { class: "vz-jetons-over" });
      bar.appendChild(segT); bar.appendChild(segC); bar.appendChild(segL); bar.appendChild(over);
      [25, 50, 75].forEach(function (p) { bar.appendChild(h("span", { class: "vz-jetons-tick", style: { left: p + "%" } })); });
      var pct = h("div", { class: "vz-jetons-pct" });
      var msg = h("p", { class: "vz-jetons-msg", "aria-live": "polite" });
      var leg = h("div", { class: "vz-jetons-leg" });

      var jC = Math.round(CHAPITRE_CAR / CAR_PAR_JETON), jL = Math.round(LIVRE_CAR / CAR_PAR_JETON);
      var actions = ctx.print ? null : h("div", { class: "vz-jetons-actions" },
        ui.btn("+ un chapitre (≈ " + nf(jC) + " jetons)", function () { chapitres++; maj(); }),
        ui.btn("+ le livre entier (≈ " + nf(jL) + " jetons)", function () { livres++; maj(); }),
        ui.btn("Débarrasser le plan", function () { chapitres = 0; livres = 0; maj(); }, "vz-a-btn--ghost"));

      function maj() {
        var nT = Math.ceil(texte.length / CAR_PAR_JETON);
        var nC = chapitres * jC, nL = livres * jL, tot = nT + nC + nL;
        nb.textContent = "≈ " + nf(nT) + " jeton" + (nT > 1 ? "s" : "");
        calc.textContent = nf(texte.length) + " caractères ÷ 3,6 (repère pour le français)";
        clear(decoupeEl);
        decoupe(texte.slice(0, 360)).forEach(function (p, i) {
          decoupeEl.appendChild(p.sp ? document.createTextNode(" ") : h("span", { class: "vz-jetons-tok vz-jetons-tok--" + (i % 4) }, p.t));
        });
        if (texte.length > 360) decoupeEl.appendChild(document.createTextNode(" …"));
        var base = Math.max(tot, fenetre);
        segT.style.width = (100 * Math.min(nT, fenetre) / fenetre) + "%";
        var restC = Math.max(0, fenetre - nT);
        segC.style.width = (100 * Math.min(nC, restC) / fenetre) + "%";
        var restL = Math.max(0, restC - nC);
        segL.style.width = (100 * Math.min(nL, restL) / fenetre) + "%";
        over.style.display = tot > fenetre ? "block" : "none";
        var p = 100 * tot / fenetre;
        pct.textContent = nf(tot) + " / " + nf(fenetre) + " jetons · " + nf(p, p < 1 ? 2 : p < 10 ? 1 : 0) + " %";
        bar.setAttribute("aria-label", "Fenêtre de contexte remplie à " + nf(p, 0) + " %");
        bar.classList.toggle("is-plein", tot > fenetre);
        clear(leg);
        leg.appendChild(h("span", { class: "vz-jetons-k vz-jetons-k--t" }, "Votre texte"));
        if (chapitres) leg.appendChild(h("span", { class: "vz-jetons-k vz-jetons-k--c" }, chapitres + " chapitre" + (chapitres > 1 ? "s" : "")));
        if (livres) leg.appendChild(h("span", { class: "vz-jetons-k vz-jetons-k--l" }, livres > 1 ? livres + " livres entiers" : "Le livre entier"));
        msg.textContent = tot > fenetre
          ? "Le plan de travail déborde de " + nf(tot - fenetre) + " jetons : les premières pièces tombent, ou restent sous la pile. Repartez d'une conversation propre avec un résumé de passation."
          : p > 75 ? "Le plan se remplit : la couleur imposée au début risque de passer sous la pile."
          : "Tout tient sur le plan de travail. Le livre entier (≈ " + nf(jL) + " jetons) dépasse pourtant une fenêtre de 200 000.";
        void base;
      }

      r.appendChild(h("div", { class: "vz-jetons-grid" },
        h("div", { class: "vz-jetons-in" }, ui.kicker("Votre texte"), ta, decoupeEl,
          h("p", { class: "vz-a-small" }, "Découpage illustratif : le vrai découpage dépend du modèle.")),
        h("div", { class: "vz-jetons-out" }, ui.kicker("Estimation"), nb, calc)));
      r.appendChild(h("div", { class: "vz-jetons-win" }, ui.kicker("La fenêtre de contexte, un plan de travail"),
        h("div", { class: "vz-jetons-cfg" }, segF.el, fField), bar, h("div", { class: "vz-jetons-under" }, leg, pct), msg, actions));
      if (ctx.print) r.appendChild(h("p", { class: "vz-a-small" }, "Exemple imprimé : votre texte et trois chapitres posés sur une fenêtre de 200 000 jetons."));
      maj();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch03 : La maison                                                    */
  /* ------------------------------------------------------------------ */

  var PIECES = [
    { id: "front", lieu: "La façade et le salon", terme: "Frontend (le front)",
      txt: "La partie visible : pages, boutons, formulaires, menus, affichés dans le navigateur du visiteur. HTML pour la structure, CSS pour l'apparence, JavaScript pour le comportement.",
      prompt: "Sur la page d'inscription, affiche un message clair sous le champ quand l'adresse est mal saisie. C'est un changement d'affichage seulement : ne touche pas au traitement côté serveur." },
    { id: "back", lieu: "La cuisine et la chaufferie", terme: "Backend (le back)",
      txt: "La partie invisible, sur un serveur : elle applique les règles, fait les calculs, parle à la base. Ce qui doit rester vrai quoi que fasse le visiteur (un prix, un droit, une limite) s'applique ici.",
      prompt: "Le calcul se fait côté serveur, jamais dans le navigateur : le visiteur ne doit pas pouvoir modifier le prix ni contourner la vérification." },
    { id: "base", lieu: "Le cellier et ses registres", terme: "Base de données",
      txt: "L'endroit où l'application range durablement ce qu'elle retient, en tables (lignes et colonnes), comme un registre sur chaque étagère. Avec Lovable : Lovable Cloud, une base PostgreSQL.",
      prompt: "Crée une table abonnés : adresse e-mail, date d'inscription, statut (en attente, confirmé, désinscrit). Montre-moi la migration avant de l'appliquer." },
    { id: "stockage", lieu: "La réserve", terme: "Stockage de fichiers",
      txt: "Images, PDF, vidéos vont dans un espace de stockage ; la base ne garde que leur adresse, comme « carton n° 12, au fond à gauche ». Même question qu'ailleurs : qui a le droit d'y entrer ?",
      prompt: "Range les captures d'écran dans un espace de stockage privé ; la base ne garde que leur adresse. Seuls l'auteur du commentaire et l'auteur du livre peuvent les ouvrir." },
    { id: "api", lieu: "Le guichet", terme: "API et clé d'API",
      txt: "Le guichet normalisé par lequel l'application parle à Stripe, Resend ou Claude. Il ne devine rien : une virgule de travers, et il répond par un code d'erreur. La clé d'API, pièce d'identité du guichet, ne quitte jamais le back.",
      prompt: "Appelle l'API de Resend depuis le serveur ; la clé reste dans les secrets, jamais dans le code du navigateur. En cas d'échec, montre-moi le message d'erreur exact." },
    { id: "authn", lieu: "La serrure de la porte d'entrée", terme: "Authentification",
      txt: "Elle vérifie qui vous êtes : mot de passe, lien magique reçu par e-mail, compte Google. Une porte d'entrée verrouillée ne dit rien des pièces intérieures.",
      prompt: "Ajoute la connexion par lien magique reçu par e-mail, réservée aux personnes invitées. Pas d'inscription libre." },
    { id: "authz", lieu: "Le badge des portes intérieures", terme: "Autorisation",
      txt: "Elle vérifie ce que vous avez le droit de faire une fois entré. Dans L'Atelier : une relectrice voit les chapitres en Relecture ou Publié, commente, mais ne change aucun statut.",
      prompt: "Un relecteur ne voit que les chapitres au statut Relecture ou Publié et ne peut changer aucun statut. Applique cette règle dans la base, pas seulement dans l'interface." },
    { id: "hebergement", lieu: "Le terrain", terme: "Hébergement",
      txt: "Les serveurs qui font tourner l'application en permanence. Avec Lovable, le terrain est fourni : un clic sur Publish met l'application en ligne.",
      prompt: "Avant de publier, lance le scan de sécurité et résume-moi son verdict, problème par problème." },
    { id: "domaine", lieu: "L'adresse sur la boîte aux lettres", terme: "Nom de domaine",
      txt: "L'adresse lisible de la maison, par exemple guide-vibecoding.fr (nom d'exemple). Le déploiement, c'est publier une nouvelle version à cette adresse (chapitre 12).",
      prompt: "Je veux brancher un domaine loué chez un registrar sur ce projet : quels enregistrements DNS dois-je créer, sans toucher aux MX existants ?" },
    { id: "framework", lieu: "La charpente en kit", terme: "Framework",
      txt: "Une boîte à outils qui impose une organisation et évite de tout réinventer : React, TypeScript, Tailwind CSS et, depuis le 13 mai 2026, TanStack Start pour les nouveaux projets Lovable.",
      prompt: "Reste sur les composants React et Tailwind déjà présents dans le projet ; n'ajoute aucune bibliothèque sans me le demander." },
    { id: "depot", lieu: "Les archives du chantier", terme: "Dépôt (GitHub)",
      txt: "Le dossier du projet sous gestion de versions : chaque modification laisse une trace datée. Le jour où l'IA casse quelque chose, c'est là qu'on retrouve la dernière version qui fonctionnait.",
      prompt: "Avant de modifier quoi que ce soit, indique-moi le dernier état enregistré dans GitHub où cette page fonctionnait." }
  ];

  function maisonSVG() {
    var g = {};
    function zone(id, kids) {
      var p = PIECES.filter(function (x) { return x.id === id; })[0];
      var z = s("g", { class: "vz-maison-z", "data-id": id, tabindex: "0", role: "button", "aria-label": p.lieu + " : " + p.terme });
      addKids(z, kids);
      g[id] = z;
      return z;
    }
    var svg = s("svg", { viewBox: "0 0 400 300", class: "vz-maison-svg", role: "group", "aria-label": "Plan de la maison" },
      // terrain
      zone("hebergement", [
        s("rect", { x: 0, y: 232, width: 400, height: 18, class: "vz-maison-terre" }),
        s("path", { d: "M8 232 l6 -8 l6 8 M360 232 l7 -10 l7 10 M378 232 l5 -7 l5 7", class: "vz-maison-herbe" })
      ]),
      // cellier
      zone("base", [
        s("rect", { x: 96, y: 250, width: 170, height: 44, rx: 3, class: "vz-maison-sous" }),
        s("path", { d: "M106 266 h150 M106 282 h150", class: "vz-maison-trait" }),
        s("rect", { x: 112, y: 256, width: 16, height: 9, class: "vz-maison-obj" }), s("rect", { x: 134, y: 256, width: 16, height: 9, class: "vz-maison-obj" }),
        s("rect", { x: 170, y: 272, width: 16, height: 9, class: "vz-maison-obj" }), s("rect", { x: 210, y: 256, width: 16, height: 9, class: "vz-maison-obj" }),
        s("rect", { x: 230, y: 272, width: 16, height: 9, class: "vz-maison-obj" })
      ]),
      // charpente (framework)
      zone("framework", [
        s("path", { d: "M50 112 L190 38 L330 112 Z", class: "vz-maison-toit" }),
        s("path", { d: "M190 38 V112 M120 75 L150 112 M260 75 L230 112", class: "vz-maison-trait" })
      ]),
      // réserve (combles)
      zone("stockage", [
        s("rect", { x: 160, y: 78, width: 60, height: 30, rx: 2, class: "vz-maison-piece" }),
        s("rect", { x: 168, y: 92, width: 12, height: 12, class: "vz-maison-obj" }), s("rect", { x: 184, y: 88, width: 14, height: 16, class: "vz-maison-obj" }),
        s("rect", { x: 202, y: 94, width: 10, height: 10, class: "vz-maison-obj" })
      ]),
      // salon (front)
      zone("front", [
        s("rect", { x: 60, y: 112, width: 120, height: 120, class: "vz-maison-piece" }),
        s("rect", { x: 112, y: 132, width: 50, height: 34, rx: 2, class: "vz-maison-vitre" }),
        s("path", { d: "M137 132 v34 M112 149 h50", class: "vz-maison-trait" }),
        s("path", { d: "M112 214 h52 v-12 h-52 z M116 202 v-8 h44 v8", class: "vz-maison-obj-l" })
      ]),
      // cuisine et chaufferie (back)
      zone("back", [
        s("rect", { x: 180, y: 112, width: 140, height: 120, class: "vz-maison-piece vz-maison-piece--back" }),
        s("path", { d: "M250 112 v120", class: "vz-maison-trait" }),
        s("rect", { x: 192, y: 196, width: 46, height: 36, class: "vz-maison-obj-l" }),
        s("circle", { cx: 205, cy: 204, r: 4, class: "vz-maison-trait" }), s("circle", { cx: 224, cy: 204, r: 4, class: "vz-maison-trait" }),
        s("rect", { x: 262, y: 168, width: 22, height: 64, rx: 3, class: "vz-maison-obj-l" }),
        s("path", { d: "M273 168 v-30 h30", class: "vz-maison-trait" })
      ]),
      // archives (dépôt)
      zone("depot", [
        s("rect", { x: 292, y: 176, width: 22, height: 56, class: "vz-maison-obj" }),
        s("path", { d: "M292 194 h22 M292 212 h22", class: "vz-maison-trait-f" })
      ]),
      // badge (autorisation)
      zone("authz", [
        s("rect", { x: 176, y: 172, width: 8, height: 60, class: "vz-maison-porte-int" }),
        s("rect", { x: 186, y: 176, width: 10, height: 14, rx: 2, class: "vz-maison-badge" }),
        s("circle", { cx: 191, cy: 183, r: 2.2, class: "vz-maison-led" })
      ]),
      // porte et serrure (authentification)
      zone("authn", [
        s("rect", { x: 70, y: 168, width: 28, height: 64, rx: 2, class: "vz-maison-porte" }),
        s("circle", { cx: 92, cy: 202, r: 3, class: "vz-maison-serrure" }),
        s("path", { d: "M92 205 v5", class: "vz-maison-serrure-l" })
      ]),
      // guichet (API)
      zone("api", [
        s("rect", { x: 320, y: 142, width: 22, height: 40, class: "vz-maison-piece" }),
        s("path", { d: "M318 140 h28 l-4 -10 h-20 z", class: "vz-maison-store" }),
        s("path", { d: "M342 162 h14", class: "vz-maison-cable" }),
        s("rect", { x: 356, y: 128, width: 38, height: 14, rx: 3, class: "vz-maison-svc" }),
        s("rect", { x: 356, y: 155, width: 38, height: 14, rx: 3, class: "vz-maison-svc" }),
        s("rect", { x: 356, y: 182, width: 38, height: 14, rx: 3, class: "vz-maison-svc" }),
        s("text", { x: 375, y: 138, class: "vz-maison-svct" }, "Stripe"),
        s("text", { x: 375, y: 165, class: "vz-maison-svct" }, "Resend"),
        s("text", { x: 375, y: 192, class: "vz-maison-svct" }, "Claude"),
        s("path", { d: "M356 135 l-8 0 l0 54 l8 0 M348 162 h8", class: "vz-maison-cable" })
      ]),
      // boîte aux lettres (domaine)
      zone("domaine", [
        s("path", { d: "M26 232 v-26", class: "vz-maison-trait-f" }),
        s("rect", { x: 12, y: 190, width: 30, height: 18, rx: 4, class: "vz-maison-bal" }),
        s("text", { x: 27, y: 203, class: "vz-maison-balt" }, ".fr")
      ])
    );
    return { svg: svg, g: g };
  }

  VIZ["ch03-maison"] = {
    chapitre: "ch03",
    titre: "La maison interactive",
    consigne: "Cliquez sur une pièce de la maison (ou sur son nom) pour savoir ce qu'elle est, et comment en parler à l'IA.",
    ancre: "Trois maisons pour un même livre",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "maison");
      var m = maisonSVG();
      var stage = h("div", { class: "vz-maison-stage" }, m.svg);
      r.appendChild(stage);

      if (ctx.print) {
        var lst = h("ol", { class: "vz-maison-legende" });
        PIECES.forEach(function (p) {
          lst.appendChild(h("li", null, h("strong", null, p.lieu + " → " + p.terme), h("span", null, p.txt)));
        });
        r.appendChild(lst);
        return;
      }

      var chips = h("div", { class: "vz-maison-chips", role: "group", "aria-label": "Pièces de la maison" });
      var cb = {};
      PIECES.forEach(function (p) {
        cb[p.id] = h("button", { type: "button", class: "vz-maison-chip", "aria-pressed": "false", onclick: function () { pick(p.id); } }, p.terme.split(" (")[0]);
        chips.appendChild(cb[p.id]);
      });
      var panel = h("div", { class: "vz-maison-panel", "aria-live": "polite" });
      r.appendChild(chips);
      r.appendChild(panel);

      function pick(id) {
        var p = PIECES.filter(function (x) { return x.id === id; })[0];
        Object.keys(m.g).forEach(function (k) {
          m.g[k].classList.toggle("is-on", k === id);
          m.g[k].setAttribute("aria-pressed", String(k === id));
          cb[k].setAttribute("aria-pressed", String(k === id));
        });
        clear(panel);
        panel.appendChild(h("div", { class: "vz-maison-ptop" }, h("span", { class: "vz-maison-lieu" }, p.lieu), h("span", { class: "vz-maison-fl", "aria-hidden": "true" }, "→"), h("strong", { class: "vz-maison-terme" }, p.terme)));
        panel.appendChild(h("p", null, p.txt));
        panel.appendChild(ui.kicker("La phrase qui situe la pièce pour l'IA"));
        panel.appendChild(ui.prompt(p.prompt));
        panel.classList.remove("is-flash"); void panel.offsetWidth; panel.classList.add("is-flash");
      }
      Object.keys(m.g).forEach(function (k) {
        m.g[k].addEventListener("click", function () { pick(k); });
        m.g[k].addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(k); } });
      });
      pick("front");
      onVisible(r, ctx, function () { r.classList.add("is-in"); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch04 : Votre atelier                                                */
  /* ------------------------------------------------------------------ */

  var REGLAGES = [
    { rub: "Application de bureau", nom: "Application de bureau installée et connectée", bon: true, pq: "C'est là que se trouvent les réglages les plus sensibles, même si vous travaillez surtout dans le navigateur." },
    { rub: "Général", nom: "Instructions générales rédigées (cinq lignes, pas plus de dix)", bon: true, pq: "Elles valent pour toutes les conversations : qui vous êtes, comment Claude doit vous répondre." },
    { rub: "Confidentialité", nom: "Choix fait, en connaissance de cause, pour « Help improve Claude »", bon: true, pq: "Pas de bonne réponse imposée : seulement l'obligation de choisir, surtout avec des documents de clients." },
    { rub: "Facturation, Utilisation", nom: "Offre choisie et page Utilisation consultée", bon: true, pq: "Les limites se calculent sur des fenêtres glissantes : consultez Utilisation chaque semaine le premier mois." },
    { rub: "Capacités", nom: "Exécution de code et création de fichiers", bon: true, pq: "Nécessaire pour fabriquer tableurs et PDF, et pour que les compétences fonctionnent." },
    { rub: "Accès aux fichiers", nom: "Accès à tout votre dossier personnel", bon: false, pq: "Un seul dossier connecté, Guide-Vibe-Coding, sans aucune donnée personnelle." },
    { rub: "Accès aux fichiers", nom: "Approbation automatique des actions", bon: false, pq: "Gardez le mode d'approbation manuel : vous validez chaque action sur votre ordinateur." },
    { rub: "Claude dans Chrome", nom: "Extension Claude dans Chrome installée", bon: false, pq: "Elle lit, clique et remplit des formulaires en votre nom : pas pour l'instant." },
    { rub: "Personnalisation", nom: "Extensions, plugins et connecteurs ajoutés « pour voir »", bon: false, pq: "Au plus un connecteur actif, celui de vos brouillons ; le reste, pour un besoin identifié." },
    { rub: "Clés API", nom: "Clé API créée dans la Console", bon: false, pq: "Une clé est un secret facturé à l'usage : elle attendra le chapitre 16." }
  ];

  function jauge(ratio) {
    var R = 70, C = Math.PI * R;
    var arc = s("path", { d: "M10 80 A70 70 0 0 1 150 80", class: "vz-atelier-arc", "stroke-dasharray": C.toFixed(1), "stroke-dashoffset": (C * (1 - ratio)).toFixed(1) });
    var svg = s("svg", { viewBox: "0 0 160 92", class: "vz-atelier-jauge", "aria-hidden": "true" },
      s("path", { d: "M10 80 A70 70 0 0 1 150 80", class: "vz-atelier-arc-fond" }), arc);
    for (var i = 0; i <= 10; i++) {
      var a = Math.PI * (1 - i / 10), x1 = 80 + 58 * Math.cos(a), y1 = 80 - 58 * Math.sin(a), x2 = 80 + 52 * Math.cos(a), y2 = 80 - 52 * Math.sin(a);
      svg.appendChild(s("line", { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), class: "vz-atelier-grad" }));
    }
    return { svg: svg, set: function (k) { arc.setAttribute("stroke-dashoffset", (C * (1 - k)).toFixed(1)); } };
  }

  VIZ["ch04-atelier"] = {
    chapitre: "ch04",
    titre: "Votre atelier, réglé ou pas",
    consigne: "Basculez chaque interrupteur comme dans vos Paramètres : la jauge mesure l'écart avec l'atelier du jour 1.",
    ancre: "Appliqué au Guide : l'atelier du jour 1",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "atelier");
      var etat = REGLAGES.map(function (x) { return ctx.print ? x.bon : false; });
      var J = jauge(0);
      var score = h("div", { class: "vz-atelier-score" });
      var verdict = h("p", { class: "vz-atelier-verdict", "aria-live": "polite" });
      var rows = h("div", { class: "vz-atelier-rows" });
      var items = REGLAGES.map(function (x, i) {
        var sw = h("button", { type: "button", role: "switch", class: "vz-atelier-sw", "aria-checked": String(etat[i]), "aria-label": x.nom, disabled: ctx.print || null,
          onclick: function () { etat[i] = !etat[i]; maj(); } }, h("span", { class: "vz-atelier-knob" }));
        var why = h("p", { class: "vz-atelier-why" }, x.pq);
        var row = h("div", { class: "vz-atelier-row" },
          h("div", { class: "vz-atelier-txt" }, h("span", { class: "vz-atelier-rub" }, x.rub), h("span", { class: "vz-atelier-nom" }, x.nom), why),
          h("span", { class: "vz-atelier-st", "aria-hidden": "true" }), sw);
        rows.appendChild(row);
        return { row: row, sw: sw };
      });
      function maj() {
        var ok = 0;
        items.forEach(function (it, i) {
          var good = etat[i] === REGLAGES[i].bon;
          if (good) ok++;
          it.sw.setAttribute("aria-checked", String(etat[i]));
          it.row.classList.toggle("is-ok", good);
          it.row.classList.toggle("is-ko", !good);
          it.row.querySelector(".vz-atelier-st").textContent = good ? "✓" : "!";
        });
        J.set(ok / REGLAGES.length);
        r.style.setProperty("--atelier-k", ok / REGLAGES.length);
        score.textContent = ok + " / " + REGLAGES.length;
        verdict.textContent = ok === REGLAGES.length ? "Atelier réglé : c'est l'établi de tout le livre."
          : ok >= 8 ? "Presque : relisez les lignes marquées d'un point d'exclamation."
          : etat.every(Boolean) ? "Tout activer n'est pas régler : moindre privilège d'abord."
          : "Ne rien toucher vous donne la moitié des points ; l'autre moitié demande de choisir.";
      }
      r.appendChild(h("div", { class: "vz-atelier-top" },
        h("div", { class: "vz-atelier-g" }, J.svg, score),
        h("div", null, ui.kicker("Atelier réglé"), verdict,
          ctx.print ? null : h("div", { class: "vz-atelier-acts" },
            ui.btn("Appliquer les réglages du livre", function () { etat = REGLAGES.map(function (x) { return x.bon; }); maj(); }, "vz-a-btn--accent"),
            ui.btn("Tout activer", function () { etat = REGLAGES.map(function () { return true; }); maj(); }, "vz-a-btn--ghost"),
            ui.btn("Remettre à zéro", function () { etat = REGLAGES.map(function () { return false; }); maj(); }, "vz-a-btn--ghost")))));
      r.appendChild(rows);
      maj();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch05 : Les couches de mémoire                                       */
  /* ------------------------------------------------------------------ */

  var LECTEURS = [
    { id: "chat", label: "Claude.ai", sub: "conversation" },
    { id: "projet", label: "Claude.ai", sub: "dans un projet" },
    { id: "code", label: "Claude Code", sub: "dans le dépôt" },
    { id: "lovable", label: "Agent Lovable", sub: "dans le projet" }
  ];
  // l : 2 = lu à chaque fois, 1 = lu sous condition, 0 = pas lu
  var ETAGES = [
    { nom: "Instructions générales", retient: "Qui vous êtes, comment vous répondre", ou: "Paramètres, Général (chapitre 4)", qui: "Vous",
      l: { chat: [2, "Dans chaque conversation"], projet: [2, "Dans chaque conversation, complétées par celles du projet"], code: [0], lovable: [0] } },
    { nom: "Mémoire de Claude", retient: "Des sujets appris au fil des conversations", ou: "Paramètres, Mémoire", qui: "Claude, sous votre contrôle",
      l: { chat: [1, "Quand une question semble y faire référence"], projet: [1, "La mémoire propre au projet, séparée du reste"], code: [0], lovable: [0] } },
    { nom: "Projet", retient: "Le contexte d'un chantier : instructions et documents", ou: "Claude.ai, Projets", qui: "Vous",
      l: { chat: [0], projet: [2, "Instructions au début de chaque conversation ; documents consultés"], code: [0], lovable: [0] } },
    { nom: "Compétences", retient: "Des procédures réutilisables", ou: "Paramètres, Compétences (SKILL.md)", qui: "Vous, avec l'aide de Claude",
      l: { chat: [1, "Nom et description d'abord ; le reste si la tâche correspond"], projet: [1, "Idem : chargées seulement si la tâche correspond"], code: [1, "Si la tâche correspond"], lovable: [1, "Même format SKILL.md, si la tâche correspond"] } },
    { nom: "AGENTS.md et CLAUDE.md", retient: "Les règles d'un dépôt de code", ou: "À la racine du dépôt", qui: "Vous et l'agent",
      l: { chat: [0], projet: [0], code: [2, "Au démarrage : CLAUDE.md, qui importe AGENTS.md"], lovable: [2, "Toujours, quand AGENTS.md est à la racine"] } },
    { nom: "Knowledge de Lovable", retient: "Les règles d'un projet Lovable", ou: "Réglages du projet Lovable", qui: "Vous",
      l: { chat: [0], projet: [0], code: [0], lovable: [2, "Toujours incluse, à chaque message"] } },
    { nom: "Journal de décisions", retient: "Ce qu'on a décidé, et pourquoi", ou: "decisions.md, dans le projet puis le dépôt", qui: "Vous",
      l: { chat: [0], projet: [1, "S'il est déposé dans les connaissances du projet"], code: [1, "S'il est dans le dépôt, quand la tâche l'exige"], lovable: [1, "S'il est dans le dépôt, quand la tâche l'exige"] } },
    { nom: "Votre mémoire", retient: "Vos mots, vos notes, vos rituels", ou: "Votre lexique, votre carnet", qui: "Vous seul",
      l: { chat: [0], projet: [0], code: [0], lovable: [0] } }
  ];

  VIZ["ch05-memoire"] = {
    chapitre: "ch05",
    titre: "Les étages de la mémoire",
    consigne: "Choisissez un outil : les étages qu'il lit s'allument. Cliquez sur un étage pour le détail.",
    ancre: "Quand la mémoire se trompe",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "memoire");

      if (ctx.print) {
        var t = h("table", { class: "vz-memoire-tab" });
        var thr = h("tr", null, h("th", null, "Étage"));
        LECTEURS.forEach(function (L) { thr.appendChild(h("th", null, L.label, h("br"), h("small", null, L.sub))); });
        t.appendChild(h("thead", null, thr));
        var tb = h("tbody");
        ETAGES.forEach(function (e) {
          var tr = h("tr", null, h("th", null, e.nom, h("br"), h("small", null, e.qui)));
          LECTEURS.forEach(function (L) {
            var v = e.l[L.id][0];
            tr.appendChild(h("td", { class: "vz-memoire-c" + v }, v === 2 ? "● toujours" : v === 1 ? "◐ sous condition" : "·"));
          });
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        r.appendChild(t);
        r.appendChild(h("p", { class: "vz-a-small" }, "Plus on descend, plus la mémoire est précise et plus elle vous appartient. Le dernier étage ne dépend d'aucun outil."));
        return;
      }

      var lecteur = "projet", ouvert = null;
      var seg = ui.seg("Outil qui lit", LECTEURS.map(function (L) { return { v: L.id, label: L.label, sub: L.sub }; }), lecteur, function (v) { lecteur = v; maj(); });
      var pile = h("div", { class: "vz-memoire-pile" });
      var axe = h("div", { class: "vz-memoire-axe", "aria-hidden": "true" }, h("span", null, "automatique, commode"), h("span", null, "manuel, fiable, à vous"));
      var rows = ETAGES.map(function (e, i) {
        var det = h("div", { class: "vz-memoire-det" });
        var b = h("button", { type: "button", class: "vz-memoire-et", "aria-expanded": "false", onclick: function () { ouvert = ouvert === i ? null : i; maj(); } },
          h("span", { class: "vz-memoire-n" }, String(i + 1)),
          h("span", { class: "vz-memoire-nom" }, e.nom),
          h("span", { class: "vz-memoire-quand" }));
        var w = h("div", { class: "vz-memoire-w" }, b, det);
        w.style.setProperty("--i", i);
        pile.appendChild(w);
        return { w: w, b: b, det: det };
      });
      var bilan = h("p", { class: "vz-memoire-bilan", "aria-live": "polite" });

      function maj() {
        var n2 = 0, n1 = 0;
        rows.forEach(function (row, i) {
          var e = ETAGES[i], v = e.l[lecteur];
          row.w.classList.remove("is-l0", "is-l1", "is-l2");
          row.w.classList.add("is-l" + v[0]);
          if (v[0] === 2) n2++; else if (v[0] === 1) n1++;
          row.b.querySelector(".vz-memoire-quand").textContent = v[0] ? v[1] : (i === ETAGES.length - 1 ? "Aucune IA ne la lit" : "Pas lu");
          var open = ouvert === i;
          row.b.setAttribute("aria-expanded", String(open));
          clear(row.det);
          if (open) {
            row.det.appendChild(h("dl", null,
              h("dt", null, "Ce qu'il retient"), h("dd", null, e.retient),
              h("dt", null, "Où il se trouve"), h("dd", null, e.ou),
              h("dt", null, "Qui l'écrit"), h("dd", null, e.qui)));
          }
        });
        var L = LECTEURS.filter(function (x) { return x.id === lecteur; })[0];
        bilan.textContent = L.label + " (" + L.sub + ") lit " + n2 + " étage" + (n2 > 1 ? "s" : "") + " à chaque fois et " + n1 + " sous condition. Ce qu'il ne lit pas, il faut le reposer sur l'établi.";
      }
      r.appendChild(seg.el);
      r.appendChild(h("div", { class: "vz-memoire-cols" }, axe, pile));
      r.appendChild(h("div", { class: "vz-memoire-leg" },
        h("span", { class: "vz-memoire-k vz-memoire-k2" }, "Lu à chaque fois"),
        h("span", { class: "vz-memoire-k vz-memoire-k1" }, "Lu sous condition"),
        h("span", { class: "vz-memoire-k vz-memoire-k0" }, "Pas lu")));
      r.appendChild(bilan);
      maj();
      onVisible(r, ctx, function () { r.classList.add("is-in"); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch06 : Budget de crédits                                            */
  /* ------------------------------------------------------------------ */

  VIZ["ch06-credits"] = {
    chapitre: "ch06",
    titre: "Le budget de crédits",
    consigne: "Réglez une séance type et votre forfait : la courbe montre le jour où le solde tombe à zéro.",
    ancre: "La Knowledge : là où Lovable range vos consignes",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "credits");
      var st = { forfait: "pro", quota: 100, seances: 12, chat: 6, plan: 2, build: 5, rep: 2, cChat: 0.2, cPlan: 1, cBuild: 1.2 };
      var FORFAITS = { free: { q: 30, jour: 5 }, pro: { q: 100, jour: Infinity }, autre: { q: 200, jour: Infinity } };

      var segF = ui.seg("Forfait Lovable", [
        { v: "free", label: "Free", sub: "5 par jour, 30 par mois" },
        { v: "pro", label: "Pro", sub: "100 par mois" },
        { v: "autre", label: "Autre", sub: "à saisir" }
      ], st.forfait, function (v) { st.forfait = v; st.quota = FORFAITS[v].q; qField.setValue && qField.setValue(st.quota); maj(); });
      var qField = ui.field({ label: "Crédits du mois", value: st.quota, dec: 0, min: 1, onChange: function (v) { st.quota = v; if (st.forfait !== "autre") { st.forfait = "autre"; segF.set("autre"); } FORFAITS.autre.q = v; maj(); } });

      function sl(label, key, max, step) {
        return ui.slider({ label: label, min: 0, max: max, step: step || 1, value: st[key], onInput: function (v) { st[key] = v; maj(); } });
      }
      var reglages = h("div", { class: "vz-credits-sl" },
        sl("Séances par mois", "seances", 30),
        sl("Messages Chat par séance", "chat", 30),
        sl("Messages Plan par séance", "plan", 10),
        sl("Messages Build par séance", "build", 20),
        sl("Build de réparation par séance", "rep", 15));
      var couts = h("div", { class: "vz-credits-couts" },
        ui.field({ label: "Chat", unit: "crédit", value: st.cChat, dec: 2, min: 0, onChange: function (v) { st.cChat = v; maj(); } }),
        ui.field({ label: "Plan", unit: "crédit", value: st.cPlan, dec: 2, min: 0, onChange: function (v) { st.cPlan = v; maj(); } }),
        ui.field({ label: "Build (moyenne)", unit: "crédit", value: st.cBuild, dec: 2, min: 0, onChange: function (v) { st.cBuild = v; maj(); } }));

      var kSeance = ui.kpi("Par séance", "");
      var kMois = ui.kpi("Besoin du mois", "");
      var kFin = ui.kpi("Le forfait tient", "", "vz-a-kpi--big");
      var pile = h("div", { class: "vz-credits-pile", role: "img" });
      var pileLeg = h("div", { class: "vz-credits-pleg" });
      var chart = h("div", { class: "vz-credits-chart" });
      var conseil = h("p", { class: "vz-credits-conseil", "aria-live": "polite" });

      function maj() {
        var f = FORFAITS[st.forfait];
        var parts = [
          { k: "chat", l: "Chat", v: st.chat * st.cChat },
          { k: "plan", l: "Plan", v: st.plan * st.cPlan },
          { k: "build", l: "Build", v: st.build * st.cBuild },
          { k: "rep", l: "Réparations", v: st.rep * st.cBuild }
        ];
        var seance = parts.reduce(function (a, p) { return a + p.v; }, 0);
        var parJour = Math.min(seance, f.jour);
        var mois = st.seances * seance;
        kSeance.set(nf(seance, 1) + " crédits");
        kMois.set(nf(mois, 0) + " crédits");

        // Simulation sur 30 jours, séances réparties régulièrement
        var solde = st.quota, pts = [[0, solde]], epuise = null, bride = parJour < seance - 1e-9;
        var jours = [];
        for (var i = 0; i < st.seances; i++) jours.push(Math.min(30, Math.max(1, Math.round((i + 0.5) * 30 / Math.max(1, st.seances)))));
        for (var d = 1; d <= 30; d++) {
          jours.forEach(function (x) {
            if (x !== d || parJour <= 0) return;
            if (solde + 1e-9 < parJour && epuise === null) epuise = d;
            solde = Math.max(0, solde - parJour);
          });
          pts.push([d, solde]);
        }
        var tient = epuise === null && !bride;
        kFin.set(tient ? "Oui, reste " + nf(st.quota - mois, 0) : (epuise ? "Épuisé le jour " + epuise : "Bridé chaque jour"));
        kFin.classList.toggle("is-ko", !tient);

        clear(pile);
        clear(pileLeg);
        parts.forEach(function (p) {
          var w = seance ? 100 * p.v / seance : 0;
          pile.appendChild(h("span", { class: "vz-credits-p vz-credits-p--" + p.k, style: { width: w + "%" } }));
          pileLeg.appendChild(h("span", { class: "vz-credits-k vz-credits-k--" + p.k }, p.l + " " + nf(p.v, 1)));
        });
        pile.setAttribute("aria-label", "Répartition d'une séance : " + parts.map(function (p) { return p.l + " " + nf(p.v, 1); }).join(", "));

        // Graphique du solde
        var W = 320, H = 130, L = 30, B = 20, T = 8;
        var ymax = Math.max(st.quota, 1);
        function X(d) { return L + (W - L - 6) * d / 30; }
        function Y(v) { return T + (H - T - B) * (1 - v / ymax); }
        var dPath = pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join(" ");
        var area = dPath + " L" + X(30) + " " + Y(0) + " L" + X(0) + " " + Y(0) + " Z";
        var svg = s("svg", { viewBox: "0 0 " + W + " " + H, class: "vz-credits-svg", role: "img", "aria-label": "Solde de crédits sur trente jours" + (epuise ? ", épuisé le jour " + epuise : "") });
        [0, 0.5, 1].forEach(function (k) {
          svg.appendChild(s("line", { x1: L, x2: W - 6, y1: Y(ymax * k), y2: Y(ymax * k), class: "vz-a-grid" }));
          svg.appendChild(s("text", { x: L - 4, y: Y(ymax * k) + 3, class: "vz-a-axis", "text-anchor": "end" }, nf(ymax * k)));
        });
        [1, 10, 20, 30].forEach(function (d) { svg.appendChild(s("text", { x: X(d), y: H - 6, class: "vz-a-axis", "text-anchor": d === 30 ? "end" : "middle" }, "j" + d)); });
        svg.appendChild(s("path", { d: area, class: "vz-credits-area" + (tient ? "" : " is-ko") }));
        var line = s("path", { d: dPath, class: "vz-credits-line" + (tient ? "" : " is-ko") });
        svg.appendChild(line);
        if (epuise) {
          svg.appendChild(s("line", { x1: X(epuise), x2: X(epuise), y1: T, y2: Y(0), class: "vz-credits-zero" }));
          svg.appendChild(s("text", { x: Math.min(X(epuise) + 4, W - 70), y: T + 10, class: "vz-credits-zt" }, "solde à zéro"));
        }
        clear(chart).appendChild(svg);
        if (!ctx.print && motionOK() && r.classList.contains("is-in")) {
          var len = 600; line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
          requestAnimationFrame(function () { line.style.transition = "stroke-dashoffset .6s ease"; line.style.strokeDashoffset = 0; });
        }

        var partRep = seance ? (st.rep * st.cBuild) / seance : 0;
        conseil.textContent = (bride ? "Le plafond de 5 crédits par jour coupe chaque séance avant la fin. " : "") +
          nf(partRep * 100, 0) + " % du budget sert à réparer plutôt qu'à construire. " +
          (partRep > 0.2 ? "Un plan relu à 1 crédit évite souvent trois messages Build de réparation." : "Chat pour comprendre, Plan pour décider, Build pour exécuter.");
      }

      r.appendChild(h("div", { class: "vz-credits-grid" },
        h("div", { class: "vz-credits-in" }, ui.kicker("Votre forfait"), segF.el, qField, ui.kicker("Une séance type"), reglages,
          ui.kicker("Crédits par message"), couts,
          ui.note("Repères officiels : 0,50 crédit pour « rends le bouton gris », 1,20 pour l'inscription et la connexion, 1,70 à 2 pour une page d'accueil avec images. " + DATE_TARIFS)),
        h("div", { class: "vz-credits-out" },
          h("div", { class: "vz-credits-kpis" }, kSeance, kMois, kFin),
          ui.kicker("Où partent les crédits d'une séance"), pile, pileLeg,
          ui.kicker("Solde sur trente jours"), chart, conseil)));
      maj();
      onVisible(r, ctx, function () { r.classList.add("is-in"); maj(); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch07 : Les vingt réflexes                                           */
  /* ------------------------------------------------------------------ */

  var FAMILLES7 = ["Organiser", "Demander", "Vérifier", "Protéger", "Durer"];
  var REFLEXES = [
    [0, "Un projet, un espace", "Chaque application a son projet Claude, son projet Lovable, son dépôt GitHub : la mémoire et les droits restent dans leur périmètre.", "9, 14, 21"],
    [0, "Un carnet de bord, ouvert à chaque séance", "L'IA ne se souvient pas de la séance d'hier ; votre carnet, si. Il nourrit aussi les résumés de passation.", "18, 28"],
    [0, "Un règlement commun, à la racine", "Un AGENTS.md par dépôt, lu par Lovable, importé par CLAUDE.md : une règle change à un seul endroit.", "11, 15, 19, 27"],
    [0, "Une décision, une ligne", "Chaque choix arrêté va dans decisions.md : la date, le choix, la raison. Sinon, on le rediscute par oubli.", "10, 14, 22"],
    [0, "Un mot, un objet", "Un « chapitre » n'est pas un « fichier ». L'agent qui n'a pas de mot pour une chose la décrit avec dix, et se trompe.", "8, 10, 14"],
    [1, "Chat avant Build", "Faire expliquer avant de faire construire : les malentendus apparaissent avant de devenir du code.", "11, 18"],
    [1, "Un plan relu avant toute fonction importante", "Comptes, données, paiements : mode Plan, relecture, correction, puis Approve.", "11, 14, 15, 23"],
    [1, "Un changement par message", "Une demande, un effet, une vérification. Six souhaits mêlés donnent un changement cassé, et personne ne sait lequel.", "11, 13, 18"],
    [1, "Demander des questions avant des réponses", "« Pose-moi toutes les questions nécessaires avant de commencer » : chaque réponse est une hypothèse de moins à inventer.", "9, 10, 21"],
    [1, "Des preuves, pas des annonces", "« C'est corrigé » n'est pas une information : quel test, quel résultat, quels clics refaire ?", "18, 20"],
    [2, "Tester après chaque pas, au format téléphone", "Le parcours concerné et un parcours voisin, en aperçu téléphone au moins une fois sur deux.", "11, 18, 24"],
    [2, "Deux échecs, on change de méthode", "La troisième tentative identique coûte autant et réussit rarement : Chat, retour arrière, demande découpée, conversation neuve.", "18"],
    [2, "Un signet sur ce qui marche", "Un signet dans Lovable, un commit clair dans GitHub : le jour où tout casse, vous savez où revenir.", "11, 19, 24"],
    [2, "Une seconde lecture par un autre", "Claude relit ce que Lovable a écrit : un agent qui n'a pas écrit un code le juge avec moins de complaisance.", "16, 20, 22"],
    [3, "Aucun secret dans le code, ni dans le chat", "Clés et mots de passe vont dans le gestionnaire de secrets ; un secret poussé une fois reste dans l'historique.", "13, 15, 16, 20"],
    [3, "Le moindre accès, et une revue régulière", "Chaque application, clé ou personne reçoit l'accès nécessaire, pas davantage ; revue tous les trois mois.", "14, 17, 20, 23"],
    [3, "La double authentification partout", "GitHub, Lovable, Claude, registrar, Stripe : le geste le moins coûteux, et l'un de ceux qui protègent le plus.", "12, 13, 20"],
    [3, "Les données se sauvegardent à part", "Ni GitHub ni un retour arrière ne protègent la base. Exportez, et restaurez au moins une fois.", "15, 19, 24"],
    [4, "Jamais à deux endroits en même temps", "Pas de modification simultanée dans Lovable et en local : les historiques divergent, l'un recouvre l'autre.", "19"],
    [4, "Un budget et un seuil, fixés avant de commencer", "Un plafond mensuel, un seuil de credit check-in bas, un coût moyen mesuré sur trois séances.", "16, 21, 23, 25"]
  ];
  var NIVEAUX = ["Pas encore", "Parfois", "Acquis"];

  function radar(labels) {
    var cx = 140, cy = 104, R = 72, n = labels.length;
    function pt(i, k) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + R * k * Math.cos(a), cy + R * k * Math.sin(a)]; }
    var svg = s("svg", { viewBox: "0 0 280 204", class: "vz-reflexes-radar", role: "img" });
    [1 / 3, 2 / 3, 1].forEach(function (k) {
      svg.appendChild(s("polygon", { points: labels.map(function (_, i) { return pt(i, k).map(function (x) { return x.toFixed(1); }).join(","); }).join(" "), class: "vz-a-grid-poly" }));
    });
    labels.forEach(function (l, i) {
      var p = pt(i, 1), q = pt(i, 1.2);
      svg.appendChild(s("line", { x1: cx, y1: cy, x2: p[0].toFixed(1), y2: p[1].toFixed(1), class: "vz-a-grid" }));
      svg.appendChild(s("text", { x: q[0].toFixed(1), y: (q[1] + 4).toFixed(1), class: "vz-reflexes-rl", "text-anchor": Math.abs(q[0] - cx) < 4 ? "middle" : (q[0] > cx ? "start" : "end") }, l));
    });
    var poly = s("polygon", { class: "vz-reflexes-poly", points: "" });
    svg.appendChild(poly);
    var dots = labels.map(function () { var c = s("circle", { r: 3, class: "vz-reflexes-dot" }); svg.appendChild(c); return c; });
    var cur = labels.map(function () { return 0; }), stop = null;
    function draw(v) {
      poly.setAttribute("points", v.map(function (k, i) { return pt(i, Math.max(0.03, k)).map(function (x) { return x.toFixed(1); }).join(","); }).join(" "));
      v.forEach(function (k, i) { var p = pt(i, Math.max(0.03, k)); dots[i].setAttribute("cx", p[0].toFixed(1)); dots[i].setAttribute("cy", p[1].toFixed(1)); });
    }
    function set(v) {
      if (stop) stop();
      var from = cur.slice();
      stop = tween(450, function (k) { cur = from.map(function (f, i) { return lerp(f, v[i], k); }); draw(cur); });
      svg.setAttribute("aria-label", "Auto-évaluation : " + labels.map(function (l, i) { return l + " " + Math.round(v[i] * 100) + " %"; }).join(", "));
    }
    draw(cur);
    return { svg: svg, set: set };
  }

  VIZ["ch07-reflexes"] = {
    chapitre: "ch07",
    titre: "Les vingt réflexes",
    consigne: "Retournez chaque carte, puis dites honnêtement où vous en êtes : le radar dessine votre profil.",
    ancre: "Ce que ces réflexes ne font pas",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "reflexes");
      var vide = function () { return REFLEXES.map(function () { return -1; }); };
      var niv = store("reflexes");
      if (!Array.isArray(niv) || niv.length !== 20 || ctx.print) niv = vide();
      var R = radar(FAMILLES7);
      var resume = h("p", { class: "vz-reflexes-res", "aria-live": "polite" });

      function scores() {
        return FAMILLES7.map(function (_, f) {
          var idxs = REFLEXES.map(function (x, i) { return x[0] === f ? i : -1; }).filter(function (i) { return i >= 0; });
          return idxs.reduce(function (a, i) { return a + Math.max(0, niv[i]); }, 0) / (idxs.length * 2);
        });
      }
      function majRadar() {
        var sc = scores();
        R.set(sc);
        var tot = niv.filter(function (v) { return v === 2; }).length, eval_ = niv.filter(function (v) { return v >= 0; }).length;
        var faible = sc.indexOf(Math.min.apply(null, sc));
        resume.textContent = !eval_ ? "Évaluez chaque réflexe sous sa carte : Pas encore, Parfois ou Acquis." : tot + " réflexe" + (tot > 1 ? "s" : "") + " acquis sur 20, " + eval_ + " évalué" + (eval_ > 1 ? "s" : "") + ". " + (tot === 20 ? "Gardez la check-list à portée de main." : "Famille à travailler d'abord : " + FAMILLES7[faible] + ".");
        store("reflexes", niv);
      }

      if (ctx.print) {
        var cols = h("div", { class: "vz-reflexes-print" });
        FAMILLES7.forEach(function (f, fi) {
          var ol = h("ol", { start: REFLEXES.findIndex(function (x) { return x[0] === fi; }) + 1 });
          REFLEXES.forEach(function (x) { if (x[0] === fi) ol.appendChild(h("li", null, x[1])); });
          cols.appendChild(h("div", { class: "vz-reflexes-pf" }, h("strong", null, f), ol));
        });
        r.appendChild(h("div", { class: "vz-reflexes-top" }, R.svg, h("div", null, ui.kicker("Votre profil"), h("p", null, "Cochez chaque réflexe acquis, puis reportez la moyenne de chaque famille sur le radar."))));
        r.appendChild(cols);
        R.set(scores());
        return;
      }

      var fam = 0;
      var tabs = ui.seg("Famille de réflexes", FAMILLES7.map(function (f, i) { return { v: i, label: f }; }), fam, function (v) { fam = v; cartes(); });
      var grid = h("div", { class: "vz-reflexes-grid" });

      function cartes() {
        clear(grid);
        REFLEXES.forEach(function (x, i) {
          if (x[0] !== fam) return;
          var flip = h("button", { type: "button", class: "vz-reflexes-carte", "aria-pressed": "false", "aria-label": "Réflexe " + (i + 1) + " : " + x[1] + ". Retourner la carte." },
            h("span", { class: "vz-reflexes-face vz-reflexes-recto" },
              h("span", { class: "vz-reflexes-num" }, String(i + 1).padStart(2, "0")),
              h("span", { class: "vz-reflexes-titre" }, x[1]),
              h("span", { class: "vz-reflexes-hint", "aria-hidden": "true" }, "Retourner ↻")),
            h("span", { class: "vz-reflexes-face vz-reflexes-verso" },
              h("span", { class: "vz-reflexes-pq" }, x[2]),
              h("span", { class: "vz-reflexes-ch" }, "Chapitres " + x[3])));
          flip.addEventListener("click", function () {
            var on = flip.getAttribute("aria-pressed") !== "true";
            flip.setAttribute("aria-pressed", String(on));
          });
          var auto = h("div", { class: "vz-reflexes-auto", role: "group", "aria-label": "Où en êtes-vous pour le réflexe " + (i + 1) });
          NIVEAUX.forEach(function (n, k) {
            auto.appendChild(h("button", { type: "button", class: "vz-reflexes-niv vz-reflexes-niv--" + k, "aria-pressed": String(niv[i] === k),
              onclick: function () {
                niv[i] = k;
                [].forEach.call(auto.children, function (b, j) { b.setAttribute("aria-pressed", String(j === k)); });
                majRadar();
              } }, n));
          });
          grid.appendChild(h("div", { class: "vz-reflexes-cell" }, flip, auto));
        });
      }
      r.appendChild(h("div", { class: "vz-reflexes-top" }, R.svg, h("div", null, ui.kicker("Votre profil"), resume,
        ui.btn("Effacer mon évaluation", function () { niv = vide(); cartes(); majRadar(); }, "vz-a-btn--ghost"))));
      r.appendChild(tabs.el);
      r.appendChild(grid);
      cartes();
      onVisible(r, ctx, majRadar);
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch08 : Lexique interactif                                           */
  /* ------------------------------------------------------------------ */

  var FAM_ORDRE = ["Concept", "Outil", "Brique", "Méthode", "Sécurité", "Métier"];
  function famNorm(f) {
    var x = String(f || "").trim().toLowerCase();
    var hit = FAM_ORDRE.filter(function (F) { return F.toLowerCase() === x || F.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === x.normalize("NFD").replace(/[̀-ͯ]/g, ""); })[0];
    return hit || (x ? x.charAt(0).toUpperCase() + x.slice(1) : "Autre");
  }
  function sansAccent(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  var SIGLES = { llm: "LLM", api: "API", "agents.md": "AGENTS.md", "claude.md": "CLAUDE.md", github: "GitHub", moscow: "MoSCoW", mrr: "MRR", cgv: "CGV", url: "URL",
    ia: "IA", claude: "Claude", lovable: "Lovable", supabase: "Supabase", stripe: "Stripe", resend: "Resend", lean: "Lean", canvas: "Canvas", rls: "RLS", dns: "DNS",
    mcp: "MCP", saas: "SaaS", rgpd: "RGPD", seo: "SEO", sql: "SQL", html: "HTML", css: "CSS", cta: "CTA", adr: "ADR", ssr: "SSR", rest: "REST", oauth: "OAuth" };
  function titreFiche(t) {
    var x = String(t || "").trim();
    if (x !== x.toUpperCase()) return x;
    x = x.toLowerCase().replace(/[\p{L}\p{N}.]+/gu, function (w) {
      var k = w.replace(/\.$/, "");
      return SIGLES[k] ? SIGLES[k] + w.slice(k.length) : w;
    });
    return x.charAt(0).toUpperCase() + x.slice(1);
  }
  function melange(a, seed) {
    var b = a.slice(), x = seed || Math.random() * 1e9;
    for (var i = b.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; var j = Math.floor(x / 233280 * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }

  VIZ["ch08-lexique"] = {
    chapitre: "ch08",
    titre: "Le lexique interactif",
    consigne: "Cherchez un mot, filtrez par famille, puis passez en mode entraînement pour tester votre vocabulaire.",
    ancre: "Famille Concept",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "lexique");
      var fiches = ((ctx.index && ctx.index.fiches) || []).map(function (f) {
        return { titre: titreFiche(f.titre), famille: famNorm(f.famille), definition: f.definition || "", analogie: f.analogie || "", confusion: f.confusion || "", chapitre: f.chapitre || "" };
      }).filter(function (f) { return f.titre; });
      fiches.sort(function (a, b) { return a.titre.localeCompare(b.titre, "fr"); });
      var familles = FAM_ORDRE.filter(function (F) { return fiches.some(function (f) { return f.famille === F; }); })
        .concat(fiches.map(function (f) { return f.famille; }).filter(function (F, i, a) { return FAM_ORDRE.indexOf(F) < 0 && a.indexOf(F) === i; }));
      function famCls(F) { var i = FAM_ORDRE.indexOf(F); return "vz-lexique-f" + (i < 0 ? 6 : i); }
      function icone(t) {
        try { if (window.Pixel && Pixel.icone && Pixel.piece) { var sp = h("span", { class: "vz-lexique-ico", "aria-hidden": "true" }); sp.innerHTML = Pixel.icone(Pixel.piece(t), { taille: 18 }); return sp; } } catch (e) { /* sans icône */ }
        return null;
      }

      if (!fiches.length) { r.appendChild(h("p", { class: "vz-a-small" }, "Le lexique n'est pas disponible sur cette page.")); return; }

      if (ctx.print) {
        var bars = h("div", { class: "vz-lexique-pbars" });
        var max = Math.max.apply(null, familles.map(function (F) { return fiches.filter(function (f) { return f.famille === F; }).length; }));
        familles.forEach(function (F) {
          var lst = fiches.filter(function (f) { return f.famille === F; });
          bars.appendChild(h("div", { class: "vz-lexique-pb " + famCls(F) },
            h("div", { class: "vz-lexique-pbh" }, h("strong", null, F), h("span", null, lst.length + " mot" + (lst.length > 1 ? "s" : "")),
              h("span", { class: "vz-lexique-pbar" }, h("span", { style: { width: (100 * lst.length / max) + "%" } }))),
            h("p", null, lst.map(function (f) { return f.titre; }).join(" · "))));
        });
        r.appendChild(h("p", { class: "vz-a-small" }, fiches.length + " fiches du livre, rangées en " + familles.length + " familles."));
        r.appendChild(bars);
        return;
      }

      var mode = "liste", filtre = null, q = "", score = { ok: 0, tot: 0, serie: 0 };
      var segMode = ui.seg("Mode", [{ v: "liste", label: "Parcourir" }, { v: "quiz", label: "S'entraîner" }], mode, function (v) { mode = v; maj(); });
      var search = h("input", { type: "search", class: "vz-a-input vz-lexique-q", placeholder: "Chercher un mot ou une idée…", "aria-label": "Chercher dans le lexique",
        oninput: function () { q = search.value; maj(); } });
      var chips = h("div", { class: "vz-lexique-chips", role: "group", "aria-label": "Filtrer par famille" });
      var chipEls = [null].concat(familles).map(function (F) {
        var n = F ? fiches.filter(function (f) { return f.famille === F; }).length : fiches.length;
        var b = h("button", { type: "button", class: "vz-lexique-chip " + (F ? famCls(F) : ""), "aria-pressed": String(F === filtre), onclick: function () { filtre = F; maj(); } },
          F || "Toutes", h("span", { class: "vz-lexique-cnt" }, String(n)));
        chips.appendChild(b);
        return { F: F, b: b };
      });
      var zone = h("div", { class: "vz-lexique-zone", "aria-live": "polite" });
      var quizQ = null;

      function pool() {
        return fiches.filter(function (f) { return !filtre || f.famille === filtre; });
      }
      function liste() {
        var nq = sansAccent(q).trim();
        var lst = pool().filter(function (f) { return !nq || sansAccent(f.titre + " " + f.definition + " " + f.analogie).indexOf(nq) >= 0; });
        var count = h("p", { class: "vz-a-small" }, lst.length + " mot" + (lst.length > 1 ? "s" : ""));
        zone.appendChild(count);
        var ul = h("div", { class: "vz-lexique-list" });
        lst.forEach(function (f) {
          var more = h("div", { class: "vz-lexique-more", hidden: true },
            f.analogie ? h("p", null, h("strong", null, "Analogie. "), f.analogie) : null,
            f.confusion ? h("p", null, h("strong", null, "À ne pas confondre avec. "), f.confusion) : null,
            f.chapitre ? h("p", { class: "vz-a-small" }, "Chapitre " + String(f.chapitre).replace(/^ch0?/, "")) : null);
          var tog = h("button", { type: "button", class: "vz-lexique-tog", "aria-expanded": "false", onclick: function () {
            var o = more.hidden; more.hidden = !o; tog.setAttribute("aria-expanded", String(o)); tog.textContent = o ? "Moins" : "Analogie et confusion";
          } }, "Analogie et confusion");
          ul.appendChild(h("article", { class: "vz-lexique-fiche " + famCls(f.famille) },
            h("div", { class: "vz-lexique-fh" }, icone(f.titre), h("strong", null, f.titre), h("span", { class: "vz-lexique-tag" }, f.famille)),
            h("p", null, f.definition), (f.analogie || f.confusion) ? tog : null, more));
        });
        if (!lst.length) ul.appendChild(h("p", { class: "vz-a-small" }, "Aucun mot ne correspond. Essayez un synonyme, ou une autre famille."));
        zone.appendChild(ul);
      }
      function nouvelleQuestion() {
        var p = pool();
        if (p.length < 2) p = fiches;
        var bonne = p[Math.floor(Math.random() * p.length)];
        var autres = melange(fiches.filter(function (f) { return f !== bonne; })).sort(function (a, b) {
          return (b.famille === bonne.famille) - (a.famille === bonne.famille);
        }).slice(0, 3);
        quizQ = { bonne: bonne, choix: melange([bonne].concat(autres)), rep: null };
      }
      function quiz() {
        if (!quizQ) nouvelleQuestion();
        var Q = quizQ;
        zone.appendChild(h("div", { class: "vz-lexique-score" },
          h("span", null, "Score ", h("strong", null, score.ok + " / " + score.tot)),
          h("span", null, "Série ", h("strong", null, String(score.serie)))));
        var card = h("div", { class: "vz-lexique-q-card " + famCls(Q.bonne.famille) },
          h("span", { class: "vz-lexique-tag" }, Q.bonne.famille),
          h("p", { class: "vz-lexique-def" }, Q.bonne.definition),
          h("p", { class: "vz-a-small" }, "Quel mot correspond à cette définition ?"));
        var opts = h("div", { class: "vz-lexique-opts" });
        Q.choix.forEach(function (c) {
          var etat = Q.rep === null ? "" : c === Q.bonne ? " is-ok" : c === Q.rep ? " is-ko" : " is-off";
          opts.appendChild(h("button", { type: "button", class: "vz-lexique-opt" + etat, disabled: Q.rep !== null || null, onclick: function () {
            Q.rep = c; score.tot++;
            if (c === Q.bonne) { score.ok++; score.serie++; } else score.serie = 0;
            maj();
          } }, c.titre));
        });
        card.appendChild(opts);
        if (Q.rep !== null) {
          card.appendChild(h("div", { class: "vz-lexique-fb" },
            h("strong", null, Q.rep === Q.bonne ? "Exact." : "C'était « " + Q.bonne.titre + " »."),
            Q.bonne.analogie ? h("p", null, "Analogie : " + Q.bonne.analogie) : null,
            ui.btn("Question suivante →", function () { nouvelleQuestion(); maj(); var b = zone.querySelector(".vz-lexique-opt"); if (b) b.focus(); }, "vz-a-btn--accent")));
        }
        zone.appendChild(card);
      }
      function maj() {
        chipEls.forEach(function (c) { c.b.setAttribute("aria-pressed", String(c.F === filtre)); });
        search.hidden = mode !== "liste";
        clear(zone);
        if (mode === "liste") liste(); else { if (quizQ && filtre && quizQ.bonne.famille !== filtre && quizQ.rep === null) nouvelleQuestion(); quiz(); }
      }
      r.appendChild(h("div", { class: "vz-lexique-bar" }, segMode.el, search));
      r.appendChild(chips);
      r.appendChild(zone);
      maj();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch09 : Lean Canvas                                                  */
  /* ------------------------------------------------------------------ */

  var CASES = [
    { id: "probleme", nom: "Problème", ordre: 1, ex: "Le lecteur visé a obtenu un premier résultat avec une IA, puis s'est arrêté devant la base de données, la sécurité ou la mise en ligne. Les ressources gratuites sont éparses, souvent en anglais, sans ordre." },
    { id: "clients", nom: "Clients", ordre: 2, ex: "Indépendants, formateurs, dirigeants de petites structures, salariés curieux. Premiers adoptants : ceux qui ont déjà un compte Lovable ou Claude." },
    { id: "valeur", nom: "Proposition de valeur", ordre: 3, ex: "Une méthode en français, dans l'ordre, pour construire et mettre en ligne ses applications avec Claude et Lovable, sans faille ni facture surprise." },
    { id: "solution", nom: "Solution", ordre: 4, ex: "Accueil avec la promesse, sommaire, extrait, page auteur, inscription à la lettre, liens d'achat." },
    { id: "canaux", nom: "Canaux", ordre: 5, ex: "Recherche sur le web et dans les assistants d'IA, réseaux de l'auteur, lettre d'information, fiche Amazon." },
    { id: "revenus", nom: "Revenus", ordre: 6, ex: "Ventes sur Amazon, puis vente directe au chapitre 13. Prix public envisagé entre 29 et 39 € : à tester." },
    { id: "couts", nom: "Coûts", ordre: 7, ex: "Abonnement Lovable, nom de domaine, envoi d'e-mails, temps de rédaction de la lettre." },
    { id: "indicateurs", nom: "Indicateurs", ordre: 8, ex: "Inscriptions confirmées, clics vers Amazon, lectures de l'extrait. Pas les visites seules." },
    { id: "avantage", nom: "Avantage déloyal", ordre: 9, ex: "Le site est construit avec la méthode du livre, qui raconte chaque étape. Est-ce vraiment difficile à copier ? À discuter." }
  ];

  VIZ["ch09-canvas"] = {
    chapitre: "ch09",
    titre: "Votre Lean Canvas léger",
    consigne: "Remplissez les cases dans l'ordre des numéros, une ligne par case : le prompt se compose sous vos yeux.",
    ancre: "Parler à de vrais lecteurs",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "canvas");
      var val = {};
      CASES.forEach(function (c) { val[c.id] = ctx.print ? c.ex : ""; });
      var saved = !ctx.print && store("canvas");
      if (saved && typeof saved === "object") CASES.forEach(function (c) { if (typeof saved[c.id] === "string") val[c.id] = saved[c.id]; });
      var angle = "critique";
      var grid = h("div", { class: "vz-canvas-grid" });
      var tas = {};
      CASES.forEach(function (c) {
        var cell = h("div", { class: "vz-canvas-case vz-canvas-" + c.id });
        cell.appendChild(h("div", { class: "vz-canvas-h" }, h("span", { class: "vz-canvas-n" }, String(c.ordre)), c.nom));
        if (ctx.print) cell.appendChild(h("p", { class: "vz-canvas-p" }, c.ex));
        else {
          var ta = h("textarea", { class: "vz-canvas-ta", rows: 3, "aria-label": c.ordre + ". " + c.nom, placeholder: c.ex.split(".")[0] + "…",
            oninput: function () { val[c.id] = ta.value; cell.classList.toggle("is-rempli", !!ta.value.trim()); planifier(); } });
          ta.value = val[c.id];
          cell.classList.toggle("is-rempli", !!val[c.id].trim());
          tas[c.id] = ta;
          cell.appendChild(ta);
        }
        grid.appendChild(cell);
      });
      r.appendChild(grid);
      if (ctx.print) {
        r.appendChild(h("p", { class: "vz-a-small" }, "Le Lean Canvas du site du Guide : chaque case est une hypothèse. Remplissage dans l'ordre des numéros."));
        return;
      }
      var prog = h("div", { class: "vz-canvas-prog" });
      var segA = ui.seg("Usage du prompt", [{ v: "critique", label: "Faire critiquer" }, { v: "idees", label: "Trouver des idées" }], angle, function (v) { angle = v; composer(); });
      var slot = h("div", { class: "vz-canvas-prompt" });
      r.appendChild(h("div", { class: "vz-canvas-acts" }, prog,
        ui.btn("Remplir avec l'exemple du Guide", function () { CASES.forEach(function (c) { val[c.id] = c.ex; tas[c.id].value = c.ex; tas[c.id].parentNode.classList.add("is-rempli"); }); composer(); }),
        ui.btn("Vider", function () { CASES.forEach(function (c) { val[c.id] = ""; tas[c.id].value = ""; tas[c.id].parentNode.classList.remove("is-rempli"); }); composer(); }, "vz-a-btn--ghost")));
      r.appendChild(ui.kicker("Le prompt pour votre espace de brainstorming"));
      r.appendChild(segA.el);
      r.appendChild(slot);
      var tmr = null;
      function planifier() { clearTimeout(tmr); tmr = setTimeout(composer, 250); }
      function composer() {
        store("canvas", val);
        var n = CASES.filter(function (c) { return val[c.id].trim(); }).length;
        prog.textContent = n + " case" + (n > 1 ? "s" : "") + " sur 9";
        prog.style.setProperty("--k", (n / 9 * 100) + "%");
        var lignes = CASES.map(function (c) { return "- " + c.nom + " : " + (val[c.id].trim().replace(/\s+/g, " ") || "[à compléter]"); }).join("\n");
        var txt = angle === "critique"
          ? "Voici mon Lean Canvas pour le site de mon livre, case par case :\n" + lignes + "\n\nJoue un éditeur exigeant mais bienveillant. Pour chaque case, dis-moi quelle hypothèse est la plus risquée et comment la tester en moins d'une semaine sans rien construire. Signale les incohérences entre les cases. Ne réécris pas mon canvas : pose-moi des questions."
          : "Voici l'état de mon Lean Canvas pour le site de mon livre :\n" + lignes + "\n\nPour chaque case marquée [à compléter], propose trois hypothèses différentes, en une ligne chacune, cohérentes avec les cases déjà remplies. Ne me flatte pas : pour chaque proposition, indique ce qui pourrait la rendre fausse. Ne choisis pas à ma place.";
        clear(slot).appendChild(ui.prompt(txt));
      }
      composer();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch10 : Tri MoSCoW                                                   */
  /* ------------------------------------------------------------------ */

  var PANIERS = [
    { id: "M", nom: "Must", fr: "indispensable" },
    { id: "S", nom: "Should", fr: "souhaitable" },
    { id: "C", nom: "Could", fr: "facultatif" },
    { id: "W", nom: "Won't", fr: "pas cette fois" }
  ];
  var FONCTIONS = [
    ["Page d'accueil (promesse, bénéfices, couverture, appel à l'action)", "M"], ["Page sommaire", "M"], ["Page extrait, lecture en ligne", "M"],
    ["Page auteur", "M"], ["Inscription à la lettre, double confirmation", "M"], ["Désinscription en un clic", "M"], ["Liens d'achat Amazon", "M"],
    ["Formulaire de contact", "M"], ["Mentions légales, confidentialité, cookies", "M"], ["Affichage correct sur téléphone", "M"],
    ["Page « Pour qui est ce livre ? »", "S"], ["Extrait en PDF contre inscription", "S"], ["Aperçu soigné quand un lien est partagé", "S"],
    ["Foire aux questions", "C"], ["Lien vers un second libraire", "C"], ["Compteur « parution dans N jours »", "C"],
    ["Paiement sur le site", "W"], ["Comptes visiteurs, espace membre", "W"], ["Blog", "W"], ["Commentaires ou forum", "W"],
    ["Version anglaise", "W"], ["Page d'administration", "W"]
  ];

  VIZ["ch10-moscow"] = {
    chapitre: "ch10",
    titre: "Le tri MoSCoW",
    consigne: "Glissez chaque fonctionnalité dans un panier (ou utilisez les boutons M, S, C, W), puis comparez avec le tri du livre.",
    ancre: "Faire émerger le cahier des charges avec Claude",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "moscow");
      var ordre = melange(FONCTIONS.map(function (_, i) { return i; }), 7);
      var place = FONCTIONS.map(function (f) { return ctx.print ? f[1] : null; });
      var comparer = false;
      var zones = {}, lists = {};
      function mkZone(id, titre, sous) {
        var list = h("div", { class: "vz-moscow-list" });
        var z = h("div", { class: "vz-moscow-zone vz-moscow-z" + id, "data-panier": id },
          h("div", { class: "vz-moscow-zh" }, h("strong", null, titre), sous ? h("span", null, sous) : null, h("span", { class: "vz-moscow-cnt" })), list);
        zones[id] = z; lists[id] = list;
        return z;
      }
      var pool = mkZone("_", "À trier", null);
      var paniers = h("div", { class: "vz-moscow-paniers" }, PANIERS.map(function (p) { return mkZone(p.id, p.nom, p.fr); }));
      var alerte = h("p", { class: "vz-moscow-alerte", "aria-live": "polite" });
      var slot = h("div", { class: "vz-moscow-prompt" });

      function chip(i) {
        var f = FONCTIONS[i];
        var c = h("div", { class: "vz-moscow-chip", "data-i": i });
        if (comparer && place[i] && place[i] !== f[1]) { c.classList.add("is-diff"); }
        if (comparer && place[i] === f[1]) c.classList.add("is-same");
        var handle = h("span", { class: "vz-moscow-lab" }, ctx.print ? null : h("span", { class: "vz-moscow-grip", "aria-hidden": "true" }, "⋮⋮"), f[0]);
        c.appendChild(handle);
        if (comparer && place[i] && place[i] !== f[1]) c.appendChild(h("span", { class: "vz-moscow-livre" }, "Livre : " + PANIERS.filter(function (p) { return p.id === f[1]; })[0].nom));
        if (!ctx.print) {
          var bs = h("span", { class: "vz-moscow-bs", role: "group", "aria-label": "Ranger « " + f[0] + " »" });
          PANIERS.forEach(function (p) {
            bs.appendChild(h("button", { type: "button", class: "vz-moscow-b", "aria-pressed": String(place[i] === p.id), "aria-label": p.nom + " : " + f[0],
              onclick: function () { place[i] = place[i] === p.id ? null : p.id; maj(); } }, p.id));
          });
          c.appendChild(bs);
          drag(handle, i);
        }
        return c;
      }

      function drag(handle, i) {
        handle.addEventListener("pointerdown", function (e) {
          if (e.button !== 0) return;
          e.preventDefault();
          var src = handle.parentNode, rect = src.getBoundingClientRect();
          var ghost = src.cloneNode(true);
          ghost.classList.add("is-ghost");
          ghost.style.width = rect.width + "px";
          r.appendChild(ghost);
          var dx = e.clientX - rect.left, dy = e.clientY - rect.top, cible = null, last = e, actif = true;
          src.classList.add("is-drag");
          (function defile() {
            if (!actif) return;
            var bord = 70, v = 0;
            if (last.clientY < bord) v = -Math.ceil((bord - last.clientY) / 6);
            else if (last.clientY > window.innerHeight - bord) v = Math.ceil((last.clientY - window.innerHeight + bord) / 6);
            if (v) { window.scrollBy(0, v); survol(last); }
            requestAnimationFrame(defile);
          })();
          function pos(ev) { ghost.style.transform = "translate(" + (ev.clientX - dx) + "px," + (ev.clientY - dy) + "px)"; }
          pos(e);
          function move(ev) { last = ev; pos(ev); survol(ev); }
          function survol(ev) {
            ghost.style.visibility = "hidden";
            var under = document.elementFromPoint(ev.clientX, ev.clientY);
            ghost.style.visibility = "";
            var z = under && under.closest && under.closest(".vz-moscow-zone");
            if (z && !r.contains(z)) z = null;
            if (cible !== z) { if (cible) cible.classList.remove("is-over"); cible = z; if (cible) cible.classList.add("is-over"); }
          }
          function up() {
            actif = false;
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            document.removeEventListener("pointercancel", up);
            ghost.remove();
            src.classList.remove("is-drag");
            if (cible) { cible.classList.remove("is-over"); var id = cible.getAttribute("data-panier"); place[i] = id === "_" ? null : id; maj(); }
          }
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
          document.addEventListener("pointercancel", up);
        });
      }

      function maj() {
        Object.keys(lists).forEach(function (k) { clear(lists[k]); });
        ordre.forEach(function (i) { lists[place[i] || "_"].appendChild(chip(i)); });
        Object.keys(zones).forEach(function (k) {
          var n = lists[k].children.length;
          zones[k].querySelector(".vz-moscow-cnt").textContent = k === "M" ? n + " / 10 au plus" : String(n);
          zones[k].classList.toggle("is-trop", k === "M" && n > 10);
        });
        pool.hidden = ctx.print || lists._.children.length === 0;
        var nM = place.filter(function (p) { return p === "M"; }).length, reste = place.filter(function (p) { return !p; }).length;
        alerte.textContent = nM > 10 ? "Plus de dix Must : vous y avez sans doute rangé des Should."
          : reste ? reste + " fonctionnalité" + (reste > 1 ? "s" : "") + " à trier."
          : "Tout est trié. Un site qui ne contient que ses Must est une première version publiable.";
        if (!ctx.print) {
          var par = function (id) { return FONCTIONS.map(function (f, i) { return place[i] === id ? "- " + f[0] : null; }).filter(Boolean); };
          var M = par("M"), S = par("S"), C = par("C"), W = par("W");
          var txt = "Passe en mode Plan avant de construire. Je veux la première version du site vitrine de mon livre, qui ne contient que ses Must.\n\n" +
            "Must (cette version, rien d'autre) :\n" + (M.join("\n") || "- [à trier]") + "\n\n" +
            "Should (plus tard, ne pas construire maintenant) :\n" + (S.join("\n") || "- aucun") + "\n\n" +
            "Could (peut-être un jour) :\n" + (C.join("\n") || "- aucun") + "\n\n" +
            "Won't (hors périmètre de cette version, n'ajoute rien de tel) :\n" + (W.join("\n") || "- aucun") + "\n\n" +
            "Propose un plan étape par étape, du plus simple au plus compliqué, où chaque étape renvoie à une ligne Must. Avant de construire, pose-moi toutes les questions nécessaires.";
          clear(slot).appendChild(ui.prompt(txt));
        }
      }
      r.appendChild(pool);
      r.appendChild(paniers);
      r.appendChild(alerte);
      if (!ctx.print) {
        var bCmp = ui.btn("Comparer avec le tri du livre", function () { comparer = !comparer; bCmp.setAttribute("aria-pressed", String(comparer)); bCmp.textContent = comparer ? "Masquer la comparaison" : "Comparer avec le tri du livre"; maj(); });
        bCmp.setAttribute("aria-pressed", "false");
        r.appendChild(h("div", { class: "vz-moscow-acts" }, bCmp,
          ui.btn("Appliquer le tri du livre", function () { place = FONCTIONS.map(function (f) { return f[1]; }); maj(); }, "vz-a-btn--ghost"),
          ui.btn("Tout remettre à trier", function () { place = FONCTIONS.map(function () { return null; }); maj(); }, "vz-a-btn--ghost")));
        r.appendChild(ui.kicker("Votre premier prompt de production"));
        r.appendChild(slot);
      } else {
        r.appendChild(h("p", { class: "vz-a-small" }, "Le tri du livre pour le site du Guide : dix Must, dont trois obligations légales."));
      }
      maj();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch11 : La boucle d'itération                                        */
  /* ------------------------------------------------------------------ */

  var ETAPES11 = ["Plan", "Brique", "Vérifier", "Corriger"];
  var ITERATIONS = [
    { nom: "Le défaut visible", vis: "Se voit à l'écran", lvl: 1, steps: [
      "Mode Plan : le plan revient avec des questions. Avant Approve, je vérifie que les pages correspondent au cahier des charges et que rien n'est inventé.",
      "Lovable construit le site à partir du plan approuvé.",
      "Aperçu au format téléphone : sur la page Sommaire, les titres longs débordent et la page défile horizontalement.",
      "Outil Select sur la liste : « Fais revenir les titres à la ligne. Ne change rien d'autre. » Puis vue téléphone, et vue ordinateur."] },
    { nom: "Le défaut invisible", vis: "Affiche un succès", lvl: 2, steps: [
      "Lovable Cloud activé en région Europe. En mode Plan : une table abonnés, des règles d'accès, pas de doublon, un message identique pour une adresse déjà inscrite.",
      "Lovable construit. Je saisis une adresse de test : « Merci, vérifiez votre boîte de réception. »",
      "Vue Cloud, onglet Database : la table est vide. Le défaut le plus dangereux est celui qui affiche un succès.",
      "Mode Chat, sans rien modifier : la cause. Une règle qui bloque, un code qui ment. Je fais corriger les deux, je reteste en navigation privée, puis je lance le scan de sécurité."] },
    { nom: "Le contenu qui ne vient pas de nous", vis: "Ne se voit pas techniquement", lvl: 3, steps: [
      "Je relis le site comme un lecteur, page par page, en cherchant ce que je n'ai pas fourni.",
      "Le site fonctionne : tout s'affiche parfaitement.",
      "Sur l'accueil, un bloc « Ils l'ont lu » avec trois citations élogieuses, inventées malgré la Knowledge et le prompt.",
      "Supprimer le bloc, puis lister sans rien modifier chaque texte non fourni et décider ligne par ligne. Les décisions vont dans la Knowledge, le journal et le carnet."] }
  ];

  VIZ["ch11-boucle"] = {
    chapitre: "ch11",
    titre: "La boucle d'itération",
    consigne: "Choisissez une itération, puis avancez d'étape en étape autour de la boucle.",
    ancre: "Le design : donner une allure sans tout repeindre",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "boucle");
      var it = 0, step = 0, ang = -90;
      var cx = 120, cy = 120, R = 82;
      function P(a) { var t = a * Math.PI / 180; return [cx + R * Math.cos(t), cy + R * Math.sin(t)]; }

      if (ctx.print) {
        var tbl = h("table", { class: "vz-boucle-tab" });
        var hr = h("tr", null, h("th", null, ""));
        ITERATIONS.forEach(function (I, i) { hr.appendChild(h("th", null, "Itération " + (i + 1), h("br"), h("small", null, I.nom))); });
        tbl.appendChild(h("thead", null, hr));
        var tb = h("tbody");
        ETAPES11.forEach(function (E, k) {
          var tr = h("tr", null, h("th", null, E));
          ITERATIONS.forEach(function (I) { tr.appendChild(h("td", null, I.steps[k])); });
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        r.appendChild(tbl);
        return;
      }

      var svg = s("svg", { viewBox: "0 0 240 240", class: "vz-boucle-svg", role: "group", "aria-label": "Boucle Plan, Brique, Vérifier, Corriger" });
      var ring = s("circle", { cx: cx, cy: cy, r: R, class: "vz-boucle-ring" });
      svg.appendChild(ring);
      [0, 1, 2, 3].forEach(function (k) {
        var a0 = -90 + k * 90 + 14, a1 = -90 + (k + 1) * 90 - 16, p0 = P(a0), p1 = P(a1);
        svg.appendChild(s("path", { d: "M" + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + " A" + R + " " + R + " 0 0 1 " + p1[0].toFixed(1) + " " + p1[1].toFixed(1), class: "vz-boucle-arc", "marker-end": "" }));
        var t = (a1) * Math.PI / 180, ax = p1[0], ay = p1[1];
        var dx = -Math.sin(t), dy = Math.cos(t);
        svg.appendChild(s("path", { d: "M" + (ax - 6 * dx - 4 * dy).toFixed(1) + " " + (ay - 6 * dy + 4 * dx).toFixed(1) + " L" + ax.toFixed(1) + " " + ay.toFixed(1) + " L" + (ax - 6 * dx + 4 * dy).toFixed(1) + " " + (ay - 6 * dy - 4 * dx).toFixed(1), class: "vz-boucle-fl" }));
      });
      var dot = s("circle", { r: 7, class: "vz-boucle-dot" });
      svg.appendChild(dot);
      var nodes = ETAPES11.map(function (E, k) {
        var p = P(-90 + k * 90);
        var g = s("g", { class: "vz-boucle-node", role: "button", tabindex: "0", "aria-label": "Étape " + (k + 1) + " : " + E },
          s("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 22, class: "vz-boucle-nc" }),
          s("text", { x: p[0].toFixed(1), y: (p[1] + 4).toFixed(1), class: "vz-boucle-nt", "text-anchor": "middle" }, E));
        g.addEventListener("click", function () { go(k); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(k); } });
        svg.appendChild(g);
        return g;
      });
      var centre = s("text", { x: cx, y: cy - 4, class: "vz-boucle-ct", "text-anchor": "middle" });
      var centre2 = s("text", { x: cx, y: cy + 12, class: "vz-boucle-ct2", "text-anchor": "middle" });
      svg.appendChild(centre); svg.appendChild(centre2);

      var panel = h("div", { class: "vz-boucle-panel", "aria-live": "polite" });
      var segI = ui.seg("Itération", ITERATIONS.map(function (I, i) { return { v: i, label: "Itération " + (i + 1), sub: I.nom }; }), it, function (v) { it = v; go(0, true); });
      var next = ui.btn("Étape suivante →", function () { go((step + 1) % 4); }, "vz-a-btn--accent");
      var vis = h("div", { class: "vz-boucle-vis" });

      function placeDot(a) { var p = P(a); dot.setAttribute("cx", p[0].toFixed(1)); dot.setAttribute("cy", p[1].toFixed(1)); }
      var stopT = null;
      function go(k, reset) {
        var target = -90 + k * 90;
        var from = ang;
        var to = reset ? target : (target <= from - 0.01 ? target + 360 : target);
        if (reset) from = to;
        step = k;
        if (stopT) stopT();
        stopT = tween(500, function (e) { ang = lerp(from, to, e); placeDot(ang); }, function () { ang = target; });
        nodes.forEach(function (n, j) { n.classList.toggle("is-on", j === k); n.setAttribute("aria-pressed", String(j === k)); });
        var I = ITERATIONS[it];
        centre.textContent = "Itération " + (it + 1);
        centre2.textContent = (k + 1) + " / 4";
        clear(panel);
        panel.appendChild(h("div", { class: "vz-boucle-ph" }, h("span", { class: "vz-boucle-pn" }, String(k + 1)), ETAPES11[k]));
        panel.appendChild(h("p", null, I.steps[k]));
        panel.classList.remove("is-flash"); void panel.offsetWidth; panel.classList.add("is-flash");
        clear(vis);
        vis.appendChild(h("span", { class: "vz-a-small" }, "Gravité du défaut"));
        var dots = h("span", { class: "vz-boucle-lvl" });
        for (var i = 1; i <= 3; i++) dots.appendChild(h("span", { class: i <= I.lvl ? "is-on" : "" }));
        vis.appendChild(dots);
        vis.appendChild(h("strong", null, I.vis));
      }
      r.appendChild(segI.el);
      r.appendChild(h("div", { class: "vz-boucle-grid" }, h("div", { class: "vz-boucle-fig" }, svg), h("div", null, panel, vis, next)));
      go(0, true);
      onVisible(r, ctx, function () { r.classList.add("is-in"); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch12 : Le voyage d'une requête                                      */
  /* ------------------------------------------------------------------ */

  var DNS = [
    { type: "A", dit: "Ce nom pointe vers cette adresse numérique.", ana: "L'adresse postale", guide: "Le site, vers Lovable : 185.158.133.1.",
      ligne: "@      A      185.158.133.1", noeuds: ["Navigateur", "Annuaire DNS", "Serveur Lovable"],
      voyage: ["Vous tapez guide-vibecoding.fr (nom d'exemple).", "L'annuaire répond : enregistrement A, adresse 185.158.133.1.", "Le navigateur frappe à cette adresse : Lovable renvoie la page, avec le cadenas HTTPS."] },
    { type: "CNAME", dit: "Ce nom est un alias de tel autre nom.", ana: "Le renvoi de courrier", guide: "Selon les services.",
      ligne: "www    CNAME  autre-nom.exemple.", noeuds: ["Navigateur", "Annuaire DNS", "Nom de destination"],
      voyage: ["Vous demandez un nom, par exemple www.", "L'annuaire répond : ce nom est un alias, demandez plutôt tel autre nom.", "La recherche reprend avec le nom de destination, jusqu'à une adresse numérique."] },
    { type: "TXT", dit: "Une note libre, lisible par tous.", ana: "L'étiquette sur la boîte aux lettres", guide: "Vérifications (Lovable), réglages d'e-mail (chapitre 13).",
      ligne: "@      TXT    \"valeur fournie par Lovable\"", noeuds: ["Lovable", "Annuaire DNS", "Votre zone"],
      voyage: ["Lovable veut vérifier que le domaine est bien à vous.", "Il lit dans l'annuaire la note TXT que vous avez ajoutée chez le registrar.", "La valeur correspond : le domaine est relié au projet."] },
    { type: "MX", dit: "Où livrer les e-mails reçus.", ana: "Le bureau de poste de quartier", guide: "Ne pas y toucher si une messagerie existe déjà.",
      ligne: "@      MX     10 serveur-de-votre-messagerie.", noeuds: ["Expéditeur", "Annuaire DNS", "Votre messagerie"],
      voyage: ["Quelqu'un écrit à contact@votre-domaine.", "Son serveur demande à l'annuaire : où livrer le courrier de ce domaine ? Réponse : l'enregistrement MX.", "Le message arrive dans votre messagerie. Remplacer ce MX trop vite, c'est couper le courrier."] }
  ];

  VIZ["ch12-dns"] = {
    chapitre: "ch12",
    titre: "Le voyage d'une requête",
    consigne: "Choisissez un enregistrement, puis lancez le voyage pour voir qui demande quoi à qui.",
    ancre: "Être trouvé : le référencement et le rendu serveur",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "dns");

      if (ctx.print) {
        var g = h("div", { class: "vz-dns-pgrid" });
        DNS.forEach(function (d) {
          g.appendChild(h("div", { class: "vz-dns-card is-on" },
            h("div", { class: "vz-dns-type" }, d.type), h("p", null, h("strong", null, d.dit)),
            h("p", { class: "vz-a-small" }, "Analogie : " + d.ana + ". Pour le Guide : " + d.guide),
            h("code", { class: "vz-dns-ligne" }, d.ligne),
            h("ol", { class: "vz-dns-pol" }, d.voyage.map(function (v) { return h("li", null, v); }))));
        });
        r.appendChild(g);
        r.appendChild(h("p", { class: "vz-a-small" }, "Une modification DNS se propage en quelques minutes à 48 heures, jusqu'à 72 heures selon Lovable. Republier n'y change rien."));
        return;
      }

      var cur = 0, etape = -1, timer = null;
      var scene = h("div", { class: "vz-dns-scene" });
      var nEls = [0, 1, 2].map(function (i) {
        var n = h("div", { class: "vz-dns-n vz-dns-n" + i }, h("span", { class: "vz-dns-ico", "aria-hidden": "true" }), h("span", { class: "vz-dns-nl" }));
        return n;
      });
      var l1 = h("div", { class: "vz-dns-lien" }, h("span", { class: "vz-dns-pk" }));
      var l2 = h("div", { class: "vz-dns-lien" }, h("span", { class: "vz-dns-pk" }));
      scene.appendChild(nEls[0]); scene.appendChild(l1); scene.appendChild(nEls[1]); scene.appendChild(l2); scene.appendChild(nEls[2]);
      var steps = h("ol", { class: "vz-dns-steps", "aria-live": "polite" });
      var go = ui.btn("▶ Lancer la requête", lancer, "vz-a-btn--accent");
      var cards = h("div", { class: "vz-dns-cards", role: "group", "aria-label": "Les quatre enregistrements" });
      var cEls = DNS.map(function (d, i) {
        var b = h("button", { type: "button", class: "vz-dns-card", "aria-pressed": String(i === cur), onclick: function () { choisir(i); } },
          h("span", { class: "vz-dns-type" }, d.type), h("span", { class: "vz-dns-ana" }, d.ana));
        cards.appendChild(b);
        return b;
      });
      var detail = h("div", { class: "vz-dns-detail" });

      function choisir(i) {
        cur = i; etape = -1;
        if (timer) { clearTimeout(timer); timer = null; }
        cEls.forEach(function (b, j) { b.setAttribute("aria-pressed", String(i === j)); });
        var d = DNS[i];
        nEls.forEach(function (n, j) { n.querySelector(".vz-dns-nl").textContent = d.noeuds[j]; n.classList.remove("is-on"); });
        r.setAttribute("data-type", d.type);
        clear(detail);
        detail.appendChild(h("p", null, h("strong", null, d.type + " · "), d.dit, " ", h("span", { class: "vz-a-small" }, "Pour le Guide : " + d.guide)));
        detail.appendChild(h("code", { class: "vz-dns-ligne" }, d.ligne));
        if (d.type === "MX") detail.appendChild(h("p", { class: "vz-dns-warn" }, "On ajoute ce que Lovable demande, on ne supprime rien."));
        afficher();
      }
      function afficher() {
        var d = DNS[cur];
        clear(steps);
        d.voyage.forEach(function (v, j) { steps.appendChild(h("li", { class: j <= etape ? "is-on" : "" }, v)); });
        nEls.forEach(function (n, j) { n.classList.toggle("is-on", j <= etape); });
        [l1, l2].forEach(function (l, j) {
          l.classList.remove("is-go");
          if (etape >= j + 1) { void l.offsetWidth; l.classList.add("is-go"); }
          l.classList.toggle("is-done", etape >= j + 1);
        });
        scene.classList.toggle("is-fin", etape >= 2);
      }
      function lancer() {
        if (timer) clearTimeout(timer);
        etape = 0; afficher();
        var pas = motionOK() ? 1100 : 0;
        timer = setTimeout(function () { etape = 1; afficher(); timer = setTimeout(function () { etape = 2; afficher(); timer = null; }, pas); }, pas);
      }
      r.appendChild(cards);
      r.appendChild(scene);
      r.appendChild(h("div", { class: "vz-dns-row" }, go, h("span", { class: "vz-a-small" }, "Propagation : de quelques minutes à 48 heures, jusqu'à 72 selon Lovable.")));
      r.appendChild(steps);
      r.appendChild(detail);
      choisir(0);
      onVisible(r, ctx, function () { if (motionOK()) lancer(); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch13 : Le coût réel d'une vente                                     */
  /* ------------------------------------------------------------------ */

  var CARTES = [
    { v: "std", label: "Carte EEE standard", pct: 1.5, fixe: 0.25, usd: 0 },
    { v: "prem", label: "Carte premium", pct: 2.8, fixe: 0.25, usd: 0 },
    { v: "intl", label: "Carte internationale", pct: 3.15, fixe: 0.25, usd: 0 },
    { v: "paddle", label: "Paddle", pct: 5, fixe: 0, usd: 0.5 }
  ];

  VIZ["ch13-vente"] = {
    chapitre: "ch13",
    titre: "Le coût réel d'une vente",
    consigne: "Modifiez le prix, le moyen de paiement ou le volume : chaque barre montre où part l'argent d'un exemplaire.",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "vente");
      var st = { prix: 9.99, tva: 5.5, carte: "std", mo: 5, ventes: 30, pic: 10, taux: 0.86, broche: 34, impression: 4.35 };

      function calc() {
        var ht = st.prix / (1 + st.tva / 100), tva = st.prix - ht;
        var c = CARTES.filter(function (x) { return x.v === st.carte; })[0];
        var com = st.prix * c.pct / 100 + c.fixe + c.usd * st.taux;
        var emailMois = st.pic > 100 ? 20 * st.taux : 0;
        var email = st.ventes > 0 ? emailMois / st.ventes : 0;
        var direct = { tva: tva, frais: com, email: email, net: st.prix - tva - com - email };
        var livr = 0.12 * st.mo;
        var roy = 0.7 * Math.max(0, ht - livr);
        var kindle = { tva: tva, frais: ht - roy, net: roy, livr: livr };
        var bht = st.broche / (1 + st.tva / 100);
        var broyal = 0.6 * bht - st.impression;
        var broche = { tva: st.broche - bht, impression: st.impression, frais: bht - Math.max(0, broyal) - st.impression, net: Math.max(0, broyal) };
        return { direct: direct, kindle: kindle, broche: broche, carte: c, emailMois: emailMois };
      }

      var fields = h("div", { class: "vz-vente-in" },
        ui.kicker("Livre numérique"),
        h("div", { class: "vz-vente-f" },
          ui.field({ label: "Prix TTC", unit: "€", value: st.prix, min: 0.5, onChange: function (v) { st.prix = v; maj(); } }),
          ui.field({ label: "TVA", unit: "%", value: st.tva, dec: 1, min: 0, max: 30, onChange: function (v) { st.tva = v; maj(); } }),
          ui.field({ label: "Taille du fichier", unit: "Mo", value: st.mo, dec: 1, min: 0, onChange: function (v) { st.mo = v; maj(); } })),
        ui.kicker("Paiement en direct"),
        ui.seg("Moyen de paiement", CARTES.map(function (c) { return { v: c.v, label: c.label, sub: c.v === "paddle" ? "5 % + 0,50 $" : nf(c.pct, c.pct % 1 ? 2 : 1) + " % + 0,25 €" }; }), st.carte, function (v) { st.carte = v; maj(); }).el,
        ui.kicker("Volume et e-mails (Resend)"),
        h("div", { class: "vz-vente-f" },
          ui.field({ label: "Ventes par mois", value: st.ventes, dec: 0, min: 0, onChange: function (v) { st.ventes = v; maj(); } }),
          ui.field({ label: "Commandes le jour de pointe", value: st.pic, dec: 0, min: 0, onChange: function (v) { st.pic = v; maj(); } }),
          ui.field({ label: "1 $ vaut", unit: "€", value: st.taux, min: 0.1, onChange: function (v) { st.taux = v; maj(); } })),
        ui.kicker("Broché via Amazon (impression à la demande)"),
        h("div", { class: "vz-vente-f" },
          ui.field({ label: "Prix du broché TTC", unit: "€", value: st.broche, min: 1, onChange: function (v) { st.broche = v; maj(); } }),
          ui.field({ label: "Coût d'impression KDP", unit: "€", value: st.impression, min: 0, onChange: function (v) { st.impression = v; maj(); } })),
        ui.note("Stripe, Paddle, Resend et KDP : " + DATE_TARIFS + " Taux de change à vérifier le jour du calcul."));

      var bars = h("div", { class: "vz-vente-bars" });
      var lecture = h("p", { class: "vz-vente-lecture", "aria-live": "polite" });
      var SEGS = [
        { k: "net", l: "Ce qui vous revient" },
        { k: "tva", l: "TVA" },
        { k: "frais", l: "Commission ou part d'Amazon" },
        { k: "impression", l: "Impression" },
        { k: "email", l: "E-mail (Resend Pro)" }
      ];
      var leg = h("div", { class: "vz-vente-leg" }, SEGS.map(function (x) { return h("span", { class: "vz-vente-k vz-vente-k--" + x.k }, x.l); }));

      function barre(nom, sous, total, parts, max) {
        var track = h("div", { class: "vz-vente-track", style: { width: (100 * total / max) + "%" }, role: "img", "aria-label": nom + " : " + SEGS.filter(function (x) { return parts[x.k]; }).map(function (x) { return x.l + " " + eur(parts[x.k]); }).join(", ") });
        SEGS.forEach(function (x) {
          var v = parts[x.k] || 0;
          if (v <= 0.0005) return;
          var seg = h("span", { class: "vz-vente-s vz-vente-s--" + x.k, style: { width: (100 * v / total) + "%" }, title: x.l + " : " + eur(v) });
          if (v / max > 0.1) seg.appendChild(h("span", { class: "vz-vente-sv" }, nf(v, 2)));
          track.appendChild(seg);
        });
        return h("div", { class: "vz-vente-bar" },
          h("div", { class: "vz-vente-bh" }, h("strong", null, nom), h("span", { class: "vz-a-small" }, sous), h("span", { class: "vz-vente-net" }, eur(parts.net))),
          track);
      }
      function maj() {
        var c = calc();
        var max = Math.max(st.prix, st.broche);
        clear(bars);
        bars.appendChild(barre("Numérique en direct", c.carte.label + " · " + eur(st.prix) + " TTC", st.prix, c.direct, max));
        bars.appendChild(barre("Kindle sur Amazon", "70 % du HT moins la livraison (" + eur(c.kindle.livr) + ")", st.prix, c.kindle, max));
        bars.appendChild(barre("Broché via Amazon", "60 % du HT moins l'impression · " + eur(st.broche) + " TTC", st.broche, c.broche, max));
        var ecart = c.direct.net - c.kindle.net;
        lecture.textContent = "En direct, il vous reste " + eur(c.direct.net) + " par exemplaire numérique, soit " + eur(Math.abs(ecart)) + (ecart >= 0 ? " de plus" : " de moins") + " qu'en Kindle. " +
          (st.pic > 100 ? "Au-delà de 100 commandes par jour, l'offre gratuite de Resend ne suffit plus : l'offre Pro (20 $ par mois) pèse " + eur(c.direct.email) + " par vente. "
            : "Jusqu'à 100 e-mails par jour, Resend reste gratuit. ") +
          "Vendre en direct exclut KDP Select : un choix d'éditeur plus que de calcul.";
      }
      r.appendChild(h("div", { class: "vz-vente-grid" }, fields, h("div", { class: "vz-vente-out" }, ui.kicker("Où part l'argent d'un exemplaire (€)"), bars, leg, lecture)));
      maj();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch14 : Découpage en lots                                            */
  /* ------------------------------------------------------------------ */

  var LOTS = [
    { titre: "Connexion et tableau", contenu: "Connexion de l'auteur, table des chapitres, tableau par statut.", test: "L'auteur crée, modifie et déplace un chapitre.", pieces: ["Authentification", "Base de données", "Front"] },
    { titre: "Rôles et règles d'accès", contenu: "Rôles, invitation des relecteurs, règles d'accès.", test: "Un relecteur ne voit que les chapitres en Relecture.", pieces: ["Autorisation", "Base de données"], cle: "Les règles d'accès arrivent avant les commentaires et les fichiers : ajoutées à la fin, elles se poseraient sur des tables déjà remplies." },
    { titre: "Commentaires", contenu: "Commentaires des relecteurs sur les chapitres qu'ils peuvent lire.", test: "Deux relecteurs ne voient pas leurs commentaires respectifs.", pieces: ["Base de données", "Autorisation"] },
    { titre: "Captures d'écran", contenu: "Dépôt de captures rattachées à un commentaire, dans un stockage privé.", test: "Un fichier déposé n'est lisible que par son auteur et l'auteur du livre.", pieces: ["Stockage", "Autorisation"] },
    { titre: "E-mail aux relecteurs", contenu: "Un e-mail part vers les relecteurs au passage en Relecture.", test: "Le relecteur reçoit le message, le lien fonctionne.", pieces: ["API (Resend)", "Back"] },
    { titre: "Relecture par Claude", contenu: "L'auteur lance une relecture par Claude depuis une fonction serveur.", test: "Coût affiché, quota respecté, clé invisible.", pieces: ["API (Claude)", "Back", "Secrets"] }
  ];

  VIZ["ch14-lots"] = {
    chapitre: "ch14",
    titre: "Le découpage en lots",
    consigne: "Ouvrez un lot pour voir son contenu, cochez son test de fin, puis enregistrez-le : le suivant se déverrouille.",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "lots");
      var livres = 0, ouvert = 0, coche = false;
      var frise = h("div", { class: "vz-lots-frise", role: "group", "aria-label": "Les six lots de L'Atelier" });
      var prog = h("div", { class: "vz-lots-prog", "aria-hidden": "true" }, h("span"));
      var nodes = LOTS.map(function (L, i) {
        var b = h("button", { type: "button", class: "vz-lots-node", disabled: ctx.print || null, onclick: function () { ouvert = i; coche = false; maj(); } },
          h("span", { class: "vz-lots-n" }, String(i + 1)),
          h("span", { class: "vz-lots-t" }, L.titre),
          h("span", { class: "vz-lots-st" }));
        frise.appendChild(b);
        return b;
      });
      var panel = h("div", { class: "vz-lots-panel", "aria-live": "polite" });

      if (ctx.print) {
        r.appendChild(frise);
        var lst = h("div", { class: "vz-lots-plist" });
        LOTS.forEach(function (L, i) {
          lst.appendChild(h("div", { class: "vz-lots-pi" + (L.cle ? " is-cle" : "") },
            h("strong", null, "Lot " + (i + 1) + " · " + L.titre), h("span", null, L.contenu),
            h("span", { class: "vz-lots-ptest" }, "Test de fin de lot : " + L.test)));
        });
        r.appendChild(lst);
        r.appendChild(h("p", { class: "vz-a-small" }, "Chaque lot est livrable, testable et enregistré par un commit avant de passer au suivant ; les règles d'accès arrivent au lot 2."));
        nodes.forEach(function (n) { n.querySelector(".vz-lots-st").textContent = ""; });
        return;
      }

      function maj() {
        prog.firstChild.style.width = (100 * livres / LOTS.length) + "%";
        nodes.forEach(function (n, i) {
          var etat = i < livres ? "livre" : i === livres ? "cours" : "attente";
          n.className = "vz-lots-node is-" + etat + (i === ouvert ? " is-open" : "") + (LOTS[i].cle ? " is-cle" : "");
          n.setAttribute("aria-pressed", String(i === ouvert));
          n.setAttribute("aria-label", "Lot " + (i + 1) + ", " + LOTS[i].titre + ", " + (etat === "livre" ? "livré" : etat === "cours" ? "en cours" : "en attente"));
          n.querySelector(".vz-lots-st").textContent = etat === "livre" ? "✓ livré" : etat === "cours" ? "en cours" : "en attente";
        });
        var L = LOTS[ouvert];
        clear(panel);
        panel.appendChild(h("div", { class: "vz-lots-ph" }, h("span", { class: "vz-lots-n" }, String(ouvert + 1)), h("strong", null, L.titre)));
        panel.appendChild(h("p", null, L.contenu));
        panel.appendChild(h("div", { class: "vz-lots-pieces" }, L.pieces.map(function (p) { return h("span", { class: "vz-lots-piece" }, p); })));
        if (L.cle) panel.appendChild(h("p", { class: "vz-lots-cle" }, L.cle));
        if (ouvert < livres) {
          panel.appendChild(h("p", { class: "vz-lots-ok" }, "✓ Lot livré, testé et enregistré par un commit, marqué d'un signet."));
        } else if (ouvert > livres) {
          panel.appendChild(h("p", { class: "vz-a-small" }, "Ce lot attend : terminez d'abord le lot " + (livres + 1) + ". Un outil de cette taille ne se demande pas d'un bloc."));
        } else {
          var cb = h("input", { type: "checkbox", checked: coche || null, onchange: function () { coche = cb.checked; commit.disabled = !coche; } });
          panel.appendChild(h("label", { class: "vz-lots-test" }, cb, h("span", null, h("strong", null, "Test de fin de lot : "), L.test)));
          var commit = ui.btn("Commit et signet, puis lot suivant", function () {
            livres++; ouvert = Math.min(livres, LOTS.length - 1); coche = false; maj();
          }, "vz-a-btn--accent");
          commit.disabled = !coche;
          panel.appendChild(commit);
        }
        if (livres === LOTS.length) panel.appendChild(h("p", { class: "vz-lots-ok" }, "Les six lots sont livrés : L'Atelier est construit par petits pas vérifiés."));
        panel.classList.remove("is-flash"); void panel.offsetWidth; panel.classList.add("is-flash");
      }
      r.appendChild(h("div", { class: "vz-lots-wrap" }, prog, frise));
      r.appendChild(panel);
      r.appendChild(h("div", { class: "vz-lots-acts" }, ui.btn("Recommencer", function () { livres = 0; ouvert = 0; coche = false; maj(); }, "vz-a-btn--ghost")));
      maj();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch15 : Qui voit quoi                                                */
  /* ------------------------------------------------------------------ */

  var COMPTES = [{ v: "auteur", label: "Auteur" }, { v: "A", label: "TEST relecteur A" }, { v: "B", label: "TEST relecteur B" }];
  var OPS = ["Lire", "Créer", "Modifier", "Supprimer"];
  // Chaque ligne : table, libellé, fonction(compte) -> [L, C, M, S] avec 1 = oui, 0 = non, 0.5 = partiel ; plus une règle en français par opération.
  var LIGNES15 = (function () {
    var rel = function (st) {
      return {
        t: "chapitres", l: "Chapitre en " + st,
        f: function (c) { var lu = c === "auteur" || st === "Relecture" || st === "Publié"; return c === "auteur" ? [1, 1, 1, 1] : [lu ? 1 : 0, 0, 0, 0]; },
        r: ["L'auteur lit tout ; le relecteur, les chapitres en Relecture ou Publié.", "Seul l'auteur crée un chapitre.", "Seul l'auteur modifie un chapitre ou change son statut.", "Seul l'auteur supprime un chapitre."]
      };
    };
    var com = function (de) {
      return {
        t: "commentaires", l: "Commentaire de " + de,
        f: function (c) {
          if (c === "auteur") return [1, 0, 0.5, 1];
          return c === de ? [1, 1, 1, 0] : [0, 0, 0, 0];
        },
        r: ["L'auteur lit tout ; un relecteur ne lit que ses propres commentaires.", "On commente un chapitre qu'on peut lire, en son propre nom : personne n'écrit au nom de " + de + ".",
          "L'auteur du commentaire modifie son texte ; l'auteur du livre peut seulement le marquer traité.", "Seul l'auteur du livre supprime un commentaire."]
      };
    };
    return [rel("Idée"), rel("Brouillon"), rel("Rédaction"), rel("Relecture"), rel("Publié"), com("A"), com("B"),
      { t: "roles_utilisateurs", l: "Ses propres lignes de rôle", f: function (c) { return c === "auteur" ? [1, 1, 0, 1] : [1, 0, 0, 0]; },
        r: ["Chacun lit ses propres lignes.", "Seul l'auteur attribue un rôle.", "Personne ne modifie une ligne de rôle.", "Seul l'auteur retire un rôle."] },
      { t: "roles_utilisateurs", l: "Rôles des autres", f: function (c) { return c === "auteur" ? [1, 1, 0, 1] : [0, 0, 0, 0]; },
        r: ["L'auteur lit toutes les lignes ; un relecteur ne voit pas les rôles des autres.", "Seul l'auteur attribue un rôle.", "Personne ne modifie une ligne de rôle.", "Seul l'auteur retire un rôle."] },
      { t: "relectures_ia", l: "Relectures par Claude", f: function (c) { return c === "auteur" ? [1, 1, 0, 1] : [0, 0, 0, 0]; },
        r: ["Seul l'auteur lit les relectures par Claude.", "L'auteur, en son nom : la fonction serveur agit pour lui.", "Personne ne modifie une relecture enregistrée.", "Seul l'auteur supprime une relecture."] }
    ];
  })();
  function glyph(v) { return v === 1 ? "✓" : v === 0.5 ? "◐" : "✕"; }

  VIZ["ch15-droits"] = {
    chapitre: "ch15",
    titre: "Qui voit quoi : le test des trois comptes",
    consigne: "Basculez d'un compte de test à l'autre ; cliquez sur une case pour lire la règle en français.",
    ancre: "Les captures d'écran : un garde-meuble privé",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "droits");

      if (ctx.print) {
        var t = h("table", { class: "vz-droits-ptab" });
        var hr = h("tr", null, h("th", null, "Donnée"));
        COMPTES.forEach(function (c) { hr.appendChild(h("th", null, c.label, h("br"), h("small", null, "L · C · M · S"))); });
        t.appendChild(h("thead", null, hr));
        var tb = h("tbody");
        LIGNES15.forEach(function (L) {
          var tr = h("tr", null, h("th", null, h("small", null, L.t), h("br"), L.l));
          COMPTES.forEach(function (c) {
            var v = L.f(c.v);
            tr.appendChild(h("td", null, v.map(function (x) { return h("span", { class: "vz-droits-g vz-droits-v" + String(x).replace(".", "") }, glyph(x)); })));
          });
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        r.appendChild(t);
        r.appendChild(h("p", { class: "vz-a-small" }, "L : lire, C : créer, M : modifier, S : supprimer. ✓ autorisé, ◐ en partie, ✕ refusé par la base elle-même."));
        return;
      }

      var compte = "A", ouvert = null, fuite = false;
      function astuce() { ouvert = null; clear(info); info.appendChild(h("p", { class: "vz-a-small" }, "Cliquez sur une case : la règle d'accès correspondante s'affiche ici.")); }
      var seg = ui.seg("Compte de test", COMPTES, compte, function (v) { compte = v; astuce(); maj(true); });
      var tbl = h("div", { class: "vz-droits-tab", role: "table", "aria-label": "Droits par donnée et par opération" });
      var info = h("div", { class: "vz-droits-info", "aria-live": "polite" });
      var bilan = h("p", { class: "vz-droits-bilan" });
      var bFuite = h("button", { type: "button", role: "switch", "aria-checked": "false", class: "vz-droits-fuite", onclick: function () { fuite = !fuite; bFuite.setAttribute("aria-checked", String(fuite)); astuce(); maj(true); } },
        h("span", { class: "vz-atelier-sw", "aria-hidden": "true" }, h("span", { class: "vz-atelier-knob" })), " Simuler l'erreur classique : une règle using (true)");
      var test = ui.btn("Étape 3 : coller l'adresse d'un brouillon", function () {
        var v = fuite ? 1 : LIGNES15[1].f(compte)[0];
        clear(info);
        info.appendChild(h("p", { class: v ? "vz-droits-ko" : "vz-droits-ok" },
          compte === "auteur" ? "L'auteur voit son brouillon : c'est normal. Refaites le test avec un compte relecteur."
            : v ? "Le relecteur voit le brouillon en tapant son adresse : la règle manque dans la base, quoi qu'affiche l'interface."
              : "Page vide ou refusée : la base elle-même filtre la ligne. C'est l'étape qu'on saute, et la plus importante."));
      });

      function maj(anim) {
        clear(tbl);
        var head = h("div", { class: "vz-droits-tr vz-droits-th", role: "row" }, h("span", { role: "columnheader" }, "Donnée"));
        OPS.forEach(function (o) { head.appendChild(h("span", { role: "columnheader" }, o)); });
        tbl.appendChild(head);
        var oui = 0, tot = 0, tPrec = null;
        LIGNES15.forEach(function (L, li) {
          if (L.t !== tPrec) { tbl.appendChild(h("div", { class: "vz-droits-tg", role: "row" }, h("span", { role: "cell" }, L.t))); tPrec = L.t; }
          var v = L.f(compte);
          var row = h("div", { class: "vz-droits-tr", role: "row" }, h("span", { class: "vz-droits-rl", role: "rowheader" }, L.l));
          v.forEach(function (x, oi) {
            var lu = fuite && oi === 0 && x === 0 ? "f" : String(x).replace(".", "");
            tot++; if (x === 1 || lu === "f") oui++;
            var b = h("button", { type: "button", role: "cell", class: "vz-droits-c vz-droits-v" + lu + (ouvert && ouvert[0] === li && ouvert[1] === oi ? " is-open" : ""),
              "aria-label": L.l + ", " + OPS[oi] + " : " + (lu === "f" ? "visible par erreur" : x === 1 ? "autorisé" : x === 0.5 ? "en partie" : "refusé"),
              onclick: function () { ouvert = [li, oi]; maj(false); explique(L, oi, x, lu); } }, lu === "f" ? "!" : glyph(x));
            if (anim && motionOK()) b.style.animationDelay = (li * 25 + oi * 15) + "ms";
            if (anim) b.classList.add("is-anim");
            row.appendChild(b);
          });
          tbl.appendChild(row);
        });
        var c = COMPTES.filter(function (x) { return x.v === compte; })[0];
        bilan.textContent = c.label + " : " + oui + " opérations permises sur " + tot + "." + (fuite ? " Avec using (true), le relecteur lit tout : la porte est verrouillée, les pièces grandes ouvertes." : "");
        r.classList.toggle("is-fuite", fuite);
      }
      function explique(L, oi, x, lu) {
        clear(info);
        info.appendChild(h("p", null, h("strong", null, L.t + " · " + OPS[oi] + " : "), L.r[oi]));
        if (lu === "f") info.appendChild(h("p", { class: "vz-droits-ko" }, "Une règle using (true) laisse tout passer : demandez en mode Chat quelles règles existent sur la table, avant toute correction."));
      }
      r.appendChild(seg.el);
      r.appendChild(bilan);
      r.appendChild(tbl);
      r.appendChild(h("div", { class: "vz-droits-acts" }, test, bFuite));
      r.appendChild(info);
      maj(false);
      astuce();
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch16 : Le compteur de centimes                                      */
  /* ------------------------------------------------------------------ */

  var MODELES = [
    { v: "haiku", label: "Haiku 4.5", in: 1, out: 5 },
    { v: "sonnet", label: "Sonnet 5", in: 2, out: 10 },
    { v: "opus", label: "Opus 5.5", in: 4, out: 20 },
    { v: "fable", label: "Fable 5.1", in: 10, out: 50 }
  ];
  var VERROUS = [
    { nom: "Plafond de dépense de la Console", contre: "une erreur de calcul" },
    { nom: "Limites par minute du workspace", contre: "une boucle folle" },
    { nom: "Quota mensuel de la fonction", contre: "un usage excessif" },
    { nom: "max_tokens", contre: "une réponse interminable" },
    { nom: "Taille maximale du chapitre", contre: "un texte collé par erreur dix fois de suite" },
    { nom: "Rôle auteur", contre: "un relecteur trop curieux" }
  ];

  VIZ["ch16-centimes"] = {
    chapitre: "ch16",
    titre: "Le compteur de centimes",
    consigne: "Changez de modèle, de longueur ou de volume : le coût d'une relecture se recalcule au centime près.",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "centimes");
      var st = { m: "sonnet", mots: 4000, ratio: 1.5, consigne: 1000, sortie: 1500, maxTok: 2000, mois: 30, quota: 30, lots: false, prix: {} };
      MODELES.forEach(function (m) { st.prix[m.v] = { in: m.in, out: m.out }; });

      var segM = ui.seg("Modèle", MODELES.map(function (m) { return { v: m.v, label: m.label, sub: m.in + " $ / " + m.out + " $" }; }), st.m, function (v) { st.m = v; prixBox(); maj(); });
      var pBox = h("div", { class: "vz-centimes-f" });
      function prixBox() {
        clear(pBox);
        var p = st.prix[st.m];
        pBox.appendChild(ui.field({ label: "Entrée", unit: "$ / MTok", value: p.in, min: 0, onChange: function (v) { p.in = v; maj(); } }));
        pBox.appendChild(ui.field({ label: "Sortie", unit: "$ / MTok", value: p.out, min: 0, onChange: function (v) { p.out = v; maj(); } }));
      }
      prixBox();
      var sl = function (label, key, min, max, step, fmt) { return ui.slider({ label: label, min: min, max: max, step: step, value: st[key], fmt: fmt, onInput: function (v) { st[key] = v; maj(); } }); };
      var lots = h("label", { class: "vz-centimes-cb" }, h("input", { type: "checkbox", disabled: ctx.print || null, onchange: function (e) { st.lots = e.target.checked; maj(); } }), " Traitement par lots (moitié prix, réponse sous 24 heures)");

      var kRel = ui.kpi("Une relecture", "", "vz-a-kpi--big");
      var kMois = ui.kpi("Ce mois-ci", "");
      var kLivre = ui.kpi("Le livre, 93 relectures", "");
      var detail = h("div", { class: "vz-centimes-det" });
      var comp = h("div", { class: "vz-centimes-comp" });
      var couches = h("ol", { class: "vz-centimes-couches" });

      function cout(m, tin, tout) {
        var p = st.prix[m.v] || m, k = st.lots ? 0.5 : 1;
        return { i: tin * p.in / 1e6 * k, o: tout * p.out / 1e6 * k };
      }
      function maj() {
        var tin = Math.round(st.mots * st.ratio + st.consigne);
        var tout = Math.min(st.sortie, st.maxTok);
        var m = MODELES.filter(function (x) { return x.v === st.m; })[0];
        var c = cout(m, tin, tout), un = c.i + c.o;
        var faites = Math.min(st.mois, st.quota);
        kRel.set(usd(un, 3));
        kMois.set(usd(un * faites, 2) + (st.mois > st.quota ? " (quota atteint)" : ""));
        kLivre.set(usd(un * 93, 2));
        clear(detail);
        detail.appendChild(h("div", { class: "vz-centimes-split", role: "img", "aria-label": "Entrée " + usd(c.i, 4) + ", sortie " + usd(c.o, 4) },
          h("span", { class: "vz-centimes-in", style: { width: (100 * c.i / (un || 1)) + "%" } }, "entrée"),
          h("span", { class: "vz-centimes-out", style: { width: (100 * c.o / (un || 1)) + "%" } }, "sortie")));
        detail.appendChild(h("p", { class: "vz-centimes-calc" },
          nf(tin) + " jetons × " + nf(st.prix[m.v].in, 2) + " $ / M = " + usd(c.i, 4), h("br"),
          nf(tout) + " jetons × " + nf(st.prix[m.v].out, 2) + " $ / M = " + usd(c.o, 4) + (st.lots ? " (lots : −50 %)" : "")));
        clear(comp);
        var max = Math.max.apply(null, MODELES.map(function (x) { var y = cout(x, tin, tout); return y.i + y.o; }));
        MODELES.forEach(function (x) {
          var y = cout(x, tin, tout), v = y.i + y.o;
          comp.appendChild(h("div", { class: "vz-centimes-cr" + (x.v === st.m ? " is-on" : "") },
            h("span", { class: "vz-centimes-cl" }, x.label),
            h("span", { class: "vz-centimes-ct" }, h("span", { style: { width: (100 * v / max) + "%" } })),
            h("span", { class: "vz-centimes-cv" }, usd(v, 3))));
        });
        clear(couches);
        var bloque = st.mois > st.quota ? 2 : st.sortie > st.maxTok ? 3 : -1;
        VERROUS.forEach(function (V, i) {
          couches.appendChild(h("li", { class: "vz-centimes-v" + (i === bloque ? " is-stop" : ""), style: { "--i": i } },
            h("strong", null, V.nom), h("span", null, "contre " + V.contre),
            i === bloque ? h("em", null, i === 2 ? "arrête " + (st.mois - st.quota) + " relecture" + (st.mois - st.quota > 1 ? "s" : "") + " ce mois-ci" : "coupe la réponse à " + nf(st.maxTok) + " jetons") : null));
        });
      }
      r.appendChild(h("div", { class: "vz-centimes-grid" },
        h("div", { class: "vz-centimes-in-col" },
          ui.kicker("Modèle et tarifs (par million de jetons)"), segM.el, pBox,
          ui.kicker("Une relecture de chapitre"),
          sl("Mots du chapitre", "mots", 500, 10000, 100, function (v) { return nf(v) + " mots"; }),
          sl("Jetons par mot (hypothèse prudente)", "ratio", 1, 2.5, 0.1, function (v) { return nf(v, 1); }),
          sl("Jetons de sortie", "sortie", 200, 4000, 100, function (v) { return nf(v); }),
          sl("max_tokens", "maxTok", 500, 4000, 100, function (v) { return nf(v); }),
          ui.kicker("Volume"),
          sl("Relectures demandées ce mois", "mois", 0, 120, 1, function (v) { return nf(v); }),
          sl("Quota mensuel de la fonction", "quota", 0, 120, 1, function (v) { return nf(v); }),
          lots,
          ui.note("Tarifs de la page d'Anthropic : " + DATE_TARIFS + " Consigne, titre et arrondi : 1 000 jetons, comme dans le livre.")),
        h("div", { class: "vz-centimes-out-col" },
          h("div", { class: "vz-centimes-kpis" }, kRel, kMois, kLivre), detail,
          ui.kicker("Le même chapitre, modèle par modèle"), comp,
          ui.kicker("Le budget en couches"), couches)));
      maj();
      onVisible(r, ctx, function () { r.classList.add("is-in"); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ch17 : La multiprise MCP                                            */
  /* ------------------------------------------------------------------ */

  var BRANCHES = [
    { id: "A", nom: "Connecteur d'application", hote: "L'Atelier publié", cible: "Resend, Stripe, Slack", pourQui: "Les relecteurs, pendant qu'ils utilisent L'Atelier",
      ex: "Envoyer l'e-mail « nouveau chapitre à relire » par Resend.", cout: "Selon vos utilisateurs : compte du fournisseur, ou crédits pour les connecteurs « Uses credits ».",
      garde: "Un quota et une limite de débit : chaque requête utilise le même compte, un relecteur abusif vide le quota de tous.", mode: "users" },
    { id: "B", nom: "Connecteur de chat", hote: "L'agent Lovable", cible: "Notion, Linear, Jira", pourQui: "Vous, pendant la construction",
      ex: "Lire la page Notion « Retours bêta, chapitre 9 », et seulement elle.", cout: "Selon votre manière de travailler : tout ce que l'outil renvoie entre dans le contexte, facturé au travail fourni.",
      garde: "De la discipline : une page précise, pas un espace entier.", mode: "vous" },
    { id: "C", nom: "L'Atelier devient un outil", hote: "L'IA d'un relecteur", cible: "Serveur MCP de L'Atelier", pourQui: "Les assistants d'IA de vos relecteurs, ou votre code",
      ex: "Un relecteur demande à Claude « quels chapitres m'attendent ? ».", cout: "Selon vos utilisateurs : usage du backend Cloud, ou tokens Anthropic si votre code appelle un serveur MCP.",
      garde: "Une limite de débit par utilisateur sur chaque outil qui écrit : « No built-in rate limits or spending caps ».", mode: "users" },
    { id: "D", nom: "Claude pilote Lovable", hote: "Claude.ai ou Claude Code", cible: "Serveur MCP de Lovable", pourQui: "Vous, depuis Claude",
      ex: "Faire lire à Claude Code l'historique des modifications de L'Atelier, sans rien changer.", cout: "Selon votre manière de travailler : seuls create_project et send_message consomment des crédits, selon la documentation.",
      garde: "Inspection d'abord ; les droits portent sur tout votre compte, query_database a tous les droits sur la base.", mode: "vous" }
  ];

  VIZ["ch17-mcp"] = {
    chapitre: "ch17",
    titre: "La multiprise MCP",
    consigne: "Branchez une prise A, B, C ou D : le câble montre qui est branché sur quoi, pour qui, et qui paie.",
    ancre: "Le nœud dans les deux sens : la sécurité",
    render: function (el, ctx) {
      var ui = UI(ctx), r = root(el, ctx, "mcp");

      if (ctx.print) {
        var g = h("div", { class: "vz-mcp-pgrid" });
        BRANCHES.forEach(function (b) {
          g.appendChild(h("div", { class: "vz-mcp-pc vz-mcp-m-" + b.mode },
            h("div", { class: "vz-mcp-ph" }, h("span", { class: "vz-mcp-lettre" }, b.id), h("strong", null, b.nom)),
            h("p", null, h("strong", null, b.hote + " → " + b.cible)),
            h("p", { class: "vz-a-small" }, "Pour : " + b.pourQui + ". " + b.ex),
            h("p", { class: "vz-a-small" }, "Coût : " + b.cout),
            h("p", { class: "vz-a-small" }, "Garde-fou : " + b.garde)));
        });
        r.appendChild(g);
        r.appendChild(h("p", { class: "vz-a-small" }, "Aucun branchement n'a de tarif MCP propre : A et C coûtent selon vos utilisateurs (quotas), B et D selon votre manière de travailler (discipline)."));
        return;
      }

      var cur = null;
      var W = 340, H = 210;
      var svg = s("svg", { viewBox: "0 0 " + W + " " + H, class: "vz-mcp-svg", role: "group", "aria-label": "Multiprise MCP et ses quatre branchements" });
      var hote = s("g", { class: "vz-mcp-box vz-mcp-hote" }, s("rect", { x: 4, y: 20, width: 140, height: 48, rx: 10 }), s("text", { x: 74, y: 40, "text-anchor": "middle", class: "vz-mcp-bl" }, "Qui est branché"), s("text", { x: 74, y: 57, "text-anchor": "middle", class: "vz-mcp-bt" }, "…"));
      var cible = s("g", { class: "vz-mcp-box vz-mcp-cible" }, s("rect", { x: 196, y: 20, width: 140, height: 48, rx: 10 }), s("text", { x: 266, y: 40, "text-anchor": "middle", class: "vz-mcp-bl" }, "Sur quoi"), s("text", { x: 266, y: 57, "text-anchor": "middle", class: "vz-mcp-bt" }, "…"));
      var cable1 = s("path", { d: "M74 68 C74 110, 100 120, 120 140", class: "vz-mcp-cable" });
      var cable2 = s("path", { d: "M266 68 C266 110, 240 120, 220 140", class: "vz-mcp-cable" });
      svg.appendChild(cable1); svg.appendChild(cable2);
      svg.appendChild(hote); svg.appendChild(cible);
      svg.appendChild(s("rect", { x: 70, y: 140, width: 200, height: 46, rx: 12, class: "vz-mcp-strip" }));
      svg.appendChild(s("text", { x: 170, y: 202, "text-anchor": "middle", class: "vz-mcp-stript" }, "MCP · une prise commune"));
      var prises = BRANCHES.map(function (b, i) {
        var x = 95 + i * 50;
        var g = s("g", { class: "vz-mcp-prise", role: "button", tabindex: "0", "aria-label": "Branchement " + b.id + " : " + b.nom },
          s("circle", { cx: x, cy: 163, r: 16, class: "vz-mcp-pc-c" }),
          s("circle", { cx: x - 5, cy: 163, r: 2.2, class: "vz-mcp-trou" }), s("circle", { cx: x + 5, cy: 163, r: 2.2, class: "vz-mcp-trou" }),
          s("text", { x: x, y: 135, "text-anchor": "middle", class: "vz-mcp-pl" }, b.id));
        g.addEventListener("click", function () { brancher(i); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); brancher(i); } });
        svg.appendChild(g);
        return { g: g, x: x };
      });
      var chips = h("div", { class: "vz-mcp-chips", role: "group", "aria-label": "Branchements" });
      var cbs = BRANCHES.map(function (b, i) {
        var c = h("button", { type: "button", class: "vz-mcp-chip vz-mcp-m-" + b.mode, "aria-pressed": "false", onclick: function () { brancher(i); } }, h("span", { class: "vz-mcp-lettre" }, b.id), b.nom);
        chips.appendChild(c);
        return c;
      });
      var panel = h("div", { class: "vz-mcp-panel", "aria-live": "polite" });
      var leg = h("div", { class: "vz-mcp-leg" },
        h("span", { class: "vz-mcp-k vz-mcp-m-users" }, "Coûte selon vos utilisateurs : quotas"),
        h("span", { class: "vz-mcp-k vz-mcp-m-vous" }, "Coûte selon votre manière de travailler : discipline"));

      function brancher(i) {
        cur = i;
        var b = BRANCHES[i], x = prises[i].x;
        hote.querySelector(".vz-mcp-bt").textContent = b.hote;
        cible.querySelector(".vz-mcp-bt").textContent = b.cible;
        cable1.setAttribute("d", "M74 68 C74 120, " + (x - 10) + " 110, " + (x - 4) + " 148");
        cable2.setAttribute("d", "M266 68 C266 120, " + (x + 10) + " 110, " + (x + 4) + " 148");
        r.setAttribute("data-mode", b.mode);
        svg.classList.add("is-branche");
        [cable1, cable2].forEach(function (c) { c.classList.remove("is-anim"); void c.getBoundingClientRect(); if (motionOK()) c.classList.add("is-anim"); });
        prises.forEach(function (p, j) { p.g.classList.toggle("is-on", j === i); p.g.setAttribute("aria-pressed", String(j === i)); });
        cbs.forEach(function (c, j) { c.setAttribute("aria-pressed", String(j === i)); });
        clear(panel);
        panel.appendChild(h("div", { class: "vz-mcp-ph" }, h("span", { class: "vz-mcp-lettre" }, b.id), h("strong", null, b.nom)));
        panel.appendChild(h("dl", null,
          h("dt", null, "Pour qui"), h("dd", null, b.pourQui),
          h("dt", null, "Exemple dans L'Atelier"), h("dd", null, b.ex),
          h("dt", null, "Qui paie"), h("dd", null, b.cout),
          h("dt", null, "Garde-fou"), h("dd", null, b.garde)));
        panel.classList.remove("is-flash"); void panel.offsetWidth; panel.classList.add("is-flash");
      }
      r.appendChild(h("div", { class: "vz-mcp-fig" }, svg));
      r.appendChild(chips);
      r.appendChild(leg);
      r.appendChild(panel);
      panel.appendChild(h("p", { class: "vz-a-small" }, "Brancher un serveur, c'est confier un trousseau de clés : choisissez une prise pour voir lesquelles."));
      onVisible(r, ctx, function () { if (cur === null) brancher(0); });
    }
  };
})();
