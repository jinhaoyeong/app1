import { Alert } from 'react-native';

export function explainPhase() {
  Alert.alert(
    'Where you are in your cycle',
    'Luma estimates broad phases from your period history:\n\n• During your period — bleeding days\n• After your period — your body is preparing again\n• Mid-cycle — around when ovulation may occur\n• Before your next period — the days leading up to bleeding\n\nThese are estimates, not lab results. Your own logged patterns matter more than generic phase claims.',
  );
}

export function explainConfidence() {
  Alert.alert(
    'What confidence means',
    'Confidence reflects how steady your recent cycles have been and how much history Luma has.\n\n• High — recent cycles were fairly consistent\n• Moderate — some variation; the date window is wider\n• Lower — cycles vary more; treat the window as approximate\n• Learning — not enough cycles yet for a personal estimate\n\nPredictions are ranges, never a single certain date.',
  );
}

export function explainEstimates() {
  Alert.alert(
    'About estimates',
    'Period predictions use your logged cycles, not an AI guess. They become more personal after several cycles.\n\nLuma never diagnoses conditions and never treats calendar estimates as contraception.',
  );
}
