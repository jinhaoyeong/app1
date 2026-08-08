import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import {
  AppIcon,
  Caption,
  DataText,
  Divider,
  PrimaryButton,
  SectionRule,
  ToggleRow,
} from '@/components/ui';
import { DetailFrame } from '@/components/DetailFrame';
import { useLumaStore } from '@/store/lumaStore';
import {
  getPermissionState,
  notificationsSupported,
  requestPermission,
  type PermissionState,
} from '@/notifications/scheduler';
import { noticeAsync } from '@/ui/dialogs';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const notifications = useLumaStore((s) => s.notifications);
  const update = useLumaStore((s) => s.updateNotifications);
  const discreet = useLumaStore((s) => s.appearance.discreetMode);

  const supported = notificationsSupported();
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  useEffect(() => {
    getPermissionState().then(setPermission);
  }, []);

  /**
   * Permission is requested here and nowhere else — at the moment someone
   * turns a category on, so the system prompt always has a visible reason.
   */
  const setCategory = async (
    key: keyof typeof notifications,
    next: boolean,
  ) => {
    if (!next) {
      update({ [key]: next });
      return;
    }

    if (!supported) {
      await noticeAsync({
        title: 'Not available here',
        message: 'Luma can only send reminders on iOS and Android.',
      });
      return;
    }

    const status = await requestPermission();
    setPermission(status);
    if (status !== 'granted') {
      await noticeAsync({
        title: 'Notifications are turned off',
        message:
          'Luma needs notification permission from your device before it can remind you of anything.',
      });
      return;
    }
    update({ [key]: next });
  };

  const groups: {
    label: string;
    rows: {
      key: keyof typeof notifications;
      label: string;
      hint: string;
      disabled?: boolean;
    }[];
  }[] = [
    {
      label: 'Your cycle',
      rows: [
        {
          key: 'periodPrediction',
          label: 'Period prediction',
          hint: 'When your expected window shifts',
        },
        {
          key: 'periodPreparation',
          label: 'Period preparation',
          hint: 'A few days before your estimated window',
        },
      ],
    },
    {
      // These two depend on noticing something in the data, which needs the
      // app to run. Without a background task there is no honest way to
      // promise delivery, so they are described as in-app only.
      label: 'What Luma notices (shown in the app)',
      rows: [
        {
          key: 'patternDiscovered',
          label: 'Pattern discovered',
          hint: 'Appears on Insights, not as a notification',
        },
        {
          key: 'importantChange',
          label: 'Important change',
          hint: 'Appears on Today and Insights, not as a notification',
        },
      ],
    },
    {
      label: 'Habit and privacy',
      rows: [
        {
          key: 'dailyLog',
          label: 'Daily log reminder',
          hint: 'Only if you want a gentle nudge',
        },
        {
          key: 'showDetailedText',
          label: 'Detailed notification text',
          hint: discreet
            ? 'Unavailable while discreet mode is on'
            : 'Show period details on the lock screen',
          disabled: discreet,
        },
      ],
    },
  ];

  const activeCount = Object.values(notifications).filter(Boolean).length;

  return (
    <DetailFrame
      eyebrow="Useful by default"
      title="Notifications"
      description="Never noisy. Every category is independent, and nothing arrives unless it earns your attention."
    >
      {/* The state of delivery is never implied — it is stated. */}
      {!supported ? (
        <View
          style={[
            styles.notice,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            },
          ]}
        >
          <AppIcon
            name="desktop-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Caption style={{ flex: 1 }}>
            Reminders are only available on iOS and Android. Your choices here
            are saved and will apply on your phone.
          </Caption>
        </View>
      ) : permission === 'denied' ? (
        <View
          style={[
            styles.notice,
            {
              borderColor: `${colors.period}55`,
              backgroundColor: `${colors.period}14`,
            },
          ]}
        >
          <AppIcon
            name="alert-circle-outline"
            size={16}
            color={colors.period}
          />
          <View style={{ flex: 1, gap: spacing.md }}>
            <Caption>
              Your device is blocking Luma&apos;s notifications, so nothing will
              arrive no matter what is switched on here.
            </Caption>
            <PrimaryButton
              label="Open device settings"
              variant="ghost"
              icon="open-outline"
              onPress={() => Linking.openSettings()}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.summary, { borderColor: colors.border }]}>
        <DataText color={colors.text}>{activeCount} of 6 chosen</DataText>
      </View>

      {groups.map((group, gi) => (
        <View
          key={group.label}
          style={gi === 0 ? undefined : styles.groupSpace}
        >
          <SectionRule label={group.label} />
          <View style={{ marginTop: spacing.xs }}>
            {group.rows.map((row, i) => (
              <View key={row.key}>
                <View style={row.disabled ? styles.disabled : undefined}>
                  <ToggleRow
                    title={row.label}
                    detail={row.hint}
                    value={notifications[row.key]}
                    onChange={(v) => {
                      if (row.disabled) return;
                      // Wording preferences need no OS permission; delivery
                      // categories request it at the moment they are enabled.
                      if (row.key === 'showDetailedText') {
                        update({ showDetailedText: v });
                        return;
                      }
                      setCategory(row.key, v);
                    }}
                  />
                </View>
                {i < group.rows.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Caption style={{ marginTop: spacing.xxl }}>
        Discreet mode lives in You → Privacy. Turning it on hides period detail
        from every notification, whatever is enabled here.
      </Caption>
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xl,
  },
  summary: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xxl,
  },
  groupSpace: {
    marginTop: spacing.huge,
  },
  disabled: {
    opacity: 0.45,
  },
});
