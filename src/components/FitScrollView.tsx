import React, { useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  type ScrollViewProps,
} from 'react-native';

/** Enables scrolling only when content actually overflows its viewport. */
export function FitScrollView({
  children,
  onLayout,
  onContentSizeChange,
  style,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollEnabled =
    viewportHeight === 0 || contentHeight > viewportHeight + 1;

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout?.(event);
    const nextHeight = event.nativeEvent.layout.height;
    setViewportHeight((current) =>
      Math.abs(current - nextHeight) > 0.5 ? nextHeight : current,
    );
  };

  return (
    <ScrollView
      {...props}
      style={[styles.scroll, style]}
      scrollEnabled={scrollEnabled}
      bounces={scrollEnabled}
      alwaysBounceVertical={false}
      onLayout={handleLayout}
      onContentSizeChange={(width, height) => {
        onContentSizeChange?.(width, height);
        setContentHeight((current) =>
          Math.abs(current - height) > 0.5 ? height : current,
        );
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
});
