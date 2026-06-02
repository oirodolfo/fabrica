import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

const SOURCE_DIRECTORY = 'src';
const DOCS_API_FILE = 'docs/content/en/api/generated.mdx';
const DOCS_EXAMPLES_FILE = 'docs/content/en/examples/generated.mdx';
const EXPORTED_DECLARATION_PATTERN = /\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function|interface|type|const|class)\s+([A-Za-z_$][\w$]*)/g;
const EXAMPLE_TAG_PATTERN = /@example\s*([\s\S]*?)(?=\n\s*\*\s*@(?:remarks|param|returns|example|defaultValue|public|private|internal|deprecated)|$)/g;

interface ApiDocEntry {
  readonly comment: string;
  readonly examples: readonly string[];
  readonly filePath: string;
  readonly name: string;
  readonly summary: string;
}

/* ────────────────────────────────────────────────────────────────────────── *\
 * TSDoc extraction
\* ────────────────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const sourceFiles = ['css.ts', 'html.ts', 'template.ts'].map((fileName) =>
    join(SOURCE_DIRECTORY, fileName),
  );
  const entries = (await Promise.all(sourceFiles.map(readApiDocs))).flat();

  await mkdir('docs/content/en/api', { recursive: true });
  await mkdir('docs/content/en/examples', { recursive: true });
  await writeFile(DOCS_API_FILE, renderApiDocs(entries));
  await writeFile(DOCS_EXAMPLES_FILE, renderExampleDocs(entries));

  console.log(`✨ Generated ${entries.length} API entries from TSDoc comments.`);
}

async function readApiDocs(filePath: string): Promise<ApiDocEntry[]> {
  const source = await readFile(filePath, 'utf8');
  const entries: ApiDocEntry[] = [];

  for (const match of source.matchAll(EXPORTED_DECLARATION_PATTERN)) {
    const rawComment = match[0].slice(0, match[0].lastIndexOf('export')).trim();
    const name = match[1];

    if (!name) {
      continue;
    }

    const comment = normalizeComment(rawComment);
    entries.push({
      comment,
      examples: extractExamples(comment),
      filePath,
      name,
      summary: extractSummary(comment),
    });
  }

  return entries;
}

function normalizeComment(comment: string): string {
  return comment
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').trimEnd())
    .join('\n')
    .trim();
}

function extractSummary(comment: string): string {
  const [summary = ''] = comment.split(/\n\s*@(remarks|param|returns|example)\b/);
  return summary.replace(/\{@link\s+([^}]+)\}/g, '`$1`').trim();
}

function extractExamples(comment: string): string[] {
  return [...comment.matchAll(EXAMPLE_TAG_PATTERN)]
    .map((match) => match[1]?.trim() ?? '')
    .filter(Boolean)
    .map((example) => example.replace(/^```ts\n/, '').replace(/\n```$/, '').trim());
}

/* ────────────────────────────────────────────────────────────────────────── *\
 * Markdown rendering
\* ────────────────────────────────────────────────────────────────────────── */

function renderApiDocs(entries: readonly ApiDocEntry[]): string {
  const body = entries
    .map((entry) => {
      const sourcePath = relative('.', entry.filePath);
      return [`## ${entry.name}`, '', entry.summary, '', `**Source:** \`${sourcePath}\``].join('\n');
    })
    .join('\n\n');

  return `# Generated TSDoc Reference\n\nThis page is generated from TSDoc comments in \`src/\`. Do not edit it by hand.\n\n${body}\n`;
}

function renderExampleDocs(entries: readonly ApiDocEntry[]): string {
  const examples = entries.flatMap((entry) =>
    entry.examples.map((example, index) => ({ entry, example, index: index + 1 })),
  );

  const body = examples
    .map(({ entry, example, index }) => {
      const suffix = entry.examples.length > 1 ? ` ${index}` : '';
      return [`## ${entry.name}${suffix}`, '', `From \`${basename(entry.filePath)}\`.`, '', '```ts', example, '```'].join(
        '\n',
      );
    })
    .join('\n\n');

  return `# Extracted TSDoc Examples\n\nThis page is generated from every \`@example\` block in public source comments.\n\n${body}\n`;
}

await main();
