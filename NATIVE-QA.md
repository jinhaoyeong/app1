# Native release gate

Three integrations are implemented and unit-tested but have **never run on a real
OS**: app lock, native file share, and notification delivery. Their decision
logic is covered by unit tests; none of those tests can prove that a
biometric prompt appears, that a share sheet attaches a file, or that Android
posts a notification eight days from now. PWA outbox, Today due cards, and Web
Push also need a Home Screen pass — those cases are in section 5.

This document is that pass. Until every area below is filled in, the status
labels in `PRODUCT.md` stand as written.

---

## Prerequisites

**None of these three features work in Expo Go.** `expo-local-authentication`,
`expo-notifications` scheduling, and `expo-sharing` all require a development
build. Running the pass in Expo Go will produce false failures.

```bash
npm ci
npx eas build --profile development --platform ios      # requires an Apple account
npx eas build --profile development --platform android
```

Install the resulting build on a physical device. A simulator/emulator is
acceptable for Android notification timing but **not** for:

- Face ID / Touch ID / fingerprint (simulators fake enrolment inconsistently)
- The share sheet (no real receiving apps installed)

### Config that had to be in place first

These were missing and were added before this pass could start:

| Item                               | Why it blocks the pass                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `expo-local-authentication` plugin | Without it, `NSFaceIDUsageDescription` is absent from `Info.plist` and **iOS terminates the app** the first time Face ID is invoked |
| `expo-notifications` plugin        | Sets the Android notification icon and accent colour; without it, reminders post with a default glyph                               |
| `expo-dev-client`                  | Required to install a build that contains these native modules                                                                      |
| `eas.json`                         | No build profiles existed, so no build could be produced                                                                            |

---

## Recording template

Fill one block per platform. Record the **build id**, not just "latest".

```
Platform:        iOS / Android
Device:          (e.g. iPhone 13 mini, Pixel 6a)
OS version:
Build profile:   development / preview
Build id:
App version:     1.0.0
Tester:
Date:
```

Mark each case `PASS`, `FAIL`, or `BLOCKED`, with a note on anything that
surprised you. A case that could not be attempted is `BLOCKED`, never `PASS`.

---

## 1. App lock

Reference: `src/security/lockPolicy.ts`, `src/security/AppLock.tsx`.
Unlock state is deliberately **in memory only** — nothing is persisted.

| #    | Case                            | Steps                                                            | Expected                                                                      | Result |
| ---- | ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| 1.1  | Cold start locked               | Enable App lock. Force-quit. Relaunch.                           | Lock screen appears before any content; biometric prompt fires once           |        |
| 1.2  | No content leaks behind lock    | At 1.1, screenshot / app switcher                                | Only the lock screen — no cycle day, name, or prediction visible              |        |
| 1.3  | Unlock succeeds                 | Authenticate                                                     | App opens on the screen you left                                              |        |
| 1.4  | Cancel keeps it locked          | Relaunch, dismiss the prompt                                     | Stays locked, shows "Cancelled. Luma stays locked." Tapping Unlock re-prompts |        |
| 1.5  | Failed auth                     | Fail biometrics 3×                                               | Stays locked; message offers retry; device passcode fallback available        |        |
| 1.6  | Timeout — immediate             | Set Immediately. Background, return at once                      | Locked                                                                        |        |
| 1.7  | Timeout — 1 minute (inside)     | Set 1 minute. Background 20s, return                             | **Not** locked                                                                |        |
| 1.8  | Timeout — 1 minute (outside)    | Background 90s, return                                           | Locked                                                                        |        |
| 1.9  | Timeout — 5 minutes             | Background 4 min, return → not locked. Background 6 min → locked | As stated                                                                     |        |
| 1.10 | iOS app-switcher transient      | Swipe up to switcher, return immediately, with 1 min set         | Not locked (`inactive` starts the clock but does not lock)                    |        |
| 1.11 | Incoming call / Control Centre  | Trigger overlay, dismiss                                         | Same as 1.10                                                                  |        |
| 1.12 | Disabling releases              | Lock, unlock, turn App lock off, force-quit, relaunch            | Opens straight to Today                                                       |        |
| 1.13 | Unavailable biometrics          | Remove all device biometrics **and** passcode, relaunch          | Setting reads "Unavailable…"; app opens normally; **not** locked out          |        |
| 1.14 | Enabling when unavailable       | With no enrolment, tap the toggle                                | Alert explains; toggle stays off                                              |        |
| 1.15 | Enrolment removed while enabled | Enable lock, then remove device passcode, relaunch               | App opens (fails open, not locked out)                                        |        |
| 1.16 | No persisted auth               | Unlock, force-quit, relaunch                                     | Locked again — proves nothing was written to disk                             |        |

## 2. Native file share

Reference: `src/export/exportFile.ts`. Web is already verified; this is the
native path only.

| #    | Case                        | Steps                                                                            | Expected                                                        | Result |
| ---- | --------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| 2.1  | JSON share sheet            | Privacy → Export JSON → confirm                                                  | Share sheet opens with `luma-export-YYYY-MM-DD.json`            |        |
| 2.2  | JSON is real and valid      | Send to Files / Drive, open it                                                   | Parses; contains `luma_export_v1`, episodes, logs               |        |
| 2.3  | CSV share sheet             | Export CSV → confirm                                                             | Sheet opens with `luma-export-YYYY-MM-DD.csv`                   |        |
| 2.4  | CSV opens as a spreadsheet  | Send to a spreadsheet app                                                        | Opens as columns, not one text blob — confirms `text/csv` + UTI |        |
| 2.5  | Unicode survives            | Log a note with emoji and non-Latin text, export CSV, open                       | Characters intact, not mojibake                                 |        |
| 2.6  | Multi-line note             | Note containing a comma, a quote, and a newline                                  | Stays in **one row**, one cell                                  |        |
| 2.7  | Empty dataset               | Reset data, export CSV before logging                                            | Header-only file, no crash                                      |        |
| 2.8  | Confirmation names contents | Tap Export                                                                       | Dialog states private notes are included                        |        |
| 2.9  | Cancel the confirmation     | Tap Export → Cancel                                                              | No share sheet, no file written                                 |        |
| 2.10 | Dismiss the share sheet     | Open sheet, swipe away                                                           | No error, no stuck "Preparing…"                                 |        |
| 2.11 | **Temp file cleanup**       | After 2.1 and 2.10, inspect app cache dir (Xcode container / `adb shell run-as`) | No `luma-export-*` file remains                                 |        |
| 2.12 | Cleanup after failure       | Airplane mode + a share target that fails                                        | Error alert; still no file left in cache                        |        |
| 2.13 | Repeat exports              | Export 5× in a row                                                               | No accumulation in cache; filenames stable                      |        |

## 3. Notifications

Reference: `src/notifications/plan.ts`, `scheduler.ts`. Reconciliation is diff
based; verify with `getAllScheduledNotificationsAsync` where noted.

Time travel: change the **device** clock/timezone, not the app's.

| #    | Case                            | Steps                                               | Expected                                                          | Result |
| ---- | ------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ------ |
| 3.1  | Permission on enable only       | Fresh install → open Notifications screen           | **No** system prompt on arrival                                   |        |
| 3.2  | Prompt on first toggle          | Enable Period prediction                            | System prompt appears                                             |        |
| 3.3  | Grant                           | Accept                                              | Toggle turns on; a notification is scheduled                      |        |
| 3.4  | Deny                            | Deny (fresh install, second device)                 | Toggle stays off; red banner + "Open device settings"             |        |
| 3.5  | Denied clears queue             | Grant, schedule, revoke in OS settings, reopen app  | Nothing remains scheduled                                         |        |
| 3.6  | Android 13+ runtime permission  | Android 13+ fresh install                           | POST_NOTIFICATIONS requested at 3.2, not at launch                |        |
| 3.7  | Delivery                        | Set device clock to 09:00 the day before the window | Prediction reminder posts                                         |        |
| 3.8  | Preparation lead                | Clock to 18:00 three days before window             | Preparation reminder posts                                        |        |
| 3.9  | Daily reminder                  | Enable, clock to 20:00                              | Posts; repeats the next day                                       |        |
| 3.10 | **No duplicates**               | Background/foreground the app 10×                   | Scheduled count unchanged                                         |        |
| 3.11 | Reschedule on prediction change | Log a period that moves the window                  | Old reminder cancelled, new one at the new date — never both      |        |
| 3.12 | Disable cancels one             | Turn Preparation off                                | Only that reminder disappears; prediction survives                |        |
| 3.13 | Discreet wording                | Enable discreet, wait for a delivery                | Lock screen reads "You have a Luma update" — **no** period detail |        |
| 3.14 | Discreet switch reschedules     | Toggle discreet with reminders pending              | Queue replaced, not duplicated                                    |        |
| 3.15 | Timezone change                 | Fly the clock 8 zones, foreground the app           | Reminder still fires at 09:00 **local**                           |        |
| 3.16 | DST transition                  | Set clock before a DST boundary, cross it           | Fires at the intended wall-clock hour                             |        |
| 3.17 | Android channel                 | Inspect app notification settings                   | "Cycle reminders" channel exists, lock-screen visibility private  |        |
| 3.18 | Delete cancels all              | Privacy → Delete all my data                        | Zero scheduled notifications remain                               |        |
| 3.19 | Reset cancels all               | You → Delete data and restart                       | Same                                                              |        |
| 3.20 | Nothing outlives the data       | After 3.18, advance the clock past a former trigger | Nothing posts                                                     |        |

## 4. Lifecycle and install

| #    | Case                             | Steps                                                        | Expected                                                         | Result |
| ---- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- | ------ |
| 4.1  | Fresh install                    | Install, complete onboarding                                 | Lands on Today with a seeded first cycle                         |        |
| 4.2  | Onboarding resume                | Force-quit mid-onboarding, relaunch                          | Resumes with previous answers intact                             |        |
| 4.3  | Upgrade with existing data       | Install previous build, add logs, install this build over it | All logs, episodes, and settings survive                         |        |
| 4.4  | Upgrade with lock on             | Same, with App lock enabled                                  | Still enabled and enforced after upgrade                         |        |
| 4.5  | Background/foreground            | Cycle 20× across all tabs                                    | No blank screens, no duplicate notifications, no stuck animation |        |
| 4.6  | **Reveal never strands content** | Background during the launch animation, return               | Content fully opaque, never stuck faded                          |        |
| 4.7  | Device reboot — notifications    | Schedule, reboot, advance clock                              | Reminder still posts (Android re-registers on boot)              |        |
| 4.8  | Device reboot — lock             | Enable lock, reboot, open                                    | Locked                                                           |        |
| 4.9  | Low storage                      | Fill storage, export                                         | Fails with a clear message, no partial file                      |        |
| 4.10 | Dynamic type                     | Set the largest system font                                  | Today, Log, Insights remain readable and unclipped               |        |
| 4.11 | Reduced motion                   | Enable OS reduce-motion                                      | Content appears instantly, no animation                          |        |
| 4.12 | Dark / light                     | Switch OS appearance while open                              | Theme follows immediately                                        |        |
| 4.13 | Landscape / tablet               | Rotate; open on iPad                                         | No overflow, dock stays reachable                                |        |
| 4.14 | Android back gesture             | Navigate deep, gesture back repeatedly                       | Unwinds correctly, never exits from a sub-screen                 |        |

## 5. PWA (iOS Home Screen)

The primary visitor surface. These cases do **not** need a native development
build. Use the installed HTTPS Home Screen app, not a Safari tab, except where
noted.

Reference: `src/sync/outbox.ts`, `src/notifications/plan.ts`, `public/sw.js`,
`api/push-dispatch.js`.

| #   | Case                                | Steps                                                                                       | Expected                                                                                      | Result |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| 5.1 | Airplane-mode save                  | Sign in, hydrate, enable airplane mode, save tonight’s log                                  | Log appears locally. Banner: “Saved on this device — it will sync when you’re back online”    |        |
| 5.2 | Sync when back online               | After 5.1, turn the network on, foreground the app                                          | Banner clears; the log is on the account                                                      |        |
| 5.3 | First launch still needs network    | Sign out, airplane mode, open the Home Screen icon                                          | Cannot hydrate; no anonymous journal is created                                               |        |
| 5.4 | Due card without push               | Enable daily log even if Web Push is not configured; leave today empty                      | Today shows a due card. Dismiss hides it for the rest of the calendar day only                |        |
| 5.5 | Safari tab is honest                | Open Luma in a normal Safari tab, turn on a delivery category                               | Copy asks to Add to Home Screen. No silent no-op. Due cards still work on Today               |        |
| 5.6 | Home Screen permission              | Open from the icon, enable Period prediction                                                | System notification permission is requested from inside the PWA                               |        |
| 5.7 | Web Push delivery (when configured) | With VAPID + collection + cron, enable a category, background or close the PWA past trigger | A banner arrives (may be delayed on iOS). Default text is discreet unless detailed text is on |        |
| 5.8 | Detailed text off                   | Discreet mode off, Detailed notification text off, wait for a delivery                      | Lock screen reads “You have a Luma update” — no period detail                                 |        |
| 5.9 | Sign-out wipes the outbox           | Queue an offline save, sign out, sign in as the same or another user                        | The queued write is gone from this device; it is not applied as someone else                  |        |

---

## Known risk points

Where I would expect failures first, based on how this is built:

1. **iOS Face ID without the plist string** — was a hard crash; the plugin is
   now configured, but 1.1 on a Face ID device is the single most important
   case in this document.
2. **Trigger shape parsing** — `triggerInstant()` in `scheduler.ts` normalises
   the OS trigger object to an epoch. If iOS and Android report different shapes
   than expected it silently returns `0`, which would make every sync think the
   time moved and reschedule constantly. **Case 3.10 is the canary.**
3. **Android boot persistence** — scheduled notifications surviving a reboot is
   handled by the OS, not by us. 4.7 verifies rather than assumes.
4. **Share-sheet cleanup timing** — the temp file is deleted as soon as
   `shareAsync` resolves. If a receiving app reads lazily it may get a missing
   file. 2.2 and 2.4 confirm the content actually arrived.
5. **`expo-sharing` cannot report cancellation** — 2.10 confirms dismissal is
   handled gracefully; it cannot confirm whether a send occurred, and the UI
   deliberately never claims one did.
6. **iOS Web Push delay** — Home Screen only, permission from that icon, and
   banners can arrive late. 5.5–5.7 are the canary; never treat a Safari tab
   as a failed push install.

## Sign-off

The gate is met when every case is `PASS` or has a recorded, accepted `FAIL`.
On completion, update the **Release status** table in `PRODUCT.md` — that table
is the single source of truth for what is verified.
