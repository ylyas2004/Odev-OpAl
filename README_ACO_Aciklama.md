# Karınca Kolonisi Optimizasyonu (ACO) — Algoritma Açıklaması

Bu doküman, `src/utils/antColony.ts` dosyasındaki **Karınca Kolonisi Optimizasyonu (Ant Colony Optimization — ACO)** algoritmasının TSP (Gezgin Satıcı Problemi) üzerindeki uygulamasını, sınıfa veya jüriye sunum yapabilmek için teknik ve açıklayıcı bir dille anlatmaktadır.

---

## 1. Algoritmanın Temeli ve Sezgisi

ACO, 1992 yılında Marco Dorigo tarafından geliştirilen, **gerçek karıncaların yem arama davranışından** esinlenen bir meta-sezgisel optimizasyon algoritmasıdır.

Gerçek hayatta bir karınca kolonisi nasıl en kısa yolu bulur?

1. Başlangıçta karıncalar **tamamen rastgele** yollar dener.
2. Her karınca geçtiği yola **feromon (kimyasal iz)** bırakır.
3. Kısa yolu kullanan karıncalar daha hızlı geri döner → **daha çok feromon biriktirir**.
4. Diğer karıncalar, yoğun feromon olan yolu seçmeye daha meyilli olur.
5. Zamanla tüm koloni **en kısa yolda yoğunlaşır**.
6. **Buharlaşma**: Kullanılmayan yollardaki feromon azalır, eski kötü çözümlerin etkisi silinir.

Bu basit bireysel davranışların toplamı, koloninin akıllı bir çözüm bulmasını sağlar — buna **stigmerji (dolaylı iletişim)** denir.

---

## 2. Parametreler ve Açıklamaları (`ACOParams`)

| Parametre | Sembol | Varsayılan | Açıklama |
|---|---|---|---|
| `antCount` | m | 30 | Her iterasyonda tur oluşturan karınca sayısı. |
| `maxIterations` | T | 300 | Maksimum iterasyon (koloni dönemi) sayısı. |
| `alpha` | α | 1.0 | Feromon izinin etkisi. Yüksek → karıncalar geçmiş deneyime daha çok uyar. |
| `beta` | β | 3.0 | Sezgisel bilginin etkisi (1/mesafe). Yüksek → kısa kenarlar daha çok tercih edilir. |
| `evaporationRate` | ρ | 0.3 | Her iterasyonda feromondaki azalma oranı (0–1 arası). |
| `Q` | Q | 100 | Feromon bırakma sabiti. Kısa tur yapan karınca daha fazla bırakır: **Δτ = Q / mesafe**. |
| `initialPheromone` | τ₀ | 1.0 | Başlangıçta tüm kenarlarda eşit dağıtılan feromon miktarı. |
| `maxNoImprove` | — | 80 | Bu kadar iterasyon boyunca küresel en iyi iyileşmezse erken dur. |

---

## 3. Algoritmanın Ana Bölümleri (`antColony.ts`)

### A. Başlatma (Initialization)

- **Komşuluk listesi**: Yalnızca gerçek karayolu kenarları (`ROAD_EDGES`) kullanılarak oluşturulur.
- **Feromon matrisi**: Tüm geçerli kenarlara eşit `initialPheromone` değeri atanır. Bu, başlangıçta hiçbir kenarın avantajlı olmadığı anlamına gelir — tarafsız başlangıç.
- **Başlangıç en iyisi**: BFS ile garantili bir başlangıç rotası hesaplanır.

---

### B. Karınca Tur İnşası (`buildAntPath`)

Her karınca, başlangıç şehrinden çıkarak bitiş şehrine ulaşana kadar **olasılıksal geçiş kuralı** (Stochastic Transition Rule) ile hareket eder:

```
P(i → j) = [τ(i,j)]^α · [η(i,j)]^β
           ──────────────────────────
           Σₖ [τ(i,k)]^α · [η(i,k)]^β
```

Burada:
- **τ(i,j)** = kenar i→j üzerindeki feromon miktarı
- **η(i,j) = 1 / mesafe(i,j)** = sezgisel bilgi (kısa kenar daha cazip)
- **α** = feromon etkisi katsayısı
- **β** = sezgisel bilgi katsayısı
- Toplam paydadaki σ = o anki şehirden erişilebilen tüm komşular üzerinden alınır

Seçim **Rulet Tekerleği (Roulette Wheel)** yöntemiyle yapılır: Ağırlık ne kadar büyükse o komşunun seçilme şansı o kadar yüksek, ama düşük ağırlıklı komşular da seçilebilir (çeşitlilik korunur).

**Güvenlik mekanizması**: Karınca çıkmaza girerse (hiç gidilecek komşu kalmazsa) BFS ile bitiş şehrine kurtarılır — geçersiz yollar asla oluşmaz.

---

### C. Feromon Güncelleme (`updatePheromones`)

İki aşamalı süreç:

#### 1. Buharlaşma
```
τ(i,j) ← (1 − ρ) · τ(i,j)
```
Her iterasyonun başında tüm kenarlardaki feromon `ρ` oranında azalır. Bu, eski kötü çözümlerin etkisini zamanla silmek için kritiktir.

#### 2. Feromon Bırakma
```
τ(i,j) ← τ(i,j) + Δτ_k    burada Δτ_k = Q / mesafe_k
```
Bu iterasyondaki her karınca, kendi turunda kullandığı kenarlara `Q / tur_mesafesi` kadar feromon ekler. Kısa tur yapan karıncaların delta'sı daha büyük → daha güçlü sinyal bırakırlar.

#### 3. Elitist Bonus
```
τ(i,j) ← τ(i,j) + Q / gBest_mesafe    (globalBest rotasındaki kenarlara)
```
Şimdiye kadar bulunan **küresel en iyi rota** her iterasyonda ekstra feromon alır. Bu, algoritmanın en iyi bilinen çözüme odaklanmasını hızlandırır (**Elitist ACO**).

---

## 4. Sözde-Kod (Pseudocode)

```
Feromon matrisini τ₀ ile başlat
Küresel en iyi ← BFS rotası

t = 1'den maxIterations'a kadar:

    Her karınca k = 1..m için:
        Tur oluştur:
            current ← startCity
            Ziyaret edilen şehirleri takip et
            Bitiş şehrine ulaşana kadar:
                Her komşu j için ağırlık hesapla:
                    w(j) = τ(current,j)^α · (1/dist)^β
                Rulet tekerleği ile j seç
                current ← j
        Turu kaydet, mesafesini hesapla

    iterBest ← bu iterasyonun en kısa turu
    Eğer iterBest < gBest: gBest ← iterBest

    Feromon güncelle:
        Tüm kenarlarda: τ ← (1-ρ)·τ        // buharlaşma
        Her karınca k: τ(i,j) += Q/dist_k   // bırakma
        gBest rotası:  τ(i,j) += Q/gBest    // elitist bonus

    noImprove sayacını güncelle; eşiği aştıysa dur

Döndür: gBest
```

---

## 5. Karmaşıklık Analizi

| Bileşen | Karmaşıklık |
|---|---|
| Bir karıncanın turu | O(şehir_sayısı²) — her adımda komşu ağırlıkları hesaplanır |
| Bir iterasyon | O(m × n²) — m karınca, n şehir |
| Feromon güncelleme | O(m × rota_uzunluğu) |
| Toplam | O(T × m × n²) |

---

## 6. Neden ACO TSP İçin Güçlüdür?

| Özellik | Açıklama |
|---|---|
| **Pozitif geri bildirim** | İyi rotalar daha fazla feromon alır → daha sık seçilir → daha da güçlenir |
| **Keşif-Sömürü dengesi** | Rastgele seçim (α,β,ρ parametreleriyle ayarlanabilir) |
| **Kolektif hafıza** | Feromon matrisi, koloninin tüm geçmiş deneyimini özetler |
| **Buharlaşma** | Kötü rotaların etkisi zamanla kaybolur, durgunluğa karşı koruma |
| **Elitist strateji** | En iyi bilinen çözüm her zaman güçlendirilir |
| **Yol geçerliliği** | BFS kurtarma mekanizması ile geçersiz/kesik rotalar asla oluşmaz |

---

## 7. GA, SA, Tabu, PSO ile Karşılaştırma

| Özellik | GA | SA | Tabu | PSO | **ACO** |
|---|---|---|---|---|---|
| Arama tipi | Popülasyon | Tekli | Tekli | Sürü | Sürü |
| Bellek | Nesil | — | Kısa hafıza | pBest/gBest | **Feromon (uzun)** |
| İletişim | Çaprazlama | — | — | Hız vektörü | **Dolaylı (stigmerji)** |
| Keşif | Mutasyon | Sıcaklık | Aspiration | Mutasyon | **Buharlaşma+rastgele seçim** |

---

## 8. Öğretmene Özet Sunum (Kısa Versiyon)

> **Karınca Kolonisi Optimizasyonu**, gerçek karıncaların yem arama stratejisini modelleyen bir meta-sezgisel algoritmadır. Her karınca, feromon yoğunluğuna (τ^α) ve mesafe sezgisine (η^β = 1/d) dayalı olasılıksal geçiş kuralı kullanarak TSP turu oluşturur. Kısa tur yapan karıncalar daha fazla feromon bırakır; bu pozitif geri bildirim döngüsü, koloninin iyi rotalarda yoğunlaşmasını sağlar. Buharlaşma mekanizması eski kötü çözümleri unutarak esnekliği korur. Uygulamamızda Elitist ACO stratejisi de kullanılmıştır: Küresel en iyi rota her iterasyonda ek feromon alarak yakınsamayı hızlandırır.

---

## 9. Arayüzde ACO Nasıl Kullanılır?

1. Sağ paneldeki algoritma seçiciden **"Karınca Kolonisi (ACO)"** seçin.
2. Önerilen başlangıç değerleri: α=1, β=3, ρ=0.3, Q=100
3. **β'yı artırın** → daha açgözlü (kısa kenarlara odak), **α'yı artırın** → geçmişe daha bağlı
4. **ρ'yu artırın** → daha fazla unutma/keşif, azaltın → daha fazla sömürü
5. Kırmızı çizgi = o iterasyonun en iyi karıncasının turu, Yeşil = küresel en iyi rota
