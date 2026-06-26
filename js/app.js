import { BOOKS, VERSIONS, DEFAULT_LEFT, DEFAULT_RIGHT } from './data.js';
import { loadChapter } from './loader.js';
import { addBookmark, removeBookmark, hasBookmark, getBookmarks } from './bookmark.js';
import { search } from './search.js';

// ── 状态 ──────────────────────────────────────────────────────────────────
const state = {
  screen: 'book',          // book | chapter | reader | bookmark | search
  book: null,
  chapter: 1,
  leftVersion:  DEFAULT_LEFT,
  rightVersion: DEFAULT_RIGHT,
  searchQuery: '',
  searchResults: [],
  searchRunning: false,
};

// ── 工具 ──────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
  window.scrollTo(0, 0);
  state.screen = screenId.replace('screen-', '');
}

function setLoading(v) {
  $('loading').classList.toggle('show', v);
}

function setError(msg) {
  const el = $('error-msg');
  el.innerHTML = msg;
  el.classList.toggle('show', !!msg);
}

// ── 版本选择器 ────────────────────────────────────────────────────────────
function buildVersionSelectors() {
  ['left', 'right'].forEach(side => {
    const sel = $(`sel-${side}`);
    sel.innerHTML = '';
    VERSIONS.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.label;
      sel.appendChild(opt);
    });
    sel.value = side === 'left' ? state.leftVersion : state.rightVersion;
    sel.onchange = () => {
      if (side === 'left') state.leftVersion = sel.value;
      else state.rightVersion = sel.value;
      if (state.screen === 'reader') renderVerses();
    };
  });
}

// ── 书卷列表 ──────────────────────────────────────────────────────────────
function buildBookList() {
  ['ot', 'nt'].forEach(t => {
    const grid = $(`${t}-grid`);
    grid.innerHTML = '';
    BOOKS.filter(b => b.t === t).forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'book-btn';
      btn.innerHTML = `<span class="zh">${b.zh}</span><span class="en">${b.en}</span>`;
      btn.onclick = () => selectBook(b);
      grid.appendChild(btn);
    });
  });
}

function selectBook(book) {
  state.book = book;
  state.chapter = 1;
  $('chapter-title').textContent = `${book.zh}  ·  ${book.en}`;
  buildChapterGrid(book);
  show('screen-chapter');
  updateTopbar();
}

// ── 章节列表 ──────────────────────────────────────────────────────────────
function buildChapterGrid(book) {
  const grid = $('chapter-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= book.chapters; i++) {
    const btn = document.createElement('button');
    btn.className = 'chap-btn';
    btn.textContent = i;
    btn.onclick = () => loadReader(i);
    grid.appendChild(btn);
  }
}

// ── 阅读器 ────────────────────────────────────────────────────────────────
export async function loadReader(chapter) {
  state.chapter = chapter;
  show('screen-reader');
  setError('');
  setLoading(true);
  updateTopbar();
  updateReaderNav();
  updateBookmarkBtn();
  $('verses-container').innerHTML = '';

  try {
    const [leftVerses, rightVerses] = await Promise.all([
      loadChapter(state.leftVersion,  state.book.file, chapter),
      loadChapter(state.rightVersion, state.book.file, chapter),
    ]);

    if (!leftVerses && !rightVerses) {
      setError('找不到该章节的内容，请确认 data/ 文件夹中已放入对应版本的文件。');
      return;
    }

    renderVerses(leftVerses, rightVerses);
  } catch (e) {
    setError(`加载失败：${e.message}`);
  } finally {
    setLoading(false);
  }
}

async function renderVerses() {
  setLoading(true);
  setError('');
  const [leftVerses, rightVerses] = await Promise.all([
    loadChapter(state.leftVersion,  state.book.file, state.chapter),
    loadChapter(state.rightVersion, state.book.file, state.chapter),
  ]);
  setLoading(false);

  const container = $('verses-container');
  container.innerHTML = '';

  const allNums = new Set([
    ...Object.keys(leftVerses  ?? {}),
    ...Object.keys(rightVerses ?? {}),
  ]);
  const nums = [...allNums].map(Number).sort((a, b) => a - b);

  nums.forEach(n => {
    const left  = leftVerses?.[n]  ?? '';
    const right = rightVerses?.[n] ?? '';
    const block = document.createElement('div');
    block.className = 'verse-block';
    block.dataset.verse = n;
    block.innerHTML = `
      <div class="verse-num">${n}</div>
      <div class="verse-texts">
        ${left  ? `<div class="verse-left">${left}</div>`   : ''}
        ${right ? `<div class="verse-right">${right}</div>` : ''}
      </div>`;
    container.appendChild(block);
  });
}

function updateReaderNav() {
  const { book, chapter } = state;
  $('btn-prev').disabled  = chapter <= 1;
  $('btn-next').disabled  = chapter >= book.chapters;
  $('btn-chap-label').textContent = `第 ${chapter} 章`;
}

export function changeChapter(delta) {
  const next = state.chapter + delta;
  if (next < 1 || next > state.book.chapters) return;
  loadReader(next);
}

export function showChapters() {
  show('screen-chapter');
  updateTopbar();
}

// ── 书签按钮 ──────────────────────────────────────────────────────────────
function updateBookmarkBtn() {
  const btn = $('btn-bookmark');
  const saved = hasBookmark(state.book.id, state.chapter);
  btn.textContent = saved ? '★' : '☆';
  btn.title = saved ? '取消收藏' : '收藏本章';
}

export function toggleBookmark() {
  const { book, chapter } = state;
  const label = `${book.zh} 第${chapter}章`;
  if (hasBookmark(book.id, chapter)) {
    removeBookmark(book.id, chapter);
  } else {
    addBookmark(book.id, chapter, label);
  }
  updateBookmarkBtn();
  // 如果书签列表正在显示，刷新它
  if ($('screen-bookmark').classList.contains('active')) renderBookmarks();
}

// ── 书签列表 ──────────────────────────────────────────────────────────────
export function showBookmarks() {
  renderBookmarks();
  show('screen-bookmark');
  updateTopbar();
}

function renderBookmarks() {
  const list = getBookmarks();
  const container = $('bookmark-list');
  if (!list.length) {
    container.innerHTML = '<p class="empty-tip">还没有收藏。阅读时点右上角 ☆ 收藏章节。</p>';
    return;
  }
  container.innerHTML = '';
  list.forEach(bm => {
    const book = BOOKS.find(b => b.id === bm.bookId);
    if (!book) return;
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.innerHTML = `
      <div class="bm-label">${bm.label}</div>
      <div class="bm-actions">
        <button class="bm-go">前往</button>
        <button class="bm-del">删除</button>
      </div>`;
    item.querySelector('.bm-go').onclick = () => {
      state.book = book;
      loadReader(bm.chapter);
    };
    item.querySelector('.bm-del').onclick = () => {
      removeBookmark(bm.bookId, bm.chapter);
      renderBookmarks();
    };
    container.appendChild(item);
  });
}

// ── 搜索 ──────────────────────────────────────────────────────────────────
export function showSearch() {
  show('screen-search');
  updateTopbar();
  $('search-input').focus();
}

export async function runSearch() {
  const q = $('search-input').value.trim();
  if (!q || state.searchRunning) return;

  state.searchQuery = q;
  state.searchRunning = true;
  $('search-results').innerHTML = '';
  $('search-progress').textContent = '搜索中…';
  $('btn-search-run').disabled = true;

  // 只搜左侧版本
  const results = await search(state.leftVersion, q, (i, total) => {
    const pct = Math.round((i / total) * 100);
    $('search-progress').textContent = `搜索中… ${pct}%`;
  });

  state.searchResults = results;
  state.searchRunning = false;
  $('btn-search-run').disabled = false;
  $('search-progress').textContent = results.length
    ? `共找到 ${results.length} 处`
    : '未找到相关经文';

  renderSearchResults(results);
}

function renderSearchResults(results) {
  const container = $('search-results');
  container.innerHTML = '';
  results.slice(0, 200).forEach(r => {  // 最多显示200条
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <div class="sr-ref">${r.book.zh} ${r.chapter}:${r.verse}</div>
      <div class="sr-text">${r.snippet}</div>`;
    item.onclick = () => {
      state.book = r.book;
      loadReader(r.chapter).then(() => {
        // 跳到对应节
        const el = document.querySelector(`[data-verse="${r.verse}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    container.appendChild(item);
  });
}

// ── 顶栏 ──────────────────────────────────────────────────────────────────
function updateTopbar() {
  const { screen, book, chapter } = state;
  const title = $('topbar-title');
  const btnHome = $('btn-home');
  const btnBm   = $('btn-bm-icon');
  const btnSr   = $('btn-sr-icon');

  if (screen === 'book') {
    title.textContent = '圣经 · Holy Bible';
    btnHome.style.display = 'none';
  } else if (screen === 'chapter') {
    title.textContent = book?.zh ?? '';
    btnHome.style.display = '';
  } else if (screen === 'reader') {
    title.textContent = `${book?.zh} 第${chapter}章`;
    btnHome.style.display = '';
  } else if (screen === 'bookmark') {
    title.textContent = '我的收藏';
    btnHome.style.display = '';
  } else if (screen === 'search') {
    title.textContent = '搜索';
    btnHome.style.display = '';
  }
}

// ── 首页导航 ──────────────────────────────────────────────────────────────
export function goHome() {
  show('screen-book');
  updateTopbar();
}

// ── 初始化 ────────────────────────────────────────────────────────────────
export function init() {
  buildVersionSelectors();
  buildBookList();
}
