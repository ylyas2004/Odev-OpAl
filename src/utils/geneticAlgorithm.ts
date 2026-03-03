import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface GAParams {
    populationSize: number;
    maxGenerations: number;
    crossoverRate: number;
    mutationRate: number;
    elitismCount: number;
    tournamentSize: number;
    earlyStopGenerations: number;
}

export interface Individual {
    path: string[];
    dist: number;
    fitness: number;
}

export class RouteGeneticAlgorithm {
    adjList: Map<string, Map<string, number>>;
    params: GAParams;
    startCity: string;
    endCity: string;

    constructor(startCity: string, endCity: string, params: GAParams) {
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

    private generateRandomPath(): string[] | null {
        let path = [this.startCity];
        let curr = this.startCity;
        let steps = 0;

        while (curr !== this.endCity && steps < 150) {
            let edgesMap = this.adjList.get(curr);
            if (!edgesMap) return null;
            let edges = Array.from(edgesMap.keys());
            if (edges.length === 0) return null;

            let prev = path.length > 1 ? path[path.length - 2] : null;
            let choices = edges.filter(e => e !== prev);
            if (choices.length === 0) choices = edges; // backwards fallback

            let next = choices[Math.floor(Math.random() * choices.length)];
            path.push(next);
            curr = next;
            steps++;
        }
        if (curr === this.endCity) return this.removeCycles(path);
        return null;
    }

    private initializePopulation(): Individual[] {
        let pop: Individual[] = [];
        for (let i = 0; i < this.params.populationSize; i++) {
            let p: string[] | null = null;
            let attempts = 0;
            while (!p && attempts < 100) {
                p = this.generateRandomPath();
                attempts++;
            }
            if (!p) p = [this.startCity, this.endCity]; // invalid fallback

            pop.push({
                path: p,
                dist: this.calcTotalDistance(p),
                fitness: 0
            });
        }
        return pop;
    }

    private evaluatePopulation(population: Individual[]): void {
        population.forEach(ind => {
            ind.fitness = ind.dist === Infinity ? 0 : 1 / ind.dist;
        });
    }

    private getBestSolution(population: Individual[]): Individual {
        return population.reduce((a, b) => a.fitness > b.fitness ? a : b);
    }

    private selectParents(population: Individual[]): Individual[] {
        let parents: Individual[] = [];
        for (let i = 0; i < this.params.populationSize; i++) {
            let best = population[Math.floor(Math.random() * population.length)];
            for (let k = 1; k < this.params.tournamentSize; k++) {
                let cand = population[Math.floor(Math.random() * population.length)];
                if (cand.fitness > best.fitness) best = cand;
            }
            parents.push(best);
        }
        return parents;
    }

    private crossover(p1: string[], p2: string[]): [string[], string[]] {
        let common = p1.slice(1, -1).filter(c => p2.includes(c));
        if (common.length === 0) return [p1, p2];

        let pivot = common[Math.floor(Math.random() * common.length)];
        let i1 = p1.indexOf(pivot);
        let i2 = p2.indexOf(pivot);

        let c1 = this.removeCycles([...p1.slice(0, i1), ...p2.slice(i2)]);
        let c2 = this.removeCycles([...p2.slice(0, i2), ...p1.slice(i1)]);
        return [c1, c2];
    }

    private mutate(path: string[]): string[] {
        if (Math.random() > this.params.mutationRate || path.length <= 2) return path;

        let idx = 1 + Math.floor(Math.random() * (path.length - 2));
        let prev = path[idx - 1];
        let next = path[idx + 1];

        // Shortcut removal
        if (this.getDist(prev, next) !== Infinity) {
            let newP = [...path];
            newP.splice(idx, 1);
            return newP;
        }

        // Insertion of common neighbor
        let prevLocs = Array.from(this.adjList.get(prev)?.keys() || []);
        let nextLocs = Array.from(this.adjList.get(next)?.keys() || []);
        let common = prevLocs.filter(c => nextLocs.includes(c));

        if (common.length > 0) {
            let p = common[Math.floor(Math.random() * common.length)];
            let newP = [...path];
            newP[idx] = p;
            return this.removeCycles(newP);
        }
        return path;
    }

    private replace(population: Individual[], children: Individual[]): Individual[] {
        population.sort((a, b) => b.fitness - a.fitness);
        let nextPop: Individual[] = [];

        for (let i = 0; i < Math.min(this.params.elitismCount, population.length); i++) {
            nextPop.push(population[i]);
        }

        let childIdx = 0;
        while (nextPop.length < population.length && childIdx < children.length) {
            nextPop.push(children[childIdx]);
            childIdx++;
        }
        return nextPop;
    }

    // Main execution loop: Maps closely to the Pseudocode logic but optimized
    public run(onFrame: (frameInfo: any) => void): Individual {
        let population = this.initializePopulation();
        this.evaluatePopulation(population);

        let bestSolution = this.getBestSolution(population);
        let noImprovementCount = 0;
        let gen = 0;

        while (gen < this.params.maxGenerations && noImprovementCount <= this.params.earlyStopGenerations) {
            let currentBest = this.getBestSolution(population);

            if (currentBest.fitness > bestSolution.fitness) {
                bestSolution = currentBest;
                noImprovementCount = 0;
            } else {
                noImprovementCount++;
            }

            // Yield frame for visualization
            onFrame({
                generation: gen,
                bestDistance: bestSolution.dist,
                trialPath: population[Math.floor(Math.random() * population.length)].path,
                bestPath: bestSolution.path
            });

            let parents = this.selectParents(population);
            let children: Individual[] = [];

            for (let i = 0; i < parents.length; i += 2) {
                let parent1 = parents[i];
                let parent2 = parents[i + 1] || parents[0];

                let p1Path = parent1.path;
                let p2Path = parent2.path;

                if (Math.random() < this.params.crossoverRate) {
                    [p1Path, p2Path] = this.crossover(p1Path, p2Path);
                }

                p1Path = this.mutate(p1Path);
                p2Path = this.mutate(p2Path);

                children.push({ path: p1Path, dist: this.calcTotalDistance(p1Path), fitness: 0 });
                if (children.length < this.params.populationSize) {
                    children.push({ path: p2Path, dist: this.calcTotalDistance(p2Path), fitness: 0 });
                }
            }

            this.evaluatePopulation(children);
            population = this.replace(population, children);

            gen++;
        }

        // Final frame yield
        onFrame({
            generation: gen,
            bestDistance: bestSolution.dist,
            trialPath: bestSolution.path,
            bestPath: bestSolution.path
        });

        return bestSolution;
    }
}
