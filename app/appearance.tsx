import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Caption, DataText, SectionRule } from '@/components/ui';
import { DetailFrame } from '@/components/DetailFrame';
import { PressableScale } from '@/components/motion';
import { accents, radii, spacing, typography } from '@/theme/tokens';
import type { AccentTheme, ColorMode } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import { useTheme } from '@/theme/ThemeProvider';

// Hints stay one short word: three tiles across a phone leave ~92pt each.
const MODES: { value: ColorMode; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'automatic' },
  { value: 'light', label: 'Bone', hint: 'daylight' },
  { value: 'dark', label: 'Ink', hint: 'evening' },
];

export default function AppearanceScreen() {
  const appearance = useLumaStore((s) => s.appearance);
  const update = useLumaStore((s) => s.updateAppearance);
  const { colors, isDark } = useTheme();

  return (
    <DetailFrame
      eyebrow="Make it yours"
      title="Appearance"
      description="Two surfaces and six signal accents. Every combination stays high contrast and colour-blind safe."
    >
      <SectionRule label="Surface" />
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const selected = appearance.colorMode === m.value;
          const previewBg =
            m.value === 'light'
              ? '#F4F3ED'
              : m.value === 'dark'
                ? '#0C0D0A'
                : isDark
                  ? '#0C0D0A'
                  : '#F4F3ED';
          const previewInk =
            m.value === 'light'
              ? '#14150F'
              : m.value === 'dark'
                ? '#F3F3E9'
                : isDark
                  ? '#F3F3E9'
                  : '#14150F';
          return (
            <PressableScale
              key={m.value}
              onPress={() => update({ colorMode: m.value })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${m.label} appearance, ${m.hint}`}
              scaleTo={0.95}
              style={[
                styles.modeTile,
                {
                  borderColor: selected ? colors.accent : colors.border,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={[styles.preview, { backgroundColor: previewBg }]}>
                <View
                  style={[styles.previewBar, { backgroundColor: previewInk }]}
                />
                <View
                  style={[
                    styles.previewBar,
                    {
                      backgroundColor: previewInk,
                      opacity: 0.4,
                      width: '55%',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.previewChip,
                    { backgroundColor: colors.accent },
                  ]}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  typography.label,
                  { color: colors.text, marginTop: spacing.md },
                ]}
              >
                {m.label}
              </Text>
              <DataText style={{ marginTop: 2, fontSize: 10 }}>
                {m.hint}
              </DataText>
            </PressableScale>
          );
        })}
      </View>

      <SectionRule label="Accent" style={styles.sectionSpace} />
      <View style={styles.accentGrid}>
        {(Object.keys(accents) as AccentTheme[]).map((key) => {
          const def = accents[key];
          const swatch = isDark ? def.darkColor : def.color;
          const glow = isDark ? def.darkGlow : def.glow;
          const selected = appearance.accent === key;
          return (
            <PressableScale
              key={key}
              onPress={() => update({ accent: key })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${def.label} accent, ${def.mood}`}
              scaleTo={0.94}
              style={[
                styles.accentTile,
                {
                  borderColor: selected ? swatch : colors.border,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.accentSwatches}>
                <View style={[styles.swatch, { backgroundColor: swatch }]} />
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: glow, marginLeft: -10 },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label, { color: colors.text }]}>
                  {def.label}
                </Text>
                <DataText style={{ marginTop: 2 }}>{def.mood}</DataText>
              </View>
              {selected ? (
                <View
                  style={[styles.selectedDot, { backgroundColor: swatch }]}
                />
              ) : null}
            </PressableScale>
          );
        })}
      </View>

      <Caption style={{ marginTop: spacing.xxl }}>
        Accents tint actions and marks only. Bleeding is always paired with a
        label, never signalled by colour alone.
      </Caption>
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modeTile: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  preview: {
    height: 62,
    borderRadius: radii.xs,
    padding: spacing.sm,
    gap: 5,
    justifyContent: 'center',
  },
  previewBar: {
    height: 4,
    width: '80%',
    borderRadius: radii.full,
  },
  previewChip: {
    height: 8,
    width: 22,
    borderRadius: radii.full,
    marginTop: 3,
  },
  sectionSpace: {
    marginTop: spacing.mega,
  },
  accentGrid: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  accentTile: {
    minHeight: 60,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  accentSwatches: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
});
