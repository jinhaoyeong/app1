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
  { code: 'stomach_discomfort', label: 'Stomach discomfort', category: 'Digestion' },
  { code: 'difficulty_concentrating', label: 'Difficulty concentrating', category: 'Mind' },
  { code: 'anxiety', label: 'Anxiety', category: 'Mind' },
  { code: 'irritability', label: 'Irritability', category: 'Mind' },
  { code: 'sadness', label: 'Sadness', category: 'Mind' },
  { code: 'mood_swings', label: 'Mood swings', category: 'Mind' },
  { code: 'cravings', label: 'Cravings', category: 'Appetite' },
  { code: 'low_appetite', label: 'Low appetite', category: 'Appetite' },
  { code: 'increased_appetite', label: 'Increased appetite', category: 'Appetite' },
  { code: 'poor_sleep', label: 'Poor sleep', category: 'Sleep' },
  { code: 'difficulty_falling_asleep', label: 'Difficulty falling asleep', category: 'Sleep' },
  { code: 'waking_overnight', label: 'Waking overnight', category: 'Sleep' },
  { code: 'sleeping_more', label: 'Sleeping more', category: 'Sleep' },
  { code: 'increased_discharge', label: 'Increased discharge', category: 'Reproductive' },
  { code: 'vaginal_dryness', label: 'Vaginal dryness', category: 'Reproductive' },
  { code: 'spotting_symptom', label: 'Spotting', category: 'Reproductive' },
] as const;

export type SymptomCode = (typeof SYMPTOM_LIBRARY)[number]['code'];

export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '😄' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'low', label: 'Low', emoji: '😔' },
  { value: 'rough', label: 'Rough', emoji: '😣' },
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

export const MEANINGFUL_FLOW: Set<string> = new Set([
  'light',
  'medium',
  'heavy',
  'very_heavy',
]);

export const ALGORITHM_VERSION = 'period_prediction_v1';
export const PATTERN_ENGINE_VERSION = 'pattern_engine_v1';
