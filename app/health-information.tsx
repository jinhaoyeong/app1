import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { DetailFrame } from '@/components/DetailFrame';
import { PressableScale } from '@/components/motion';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  Divider,
  SectionRule,
} from '@/components/ui';
import {
  MENSTRUAL_EVIDENCE_SOURCES,
  MENSTRUAL_HEALTH_REVIEWED_ON,
  MENSTRUAL_MODEL_LIMITS,
} from '@/health/menstrualHealth';
import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function HealthInformationScreen() {
  const { colors, accent } = useTheme();

  return (
    <DetailFrame
      eyebrow="Evidence and limits"
      title="Menstrual health information"
      description="How Luma reasons, what it cannot know, and the clinical and public-health sources behind its review prompts."
    >
      <View style={[styles.reviewed, { borderColor: colors.border }]}>
        <AppIcon name="checkmark-circle-outline" size={18} color={accent} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontWeight: '700' }}>Evidence review recorded</Body>
          <DataText style={{ marginTop: 3 }}>
            {MENSTRUAL_HEALTH_REVIEWED_ON} · deterministic model
          </DataText>
        </View>
      </View>

      <SectionRule label="What Luma can say" style={styles.section} />
      <Body>
        Luma can count cycle days from a recorded period start, summarize what
        you logged, compare recent cycle lengths, and present a buffered
        next-period range when the cycle context supports it.
      </Body>
      <Body muted style={{ marginTop: spacing.md }}>
        Day 1 means the first day of menstrual bleeding. Spotting, breakthrough
        bleeding, withdrawal bleeding, and bleeding after sex remain in the
        journal but do not automatically start a menstrual cycle.
      </Body>

      <SectionRule label="What Luma cannot say" style={styles.section} />
      <View style={styles.limitList}>
        {MENSTRUAL_MODEL_LIMITS.map((item) => (
          <View key={item} style={styles.limitRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Body muted style={{ flex: 1 }}>
              {item}
            </Body>
          </View>
        ))}
      </View>

      <SectionRule label="Source library" style={styles.section} />
      <Caption style={{ marginBottom: spacing.md }}>
        Open the original source. Luma favors professional clinical guidance,
        government health information, and peer-reviewed evidence. A source
        supports a rule or explanation; it does not validate Luma as a medical
        device.
      </Caption>
      {MENSTRUAL_EVIDENCE_SOURCES.map((source, index) => (
        <View key={source.id}>
          <PressableScale
            accessibilityRole="link"
            accessibilityLabel={`Open ${source.title} from ${source.organization}`}
            onPress={() => void Linking.openURL(source.url)}
            scaleTo={0.99}
            style={styles.sourceRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>
                {source.title}
              </Text>
              <DataText style={{ marginTop: 4 }}>
                {source.organization}
              </DataText>
              <Caption style={{ marginTop: spacing.sm }}>
                {source.supports}
              </Caption>
            </View>
            <AppIcon name="open-outline" size={18} color={accent} />
          </PressableScale>
          {index < MENSTRUAL_EVIDENCE_SOURCES.length - 1 ? <Divider /> : null}
        </View>
      ))}

      <View style={[styles.disclaimer, { borderColor: colors.border }]}>
        <Caption>
          Luma is a tracking and educational tool. It cannot diagnose a cause,
          confirm ovulation or pregnancy, measure blood loss, or assess an
          emergency. Seek local medical care when symptoms are severe,
          worsening, unusual for you, or concerning.
        </Caption>
      </View>
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  reviewed: {
    minHeight: 68,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.mega,
    marginBottom: spacing.lg,
  },
  limitList: {
    gap: spacing.md,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
  },
  sourceRow: {
    minHeight: 88,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  disclaimer: {
    marginTop: spacing.mega,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
