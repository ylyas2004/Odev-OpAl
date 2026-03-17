# Tabu Arama (Tabu Search) Kod Adımları İncelemesi

Bu doküman, `src/utils/tabuSearch.ts` içerisindeki kodun satır satır ve fonksiyon bazında nasıl çalıştığını anlamak için hazırlanmıştır. Hedefimiz, başlangıç şehrinden bitiş şehrine (örneğin Edirne'den Kars'a) en kısa yolu bulmaktır.

---

## 🏗️ 1. Hazırlık ve Haritanın Yüklenmesi (Constructor)
```typescript
constructor(startCity: string, endCity: string, params: TabuParams)
```
**Ne Yapar?**
Grafik haritayı (yol ağını) sistem belleğine yükler. `ROAD_EDGES` verisini alır ve bunu bir **Komşuluk Listesine (Adjacency List)** çevirir. Yani, İstanbul'dan hangi şehirlere yol var ve aralarındaki mesafe nedir, hepsini hızlı okunabilir bir `Map` (sözlük) içine koyar.

---

## 🚶‍♂️ 2. İlk Rotanın Bulunması (Initial Solution)
Algoritmanın çalışabilmesi için önce "kötü de olsa" bir rotaya ihtiyacı vardır. 

### A) `generateRandomPath()`
**Ne Yapar?** 
Deli gibi rastgele sokaklara giren bir sarhoş yürüyüşüdür (Random Walk). 
- Başlangıç noktasından çıkar, önüne çıkan yollardan birini rastgele seçer (`Math.random`).
- Geldiği yola geri dönmemeye çalışır.
- Hedefe ulaşana kadar maksimum 2000 adım atar. Hedefe varırsa kendi üzerinde attığı düğümleri (`removeCycles`) temizler ve bu ilk geçerli yolu döndürür.

### B) `findValidPath()` (Kurtarma Modu)
**Ne Yapar?**
Eğer sarhoş yürüyüşü haritanın köşesinde sıkışıp hedefe varamazsa devreye girer. BFS (Genişlik Öncelikli Arama) kullanarak grafikteki düğümleri dalga dalga tarar. Haritada eğer iki nokta arasında bir kara yolu bağlantısı varsa, BFS onu **%100 matematiksel garantiyle** bulur.

---

## 🛠️ 3. Yeni Yollar Üretme (Neighborhood Generation)
Tabu Aramanın kalbi burasıdır.
```typescript
private getNeighbors(path: string[], count: number)
```
Bu fonksiyon **sadece tek bir sonraki şehri DEĞİL, baştan sona yepyeni TAM rotalar** (komşular) üretir ve bunları liste halinde geri döndürür.

Elinde mevcut bir tam rota var (örneğin: `[İstanbul, Ankara, Sivas, Erzurum]`). Algoritma bu tam rotayı biraz bozarak alternatif "Komşu Rotalar" üretmeye çalışır. Bunu yaparken 4 farklı taktik dener ve her ürettiği yeni tam rota ile birlikte **"bu rotayı üretirken hangi şehre dokundum?"** bilgisini (hamle/move) kaydeder. Çünkü **Tabu (Yasaklı) olan şey koca bir rota değil, SADECE o dokunduğumuz MÜDAHALE EDİLEN ŞEHİRDİR.**

1. **Silme (Deletions):** `Ankara` yı aradan çıkartmayı dener. Eğer `İstanbul` ve `Sivas` arasında doğrudan yol varsa **TAM YENİ ROTA** olarak `[İstanbul, Sivas, Erzurum]` rotasını üretir. Çıkardığı şehri (`Ankara`) "bu hamle" (Yasaklanmaya aday şehir) olarak etiketler.
2. **Değiştirme (Swaps):** `Ankara` yerine, İstanbul ve Sivas'a ortak sınırı olan başka bir şehir (`Bolu` olsun) koymayı dener ve yeni rota olarak `[İstanbul, Bolu, Sivas, Erzurum]` üretir. Etiket: Çıkarılan `Ankara` tabu adayı olur.
3. **Araya Ekleme (Inserts):** İstanbul ile Ankara arasına yolu biraz dolandıran ama ileride yeni ihtimaller doğuracak bir `Sakarya` ekler: `[İstanbul, Sakarya, Ankara, Sivas, Erzurum]`. Etiket: Eklenen `Sakarya` tabu adayı olur.
4. **BFS Kestirmesi (Bypasses):** Rotadaki hedeflenmiş bir şehre (örneğin Sivas'a) **"kesinlikle uğramadan"** karşıya nasıl geçerim sorusunu sorarak o şehri yoldan tamamen silen yepyeni bir ara tünel hattı çizer. Etiket: Sildiğimiz `Sivas`.

Bu 4 yöntemle çok sayıda farklı baştan-sona alternatif rota (komşu) üretilir. Toplam `count` (neighborhoodSize parametresi) kadar benzersiz rota listeye alınır.

---

## 🧠 4. Tabu Listesi (Kısa Süreli Hafıza)
```typescript
const tabuList: string[] = [];
```
Bu, algoritmanın unutkan olmasını engelleyen yapıdır.

Diyelim ki algoritma `Ankara` yı silerek daha kısa bir yol buldu ve o yola girdi.
Algoritma `Ankara` yı **Tabu Listesine (Yasaklılar)** ekler. 
Neden? Çünkü bir sonraki adımda sistem aptalca bir şekilde "Araya şehir ekleyeyim, Ankara'yı ekleyip deneyeyim" diyebilir. Sistem Ankara'nın tabu listesinde olduğunu görür ve *"Hayır, oradan yeni çıktım ve onu bilerek sildim, oraya geri dönemem"* diyerek o rotayı baştan reddeder. Bu, bizi **kısır döngülere (local minima) hapsolmaktan kurtarır!** Liste dolduğunda en eski yasaklı şehir unutulur (FIFO Mantığı).

---

## 🏆 5. Aspiration Criterion (Gevşetme Kriteri)
Bazen kuralları çiğnemek gerekir.

```typescript
const tabu = isTabu(move);
if (!tabu || currentDistance < bestGlobalDistance) { ... }
```
**Ne Yapar?**
Algoritma yeni komşuları denerken, diyelim ki inanılmaz bir kestirme keşfetti. Bu kestirme, oyunun başından beri bulunduğumuz **EN KISA (Best Global)** yoldan bile daha kısa! 

Ama bir sorun var... Bu yeni muhteşem rotaya girebilmek için Tabu listesindeki yasaklı bir şehre (`Ankara`) uğraması gerekiyor.
Eğer bu yasaklı hamle bizi **yeni bir global rekora** götürüyorsa, algoritma yasağı umursamaz! "Tabu kuralını esnetiyorum (Aspiration)" der ve o yola girer. Bu sayede hiçbir potansiyel süper-optimum yol gözden kaçmaz.

---

## ⚙️ 6. Ana Döngünün İşleyişi (`run`)
Bütün parçaların birleştiği yer alan `run()` fonksiyonunun algoritma adımları şöyledir:

1. Başlangıçtan bitişe rastgele geçerli yasal bir yol bul.
2. Bu yolun mesafesini ölç ve onu başlangıç `currentPath` (Mevcut Yol) ve şu ana kadarki `bestPath` (En İyi Yol) olarak kaydet.
3. **Döngüyü Başlat (`maxIterations` kadar dön):**
   - Mevcut yoldan `getNeighbors` ile yeni X adet Komşu Rota üret.
   - Bu komşuların içindeki **en kısasını** bul.
   - Seçilen bu en kısa komşu Tabu listesinde mi diye bak. Tabu listesindeyse ve yeni global rekor kırmıyorsa o komşuyu çöpe at. İkinci en kısayı seç.
   - Seçilen komşunun yol uzunluğu şu anki (current) yolumuzdan daha UZUN BİLE OLSA, oraya adım at! (Bu, sistemin başka bir yöne doğru ilerlemesi içindir).
   - Yaptığın bu hamleyi (örneğin rotadan atılan şehri) Tabu Listesine ekle.
   - Eğer yeni yolumuz global rekor kırdıysa (`bestPath` ten daha kısaysa), rekoru güncelle ve "İyileşmeme Sayacını (noImproveCount)" sıfırla.
   - Ön yüze (React UI) grafikleri çizmesi için anlık kırmızı rotayı (`onFrame`) gönder.
   - Arama sabır limiti dolarsa (`maxNoImprove`), döngüyü erken kır.
4. Finalde en iyi global yeşil rotayı geri döndür.
