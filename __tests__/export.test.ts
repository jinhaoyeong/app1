import { exportLogsCsv, exportLogsJson } from '../src/engine/summary';
import {
  EXPORT_MIME,
  EXPORT_UTI,
  exportFilename,
} from '../src/export/exportFormat';
import type { DailyLog } from '../src/types';

function log(date: string, extra: Partial<DailyLog> = {}): DailyLog {
  return { id: date, date, updatedAt: '2026-08-09T00:00:00.000Z', ...extra };
}

describe('export file naming and types', () => {
  test('filenames are dated, sortable, and carry the real extension', () => {
    expect(exportFilename('json', '2026-08-09')).toBe(
      'luma-export-2026-08-09.json',
    );
    expect(exportFilename('csv', '2026-08-09')).toBe(
      'luma-export-2026-08-09.csv',
    );
  });

  test('MIME types are the registered ones', () => {
    expect(EXPORT_MIME.json).toBe('application/json');
    // "application/csv" is unregistered and some mail clients reject it.
    expect(EXPORT_MIME.csv).toBe('text/csv');
    expect(EXPORT_UTI.csv).toBe('public.comma-separated-values-text');
    expect(EXPORT_UTI.json).toBe('public.json');
  });
});

describe('CSV export', () => {
  test('an empty dataset still produces a valid header-only file', () => {
    const csv = exportLogsCsv({});
    expect(csv).toBe(
      'date,flow,mood,energy,pain,symptoms,sleepHours,lhTest,mucus,note',
    );
    expect(csv.split('\r\n')).toHaveLength(1);
  });

  test('quotes only the cells that need it', () => {
    const csv = exportLogsCsv({
      '2026-08-01': log('2026-08-01', { flow: 'light', note: 'fine' }),
    });
    const row = csv.split('\r\n')[1];
    expect(row).toBe('2026-08-01,light,,,,,,,,fine');
  });

  test('escapes commas, quotes, and newlines in notes', () => {
    const csv = exportLogsCsv({
      '2026-08-01': log('2026-08-01', {
        note: 'cramps, bad\nslept "badly", again',
      }),
    });
    const body = csv.slice(csv.indexOf('\r\n') + 2);
    // The whole cell is quoted and inner quotes are doubled, so the embedded
    // comma and newline cannot shift or split the row.
    expect(body).toBe('2026-08-01,,,,,,,,,"cramps, bad\nslept ""badly"", again"');
    // Exactly one record separator, despite the newline inside the note.
    expect(body.split('\r\n')).toHaveLength(1);
  });

  test('preserves Unicode, including emoji and non-Latin scripts', () => {
    const note = 'дневник 日本語 café 🩸';
    const csv = exportLogsCsv({ '2026-08-01': log('2026-08-01', { note }) });
    expect(csv).toContain(note);
  });

  test('joins symptoms with a separator that never collides with the delimiter', () => {
    const csv = exportLogsCsv({
      '2026-08-01': log('2026-08-01', { symptoms: ['cramps', 'headache'] }),
    });
    expect(csv).toContain('cramps|headache');
    expect(csv.split('\r\n')[1].split(',')).toHaveLength(10);
  });

  test('writes LH and mucus columns without treating them as confirmation', () => {
    const csv = exportLogsCsv({
      '2026-08-01': log('2026-08-01', {
        lhTest: 'positive',
        mucus: 'egg_white',
      }),
    });
    expect(csv.split('\r\n')[1]).toBe('2026-08-01,,,,,,,positive,egg_white,');
  });

  test('rows are ordered by date', () => {
    const csv = exportLogsCsv({
      '2026-08-03': log('2026-08-03'),
      '2026-08-01': log('2026-08-01'),
      '2026-08-02': log('2026-08-02'),
    });
    const dates = csv
      .split('\r\n')
      .slice(1)
      .map((r) => r.split(',')[0]);
    expect(dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });
});

describe('JSON export', () => {
  test('an empty dataset produces valid, parseable JSON', () => {
    const parsed = JSON.parse(
      exportLogsJson({ episodes: [], logs: {}, profile: {} }),
    );
    expect(parsed.format).toBe('luma_export_v1');
    expect(parsed.dailyLogs).toEqual([]);
    expect(parsed.periodEpisodes).toEqual([]);
  });

  test('round-trips Unicode notes without loss', () => {
    const note = 'дневник 日本語 café 🩸 "quoted", comma';
    const json = exportLogsJson({
      episodes: [],
      logs: { '2026-08-01': log('2026-08-01', { note }) },
      profile: { displayName: 'Mia' },
    });
    const parsed = JSON.parse(json);
    expect(parsed.dailyLogs[0].note).toBe(note);
  });
});
