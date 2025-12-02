/**
 * DisclaimerBanner - Tahmin uyarı banner'ı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { t } from '../../i18n';

const DisclaimerBanner = () => (
  <View style={styles.banner}>
    <Text style={styles.text}>
      {t('predictions.disclaimerBanner')}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.warning + '15',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  text: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default DisclaimerBanner;
