# Kelebek Optimizasyon Algoritması (BOA) — Algoritma Açıklaması

Bu doküman, `src/utils/butterflyOptimization.ts` dosyasındaki **Kelebek Optimizasyon Algoritması (Butterfly Optimization Algorithm — BOA)**'nın TSP (Gezgin Satıcı Problemi) üzerindeki uygulamasını açıklamaktadır.

---

## 1. Algoritmanın Temeli ve Sezgisi

BOA algoritması, 2019 yılında Arora ve Singh tarafından geliştirilen, kelebeklerin yiyecek arama ve çiftleşme davranışlarını modelleyen güncel bir doğadan esinlenen optimizasyon algoritmasıdır.

Algoritmanın temelini kelebeklerin **koku alma (fragrance)** mekanizması oluşturur. Kelebekler, havadaki koku derişimini analiz ederek yiyeceğin (veya eşin) kaynağını bulurlar. TSP için bu koku, bir rotanın **kısalığı (fitness)** ile doğru orantılıdır.

### Algoritmadaki Üç Temel Evre:
1. **Koku Hesaplama:** Her kelebeğin bulunduğu konumun (rotanın) bir koku değeri hesaplanır.
2. **Küresel Arama (Global Search):** Kelebek, ortamdaki en güçlü kokuyu (en iyi çözümü) algılar ve ona doğru hareket eder.
3. **Yerel Arama (Local Search):** Eğer kelebek çevredeki diğer kokuları net algılayamazsa, rastgele diğer kelebeklere veya komşu konumlara doğru rastgele bir hareket yapar.

---

## 2. Parametreler ve Açıklamaları (`BOAParams`)

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `butterflyCount` | 40 | Sürüdeki kelebek sayısı (çözüm adayları). |
| `maxIterations` | 500 | Maksimum döngü sayısı. |
| `c` | 0.01 | **Sensory Modality (Koku Algı Katsayısı):** Kokunun ne kadar güçlü hissedildiğini belirler. Algoritma ilerledikçe bu değer artar (kelebekler daha hassaslaşır). |
| `a` | 0.1 | **Power Exponent (Kuvvet Üssü):** Kokunun yayılma derecesi (0 ile 1 arası). |
| `p` | 0.8 | **Switch Probability (Geçiş Olasılığı):** Algoritmanın küresel ve yerel arama arasında seçim yapmasını sağlayan eşik olasılık. |
| `maxNoImprove` | 100 | Küresel en iyi çözüm bu kadar iterasyon boyunca değişmezse algoritmayı durdurur. |

---

## 3. BOA'nın TSP'ye Uyarlanması (Ayrık/Discrete BOA)

Orijinal BOA sürekli uzay optimizasyon problemleri için tasarlanmıştır. TSP gibi ayrık (discrete) rota problemlerinde matematiksel formüller (toplama/çıkarma) doğrudan kullanılamaz. Bu yüzden `butterflyOptimization.ts` içinde şu uyarlamalar yapılmıştır:

### A. Koku Formülü
Koku ($f$), rotanın yoğunluğuna ($I$) yani uygunluk değerine bağlıdır:
$f = c \cdot I^a$
- $I = 1 / (\text{Toplam Mesafe} + 1)$

### B. Konum Güncelleme (Kelebek Hareketi)
Her adımda $r \in [0, 1]$ rastgele bir sayı üretilir ve geçiş olasılığı ($p$) ile karşılaştırılır:

- **Eğer $r < p$ (Küresel Arama):** Kelebek, en iyi rotaya ($gBest$) doğru çekilir. Uygulamada, $gBest$ rotasından rastgele bir şehir dizisi alınıp mevcut rotanın içine yerleştirilerek (`moveTowards` fonksiyonu) kelebeğin en iyi rotaya benzemesi sağlanır.
- **Eğer $r \ge p$ (Yerel Arama):** Kelebek rastgele başka bir kelebeğin rotasına doğru çekilir veya rastgele bir komşu düğüm (2-opt/swap) ile rotasını değiştirir (`produceNeighbor`).

### C. Koku Sensörü Güncellemesi ($c$)
Her iterasyon sonunda, koku algı katsayısı olan $c$ formüle uygun olarak artırılır:
$c = c + \frac{0.025}{c \cdot \text{maxIterations}}$
Bu sayede algoritmanın sonlarına doğru kelebeklerin arama adımları küçülür ve yerel arama (ince ayar) ağırlık kazanır.

---

## 4. Arayüzde BOA Nasıl Kullanılır?

1. Sağ paneldeki algoritma seçiciden **"Kelebek Optimizasyonu (BOA)"** seçin.
2. **Koku Katsayısı ($c$):** Düşük başlaması önerilir. Yüksek olursa algoritma erken yakınsayabilir.
3. **Geçiş Olasılığı ($p$):** `0.8` gibi yüksek değerler algoritmayı çoğunlukla küresel en iyiye doğru çeker, düşük değerler ise rastgele aramayı (yerel) artırır.
4. **Kırmızı Çizgi:** O anki bir kelebeğin denediği rotayı, **Yeşil Çizgi:** Tüm sürü tarafından bulunan en iyi rotayı temsil eder.
