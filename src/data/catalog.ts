export const SYMPTOM_LIBRARY = [
  { code: 'bloating', label: 'Bloating', category: 'Body' },
  { code: 'cramps', label: 'Cramps', category: 'Body' },
  { code: 'headache', label: 'Headache', category: 'Body' },
  { code: 'backache', label: 'Backache', category: 'Body' },
  { code: 'nausea', label: 'Nausea', category: 'Body' },
  { code: 'dizziness', label: 'Dizziness', category: 'Body' },
  { code: 'breast_tenderness', label: 'Breast tenderness', category: 'Body' },
  { code: 'acne', label: 'Acne', category: 'Body' },
  { code: 'swelling', label: 'Swelling', category: 'Body' },
  { code: 'diarrhoea', label: 'Diarrhoea', category: 'Digestion' },
  { code: 'constipation', label: 'Constipation', category: 'Digestion' },
  {
    code: 'stomach_discomfort',
    label: 'Stomach discomfort',
    category: 'Digestion',
  },
  {
    code: 'difficulty_concentrating',
    label: 'Difficulty concentrating',
    category: 'Mind',
  },
  { code: 'anxiety', label: 'Anxiety', category: 'Mind' },
  { code: 'irritability', label: 'Irritability', category: 'Mind' },
  { code: 'sadness', label: 'Sadness', category: 'Mind' },
  { code: 'mood_swings', label: 'Mood swings', category: 'Mind' },
  { code: 'cravings', label: 'Cravings', category: 'Appetite' },
  { code: 'low_appetite', label: 'Low appetite', category: 'Appetite' },
  {
    code: 'increased_appetite',
    label: 'Increased appetite',
    category: 'Appetite',
  },
  { code: 'poor_sleep', label: 'Poor sleep', category: 'Sleep' },
  {
    code: 'difficulty_falling_asleep',
    label: 'Difficulty falling asleep',
    category: 'Sleep',
  },
  { code: 'waking_overnight', label: 'Waking overnight', category: 'Sleep' },
  { code: 'sleeping_more', label: 'Sleeping more', category: 'Sleep' },
  {
    code: 'increased_discharge',
    label: 'Increased discharge',
    category: 'Reproductive',
  },
  {
    code: 'vaginal_dryness',
    label: 'Vaginal dryness',
    category: 'Reproductive',
  },
  { code: 'spotting_symptom', label: 'Spotting', category: 'Reproductive' },
] as const;

export type SymptomCode = (typeof SYMPTOM_LIBRARY)[number]['code'];

export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'low', label: 'Low' },
  { value: 'rough', label: 'Rough' },
] as const;

export const ENERGY_OPTIONS = [
  { value: 'very_low', label: 'Very low' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very high' },
] as const;

export const PAIN_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
] as const;

export const FLOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'very_heavy', label: 'Very heavy' },
] as const;

export const BLEEDING_TYPE_OPTIONS = [
  { value: 'natural_period', label: 'Menstrual period' },
  { value: 'withdrawal', label: 'Withdrawal bleed' },
  { value: 'breakthrough', label: 'Breakthrough bleeding' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'post_sex', label: 'After sex' },
  { value: 'unknown', label: 'Not sure' },
] as const;

/**
 * Intimacy logging. Deliberately short and non-judgemental: the point is a
 * protection context, not a description of what happened.
 */
export const SEXUAL_ACTIVITY_OPTIONS = [
  { value: 'protected', label: 'Protected' },
  { value: 'unprotected', label: 'Unprotected' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

/** "Did this stop you doing your usual activities?" */
export const FUNCTIONAL_IMPACT_OPTIONS = [
  { value: 'none', label: 'No' },
  { value: 'some', label: 'A little' },
  { value: 'significant', label: 'Yes' },
] as const;

export const PAIN_LOCATION_OPTIONS = [
  { value: 'cramps', label: 'Cramps' },
  { value: 'back', label: 'Back' },
  { value: 'head', label: 'Head' },
  { value: 'breasts', label: 'Breasts' },
  { value: 'pelvic', label: 'Pelvic' },
  { value: 'other', label: 'Other' },
] as const;

export const SLEEP_HOUR_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const LH_TEST_OPTIONS = [
  { value: 'not_tested', label: 'Not tested' },
  { value: 'negative', label: 'Negative' },
  { value: 'positive', label: 'Positive' },
  { value: 'unclear', label: 'Unclear' },
] as const;

export const MUCUS_OPTIONS = [
  { value: 'none', label: 'None noticed' },
  { value: 'sticky', label: 'Sticky' },
  { value: 'creamy', label: 'Creamy' },
  { value: 'watery', label: 'Watery' },
  { value: 'egg_white', label: 'Egg-white' },
] as const;

export const GOAL_OPTIONS = [
  { value: 'predict_period', label: 'Predict my period' },
  { value: 'understand_symptoms', label: 'Understand symptoms' },
  { value: 'understand_mood', label: 'Understand mood' },
  { value: 'understand_energy', label: 'Understand my energy' },
  { value: 'prepare_period', label: 'Prepare for my period' },
  { value: 'reproductive_health', label: 'Track reproductive health' },
  { value: 'trying_to_conceive', label: 'Trying to conceive' },
] as const;

export const CONTRACEPTION_OPTIONS = [
  { value: 'none', label: 'No' },
  { value: 'combined_pill', label: 'Combined pill' },
  { value: 'pop', label: 'Progestogen-only pill' },
  { value: 'hormonal_iud', label: 'Hormonal IUD' },
  { value: 'copper_iud', label: 'Copper IUD' },
  { value: 'implant', label: 'Implant' },
  { value: 'injection', label: 'Injection' },
  { value: 'patch', label: 'Patch' },
  { value: 'ring', label: 'Vaginal ring' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
] as const;

export const CYCLE_CONTEXT_OPTIONS = [
  { value: 'possible_pregnancy', label: 'Pregnancy is possible' },
  { value: 'postpartum', label: 'Recently gave birth' },
  { value: 'breastfeeding', label: 'Breastfeeding' },
  {
    value: 'contraception_transition',
    label: 'Recently started or stopped contraception',
  },
  { value: 'perimenopause', label: 'Perimenopause or menopause transition' },
  { value: 'early_menarche', label: 'First years after periods began' },
  { value: 'pcos_or_thyroid', label: 'PCOS or thyroid condition' },
  {
    value: 'endometriosis_or_adenomyosis',
    label: 'Endometriosis or adenomyosis',
  },
  { value: 'bleeding_disorder', label: 'Bleeding disorder' },
  {
    value: 'recent_pregnancy_loss_or_abortion',
    label: 'Recent miscarriage or abortion',
  },
  {
    value: 'hysterectomy_or_ovarian_surgery',
    label: 'Hysterectomy or ovarian surgery',
  },
  {
    value: 'bleeding_affecting_medication',
    label: 'Medication that affects bleeding',
  },
  { value: 'none', label: 'None of these' },
  { value: 'prefer_not_to_say', label: 'Not sure / prefer not to say' },
] as const;

export const MEANINGFUL_FLOW: Set<string> = new Set([
  'light',
  'medium',
  'heavy',
  'very_heavy',
]);

export const ALGORITHM_VERSION = 'period_prediction_v2';
export const PATTERN_ENGINE_VERSION = 'pattern_engine_v1';
