import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface TabuParams {
    tabuSize: number;
    maxIterations: number;
    neighborhoodSize: number;
    maxNoImprove: number;
}

export interface Individual {
    path: string[];
    dist: number;
}

export class TabuSearch {
    private adjList: Map<string, Map<string, number>>;
    private params: TabuParams;
    private startCity: string;
    private endCity: string;

    constructor(startCity: string, endCity: string, params: TabuParams) {
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

    private findValidPath(start: string, end: string): string[] {
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
    
    private generateRandomPath(start: string, end: string): string[] | null {
        const path = [start];
        let curr = start;
        for (let steps = 0; steps < 2000; steps++) {
            if (curr === end) return this.removeCycles(path);
            const edges = this.adjList.get(curr);
            if (!edges || edges.size === 0) return null;
            const choices = Array.from(edges.keys()).filter(e => e !== path[path.length - 2]);
            const next = (choices.length > 0 ? choices : Array.from(edges.keys()))[
                Math.floor(Math.random() * (choices.length || edges.size))
            ];
            path.push(next);
            curr = next;
        }
        return null; // Force fallback to findValidPath if random walk fails
    }

    private bfsBypass(path: string[], bypassIndex: number): string[] | null {
        const startNode = path[bypassIndex - 1];
        const endNode = path[bypassIndex + 1];
        const avoidNode = path[bypassIndex];

        const queue: string[][] = [[startNode]];
        const visited = new Set<string>([startNode, avoidNode]);

        let attempts = 0;
        while (queue.length > 0 && attempts < 200) {
            attempts++;
            const p = queue.shift()!;
            const curr = p[p.length - 1];
            if (curr === endNode) {
                const newPath = [...path.slice(0, bypassIndex), ...p.slice(1)];
                return this.removeCycles(newPath.concat(path.slice(bypassIndex + 2)));
            }

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
        return null;
    }

    private getNeighbors(path: string[], count: number): Array<{ path: string[]; move: string }> {
        const neighbors: Array<{ path: string[]; move: string }> = [];

        // 1. Deletions (shortcut)
        for (let i = 1; i < path.length - 1; i++) {
            if (this.getDist(path[i - 1], path[i + 1]) !== Infinity) {
                const newP = [...path];
                const removed = newP.splice(i, 1)[0];
                neighbors.push({ path: this.removeCycles(newP), move: removed });
            }
        }

        // 2. Swaps (detour 1)
        for (let i = 1; i < path.length - 1; i++) {
            const pLocs = Array.from(this.adjList.get(path[i - 1])?.keys() ?? []);
            const nLocs = Array.from(this.adjList.get(path[i + 1])?.keys() ?? []);
            const common = pLocs.filter(c => nLocs.includes(c) && c !== path[i]);
            for (const c of common) {
                const newP = [...path];
                const removed = newP[i];
                newP[i] = c;
                neighbors.push({ path: this.removeCycles(newP), move: removed });
            }
        }

        // 3. Inserts (detour 2)
        for (let i = 0; i < path.length - 1; i++) {
            const pLocs = Array.from(this.adjList.get(path[i])?.keys() ?? []);
            const nLocs = Array.from(this.adjList.get(path[i + 1])?.keys() ?? []);
            const common = pLocs.filter(c => nLocs.includes(c));
            for (const c of common) {
                const newP = [...path];
                newP.splice(i + 1, 0, c);
                // Inserting doesn't 'remove' anything, but changing local path topology means we treat 'c' as the tabu trace
                neighbors.push({ path: this.removeCycles(newP), move: c });
            }
        }

        // 4. BFS Bypass (detour 3) for wider exploration
        for (let i = 1; i < path.length - 1; i++) {
            const bypassP = this.bfsBypass(path, i);
            if (bypassP) {
                neighbors.push({ path: bypassP, move: path[i] }); // path[i] is the node that was actively avoided/removed
            }
        }

        // If no neighbors found (edge case on simple highly rigid graphs), fallback to a single reroute
        if (neighbors.length === 0) {
            const startIdx = Math.floor(Math.random() * (path.length - 1));
            const p = this.generateRandomPath(path[startIdx], this.endCity);
            if (p) {
                const newP = path.slice(0, startIdx).concat(p);
                neighbors.push({ path: this.removeCycles(newP), move: path[startIdx] });
            }
        }

        // Randomize candidate ordering before deduplication
        neighbors.sort(() => Math.random() - 0.5);

        // Deduplicate paths to ensure a diverse neighborhood sample
        const uniqueNeighbors: Array<{ path: string[]; move: string }> = [];
        const seenPaths = new Set<string>();
        for (const n of neighbors) {
            const str = n.path.join(',');
            if (!seenPaths.has(str)) {
                seenPaths.add(str);
                uniqueNeighbors.push(n);
                if (uniqueNeighbors.length >= count) break;
            }
        }

        return uniqueNeighbors;
    }

    public run(onFrame: (frame: any) => void): Individual {
        let currentPath: string[] | null = null;
        for (let i = 0; i < 100 && !currentPath; i++) {
            currentPath = this.generateRandomPath(this.startCity, this.endCity);
        }
        if (!currentPath) currentPath = this.findValidPath(this.startCity, this.endCity);

        let currentDist = this.calcTotalDistance(currentPath);
        let bestPath = [...currentPath];
        let bestDist = currentDist;

        // Tabu tracking: store nodes that were actively mutated/removed
        const tabuList: string[] = [];
        const isTabu = (node: string) => tabuList.includes(node);
        const addTabu = (node: string) => {
            tabuList.push(node);
            if (tabuList.length > this.params.tabuSize) {
                tabuList.shift(); // Remove oldest tabu move (FIFO memory queue)
            }
        };

        let noImproveCount = 0;

        for (let iter = 0; iter < this.params.maxIterations; iter++) {
            const candidates = this.getNeighbors(currentPath, this.params.neighborhoodSize);

            let bestCandidate: string[] | null = null;
            let bestCandidateDist = Infinity;
            let bestCandidateMove = '';

            for (const { path: candidatePath, move } of candidates) {
                const d = this.calcTotalDistance(candidatePath);
                if (d === Infinity) continue;

                // Textbook Tabu Logic + Aspiration Criteria
                const tabu = isTabu(move);
                
                // Allow move if NOT tabu, OR if it overrides best known global distance globally (aspiration check)
                if (!tabu || d < bestDist) {
                    if (d < bestCandidateDist) {
                        bestCandidate = candidatePath;
                        bestCandidateDist = d;
                        bestCandidateMove = move;
                    }
                }
            }

            // Step onto chosen best candidate (even if it's worse than our current distance)
            if (bestCandidate) {
                currentPath = bestCandidate;
                currentDist = bestCandidateDist;
                
                // Track this move in short term memory preventing immediate reversals
                addTabu(bestCandidateMove);

                // Update global best
                if (currentDist < bestDist) {
                    bestPath = [...currentPath];
                    bestDist = currentDist;
                    noImproveCount = 0;
                } else {
                    noImproveCount++;
                }
            } else {
                noImproveCount++;
            }

            onFrame({
                generation: iter,
                bestDistance: bestDist,
                trialPath: currentPath,
                bestPath: bestPath,
            });

            if (noImproveCount >= this.params.maxNoImprove) {
                break; // Stop early because we plateau'd (satisfies UX maxNoImprove arg limit)
            }
        }

        // Emit final cleanup frame 
        onFrame({
            generation: this.params.maxIterations,
            bestDistance: bestDist,
            trialPath: bestPath,
            bestPath: bestPath,
        });

        return { path: bestPath, dist: bestDist };
    }
}
