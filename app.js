/* ================================================
   DIÁRIO DE LEITURA — App Logic (Journal v2)
   ================================================ */

'use strict';

// ── Storage ──────────────────────────────────────
const STORAGE_KEY = 'diario-leitura-books';
const SETTINGS_KEY = 'diario-leitura-settings';

function loadBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { bg: '#fae8e8', font: "'Caveat', cursive" }; }
  catch { return { bg: '#fae8e8', font: "'Caveat', cursive" }; }
}
function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

let books = loadBooks();
let settings = loadSettings();

// ── Apply Settings ────────────────────────────────
function applySettings() {
  document.documentElement.style.setProperty('--journal-bg', settings.bg);
  document.documentElement.style.setProperty('--journal-font', settings.font);
}
applySettings();

// ── State ─────────────────────────────────────────
let activeFilter = 'all';
let activeView   = 'grid';
let activeSort   = 'date-added-desc';
let searchQuery  = '';
let currentJournalId = null;

// Journal Form State
let jData = {
  rating: 0,
  romance: 0,
  spice: 0,
  sadness: 0,
  plot: 0,
  chars: 0,
  style: 0,
  ending: 0,
  cover: null
};

// ── DOM refs ──────────────────────────────────────
const mainContent     = document.getElementById('main-content');
const searchInput     = document.getElementById('search-input');
const sortSelect      = document.getElementById('sort-select');
const filterBtns      = document.querySelectorAll('#filter-status .filter-btn');
const viewGridBtn     = document.getElementById('view-grid');
const viewListBtn     = document.getElementById('view-list');

const toast           = document.getElementById('toast');

// Customizer
const btnSettings     = document.getElementById('btn-settings');
const settingsOverlay = document.getElementById('settings-overlay');
const btnCloseSettings= document.getElementById('btn-close-settings');
const settingsColors  = document.querySelectorAll('.color-btn');
const customColorInput= document.getElementById('custom-color-input');
const settingsFont    = document.getElementById('settings-font');

// Journal Modal
const journalOverlay  = document.getElementById('journal-overlay');
const journalPage     = document.getElementById('journal-page');
const btnCloseJournal = document.getElementById('btn-close-journal');

// Journal Actions
const actView         = document.getElementById('journal-actions-view');
const actEdit         = document.getElementById('journal-actions-edit');
const btnJEdit        = document.getElementById('btn-j-edit');
const btnJDelete      = document.getElementById('btn-j-delete');
const btnJCancel      = document.getElementById('btn-j-cancel');
const btnJSave        = document.getElementById('btn-j-save');

const btnOpenForm     = document.getElementById('btn-open-form');

// Confirm Delete
const confirmOverlay  = document.getElementById('confirm-overlay');
const btnConfirmOk    = document.getElementById('btn-confirm-ok');
const btnConfirmCancel= document.getElementById('btn-confirm-cancel');

// Helpers
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function starsHTML(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= rating ? ' filled' : ''}">★</span>`;
  }
  return html;
}
function badgeClass(status) {
  return { reading: 'badge-reading', done: 'badge-done', want: 'badge-want', dropped: 'badge-dropped' }[status] || '';
}
function badgeLabel(status) {
  return { reading: '📖 Lendo', done: '✅ Concluído', want: '🔖 Quero ler', dropped: '❌ Abandonado' }[status] || status;
}
function mediaLabel(media) {
  return { physical: '📚 Físico', digital: '📱 Digital', audio: '🎧 Audiobook' }[media] || media;
}
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getRadioVal(name) {
  const r = document.querySelector(`input[name="${name}"]:checked`);
  return r ? r.value : null;
}
function setRadioVal(name, val) {
  const r = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (r) r.checked = true;
  else {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => el.checked = false);
  }
}

// ── Interactivity bindings ────────────────────────

// Customizer
const customFontGroup= document.getElementById('custom-font-group');
const customFontInput= document.getElementById('custom-font-input');

if (settings.font && !["'Caveat', cursive", "'Playfair Display', serif", "'Inter', sans-serif", "'Comic Sans MS', 'Sniglet', cursive"].includes(settings.font)) {
  settingsFont.value = "custom";
  customFontGroup.style.display = "block";
  customFontInput.value = settings.font;
} else {
  settingsFont.value = settings.font;
}

btnSettings.addEventListener('click', () => settingsOverlay.classList.add('open'));
btnCloseSettings.addEventListener('click', () => settingsOverlay.classList.remove('open'));
function updateColorActiveState() {
  settingsColors.forEach(btn => {
    if (btn.dataset.color === settings.bg) {
      btn.style.borderColor = '#333';
      btn.style.transform = 'scale(1.1)';
    } else {
      btn.style.borderColor = 'transparent';
      btn.style.transform = 'scale(1)';
    }
  });
  if (settings.bg && settings.bg.startsWith('#')) {
    customColorInput.value = settings.bg;
  }
}
updateColorActiveState();

customColorInput.addEventListener('input', () => {
  settings.bg = customColorInput.value;
  applySettings();
  saveSettings(settings);
  updateColorActiveState();
});

settingsColors.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.bg = btn.dataset.color;
    applySettings();
    saveSettings(settings);
    updateColorActiveState();
  });
});

settingsFont.addEventListener('change', () => {
  if (settingsFont.value === 'custom') {
    customFontGroup.style.display = 'block';
    settings.font = customFontInput.value.trim() || 'sans-serif';
  } else {
    customFontGroup.style.display = 'none';
    settings.font = settingsFont.value;
  }
  applySettings();
  saveSettings(settings);
});

customFontInput.addEventListener('input', () => {
  if (settingsFont.value === 'custom') {
    settings.font = customFontInput.value.trim() || 'sans-serif';
    applySettings();
    saveSettings(settings);
  }
});

// Toast
let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ''; }, 3000);
}

// Stats
function updateStats() {
  const total   = books.length;
  const done    = books.filter(b => b.status === 'done').length;
  const reading = books.filter(b => b.status === 'reading').length;
  const want    = books.filter(b => b.status === 'want').length;
  const rated   = books.filter(b => b.rating > 0);
  const avg     = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '—';

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-reading').textContent = reading;
  document.getElementById('stat-want').textContent    = want;
  document.getElementById('stat-avg').textContent     = avg;
}

// Render grid/list
function render() {
  updateStats();
  let result = [...books];
  if (activeFilter !== 'all') result = result.filter(b => b.status === activeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
  }
  result.sort((a, b) => {
    switch (activeSort) {
      case 'date-added-asc':  return a.createdAt - b.createdAt;
      case 'date-added-desc': return b.createdAt - a.createdAt;
      case 'title':           return (a.title || '').localeCompare((b.title || ''), 'pt');
      case 'author':          return (a.author || '').localeCompare((b.author || ''), 'pt');
      case 'rating-desc':     return (b.rating || 0) - (a.rating || 0);
      case 'end-date-desc':
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return b.endDate.localeCompare(a.endDate);
      default: return 0;
    }
  });

  if (books.length === 0) {
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <div class="empty-title">Seu diário está vazio</div>
        <div class="empty-sub">Clique em "Adicionar livro" para começar sua jornada literária.</div>
      </div>`;
    return;
  }
  if (result.length === 0) {
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">Nenhum livro encontrado</div>
      </div>`;
    return;
  }

  if (activeView === 'grid') {
    mainContent.innerHTML = `<div class="books-grid" id="books-grid">${result.map(cardHTML).join('')}</div>`;
  } else {
    mainContent.innerHTML = `<div class="books-list" id="books-list">${result.map(rowHTML).join('')}</div>`;
  }

  document.querySelectorAll('.book-card, .book-row').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
      openJournal(el.dataset.id, 'view');
    });
  });
  document.querySelectorAll('.icon-btn.edit-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openJournal(btn.dataset.id, 'edit'); });
  });
  document.querySelectorAll('.icon-btn.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); askDelete(btn.dataset.id); });
  });
}

function cardHTML(book) {
  const coverPart = book.cover
    ? `<img src="${book.cover}" alt="Capa" loading="lazy" />`
    : `<div class="cover-placeholder">📖<span>Sem capa</span></div>`;
  return `
  <article class="book-card" data-id="${book.id}">
    <div class="book-cover-wrap">
      ${coverPart}
      <span class="card-badge ${badgeClass(book.status)}">${badgeLabel(book.status)}</span>
      <div class="card-actions">
        <button class="icon-btn edit-btn" data-id="${book.id}">✏️</button>
        <button class="icon-btn delete-btn" data-id="${book.id}">🗑</button>
      </div>
    </div>
    <div class="book-info">
      <div class="book-title">${escHtml(book.title)}</div>
      <div class="book-author">${escHtml(book.author)}</div>
      <div class="card-stars">${starsHTML(book.rating)}</div>
    </div>
  </article>`;
}

function rowHTML(book) {
  const thumbPart = book.cover
    ? `<img class="row-thumb" src="${book.cover}" alt="Capa" loading="lazy" />`
    : `<div class="row-thumb-placeholder">📖</div>`;
  return `
  <article class="book-row" data-id="${book.id}">
    ${thumbPart}
    <div class="row-main">
      <div class="row-title">${escHtml(book.title)}</div>
      <div class="row-author">${escHtml(book.author)}</div>
      <div class="row-meta">
        <span class="card-badge row-badge ${badgeClass(book.status)}">${badgeLabel(book.status)}</span>
        <span style="font-size:.75rem;color:var(--text-muted)">${mediaLabel(book.media)}</span>
      </div>
    </div>
    <div class="row-right">
      <div class="row-stars">${starsHTML(book.rating)}</div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button class="icon-btn edit-btn" data-id="${book.id}" style="width:26px;height:26px;font-size:.75rem">✏️</button>
        <button class="icon-btn delete-btn" data-id="${book.id}" style="width:26px;height:26px;font-size:.75rem">🗑</button>
      </div>
    </div>
  </article>`;
}

// ── Journal Ratings Config ────────────────────────
function bindRating(containerId, dataKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const spans = container.querySelectorAll('span');
  const dEmpty = container.dataset.empty || "☆";
  const dFill  = container.dataset.fill || "★";

  function sync(val) {
    if (journalPage.dataset.mode === 'view') {
      spans.forEach((s, idx) => {
        s.textContent = idx < val ? dFill : dEmpty;
        s.className = idx < val ? 'active' : (dEmpty !== '☆' ? 'dim' : '');
      });
    } else {
      spans.forEach((s, idx) => {
        s.textContent = idx < val ? dFill : dEmpty;
        s.className = idx < val ? 'active' : (dEmpty !== '☆' ? 'dim' : '');
      });
    }
  }

  spans.forEach((s, idx) => {
    s.addEventListener('click', () => {
      if (journalPage.dataset.mode === 'view') return;
      jData[dataKey] = idx + 1;
      sync(jData[dataKey]);
    });
    s.addEventListener('mouseover', () => {
      if (journalPage.dataset.mode === 'view') return;
      sync(idx + 1);
    });
  });
  container.addEventListener('mouseleave', () => {
    if (journalPage.dataset.mode === 'view') return;
    sync(jData[dataKey]);
  });
  
  // Public update method
  return (val) => { jData[dataKey] = val; sync(val); };
}

const uMainRating = bindRating('j-main-rating', 'rating');
const uRomance    = bindRating('j-romance-rating', 'romance');
const uSpice      = bindRating('j-spice-rating', 'spice');
const uSadness    = bindRating('j-sadness-rating', 'sadness');
const uPlot       = bindRating('j-plot-rating', 'plot');
const uChars      = bindRating('j-chars-rating', 'chars');
const uStyle      = bindRating('j-style-rating', 'style');
const uEnding     = bindRating('j-ending-rating', 'ending');

function resetRatings() {
  uMainRating(0); uRomance(0); uSpice(0); uSadness(0);
  uPlot(0); uChars(0); uStyle(0); uEnding(0);
}

// ── Journal Modal Logic ───────────────────────────
function openJournal(id = null, mode = 'view') {
  currentJournalId = id;
  const book = books.find(b => b.id === id);

  if (!book && mode === 'view') mode = 'edit'; // force edit if new
  
  journalPage.dataset.mode = mode;
  
  if (mode === 'edit') {
    actView.style.display = 'none';
    actEdit.style.display = 'flex';
  } else {
    actView.style.display = 'flex';
    actEdit.style.display = 'none';
  }

  // Populate data
  if (book) {
    document.getElementById('j-id').value       = book.id;
    document.getElementById('j-title').value    = book.title || '';
    document.getElementById('jv-title').textContent = book.title || '';
    
    document.getElementById('j-author').value   = book.author || '';
    document.getElementById('jv-author').textContent = book.author || '';
    
    document.getElementById('j-pages').value    = book.pages || '';
    document.getElementById('jv-pages').textContent = book.pages || '';
    
    setRadioVal('jFormat', book.media);
    document.getElementById('jv-format').textContent = {physical:'📚',digital:'📱',audio:'🎧'}[book.media] || '';
    document.getElementById('jv-format').style.display = book.media ? 'block' : 'none';

    document.getElementById('j-start').value    = book.startDate || '';
    document.getElementById('jv-start').textContent = fmtDate(book.startDate);
    document.getElementById('j-end').value      = book.endDate || '';
    document.getElementById('jv-end').textContent   = fmtDate(book.endDate);
    
    setRadioVal('jFeelings', book.feelings);
    const feelInput = document.querySelector(`input[name="jFeelings"][value="${book.feelings}"]`);
    document.getElementById('jv-feelings').textContent = feelInput ? feelInput.parentNode.textContent.trim() : '';
    document.getElementById('jv-feelings').style.display = feelInput ? 'block' : 'none';
    
    document.getElementById('j-char-best').value    = book.charBest || '';
    document.getElementById('jv-char-best').textContent = book.charBest || '';
    document.getElementById('j-char-worst').value   = book.charWorst || '';
    document.getElementById('jv-char-worst').textContent = book.charWorst || '';
    
    document.getElementById('j-notes').value    = book.notes || '';
    document.getElementById('jv-notes').textContent = book.notes || '';
    
    document.getElementById('j-status').value   = book.status || 'want';
    document.getElementById('jv-status').textContent = badgeLabel(book.status || 'want');

    // ratings
    uMainRating(book.rating || 0);
    uRomance(book.romance || 0);
    uSpice(book.spice || 0);
    uSadness(book.sadness || 0);
    uPlot(book.plot || 0);
    uChars(book.chars || 0);
    uStyle(book.style || 0);
    uEnding(book.ending || 0);

    // cover
    if (book.cover) {
      jData.cover = book.cover;
      document.getElementById('j-cover-img').src = book.cover;
      document.getElementById('j-cover-img').style.display = 'block';
      document.getElementById('j-cover-text').style.display = 'none';
      if (mode === 'edit') document.getElementById('btn-j-remove-cover').style.display = 'block';
    } else {
      clearCover();
    }
  } else {
    // New
    document.getElementById('journal-form').reset();
    document.getElementById('j-id').value = '';
    ['jv-title','jv-author','jv-pages','jv-format','jv-start','jv-end','jv-feelings','jv-char-best','jv-char-worst','jv-notes','jv-status'].forEach(id => {
      document.getElementById(id).textContent = '';
      if (id==='jv-format' || id==='jv-feelings') document.getElementById(id).style.display = 'none';
    });
    document.getElementById('j-status').value = 'want';
    resetRatings();
    clearCover();
  }

  journalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeJournal() {
  journalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function clearCover() {
  jData.cover = null;
  document.getElementById('j-cover-img').src = '';
  document.getElementById('j-cover-img').style.display = 'none';
  document.getElementById('j-cover-text').style.display = 'block';
  document.getElementById('btn-j-remove-cover').style.display = 'none';
  document.getElementById('j-cover-input').value = '';
}

// Cover logic
const handleCoverFile = (file) => {
  if (file && file.type.startsWith('image/')) {
    const r = new FileReader();
    r.onload = ev => {
      jData.cover = ev.target.result;
      document.getElementById('j-cover-img').src = jData.cover;
      document.getElementById('j-cover-img').style.display = 'block';
      document.getElementById('j-cover-text').style.display = 'none';
      document.getElementById('btn-j-remove-cover').style.display = 'block';
    };
    r.readAsDataURL(file);
  }
};

document.getElementById('j-cover-input').addEventListener('change', e => {
  if (journalPage.dataset.mode === 'view') return;
  handleCoverFile(e.target.files[0]);
});

const coverBox = document.getElementById('j-cover-box');
['dragover', 'dragenter'].forEach(ev => {
  coverBox.addEventListener(ev, e => {
    e.preventDefault();
    if (journalPage.dataset.mode === 'view') return;
    coverBox.style.borderColor = 'rgba(0,0,0,0.6)';
    coverBox.style.background = 'rgba(255,255,255,0.9)';
  });
});
['dragleave', 'drop'].forEach(ev => {
  coverBox.addEventListener(ev, e => {
    e.preventDefault();
    if (journalPage.dataset.mode === 'view') return;
    coverBox.style.borderColor = '';
    coverBox.style.background = '';
    if (ev === 'drop') {
      handleCoverFile(e.dataTransfer.files[0]);
    }
  });
});
document.getElementById('btn-j-remove-cover').addEventListener('click', e => {
  e.stopPropagation();
  clearCover();
});
// Hide remove button in view mode, managed by css partially but also explicitly hide if returning to view
coverBox.addEventListener('mouseenter', () => {
  if (journalPage.dataset.mode === 'edit' && jData.cover) {
    document.getElementById('btn-j-remove-cover').style.display = 'block';
  }
});
coverBox.addEventListener('mouseleave', () => {
  document.getElementById('btn-j-remove-cover').style.display = 'none';
});

// Save logic
btnJSave.addEventListener('click', () => {
  const title = document.getElementById('j-title').value.trim();
  if (!title) { showToast('O Título é obrigatório!', 'error'); return; }

  const id = document.getElementById('j-id').value || uid();
  const existing = books.find(b => b.id === id);

  const book = {
    id,
    title,
    author: document.getElementById('j-author').value.trim(),
    pages: document.getElementById('j-pages').value.trim(),
    media: getRadioVal('jFormat') || 'physical',
    startDate: document.getElementById('j-start').value,
    endDate: document.getElementById('j-end').value,
    feelings: getRadioVal('jFeelings'),
    charBest: document.getElementById('j-char-best').value.trim(),
    charWorst: document.getElementById('j-char-worst').value.trim(),
    notes: document.getElementById('j-notes').value.trim(),
    status: document.getElementById('j-status').value,
    cover: jData.cover,
    rating: jData.rating,
    romance: jData.romance,
    spice: jData.spice,
    sadness: jData.sadness,
    plot: jData.plot,
    chars: jData.chars,
    style: jData.style,
    ending: jData.ending,
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now()
  };

  if (existing) {
    books = books.map(b => b.id === id ? book : b);
    showToast('Ficha atualizada!');
  } else {
    books.unshift(book);
    showToast('Ficha salva! 📚');
  }

  saveBooks(books);
  
  // Transition back to view mode if saving an edit
  openJournal(id, 'view');
  render();
});

// Journal Actions
btnJCancel.addEventListener('click', () => {
  if (currentJournalId) openJournal(currentJournalId, 'view');
  else closeJournal();
});
btnJEdit.addEventListener('click', () => {
  openJournal(currentJournalId, 'edit');
});
btnJDelete.addEventListener('click', () => askDelete(currentJournalId));
btnCloseJournal.addEventListener('click', closeJournal);
btnOpenForm.addEventListener('click', () => openJournal(null, 'edit'));

// Delete
function askDelete(id) {
  pendingDeleteId = id;
  confirmOverlay.classList.add('open');
}
function closeConfirm() {
  confirmOverlay.classList.remove('open');
  pendingDeleteId = null;
}
btnConfirmCancel.addEventListener('click', closeConfirm);
btnConfirmOk.addEventListener('click', () => {
  if (!pendingDeleteId) return;
  books = books.filter(b => b.id !== pendingDeleteId);
  saveBooks(books);
  closeConfirm();
  closeJournal();
  render();
  showToast('Livro excluído.', 'error');
});

// Overlays
journalOverlay.addEventListener('click', e => { if (e.target === journalOverlay) closeJournal(); });
settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('open'); });
confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) closeConfirm(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (confirmOverlay.classList.contains('open')) { closeConfirm(); return; }
    if (settingsOverlay.classList.contains('open')) { settingsOverlay.classList.remove('open'); return; }
    if (journalOverlay.classList.contains('open')) { closeJournal(); return; }
  }
});

// Filters & Sort
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
  });
});
sortSelect.addEventListener('change', () => {
  activeSort = sortSelect.value;
  render();
});
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  render();
});
viewGridBtn.addEventListener('click', () => {
  activeView = 'grid';
  viewGridBtn.classList.add('active');
  viewListBtn.classList.remove('active');
  render();
});
viewListBtn.addEventListener('click', () => {
  activeView = 'list';
  viewListBtn.classList.add('active');
  viewGridBtn.classList.remove('active');
  render();
});

// Go
render();
