import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  Caption,
  Chip,
  DataText,
  OptionRow,
  SectionRule,
} from '@/components/ui';
import { DetailFrame } from '@/components/DetailFrame';
import { useLumaStore } from '@/store/lumaStore';
import {
  CONTRACEPTION_OPTIONS,
  CYCLE_CONTEXT_OPTIONS,
  GOAL_OPTIONS,
  SYMPTOM_LIBRARY,
} from '@/data/catalog';
import type {
  ContraceptionType,
  CycleContext,
  CycleRegularity,
  TrackingGoal,
} from '@/types';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';

const PERIOD_LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const REGULARITY: { value: CycleRegularity; label: string }[] = [
  { value: 'usually', label: 'Usually' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'unsure', label: "I'm not sure" },
];

const MAX_FAVOURITES = 8;

/**
 * The screen onboarding promises ("you can change these later in
 * You → Health profile"). Everything here writes straight to the store, so
 * there is no save step to forget.
 */
export default function HealthProfileScreen() {
  const profile = useLumaStore((s) => s.profile);
  const updateProfile = useLumaStore((s) => s.updateProfile);
  const favourites = useLumaStore((s) => s.favouriteSymptoms);
  const setFavourites = useLumaStore((s) => s.setFavouriteSymptoms);
  const { colors } = useTheme();
  const { baseline, fertilitySafety } = useCycleIntelligence();
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');

  const saveDisplayName = () => {
    void updateProfile({ displayName: displayName.trim() || undefined });
  };

  const toggleGoal = (g: TrackingGoal) => {
    const next = profile.trackingGoals.includes(g)
      ? profile.trackingGoals.filter((x) => x !== g)
      : [...profile.trackingGoals, g];
    updateProfile({
      trackingGoals: next,
      // Trying to conceive turns the optional map on by default. After that,
      // the dedicated toggle below owns the preference.
      fertilityEnabled:
        next.includes('trying_to_conceive') || profile.fertilityEnabled,
    });
  };

  const toggleFavourite = (code: string) => {
    if (favourites.includes(code)) {
      setFavourites(favourites.filter((c) => c !== code));
      return;
    }
    if (favourites.length >= MAX_FAVOURITES) return;
    setFavourites([...favourites, code]);
  };

  const toggleContext = (value: CycleContext) => {
    const current = profile.safetyContexts ?? [];
    const next =
      value === 'none' || value === 'prefer_not_to_say'
        ? current.includes(value)
          ? []
          : [value]
        : [
            ...current.filter(
              (item) => item !== 'none' && item !== 'prefer_not_to_say',
            ),
            ...(current.includes(value) ? [] : [value]),
          ];
    void updateProfile({
      safetyContexts: next,
      safetyContextReviewed: true,
    });
  };

  return (
    <DetailFrame
      eyebrow="Yours to change"
      title="Health profile"
      description="What Luma pays attention to, and what it already knows about your cycle. Changes save as you make them."
    >
      <SectionRule label="Your name" />
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        onBlur={saveDisplayName}
        onSubmitEditing={saveDisplayName}
        placeholder="Optional"
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel="Your name"
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      <Caption style={{ marginTop: spacing.sm }}>
        Used only in your greeting and synced with your account.
      </Caption>

      <SectionRule label="What to notice" style={styles.section} />
      <View>
        {GOAL_OPTIONS.map((g) => (
          <OptionRow
            key={g.value}
            label={g.label}
            multi
            selected={profile.trackingGoals.includes(g.value)}
            onPress={() => toggleGoal(g.value)}
          />
        ))}
      </View>

      <SectionRule label="Usual period length" style={styles.section} />
      <View style={styles.wrap}>
        {PERIOD_LENGTHS.map((n) => (
          <Chip
            key={n}
            label={`${n} ${n === 1 ? 'day' : 'days'}`}
            selected={profile.usualPeriodLength === n}
            onPress={() =>
              updateProfile({
                usualPeriodLength:
                  profile.usualPeriodLength === n ? undefined : n,
              })
            }
          />
        ))}
      </View>
      <Caption style={{ marginTop: spacing.sm }}>
        Count the first through last day of menstrual bleeding. Bleeding longer
        than {MENSTRUAL_REFERENCE.periodDaysUpperReviewPoint} days is worth
        discussing with a clinician; recording it here does not diagnose the
        cause.
      </Caption>

      <SectionRule label="Cycle regularity" style={styles.section} />
      <View style={styles.wrap}>
        {REGULARITY.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={profile.cycleRegularity === o.value}
            onPress={() => updateProfile({ cycleRegularity: o.value })}
          />
        ))}
      </View>

      <SectionRule label="Contraception" style={styles.section} />
      <View style={styles.wrap}>
        {CONTRACEPTION_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={profile.contraceptionType === o.value}
            onPress={() =>
              updateProfile({
                contraceptionType: o.value as ContraceptionType,
              })
            }
          />
        ))}
      </View>
      <Caption style={{ marginTop: spacing.sm }}>
        Luma records bleeding with any contraception. It hides fertile timing
        for hormonal methods because ovulation and bleeding may not follow a
        calendar pattern.
      </Caption>

      <SectionRule label="Cycle context" style={styles.section} />
      <Caption style={{ marginBottom: spacing.md }}>
        This is not a diagnosis. It helps Luma decide when calendar estimates
        should stay hidden.
      </Caption>
      <View>
        {CYCLE_CONTEXT_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            multi
            selected={(profile.safetyContexts ?? []).includes(
              option.value as CycleContext,
            )}
            onPress={() => toggleContext(option.value as CycleContext)}
          />
        ))}
      </View>
      <Caption style={{ marginTop: spacing.sm }}>
        {profile.safetyContextReviewed
          ? `Luma has reviewed this context against ${baseline.cycleCount} completed cycle${baseline.cycleCount === 1 ? '' : 's'}.`
          : 'Review a context before turning on fertile timing.'}
      </Caption>

      <SectionRule label="Optional fertile timing" style={styles.section} />
      <OptionRow
        label="Show possible fertile timing"
        detail={
          fertilitySafety.canShow
            ? fertilitySafety.detail
            : fertilitySafety.title
        }
        multi
        disabled={!fertilitySafety.canShow}
        selected={profile.fertilityEnabled && fertilitySafety.canShow}
        onPress={() =>
          fertilitySafety.canShow &&
          void updateProfile({ fertilityEnabled: !profile.fertilityEnabled })
        }
      />
      <Caption style={{ marginTop: spacing.sm }}>
        {fertilitySafety.canShow
          ? 'These are broad calendar estimates, not an exact ovulation day and never contraception.'
          : fertilitySafety.detail}
      </Caption>

      <SectionRule
        label="Quick symptoms"
        style={styles.section}
        right={
          <DataText>
            {favourites.length}/{MAX_FAVOURITES}
          </DataText>
        }
      />
      <Caption style={{ marginBottom: spacing.md }}>
        These appear first when you log, so the ones you actually use are one
        tap away.
      </Caption>
      <View style={styles.wrap}>
        {SYMPTOM_LIBRARY.map((s) => {
          const selected = favourites.includes(s.code);
          return (
            <Chip
              key={s.code}
              label={s.label}
              selected={selected}
              onPress={() => toggleFavourite(s.code)}
            />
          );
        })}
      </View>
      {favourites.length >= MAX_FAVOURITES ? (
        <Caption style={{ marginTop: spacing.sm }}>
          Remove one to add another.
        </Caption>
      ) : null}
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.mega,
    marginBottom: spacing.lg,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  input: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },
});
