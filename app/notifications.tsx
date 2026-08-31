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
import {
  isStandalonePwa,
  requestWebPushPermission,
  webPushAvailable,
  webPushCapability,
} from '@/notifications/webPush';
import { pushScheduleConfigured } from '@/notifications/pushSchedule';
import { noticeAsync } from '@/ui/dialogs';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const notifications = useLumaStore((s) => s.notifications);
  const update = useLumaStore((s) => s.updateNotifications);
  const discreet = useLumaStore((s) => s.appearance.discreetMode);

  const nativeSupported = notificationsSupported();
  const webSupported = webPushAvailable();
  const supported = nativeSupported || webSupported;
  const capability = webSupported ? webPushCapability() : null;
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof Notification === 'undefined') return 'undetermined';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'undetermined';
  });

  useEffect(() => {
    if (!nativeSupported) return;
    void getPermissionState().then(setPermission);
  }, [nativeSupported]);

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
        message:
          'OS banners need the iOS/Android app or this site added to your Home Screen with Web Push configured.',
      });
      return;
    }

    if (webSupported && !isStandalonePwa()) {
      await noticeAsync({
        title: 'Add Luma to your Home Screen',
        message:
          'On iPhone, Safari cannot send reminders in a normal tab. Open Share → Add to Home Screen, open Luma from that icon, then turn this on.',
      });
      return;
    }

    const status = nativeSupported
      ? await requestPermission()
      : await requestWebPushPermission();
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
      {!nativeSupported && webSupported && !isStandalonePwa() ? (
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
            name="phone-portrait-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Caption style={{ flex: 1 }}>
            On iPhone, closed-app banners need Luma opened from the Home Screen
            icon. Today still shows due reminders in the app either way.
            {capability?.reason ? ` ${capability.reason}` : ''}
          </Caption>
        </View>
      ) : webSupported && !pushScheduleConfigured() ? (
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
            Closed-app banners need a push project (VAPID keys and an Appwrite
            collection). Due reminders still appear on Today.
          </Caption>
        </View>
      ) : !supported ? (
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
            This browser cannot send OS banners. Period and log nudges still
            appear on Today when they are due.
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
              Notifications are blocked on this device, so OS banners will not
              arrive. Due reminders still appear on Today.
            </Caption>
            {nativeSupported ? (
              <PrimaryButton
                label="Open device settings"
                variant="ghost"
                icon="open-outline"
                onPress={() => Linking.openSettings()}
              />
            ) : null}
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
        from every notification, whatever is enabled here. Delivery categories
        also stay discreet unless “Detailed notification text” is on. On
        iPhone, closed-app banners only arrive for the Home Screen app,
        permission must be granted from that icon, and delivery can be delayed.
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
