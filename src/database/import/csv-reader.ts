import { readFile } from 'fs/promises';

export type CsvRow = {
  line: number;
  values: Record<string, string>;
};

export async function readCsv(filePath: string): Promise<CsvRow[]> {
  const text = decode(await readFile(filePath)).replace(/^﻿/, '');
  const separator = text.slice(0, text.search(/\r?\n/)).includes(';') ? ';' : ',';
  const [header, ...rows] = parse(text, separator);
  const columns = header.values.map((column) => column.trim());

  return rows
    .filter((row) => row.values.some((value) => value.trim() !== ''))
    .map((row) => ({
      line: row.line,
      values: Object.fromEntries(columns.map((column, i) => [column, row.values[i] ?? ''])),
    }));
}

function decode(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1250').decode(buffer);
  }
}

function parse(text: string, separator: string): { line: number; values: string[] }[] {
  const rows: { line: number; values: string[] }[] = [];
  let values: string[] = [];
  let value = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '\n') {
      line++;
    }

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"' && value === '') {
      quoted = true;
    } else if (char === separator) {
      values.push(value);
      value = '';
    } else if (char === '\n') {
      values.push(value.replace(/\r$/, ''));
      rows.push({ line: rowLine, values });
      values = [];
      value = '';
      rowLine = line;
    } else {
      value += char;
    }
  }

  if (value !== '' || values.length > 0) {
    values.push(value);
    rows.push({ line: rowLine, values });
  }

  return rows;
}
