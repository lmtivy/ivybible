// ── 搜索 ──────────────────────────────────────────────────────────────────
// 策略：逐卷按需加载，搜索已缓存的内容；未加载的卷动态加载后搜索
// 结果格式：[ { book, chapter, verse, text }, ... ]

import { BOOKS } from './data.js';
import { loadChapter } from './loader.js';

// 搜索单个版本的全文
// onProgress(bookIndex, total) 可用于显示进度
export async function search(version, query, onProgress) {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results = [];

  for (let i = 0; i < BOOKS.length; i++) {
    const book = BOOKS[i];
    onProgress?.(i, BOOKS.length);

    for (let ch = 1; ch <= book.chapters; ch++) {
      const verses = await loadChapter(version, book.file, ch);
      if (!verses) continue;

      for (const [vs, text] of Object.entries(verses)) {
        if (text.toLowerCase().includes(q)) {
          results.push({
            book,
            chapter: ch,
            verse: +vs,
            text,
            // 用于显示高亮的 snippet
            snippet: highlight(text, q),
          });
        }
      }
    }
  }

  return results;
}

// 在经文里把匹配的词用 <mark> 包起来
function highlight(text, query) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), m => `<mark>${m}</mark>`);
}
