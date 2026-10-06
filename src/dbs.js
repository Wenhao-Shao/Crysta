/* Databases window: find a structure in an outside database and open it in Crysta.
   DEMO. One database has a copy inside the page: a part of the HybriD3 entry list, with the structure of one
   entry. The other databases are links: the user downloads the file there and drops it on Crysta.
   Crysta cannot read these databases directly from a browser (they do not allow requests from other sites),
   so the full version needs a copy of the entry list that is made on a schedule and stored with the page.
   Use: const dbs = CrystaDatabases.create({ data, addFiles, name, version }); dbs.open(); */
(function () {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  /* a formula with its numbers as subscripts: C16H22N2F2PbI4 */
  const formulaHtml = (f) => esc(f).replace(/([A-Za-z\)\]])(\d+(?:\.\d+)?)/g, '$1<sub>$2</sub>');
  /* "P21/c" as HybriD3 writes it, with a space after the lattice letter so that Crysta can set the symbol */
  const sgSpaced = (s) => String(s || '').trim().replace(/^([PABCIFR])(?=\S)/, '$1 ');
  /* the dimensionality values as HybriD3 gives them */
  const DIMS = [['', 'All'], ['2', '2D'], ['2.5', '2.5D'], ['3', '3D'], ['1', '1D'], ['0', '0D']];
  const dimText = (d) => d + 'D';
  /* Databases that Crysta links to. The user finds the structure there, downloads the file and drops it on Crysta. */
  const LINKS = [
    {
      id: 'nmse', tab: '2D perovskite database (NMSE)', title: '2D perovskite database',
      who: 'Laboratory of New Materials for Solar Energetics, Lomonosov Moscow State University',
      url: 'http://pdb.nmse-lab.ru/', button: 'Open the 2D perovskite database',
      what: 'Crystal structures of layered hybrid halide perovskites, with band gaps and atomic charges.',
      cite: 'E. I. Marchenko et al., Chemistry of Materials 32, 7383–7388 (2020).',
      file: 'CIF'
    },
    {
      id: 'cod', tab: 'COD', title: 'Crystallography Open Database',
      who: 'Open-access collection of crystal structures of organic, inorganic and metal-organic compounds and minerals',
      url: 'https://www.crystallography.net/cod/search.html', button: 'Open the COD search',
      what: 'Search by text, elements, cell, space group or COD number.',
      cite: 'S. Gražulis et al., Nucleic Acids Research 40, D420–D427 (2012).',
      file: 'CIF'
    }
  ];

  function create(host) {
    const db = host.data && host.data.materials ? host.data : null;
    const ui = { box: null, tab: db ? 'hybrid3' : LINKS[0].id, text: '', dim: '', only: false };
    const q = (sel) => (ui.box ? ui.box.querySelector(sel) : null);

    function rows() {
      const words = ui.text.toLowerCase().split(/\s+/).filter(Boolean);
      return db.materials.filter((m) => {
        if (ui.dim !== '' && String(m.dim) !== ui.dim) return false;
        if (ui.only && !m.structures.length) return false;
        if (!words.length) return true;
        const hay = [m.name, m.formula, m.aliases, m.organic, m.inorganic].join(' ').toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    const pageOf = (m) => db.home + 'materials/' + m.pk;
    const withFile = () => db.materials.filter((m) => m.structures.length).length;

    function hybridPanel() {
      return '<div class="db-bar">' +
        '<input type="search" id="dbText" placeholder="Name, formula, cation, metal or halide" aria-label="Search the entry list" value="' + esc(ui.text) + '">' +
        '<label class="small" for="dbDim">Dimensionality</label><select id="dbDim">' + DIMS.map((d) => '<option value="' + d[0] + '"' + (ui.dim === d[0] ? ' selected' : '') + '>' + d[1] + '</option>').join('') + '</select>' +
        '<label class="chk"><input type="checkbox" id="dbOnly"' + (ui.only ? ' checked' : '') + '>Only entries that open in ' + esc(host.name) + '</label>' +
        '<span class="small" id="dbCount" aria-live="polite"></span></div>' +
        '<div class="tbl-wrap db-table"><table id="dbTbl"></table></div>' +
        '<div class="small">Data: <a href="' + esc(db.home) + '" target="_blank" rel="noopener">' + esc(db.name) + '</a>, Duke University. Licence: <a href="' + esc(db.licenceUrl) + '" target="_blank" rel="noopener">' + esc(db.licence) + '</a>. ' +
        '<strong>Demo copy:</strong> ' + db.materials.length + ' of ' + db.total + ' materials, read on ' + esc(db.read) + '. ' + withFile() + ' of them ' + (withFile() === 1 ? 'has its' : 'have their') + ' structure in this page. ' +
        'For each other entry, the link opens its HybriD3 page. Download the files there and drop <code>geometry.in</code> on ' + esc(host.name) + '.</div>';
    }
    function drawTable() {
      const tbl = q('#dbTbl');
      if (!tbl) return;
      const list = rows();
      q('#dbCount').textContent = list.length + (list.length === 1 ? ' entry' : ' entries');
      tbl.innerHTML = '<thead><tr><th>Material</th><th>Formula</th><th>Dim.</th><th><i>n</i></th><th>Structure</th></tr></thead><tbody>' +
        (list.length ? list.map((m) => {
          const open = m.structures.map((s, i) => '<button type="button" class="mini primary" data-open="' + m.pk + ':' + i + '" title="Open this structure in ' + esc(host.name) + '">Open</button>' +
            '<span class="small">' + esc([sgSpaced(s.spaceGroup).replace(' ', ''), s.temperature ? s.temperature + ' K' : '', s.experimental ? 'experiment' : 'calculation'].filter(Boolean).join(', ')) + '</span>').join('');
          return '<tr><td><b>' + esc(m.name) + '</b>' + (m.aliases ? '<span class="small">' + esc(m.aliases) + '</span>' : '') + '</td>' +
            '<td>' + formulaHtml(m.formula) + '</td><td>' + esc(dimText(m.dim)) + '</td><td>' + esc(m.n || '') + '</td>' +
            '<td><div class="db-act">' + open + '<a href="' + esc(pageOf(m)) + '" target="_blank" rel="noopener" title="The page of this material in the HybriD3 database">HybriD3 page ↗</a></div></td></tr>';
        }).join('') : '<tr><td colspan="5" class="small">No entry of the demo copy has these words. The full database has ' + db.total + ' materials.</td></tr>') + '</tbody>';
    }
    function linkPanel(L) {
      return '<div class="db-link"><h2>' + esc(L.title) + '</h2><p>' + esc(L.who) + '.</p><p>' + esc(L.what) + '</p>' +
        '<p>' + esc(host.name) + ' cannot read this database directly. Use these steps:</p>' +
        '<ol><li>Open the database.</li><li>Find the structure and download its ' + esc(L.file) + ' file.</li><li>Drop the file on the ' + esc(host.name) + ' page.</li></ol>' +
        '<p><a class="homelink" href="' + esc(L.url) + '" target="_blank" rel="noopener">' + esc(L.button) + ' ↗</a></p>' +
        '<p class="small">If you use data from this database, cite: ' + esc(L.cite) + '</p></div>';
    }
    function draw() {
      const tabs = (db ? [{ id: 'hybrid3', tab: 'HybriD3 (Duke)' }] : []).concat(LINKS);
      ui.box.innerHTML = '<div class="px db">' +
        '<header class="px-head"><div><div class="eyebrow">' + esc(host.name) + ' ' + esc(host.version) + '  ·  Databases (demo)</div><h1>Structure databases</h1></div>' +
        '<div class="tools"><button type="button" id="dbClose">Close</button></div></header>' +
        '<div class="db-main"><div class="seg" role="group" aria-label="Database">' + tabs.map((t) => '<button type="button" data-tab="' + t.id + '" aria-pressed="' + (ui.tab === t.id) + '">' + esc(t.tab) + '</button>').join('') + '</div>' +
        '<section class="card db-panel">' + (ui.tab === 'hybrid3' ? hybridPanel() : linkPanel(LINKS.find((L) => L.id === ui.tab))) + '</section></div></div>';
      if (ui.tab === 'hybrid3') drawTable();
    }

    function openEntry(key) {
      const [pk, i] = key.split(':');
      const m = db.materials.find((x) => String(x.pk) === pk);
      const s = m && m.structures[+i];
      if (!s || !s.text) return;
      const short = (m.aliases || m.name).split(/[,;]/)[0].trim();
      host.addFiles([{
        name: short + ', HybriD3 ' + s.dataset + '.in', text: s.text,
        // where the structure comes from: shown with the structure, so that the credit goes with it
        origin: {
          database: 'HybriD3', entry: 'data set ' + s.dataset, url: db.home + 'materials/dataset/' + s.dataset, licence: db.licence, licenceUrl: db.licenceUrl,
          reference: s.reference || '', doi: s.doi || '', spaceGroup: sgSpaced(s.spaceGroup), temperature: s.temperature || ''
        }
      }]);
      close();
    }

    function close() {
      if (!ui.box) return;
      ui.box.remove();
      ui.box = null;
    }
    function open() {
      if (ui.box) { close(); return; }
      const box = document.createElement('div');
      box.className = 'pxfloat dbfloat';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Structure databases');
      document.body.appendChild(box);
      ui.box = box;
      draw();
      box.addEventListener('click', (e) => {
        if (e.target.id === 'dbClose') { close(); return; }
        const tab = e.target.closest('button[data-tab]');
        if (tab) { ui.tab = tab.dataset.tab; draw(); return; }
        const b = e.target.closest('button[data-open]');
        if (b) openEntry(b.dataset.open);
      });
      box.addEventListener('input', (e) => {
        if (e.target.id === 'dbText') { ui.text = e.target.value; drawTable(); }
      });
      box.addEventListener('change', (e) => {
        if (e.target.id === 'dbDim') { ui.dim = e.target.value; drawTable(); }
        if (e.target.id === 'dbOnly') { ui.only = e.target.checked; drawTable(); }
      });
      box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      // the window moves when its head is dragged
      box.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.px-head') || e.target.closest('button, input, label, select, a') || window.innerWidth <= 760) return;
        const r = box.getBoundingClientRect();
        const dx = e.clientX - r.left, dy = e.clientY - r.top;
        box.style.transform = 'none';
        const move = (ev) => {
          box.style.left = clamp(ev.clientX - dx, 40 - r.width, window.innerWidth - 40) + 'px';
          box.style.top = clamp(ev.clientY - dy, 0, window.innerHeight - 40) + 'px';
        };
        const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
        move(e);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
      });
      const first = q('#dbText') || q('#dbClose');
      if (first) first.focus();
    }

    return { open, close, isOpen: () => !!ui.box, state: ui };
  }

  window.CrystaDatabases = { create };
})();
