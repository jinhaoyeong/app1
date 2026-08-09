import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon, Body, Caption, Card, SectionTitle } from '@/components/ui';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const GUIDANCE = [
  'Bleeding lasts more than 7 days, keeps recurring between periods, or happens after sex.',
  'You are soaking a pad or tampon about every hour for more than 2 hours, passing unusually large clots, or feeling weak, dizzy, or short of breath.',
  'You faint, have chest pain, or have severe or worsening pelvic pain.',
  'Pregnancy is possible and you have unusual bleeding or pelvic pain.',
  'You have thoughts of suicide or feel unsafe. Contact local emergency services or a crisis service now.',
];

export function WhenToSeekHelp() {
  const { colors, tint } = useTheme();
  return (
    <Card
      tone="outline"
      accessibilityLabel="When to seek help guidance"
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: tint(0.06) },
      ]}
    >
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: `${colors.period}18` }]}>
          <AppIcon name="medical-outline" size={17} color={colors.period} />
        </View>
        <View style={{ flex: 1 }}>
          <SectionTitle>When to seek help</SectionTitle>
          <Caption style={{ marginTop: 3 }}>
            Luma cannot assess an urgent symptom. Use your local medical or
            emergency service when you need immediate help.
          </Caption>
        </View>
      </View>
      <View style={styles.list}>
        {GUIDANCE.map((item) => (
          <View key={item} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: colors.period }]} />
            <Body muted style={{ flex: 1 }}>
              {item}
            </Body>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    marginTop: 8,
  },
});
