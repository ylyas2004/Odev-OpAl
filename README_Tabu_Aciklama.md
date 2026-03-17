# Tabu Arama (Tabu Search) Algoritması Kod Açıklaması

Bu doküman, `src/utils/tabuSearch.ts` dosyasındaki Tabu Arama (Tabu Search) algoritmasının çalışma mantığını, algoritmanın nasıl işlediğini ve parametrelerin ne anlama geldiğini sınıfa veya jüriye sunarken kullanabileceğiniz teknik bir rehberdir.

## 1. Algoritmaya Genel Bakış
Tabu Arama, Fred Glover tarafından geliştirilmiş, yerel arama (local search) yöntemlerini esneterek yerel minimumlara (local minima) takılmaktan kurtulmayı sağlayan deterministik bir meta-sezgisel optimizasyon algoritmasıdır. Temel amacı, sistemin aynı yolları tekrar tekrar denemesini (kısır döngüyü) engellemektir. (Bizim uygulamamızda: Haritadaki en optimal rotayı bulmak).

Benzetimli Tavlama'nın (Simulated Annealing) aksine, kötü yollara girmeyi zar atarak (olasılıkla) yapmaz. Tabu Arama, **Kısa Süreli Hafıza (Short-Term Memory / Tabu Listesi)** adı verilen bir mekanizma kullanır. Yeni yollar aranırken, daha önce yapılmış olan hamleler "yasaklı (Tabu)" ilan edilir. Bu sayede algoritma zorunlu olarak sürekli yeni ve keşfedilmemiş alanlara (şehirlere) yönelir.

---

## 2. Kullanılan Parametreler (`TabuParams`)
Sistemde kullanılan akademik parametreler ve RightPanel.tsx arayüzündeki karşılıkları şunlardır:
- **`tabuSize` (Tabu Listesi Boyutu):** Hafızanın kapasitesidir. Son yapılan kaç hamlenin "yasaklı" olarak aklında tutulacağını belirler. Küçük olursa algoritma aynı yollara dönüp takılabilir, çok büyük olursa arama alanı çok kısıtlanır ve iyi yollara girmesi engellenebilir.
- **`maxIterations` (Maksimum İterasyon):** Algoritmanın en fazla kaç adım ilerleyeceğini belirleyen diş dış döngü limitidir.
- **`neighborhoodSize` (Komşuluk Boyutu):** Algoritma her adımında mevcut rotasından kaç adet rastgele komşu (farklı alternatif rota) üreteceğini belirler. Genişletilmiş arama yeteneği sağlar.
- **`maxNoImprove` (Maksimum İyileşmesizlik / Sabır Limit):** Arka arkaya bu adım sayısı kadar global olarak daha kısa bir yol bulunamazsa (sistem en iyi rotada takılıp kalırsa), döngüyü gereksiz yormamak için aramayı erken durdurur.

---

## 3. Kodun Ana Bölümleri (`tabuSearch.ts`)

### A. Başlangıç Durumunun Üretilmesi (`generateRandomPath` ve `findValidPath`)
Algoritmanın başlayabilmesi için öncelikle harita üzerinde kopuk olmayan gerçek yollara sahip geçerli bir başlangıç rotasına ihtiyacı vardır.
- **`generateRandomPath`**: İlk olarak rastgele rotalarla hedefe ulaşılmaya çalışılır. Bu, algoritmanın her defasında farklı arama bölgelerinden başlamasını sağlar.
- **`findValidPath` (BFS Fallback)**: Eğer çok uzak iki şehir seçilirse ve rastgele arama düğüm çıkmazlarına girerse, "Breadth-First-Search (Genişlik Öncelikli Arama)" yöntemiyle graf üzerinde matematiksel olarak %100 kesin bir bağlantı yolu garanti edilir.

### B. Komşu Üretimi ve Çeşitlendirme (`getNeighbors`)
Tabu aramanın başarısı, etrafını ne kadar iyi analiz ettiğine bağlıdır. `getNeighbors` fonksiyonu sadece bir sonraki adımı değil, **baştan sona tamamen yeni rotalar** üretir.
Bunu yaparken rotanın sadece küçük bir kısmını bozar ve bu bozduğu yeri "hamle" olarak kaydeder. Çünkü **Yasaklı (Tabu) olan şey koskoca rotanın tamamı değil, sadece o müdahale edilen şehirdir.**
Mevcut rotadan yeni alternatifler (komşular) 4 farklı strateji ile üretilir:
1. **Silme (Deletions):** Rotadaki gereksiz bir şehri aradan çıkarıp hedefleri direkt bağlar. Çıkarılan bu şehir (örn: Ankara) Tabu Listesine girmeye adaydır.
2. **Değiştirme (Swaps):** Rotadaki ara bir şehri çıkartıp yerine alternatif ortak bir komşu şehir yerleştirir. Çıkarılan eski şehir Tabu olmaya adaydır.
3. **Araya Ekleme (Inserts):** Birbiriyle doğrudan bağlı iki şehrin arasına yolu uzatacak ama belki ileride kestirmelere bağlayacak yeni bir hedef şehir ekler. Eklenen bu yeni şehir Tabu olmaya adaydır.
4. **BFS Kestirmesi (Bypass):** Rotanın arasına girerek belirli bir şehri atlayıp "O şehre uğramadan nasıl giderdim?" sorusunu sorarak graf üzerinde o şehri by-pass eden yepyeni köprüler araştırır. Atlanan şehir Tabu olur.

Bu komşular arasından rastgele dizilmiş ve içinden birbirinden tamamen benzersiz (unique) `neighborhoodSize` adet kadar tam komşu rota seçilir ve değerlendirmeye alınır.

### C. Ana Optimizasyon Döngüsü ve Hafıza Mekanizması (`run`)
Optimizasyonun kalbi olan yer burasıdır.
1. Döngü `maxIterations` limitine veya `maxNoImprove` (sabır) limitine ulaşana kadar çalışır.
2. `getNeighbors` fonksiyonundan çok sayıda komşu aday rota gelir.
3. Algoritma bu komşuları teker teker inceler. Geçerli olanlar arasından **en kısa (en iyi)** olanını seçmeye çalışır.

**Aspiration Criterion (Özlem/Gevşetme Kriteri):**
Eğer seçilen bu en iyi hamle "Tabu (Yasaklı)" listesindeyse bile hemen atılmaz! Çok önemli bir akademik kontrolden geçer:
- Eğer bu yasaklı hamle bizi, şu ana kadar bulduğumuz en kısa rotadan (Global Best) **daha da kısa olan rekor bir seviyeye düşürüyorsa**, o hamlenin Tabu (Yasak) durumu görmezden gelinir (Aspiration Criterion) ve o yola girilir.
- Eğer yeni bir rekor kırmıyorsa ancak ve ancak o zaman yasaklı olduğu için es geçilir.

4. Algoritma en uygun, yasaklı olmayan (veya özlem kriterini geçen) en iyi rotayı "yeni mevcut rota" olarak seçer. (Dikkat: Bu yeni rota eskisinden uzun bile olsa seçilir! Bu sayede yerel çukurlardan çıkış sağlanır).
5. Bu hamle **Tabu Listesine (Kısa Süreli Hafızaya)** eklenir. Tabu boyutu dolduysa, en eski hamle (FIFO sırasıyla) silinir ve yasak kalkar.
