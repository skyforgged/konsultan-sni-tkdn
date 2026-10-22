import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.resolve('src/content');
const contentDirs = ['articles', 'pages', 'services'];
const files = [];
const failures = [];
let publishedFilesChecked = 0;

for (const directory of contentDirs) {
  await collectMarkdown(path.join(contentRoot, directory));
}

const placeholderPatterns = [
  { label: 'Lorem ipsum placeholder', pattern: /lorem\s+ipsum/i },
  { label: 'TODO marker', pattern: /\bTODO\b/i },
  { label: 'FIXME marker', pattern: /\bFIXME\b/i },
  { label: 'example.com placeholder domain', pattern: /\bexample\.com\b/i },
  { label: 'placeholder text', pattern: /\bplaceholder\b/i },
  { label: 'generic fill-in instruction', pattern: /\bisi di sini\b/i },
  { label: 'generic company-name placeholder', pattern: /\bnama perusahaan anda\b/i },
  { label: 'generic WhatsApp-number placeholder', pattern: /\bnomor whatsapp\b/i },
];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const relativePath = path.relative(process.cwd(), file).split(path.sep).join('/');
  const dateFields = ['pubDate', 'updatedDate'];
  const utcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  const dateValues = {};
  for (const field of dateFields) {
    const match = source.match(new RegExp('^' + field + ':\\s*["\']?([^"\'\r\n]+)', 'm'));
    if (!match || !utcTimestampPattern.test(match[1].trim())) {
      failures.push(relativePath + ': ' + field + ' must use UTC ISO format YYYY-MM-DDTHH:mm:ssZ without milliseconds');
    } else {
      dateValues[field] = match[1].trim();
    }
  }
  if (dateValues.pubDate && dateValues.updatedDate && dateValues.updatedDate < dateValues.pubDate) {
    failures.push(relativePath + ': updatedDate must not be earlier than pubDate');
  }
  if (dateValues.pubDate && dateValues.updatedDate && dateValues.updatedDate === dateValues.pubDate) {
    failures.push(relativePath + ': updatedDate must not equal pubDate (use a non-midnight time so descending sort works)');
  }
  if (/^draft:\s*true\s*$/im.test(source)) continue;
  publishedFilesChecked++;
  for (const { label, pattern } of placeholderPatterns) {
    const match = pattern.exec(source);
    if (match) failures.push(relativePath + ': ' + label + ' detected (' + JSON.stringify(match[0]) + ')');
  }
}

if (failures.length > 0) {
  console.error(`Published content quality check failed: ${failures.length} issue(s) across ${publishedFilesChecked} published Markdown files.\n`);
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Published content quality check passed: ${publishedFilesChecked} published Markdown files checked; draft files excluded.`);
}

async function collectMarkdown(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectMarkdown(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
  }
}
