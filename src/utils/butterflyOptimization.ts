import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface BOAParams {
    butterflyCount: number;
    maxIterations: number;
    c: number;          // Sensory modality (Koku algı katsayısı)
    a: number;          // Power exponent (Kuvvet üssü)
    p: number;          // Switch probability (Geçiş olasılığı)
    maxNoImprove: number;
}

export interface BOAResult {
    path: string[];
    dist: number;
}

interface Butterfly {
    path: string[];
    dist: number;
    fitness: number;
    fragrance: number;
}

export class ButterflyOptimization {
    private adjList: Map<string, Map<string, number>>;
    private params: BOAParams;
    private startCity: string;
    private endCity: string;

    constructor(startCity: string, endCity: string, params: BOAParams) {
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

    private produceNeighbor(path: string[]): string[] {
        const newPath = [...path];
        if (newPath.length <= 3) return newPath;

        const i = 1 + Math.floor(Math.random() * (newPath.length - 2));
        const j = 1 + Math.floor(Math.random() * (newPath.length - 2));

        if (Math.random() < 0.5) {
            [newPath[i], newPath[j]] = [newPath[j], newPath[i]];
        } else {
            const start = Math.min(i, j);
            const end = Math.max(i, j);
            const sub = newPath.slice(start, end + 1).reverse();
            newPath.splice(start, sub.length, ...sub);
        }

        return this.repairPath(newPath);
    }

    private moveTowards(current: string[], target: string[]): string[] {
        const newPath = [...current];
        if (newPath.length <= 3 || target.length <= 3) return this.produceNeighbor(current);

        const startT = 1 + Math.floor(Math.random() * (target.length - 2));
        const len = 1 + Math.floor(Math.random() * Math.min(3, target.length - startT));
        const segment = target.slice(startT, startT + len);

        const insertPos = 1 + Math.floor(Math.random() * (newPath.length - 2));
        newPath.splice(insertPos, 0, ...segment);

        return this.repairPath(newPath);
    }

    public run(onFrame: (frame: any) => void): BOAResult {
        let { c, a, p, butterflyCount, maxIterations, maxNoImprove } = this.params;

        let butterflies: Butterfly[] = Array.from({ length: butterflyCount }, () => {
            const path = this.generateRandomPath();
            const dist = this.calcTotalDistance(path);
            return {
                path,
                dist,
                fitness: 1 / (dist + 1),
                fragrance: 0
            };
        });

        let gBest = [...butterflies[0].path];
        let gBestDist = butterflies[0].dist;

        butterflies.forEach(b => {
            if (b.dist < gBestDist) {
                gBestDist = b.dist;
                gBest = [...b.path];
            }
        });

        let noImproveCount = 0;

        for (let iter = 0; iter < maxIterations; iter++) {
            let improvedThisIter = false;

            // Koku hesaplama (Fragrance = c * I^a)
            butterflies.forEach(b => {
                b.fitness = 1 / (b.dist + 1); // Yoğunluk (Intensity)
                b.fragrance = c * Math.pow(b.fitness, a);
            });

            // Kelebek hareketleri
            for (let i = 0; i < butterflyCount; i++) {
                let r = Math.random();
                let newPath: string[];

                if (r < p) {
                    // Global Arama: En iyi kelebeğe doğru hareket et
                    newPath = this.moveTowards(butterflies[i].path, gBest);
                } else {
                    // Yerel Arama: Rastgele iki kelebek ile komşuluk üret veya yerel arama yap
                    const j = Math.floor(Math.random() * butterflyCount);
                    
                    if (Math.random() < 0.5) {
                        newPath = this.moveTowards(butterflies[i].path, butterflies[j].path);
                    } else {
                        newPath = this.produceNeighbor(butterflies[i].path);
                    }
                }

                const newDist = this.calcTotalDistance(newPath);

                // Kelebek yeni konumu değerlendirir
                if (newDist < butterflies[i].dist) {
                    butterflies[i].path = newPath;
                    butterflies[i].dist = newDist;

                    if (newDist < gBestDist) {
                        gBestDist = newDist;
                        gBest = [...newPath];
                        improvedThisIter = true;
                    }
                } else {
                    // %10 ihtimalle daha kötü bir çözümü kabul et (Keşif için, koku etkisi)
                    if (Math.random() < 0.1) {
                        butterflies[i].path = newPath;
                        butterflies[i].dist = newDist;
                    }
                }
            }

            // Sensör modülünü güncelle (Koku algısı iterasyon ilerledikçe artar)
            c = c + (0.025 / (c * maxIterations));

            if (improvedThisIter) {
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }

            const trialBf = butterflies[Math.floor(Math.random() * butterflies.length)];
            onFrame({
                generation: iter,
                bestDistance: gBestDist,
                trialPath: trialBf.path,
                bestPath: gBest,
            });

            if (noImproveCount >= maxNoImprove) break;
        }

        onFrame({
            generation: maxIterations,
            bestDistance: gBestDist,
            trialPath: gBest,
            bestPath: gBest,
        });

        return { path: gBest, dist: gBestDist };
    }
}
