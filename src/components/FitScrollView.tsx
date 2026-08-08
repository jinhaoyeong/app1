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
    setViewportHeight(event.nativeEvent.layout.height);
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
        setContentHeight(height);
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
});
