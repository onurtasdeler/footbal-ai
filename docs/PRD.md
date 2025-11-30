# AI Futbol Analiz - Product Requirements Document (PRD)

## Belge Bilgileri
| Alan | Değer |
|------|-------|
| Versiyon | 1.0.0 |
| Tarih | 29 Kasım 2024 |
| Platform | iOS / Android (React Native - Expo) |
| Durum | MVP Geliştirme |

---

## 1. Ürün Özeti

### 1.1 Vizyon
Futbol severler için yapay zeka destekli maç analizi ve canlı skor takibi sunan mobil uygulama.

### 1.2 Hedef Kitle
- Futbol tutkunları
- Bahis analizi yapmak isteyenler
- Canlı skor takip edenler
- Türkiye merkezli kullanıcılar (birincil)

### 1.3 Değer Önerisi
- **AI Destekli Analiz**: Claude AI ile detaylı maç tahminleri
- **Canlı Skorlar**: 15 saniye güncelleme ile gerçek zamanlı takip
- **Kişiselleştirme**: Widget sistemi ile özelleştirilebilir dashboard
- **Türkçe Arayüz**: Tamamen Türkçe kullanıcı deneyimi

---

## 2. Teknik Mimari

### 2.1 Teknoloji Stack'i

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | React Native (Expo) | SDK 54 |
| Runtime | React | 19.1.0 |
| State | React Hooks + AsyncStorage | - |
| API Client | Fetch + Custom Rate Limiter | - |
| AI | Claude Sonnet 4 | - |
| Data | API-Football v3 | Pro Plan |

### 2.2 Proje Yapısı

```
Footbal/
├── App.js                    # Ana uygulama (~5000+ satır)
├── index.js                  # Expo entry point
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js     # Ana sayfa
│   │   └── MatchAnalysisScreen.js
│   └── services/
│       ├── footballApi.js    # API-Football client
│       ├── claudeAi.js       # Claude AI entegrasyonu
│       ├── pollingService.js # Smart polling
│       ├── cacheService.js   # Önbellek yönetimi
│       └── profileService.js # Profil CRUD
├── docs/
│   ├── PRD.md               # Bu belge
│   ├── BETTING_ANALYSIS.md  # Bahis analiz sistemi
│   └── UI_DESIGN_PROMPTS.md # Tasarım promptları
└── assets/
    └── images/
```

### 2.3 API Entegrasyonları

#### API-Football v3
- **Base URL**: `https://v3.football.api-sports.io`
- **Rate Limit**: 300 req/min (280 güvenlik marjı)
- **Plan**: Pro

| Endpoint | Kullanım |
|----------|----------|
| `/fixtures?date=` | Günün maçları |
| `/fixtures?live=all` | Canlı skorlar |
| `/fixtures/statistics` | Maç istatistikleri |
| `/fixtures/events` | Goller, kartlar |
| `/fixtures/lineups` | Kadrolar |
| `/fixtures/headtohead` | H2H geçmişi |
| `/predictions` | API tahminleri |
| `/standings` | Puan durumu |

#### Claude AI
- **Model**: Claude Sonnet 4
- **Dil**: Türkçe prompts
- **Output**: Structured JSON

---

## 3. Özellikler (Features)

### 3.1 Ana Sayfa (HomeScreen)
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Günün Maçları | ✅ Tamamlandı | Tarihe göre maç listesi |
| Lig Filtreleme | ✅ Tamamlandı | Ülke/lig bazlı filtreleme |
| Canlı Maç Badge | ✅ Tamamlandı | Canlı maçlarda görsel işaret |
| Pull-to-Refresh | ✅ Tamamlandı | Aşağı çekerek yenileme |

### 3.2 Canlı Ekran (LiveScreen)
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Canlı Maçlar | ✅ Tamamlandı | Tüm canlı maçlar |
| 15sn Güncelleme | ✅ Tamamlandı | Smart polling |
| Skor Animasyonu | ✅ Tamamlandı | Gol pulse efekti |
| Maç Dakikası | ✅ Tamamlandı | Canlı dakika gösterimi |

### 3.3 Maç Detay (MatchDetailScreen)
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Maç Bilgileri | ✅ Tamamlandı | Temel maç detayları |
| H2H Geçmişi | ✅ Tamamlandı | Son karşılaşmalar |
| İstatistikler | ✅ Tamamlandı | Detaylı maç stats |
| Kadrolar | ✅ Tamamlandı | Takım kadroları |
| AI Analizi | ✅ Tamamlandı | Claude tahminleri |

### 3.4 Canlı Maç Detay (LiveMatchDetailScreen)
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Saha Görselleştirme | ✅ Tamamlandı | Futbol sahası UI |
| Canlı Olaylar | ✅ Tamamlandı | Goller, kartlar |
| Canlı İstatistik | ✅ Tamamlandı | Real-time stats |
| Timeline | ✅ Tamamlandı | Maç olayları zaman çizelgesi |

### 3.5 Widget Sistemi (WidgetsScreen)
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Canlı Skorlar Widget | ✅ Tamamlandı | Mini canlı skor |
| Yaklaşan Maçlar Widget | ✅ Tamamlandı | Bugünün maçları |
| Puan Durumu Widget | ✅ Tamamlandı | Lig tablosu |
| Widget Ekleme | ✅ Tamamlandı | Yeni widget ekle |
| Widget Silme | ✅ Tamamlandı | Widget kaldır |
| Widget Sıralama | 🔄 Planlandı | Drag-drop |

### 3.6 Profil Ekranı (ProfileScreen)
| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Profil Başlığı | ✅ Tamamlandı | Avatar, isim, üyelik |
| İstatistikler | ✅ Tamamlandı | Tahmin/Başarı/Favori |
| Favori Takımlar | ✅ Tamamlandı | Takım listesi |
| Dil Ayarı | ✅ Tamamlandı | TR/EN |
| Oran Formatı | ✅ Tamamlandı | Decimal/Fractional |
| Önbellek Yönetimi | ✅ Tamamlandı | Cache temizleme |
| Veri Sıfırlama | ✅ Tamamlandı | Tüm verileri sil |

---

## 4. Veri Modelleri

### 4.1 AsyncStorage Keys

```javascript
// Profil
'@profile_user'          // Kullanıcı profili
'@profile_stats'         // İstatistikler
'@profile_appearance'    // Görünüm ayarları
'@profile_predictions'   // Tahmin geçmişi

// Widget
'@user_widgets'          // Widget konfigürasyonu

// Favoriler
'@favorite_teams'        // Favori takımlar
'@favorite_leagues'      // Favori ligler

// Cache
'@api_cache'             // API önbelleği
```

### 4.2 Veri Şemaları

#### User Profile
```json
{
  "displayName": "string",
  "memberSince": "ISO date",
  "lastActive": "ISO timestamp"
}
```

#### User Stats
```json
{
  "totalPredictions": "number",
  "correctPredictions": "number",
  "savedMatches": "number",
  "favoriteTeamsCount": "number"
}
```

#### Widget Config
```json
{
  "id": "string",
  "type": "live_scores|upcoming|standings|...",
  "size": "small|medium|large",
  "position": "number",
  "color": "hex string",
  "settings": {}
}
```

---

## 5. UI/UX Tasarım

### 5.1 Tasarım Sistemi

#### Renk Paleti
| Kullanım | Hex | Açıklama |
|----------|-----|----------|
| Background | #0a0e13 | Ana arka plan |
| Card | #141a22 | Kart arka planı |
| Border | #232d3b | Kenarlıklar |
| Accent | #00d4aa | Vurgu rengi (teal) |
| Text Primary | #ffffff | Ana metin |
| Text Secondary | #737373 | İkincil metin |
| Destructive | #ff3b30 | Hata/silme |
| Live | #ff3b30 | Canlı gösterge |

#### Typography
- **Başlıklar**: System font, 700 weight
- **Body**: System font, 400 weight
- **Sayılar**: Monospace (skorlar için)

### 5.2 iOS HIG Uyumu
- 44pt minimum touch target
- Grouped table sections
- Native Switch components
- SF Symbols uyumlu iconlar (Ionicons)
- Safe area handling

---

## 6. Performans Gereksinimleri

| Metrik | Hedef | Mevcut |
|--------|-------|--------|
| Cold Start | < 3 saniye | ~2.5s |
| API Response | < 500ms | ~300ms |
| UI FPS | 60fps | 60fps |
| Memory | < 150MB | ~100MB |
| Bundle Size | < 50MB | ~35MB |

---

## 7. Güvenlik

### 7.1 API Güvenliği
- API anahtarları `.env` dosyasında
- Rate limiting client-side
- HTTPS only

### 7.2 Veri Güvenliği
- Tüm veriler lokal (AsyncStorage)
- Kullanıcı girişi yok
- Kişisel veri toplanmıyor

---

## 8. Gelecek Planlar (Roadmap)

### v1.1 (Planlandı)
- [ ] Widget drag-drop sıralama
- [ ] Favori takım ekleme UI
- [ ] Tahmin geçmişi ekranı
- [ ] Kaydedilen maçlar

### v1.2 (Düşünülüyor)
- [ ] Dark/Light tema
- [ ] İngilizce dil desteği
- [ ] Maç hatırlatıcıları (local notification)
- [ ] Social sharing

### v2.0 (Vizyon)
- [ ] Backend entegrasyonu
- [ ] Push notifications
- [ ] Kullanıcı hesapları
- [ ] Topluluk tahminleri

---

## 9. Bilinen Kısıtlamalar

| Kısıtlama | Açıklama | Workaround |
|-----------|----------|------------|
| iOS Widget | Native iOS widget desteği yok | Expo managed workflow limiti |
| Push Notification | Backend gerekli | Local notification planlanıyor |
| Offline Mode | Sınırlı | Cache ile temel destek |
| API Limiti | 300 req/min | Smart polling ile optimize |

---

## 10. Başarı Metrikleri (KPIs)

| Metrik | Hedef |
|--------|-------|
| Daily Active Users | - |
| Session Duration | > 5 dakika |
| Crash Rate | < 1% |
| API Success Rate | > 99% |
| User Retention (D7) | > 30% |

---

## 11. Ekler

### A. Referans Belgeler
- [API-Football Documentation](https://www.api-football.com/documentation-v3)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)

### B. İlgili Dosyalar
- `docs/BETTING_ANALYSIS.md` - Bahis analiz sistemi detayları
- `docs/UI_DESIGN_PROMPTS.md` - Tasarım promptları
- `CLAUDE.md` - Geliştirici rehberi
