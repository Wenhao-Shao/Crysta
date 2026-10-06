/* Databases window: find a structure in an outside database, then open it in Crysta.
   Crysta cannot read these databases directly from a browser (they do not allow requests from other sites), and it
   holds no structure file of a database. So each database is a link: the user downloads the file there and drops
   it on Crysta.
   One database, HybriD3, also has its entry list inside the page: the materials and their structure data sets.
   tools/hybrid3_copy.py makes this list from the HybriD3 API, and build.py puts it in the page. The window
   searches the list and gives the download link of each data set.
   Use: const dbs = CrystaDatabases.create({ data, name, version }); dbs.open(); */
(function () {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  /* a formula with its numbers as subscripts: C16H22N2F2PbI4 */
  const formulaHtml = (f) => esc(f).replace(/([A-Za-z\)\]])(\d+(?:\.\d+)?)/g, '$1<sub>$2</sub>');
  /* "P21/c" as HybriD3 writes it, with a space after the lattice letter so that Crysta can set the symbol */
  const sgSpaced = (s) => String(s || '').trim().replace(/\((\d)\)/g, '$1').replace(/^([PABCIFR])(?=\S)/, '$1 ');
  /* the dimensionality values as HybriD3 gives them */
  const DIMS = [['', 'All'], ['2', '2D'], ['2.5', '2.5D'], ['3', '3D'], ['1', '1D'], ['0', '0D']];
  const dimText = (d) => (d === null || d === undefined || d === '' ? '' : d + 'D');
  /* The formula unit from the stoichiometry field of HybriD3, "C:16,H:22,N:2,F:2,Pb:1,I:4", in Hill order:
     C, then H, then the other elements by letter. Without carbon, every element by letter. */
  function hillFormula(stoich) {
    const parts = String(stoich || '').split(',').map((p) => p.trim().split(':')).filter((p) => p.length === 2 && /^[A-Z][a-z]?$/.test(p[0].trim()) && parseFloat(p[1]) > 0)
      .map((p) => [p[0].trim(), parseFloat(p[1])]);
    if (!parts.length) return '';
    const hasC = parts.some((p) => p[0] === 'C');
    const rank = (el) => (hasC && el === 'C' ? '0' : hasC && el === 'H' ? '1' : '2' + el);
    parts.sort((a, b) => (rank(a[0]) < rank(b[0]) ? -1 : rank(a[0]) > rank(b[0]) ? 1 : 0));
    return parts.map((p) => p[0] + (p[1] === 1 ? '' : String(+p[1].toFixed(3)))).join('');
  }
  /* a field that holds a name, not a mark such as "/" or "-" for "none" */
  const isName = (x) => /[A-Za-z]{2}/.test(x || '') && !/^(none|n\/a|na|null)$/i.test(String(x).trim());
  /* other names in one text field: split at a semicolon, or at a comma that has a space after it
     (a comma inside a chemical name, as in "N,N,N′-trimethyl", has no space) */
  const splitNames = (text) => String(text || '').split(/\s*[;；]\s*|,\s+/).map((x) => x.trim()).filter(isName);
  /* The names of an entry. Official: the compound name and the IUPAC name. Common: the other names that the
     database lists, and the formula as the database writes it when that is a short form such as (PEA)2PbI4. */
  function namesOf(m) {
    const hill = hillFormula(m.stoich);
    const same = (a, b) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();
    const common = [];
    if (m.formula && (!hill || /[()\[\]·\-]/.test(m.formula)) && !same(m.formula, m.name)) common.push(m.formula);
    for (const a of splitNames(m.aliases)) if (!common.some((c) => same(c, a)) && !same(a, m.name)) common.push(a);
    // short forms such as (PEA)2PbI4 come before names in words
    common.sort((a, b) => (/\s/.test(a) ? 1 : 0) - (/\s/.test(b) ? 1 : 0));
    const iupac = isName(m.iupac) && !same(m.iupac, m.name) && !common.some((c) => same(c, m.iupac)) ? m.iupac.trim() : '';
    return { hill, common, iupac };
  }
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
  const MAX_NAMES = 3;

  /* The files of a HybriD3 download that the user dropped on Crysta: the name to show and the origin (source,
     licence, reference). `info` is what the info.txt of the download states (XtalCore.hybridInfo), `count` the
     number of structure files that Crysta opens from it. The entry list gives the short name, the space group
     and the short reference. For a data set that is not in the list, the reference is the line of info.txt. */
  const HOME = 'https://materials.hybrid3.duke.edu/';
  function hybridOrigin(db, info, count) {
    let m = null, s = null;
    for (const x of (db && db.materials) || []) {
      const hit = x.structures.find((y) => y.dataset === info.dataset);
      if (hit) { m = x; s = hit; break; }
    }
    const short = m ? (m.names || namesOf(m)).common[0] || m.name : '';
    const one = count === 1;
    return {
      name: (file) => {
        const ext = (file.match(/\.[^.\/]+$/) || [''])[0];
        const stem = file.slice(0, file.length - ext.length);
        return (short ? short + ', ' : '') + 'HybriD3 ' + info.dataset + (one && short ? '' : ', ' + stem) + ext;
      },
      origin: {
        database: 'HybriD3', entry: 'data set ' + info.dataset, url: HOME + 'materials/dataset/' + info.dataset,
        licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
        reference: s ? s.reference || '' : info.reference || '', doi: s ? s.doi || '' : '',
        spaceGroup: s ? sgSpaced(s.spaceGroup) : '', temperature: one ? (s && s.temperature) || info.temperature || '' : ''
      }
    };
  }

  function create(host) {
    const db = host.data && host.data.materials ? host.data : null;
    const ui = { box: null, tab: db ? 'hybrid3' : LINKS[0].id, text: '', dim: '', only: false };
    const q = (sel) => (ui.box ? ui.box.querySelector(sel) : null);
    if (db) {
      // what the table shows and what the search reads, worked out once for each entry
      for (const m of db.materials) {
        m.names = namesOf(m);
        m.hay = [m.name, m.iupac, m.aliases, m.formula, m.names.hill, m.organic, m.inorganic].join(' ').toLowerCase();
        // the order is by the first word of the name, without the numbers and letters in front of it: "4-fluoro..." under f
        m.key = ((m.name.match(/[A-Za-z]{2,}.*/) || [m.name])[0]).toLowerCase();
      }
      // the entries with a structure file come first, then by name
      db.materials.sort((a, b) => (b.structures.length ? 1 : 0) - (a.structures.length ? 1 : 0) || (a.key < b.key ? -1 : a.key > b.key ? 1 : a.pk - b.pk));
    }

    function rows() {
      const words = ui.text.toLowerCase().split(/\s+/).filter(Boolean);
      return db.materials.filter((m) => {
        if (ui.dim !== '' && String(m.dim) !== ui.dim) return false;
        if (ui.only && !m.structures.length) return false;
        return words.every((w) => m.hay.includes(w));
      });
    }
    const pageOf = (m) => db.home + 'materials/' + m.pk;
    /* the download of one data set: a zip file with the structure files and info.txt */
    const downloadOf = (s) => db.home + 'materials/datasets/' + s.dataset + '/files/';
    const withFile = () => db.materials.filter((m) => m.structures.length).length;
    /* the number of structure files of one kind ("cif" or "in") that the data sets of the list have at HybriD3 */
    const nFiles = (kind) => db.materials.reduce((t, m) => t + m.structures.reduce((u, s) => u + s.files.filter((f) => f.kind === kind).length, 0), 0);
    /* the files of one data set in words: CIF, 7 CIFs, geometry file */
    function filesText(s) {
      const n = s.files.length;
      if (s.files.every((f) => f.kind === 'cif')) return n === 1 ? 'CIF' : n + ' CIFs';
      if (s.files.every((f) => f.kind === 'in')) return n === 1 ? 'geometry file' : n + ' geometry files';
      return n + ' files';
    }
    /* one data set of an entry in words: P21/c, 300 K, experiment, CIF. A data set with several files does not have
       one temperature, so the temperature is not shown for it. */
    const structureText = (s) => [sgSpaced(s.spaceGroup).replace(' ', ''), s.temperature && s.files.length === 1 ? s.temperature + ' K' : '',
      s.experimental ? 'experiment' : 'calculation', s.caption, filesText(s)].filter(Boolean).join(', ');

    function hybridPanel() {
      const n = withFile();
      return '<div class="db-bar">' +
        '<input type="search" id="dbText" placeholder="Name, formula, cation, metal or halide" aria-label="Search the entry list" value="' + esc(ui.text) + '">' +
        '<label class="small" for="dbDim">Dimensionality</label><select id="dbDim">' + DIMS.map((d) => '<option value="' + d[0] + '"' + (ui.dim === d[0] ? ' selected' : '') + '>' + d[1] + '</option>').join('') + '</select>' +
        '<label class="chk"><input type="checkbox" id="dbOnly"' + (ui.only ? ' checked' : '') + '>Only entries with a structure file</label>' +
        '<span class="small" id="dbCount" aria-live="polite"></span>' +
        '<span class="small db-how">To open a structure: press Download, then drop the zip file from HybriD3 on the ' + esc(host.name) + ' page.</span></div>' +
        '<div class="tbl-wrap db-table"><table id="dbTbl"></table></div>' +
        '<div class="small">Data: <a href="' + esc(db.home) + '" target="_blank" rel="noopener">' + esc(db.name) + '</a>, Duke University. Licence: <a href="' + esc(db.licenceUrl) + '" target="_blank" rel="noopener">' + esc(db.licence) + '</a>. ' +
        'The list is a copy of all ' + db.total + ' materials, read on ' + esc(db.read) + '. ' + n + ' of them have structure files at HybriD3: ' +
        nFiles('cif') + ' CIFs and ' + nFiles('in') + ' geometry files. A geometry file holds the cell and the atoms, but no symmetry. ' +
        esc(host.name) + ' holds no structure file of HybriD3: the Download link gets the files from HybriD3. ' +
        'If you use a structure, cite the reference that ' + esc(host.name) + ' shows with it.</div>';
    }
    function nameCell(m) {
      const c = m.names.common;
      const more = c.length > MAX_NAMES ? ' <span title="' + esc(c.slice(MAX_NAMES).join(' · ')) + '">+' + (c.length - MAX_NAMES) + ' more</span>' : '';
      return '<b>' + esc(m.name) + '</b>' +
        (c.length ? '<span class="small"><i class="db-tag">Also</i>' + c.slice(0, MAX_NAMES).map(esc).join(' · ') + more + '</span>' : '') +
        (m.names.iupac ? '<span class="small"><i class="db-tag">IUPAC</i>' + esc(m.names.iupac) + '</span>' : '');
    }
    function drawTable() {
      const tbl = q('#dbTbl');
      if (!tbl) return;
      const list = rows();
      q('#dbCount').textContent = list.length + (list.length === 1 ? ' entry' : ' entries');
      tbl.innerHTML = '<thead><tr><th>Material</th><th title="The formula unit: the elements and their numbers as HybriD3 gives them, C and H first">Formula</th><th>Dim.</th><th><i>n</i></th><th>Structure</th></tr></thead><tbody>' +
        (list.length ? list.map((m) => {
          const open = m.structures.map((s) => '<div class="db-one"><a class="db-get" href="' + esc(downloadOf(s)) + '" target="_blank" rel="noopener" title="Download the files of data set ' + s.dataset +
            ' from HybriD3 (a zip file). Then drop the zip file on ' + esc(host.name) + '.">Download</a>' +
            '<span class="small">' + esc(structureText(s)) + '</span></div>').join('');
          return '<tr><td>' + nameCell(m) + '</td>' +
            '<td>' + formulaHtml(m.names.hill || m.formula) + '</td><td>' + esc(dimText(m.dim)) + '</td><td>' + esc(m.n || '') + '</td>' +
            '<td><div class="db-act">' + open + '<a href="' + esc(pageOf(m)) + '" target="_blank" rel="noopener" title="The page of this material in the HybriD3 database">HybriD3 page ↗</a></div></td></tr>';
        }).join('') : '<tr><td colspan="5" class="small">No entry has these words.</td></tr>') + '</tbody>';
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
        '<header class="px-head"><div><div class="eyebrow">' + esc(host.name) + ' ' + esc(host.version) + '  ·  Databases</div><h1>Structure databases</h1></div>' +
        '<div class="tools"><button type="button" id="dbClose">Close</button></div></header>' +
        '<div class="db-main"><div class="seg" role="group" aria-label="Database">' + tabs.map((t) => '<button type="button" data-tab="' + t.id + '" aria-pressed="' + (ui.tab === t.id) + '">' + esc(t.tab) + '</button>').join('') + '</div>' +
        '<section class="card db-panel">' + (ui.tab === 'hybrid3' ? hybridPanel() : linkPanel(LINKS.find((L) => L.id === ui.tab))) + '</section></div></div>';
      if (ui.tab === 'hybrid3') drawTable();
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

    return { open, close, isOpen: () => !!ui.box, state: ui, data: () => db, origin: (info, count) => hybridOrigin(db, info, count) };
  }

  window.CrystaDatabases = { create, hillFormula, splitNames, namesOf, hybridOrigin };
})();
