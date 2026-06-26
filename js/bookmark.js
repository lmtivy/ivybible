// ── 书签 ──────────────────────────────────────────────────────────────────
// 存储格式（localStorage key: "bible_bookmarks"）：
// [ { bookId, chapter, label, ts }, ... ]

const STORAGE_KEY = 'bible_bookmarks';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// 添加书签；同一位置已存在则不重复添加，返回是否成功
export function addBookmark(bookId, chapter, label) {
  const list = load();
  const exists = list.some(b => b.bookId === bookId && b.chapter === chapter);
  if (exists) return false;
  list.unshift({ bookId, chapter, label, ts: Date.now() });
  save(list);
  return true;
}

// 删除书签
export function removeBookmark(bookId, chapter) {
  save(load().filter(b => !(b.bookId === bookId && b.chapter === chapter)));
}

// 查询某位置是否已收藏
export function hasBookmark(bookId, chapter) {
  return load().some(b => b.bookId === bookId && b.chapter === chapter);
}

// 获取全部书签（最新在前）
export function getBookmarks() {
  return load();
}
