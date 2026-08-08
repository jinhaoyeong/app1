import { Platform } from 'react-native';
import {
  EXPORT_MIME,
  EXPORT_UTI,
  exportFilename,
  type ExportFormat,
} from './exportFormat';

export type { ExportFormat };
export { EXPORT_MIME, EXPORT_UTI, exportFilename };

export type ExportOutcome =
  /** The share sheet (or browser download) ran to completion. */
  | 'completed'
  /** This platform has no way to share a file. */
  | 'unsupported'
  /** Writing or sharing threw. */
  | 'failed';

export type ExportResult = {
  outcome: ExportOutcome;
  filename: string;
  message?: string;
};

/**
 * Writes the export to a real file and hands it to the platform share sheet,
 * then removes the temporary copy.
 *
 * Note on cancellation: `expo-sharing` resolves when the sheet is dismissed and
 * does not report whether the user actually sent the file. Rather than invent a
 * success signal, this returns `completed` for "the sheet opened and closed"
 * and the UI wording stays neutral about what happened next.
 */
export async function shareExport(options: {
  format: ExportFormat;
  contents: string;
  isoDate: string;
}): Promise<ExportResult> {
  const filename = exportFilename(options.format, options.isoDate);
  const mimeType = EXPORT_MIME[options.format];

  if (Platform.OS === 'web') {
    return shareOnWeb({ ...options, filename, mimeType });
  }

  // Imported lazily so the web bundle never pulls in native-only modules.
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  let file: InstanceType<typeof File> | undefined;
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return {
        outcome: 'unsupported',
        filename,
        message: 'This device has no app that can receive the file.',
      };
    }

    // The cache directory, not documents: an export is a hand-off, not
    // something Luma should keep a second copy of.
    file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(options.contents);

    await Sharing.shareAsync(file.uri, {
      mimeType,
      UTI: EXPORT_UTI[options.format],
      dialogTitle: 'Share your Luma export',
    });

    return { outcome: 'completed', filename };
  } catch (error) {
    return {
      outcome: 'failed',
      filename,
      message: error instanceof Error ? error.message : undefined,
    };
  } finally {
    // Always clean up, including after a failure part-way through. Health data
    // must not linger in the cache waiting for the OS to decide to evict it.
    try {
      if (file?.exists) file.delete();
    } catch {
      // Best effort; the cache directory is evictable by the system anyway.
    }
  }
}

async function shareOnWeb(options: {
  contents: string;
  filename: string;
  mimeType: string;
}): Promise<ExportResult> {
  try {
    // A UTF-8 BOM keeps Excel from mangling non-ASCII notes in a CSV.
    const needsBom = options.mimeType === 'text/csv';
    const blob = new Blob([needsBom ? '﻿' : '', options.contents], {
      type: `${options.mimeType};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = options.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { outcome: 'completed', filename: options.filename };
  } catch (error) {
    return {
      outcome: 'failed',
      filename: options.filename,
      message: error instanceof Error ? error.message : undefined,
    };
  }
}
