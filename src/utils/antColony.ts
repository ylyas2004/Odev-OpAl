import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface ACOParams {
    antCount: number;        // Karınca sayısı — her iterasyonda kaç karınca tur oluşturur
    maxIterations: number;   // Maksimum iterasyon sayısı
    alpha: number;           // Feromon izi etkisi (α) — yüksek = karıncalar eskiye uyar
    beta: number;            // Sezgisel bilgi etkisi (β) — yüksek = karıncalar kısa kenarı tercih eder
    evaporationRate: number; // Feromon buharlaşma oranı (ρ) — 0-1 arası
    Q: number;               // Feromon bırakma sabiti — tur sonunda ne kadar feromon eklenir
    initialPheromone: number; // Başlangıç feromon seviyesi (tüm kenarlarda eşit)
    maxNoImprove: number;    // Bu kadar iterasyon boyunca iyileşme olmazsa erken dur
}

export interface ACOResult {
    path: string[];
    dist: number;
}

export class AntColonyOptimization {
    private adjList: Map<string, Map<string, number>>;
    private pheromone: Map<string, Map<string, number>>; // Feromon matrisi
    private params: ACOParams;
    private startCity: string;
    private endCity: string;
    private cityIds: string[];

    constructor(startCity: string, endCity: string, params: ACOParams) {
        this.startCity = startCity;
        this.endCity = endCity;
        this.params = params;

        // Komşuluk listesi (yalnızca gerçek karayolu kenarları)
        this.adjList = new Map();
        CITIES.forEach(c => this.adjList.set(c.id, new Map()));
        ROAD_EDGES.forEach(e => {
            this.adjList.get(e.from)?.set(e.to, e.distance);
            this.adjList.get(e.to)?.set(e.from, e.distance);
        });

        this.cityIds = CITIES.map(c => c.id);

        // Feromon matrisini başlat: tüm geçerli kenarlarda eşit başlangıç değeri
        this.pheromone = new Map();
        this.cityIds.forEach(a => {
            this.pheromone.set(a, new Map());
            this.cityIds.forEach(b => {
                if (this.adjList.get(a)?.has(b)) {
                    this.pheromone.get(a)!.set(b, params.initialPheromone);
                }
            });
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

    // BFS ile garantili yol — karınca çıkmazda kalırsa kullanılır
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
        return [start, end];
    }

    /**
     * Tek bir karıncanın turunu oluştur.
     *
     * Karınca başlangıç şehrinden başlar ve bitiş şehrine ulaşana kadar
     * olasılıksal geçiş kuralını kullanarak hareket eder:
     *
     *   P(i→j) = [τ(i,j)]^α · [η(i,j)]^β  /  Σ [τ(i,k)]^α · [η(i,k)]^β
     *
     * burada:
     *   τ(i,j) = feromon miktarı (kenar i→j üzerinde)
     *   η(i,j) = sezgisel bilgi = 1 / mesafe(i,j)   (kısa yolu tercih et)
     *   α      = feromon etkisi katsayısı
     *   β      = sezgisel bilgi katsayısı
     */
    private buildAntPath(): string[] {
        const { alpha, beta } = this.params;
        const path: string[] = [this.startCity];
        const visited = new Set<string>([this.startCity]);

        const maxSteps = this.cityIds.length * 4; // Sonsuz döngüye karşı güvenlik

        for (let step = 0; step < maxSteps; step++) {
            const current = path[path.length - 1];

            if (current === this.endCity) break;

            const neighbors = this.adjList.get(current);
            if (!neighbors || neighbors.size === 0) break;

            // Olasılık hesabı için aday komşuları listele
            // Zaten ziyaret edilmiş şehirleri atla (döngü önleme)
            // ancak bitiş şehri her zaman aday olabilir
            const candidates: { city: string; weight: number }[] = [];

            for (const [next, dist] of neighbors) {
                if (visited.has(next) && next !== this.endCity) continue;

                const tau = this.pheromone.get(current)?.get(next) ?? this.params.initialPheromone;
                const eta = 1 / dist; // Sezgisel: kısa mesafe = yüksek cazibe

                const weight = Math.pow(tau, alpha) * Math.pow(eta, beta);
                candidates.push({ city: next, weight });
            }

            if (candidates.length === 0) {
                // Karınca çıkmaza girdi: BFS ile doğrudan bitişe git
                const rescue = this.bfsPath(current, this.endCity);
                path.push(...rescue.slice(1));
                break;
            }

            // Roulette wheel (rulet tekerleği) seçimi
            const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
            let rand = Math.random() * totalWeight;
            let chosen = candidates[candidates.length - 1].city;
            for (const cand of candidates) {
                rand -= cand.weight;
                if (rand <= 0) { chosen = cand.city; break; }
            }

            path.push(chosen);
            if (chosen !== this.endCity) visited.add(chosen);
        }

        // Bitiş şehrine ulaşamadıysa BFS ile tamamla
        if (path[path.length - 1] !== this.endCity) {
            const rescue = this.bfsPath(path[path.length - 1], this.endCity);
            path.push(...rescue.slice(1));
        }

        return this.removeCycles(path);
    }

    /**
     * Feromon Güncelleme — İki aşamalı:
     *
     * 1) Buharlaşma: τ(i,j) ← (1 - ρ) · τ(i,j)
     *    Her kenar biraz feromon kaybeder. Bu, eski rotaların etkisini azaltır
     *    ve yeni keşiflere olanak tanır.
     *
     * 2) Bırakma: τ(i,j) ← τ(i,j) + ΔΦ
     *    Bu iterasyondaki her karınca kendi turundaki kenarlara feromon bırakır:
     *    ΔΦ = Q / tur_mesafesi
     *    Kısa tur yapan karıncalar daha fazla feromon bırakır → daha güçlü sinyal.
     *
     * Elitist strateji: En iyi küresel karınca ekstra feromon bırakır.
     */
    private updatePheromones(
        antPaths: { path: string[]; dist: number }[],
        globalBest: { path: string[]; dist: number }
    ): void {
        const { evaporationRate, Q } = this.params;

        // 1. Buharlaşma
        for (const [a, neighbors] of this.pheromone) {
            for (const [b] of neighbors) {
                const current = this.pheromone.get(a)!.get(b)!;
                this.pheromone.get(a)!.set(b, (1 - evaporationRate) * current);
            }
        }

        // 2. Karıncaların feromon bırakması
        for (const ant of antPaths) {
            if (ant.dist === Infinity) continue;
            const delta = Q / ant.dist;
            for (let i = 0; i < ant.path.length - 1; i++) {
                const a = ant.path[i];
                const b = ant.path[i + 1];
                // Her iki yön için güncelle (yön bağımsız graf)
                const ab = this.pheromone.get(a)?.get(b);
                if (ab !== undefined) this.pheromone.get(a)!.set(b, ab + delta);
                const ba = this.pheromone.get(b)?.get(a);
                if (ba !== undefined) this.pheromone.get(b)!.set(a, ba + delta);
            }
        }

        // 3. Elitist bonus: küresel en iyi rota ekstra feromon alır
        if (globalBest.dist < Infinity) {
            const eliteDelta = Q / globalBest.dist;
            for (let i = 0; i < globalBest.path.length - 1; i++) {
                const a = globalBest.path[i];
                const b = globalBest.path[i + 1];
                const ab = this.pheromone.get(a)?.get(b);
                if (ab !== undefined) this.pheromone.get(a)!.set(b, ab + eliteDelta);
                const ba = this.pheromone.get(b)?.get(a);
                if (ba !== undefined) this.pheromone.get(b)!.set(a, ba + eliteDelta);
            }
        }
    }

    public run(onFrame: (frame: any) => void): ACOResult {
        const { antCount, maxIterations, maxNoImprove } = this.params;

        // Başlangıç en iyisi olarak BFS rotasını al
        const initialPath = this.bfsPath(this.startCity, this.endCity);
        let globalBest = { path: initialPath, dist: this.calcTotalDistance(initialPath) };

        let noImproveCount = 0;

        for (let iter = 0; iter < maxIterations; iter++) {
            // Tüm karıncalar tur oluşturur
            const antPaths: { path: string[]; dist: number }[] = [];
            for (let k = 0; k < antCount; k++) {
                const path = this.buildAntPath();
                const dist = this.calcTotalDistance(path);
                antPaths.push({ path, dist });
            }

            // Bu iterasyonun en iyisini bul
            const iterBest = antPaths.reduce(
                (best, ant) => ant.dist < best.dist ? ant : best,
                { path: [], dist: Infinity }
            );

            let improved = false;
            if (iterBest.dist < globalBest.dist) {
                globalBest = { path: [...iterBest.path], dist: iterBest.dist };
                improved = true;
            }

            // Feromon güncelle
            this.updatePheromones(antPaths, globalBest);

            // noImprove sayacı
            if (improved) {
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }

            // Görselleştirme için kare yay: trialPath = bu iter'in en iyi karıncası
            const trialPath = iterBest.path.length > 1 ? iterBest.path : globalBest.path;
            onFrame({
                generation: iter,
                bestDistance: globalBest.dist,
                trialPath,
                bestPath: globalBest.path,
            });

            if (noImproveCount >= maxNoImprove) break;
        }

        // Son kare
        onFrame({
            generation: maxIterations,
            bestDistance: globalBest.dist,
            trialPath: globalBest.path,
            bestPath: globalBest.path,
        });

        return globalBest;
    }
}
