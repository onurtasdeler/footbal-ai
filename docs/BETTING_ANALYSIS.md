# Bahis Analiz Sistemi - Teknik Dokümantasyon

## Genel Bakış

API-Football v3 kullanarak bahis analizi yapan akıllı tahmin sistemi.

---

## 1. Veri Kaynakları ve Endpoint'ler

### 1.1 Maç Tahminleri
```
GET /predictions?fixture={fixture_id}
```
- Kazanma yüzdeleri (Home/Draw/Away)
- Tavsiye edilen bahis
- Toplam gol tahmini (Over/Under)
- Her iki takım gol atar mı (BTTS)
- Form karşılaştırması

### 1.2 Takım Form Analizi
```
GET /fixtures?team={team_id}&last=10
```
- Galibiyet/Beraberlik/Mağlubiyet serisi
- Ev sahibi vs deplasman performansı
- Gol atma/yeme ortalaması
- Temiz kale sayısı
- Geç gol yeme/atma eğilimi

### 1.3 Kafa Kafaya İstatistik
```
GET /fixtures/headtohead?h2h={team1_id}-{team2_id}
```
- Son karşılaşma sonuçları
- Gol ortalamaları
- Ev/deplasman avantajı
- Tarihsel trendler

### 1.4 Takım İstatistikleri
```
GET /teams/statistics?team={id}&season={year}&league={id}
```

| Veri | Bahis Kullanımı |
|------|-----------------|
| Gol atılan dakikalar | İlk/son 15 dk bahisleri |
| Penaltı istatistikleri | Penaltı bahisleri |
| Kart ortalamaları | Kart bahisleri |
| Köşe vuruşu ortalaması | Korner bahisleri |
| Temiz kale yüzdesi | Clean sheet bahisleri |

### 1.5 Sakatlık Bilgileri
```
GET /injuries?fixture={fixture_id}
```
- Kilit oyuncu eksiklikleri
- Kaleci değişikliği etkisi
- Golcü sakatlıkları

### 1.6 Bahis Oranları
```
GET /odds?fixture={fixture_id}&bookmaker={id}
```
- Farklı bahisçi oranları
- Oran hareketleri
- Value bet tespiti

### 1.7 Maç İstatistikleri (Canlı)
```
GET /fixtures/statistics?fixture={fixture_id}
```
- Top hakimiyeti
- Tehlikeli atak sayısı
- Şut/isabetli şut
- Korner sayısı

---

## 2. Bahis Stratejisi Veri Matrisi

| Bahis Tipi | Gereken Veriler | Endpoint'ler |
|------------|-----------------|--------------|
| Maç Sonucu (1X2) | Form, H2H, kadro | predictions, fixtures, injuries |
| Over/Under | Gol ortalamaları, savunma gücü | teams/statistics, standings |
| BTTS | Her iki takım gol istatistikleri | teams/statistics, fixtures |
| Handikap | Form farkı, ev/deplasman faktörü | standings, fixtures |
| Korner | Korner ortalamaları | fixtures/statistics |
| Kartlar | Kart ortalamaları, hakem | teams/statistics |
| İlk Golü Atan | İlk 15-30 dk gol verileri | teams/statistics |
| Skor Tahmini | Tüm veriler + ML model | Hepsi |

---

## 3. Value Bet Formülü

```
Expected Value = (Kazanma Olasılığı × Oran) - 1

Örnek:
- API Tahmini: %45 ev sahibi kazanır
- Bahisçi oranı: 2.40
- EV = (0.45 × 2.40) - 1 = 0.08 = +8% value
```

**EV > 0** ise value bet vardır.

---

## 4. Veri Toplama Sırası

1. Fikstür listesi → Hangi maçlar var?
2. Predictions → API'nin tahmini ne?
3. H2H → Tarihsel karşılaşmalar
4. Team stats → Detaylı istatistikler
5. Injuries → Eksik oyuncular
6. Odds → Bahisçi oranları
7. Karşılaştırma → Value bet tespiti
