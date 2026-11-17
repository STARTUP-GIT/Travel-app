import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useAppShell } from '@/providers/app-shell-provider';

const DEFAULT_SYMBOL = require('@/assets/brand/atlaswanders-symbol.svg');

interface LogoProps {
  compact?: boolean;
  style?: ViewStyle;
  variant?: 'light' | 'dark' | 'on-dark';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({
  compact = false,
  style,
  variant = 'on-dark',
  size = 'md',
}: LogoProps) {
  const { config } = useAppShell();
  const displayName = (config.app_name || 'ATLASWANDERS').trim();
  const displayTagline = (config.text || 'Discover Places. Experience Local.').trim();

  if (compact) {
    return <LogoMark style={style} size={size} />;
  }

  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 34;
  const titleSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  const taglineSize = size === 'sm' ? 8 : size === 'lg' ? 10.5 : 9.5;

  const titleColor = variant === 'on-dark' ? '#FFFFFF' : '#0B2545';
  const tagColor = '#D9A441';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { width: iconSize + 4, height: iconSize + 4 }]}>
        <Image
          source={config.icon && config.icon.startsWith('http') ? { uri: config.icon } : DEFAULT_SYMBOL}
          style={{ width: iconSize, height: iconSize }}
          contentFit="contain"
          priority="high"
        />
      </View>
      <View style={styles.textColumn}>
        <Text
          style={[styles.title, { color: titleColor, fontSize: titleSize }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <Text
          style={[styles.tagline, { color: tagColor, fontSize: taglineSize }]}
          numberOfLines={1}
        >
          {displayTagline}
        </Text>
      </View>
    </View>
  );
}

export function LogoMark({
  style,
  size = 'md',
}: {
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { config } = useAppShell();
  const boxSize = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 34 : 28;

  return (
    <View
      style={[
        styles.markBox,
        { width: boxSize, height: boxSize, borderRadius: boxSize * 0.28 },
        style,
      ]}
    >
      <Image
        source={config.icon && config.icon.startsWith('http') ? { uri: config.icon } : DEFAULT_SYMBOL}
        style={{ width: iconSize, height: iconSize }}
        contentFit="contain"
        priority="high"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tagline: {
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  markBox: {
    backgroundColor: '#0B2545',
    borderWidth: 1,
    borderColor: '#0E3A6C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
});
