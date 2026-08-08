import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useRouter } from 'expo-router';
import {
  Caption,
  DataText,
  Eyebrow,
  IconButton,
  PrimaryButton,
  SectionTitle,
} from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { useLumaStore } from '@/store/lumaStore';
import { toLocalDateString } from '@/utils/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';
import {
  OnboardingContinue,
  OnboardingFrame,
} from '@/components/OnboardingFrame';

export default function LastPeriodScreen() {
  const router = useRouter();
  const { colors, accent } = useTheme();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const saved = useLumaStore((s) => s.onboardingDraft.lastPeriodStartDate);
  const [selected, setSelected] = useState<string | undefined>(saved);
  const [month, setMonth] = useState(() =>
    startOfMonth(saved ? new Date(`${saved}T00:00:00`) : new Date()),
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const today = toLocalDateString();

  return (
    <OnboardingFrame
      step={2}
      title="When did your last period start?"
      description="An approximate date is fine."
      onBack={() => router.back()}
      footer={
        <OnboardingContinue
          disabled={!selected}
          onPress={() => {
            patch({ lastPeriodStartDate: selected });
            router.push('/onboarding/period-length');
          }}
          secondary={
            <PrimaryButton
              label="I'm not sure"
              variant="ghost"
              icon={null}
              onPress={() => {
                patch({ lastPeriodStartDate: undefined });
                router.push('/onboarding/period-length');
              }}
            />
          }
        />
      }
    >
      <View style={styles.monthNav}>
        <IconButton
          name="chevron-back"
          onPress={() => setMonth((m) => subMonths(m, 1))}
          accessibilityLabel="Previous month"
        />
        <SectionTitle>{format(month, 'MMMM yyyy')}</SectionTitle>
        <IconButton
          name="chevron-forward"
          onPress={() => setMonth((m) => addMonths(m, 1))}
          accessibilityLabel="Next month"
        />
      </View>

      <View style={styles.weekHeader}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <View key={`${day}-${index}`} style={styles.weekLabel}>
            <Eyebrow>{day}</Eyebrow>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, month);
          const isSelected = selected === key;
          const future = key > today;
          return (
            <PressableScale
              key={key}
              disabled={future}
              onPress={() => setSelected(key)}
              scaleTo={0.86}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: future }}
              accessibilityLabel={`${format(day, 'MMMM d')}${
                isSelected ? ', selected' : ''
              }`}
            >
              <View
                style={[styles.tile, isSelected && { backgroundColor: accent }]}
              >
                <Text
                  style={[
                    typography.label,
                    {
                      fontVariant: ['tabular-nums'],
                      color: isSelected
                        ? colors.accentInk
                        : future || !inMonth
                          ? colors.textTertiary
                          : colors.text,
                    },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.hint}>
        <DataText>
          {selected
            ? `selected · ${format(new Date(`${selected}T00:00:00`), 'EEEE, MMMM d')}`
            : 'tap the day your last period started'}
        </DataText>
      </View>
      <Caption style={{ marginTop: spacing.sm, textAlign: 'center' }}>
        An approximate date still gives Luma a useful starting point.
      </Caption>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    marginTop: spacing.xxl,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 5,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
});
