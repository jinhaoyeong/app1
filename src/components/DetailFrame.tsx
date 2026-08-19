import React, { type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Body, Eyebrow, HeroText, Screen } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { screenTopInset, stackBottomInset } from '@/navigation/tabRoute';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The shared frame for every secondary page: back, eyebrow, hero title, then
 * content. Keeps the app's section rhythm identical outside the tabs.
 */
export function DetailFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, accent } = useTheme();
  const bottom = stackBottomInset(insets.bottom, Platform.OS === 'web');

  return (
    <Screen>
      <View style={styles.shell}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: screenTopInset(insets.top, Platform.OS === 'web'),
              paddingBottom: footer ? spacing.mega : bottom + spacing.mega,
              paddingHorizontal: spacing.xxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal index={0}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.heading}>
              {eyebrow ? <Eyebrow color={accent}>{eyebrow}</Eyebrow> : null}
              <HeroText style={{ marginTop: spacing.sm }}>{title}</HeroText>
              {description ? (
                <Body muted style={{ marginTop: spacing.md, maxWidth: 520 }}>
                  {description}
                </Body>
              ) : null}
            </View>
          </Reveal>
          <Reveal index={1}>
            <View style={styles.body}>{children}</View>
          </Reveal>
        </ScrollView>

        {footer ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: bottom + spacing.lg,
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={styles.footerInner}>{footer}</View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  heading: {
    marginTop: spacing.xxxl,
  },
  body: {
    marginTop: spacing.huge,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
});
