import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppIcon,
  Body,
  Caption,
  Chip,
  DataText,
  Divider,
  PrimaryButton,
  SectionRule,
  ToggleRow,
} from '@/components/ui';
import { DetailFrame } from '@/components/DetailFrame';
import { useLumaStore } from '@/store/lumaStore';
import { exportLogsCsv, exportLogsJson } from '@/engine/summary';
import { useAppLock } from '@/security/AppLock';
import { LOCK_TIMEOUT_LABEL, type LockTimeout } from '@/security/lockPolicy';
import { shareExport, type ExportFormat } from '@/export/exportFile';
import { toLocalDateString } from '@/utils/dates';
import { confirmAsync, noticeAsync } from '@/ui/dialogs';
import { cancelAllNotifications } from '@/notifications/scheduler';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

const TIMEOUTS: LockTimeout[] = ['immediate', '1m', '5m'];

/** Named plainly, because an export leaves the protections of this device. */
const EXPORT_CONTENTS: Record<ExportFormat, string> = {
  json: 'Everything: your profile, cycle history, every daily log, and any private notes you wrote.',
  csv: 'One row per logged day: flow, mood, energy, pain, symptoms, and any private notes you wrote.',
};

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const appearance = useLumaStore((s) => s.appearance);
  const updateAppearance = useLumaStore((s) => s.updateAppearance);
  const deleteAllData = useLumaStore((s) => s.deleteAllData);
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const logs = useLumaStore((s) => s.dailyLogs);
  const profile = useLumaStore((s) => s.profile);
  const { availability } = useAppLock();

  const entryCount = Object.keys(logs).length;
  const lockUnavailable = availability === 'unavailable';

  const [busy, setBusy] = useState<ExportFormat | undefined>();

  const runExport = async (format: ExportFormat) => {
    if (busy) return;
    setBusy(format);
    try {
      const contents =
        format === 'json'
          ? exportLogsJson({ episodes, logs, profile })
          : exportLogsCsv(logs);
      const result = await shareExport({
        format,
        contents,
        isoDate: toLocalDateString(),
      });

      if (result.outcome === 'unsupported') {
        await noticeAsync({
          title: 'Sharing unavailable',
          message:
            result.message ??
            'This device cannot share files. Your data has not left Luma.',
        });
      } else if (result.outcome === 'failed') {
        await noticeAsync({
          title: 'Export failed',
          message: `${result.message ?? 'Something went wrong.'}\n\nNothing was shared, and no copy was left behind.`,
        });
      }
      // A completed share needs no confirmation dialog: the share sheet the
      // user just dismissed is the feedback, and expo-sharing cannot tell us
      // whether they actually sent it.
    } finally {
      setBusy(undefined);
    }
  };

  const confirmExport = async (format: ExportFormat) => {
    const ok = await confirmAsync({
      title: `Export ${format.toUpperCase()}?`,
      message: `${EXPORT_CONTENTS[format]}\n\nOnce shared, this file is outside Luma's protections.`,
      confirmLabel: 'Export',
    });
    if (ok) runExport(format);
  };

  const setAppLock = (next: boolean) => {
    // Refuse to advertise protection the device cannot provide.
    if (next && lockUnavailable) {
      noticeAsync({
        title: 'No device lock set up',
        message:
          'Luma uses your phone’s own biometrics or passcode. Add one in your device settings, then turn this on.',
      });
      return;
    }
    updateAppearance({ biometricLock: next });
  };

  return (
    <DetailFrame
      eyebrow="Private by default"
      title="Your privacy"
      description="Luma is local-first. Nothing here leaves this device unless you choose to export it."
    >
      <View
        style={[
          styles.statement,
          { borderColor: tint(0.35), backgroundColor: tint(0.08) },
        ]}
      >
        <AppIcon name="lock-closed" size={18} color={accent} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontWeight: '700' }}>Your cycle belongs to you.</Body>
          <Caption style={{ marginTop: 4 }}>
            No account required. No reproductive advertising profile. Your
            menstrual data is never sold.
          </Caption>
          <DataText style={{ marginTop: spacing.md }}>
            {entryCount} entries · {episodes.length} periods · on this device
            only
          </DataText>
        </View>
      </View>

      <SectionRule label="Protection" style={styles.sectionSpace} />
      <ToggleRow
        title="App lock"
        detail={
          lockUnavailable
            ? 'Unavailable — set up biometrics or a passcode on this device first'
            : 'Require your device biometrics or passcode to open Luma'
        }
        value={appearance.biometricLock}
        onChange={setAppLock}
      />
      {appearance.biometricLock && !lockUnavailable ? (
        <View style={styles.timeoutBlock}>
          <Caption style={{ marginBottom: spacing.md }}>
            Lock again after leaving Luma:
          </Caption>
          <View style={styles.wrap}>
            {TIMEOUTS.map((t) => (
              <Chip
                key={t}
                label={LOCK_TIMEOUT_LABEL[t]}
                selected={appearance.biometricTimeout === t}
                onPress={() => updateAppearance({ biometricTimeout: t })}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Divider />
      <ToggleRow
        title="Discreet mode"
        detail="Reminders read “You have a Luma update” instead of period details"
        value={appearance.discreetMode}
        onChange={(v) => updateAppearance({ discreetMode: v })}
      />

      <SectionRule label="Take it with you" style={styles.sectionSpace} />
      <Caption style={{ marginBottom: spacing.lg }}>
        Exports are written on this device as a real file and handed straight to
        the share sheet. The temporary copy is deleted afterwards, whether or
        not you send it.
      </Caption>
      <View style={{ gap: spacing.md }}>
        <PrimaryButton
          label={busy === 'json' ? 'Preparing…' : 'Export JSON'}
          variant="secondary"
          disabled={!!busy}
          onPress={() => confirmExport('json')}
          icon="download-outline"
        />
        <PrimaryButton
          label={busy === 'csv' ? 'Preparing…' : 'Export CSV'}
          variant="secondary"
          disabled={!!busy}
          onPress={() => confirmExport('csv')}
          icon="download-outline"
        />
      </View>
      <Caption style={{ marginTop: spacing.md }}>
        Both include your private notes. You&apos;ll see exactly what is in each
        file before it leaves.
      </Caption>

      <SectionRule label="Erase" style={styles.sectionSpace} />
      <Caption style={{ marginBottom: spacing.lg }}>
        Deleting is immediate and cannot be undone. There is no copy on a server
        to recover.
      </Caption>
      <PrimaryButton
        label="Delete all my data"
        variant="danger"
        onPress={async () => {
          const ok = await confirmAsync({
            title: 'Delete everything?',
            message:
              'This permanently removes cycle history, logs, and settings from this device.',
            confirmLabel: 'Delete',
            destructive: true,
          });
          if (!ok) return;
          // Nothing may outlive the data it describes: a queued reminder
          // would otherwise still name a cycle that no longer exists.
          await cancelAllNotifications();
          deleteAllData();
          router.replace('/onboarding');
        }}
        icon="trash-outline"
      />
      <Caption
        style={{
          marginTop: spacing.xl,
          color: colors.textTertiary,
          textAlign: 'center',
        }}
      >
        Backend sync is deferred. If it ever ships, it will be opt-in.
      </Caption>
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  statement: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  sectionSpace: {
    marginTop: spacing.mega,
    marginBottom: spacing.sm,
  },
  timeoutBlock: {
    paddingBottom: spacing.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
