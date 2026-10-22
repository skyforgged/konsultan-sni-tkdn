export interface ContentBlock {
  component: string;
  heading?: string;
  text?: string;
  content?: Array<{ text?: string; heading?: string; items?: string[] }>;
  items?: Array<string | { title?: string; text?: string; description?: string; question?: string; answer?: string }>;
  rows?: Array<string | { title?: string; text?: string }>;
  quote?: string;
  image?: string;
  imageAlt?: string;
}

const cleanInline = (value: string) => value
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
  .replace(/<https?:\/\/[^>]+>/g, '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .replace(/\*(.*?)\*/g, '$1')
  .replace(/_(.*?)_/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/~~(.*?)~~/g, '$1')
  .trim();

/** Converts Markdown source into reusable semantic component data before rendering. */
export function markdownToBlocks(source = ''): ContentBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ContentBlock[] = [];
  let heading = '';
  let paragraphs: string[] = [];
  let listItems: string[] = [];
  let listKind: 'ordered' | 'unordered' | null = null;
  let quoteLines: string[] = [];

  const flushParagraphs = () => {
    if (paragraphs.length) {
      const text = cleanInline(paragraphs.join(' '));
      if (text) blocks.push({ component: 'section', ...(heading ? { heading } : {}), content: [{ text }] });
      paragraphs = [];
      heading = '';
    }
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({
      component: listKind === 'ordered' ? 'steps' : 'checklist-card',
      ...(heading ? { heading } : {}),
      items: listItems.map((title, index) => ({ title, number: String(index + 1).padStart(2, '0') })),
    });
    listItems = [];
    listKind = null;
    heading = '';
  };
  const flushQuote = () => {
    if (quoteLines.length) {
      blocks.push({ component: 'quote', ...(heading ? { heading } : {}), quote: cleanInline(quoteLines.join(' ')), text: cleanInline(quoteLines.join(' ')) });
      quoteLines = [];
      heading = '';
    }
  };
  const flushAll = () => { flushParagraphs(); flushList(); flushQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || /^---+$/.test(line)) { flushAll(); continue; }
    const imageMatch = line.match(/^!\\[([^\\]]*)\\]\\(([^)]+)\\)$/);
    if (imageMatch) {
      flushAll();
      blocks.push({ component: 'image-panel', ...(heading ? { heading } : {}), image: imageMatch[2], imageAlt: cleanInline(imageMatch[1]) });
      heading = '';
      continue;
    }
    const headingMatch = line.match(/^#{2,6}\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      heading = cleanInline(headingMatch[1]);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushParagraphs(); flushList();
      quoteLines.push(line.replace(/^>\s?/, ''));
      continue;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraphs(); flushQuote();
      const nextKind = ordered ? 'ordered' : 'unordered';
      if (listKind && listKind !== nextKind) flushList();
      listKind = nextKind;
      listItems.push(cleanInline((ordered ?? unordered)![1]));
      continue;
    }
    if (/^\|.*\|$/.test(line) && lines[i + 1]?.trim().match(/^\|?\s*:?-{3,}/)) {
      flushAll();
      const header = line.split('|').slice(1, -1).map(cleanInline);
      i++;
      const rows: Array<{ title: string; text: string }> = [];
      while (i + 1 < lines.length && /^\|.*\|$/.test(lines[i + 1].trim())) {
        const cells = lines[++i].trim().split('|').slice(1, -1).map(cleanInline);
        rows.push({ title: cells[0] ?? '', text: cells.slice(1).join(' · ') });
      }
      blocks.push({ component: 'table', ...(heading ? { heading } : {}), content: [{ heading: header.join(' · ') }], rows });
      heading = '';
      continue;
    }
    flushList(); flushQuote();
    paragraphs.push(line);
  }
  flushAll();
  return blocks;
}
