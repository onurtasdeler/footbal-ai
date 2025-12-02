/**
 * pitchUtils - Saha kadro dizilişi için yardımcı fonksiyonlar
 *
 * FORMATION-BASED PLAYER POSITIONING (HORIZONTAL PITCH)
 * Simetrik ve ortalanmış kadro dizilişi
 * 11 oyuncu: 1 Kaleci + Formasyon (örn: 4-2-3-1 = 10 saha oyuncusu)
 * Kaleci solda, forvetler sağda - her hat dikey olarak MERKEZLENMİŞ
 */

/**
 * Oyuncunun saha üzerindeki pozisyonunu hesaplar
 * @param {string} formation - Formasyon string'i (örn: "4-3-3", "4-4-2", "3-5-2")
 * @param {number} playerIndex - Oyuncu indeksi (0 = kaleci, 1-10 = saha oyuncuları)
 * @returns {{top: string, left: string}} - CSS pozisyon değerleri
 */
export const getPlayerPosition = (formation, playerIndex) => {
  // Formation: "4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "3-4-1-2" etc.
  const lines = formation?.split('-').map(n => parseInt(n)) || [4, 4, 2];
  const totalLines = lines.length;

  // Kaleci pozisyonu (index 0) - sol tarafta, TAM ORTADA
  if (playerIndex === 0) {
    return {
      top: '50%',
      left: '6%'
    };
  }

  // Saha oyuncuları (index 1-10)
  let remainingIndex = playerIndex - 1;
  let lineIndex = 0;
  let positionInLine = 0;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    if (remainingIndex < lines[i]) {
      lineIndex = i;
      positionInLine = remainingIndex;
      found = true;
      break;
    }
    remainingIndex -= lines[i];
  }

  // Eğer index formasyondaki toplam oyuncu sayısını aşarsa, son hatta yerleştir
  if (!found) {
    lineIndex = totalLines - 1;
    positionInLine = 0;
  }

  const playersInThisLine = lines[lineIndex] || 1;

  // YATAY POZİSYON (left): Hatları eşit aralıklarla dağıt
  const leftPercent = 24 + (lineIndex * 20);

  // DİKEY POZİSYON (top): Oyuncuları MERKEZ ETRAFINDA SİMETRİK dağıt
  let topPercent;

  if (playersInThisLine === 1) {
    topPercent = 50;
  } else {
    const totalSpread = Math.min(65, playersInThisLine * 16);
    const spacing = totalSpread / (playersInThisLine - 1);
    const startTop = 50 - (totalSpread / 2);
    topPercent = startTop + (positionInLine * spacing);
  }

  return {
    top: `${Math.max(15, Math.min(85, topPercent))}%`,
    left: `${Math.max(6, Math.min(88, leftPercent))}%`
  };
};

/**
 * Formasyon string'ini doğrular ve düzeltir
 * @param {string} formation - Formasyon string'i
 * @returns {string} - Doğrulanmış formasyon
 */
export const validateFormation = (formation) => {
  if (!formation) return '4-4-2';

  const lines = formation.split('-').map(n => parseInt(n));
  const total = lines.reduce((sum, n) => sum + n, 0);

  // 10 saha oyuncusu olmalı
  if (total !== 10) {
    return '4-4-2'; // Varsayılan formasyon
  }

  return formation;
};
