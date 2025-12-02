/**
 * CircularProgress - Dairesel ilerleme göstergesi
 * View-based implementation - SVG gerektirmez
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';

const CircularProgress = ({ percentage, size = 56, color }) => {
  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        borderWidth: 3,
        borderColor: color,
      }
    ]}>
      {/* Progress göstergesi olarak doluluk efekti */}
      <View style={[
        styles.fill,
        {
          width: size - 6,
          height: size - 6,
          borderRadius: (size - 6) / 2,
          backgroundColor: color + Math.round(percentage * 0.4).toString(16).padStart(2, '0'),
        }
      ]} />
      <Text style={[styles.text, { color }]}>
        %{percentage}
      </Text>
    </View>
  );
};

export const getConfidenceColor = (confidence) => {
  if (confidence >= 70) return COLORS.success;
  if (confidence >= 50) return COLORS.warning;
  return COLORS.danger;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    zIndex: 1,
  },
});

export default CircularProgress;
