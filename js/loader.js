// ── 解析 txt 格式 ─────────────────────────────────────────────────────────
// 格式：每行 "章.节 经文"，例如 "1.1 起初神创造天地。"
// 返回：{ 1: { 1: "经文", 2: "经文" }, 2: { ... } }
function parseTxt(text) {
  const result = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d+)\.(\d+)\s+(.+)/);
    if (!m) continue;
    const ch = +m[1], vs = +m[2], content = m[3].trim();
    if (!result[ch]) result[ch] = {};
    result[ch][vs] = content;
  }
  return result;
}

// ── 缓存 ──────────────────────────────────────────────────────────────────
// key: "version/file"  value: parsed object
const cache = {};

// ── 主入口 ────────────────────────────────────────────────────────────────
// 返回指定版本、书卷、章的经节 Map：{ 1: "经文", 2: "经文", ... }
// 如果该版本没有对应文件，返回 null
export async function loadChapter(version, bookFile, chapter) {
  const key = `${version}/${bookFile}`;

  if (!cache[key]) {
    const url = `data/${version}/${bookFile}.txt`;
    const res = await fetch(url);
    if (!res.ok) return null;          // 文件不存在时静默返回 null
    const text = await res.text();
    cache[key] = parseTxt(text);
  }

  return cache[key][chapter] ?? null;  // 返回该章，章不存在时返回 null
}

// 清空缓存（目前用不到，留着备用）
export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k]);
}
