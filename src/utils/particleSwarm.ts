import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface PSOParams {
    swarmSize: number;        // Parçacık sayısı (N)
    maxIterations: number;    // Maksimum iterasyon sayısı
    inertiaWeight: number;    // Atalet katsayısı (w) — önceki hızın ne kadarı korunur
    cognitiveCoeff: number;   // Bireysel öğrenme katsayısı (c1) — kişisel en iyiye çekim
    socialCoeff: number;      // Sosyal öğrenme katsayısı (c2) — küresel en iyiye çekim
    maxSwapsPerIter: number;  // Her iterasyonda uygulanacak maksimum takas sayısı
    mutationRate: number;     // Çeşitlilik için rastgele mutasyon olasılığı
    useLocalBest: boolean;    // V-şekilli sürü: yerel komşuluk (lbest) kullan mı?
    neighborhoodSize: number; // lbest ayarında komşuluk pencere yarıçapı
    maxNoImprove: number;     // Bu kadar iterasyon boyunca iyileşme olmazsa erken dur
}

export interface PSOResult {
    path: string[];
    dist: number;
}

// Takas hareketi: iki indeksin yerini değiştir
interface Swap {
    i: number;
    j: number;
}

// Parçacığın konumu (rota) ve hızı (takas listesi)
interface Particle {
    position: string[];          // Mevcut rota (tam düğüm dizisi) — HER ZAMAN geçerli yol
    velocity: Swap[];            // Hız = uygulanacak takas operasyonları listesi
    pBest: string[];             // Kişisel en iyi rota
    pBestDist: number;           // Kişisel en iyi mesafe
}

export class ParticleSwarmOptimization {
    private adjList: Map<string, Map<string, number>>;
    private params: PSOParams;
    private startCity: string;
    private endCity: string;

    constructor(startCity: string, endCity: string, params: PSOParams) {
        this.startCity = startCity;
        this.endCity = endCity;
        this.params = params;

        // Graf komşuluk listesi oluştur
        this.adjList = new Map();
        CITIES.forEach(c => this.adjList.set(c.id, new Map()));
        ROAD_EDGES.forEach(e => {
            this.adjList.get(e.from)?.set(e.to, e.distance);
            this.adjList.get(e.to)?.set(e.from, e.distance);
        });
    }

    private getDist(a: string, b: string): number {
        return this.adjList.get(a)?.get(b) ?? Infinity;
    }

    private calcTotalDistance(path: string[]): number {
        let sum = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const d = this.getDist(path[i], path[i + 1]);
            if (d === Infinity) return Infinity;
            sum += d;
        }
        return sum;
    }

    // Döngüleri kaldıran yardımcı fonksiyon
    private removeCycles(path: string[]): string[] {
        const res: string[] = [];
        const seen = new Map<string, number>();
        for (const city of path) {
            if (seen.has(city)) {
                const idx = seen.get(city)!;
                res.splice(idx + 1);
                seen.clear();
                res.forEach((c, i) => seen.set(c, i));
            } else {
                res.push(city);
                seen.set(city, res.length - 1);
            }
        }
        return res;
    }

    // BFS ile iki şehir arasında kesinlikle yol bul
    private bfsPath(start: string, end: string): string[] {
        const queue: string[][] = [[start]];
        const visited = new Set<string>([start]);
        while (queue.length > 0) {
            const p = queue.shift()!;
            const curr = p[p.length - 1];
            if (curr === end) return p;
            const edges = this.adjList.get(curr);
            if (edges) {
                for (const next of edges.keys()) {
                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push([...p, next]);
                    }
                }
            }
        }
        return [start, end]; // Teorik olarak hiç ulaşılamaz, sadece fallback
    }

    // BFS ile başlangıç rotası garantileme
    private findValidPath(start: string, end: string): string[] {
        return this.bfsPath(start, end);
    }

    /**
     * Rota Onarımı (Path Repair) — PSO'nun en kritik güvenlik mekanizması
     *
     * Takas operasyonları (applySwaps) ve mutasyon, bitişik iki şehir arasında
     * gerçek karayolu bağlantısı OLMAYAN geçersiz segmentler oluşturabilir.
     * Bu fonksiyon her geçersiz segmenti BFS ile gerçek karayollarını kullanarak onarır.
     * Bu sayede hiçbir parçacık asla geçersiz (doğrudan bağlantısı olmayan) bir rota taşımaz.
     */
    private repairPath(path: string[]): string[] {
        if (path.length < 2) return this.bfsPath(this.startCity, this.endCity);

        const result: string[] = [path[0]];
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            if (this.getDist(from, to) !== Infinity) {
                // Geçerli kenar: direkt ekle
                result.push(to);
            } else {
                // Geçersiz kenar: aradaki BFS rotasını bul ve ekle
                const segment = this.bfsPath(from, to);
                result.push(...segment.slice(1)); // from zaten result'ta var
            }
        }
        return this.removeCycles(result);
    }

    // Rastgele geçerli yol üretme (hızlı başlangıç)
    private generateRandomPath(): string[] | null {
        const path = [this.startCity];
        let curr = this.startCity;
        for (let steps = 0; steps < 2000; steps++) {
            if (curr === this.endCity) return this.removeCycles(path);
            const edges = this.adjList.get(curr);
            if (!edges || edges.size === 0) return null;
            const choices = Array.from(edges.keys()).filter(e => e !== path[path.length - 2]);
            const pool = choices.length > 0 ? choices : Array.from(edges.keys());
            const next = pool[Math.floor(Math.random() * pool.length)];
            path.push(next);
            curr = next;
        }
        return null;
    }

    // Konuma takas operasyonları uygula (hız uygulaması)
    // Not: Takaslar sadece ara şehirleri karıştırır. repairPath() ile onarılacak.
    private applySwaps(path: string[], swaps: Swap[]): string[] {
        const result = [...path];
        for (const swap of swaps) {
            const i = swap.i % result.length;
            const j = swap.j % result.length;
            // Başlangıç ve bitiş şehirlerini asla taşıma
            if (i === 0 || i === result.length - 1) continue;
            if (j === 0 || j === result.length - 1) continue;
            [result[i], result[j]] = [result[j], result[i]];
        }
        // Döngüleri temizle — ANCAK yol onarımı (repairPath) burada değil
        // çünkü önce takas sonucu görmemiz gerekiyor
        return result;
    }

    /**
     * PSO Hız Güncellemesi (Takas tabanlı — TSP için uyarlanmış)
     *
     * Klasik PSO: v = w*v + c1*r1*(pBest - x) + c2*r2*(gBest - x)
     *
     * TSP uyarlaması: "çıkarma" → iki rota arasındaki farkı takas dizisi olarak temsil et.
     * Rastgele r1, r2 sayılarına orantılı takas sayısı üretilir.
     */
    private updateVelocity(
        current: string[],
        velocity: Swap[],
        pBest: string[],
        gBest: string[],
    ): Swap[] {
        const { inertiaWeight, cognitiveCoeff, socialCoeff, maxSwapsPerIter } = this.params;

        const newVelocity: Swap[] = [];

        // 1. Atalet bileşeni: Eski hızın w kadarını koru
        const inertiaCount = Math.round(inertiaWeight * velocity.length);
        for (let i = 0; i < Math.min(inertiaCount, velocity.length); i++) {
            newVelocity.push(velocity[i]);
        }

        // 2. Bilişsel bileşen (c1): kişisel en iyiye yönelik takaslar
        const r1 = Math.random();
        const cogSwapCount = Math.round(cognitiveCoeff * r1 * 2);
        const swapsTowardPBest = this.generateSwapsToward(current, pBest);
        newVelocity.push(...swapsTowardPBest.slice(0, cogSwapCount));

        // 3. Sosyal bileşen (c2): küresel/yerel en iyiye yönelik takaslar
        const r2 = Math.random();
        const socSwapCount = Math.round(socialCoeff * r2 * 2);
        const swapsTowardGBest = this.generateSwapsToward(current, gBest);
        newVelocity.push(...swapsTowardGBest.slice(0, socSwapCount));

        // Hız boyutunu sınırla (çok fazla takas = rastgele davranış)
        return newVelocity.slice(0, maxSwapsPerIter);
    }

    /**
     * İki rota arasındaki farkı temsil eden takas dizisi üret
     * (source'u target'a dönüştürmek için gereken takaslar)
     */
    private generateSwapsToward(source: string[], target: string[]): Swap[] {
        const swaps: Swap[] = [];
        const copy = [...source];

        for (let i = 1; i < Math.min(copy.length, target.length) - 1; i++) {
            if (copy[i] !== target[i]) {
                // target[i]'yi copy içinde bul ve takas et
                const targetIdx = copy.indexOf(target[i]);
                if (targetIdx > 0 && targetIdx < copy.length - 1) {
                    swaps.push({ i, j: targetIdx });
                    [copy[i], copy[targetIdx]] = [copy[targetIdx], copy[i]];
                }
            }
        }
        return swaps;
    }

    /**
     * Mutasyon: Rotadaki iki ara şehri rastgele takas et.
     * Sonrasında repairPath çağrılacağından geçersiz segmentler otomatik onarılır.
     */
    private mutate(path: string[]): string[] {
        if (Math.random() > this.params.mutationRate || path.length <= 3) return path;
        const result = [...path];
        // Sadece ara düğümleri takas et (başlangıç ve bitiş sabit)
        const i = 1 + Math.floor(Math.random() * (result.length - 2));
        const j = 1 + Math.floor(Math.random() * (result.length - 2));
        if (i !== j) {
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result; // repairPath sonraki adımda çağrılacak
    }

    /**
     * Yerel En İyi (lBest) hesapla — V-şekilli sürü topolojisi
     * Her parçacık, çevresindeki komşularındaki en iyiyi takip eder.
     */
    private getLocalBest(particles: Particle[], idx: number): string[] {
        const radius = this.params.neighborhoodSize;
        const n = particles.length;
        let localBest = particles[idx].pBest;
        let localBestDist = particles[idx].pBestDist;

        for (let k = -radius; k <= radius; k++) {
            const neighborIdx = ((idx + k) % n + n) % n;
            if (particles[neighborIdx].pBestDist < localBestDist) {
                localBestDist = particles[neighborIdx].pBestDist;
                localBest = particles[neighborIdx].pBest;
            }
        }
        return localBest;
    }

    public run(onFrame: (frame: any) => void): PSOResult {
        const { swarmSize, maxIterations, maxNoImprove, useLocalBest } = this.params;

        // === ADIM 1: Sürüyü Başlat ===
        const particles: Particle[] = [];

        for (let i = 0; i < swarmSize; i++) {
            let path: string[] | null = null;
            for (let attempt = 0; attempt < 100 && !path; attempt++) {
                path = this.generateRandomPath();
            }
            if (!path) path = this.findValidPath(this.startCity, this.endCity);

            // Başlangıç yolu zaten geçerli (generateRandomPath/findValidPath garantiler)
            const dist = this.calcTotalDistance(path);
            particles.push({
                position: path,
                velocity: [],
                pBest: [...path],
                pBestDist: dist,
            });
        }

        // Global en iyiyi belirle (sadece Infinity olmayan parçacıklar arasından)
        const validParticles = particles.filter(p => p.pBestDist < Infinity);
        if (validParticles.length === 0) {
            // Hiçbiri geçerli değilse BFS ile garantili başlangıç
            const fallback = this.findValidPath(this.startCity, this.endCity);
            return { path: fallback, dist: this.calcTotalDistance(fallback) };
        }

        let gBestParticle = validParticles.reduce((a, b) => a.pBestDist < b.pBestDist ? a : b);
        let gBest = [...gBestParticle.pBest];
        let gBestDist = gBestParticle.pBestDist;

        let noImproveCount = 0;

        // === ADIM 2: Ana İterasyon Döngüsü ===
        for (let iter = 0; iter < maxIterations; iter++) {
            let improvedThisIter = false;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Yerel mı küresel mi en iyi kullan (topoloji seçimi)
                const guideBest = useLocalBest
                    ? this.getLocalBest(particles, i)
                    : gBest;

                // Hız güncelle (v = w*v + c1*r1*(pBest-x) + c2*r2*(gBest-x))
                p.velocity = this.updateVelocity(p.position, p.velocity, p.pBest, guideBest);

                // Konum güncelle: takasları uygula
                let newPos = this.applySwaps(p.position, p.velocity);

                // Mutasyon uygula
                newPos = this.mutate(newPos);

                // *** DÜZELTME: Geçersiz segmentleri BFS ile onar ***
                // Bu adım, takas/mutasyon sonrası oluşan karayolu olmayan
                // bitişik şehir çiftlerini gerçek yollarla bağlar.
                newPos = this.repairPath(newPos);

                const newDist = this.calcTotalDistance(newPos);

                // Sanity check: onarımdan sonra hâlâ Infinity dönerse bu parçacığı atla
                if (newDist === Infinity) continue;

                p.position = newPos;

                // Kişisel en iyiyi güncelle
                if (newDist < p.pBestDist) {
                    p.pBest = [...newPos];
                    p.pBestDist = newDist;
                }

                // Küresel en iyiyi güncelle
                if (p.pBestDist < gBestDist) {
                    gBest = [...p.pBest];
                    gBestDist = p.pBestDist;
                    improvedThisIter = true;
                }
            }

            // noImproveCount: sadece bu iterasyonda iyileşme olmadıysa artır
            if (improvedThisIter) {
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }

            // Her iterasyon bir kare kaydet (görselleştirme için)
            // trialPath: rastgele bir parçacığın geçerli konumunu göster (kırmızı çizgi)
            const trialParticle = particles[Math.floor(Math.random() * particles.length)];
            onFrame({
                generation: iter,
                bestDistance: gBestDist,
                trialPath: trialParticle.position,  // Her zaman onarılmış geçerli yol
                bestPath: gBest,
            });

            // Erken durdurma
            if (noImproveCount >= maxNoImprove) break;
        }

        // Son kare: en iyi rotayı göster
        onFrame({
            generation: maxIterations,
            bestDistance: gBestDist,
            trialPath: gBest,
            bestPath: gBest,
        });

        return { path: gBest, dist: gBestDist };
    }
}
