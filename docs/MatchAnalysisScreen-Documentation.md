# MatchAnalysisScreen - Tam Dokümantasyon

## 1. VERİ AKIŞI VE ALGORİTMA

### 1.1 Giriş Verisi (route.params.match)
```javascript
{
  id: 1234567,                    // fixture ID
  date: '2024-01-15',
  time: '21:00',
  status: 'NS',
  home: { id, name, short, logo, score },
  away: { id, name, short, logo, score },
  league: { id, name, country, logo, flag },
}
```

### 1.2 State Yapısı
```javascript
const [activeTab, setActiveTab] = useState('tahminler');  // Aktif sekme
const [loading, setLoading] = useState(true);             // İlk yükleme
const [prediction, setPrediction] = useState(null);       // API-Football tahmin
const [h2hData, setH2hData] = useState(null);             // Karşılıklı maçlar
const [stats, setStats] = useState(null);                 // Maç istatistikleri
const [aiAnalysis, setAiAnalysis] = useState(null);       // AI analiz sonucu
const [aiLoading, setAiLoading] = useState(false);        // AI yükleniyor
const [cachedData, setCachedData] = useState(false);      // Cache durumu
```

### 1.3 Veri Çekme Sırası
```
1. EKRAN AÇILIR
   ↓
2. fetchMatchDetails()
   ├── cacheService.getAnalysis(fixtureId) → Önce cache
   ├── footballApi.getPredictions(fixtureId)
   ├── footballApi.getHeadToHead(homeId, awayId, 10)
   └── footballApi.getFixtureStats(fixtureId)
   ↓
3. isPro KONTROL
   ├── FREE → Paywall göster
   └── PRO → fetchAiAnalysis()
   ↓
4. fetchAiAnalysis()
   ├── Cache kontrolü
   └── AI API çağrısı (Gemini 2.5 Flash)
   ↓
5. UI RENDER
```

---

## 2. AI ANALİZ VERİ YAPISI

### 2.1 API'ye Gönderilen Veri
```javascript
{
  matchData: {
    home: { id, name, logo, ... },
    away: { id, name, logo, ... },
    league: { id, name, country, ... },
    date: '2024-01-15',
    time: '21:00',
    fixtureId: 1234567,
    homeForm: 'WWDLW',              // Son 5 maç
    awayForm: 'LDWWW',
    homeTeamStats: { ... },         // Sezon istatistikleri
    awayTeamStats: { ... },
    h2h: { total, homeWins, draws, awayWins, ... },
    prediction: { ... },            // API-Football tahmini
  },
  fixtureId: 1234567,
  language: 'tr',                   // veya 'en'
}
```

### 2.2 AI'dan Dönen Analiz Objesi
```javascript
{
  // ═══════════════════════════════════════════════════════════
  // ANA MAÇ SONUCU OLASILIKLARI
  // ═══════════════════════════════════════════════════════════
  homeWinProb: 45,           // Ev sahibi kazanır %
  drawProb: 28,              // Beraberlik %
  awayWinProb: 27,           // Deplasman kazanır %
  confidence: 7,             // Güven skoru (1-10)
  winner: 'ev',              // 'ev' | 'beraberlik' | 'deplasman'
  advice: 'Ev sahibi üstün form...',  // Genel tavsiye

  // ═══════════════════════════════════════════════════════════
  // GOL TAHMİNLERİ
  // ═══════════════════════════════════════════════════════════
  expectedGoals: 2.7,        // Beklenen toplam gol (xG)
  expectedHomeGoals: 1.5,    // Ev sahibi beklenen gol
  expectedAwayGoals: 1.2,    // Deplasman beklenen gol
  bttsProb: 58,              // Karşılıklı Gol (KG Var) %
  over25Prob: 62,            // Üst 2.5 %
  over15Prob: 82,            // Üst 1.5 %
  over35Prob: 35,            // Üst 3.5 %

  // ═══════════════════════════════════════════════════════════
  // GOL DAĞILIMI (Poisson)
  // ═══════════════════════════════════════════════════════════
  goalDistribution: {
    home: { '0': 22, '1': 33, '2': 28, '3': 12, '4plus': 5 },
    away: { '0': 30, '1': 35, '2': 22, '3': 9, '4plus': 4 },
  },

  // ═══════════════════════════════════════════════════════════
  // KG SENARYOLARI
  // ═══════════════════════════════════════════════════════════
  bttsDistribution: {
    bothScore: 58,           // İki takım da atar
    onlyHomeScores: 22,      // Sadece ev sahibi atar
    onlyAwayScores: 12,      // Sadece deplasman atar
    noGoals: 8,              // Golsüz
  },

  // ═══════════════════════════════════════════════════════════
  // İLK YARI TAHMİNLERİ
  // ═══════════════════════════════════════════════════════════
  htHomeWinProb: 35,         // İY ev sahibi %
  htDrawProb: 40,            // İY beraberlik %
  htAwayWinProb: 25,         // İY deplasman %
  htOver05Prob: 60,          // İY üst 0.5 %
  htOver15Prob: 28,          // İY üst 1.5 %

  // ═══════════════════════════════════════════════════════════
  // SKOR TAHMİNLERİ
  // ═══════════════════════════════════════════════════════════
  mostLikelyScore: '2-1',    // En olası skor
  scoreProb: 14,             // Bu skorun olasılığı %
  alternativeScores: [
    { score: '1-1', prob: 12 },
    { score: '1-0', prob: 10 },
    { score: '2-0', prob: 9 },
  ],

  // ═══════════════════════════════════════════════════════════
  // RİSK ANALİZİ
  // ═══════════════════════════════════════════════════════════
  riskLevel: 'düşük',        // 'düşük' | 'orta' | 'yüksek'
  bankoScore: 72,            // Banko skoru (0-100)
  volatility: 0.35,          // Volatilite (0-1)

  riskFlags: {
    highDerbyVolatility: false,     // Derbi riski
    weatherImpact: 'düşük',         // Hava etkisi
    fatigueRiskHome: 'düşük',       // Ev sahibi yorgunluk
    fatigueRiskAway: 'orta',        // Deplasman yorgunluk
    marketDisagreement: false,      // Piyasa uyumsuzluğu
  },

  // ═══════════════════════════════════════════════════════════
  // FAKTÖR ANALİZİ
  // ═══════════════════════════════════════════════════════════
  factors: [
    {
      category: 'form',           // form, h2h, kadro, taktik, motivasyon, hakem, hava, market
      text: 'Ev sahibi son 5 maçta 4 galibiyet aldı',
      impact: 'positive',         // 'positive' | 'negative' | 'neutral'
      weight: 0.85,               // Ağırlık (0-1)
    },
    {
      category: 'h2h',
      text: 'Son 5 karşılaşmada 3 beraberlik',
      impact: 'neutral',
      weight: 0.6,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // ÖNERİLEN BAHİSLER
  // ═══════════════════════════════════════════════════════════
  recommendedBets: [
    {
      type: 'MS 1',               // Bahis tipi
      confidence: 72,             // Güven %
      reasoning: 'Form üstünlüğü ve ev avantajı',
      risk: 'düşük',              // 'düşük' | 'orta' | 'yüksek'
    },
    {
      type: 'Üst 2.5',
      confidence: 65,
      reasoning: 'Yüksek xG ve hücum gücü',
      risk: 'orta',
    },
    {
      type: 'KG Var',
      confidence: 58,
      reasoning: 'Her iki takım da ofansif',
      risk: 'orta',
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // TAKIM ANALİZLERİ
  // ═══════════════════════════════════════════════════════════
  homeTeamAnalysis: {
    strengths: ['Güçlü ev performansı', 'Etkili kontra atak'],
    weaknesses: ['Set piece savunması zayıf'],
    keyPlayer: 'Haaland',
    tacticalSummary: '4-3-3 ile yüksek pres',
  },
  awayTeamAnalysis: {
    strengths: ['Disiplinli savunma'],
    weaknesses: ['Deplasman formu kötü'],
    keyPlayer: 'Salah',
    tacticalSummary: '4-2-3-1 ile dengeli oyun',
  },

  // ═══════════════════════════════════════════════════════════
  // TREND ÖZETİ
  // ═══════════════════════════════════════════════════════════
  trendSummary: {
    homeFormTrend: 'yükseliyor',      // 'yükseliyor' | 'düşüyor' | 'dengeli'
    awayFormTrend: 'düşüyor',
    homeXGTrend: 'yükseliyor',
    awayXGTrend: 'stabil',
    tacticalMatchupSummary: 'Ev sahibinin yüksek presi...',
  },
}
```

---

## 3. TAB YAPISI VE İÇERİKLER

```
[Tahminler] [Gol] [Dağılım] [KG] [İY] [Risk] [Faktör] [Form] [İstatistik] [H2H]
```

### TAB 1: TAHMİNLER (tahminler)
- Banko Badge (confidence ≥70: Yeşil, ≥50: Turuncu, <50: Kırmızı)
- 3x CircularProgress (homeWinProb, drawProb, awayWinProb)
- Tavsiye kartı (advice)
- 3x BetCard (recommendedBets - en yüksek güvenli 3 bahis)

### TAB 2: GOL TAHMİNLERİ (golTahminleri)
- ExpectedGoalsComparison (xG bar)
- CircularProgress grid: Üst 1.5, Üst 2.5, Üst 3.5, KG Var
- En olası skor kartı (mostLikelyScore + alternativeScores)

### TAB 3: GOL DAĞILIMI (golDagilimi)
- GoalDistributionChart (home) - Poisson bar chart
- GoalDistributionChart (away) - Poisson bar chart
- Toplam xG özeti

### TAB 4: KG SENARYOLARI (kgSenaryolari)
- BTTSDistribution (segmented bar)
  - İki takım da atar (yeşil)
  - Sadece ev sahibi (mavi)
  - Sadece deplasman (kırmızı)
  - Golsüz (gri)
- KG Var/Yok olasılık kartları

### TAB 5: İLK YARI (ilkYari)
- 3x CircularProgress (htHomeWinProb, htDrawProb, htAwayWinProb)
- İY Gol olasılıkları: İY Üst 0.5, İY Üst 1.5
- İY tavsiye kartı

### TAB 6: RİSK ANALİZİ (riskAnalizi)
- VolatilityGauge (risk meter - gradient bar)
- Banko skoru kartı (bankoScore)
- RiskFlagBadge (uyarı badge'leri)
  - Derbi volatilitesi
  - Hava etkisi
  - Yorgunluk riski (ev/dep)
  - Piyasa uyumsuzluğu
- Risk özeti metni

### TAB 7: FAKTÖR ANALİZİ (faktorAnalizi)
- FactorBar listesi (her kategori için):
  - Form, H2H, Kadro, Taktik, Motivasyon, Hakem, Hava, Market

### TAB 8: FORM DURUMU (formDurumu)
- Ev sahibi form: FormDots, TrendIndicator, Güçlü/zayıf yönler
- Deplasman form: FormDots, TrendIndicator, Güçlü/zayıf yönler
- Taktik eşleşme özeti

### TAB 9: İSTATİSTİKLER (istatistikler)
- StatRow listesi: Top Hakimiyeti, Toplam Şut, İsabetli Şut, Korner, Faul

### TAB 10: KARŞILIKLI (karsilikli)
- H2H özet kartı: Toplam maç, Ev galibiyetleri, Beraberlikler, Deplasman galibiyetleri
- Ortalama gol
- Son maçlar listesi

---

## 4. UI BİLEŞENLERİ

### 4.1 CircularProgress
```
Kullanım: Yüzdelik değerleri dairesel gösterim
Props: { value, label, size, color, isNumber }

    ┌─────────┐
    │  ╭───╮  │
    │ │ 65% │ │  ← Değer (renk: color)
    │  ╰───╯  │
    │  Label  │  ← Alt etiket (gri)
    └─────────┘
```

### 4.2 BetCard
```
Kullanım: Bahis önerileri
Props: { type, confidence, reasoning, risk, isHot }

    ┌─────────────────┐
    │ 🔥 Önerilen     │ ← Hot badge (isHot=true)
    │     ⚽          │ ← İkon (type'a göre)
    │    MS 1         │ ← Bahis tipi
    │    %72          │ ← Güven
    │ ████████░░      │ ← Güven bar
    │ ● Düşük Risk    │ ← Risk göstergesi
    │ Form üstünlüğü  │ ← Açıklama
    └─────────────────┘

Renk mantığı:
  confidence ≥ 70 → Yeşil border/text
  confidence ≥ 50 → Turuncu
  confidence < 50 → Kırmızı
```

### 4.3 FactorBar
```
Kullanım: Faktör ağırlık gösterimi
Props: { category, text, impact, weight, color }

    Form                    +85% ✓
    ████████████████░░░░░░░░░░
    Ev sahibi son 5 maçta 4 galibiyet

Impact ikonları:
  positive → ✓ (yeşil)
  negative → ✕ (kırmızı)
  neutral  → ─ (turuncu)
```

### 4.4 FormDots
```
Kullanım: Son 5 maç formu
Props: { form: 'WWDLW' }

    ●  ●  ●  ●  ●
    W  W  D  L  W

Renkler:
  W (Win)  → Yeşil
  D (Draw) → Turuncu
  L (Loss) → Kırmızı
```

### 4.5 GoalDistributionChart
```
Kullanım: Poisson gol dağılımı
Props: { distribution, teamColor, teamName }

    EV SAHİBİ

    35%  28%  22%  10%  5%
    ██   ██   ██   ██   ██
    ██   ██   ██   ██
    ██   ██   ██
    ██   ██
    ──────────────────────
    0    1    2    3   4+
```

### 4.6 BTTSDistribution
```
Kullanım: KG senaryoları segmented bar
Props: { distribution }

    ████████████░░░░░░░░░░░░░░
    [  58%  ][ 22% ][ 12%][8%]
      Yeşil   Mavi   Kırm  Gri

    ● İki takım da atar   58%
    ● Sadece ev sahibi    22%
    ● Sadece deplasman    12%
    ● Golsüz               8%
```

### 4.7 VolatilityGauge
```
Kullanım: Risk ölçer
Props: { volatility, riskLevel }

    ●────────────────────────
    Düşük    Orta     Yüksek

    (Gradient: Yeşil → Turuncu → Kırmızı)
    (● nokta volatility değerine göre konumlanır)
```

### 4.8 RiskFlagBadge
```
Kullanım: Risk uyarı badge'leri
Props: { flags }

    🔥 Derbi Volatilitesi    🌧️ Hava: Orta
    💪 Ev Yorgunluk: Yüksek  ⚠️ Piyasa Uyumsuz
```

### 4.9 StatRow
```
Kullanım: İstatistik karşılaştırma
Props: { label, homeValue, awayValue, isPercentage }

    65%  ████████░░░░  Top Hakimiyeti  ░░░░████████  35%
```

### 4.10 TrendIndicator
```
Kullanım: Trend göstergesi
Props: { trend, label, color }

    Form Trendi          ↑ Yükseliyor
                         (yeşil)
```

### 4.11 ExpectedGoalsComparison
```
Kullanım: xG karşılaştırma
Props: { homeXG, awayXG, homeName, awayName }

    Man City                          1.5
    ████████████████░░░░░░░░░░░░░░░░
    Liverpool                         1.2
```

### 4.12 AccordionSection
```
Kullanım: Açılır/kapanır bölüm
Props: { title, icon, children }

    ┌─────────────────────────────────┐
    │ ⚽ Detaylı Analiz            ▼  │
    └─────────────────────────────────┘

    (Tıklandığında içerik açılır)
```

### 4.13 BankoBadge
```
Kullanım: Güven seviyesi badge
Props: { confidence, pulseAnim }

    ┌─────────────────────────────┐
    │      BANKO - %72            │  (Yeşil, confidence ≥ 70)
    └─────────────────────────────┘

    ┌─────────────────────────────┐
    │    ORTA RİSK - %55          │  (Turuncu, confidence ≥ 50)
    └─────────────────────────────┘

    ┌─────────────────────────────┐
    │     RİSKLİ - %35            │  (Kırmızı, confidence < 50)
    └─────────────────────────────┘
```

---

## 5. RENK PALETİ

```javascript
const COLORS = {
  // Ana renkler
  bg: '#0f1419',              // Arka plan
  card: '#1c2128',            // Kart arka planı
  cardHover: '#252d38',       // Hover durumu
  border: '#2d3741',          // Kenar çizgisi

  accent: '#00d4aa',          // Vurgu (turkuaz)
  accentDim: 'rgba(0, 212, 170, 0.15)',
  accentGlow: 'rgba(0, 212, 170, 0.3)',

  // Durum renkleri
  success: '#00d977',         // Başarı/Yüksek
  warning: '#ff9500',         // Uyarı/Orta
  danger: '#ff4757',          // Tehlike/Düşük

  // Gri tonları
  white: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray400: '#a0a0a0',
  gray500: '#8b9199',
  gray600: '#6b7280',
  gray700: '#4b5563',
  gray800: '#2d3741',
  gray900: '#1c2128',

  // Gradient
  gradientStart: '#1a2634',
  gradientEnd: '#0f1419',

  // Takım renkleri
  homeColor: '#3b82f6',       // Ev sahibi (mavi)
  awayColor: '#ef4444',       // Deplasman (kırmızı)

  // Faktör renkleri
  formBar: '#00d4aa',         // Form
  h2hBar: '#3b82f6',          // H2H
  kadroBar: '#8b5cf6',        // Kadro
  taktikBar: '#06b6d4',       // Taktik
  motivasyonBar: '#f59e0b',   // Motivasyon
  hakemBar: '#ef4444',        // Hakem
  havaBar: '#60a5fa',         // Hava
  marketBar: '#a78bfa',       // Market

  // Gol dağılımı
  goalHome: '#3b82f6',
  goalAway: '#ef4444',
  bttsYes: '#00d977',
  bttsNo: '#ff4757',

  // Risk renkleri
  riskLow: '#00d977',
  riskMedium: '#ff9500',
  riskHigh: '#ff4757',
};
```

---

## 6. CACHE STRATEJİSİ

```
LOCAL CACHE (AsyncStorage):
  Key: ai_analysis_{fixtureId}
  TTL: Maç durumuna göre
    - NS (başlamadı) → 24 saat
    - LIVE → 1 saat
    - FT (bitti) → 7 gün

SERVER CACHE (Supabase):
  Tablo: match_analyses
  Dil bazlı (tr/en ayrı cache)
  Maç başlamadan: 24 saat cache
  Maç bittikten: Kalıcı cache
```

---

## 7. EKRAN DÜZENİ (LAYOUT)

```
┌──────────────────────────────────────────────────────────────┐
│ ← [Geri]     🏆 Premier League                          [?] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│        ┌─────┐              ┌─────┐                         │
│        │ 🔵  │     VS      │ 🔴  │                         │
│        └─────┘   21:00     └─────┘                         │
│      Man City            Liverpool                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Tahmin] [Gol] [Dağılım] [KG] [İY] [Risk] [Faktör] [Form]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           BANKO - %72                               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│     ╭───╮      ╭───╮      ╭───╮                             │
│    │ 45% │    │ 28% │    │ 27% │                            │
│     ╰───╯      ╰───╯      ╰───╯                             │
│   Ev Sahibi  Beraberlik  Deplasman                          │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ 💡 Ev sahibinin form üstünlüğü belirleyici...       │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌────────┐  ┌────────┐  ┌────────┐                        │
│   │  MS 1  │  │ Üst2.5 │  │ KG Var │                        │
│   │  %72   │  │  %65   │  │  %58   │                        │
│   │ ●Düşük │  │ ●Orta  │  │ ●Orta  │                        │
│   └────────┘  └────────┘  └────────┘                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. API ENDPOINTLERİ

### 8.1 Football API (API-Football v3)
```
GET /predictions?fixture={id}     → Tahmin verisi
GET /fixtures/headtohead          → H2H verileri
GET /fixtures/statistics          → Maç istatistikleri
```

### 8.2 AI Analysis API (Edge Function)
```
POST /functions/v1/claude-analysis
Body: {
  matchData: { ... },
  fixtureId: number,
  language: 'tr' | 'en',
}
Response: AI Analysis Object (yukarıdaki yapı)
```

---

## 9. H2H VERİ YAPISI

```javascript
h2hData = {
  total: 10,                    // Toplam maç sayısı
  homeWins: 4,                  // Ev sahibi galibiyetleri
  draws: 3,                     // Beraberlikler
  awayWins: 3,                  // Deplasman galibiyetleri
  totalHomeGoals: 15,           // Ev sahibi toplam gol
  totalAwayGoals: 12,           // Deplasman toplam gol
  avgGoals: '2.7',              // Ortalama gol
  recentMatches: [
    {
      date: '2024-01-10',
      homeScore: 2,
      awayScore: 1,
      homeName: 'Man City',
      awayName: 'Liverpool',
    },
    // ... son 10 maç
  ],
}
```

---

## 10. İSTATİSTİK VERİ YAPISI

```javascript
stats = {
  possession: { home: 65, away: 35 },
  shots: { home: 18, away: 12 },
  shotsOnTarget: { home: 8, away: 4 },
  corners: { home: 7, away: 3 },
  fouls: { home: 10, away: 14 },
}
```

---

## 11. DEFAULT ANALİZ (Fallback)

```javascript
{
  homeWinProb: 33,
  drawProb: 34,
  awayWinProb: 33,
  confidence: 5,
  expectedGoals: 2.5,
  expectedHomeGoals: 1.3,
  expectedAwayGoals: 1.2,
  bttsProb: 50,
  over25Prob: 50,
  over15Prob: 70,
  over35Prob: 30,
  goalDistribution: {
    home: { '0': 25, '1': 35, '2': 25, '3': 10, '4plus': 5 },
    away: { '0': 30, '1': 35, '2': 22, '3': 9, '4plus': 4 },
  },
  bttsDistribution: {
    bothScore: 50,
    onlyHomeScores: 25,
    onlyAwayScores: 15,
    noGoals: 10,
  },
  htHomeWinProb: 30,
  htDrawProb: 45,
  htAwayWinProb: 25,
  htOver05Prob: 55,
  htOver15Prob: 25,
  mostLikelyScore: '1-1',
  scoreProb: 12,
  alternativeScores: [
    { score: '1-0', prob: 10 },
    { score: '2-1', prob: 9 },
    { score: '0-0', prob: 8 },
  ],
  riskLevel: 'orta',
  bankoScore: 50,
  volatility: 0.5,
  winner: 'belirsiz',
  advice: 'Analiz için yeterli veri bulunmuyor.',
  factors: [],
  recommendedBets: [],
  homeTeamAnalysis: {
    strengths: [],
    weaknesses: [],
    keyPlayer: null,
    tacticalSummary: '',
  },
  awayTeamAnalysis: {
    strengths: [],
    weaknesses: [],
    keyPlayer: null,
    tacticalSummary: '',
  },
  trendSummary: {
    homeFormTrend: 'dengeli',
    awayFormTrend: 'dengeli',
    homeXGTrend: 'stabil',
    awayXGTrend: 'stabil',
    tacticalMatchupSummary: '',
  },
  riskFlags: {
    highDerbyVolatility: false,
    weatherImpact: 'düşük',
    fatigueRiskHome: 'düşük',
    fatigueRiskAway: 'düşük',
    marketDisagreement: false,
  },
}
```

---

## 12. i18n ANAHTAR YAPISI

```javascript
{
  "matchAnalysis": {
    "tabs": {
      "predictions": "Tahminler",
      "goalPredictions": "Gol",
      "goalDistribution": "Dağılım",
      "bttsScenarios": "KG",
      "firstHalf": "İY",
      "riskAnalysis": "Risk",
      "factorAnalysis": "Faktör",
      "formStatus": "Form",
      "statistics": "İstatistik",
      "headToHead": "H2H"
    },
    "banko": "BANKO",
    "mediumRisk": "ORTA RİSK",
    "risky": "RİSKLİ",
    "recommendation": "Önerilen",
    "categories": {
      "form": "Form",
      "h2h": "Karşılıklı",
      "squad": "Kadro",
      "tactics": "Taktik",
      "motivation": "Motivasyon",
      "referee": "Hakem",
      "weather": "Hava",
      "market": "Piyasa"
    },
    "goalDist": {
      "bothScore": "İki takım da atar",
      "onlyHome": "Sadece ev sahibi",
      "onlyAway": "Sadece deplasman",
      "noGoals": "Golsüz"
    },
    "risk": {
      "low": "DÜŞÜK",
      "medium": "ORTA",
      "high": "YÜKSEK"
    },
    "riskFlags": {
      "derbyVolatility": "Derbi Volatilitesi",
      "weather": "Hava Etkisi:",
      "homeFatigue": "Ev Yorgunluk:",
      "awayFatigue": "Dep Yorgunluk:",
      "marketDisagreement": "Piyasa Uyumsuzluğu"
    },
    "trend": "Trend"
  },
  "common": {
    "loading": "Yükleniyor...",
    "lowRisk": "Düşük",
    "mediumRisk": "Orta",
    "highRisk": "Yüksek",
    "risk": "Risk"
  }
}
```
