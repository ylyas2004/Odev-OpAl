# Benzetimli Tavlama (Simulated Annealing) Algoritması Kod Açıklaması

Bu doküman, `src/utils/simulatedAnnealing.ts` dosyasındaki Benzetimli Tavlama (Simulated Annealing) algoritmasının çalışma mantığını sınıfa ve hocaya sunarken kullanabileceğiniz teknik bir rehberdir.

## 1. Algoritmaya Genel Bakış
Benzetimli Tavlama, metalurji bilimindeki "tavlama" (annealing - metali yavaş yavaş soğutarak en sağlam atomik dizilime ulaştırma) işleminden esinlenen sezgisel (heuristic) bir optimizasyon algoritmasıdır. Temel amacı, sistemde karşılaşılan **yerel minimumlara (local minima) takılmadan global minimumu bulaşıp bulabilmektir** (Bizim uygulamamızda: Haritadaki en kısa rotayı bulmak). 

Bunu yaparken başlangıçta yüksek "sıcaklık" kullanılarak kötü (daha uzun) rotalar bile belirli bir olasılıkla kabul edilir. Sıcaklık zamanla matematiksel olarak düştükçe algoritma gittikçe daha seçici olur ve etrafındaki yerel bölgeye (optimuma) sıkıca yerleşir.

---

## 2. Kullanılan Parametreler (`SAParams`)
Sistemde kullanılan akademik parametreler şunlardır:
- **`initialTemperature` (Başlangıç Sıcaklığı):** Sistemin başlangıç enerjisidir. Yüksek olması uzaktaki alanların daha agresif aranmasına yardımcı olur.
- **`minTemperature` (Minimum Sıcaklık):** Algoritmanın aramayı durduracağı soğukluk eşiğidir.
- **`coolingRate` (Soğuma Oranı - $\alpha$):** Sıcaklığın iterasyon başına düşme hızı (alfa sabiti).
- **`maxIterations` (Maks. İterasyon):** Algoritmanın aşırı çalışıp donmayı engellemesi için ana soğuma döngüsü limiti.
- **`iterationsPerTemp` (Deneme/Sıcaklık):** Algoritma her bir sıcaklık derecesine geldiğinde, bir sonraki dereceye düşmeden önce kaç tane yeni rota (komşu) test edeceğini belirler (İç döngü).
- **`coolingSchedule` (Soğuma Çizelgesi):** Sıcaklığın zamanla hangi formata göre düşeceğidir (Linear, Geometric, vs.).

---

## 3. Kodun Ana Bölümleri (`simulatedAnnealing.ts`)

### A. Başlangıç Durumunun Üretilmesi (`generateRandomPath` ve `findValidPath`)
Algoritmanın başlayabilmesi için önce geçiş yapılabilecek gerçek yollara sahip geçerli bir başlangıç durumuna (rotaya) ihtiyacı vardır.
- **`generateRandomPath`**: İlk olarak Random Walk algoritması kullanılarak tamamen rastgele bağlantılarla hedef şehre ulaşılmaya çalışılır. Bu yolla en çeşitli ve kaotik başlangıç rotası elde edilir.
- **`findValidPath` (BFS Fallback)**: Eğer çok uzak, doğrudan ulaşılamayan zıt uçlarda iki şehir girilirse rastgele arama başarısız olabilir. Bu fonksiyon devreye girerek "Breadth-First-Search (Genişlik Öncelikli Arama)" yöntemiyle graf üzerinde matematiksel olarak kesin bir bağlantı yolu garanti eder. Bu sayede program "Infinity (Sonsuz uzaklık)" hatalarından korunmuş olur.

### B. Komşu Üretimi - Durum Uzayında Gezinme (`getNeighbor`)
Simulated Annealing'in başarısı, mevcut rotasından ne kadar iyi "komşular (alternatif rotalar)" türettiğine bağlıdır. Bizim kodumuzda bu sistem 4 yönlü zar atarak tasarlanmıştır:
1. **Silme (Delete - %25 İhtimal):** Rotadan aradaki gereksiz bir şehri çıkararak yolu kısaltır (Ancak sadece aradan çıkan şehrin öncesi ve sonrası direkt bağlıysa çalışır).
2. **Değiştirme (Swap - %25 İhtimal):** Rotadaki ara bir şehri çıkartır, yerine hem önceki hem sonraki şehre kara yolu olan yepyeni bir ortak komşu şehir koyar. Yolu alternatif eksenlere kaydırır.
3. **Araya Ekleme (Insert - %25 İhtimal):** Rotadaki birbirine bağlı iki mesafe arasına ortak bağlantısı olan üçüncü bir şehri ekler. Bu, rotanın esnemesine, uzaklaşıp yeni otoyollar bulabilmesine olanak tanır.
4. **Yeniden Yönlendirme (Reroute - %25 İhtimal):** Yolun rastgele bir noktasından itibaren geri kalan kısmı kesip atar ve bitiş noktasına giden tamamen yeni rastgele bir rota çizer (Büyük sıçramalar için).

### C. Ana Optimizasyon Döngüsü ve Metropolis Kriteri (`run`)
Optimizasyonun kalbi olan yer burasıdır.
1. `while` döngüsü sıcaklık `minTemperature` sınırının altına düşene kadar çalışır.
2. `getNeighbor` fonksiyonu ile yeni bir rota taranır ve o yeni alternatifin toplam `distance` (uzaklığı) ölçülür.
3. **Kabul Aşaması:**
   - Eğer yeni rota mevcut rotadan **KISA** ise, bu rota sorgusuz sualsiz "mevcut" rota olarak anında kabul edilir.
   - Eğer yeni rota **UZUN** ise (yani daha kötüyse), olasılık bazlı **Metropolis Kriteri** çalışır:

**Metropolis Formülü:**  
$P = e^{\frac{-(YeniUzaklik - EskiUzaklik)}{Sicaklik}}$  
Kodda: `Math.exp((currentDist - neighborDist) / temperature);`

Sistem 0-1 arası rastgele bir sayı atar. Rastgele sayı bu olasılık $P$ değerinden küçükse, algoritma kısa rotayı siler bilerek daha uzun olanına girer! Bu harika mekanizma, sistemin dar sokaklı "yerel" minimumlarda hapsolmasını engeller. Sıcaklık başlangıçta yüksektir ve bu formül genelde 1'e veya 0.9'a yakındır (Kötü yollara çok girer). Ancak algoritmanın sonlarına doğru sıcaklık sıfıra yaklaşınca denklem $e^{-\infty}$ 'a yani hızla $0$'a doğru çöker. Kötü yollar bir daha asla kabul edilmez.

### D. Soğuma Formülleri (Cooling Schedules)
Akademik literatürdeki standart sıcaklık düşüşleri koda `step` (döngü adımı) parametresine bağlanarak eklenmiştir. "Maksimum İterasyon" sliderından ayarlanan sayıya kadar şu matematik uygulanır:
- **Linear (Doğrusal):** Sıcaklık her adımda sabit bir $\alpha$ oranı kadar çıkartılarak eksilir. $T_{step} = T_0 - (\alpha \times step)$
- **Boltzmann (Logaritmik):** Doğal algoritmaya göre son derece yavaş soğuyan garantili fonksiyondur. $T_{step} = \frac{T_0}{\ln(e + step)}$
- **Cauchy (Hızlı Tavlama):** Literatürde "Fast Annealing" denilen hızlı soğuma denklemi.  $T_{step} = \frac{T_0}{(1 + \alpha \times step)}$
- **Geometric (Üstel):** En yaygın standart formüldür. Her döngüde sıcaklık $0.99$ gibi bir $\alpha$ çarpanı ile yavaşça aşındırılır.  $T_{step} = T_0 \times \alpha^{step}$
