import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface FAParams {
    fireflyCount: number;     // Ateşböceği sayısı
    maxIterations: number;    // Maksimum iterasyon
    alpha: number;            // Rastgelelik (Randomization)
    beta0: number;            // Temel Çekicilik (Base Attractiveness)
    gamma: number;            // Işık Emilimi (Light Absorption)
    maxNoImprove: number;     // İyileşme olmadan geçecek iterasyon limiti
}

export interface FAResult {
    path: string[];
    dist: number;
}

interface Firefly {
    path: string[];
    dist: number;
    brightness: number;
}

export class FireflyAlgorithm {
    private adjList: Map<string, Map<string, number>>;
    private params: FAParams;
    private startCity: string;
    private endCity: string;

    constructor(startCity: string, endCity: string, params: FAParams) {
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

    private moveTowards(current: string[], target: string[], beta: number): string[] {
        const newPath = [...current];
        if (newPath.length <= 3 || target.length <= 3) return this.produceNeighbor(current);

        // beta'ya göre hedeften alınacak parça uzunluğunu ayarla
        const maxLen = Math.min(Math.max(1, Math.floor(target.length * beta * 0.5)), target.length - 2);
        if (maxLen < 1) return newPath;

        const startT = 1 + Math.floor(Math.random() * (target.length - 1 - maxLen));
        const segment = target.slice(startT, startT + maxLen);

        const insertPos = 1 + Math.floor(Math.random() * (newPath.length - 2));
        newPath.splice(insertPos, 0, ...segment);

        return this.repairPath(newPath);
    }

    public run(onFrame: (frame: any) => void): FAResult {
        let { fireflyCount, maxIterations, alpha, beta0, gamma, maxNoImprove } = this.params;

        let fireflies: Firefly[] = Array.from({ length: fireflyCount }, () => {
            const path = this.generateRandomPath();
            const dist = this.calcTotalDistance(path);
            return { path, dist, brightness: 1 / (dist + 1) };
        });

        let gBest = [...fireflies[0].path];
        let gBestDist = fireflies[0].dist;

        fireflies.forEach(f => {
            if (f.dist < gBestDist) {
                gBestDist = f.dist;
                gBest = [...f.path];
            }
        });

        let noImproveCount = 0;

        for (let iter = 0; iter < maxIterations; iter++) {
            let improvedThisIter = false;

            // Parlaklıkları güncelle
            fireflies.forEach(f => f.brightness = 1 / (f.dist + 1));

            // Ateşböceklerinin hareketleri (O(N^2) döngüsü)
            for (let i = 0; i < fireflyCount; i++) {
                let moved = false;
                
                for (let j = 0; j < fireflyCount; j++) {
                    if (fireflies[j].brightness > fireflies[i].brightness) {
                        // Mesafe (r) hesabı: Pratiklik adına uzaklık farkını normalize ediyoruz
                        const r = Math.abs(fireflies[i].dist - fireflies[j].dist) / 1000;
                        const beta = beta0 * Math.exp(-gamma * r * r);

                        let newPath = this.moveTowards(fireflies[i].path, fireflies[j].path, beta);

                        // Rastgele hareket (Alpha)
                        if (Math.random() < alpha) {
                            newPath = this.produceNeighbor(newPath);
                        }

                        const newDist = this.calcTotalDistance(newPath);

                        if (newDist < fireflies[i].dist) {
                            fireflies[i].path = newPath;
                            fireflies[i].dist = newDist;
                            moved = true;

                            if (newDist < gBestDist) {
                                gBestDist = newDist;
                                gBest = [...newPath];
                                improvedThisIter = true;
                            }
                        }
                    }
                }

                // En parlak ateşböceği ise veya hiç hareket etmediyse rastgele yerel arama yap
                if (!moved) {
                    let newPath = this.produceNeighbor(fireflies[i].path);
                    const newDist = this.calcTotalDistance(newPath);
                    if (newDist < fireflies[i].dist) {
                        fireflies[i].path = newPath;
                        fireflies[i].dist = newDist;
                        
                        if (newDist < gBestDist) {
                            gBestDist = newDist;
                            gBest = [...newPath];
                            improvedThisIter = true;
                        }
                    }
                }
            }

            // Soğutma: Alpha (rastgelelik) zamanla azalır
            alpha = alpha * 0.97;

            if (improvedThisIter) {
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }

            const trialFf = fireflies[Math.floor(Math.random() * fireflies.length)];
            onFrame({
                generation: iter,
                bestDistance: gBestDist,
                trialPath: trialFf.path,
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
