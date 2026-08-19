import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon, Body, Caption, Card, SectionTitle } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';

const GUIDANCE = [
  `Contact a healthcare professional if bleeding lasts more than ${MENSTRUAL_REFERENCE.periodDaysUpperReviewPoint} days, recurs between periods, happens after sex, includes large clots, or disrupts daily life.`,
  'Seek emergency care if you are soaking a pad or tampon about every hour for more than 2 hours and also have chest pain, shortness of breath, dizziness, or lightheadedness.',
  'Seek urgent care for fainting, sudden severe or worsening pelvic or abdominal pain, or shoulder pain.',
  'If pregnancy is possible, unusual bleeding with pelvic pain needs prompt medical assessment. Severe pain, shoulder pain, weakness, dizziness, or fainting can be an emergency.',
  'Ask for clinical help when period pain is severe, worse than usual, or repeatedly interferes with school, work, sleep, or daily activities.',
  'You have thoughts of suicide or feel unsafe. Contact local emergency services or a crisis service now.',
];

export function WhenToSeekHelp({ compact = false }: { compact?: boolean }) {
  const { colors, tint } = useTheme();
  const [expanded, setExpanded] = useState(!compact);

  return (
    <Card
      tone="outline"
      accessibilityLabel="When to seek help guidance"
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: tint(0.06) },
      ]}
    >
      <PressableScale
        onPress={compact ? () => setExpanded((value) => !value) : undefined}
        disabled={!compact}
        accessibilityRole={compact ? 'button' : undefined}
        accessibilityState={compact ? { expanded } : undefined}
        accessibilityLabel={
          compact
            ? `${expanded ? 'Hide' : 'Show'} when to seek medical help guidance`
            : undefined
        }
        scaleTo={0.99}
        style={styles.heading}
      >
        <View style={[styles.icon, { backgroundColor: `${colors.period}18` }]}>
          <AppIcon name="medical-outline" size={17} color={colors.period} />
        </View>
        <View style={{ flex: 1 }}>
          <SectionTitle>When to seek help</SectionTitle>
          <Caption style={{ marginTop: 3 }}>
            {expanded
              ? 'Luma cannot assess an urgent symptom. Use your local medical or emergency service when you need immediate help.'
              : 'Urgent symptoms and care guidance'}
          </Caption>
        </View>
        {compact ? (
          <AppIcon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textTertiary}
          />
        ) : null}
      </PressableScale>
      {expanded ? (
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
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xxl,
    padding: spacing.xxxl,
  },
  heading: {
    minHeight: 44,
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
