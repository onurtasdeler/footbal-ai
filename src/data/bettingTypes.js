/**
 * Bahis Türleri Veritabanı
 * 12 kategori, 85+ bahis türü
 */

export const BETTING_CATEGORIES = {
  mac_sonucu: {
    id: 'mac_sonucu',
    name: 'Maç Sonucu',
    icon: 'trophy-outline',
    color: '#00d4aa',
  },
  devre_bazli: {
    id: 'devre_bazli',
    name: 'Devre Bazlı',
    icon: 'time-outline',
    color: '#007AFF',
  },
  gol_bahisleri: {
    id: 'gol_bahisleri',
    name: 'Gol Bahisleri',
    icon: 'football-outline',
    color: '#00d977',
  },
  handikap: {
    id: 'handikap',
    name: 'Handikap',
    icon: 'scale-outline',
    color: '#5856D6',
  },
  skor_bahisleri: {
    id: 'skor_bahisleri',
    name: 'Skor Bahisleri',
    icon: 'grid-outline',
    color: '#FF9500',
  },
  gol_zamanlama: {
    id: 'gol_zamanlama',
    name: 'Gol Zamanlama',
    icon: 'timer-outline',
    color: '#FF2D55',
  },
  oyuncu_bahisleri: {
    id: 'oyuncu_bahisleri',
    name: 'Oyuncu Bahisleri',
    icon: 'person-outline',
    color: '#AF52DE',
  },
  korner_bahisleri: {
    id: 'korner_bahisleri',
    name: 'Korner Bahisleri',
    icon: 'flag-outline',
    color: '#5AC8FA',
  },
  kart_bahisleri: {
    id: 'kart_bahisleri',
    name: 'Kart Bahisleri',
    icon: 'card-outline',
    color: '#FF3B30',
  },
  ozel_bahisler: {
    id: 'ozel_bahisler',
    name: 'Özel Bahisler',
    icon: 'star-outline',
    color: '#FFD60A',
  },
  uzun_vadeli: {
    id: 'uzun_vadeli',
    name: 'Uzun Vadeli',
    icon: 'calendar-outline',
    color: '#34C759',
  },
  canli_bahis_ozel: {
    id: 'canli_bahis_ozel',
    name: 'Canlı Bahis',
    icon: 'radio-outline',
    color: '#FF453A',
  },
};

export const BETTING_TYPES = {
  // Maç Sonucu Bahisleri
  mac_sonucu: [
    {
      id: 'MS1',
      ad: 'Maç Sonucu - Ev Sahibi',
      aciklama: 'Ev sahibi takımın maçı kazanması',
      secenekler: ['Ev Kazanır'],
      populerlik: 100,
      zorluk: 'kolay',
    },
    {
      id: 'MS0',
      ad: 'Maç Sonucu - Beraberlik',
      aciklama: 'Maçın berabere bitmesi',
      secenekler: ['Beraberlik'],
      populerlik: 85,
      zorluk: 'orta',
    },
    {
      id: 'MS2',
      ad: 'Maç Sonucu - Deplasman',
      aciklama: 'Deplasman takımının maçı kazanması',
      secenekler: ['Deplasman Kazanır'],
      populerlik: 95,
      zorluk: 'kolay',
    },
    {
      id: 'CS1X',
      ad: 'Çifte Şans - 1X',
      aciklama: 'Ev sahibi kazanır veya beraberlik',
      secenekler: ['1 veya X'],
      populerlik: 80,
      zorluk: 'kolay',
    },
    {
      id: 'CS12',
      ad: 'Çifte Şans - 12',
      aciklama: 'Ev sahibi veya deplasman kazanır (beraberlik yok)',
      secenekler: ['1 veya 2'],
      populerlik: 75,
      zorluk: 'orta',
    },
    {
      id: 'CSX2',
      ad: 'Çifte Şans - X2',
      aciklama: 'Beraberlik veya deplasman kazanır',
      secenekler: ['X veya 2'],
      populerlik: 78,
      zorluk: 'kolay',
    },
  ],

  // Devre Bazlı Bahisler
  devre_bazli: [
    {
      id: 'IY1',
      ad: 'İlk Yarı Sonucu - Ev',
      aciklama: 'İlk yarı sonunda ev sahibi önde',
      secenekler: ['İY Ev Önde'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: 'IY0',
      ad: 'İlk Yarı Sonucu - Berabere',
      aciklama: 'İlk yarı berabere biter',
      secenekler: ['İY Berabere'],
      populerlik: 75,
      zorluk: 'orta',
    },
    {
      id: 'IY2',
      ad: 'İlk Yarı Sonucu - Deplasman',
      aciklama: 'İlk yarı sonunda deplasman önde',
      secenekler: ['İY Deplasman Önde'],
      populerlik: 65,
      zorluk: 'orta',
    },
    {
      id: 'IYMS_1_1',
      ad: 'İY/MS - 1/1',
      aciklama: 'İlk yarı ve maç sonucu ev sahibi',
      secenekler: ['1/1'],
      populerlik: 60,
      zorluk: 'zor',
    },
    {
      id: 'IYMS_X_X',
      ad: 'İY/MS - X/X',
      aciklama: 'İlk yarı ve maç sonucu berabere',
      secenekler: ['X/X'],
      populerlik: 40,
      zorluk: 'cok_zor',
    },
    {
      id: 'IYMS_2_2',
      ad: 'İY/MS - 2/2',
      aciklama: 'İlk yarı ve maç sonucu deplasman',
      secenekler: ['2/2'],
      populerlik: 55,
      zorluk: 'zor',
    },
  ],

  // Gol Bahisleri
  gol_bahisleri: [
    {
      id: '1.5U',
      ad: '1.5 Üst',
      aciklama: 'Maçta 2 veya daha fazla gol atılması',
      secenekler: ['1.5 Üst'],
      populerlik: 90,
      zorluk: 'kolay',
    },
    {
      id: '1.5A',
      ad: '1.5 Alt',
      aciklama: 'Maçta 0 veya 1 gol atılması',
      secenekler: ['1.5 Alt'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: '2.5U',
      ad: '2.5 Üst',
      aciklama: 'Maçta 3 veya daha fazla gol atılması',
      secenekler: ['2.5 Üst'],
      populerlik: 95,
      zorluk: 'kolay',
    },
    {
      id: '2.5A',
      ad: '2.5 Alt',
      aciklama: 'Maçta 0, 1 veya 2 gol atılması',
      secenekler: ['2.5 Alt'],
      populerlik: 85,
      zorluk: 'kolay',
    },
    {
      id: '3.5U',
      ad: '3.5 Üst',
      aciklama: 'Maçta 4 veya daha fazla gol atılması',
      secenekler: ['3.5 Üst'],
      populerlik: 80,
      zorluk: 'orta',
    },
    {
      id: '3.5A',
      ad: '3.5 Alt',
      aciklama: 'Maçta 3 veya daha az gol atılması',
      secenekler: ['3.5 Alt'],
      populerlik: 75,
      zorluk: 'kolay',
    },
    {
      id: 'KGV',
      ad: 'Karşılıklı Gol Var',
      aciklama: 'Her iki takımın da en az 1 gol atması',
      secenekler: ['KG Var'],
      populerlik: 92,
      zorluk: 'kolay',
    },
    {
      id: 'KGY',
      ad: 'Karşılıklı Gol Yok',
      aciklama: 'En az bir takımın gol atamaması',
      secenekler: ['KG Yok'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: 'TG01',
      ad: 'Toplam Gol 0-1',
      aciklama: 'Maçta toplam 0 veya 1 gol',
      secenekler: ['0-1 Gol'],
      populerlik: 60,
      zorluk: 'zor',
    },
    {
      id: 'TG23',
      ad: 'Toplam Gol 2-3',
      aciklama: 'Maçta toplam 2 veya 3 gol',
      secenekler: ['2-3 Gol'],
      populerlik: 75,
      zorluk: 'orta',
    },
    {
      id: 'TG46',
      ad: 'Toplam Gol 4-6',
      aciklama: 'Maçta toplam 4, 5 veya 6 gol',
      secenekler: ['4-6 Gol'],
      populerlik: 55,
      zorluk: 'zor',
    },
  ],

  // Handikap Bahisleri
  handikap: [
    {
      id: 'AH1_-1',
      ad: 'Asya Handikap Ev -1',
      aciklama: 'Ev sahibi 1 gol farkla başlar',
      secenekler: ['Ev -1'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: 'AH1_-1.5',
      ad: 'Asya Handikap Ev -1.5',
      aciklama: 'Ev sahibi 1.5 gol farkla başlar',
      secenekler: ['Ev -1.5'],
      populerlik: 65,
      zorluk: 'orta',
    },
    {
      id: 'AH2_+1',
      ad: 'Asya Handikap Dep +1',
      aciklama: 'Deplasman 1 gol avantajlı başlar',
      secenekler: ['Dep +1'],
      populerlik: 68,
      zorluk: 'orta',
    },
    {
      id: 'AH2_+1.5',
      ad: 'Asya Handikap Dep +1.5',
      aciklama: 'Deplasman 1.5 gol avantajlı başlar',
      secenekler: ['Dep +1.5'],
      populerlik: 72,
      zorluk: 'kolay',
    },
    {
      id: 'EH1_-1',
      ad: 'Avrupa Handikap Ev -1',
      aciklama: 'Ev sahibi 2+ farkla kazanırsa',
      secenekler: ['Ev -1 (Avrupa)'],
      populerlik: 60,
      zorluk: 'zor',
    },
  ],

  // Skor Bahisleri
  skor_bahisleri: [
    {
      id: 'DS_1-0',
      ad: 'Doğru Skor 1-0',
      aciklama: 'Maç 1-0 biter',
      secenekler: ['1-0'],
      populerlik: 50,
      zorluk: 'cok_zor',
    },
    {
      id: 'DS_2-1',
      ad: 'Doğru Skor 2-1',
      aciklama: 'Maç 2-1 biter',
      secenekler: ['2-1'],
      populerlik: 55,
      zorluk: 'cok_zor',
    },
    {
      id: 'DS_1-1',
      ad: 'Doğru Skor 1-1',
      aciklama: 'Maç 1-1 biter',
      secenekler: ['1-1'],
      populerlik: 60,
      zorluk: 'cok_zor',
    },
    {
      id: 'DS_2-0',
      ad: 'Doğru Skor 2-0',
      aciklama: 'Maç 2-0 biter',
      secenekler: ['2-0'],
      populerlik: 45,
      zorluk: 'cok_zor',
    },
    {
      id: 'DS_0-0',
      ad: 'Doğru Skor 0-0',
      aciklama: 'Maç 0-0 biter',
      secenekler: ['0-0'],
      populerlik: 40,
      zorluk: 'cok_zor',
    },
  ],

  // Gol Zamanlama
  gol_zamanlama: [
    {
      id: 'IG_EV',
      ad: 'İlk Golü Atan - Ev',
      aciklama: 'Ev sahibi ilk golü atar',
      secenekler: ['İlk Gol Ev'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: 'IG_DEP',
      ad: 'İlk Golü Atan - Dep',
      aciklama: 'Deplasman ilk golü atar',
      secenekler: ['İlk Gol Dep'],
      populerlik: 65,
      zorluk: 'orta',
    },
    {
      id: 'SG_EV',
      ad: 'Son Golü Atan - Ev',
      aciklama: 'Ev sahibi son golü atar',
      secenekler: ['Son Gol Ev'],
      populerlik: 55,
      zorluk: 'zor',
    },
    {
      id: 'G_1_15',
      ad: 'Gol 1-15 Dakika',
      aciklama: '1-15 dakika arasında gol olur',
      secenekler: ['Gol 1-15'],
      populerlik: 50,
      zorluk: 'orta',
    },
    {
      id: 'G_76_90',
      ad: 'Gol 76-90 Dakika',
      aciklama: '76-90 dakika arasında gol olur',
      secenekler: ['Gol 76-90'],
      populerlik: 60,
      zorluk: 'orta',
    },
  ],

  // Oyuncu Bahisleri
  oyuncu_bahisleri: [
    {
      id: 'GOL_HZ',
      ad: 'Her Zaman Golcü',
      aciklama: 'Oyuncu maçta en az 1 gol atar',
      secenekler: ['Golcü'],
      populerlik: 75,
      zorluk: 'orta',
    },
    {
      id: 'GOL_IG',
      ad: 'İlk Golcü',
      aciklama: 'Oyuncu ilk golü atar',
      secenekler: ['İlk Golcü'],
      populerlik: 60,
      zorluk: 'cok_zor',
    },
    {
      id: 'GOL_2+',
      ad: '2+ Gol',
      aciklama: 'Oyuncu 2 veya daha fazla gol atar',
      secenekler: ['2+ Gol'],
      populerlik: 45,
      zorluk: 'cok_zor',
    },
    {
      id: 'ASIST',
      ad: 'Asist Yapan',
      aciklama: 'Oyuncu en az 1 asist yapar',
      secenekler: ['Asist'],
      populerlik: 50,
      zorluk: 'zor',
    },
  ],

  // Korner Bahisleri
  korner_bahisleri: [
    {
      id: 'K_8.5U',
      ad: 'Korner 8.5 Üst',
      aciklama: 'Maçta 9+ korner olur',
      secenekler: ['8.5 Üst'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: 'K_10.5U',
      ad: 'Korner 10.5 Üst',
      aciklama: 'Maçta 11+ korner olur',
      secenekler: ['10.5 Üst'],
      populerlik: 65,
      zorluk: 'orta',
    },
    {
      id: 'K_10.5A',
      ad: 'Korner 10.5 Alt',
      aciklama: 'Maçta 10 veya daha az korner olur',
      secenekler: ['10.5 Alt'],
      populerlik: 68,
      zorluk: 'orta',
    },
    {
      id: 'IK_EV',
      ad: 'İlk Korner - Ev',
      aciklama: 'İlk korneri ev sahibi kullanır',
      secenekler: ['İlk Korner Ev'],
      populerlik: 55,
      zorluk: 'orta',
    },
  ],

  // Kart Bahisleri
  kart_bahisleri: [
    {
      id: 'KART_3.5U',
      ad: 'Kart 3.5 Üst',
      aciklama: 'Maçta 4+ kart çıkar',
      secenekler: ['3.5 Üst'],
      populerlik: 65,
      zorluk: 'orta',
    },
    {
      id: 'KART_4.5U',
      ad: 'Kart 4.5 Üst',
      aciklama: 'Maçta 5+ kart çıkar',
      secenekler: ['4.5 Üst'],
      populerlik: 60,
      zorluk: 'orta',
    },
    {
      id: 'KIRMIZI_VAR',
      ad: 'Kırmızı Kart Var',
      aciklama: 'Maçta en az 1 kırmızı kart çıkar',
      secenekler: ['Kırmızı Var'],
      populerlik: 45,
      zorluk: 'zor',
    },
    {
      id: 'IK_1_30',
      ad: 'İlk Kart 1-30',
      aciklama: 'İlk kart 1-30 dakikada çıkar',
      secenekler: ['İlk Kart 1-30'],
      populerlik: 50,
      zorluk: 'orta',
    },
  ],

  // Özel Bahisler
  ozel_bahisler: [
    {
      id: 'PENALTI_VAR',
      ad: 'Penaltı Var',
      aciklama: 'Maçta en az 1 penaltı verilir',
      secenekler: ['Penaltı Var'],
      populerlik: 40,
      zorluk: 'zor',
    },
    {
      id: 'KKG',
      ad: 'Kendi Kalesine Gol',
      aciklama: 'Maçta kendi kalesine gol olur',
      secenekler: ['KKG Var'],
      populerlik: 30,
      zorluk: 'cok_zor',
    },
    {
      id: 'TEMIZ_SAHA',
      ad: 'Temiz Saha',
      aciklama: 'Bir takım gol yemez',
      secenekler: ['Clean Sheet'],
      populerlik: 70,
      zorluk: 'orta',
    },
    {
      id: 'GERIDEN_GELME',
      ad: 'Geriden Gelme',
      aciklama: 'Bir takım yenik durumdan galip gelir',
      secenekler: ['Comeback'],
      populerlik: 35,
      zorluk: 'cok_zor',
    },
  ],

  // Uzun Vadeli
  uzun_vadeli: [
    {
      id: 'SAMPIYONLUK',
      ad: 'Şampiyonluk',
      aciklama: 'Sezonu şampiyon tamamlar',
      secenekler: ['Şampiyon'],
      populerlik: 85,
      zorluk: 'orta',
    },
    {
      id: 'ILKUC',
      ad: 'İlk Üç',
      aciklama: 'Sezonu ilk 3te bitirir',
      secenekler: ['İlk 3'],
      populerlik: 75,
      zorluk: 'kolay',
    },
    {
      id: 'KUME_DUSME',
      ad: 'Küme Düşme',
      aciklama: 'Küme düşer',
      secenekler: ['Küme Düşer'],
      populerlik: 50,
      zorluk: 'orta',
    },
  ],

  // Canlı Bahis Özel
  canli_bahis_ozel: [
    {
      id: 'SG_EV_CANLI',
      ad: 'Sonraki Gol - Ev',
      aciklama: 'Sonraki golü ev sahibi atar',
      secenekler: ['Sonraki Gol Ev'],
      populerlik: 80,
      zorluk: 'orta',
    },
    {
      id: 'SG_DEP_CANLI',
      ad: 'Sonraki Gol - Dep',
      aciklama: 'Sonraki golü deplasman atar',
      secenekler: ['Sonraki Gol Dep'],
      populerlik: 75,
      zorluk: 'orta',
    },
    {
      id: 'SG_YOK_CANLI',
      ad: 'Sonraki Gol - Yok',
      aciklama: 'Başka gol olmaz',
      secenekler: ['Gol Yok'],
      populerlik: 50,
      zorluk: 'zor',
    },
  ],
};

// Risk seviyeleri
export const RISK_LEVELS = {
  dusuk: {
    id: 'dusuk',
    label: 'Düşük Risk',
    color: '#00d977',
    bgColor: 'rgba(0, 217, 119, 0.12)',
    icon: 'shield-checkmark',
    description: 'Daha güvenli, düşük oran',
  },
  orta: {
    id: 'orta',
    label: 'Orta Risk',
    color: '#ff9f0a',
    bgColor: 'rgba(255, 159, 10, 0.12)',
    icon: 'alert-circle',
    description: 'Dengeli risk/ödül oranı',
  },
  yuksek: {
    id: 'yuksek',
    label: 'Yüksek Risk',
    color: '#ff453a',
    bgColor: 'rgba(255, 69, 58, 0.12)',
    icon: 'warning',
    description: 'Riskli, yüksek oran',
  },
  cok_yuksek: {
    id: 'cok_yuksek',
    label: 'Çok Yüksek',
    color: '#8B0000',
    bgColor: 'rgba(139, 0, 0, 0.12)',
    icon: 'skull-outline',
    description: 'Aşırı riskli, çok yüksek oran',
  },
};

// Zorluk seviyeleri için renk eşleştirmesi
export const DIFFICULTY_TO_RISK = {
  kolay: 'dusuk',
  orta: 'orta',
  zor: 'yuksek',
  cok_zor: 'cok_yuksek',
};

// Popüler bahis türlerini getir
export const getPopularBettingTypes = (limit = 10) => {
  const allTypes = [];

  Object.entries(BETTING_TYPES).forEach(([category, types]) => {
    types.forEach(type => {
      allTypes.push({
        ...type,
        category,
        categoryName: BETTING_CATEGORIES[category]?.name || category,
      });
    });
  });

  return allTypes
    .sort((a, b) => b.populerlik - a.populerlik)
    .slice(0, limit);
};

// Kategoriye göre bahis türlerini getir
export const getBettingTypesByCategory = (categoryId) => {
  return BETTING_TYPES[categoryId] || [];
};

// Tüm bahis türlerini flat liste olarak getir
export const getAllBettingTypes = () => {
  const allTypes = [];

  Object.entries(BETTING_TYPES).forEach(([category, types]) => {
    types.forEach(type => {
      allTypes.push({
        ...type,
        category,
        categoryName: BETTING_CATEGORIES[category]?.name || category,
      });
    });
  });

  return allTypes;
};

export default {
  BETTING_CATEGORIES,
  BETTING_TYPES,
  RISK_LEVELS,
  DIFFICULTY_TO_RISK,
  getPopularBettingTypes,
  getBettingTypesByCategory,
  getAllBettingTypes,
};
