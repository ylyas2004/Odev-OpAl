import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface ABCParams {
    beeCount: number;         // Toplam arı sayısı (Employed + Onlooker)
    maxIterations: number;    // Maksimum döngü sayısı
    limit: number;            // Bir kaynağın terkedilmesi için deneme sınırı (Scout Bee eşiği)
    maxNoImprove: number;     // Global iyileşme olmazsa durdurma eşiği
}

export interface ABCResult {
    path: string[];
    dist: number;
}

interface FoodSource {
    path: string[];
    dist: number;
    trials: number;           // İyileşme olmayan deneme sayısı
}

export class ArtificialBeeColony {
    private adjList: Map<string, Map<string, number>>;
    private params: ABCParams;
    private startCity: string;
    private endCity: string;

    constructor(startCity: string, endCity: string, params: ABCParams) {
        this.startCity = startCity;
        this.endCity = endCity;
        this.params = params;

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

    private repairPath(path: string[]): string[] {
        if (path.length < 2) return this.bfsPath(this.startCity, this.endCity);
        const result: string[] = [path[0]];
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            if (this.getDist(from, to) !== Infinity) {
                result.push(to);
            } else {
                const segment = this.bfsPath(from, to);
                result.push(...segment.slice(1));
            }
        }
        return this.removeCycles(result);
    }

    private generateRandomPath(): string[] {
        const path = [this.startCity];
        let curr = this.startCity;
        for (let steps = 0; steps < 2000; steps++) {
            if (curr === this.endCity) return this.removeCycles(path);
            const edges = this.adjList.get(curr);
            if (!edges || edges.size === 0) break;
            const choices = Array.from(edges.keys()).filter(e => e !== path[path.length - 2]);
            const pool = choices.length > 0 ? choices : Array.from(edges.keys());
            const next = pool[Math.floor(Math.random() * pool.length)];
            path.push(next);
            curr = next;
        }
        return this.bfsPath(this.startCity, this.endCity);
    }

    /**
     * Komşu Arama (Neighbor Search)
     * TSP için 2-opt veya rastgele takas kullanılır.
     */
    private produceNeighbor(path: string[]): string[] {
        const newPath = [...path];
        if (newPath.length <= 3) return newPath;

        // Rastgele iki ara indeksi seç (başlangıç ve bitiş hariç)
        const i = 1 + Math.floor(Math.random() * (newPath.length - 2));
        const j = 1 + Math.floor(Math.random() * (newPath.length - 2));

        if (Math.random() < 0.5) {
            // Swap
            [newPath[i], newPath[j]] = [newPath[j], newPath[i]];
        } else {
            // 2-opt flip
            const start = Math.min(i, j);
            const end = Math.max(i, j);
            const sub = newPath.slice(start, end + 1).reverse();
            newPath.splice(start, sub.length, ...sub);
        }

        return this.repairPath(newPath);
    }

    public run(onFrame: (frame: any) => void): ABCResult {
        const { beeCount, maxIterations, limit, maxNoImprove } = this.params;
        const foodSourceCount = Math.floor(beeCount / 2);

        // === ADIM 1: Başlatma ===
        let foodSources: FoodSource[] = Array.from({ length: foodSourceCount }, () => {
            const path = this.generateRandomPath();
            return {
                path,
                dist: this.calcTotalDistance(path),
                trials: 0
            };
        });

        let gBest = [...foodSources[0].path];
        let gBestDist = foodSources[0].dist;
        foodSources.forEach(fs => {
            if (fs.dist < gBestDist) {
                gBestDist = fs.dist;
                gBest = [...fs.path];
            }
        });

        let noImproveCount = 0;

        // === ADIM 2: Ana Döngü ===
        for (let iter = 0; iter < maxIterations; iter++) {
            let improvedThisIter = false;

            // 2.1 İşçi Arılar Fazı (Employed Bees)
            for (let i = 0; i < foodSourceCount; i++) {
                const neighborPath = this.produceNeighbor(foodSources[i].path);
                const neighborDist = this.calcTotalDistance(neighborPath);

                if (neighborDist < foodSources[i].dist) {
                    foodSources[i].path = neighborPath;
                    foodSources[i].dist = neighborDist;
                    foodSources[i].trials = 0;
                } else {
                    foodSources[i].trials++;
                }
            }

            // 2.2 Gözcü Arılar Fazı (Onlooker Bees)
            // Olasılıkları hesapla (Fitness = 1/Dist)
            const fitnessValues = foodSources.map(fs => 1 / (fs.dist + 1));
            const totalFitness = fitnessValues.reduce((a, b) => a + b, 0);
            const probabilities = fitnessValues.map(f => f / totalFitness);

            for (let i = 0; i < foodSourceCount; i++) {
                // Rulet tekerleği ile kaynak seç
                let r = Math.random();
                let selectedIdx = 0;
                let cumulative = 0;
                for (let j = 0; j < foodSourceCount; j++) {
                    cumulative += probabilities[j];
                    if (r <= cumulative) {
                        selectedIdx = j;
                        break;
                    }
                }

                const neighborPath = this.produceNeighbor(foodSources[selectedIdx].path);
                const neighborDist = this.calcTotalDistance(neighborPath);

                if (neighborDist < foodSources[selectedIdx].dist) {
                    foodSources[selectedIdx].path = neighborPath;
                    foodSources[selectedIdx].dist = neighborDist;
                    foodSources[selectedIdx].trials = 0;
                } else {
                    foodSources[selectedIdx].trials++;
                }
            }

            // Global en iyiyi güncelle
            for (let i = 0; i < foodSourceCount; i++) {
                if (foodSources[i].dist < gBestDist) {
                    gBestDist = foodSources[i].dist;
                    gBest = [...foodSources[i].path];
                    improvedThisIter = true;
                }
            }

            // 2.3 Kaşif Arılar Fazı (Scout Bees)
            for (let i = 0; i < foodSourceCount; i++) {
                if (foodSources[i].trials > limit) {
                    const newPath = this.generateRandomPath();
                    foodSources[i] = {
                        path: newPath,
                        dist: this.calcTotalDistance(newPath),
                        trials: 0
                    };
                }
            }

            if (improvedThisIter) {
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }

            // Görselleştirme karesi
            const trialBee = foodSources[Math.floor(Math.random() * foodSources.length)];
            onFrame({
                generation: iter,
                bestDistance: gBestDist,
                trialPath: trialBee.path,
                bestPath: gBest,
            });

            if (noImproveCount >= maxNoImprove) break;
        }

        // Final karesi
        onFrame({
            generation: maxIterations,
            bestDistance: gBestDist,
            trialPath: gBest,
            bestPath: gBest,
        });

        return { path: gBest, dist: gBestDist };
    }
}
