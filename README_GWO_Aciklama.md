# Gri Kurt (Grey Wolf Optimizer) Algoritması Kod Açıklaması

Bu doküman, `src/utils/greyWolf.ts` dosyasındaki Gri Kurt Optimizasyon (GWO) algoritmasının gezgin satıcı problemine (TSP) nasıl uyarlandığını ve çalışma mantığını açıklar.

## 1. Algoritmaya Genel Bakış
Gri Kurt Optimizasyonu, doğadaki gri kurt sürülerinin liderlik hiyerarşisi ve avlanma stratejilerinden esinlenerek geliştirilmiş popüler bir meta-sezgisel optimizasyon algoritmasıdır. Algoritma doğada avını çembere alan ve saldıran kurtların hareketlerini taklit eder.

Geleneksel GWO sürekli sayılar (sürekli uzay) üzerinde çalışmak üzere tasarlanmıştır. Ancak bizim haritamız kesik çizgili şehir noktalarından (ayrık uzay) oluştuğu için, orijinal matematiksel "A ve C" katsayısı yönlendirmelerini, **segment değişimi (crossover)** mantığına dönüştürerek algoritmaya uyarladık.

Sürüdeki hiyerarşi şu şekildedir:
- **Alfa ($\alpha$)**: En iyi rotayı (avın en iyi tahminini) bulan kurt.
- **Beta ($\beta$)**: İkinci en iyi rotayı bulan kurt.
- **Delta ($\delta$)**: Üçüncü en iyi rotayı bulan kurt.
- **Omega ($\omega$)**: Sürünün geri kalanı. Alfayı, betayı ve deltay takip ederler.

---

## 2. Kullanılan Parametreler (`GWParams`)
- **`packSize` (Kurt Sürüsü Boyutu):** Sürüdeki toplam alfa, beta, delta ve omega kurtlarının sayısı.
- **`maxIterations` (Maksimum İterasyon):** Avlanmanın en fazla kaç adım süreceğini belirler. Avlanma süresi ilerledikçe $a$ parametresi doğrusal olarak 2'den 0'a düşer (Keşiften Sömürüye geçiş).
- **`maxNoImprove` (Erken Durma Sabrı):** Alfa kurt üst üste bu kadar jenerasyon boyunca daha iyi bir yol bulamazsa, av yakalanmış sayılır ve döngü durur.

---

## 3. Algoritmanın Adımları (`greyWolf.ts`)

### A. İlk Sürünün Dağılması
Algoritma rastgele ve BFS destekli (`generateRandomPath` ve `findValidPath`) fonksiyonlar kullanarak `packSize` kadar kurt için farklı başlangıç rotaları oluşturur.

### B. Hiyerarşinin Kurulması
Tüm kurtların yolları ölçülür. En kısa mesafeyi bulan ilk 3 kurt sırasıyla Alfa ($\alpha$), Beta ($\beta$) ve Delta ($\delta$) olarak seçilir. Geri kalanlar Omega ($\omega$) olarak adlandırılır.

### C. Avın Çevrelenmesi ve Yaklaşma (`moveTowardLeader`)
Sürekli uzayda kurtlar liderlerine matematiksel olarak "yaklaşırlar". Ayrık uzayda (şehirler) ise biz bunu şöyle tanımlıyoruz: 
- Bir omega kurt, mesela Alfa kurda doğru ilerlemek isterse, Alfa'nın rotasından bir parçayı "kopyalayıp" kendi rotasına yapıştırır.
- `moveTowardLeader(wolf, leader)` fonksiyonu, hem omega kurdunun hem de liderin ortak olarak geçtiği iki şehri bulur.
- İki ortak şehir arasındaki liderin kullandığı kestirme yolu kesip alır ve omeganın rotasına entegre eder. Bu sayede omega, yavaşça liderin yolunu taklit etmeye başlar.

### D. Keşif (Exploration) ve Sömürü (Exploitation) Dengesi
Orijinal GWO'nun en güçlü özelliği avı arama (keşif) ve ava saldırma (sömürü) dengesidir. Bu koda şu şekilde uyarlanmıştır:
- Sistemde $a$ adı verilen bir katsayı vardır ve iterasyon boyunca `2.0`'dan `0.0`'a doğru yavaşça azalır.
- Her kurt için, rastgele bir $|A|$ (A vektörü genliği) değeri hesaplanır ($A = 2ar - a$).
- **Eğer $|A| \ge 1$ ise:** Kurt avı aramaktan (liderleri takip etmekten) vazgeçer ve tamamen farklı bir yöne gider (`smallReroute` çağrılır). Bu, haritada hiç gidilmemiş arka yolların taranmasını (keşif) sağlar.
- **Eğer $|A| < 1$ ise:** Kurt lidere güvenir ve rotasını liderle birleştirmeye (sömürü) devam eder (`moveTowardLeader` çağrılır).

Her omega kurdu, Alfa, Beta ve Delta'nın üçünün de rotasından birer ilham (`X1`, `X2`, `X3`) alır. Kendi beyninde 3 farklı alternatif çizer ve bunlardan en kısa olanını kendi asıl rotası olarak benimser.

Bu süreç, $a$ katsayısı sıfırlandığında ve tüm kurtlar Alfa'nın etrafında sıkıştığında en mükemmel av (en kısa rota) bulunmuş şekilde sona erer.
