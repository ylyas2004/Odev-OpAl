# Yapay Arı Kolonisi (ABC) Optimizasyonu — Algoritma Açıklaması

Bu doküman, `src/utils/beeColony.ts` dosyasındaki **Yapay Arı Kolonisi (Artificial Bee Colony — ABC)** algoritmasının TSP (Gezgin Satıcı Problemi) üzerindeki uygulamasını teknik ve açıklayıcı bir dille anlatmaktadır.

---

## 1. Algoritmanın Temeli ve Sezgisi

ABC algoritması, 2005 yılında Karaboğa tarafından geliştirilen ve **bal arılarının akıllı sürü davranışlarını** modelleyen bir meta-sezgisel optimizasyon algoritmasıdır.

Algoritma, kolonideki arıları üç gruba ayırır:

1.  **İşçi Arılar (Employed Bees):** Belirli bir besin kaynağına (çözüme) giderler, oradaki nektar miktarını (fitness) hesaplarlar ve yakın çevrede yeni kaynaklar ararlar.
2.  **Gözcü Arılar (Onlooker Bees):** İşçi arıların danslarını izleyerek hangi besin kaynağının daha verimli olduğuna karar verirler. Kaliteli kaynaklara yönelme olasılıkları daha yüksektir.
3.  **Kaşif Arılar (Scout Bees):** Artık iyileştirilemeyen (limit dolmuş) bir besin kaynağını terk edip tamamen rastgele yeni bir kaynak ararlar.

Bu hiyerarşi, algoritmanın hem **yerel sömürü (exploitation)** hem de **küresel keşif (exploration)** yeteneklerini dengelemesini sağlar.

---

## 2. Parametreler ve Açıklamaları (`ABCParams`)

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `beeCount` | 40 | Toplam arı sayısı. Yarısı işçi, yarısı gözcü olarak atanır. |
| `maxIterations` | 500 | Maksimum döngü (nesil) sayısı. |
| `limit` | 20 | Bir besin kaynağının kaç denemede iyileşmezse terkedileceğini belirleyen eşik. |
| `maxNoImprove` | 100 | Küresel en iyi çözüm bu kadar iterasyon boyunca değişmezse algoritmayı durdurur. |

---

## 3. Algoritmanın Ana Bölümleri (`beeColony.ts`)

### A. Başlatma (Initialization)

- Başlangıçta `beeCount / 2` kadar rastgele geçerli rota (besin kaynağı) oluşturulur.
- Her rotanın mesafesi (nektar kalitesi) hesaplanır.

### B. İşçi Arılar Fazı (Employed Bee Phase)

Her işçi arı, sorumlu olduğu besin kaynağı etrafında bir komşu arama yapar:
- **Komşu Üretimi:** Rotadaki iki şehir takas edilir veya bir alt dizi ters çevrilir (2-opt).
- **Yol Onarımı:** Yapılan değişiklik sonucu karayolu bağlantısı koparsa, `repairPath` fonksiyonu (BFS kullanarak) rotayı en yakın geçerli karayolları ile yamalar.
- **Açgözlü Seçim (Greedy Selection):** Eğer yeni rota eskisinden daha kısaysa, işçi arı yeni rotayı kabul eder ve deneme sayısını (`trials`) sıfırlar. Aksi halde deneme sayısını artırır.

### C. Gözcü Arılar Fazı (Onlooker Bee Phase)

Gözcü arılar, besin kaynaklarının kalitesine (fitness = 1 / mesafe) göre bir seçim yaparlar:
- **Olasılıksal Seçim:** Rulet tekerleği yöntemi kullanılır. Kısa rotaların seçilme şansı daha yüksektir.
- Seçilen kaynak üzerinde işçi arılarda olduğu gibi bir komşuluk araması yapılır ve iyileşme varsa güncellenir.

### D. Kaşif Arılar Fazı (Scout Bee Phase)

- Eğer bir besin kaynağının deneme sayısı (`trials`), kullanıcı tarafından belirlenen `limit` değerini aşarsa, o kaynak "tükenmiş" kabul edilir.
- Bir işçi arı kaşif arıya dönüşür ve bu kaynağı terk ederek tamamen rastgele yeni bir geçerli rota üretir. Bu adım, algoritmanın yerel minimumlara (çıkmaz sokaklara) saplanmasını engeller.

---

## 4. Sözde-Kod (Pseudocode)

```text
1. Besin kaynaklarını rastgele başlat (Valid Paths)
2. t = 1'den maxIterations'a kadar:
   
   a. İşçi Arı Fazı:
      Her kaynak için yeni komşu üret
      Eğer komşu daha iyiyse: Kaynağı güncelle, trials = 0
      Değilse: trials++

   b. Gözcü Arı Fazı:
      Kaynakların kalitesine göre olasılıkları hesapla
      Olasılıklara göre kaynak seç (Rulet Tekerleği)
      Seçilen kaynakta komşu ara ve iyileşme varsa güncelle

   c. Kaşif Arı Fazı:
      trials > limit olan kaynakları bul
      Bu kaynakları terkedip rastgele yeni yollar üret

   d. Global en iyiyi kaydet
   e. noImprovement > eşik ise: Dur

3. En iyi rotayı döndür
```

---

## 5. Neden ABC TSP İçin Uygundur?

| Özellik | Faydası |
| :--- | :--- |
| **Dinamik Keşif** | Kaşif arılar sayesinde asla tek bir noktaya takılıp kalmaz. |
| **Kalite Odaklılık** | Gözcü arılar iyi çözümlere daha fazla kaynak ayırarak hızlı yakınsama sağlar. |
| **Esneklik** | `limit` parametresi ile algoritmanın "sabırlılığı" kolayca ayarlanabilir. |
| **Yol Güvenliği** | BFS tabanlı onarım mekanizması ile her zaman gerçek karayolları üzerinde çalışır. |

---

## 6. Arayüzde ABC Nasıl Kullanılır?

1.  Sağ paneldeki algoritma seçiciden **"Yapay Arı Kolonisi (ABC)"** seçin.
2.  **Arı Sayısı:** Daha karmaşık rotalar için artırın.
3.  **Terketme Sınırı (Limit):** Düşük limit = daha çok keşif (daha çok rastgele yol), Yüksek limit = mevcut yolları daha derinlemesine inceleme.
4.  **Maks. İyileşmesizlik:** Algoritmanın ne kadar süre çözüm aramaya devam edeceğini belirler.
5.  **Kırmızı Çizgi:** O anki bir işçi arının incelediği rotayı, **Yeşil Çizgi:** Şimdiye kadar bulunan en iyi rotayı temsil eder.
