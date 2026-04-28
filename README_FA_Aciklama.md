# Ateşböceği Algoritması (FA) — Algoritma Açıklaması

Bu doküman, `src/utils/fireflyAlgorithm.ts` dosyasındaki **Ateşböceği Algoritması (Firefly Algorithm — FA)**'nın TSP (Gezgin Satıcı Problemi) üzerindeki uygulamasını açıklamaktadır.

---

## 1. Algoritmanın Temeli ve Sezgisi

Ateşböceği Algoritması, 2008 yılında Xin-She Yang tarafından geliştirilen ve ateşböceklerinin çiftleşme ve avlanma amacıyla kullandıkları yanıp sönen ışık iletişimlerini modelleyen doğadan esinlenmiş bir optimizasyon algoritmasıdır.

### Üç Temel Kural:
1. **Cinsiyetsizlik:** Tüm ateşböcekleri cinsiyetsizdir, bu yüzden herhangi bir ateşböceği daha parlak olan başka bir ateşböceğine yönelebilir.
2. **Çekicilik ve Mesafe:** Çekicilik, ışık şiddeti ile orantılıdır ve mesafe arttıkça ışığın hava tarafından emilmesi nedeniyle azalır. Daha az parlak olan ateşböceği, daha parlak olana doğru hareket eder.
3. **Uygunluk ve Parlaklık:** Ateşböceğinin parlaklığı, optimize edilmek istenen probleme (TSP için rotanın kısalığına) bağlıdır. Bulunduğu konum daha iyi olanın ışığı daha parlaktır.

---

## 2. Parametreler ve Açıklamaları (`FAParams`)

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `fireflyCount` | 40 | Sürüdeki toplam ateşböceği sayısı. |
| `maxIterations` | 500 | Maksimum döngü sayısı. |
| `alpha` ($\alpha$) | 0.5 | **Rastgelelik Adımı (Randomization):** Bir ateşböceği diğerine yaklaşırken yapılan rastgele hareketin şiddetidir. İterasyonlar ilerledikçe küçülür (soğutma). |
| `beta0` ($\beta_0$) | 1.0 | **Temel Çekicilik:** Mesafe sıfır olduğunda ($r=0$) ulaşılan maksimum çekim gücüdür. |
| `gamma` ($\gamma$) | 0.1 | **Işık Emilim Katsayısı (Absorption):** Mesafeyle birlikte ışığın ne kadar hızlı azalacağını belirler. |
| `maxNoImprove` | 100 | Küresel en iyi çözüm uzun süre değişmezse simülasyonu erken sonlandırır. |

---

## 3. Algoritmanın İşleyişi (Ayrık/Discrete FA)

TSP gibi problemleri çözmek için matematiksel denklemler rotalara (dizilere) uyarlanmıştır.

### A. Işık Şiddeti (Parlaklık) Hesaplama
Işık şiddeti ($I$), rotanın uygunluk değerine (fitness) eşittir:
$I = 1 / (\text{Toplam Mesafe} + 1)$

### B. Çekicilik ve Hareket Formülü
Bir ateşböceği ($i$), kendisinden daha parlak bir ateşböceği ($j$) gördüğünde ona doğru çekilir:
$\beta = \beta_0 \cdot e^{-\gamma \cdot r^2}$

Burada $r$, iki rotanın kalite farkından hesaplanan normalize edilmiş uzaklıktır.
- **Yönelme (`moveTowards`):** $i$ ateşböceği, $j$'nin rotasından $\beta$ ile orantılı büyüklükte bir şehir dizisini alır ve kendi rotasına yerleştirir. Çekicilik ($\beta$) ne kadar yüksekse, hedefe o kadar çok benzer.
- **Rastgelelik:** Bu hareketin ardından $\alpha$ ihtimaliyle ateşböceği kendi rotasında rastgele bir değişiklik (2-opt takası vb.) yapar.

### C. En Parlak Ateşböceği
En parlak olan ateşböceği, yönelmesi gereken daha iyi bir kaynak bulamadığından sadece kendi etrafında rastgele bir adım (yerel arama) atar.

---

## 4. Arayüzde Ateşböceği Algoritması Nasıl Kullanılır?

1. Sağ paneldeki algoritma seçiciden **"Ateşböceği Algoritması (FA)"** seçin.
2. **Rastgelelik ($\alpha$):** Yüksek değerler keşif (exploration) oranını artırır, rotaların çeşitlenmesini sağlar.
3. **Işık Emilimi ($\gamma$):** Yüksek emilimde ateşböcekleri sadece birbirlerine çok yakınken etkileşime girerler (lokal alt kolonilere ayrılırlar). Düşük olursa ışık çok uzaklara gider ve global olarak tek bir çözüme çekilirler.
4. **Kırmızı Çizgi:** O an işlem gören bir ateşböceğinin güzergahını, **Yeşil Çizgi:** En iyi çözümü (en parlak böceği) temsil eder.
