# Parçacık Sürüsü Optimizasyonu (PSO) — Algoritma Açıklaması

Bu doküman, `src/utils/particleSwarm.ts` dosyasındaki **Parçacık Sürüsü Optimizasyonu (Particle Swarm Optimization — PSO)** algoritmasının TSP (Gezgin Satıcı Problemi) üzerindeki uygulamasını, sınıfa veya jüriye sunum yapabilmek için teknik ve açıklayıcı bir dille anlatmaktadır.

---

## 1. Algoritmanın Temeli ve Sezgisi

PSO, 1995 yılında Kennedy ve Eberhart tarafından geliştirilmiş, **kuş sürüsü uçuş davranışından** esinlenen bir meta-sezgisel optimizasyon algoritmasıdır. Temel sezgi şudur:

- Bir sürüdeki her kuş (parçacık), hem **kendi hatırladığı en iyi konumu** hem de **sürünün bulduğu en iyi konumu** bilerek hareket eder.
- Bu ikili bilgi sayesinde sürü, arama uzayını verimli biçimde tarayarak iyi çözümlere yakınsar.

Öğretmenin belirttiği **V-şekilli sürü formasyonu** bu algoritmanın gelişmiş versiyonuna (lBest topolojisi) karşılık gelir: Her parçacık tüm sürüyü değil, sadece yanındaki komşularını takip eder; bu da kuşların V formasyonuna benzer bir bilgi akışı sağlar.

**TSP'ye (Gezgin Satıcı Problemi) Uygulaması:** Klasik PSO sürekli uzayda çalışır, oysa TSP ayrık (permütasyon bazlı) bir problemdir. Bu nedenle;
- **Konum** = bir rota (şehir sırası listesi)
- **Hız** = rotayı değiştiren **takas operasyonları (swap) listesi** olarak yeniden tanımlanmıştır.

---

## 2. Parametreler ve Açıklamaları (`PSOParams`)

| Parametre | Sembol | Varsayılan | Açıklama |
|---|---|---|---|
| `swarmSize` | N | 40 | Sürüdeki parçacık sayısı. Her parçacık bir TSP rota adayıdır. |
| `maxIterations` | T | 500 | Algoritmanın çalışacağı maksimum iterasyon sayısı. |
| `inertiaWeight` | w | 0.7 | Parçacığın önceki hız vektörüne ne kadar bağlı kalacağı. Yüksek → keşif, Düşük → sömürü. |
| `cognitiveCoeff` | c₁ | 1.5 | Parçacığın **kendi** en iyi çözümüne çekilme katsayısı (kişisel bellek). |
| `socialCoeff` | c₂ | 1.5 | Parçacığın **sürünün** en iyi çözümüne çekilme katsayısı (sosyal bellek). |
| `maxSwapsPerIter` | — | 4 | Her iterasyonda hız vektörüne eklenecek maksimum takas sayısı. |
| `mutationRate` | — | 0.1 | Çeşitliliği korumak için rastgele iki şehri takas etme olasılığı. |
| `useLocalBest` | — | false | `false` = Küresel en iyi (gBest), `true` = V-şekilli yerel komşuluk (lBest). |
| `neighborhoodSize` | — | 3 | lBest topolojisinde her parçacığın gördüğü komşu pencere yarıçapı. |
| `maxNoImprove` | — | 100 | Bu kadar iterasyon boyunca küresel en iyi iyileşmezse erken durdur. |

---

## 3. Algoritmanın Ana Bölümleri (`particleSwarm.ts`)

### A. Sürünün Başlatılması (Initialization)

Algoritmanın çalışabilmesi için önce tüm parçacıklara geçerli birer başlangıç rotası atanır:

- **`generateRandomPath`**: Her parçacık için rastgele yürüyüşle (random walk) geçerli bir yol bulunur. Bu, sürünün arama uzayında farklı noktalarda başlamasını sağlar.
- **Fallback (BFS)**: Rastgele yürüyüş başarısız olursa Genişlik-Öncelikli Arama (BFS) ile matematiksel olarak garantili bir bağlantı yolu hesaplanır.

Her parçacık için:
- **position** = mevcut rota
- **velocity** = boş takas listesi (sıfır hız)
- **pBest** = kendi en iyi rotası (başlangıçta ilk konum)

Başlangıçta tüm parçacıkların pBest'leri karşılaştırılır ve **gBest** (küresel en iyi) seçilir.

---

### B. Hız Güncelleme Denklemi

Klasik PSO hız denklemi:

```
v(t+1) = w · v(t)  +  c₁ · r₁ · (pBest - x)  +  c₂ · r₂ · (gBest - x)
```

TSP'de "çıkarma" işlemi, iki rota arasındaki **farkı takas dizisi** olarak tanımlanarak uyarlanmıştır:

1. **Atalet bileşeni (w · v):** Önceki hız listesinden `w` oranında takas korunur.
2. **Bilişsel bileşen (c₁ · r₁ · (pBest − x)):** Mevcut rotayı kişisel en iyiye yaklaştıran takaslar üretilir ve `c₁ · r₁` ile orantılı sayıda eklenir.
3. **Sosyal bileşen (c₂ · r₂ · (gBest − x)):** Mevcut rotayı küresel/yerel en iyiye yaklaştıran takaslar üretilir ve `c₂ · r₂` ile orantılı sayıda eklenir.

Toplam takas listesi `maxSwapsPerIter` ile sınırlandırılır: **çok fazla takas = rastgele davranış**, **çok az takas = sıkışma.**

---

### C. Konum Güncelleme

Yeni hız (takas listesi) mevcut rotaya uygulanarak yeni konum hesaplanır:

```
x(t+1) = uygula(v(t+1), x(t))
```

- Başlangıç ve bitiş şehirleri **asla yer değiştirmez** (sabit tutulur).
- Takas sonrası oluşabilecek döngüler `removeCycles` fonksiyonu ile temizlenir, rota geçerliliği korunur.

---

### D. Mutasyon (Çeşitlilik Mekanizması)

`mutationRate` olasılığıyla iki rastgele ara şehir takas edilir. Bu mekanizma:
- Sürünün **erken yakınsamadan (premature convergence)** korunmasını sağlar.
- Yerel minimumlara çakılmış parçacıkların kurtulmasına yardımcı olur.

---

### E. Bellek Güncelleme

Her iterasyonun sonunda:
- Parçacığın yeni konumu, **kişisel en iyisinden (pBest) daha iyi** ise pBest güncellenir.
- Güncellenen pBest, **küresel en iyiden (gBest) daha iyi** ise gBest güncellenir.

---

### F. V-Şekilli Sürü (lBest Topolojisi)

Standart PSO'da tüm parçacıklar tek bir **gBest** değerini takip eder. Bu bazen erken yakınsamaya yol açabilir.

**lBest topolojisinde** (öğretmenin V-şekilli sürüsü):
- Her parçacık yalnızca **kendi komşularını** görür (pencere `neighborhoodSize` ile belirlenir).
- `lBest = argmin(pBestDist)` → komşuluk penceresindeki en iyi parçacık.
- Bu yapı, kuşların V formasyonunda bilgiyi kenara doğru aktarmasına benzer şekilde çalışır.

**Avantajı:** Daha fazla çeşitlilik, erken yakınsamaya karşı direnç.
**Dezavantajı:** Daha yavaş yakınsama, gBest'e kıyasla daha fazla iterasyon gerektirebilir.

---

## 4. Sözde-Kod (Pseudocode)

```
Sürüyü N parçacıkla başlat:
    Her parçacık için:
        position ← rastgele geçerli rota
        velocity ← [] (boş)
        pBest ← position
        pBestDist ← mesafe(position)

gBest ← argmin(pBestDist) tüm parçacıklar üzerinde

t = 1'den maxIterations'a kadar:
    Her parçacık i için:
        guideBest ← useLocalBest ? lBest(i) : gBest

        velocity ← w·velocity
                   + c1·r1·swapListesi(position → pBest)
                   + c2·r2·swapListesi(position → guideBest)
        velocity ← velocity[0..maxSwaps]

        position ← uygula(velocity, position)
        position ← mutasyon(position)

        eğer mesafe(position) < pBestDist:
            pBest ← position; pBestDist ← mesafe

        eğer pBestDist < gBestDist:
            gBest ← pBest; gBestDist ← pBestDist; noImprove ← 0

    noImprove++
    eğer noImprove >= maxNoImprove: dur

Döndür: gBest
```

---

## 5. Karmaşıklık Analizi

| Bileşen | Karmaşıklık |
|---|---|
| Her iterasyon | O(N × rota_uzunluğu) |
| Toplam | O(N × T × rota_uzunluğu) |
| Bellek | O(N × rota_uzunluğu) |

Burada N = sürü boyutu, T = iterasyon sayısı.

---

## 6. Neden PSO TSP İçin Çalışır?

| Özellik | Açıklama |
|---|---|
| **Paralel keşif** | N parçacık aynı anda farklı bölgeleri arar |
| **Kişisel bellek** | Her parçacık kendi bulduğu en iyiyi hatırlar (backtracking engeli) |
| **Sosyal bilgi paylaşımı** | En iyi bulunan rota tüm sürüyü (veya komşuları) yönlendirir |
| **Takas-tabanlı hız** | Ayrık TSP uzayına uyarlanmış doğal hareket mekanizması |
| **Mutasyon + lBest** | Çeşitlilik korunur, yerel minimumlara çakılma önlenir |

---

## 7. Öğretmene Özet Sunum (Kısa Versiyon)

> **Parçacık Sürüsü Optimizasyonu**, kuş sürüsünün kolektif davranışını modelleyen bir meta-sezgisel algoritmadır. Her parçacık bir TSP rota adayını temsil eder ve her iterasyonda hem kendi en iyi deneyimini (bilişsel bileşen, c₁) hem de sürünün kolektif en iyi bilgisini (sosyal bileşen, c₂) birleştirerek hareketini günceller. TSP gibi ayrık problemlerde hız vektörü, takas operasyonları dizisi olarak temsil edilir. Öğretmenin bahsettiği **V-şekilli sürü kavramı**, lBest topolojisine karşılık gelir: Her parçacık tüm sürü yerine yalnızca komşularındaki en iyi çözümü takip eder; bu yapı çeşitliliği artırır ve sürecin erken yakınsamasını önler.

---

## 8. Arayüzde PSO Nasıl Kullanılır?

1. Sağ paneldeki algoritma seçiciden **"Parçacık Sürüsü (PSO)"** seçin.
2. Parametreleri ayarlayın:
   - **Sürü Büyüklüğü**: Ne kadar çok parçacık, o kadar geniş arama.
   - **Atalet (w)**: 0.7–0.9 genelde optimum keşif-sömürü dengesi sağlar.
   - **c₁ ≈ c₂ ≈ 1.5–2.0**: Standart akademik değerler.
   - **V-Sürü (lBest)**: Daha çeşitli arama için açın, komşuluk yarıçapını 2–3 bırakın.
3. ▶ Başlat tuşuna basın. Kırmızı çizgi bir parçacığın mevcut rotasını, yeşil çizgi küresel en iyi rotayı gösterir.
