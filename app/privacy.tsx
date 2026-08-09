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
import { useDeviceStore } from '@/store/deviceStore';
import { useAuth } from '@/auth/AuthProvider';
import { AUTH_ROUTE } from '@/auth/routes';
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

const EXPORT_CONTENTS: Record<ExportFormat, string> = {
  json: 'Everything: your profile, cycle history, every daily log, and any private notes you wrote.',
  csv: 'One row per logged day: flow, mood, energy, pain, symptoms, and any private notes you wrote.',
};

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors, accent, tint } = useTheme();
  const appearance = useLumaStore((s) => s.appearance);
  const updateAppearance = useLumaStore((s) => s.updateAppearance);
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const logs = useLumaStore((s) => s.dailyLogs);
  const profile = useLumaStore((s) => s.profile);
  const devicePrefs = useDeviceStore();
  const { session, signOut, deleteAccount } = useAuth();
  const { availability } = useAppLock();
  const [busy, setBusy] = useState<ExportFormat | 'signing_out' | 'deleting' | undefined>();

  const entryCount = Object.keys(logs).length;
  const lockUnavailable = availability === 'unavailable';

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
    if (ok) void runExport(format);
  };

  const setAppLock = (next: boolean) => {
    if (next && lockUnavailable) {
      void noticeAsync({
        title: 'No device lock set up',
        message:
          'Luma uses your phone’s own biometrics or passcode. Add one in your device settings, then turn this on.',
      });
      return;
    }
    devicePrefs.updateDevicePrefs({ biometricLock: next });
  };

  const updateDiscreetMode = async (next: boolean) => {
    const saved = await updateAppearance({ discreetMode: next });
    if (!saved) {
      await noticeAsync({
        title: 'Not saved',
        message: 'Not saved — internet required.',
      });
    }
  };

  return (
    <DetailFrame
      eyebrow="Account and privacy"
      title="Your privacy"
      description="Your account is the source of truth. Luma syncs your cycle data only after Supabase confirms each save."
    >
      <View
        style={[styles.statement, { borderColor: tint(0.35), backgroundColor: tint(0.08) }]}
      >
        <AppIcon name="cloud-done-outline" size={18} color={accent} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontWeight: '700' }}>Your cycle belongs to you.</Body>
          <Caption style={{ marginTop: 4 }}>
            Signed in as {session?.email ?? 'your Luma account'}. No reproductive
            advertising profile. Your menstrual data is never sold.
          </Caption>
          <DataText style={{ marginTop: spacing.md }}>
            {entryCount} entries · {episodes.length} periods · cloud synced
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
        value={devicePrefs.biometricLock}
        onChange={setAppLock}
      />
      {devicePrefs.biometricLock && !lockUnavailable ? (
        <View style={styles.timeoutBlock}>
          <Caption style={{ marginBottom: spacing.md }}>
            Lock again after leaving Luma:
          </Caption>
          <View style={styles.wrap}>
            {TIMEOUTS.map((timeout) => (
              <Chip
                key={timeout}
                label={LOCK_TIMEOUT_LABEL[timeout]}
                selected={devicePrefs.biometricTimeout === timeout}
                onPress={() =>
                  devicePrefs.updateDevicePrefs({ biometricTimeout: timeout })
                }
              />
            ))}
          </View>
        </View>
      ) : null}
      <Divider />
      <ToggleRow
        title="Discreet mode"
        detail="Reminders read ‘You have a Luma update’ instead of period details"
        value={appearance.discreetMode}
        onChange={(value) => void updateDiscreetMode(value)}
      />

      <SectionRule label="Take it with you" style={styles.sectionSpace} />
      <Caption style={{ marginBottom: spacing.lg }}>
        Exports are written on this device as a real file and handed straight to
        the share sheet. The temporary copy is deleted afterwards.
      </Caption>
      <View style={{ gap: spacing.md }}>
        <PrimaryButton
          label={busy === 'json' ? 'Preparing…' : 'Export JSON'}
          variant="secondary"
          disabled={!!busy}
          onPress={() => void confirmExport('json')}
          icon="download-outline"
        />
        <PrimaryButton
          label={busy === 'csv' ? 'Preparing…' : 'Export CSV'}
          variant="secondary"
          disabled={!!busy}
          onPress={() => void confirmExport('csv')}
          icon="download-outline"
        />
      </View>
      <Caption style={{ marginTop: spacing.md }}>
        Both include your private notes. You’ll see exactly what is in each file
        before it leaves.
      </Caption>

      <SectionRule label="Account" style={styles.sectionSpace} />
      <Caption style={{ marginBottom: spacing.lg }}>
        Signing out clears health data from this device’s memory. The same
        account can restore it after the next sign-in.
      </Caption>
      <View style={{ gap: spacing.md }}>
        <PrimaryButton
          label={busy === 'signing_out' ? 'Signing out…' : 'Sign out'}
          variant="secondary"
          disabled={!!busy}
          onPress={async () => {
            const ok = await confirmAsync({
              title: 'Sign out of Luma?',
              message: 'Your cloud data stays in your account and will return when you sign in again.',
              confirmLabel: 'Sign out',
            });
            if (!ok) return;
            setBusy('signing_out');
            await cancelAllNotifications();
            const signedOut = await signOut();
            setBusy(undefined);
            if (signedOut) router.replace(AUTH_ROUTE);
          }}
          icon="log-out-outline"
        />
        <PrimaryButton
          label={busy === 'deleting' ? 'Deleting account…' : 'Delete account and data'}
          variant="danger"
          disabled={!!busy}
          onPress={async () => {
            const ok = await confirmAsync({
              title: 'Delete your account?',
              message:
                'This permanently removes your profile, cycle history, logs, preferences, and preparation data from Supabase. It cannot be undone.',
              confirmLabel: 'Delete account',
              destructive: true,
            });
            if (!ok) return;
            setBusy('deleting');
            await cancelAllNotifications();
            const deleted = await deleteAccount();
            setBusy(undefined);
            if (deleted) router.replace(AUTH_ROUTE);
            else {
              await noticeAsync({
                title: 'Account not deleted',
                message: 'Not saved — internet required, or the deletion service is not available yet.',
              });
            }
          }}
          icon="trash-outline"
        />
      </View>
      <Caption style={{ marginTop: spacing.xl, color: colors.textTertiary, textAlign: 'center' }}>
        Data from the previous anonymous local store is never uploaded. This
        account-first build starts with the cloud account as the source of truth.
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
