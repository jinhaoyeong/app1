/**
 * Format facts with no platform dependency, so they can be unit tested in a
 * plain node environment alongside the engines.
 */

export type ExportFormat = 'json' | 'csv';

export const EXPORT_MIME: Record<ExportFormat, string> = {
  json: 'application/json',
  // RFC 4180. Not "application/csv", which is not registered and which some
  // mail clients refuse to attach.
  csv: 'text/csv',
};

/** iOS needs a Uniform Type Identifier alongside the MIME type. */
export const EXPORT_UTI: Record<ExportFormat, string> = {
  json: 'public.json',
  csv: 'public.comma-separated-values-text',
};

/**
 * Dated, sortable, and obviously ours — this name may end up in a clinician's
 * inbox next to files from every other patient.
 */
export function exportFilename(format: ExportFormat, isoDate: string): string {
  return `luma-export-${isoDate}.${format}`;
}
