import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  PrimaryButton,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';
import { useLumaStore } from '@/store/lumaStore';
import { toLocalDateString } from '@/utils/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing, typography } from '@/theme/tokens';

export default function LastPeriodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const patch = useLumaStore((s) => s.patchOnboardingDraft);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | undefined>();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const today = toLocalDateString();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xxl,
          flexGrow: 1,
        }}
      >
        <Title>When did your last period start?</Title>
        <Body muted style={{ marginTop: spacing.sm }}>
          An approximate date is fine.
        </Body>

        <View style={styles.monthNav}>
          <Pressable onPress={() => setMonth((m) => subMonths(m, 1))}>
            <Body>‹</Body>
          </Pressable>
          <SectionTitle>{format(month, 'MMMM yyyy')}</SectionTitle>
          <Pressable onPress={() => setMonth((m) => addMonths(m, 1))}>
            <Body>›</Body>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, month);
            const isSelected = selected === key;
            const future = key > today;
            return (
              <Pressable
                key={key}
                disabled={future}
                onPress={() => setSelected(key)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.circle,
                    isSelected && { backgroundColor: accent },
                  ]}
                >
                  <Text
                    style={[
                      typography.label,
                      {
                        color: isSelected
                          ? '#FFF'
                          : future || !inMonth
                            ? colors.textTertiary
                            : colors.text,
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1, minHeight: spacing.xxl }} />
        <PrimaryButton
          label="Continue"
          disabled={!selected}
          onPress={() => {
            patch({ lastPeriodStartDate: selected });
            router.push('/onboarding/period-length');
          }}
        />
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton
            label="I'm not sure"
            variant="ghost"
            onPress={() => {
              patch({ lastPeriodStartDate: undefined });
              router.push('/onboarding/period-length');
            }}
          />
        </View>
        <Caption style={{ marginTop: spacing.md, textAlign: 'center' }}>
          If you&apos;re unsure, Luma can start from future entries.
        </Caption>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
