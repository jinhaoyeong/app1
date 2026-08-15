export const MENSTRUAL_HEALTH_REVIEWED_ON = '2026-08-16';

/**
 * Clinical reference points used by Luma's rules and educational copy.
 * They are review prompts, not diagnostic thresholds for an individual.
 */
export const MENSTRUAL_REFERENCE = {
  adultCycleDays: { min: 21, max: 35 },
  adultCycleDaysOfficeOnWomensHealth: { min: 24, max: 38 },
  adolescentCycleDays: { min: 21, max: 45 },
  standardDaysMethodCycleDays: { min: 26, max: 32 },
  periodDaysUpperReviewPoint: 7,
  spermSurvivalDaysUpper: 5,
  eggSurvivalDaysUpper: 1,
  pmsProspectiveCyclesMinimum: 3,
} as const;

export type MenstrualEvidenceSource = {
  id: string;
  title: string;
  organization: string;
  url: string;
  supports: string;
};

export const MENSTRUAL_EVIDENCE_SOURCES: MenstrualEvidenceSource[] = [
  {
    id: 'acog-abnormal-bleeding',
    title: 'Abnormal Uterine Bleeding',
    organization: 'American College of Obstetricians and Gynecologists',
    url: 'https://www.acog.org/womens-health/faqs/abnormal-uterine-bleeding',
    supports:
      'Cycle and bleeding review points, including bleeding beyond 7 days and urgent heavy-bleeding symptoms.',
  },
  {
    id: 'acog-painful-periods',
    title: 'Painful Periods',
    organization: 'American College of Obstetricians and Gynecologists',
    url: 'https://www.acog.org/womens-health/faqs/painful-periods',
    supports:
      'Period-pain education, self-care boundaries, and when pain deserves clinical review.',
  },
  {
    id: 'acog-ectopic-pregnancy',
    title: 'Ectopic Pregnancy',
    organization: 'American College of Obstetricians and Gynecologists',
    url: 'https://www.acog.org/womens-health/faqs/ectopic-pregnancy',
    supports:
      'Urgent warning signs when pregnancy may be possible, including sudden severe pain, shoulder pain, weakness, dizziness, or fainting.',
  },
  {
    id: 'acog-pms',
    title: 'Premenstrual Syndrome (PMS)',
    organization: 'American College of Obstetricians and Gynecologists',
    url: 'https://www.acog.org/womens-health/faqs/Premenstrual-Syndrome',
    supports:
      'Prospective symptom tracking and the distinction between a repeated pattern and a diagnosis.',
  },
  {
    id: 'acog-fertility-awareness',
    title: 'Fertility Awareness-Based Methods of Family Planning',
    organization: 'American College of Obstetricians and Gynecologists',
    url: 'https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning',
    supports:
      'Fertile-window biology, sperm and egg survival, the 26-to-32-day Standard Days boundary, and contraception limitations.',
  },
  {
    id: 'nichd-menstruation',
    title: 'Menstruation and the Menstrual Cycle',
    organization: 'Eunice Kennedy Shriver NICHD',
    url: 'https://www.nichd.nih.gov/health/topics/factsheets/menstruation',
    supports:
      'Cycle-day definitions, menstrual physiology, and normal variation across people and cycles.',
  },
  {
    id: 'owh-cycle',
    title: 'Your Menstrual Cycle',
    organization: "U.S. Office on Women's Health",
    url: 'https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    supports:
      'Cycle counting, common adult cycle ranges, and reasons periods may change.',
  },
  {
    id: 'owh-pregnancy-tests',
    title: 'Pregnancy Tests',
    organization: "U.S. Office on Women's Health",
    url: 'https://womenshealth.gov/a-z-topics/pregnancy-tests',
    supports:
      'Pregnancy-test timing and the extra uncertainty created by irregular cycles.',
  },
  {
    id: 'cdc-contraception',
    title: 'Contraception and Birth Control Methods',
    organization: 'U.S. Centers for Disease Control and Prevention',
    url: 'https://www.cdc.gov/contraception/about/index.html',
    supports:
      'Contraceptive-method context and the limits of fertility-awareness methods in typical use.',
  },
  {
    id: 'who-menstrual-health',
    title: 'WHO Statement on Menstrual Health and Rights',
    organization: 'World Health Organization',
    url: 'https://www.who.int/news/item/22-06-2022-who-statement-on-menstrual-health-and-rights',
    supports:
      'Menstrual health as physical, mental, and social wellbeing with access to accurate information and care.',
  },
  {
    id: 'pubmed-calendar-ovulation',
    title: 'Can apps and calendar methods predict ovulation with accuracy?',
    organization: 'PubMed-indexed clinical study',
    url: 'https://pubmed.ncbi.nlm.nih.gov/29749274/',
    supports:
      'The limitation that cycle dates alone cannot identify an exact ovulation day.',
  },
  {
    id: 'npj-cycle-variation',
    title:
      'Real-world menstrual cycle characteristics of more than 600,000 cycles',
    organization: 'npj Digital Medicine',
    url: 'https://www.nature.com/articles/s41746-019-0152-7',
    supports:
      'Observed variability in cycle length and in the follicular and luteal portions of cycles.',
  },
];

export const MENSTRUAL_MODEL_LIMITS = [
  'A period prediction is a date range inferred from recorded period starts. It is not a diagnosis or a measurement of hormones.',
  'Calendar dates alone cannot confirm ovulation, fertile days, pregnancy, or a low-risk day for unprotected sex.',
  'Flow labels are subjective. Urgency depends on what is happening now, including how quickly protection is soaked and whether dizziness, breathlessness, chest pain, fainting, or severe pain is present.',
  'A repeated symptom pattern describes the entries in this journal. It does not prove that the menstrual cycle caused the symptom or establish PMS, PMDD, endometriosis, PCOS, or another condition.',
] as const;
