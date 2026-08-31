import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { playSelectionHaptic } from '@/utils/haptics';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  AppIcon,
  Body,
  Caption,
  DataText,
  PrimaryButton,
  SectionRule,
} from '@/components/ui';
import { DetailFrame } from '@/components/DetailFrame';
import { PressableScale, useDrawIn } from '@/components/motion';
import { useLumaStore } from '@/store/lumaStore';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';

export default function PreparationScreen() {
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const items = useLumaStore((s) => s.preparationItems);
  const setItem = useLumaStore((s) => s.setPreparationItem);
  const { predictionWindow, dataCoverageText } = useCycleIntelligence();

  const done = items.filter((item) => item.checked).length;
  const progress = useDrawIn(items.length ? done / items.length : 0, 100);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  const toggle = async (id: string, next: boolean) => {
    const saved = await setItem(id, next);
    if (!saved) return;
    playSelectionHaptic();
  };

  return (
    <DetailFrame
      eyebrow="Preparation"
      title="Ready when it arrives"
      description={`Your period may arrive in approximately ${
        predictionWindow ?? 'a few days'
      }.${dataCoverageText ? ` ${dataCoverageText}.` : ''}`}
      footer={
        <PrimaryButton
          label="Done"
          onPress={() => router.back()}
          icon="checkmark"
        />
      }
    >
      <SectionRule
        label="Checklist"
        right={
          <Text
            style={[
              typography.mono,
              { color: done === items.length ? accent : colors.textTertiary },
            ]}
          >
            {done}/{items.length}
          </Text>
        }
      />

      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: accent }, fillStyle]}
        />
      </View>

      <View style={{ marginTop: spacing.sm }}>
        {items.map((item, index) => (
          <View key={item.id}>
            <PressableScale
              onPress={() => toggle(item.id, !item.checked)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
              accessibilityLabel={item.label}
              scaleTo={0.99}
              dimTo={0.7}
              style={styles.checkRow}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: item.checked ? accent : colors.borderStrong,
                    backgroundColor: item.checked ? accent : 'transparent',
                  },
                ]}
              >
                {item.checked ? (
                  <AppIcon
                    name="checkmark"
                    size={15}
                    color={colors.accentInk}
                  />
                ) : null}
              </View>
              <Body
                style={{
                  flex: 1,
                  textDecorationLine: item.checked ? 'line-through' : 'none',
                  opacity: item.checked ? 0.5 : 1,
                }}
              >
                {item.label}
              </Body>
              <DataText>{String(index + 1).padStart(2, '0')}</DataText>
            </PressableScale>
            {index < items.length - 1 ? (
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
        ))}
      </View>

      <View
        style={[
          styles.note,
          { borderColor: colors.border, backgroundColor: tint(0.06) },
        ]}
      >
        <AppIcon name="information-circle-outline" size={16} color={accent} />
        <Caption style={{ flex: 1 }}>
          Your choices are remembered across cycles. This is practical support,
          not medical advice.
        </Caption>
      </View>
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    borderRadius: radii.full,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  checkRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  note: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
});
