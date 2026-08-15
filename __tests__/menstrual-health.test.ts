import {
  MENSTRUAL_EVIDENCE_SOURCES,
  MENSTRUAL_HEALTH_REVIEWED_ON,
  MENSTRUAL_MODEL_LIMITS,
  MENSTRUAL_REFERENCE,
} from '@/health/menstrualHealth';

describe('menstrual health evidence registry', () => {
  it('keeps reviewed sources unique and on secure authoritative domains', () => {
    const ids = MENSTRUAL_EVIDENCE_SOURCES.map((source) => source.id);
    const urls = MENSTRUAL_EVIDENCE_SOURCES.map((source) => source.url);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toMatch(
        /^https:\/\/(www\.)?(acog\.org|cdc\.gov|nichd\.nih\.gov|womenshealth\.gov|who\.int|pubmed\.ncbi\.nlm\.nih\.gov|nature\.com)\//,
      );
    }
  });

  it('records conservative review boundaries and model limits', () => {
    expect(MENSTRUAL_HEALTH_REVIEWED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MENSTRUAL_REFERENCE.periodDaysUpperReviewPoint).toBe(7);
    expect(MENSTRUAL_REFERENCE.standardDaysMethodCycleDays).toEqual({
      min: 26,
      max: 32,
    });
    expect(MENSTRUAL_MODEL_LIMITS.join(' ').toLowerCase()).toContain(
      'cannot confirm ovulation',
    );
    expect(MENSTRUAL_MODEL_LIMITS.join(' ').toLowerCase()).toContain(
      'does not prove',
    );
  });
});
