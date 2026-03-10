import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface SAParams {
    initialTemperature: number;
    minTemperature: number;
    coolingRate: number;
    maxIterations: number;
    iterationsPerTemp: number;
    coolingSchedule: 'linear' | 'geometric' | 'boltzmann' | 'cauchy';
}

export interface Individual {
    path: string[];
    dist: number;
}

export class SimulatedAnnealing {
    adjList: Map<string, Map<string, number>>;
    params: SAParams;
    startCity: string;
    endCity: string;

    constructor(startCity: string, endCity: string, params: SAParams) {
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
        return this.adjList.get(a)?.get(b) || Infinity;
    }

    private calcTotalDistance(path: string[]): number {
        let sum = 0;
        for (let i = 0; i < path.length - 1; i++) {
            let d = this.getDist(path[i], path[i + 1]);
            if (d === Infinity) return Infinity;
            sum += d;
        }
        return sum;
    }

    private removeCycles(path: string[]): string[] {
        let res: string[] = [];
        let seen = new Map<string, number>();
        for (let city of path) {
            if (seen.has(city)) {
                let idx = seen.get(city)!;
                res = res.slice(0, idx + 1);
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
        let queue: string[][] = [[start]];
        let visited = new Set<string>();
        visited.add(start);

        while (queue.length > 0) {
            let p = queue.shift()!;
            let curr = p[p.length - 1];
            if (curr === end) return p;

            let edgesMap = this.adjList.get(curr);
            if (edgesMap) {
                for (let next of Array.from(edgesMap.keys())) {
                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push([...p, next]);
                    }
                }
            }
        }
        return [start, end]; // Worst case fallback fallback
    }

    private generateRandomPath(start: string = this.startCity, end: string = this.endCity): string[] | null {
        let path = [start];
        let curr = start;
        let steps = 0;

        while (curr !== end && steps < 2000) {
            let edgesMap = this.adjList.get(curr);
            if (!edgesMap) return null;
            let edges = Array.from(edgesMap.keys());
            if (edges.length === 0) return null;

            let prev = path.length > 1 ? path[path.length - 2] : null;
            let choices = edges.filter(e => e !== prev);
            if (choices.length === 0) choices = edges;

            let next = choices[Math.floor(Math.random() * choices.length)];
            path.push(next);
            curr = next;
            steps++;
        }
        if (curr === end) return this.removeCycles(path);
        return null;
    }

    private getNeighbor(path: string[]): string[] {
        if (path.length < 2) return path;

        // 4 types of mutations: Insert, Delete, Swap, Reroute
        let r = Math.random();
        let newP = [...path];

        if (r < 0.25 && path.length > 2) {
            // Delete Mode: Try to remove a node if its neighbors connect directly
            let validDeletions = [];
            for (let i = 1; i < path.length - 1; i++) {
                if (this.getDist(path[i - 1], path[i + 1]) !== Infinity) {
                    validDeletions.push(i);
                }
            }
            if (validDeletions.length > 0) {
                let idx = validDeletions[Math.floor(Math.random() * validDeletions.length)];
                newP.splice(idx, 1);
                return this.removeCycles(newP);
            }
            r = 0.4; // Fallback to swap
        }

        if (r < 0.5 && path.length > 2) {
            // Swap Mode: Try to swap a node with another valid common neighbor
            let validSwaps = [];
            for (let i = 1; i < path.length - 1; i++) {
                let pLocs = Array.from(this.adjList.get(path[i - 1])?.keys() || []);
                let nLocs = Array.from(this.adjList.get(path[i + 1])?.keys() || []);
                let common = pLocs.filter(c => nLocs.includes(c) && c !== path[i]);
                if (common.length > 0) {
                    validSwaps.push({ idx: i, options: common });
                }
            }
            if (validSwaps.length > 0) {
                let swap = validSwaps[Math.floor(Math.random() * validSwaps.length)];
                newP[swap.idx] = swap.options[Math.floor(Math.random() * swap.options.length)];
                return this.removeCycles(newP);
            }
            r = 0.7; // Fallback to insert
        }

        if (r < 0.75) {
            // Insert Mode: Try to insert a node between two connected nodes that share another neighbor
            let validInserts = [];
            for (let i = 0; i < path.length - 1; i++) {
                let pLocs = Array.from(this.adjList.get(path[i])?.keys() || []);
                let nLocs = Array.from(this.adjList.get(path[i + 1])?.keys() || []);
                let common = pLocs.filter(c => nLocs.includes(c));
                if (common.length > 0) {
                    validInserts.push({ idx: i, options: common });
                }
            }
            if (validInserts.length > 0) {
                let ins = validInserts[Math.floor(Math.random() * validInserts.length)];
                let p = ins.options[Math.floor(Math.random() * ins.options.length)];
                newP.splice(ins.idx + 1, 0, p);
                return this.removeCycles(newP);
            }
        }

        // Reroute Mode: Replace a segment of the path with a new random path to end
        let startIdx = Math.floor(Math.random() * (path.length - 1));
        let p = this.generateRandomPath(path[startIdx], this.endCity);
        if (p) {
            newP = newP.slice(0, startIdx).concat(p);
            return this.removeCycles(newP);
        }

        return path;
    }

    public run(onFrame: (frameInfo: any) => void): Individual {
        let currentPath: string[] | null = null;
        let attempts = 0;
        while (!currentPath && attempts < 100) {
            currentPath = this.generateRandomPath(this.startCity, this.endCity);
            attempts++;
        }
        if (!currentPath) currentPath = this.findValidPath(this.startCity, this.endCity);

        let currentDist = this.calcTotalDistance(currentPath);

        let bestPath = [...currentPath];
        let bestDist = currentDist;

        let temperature = this.params.initialTemperature;
        let step = 0;

        while (temperature > this.params.minTemperature && step < this.params.maxIterations) {
            for (let i = 0; i < this.params.iterationsPerTemp; i++) {
                let neighborPath = this.getNeighbor(currentPath);
                let neighborDist = this.calcTotalDistance(neighborPath);

                if (neighborDist < currentDist) {
                    currentPath = neighborPath;
                    currentDist = neighborDist;
                    if (neighborDist < bestDist) {
                        bestPath = [...neighborPath];
                        bestDist = neighborDist;
                    }
                } else {
                    let p = Math.exp((currentDist - neighborDist) / temperature);
                    if (Math.random() < p) {
                        currentPath = neighborPath;
                        currentDist = neighborDist;
                    }
                }
            }

            onFrame({
                generation: step, // Keep this as 'generation' property purely for backwards compatibility, but it will mean 'Iterations/Steps' in SA mode
                temperature, // Yielding current temperature
                bestDistance: bestDist,
                trialPath: currentPath,
                bestPath: bestPath
            });

            step++;
            if (this.params.coolingSchedule === 'linear') {
                temperature = this.params.initialTemperature - this.params.coolingRate * step;
            } else if (this.params.coolingSchedule === 'boltzmann') {
                temperature = this.params.initialTemperature / Math.log(Math.E + step);
            } else if (this.params.coolingSchedule === 'cauchy') {
                temperature = this.params.initialTemperature / (1 + this.params.coolingRate * step);
            } else { // geometric
                temperature = this.params.initialTemperature * Math.pow(this.params.coolingRate, step);
            }
        }

        onFrame({
            generation: step,
            temperature,
            bestDistance: bestDist,
            trialPath: bestPath,
            bestPath: bestPath
        });

        return { path: bestPath, dist: bestDist };
    }
}
