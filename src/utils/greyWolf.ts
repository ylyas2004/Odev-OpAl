import { ROAD_EDGES, CITIES } from '../data/turkeyGraph';

export interface GWParams {
    packSize: number;       // Number of wolves in the pack
    maxIterations: number;  // Maximum number of hunting iterations
    maxNoImprove: number;   // Early stop patience
}

export interface Individual {
    path: string[];
    dist: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Textbook Adaptation Note:
//
// Standard GWO operates in continuous space with three leader wolves:
//   α (best), β (second-best), δ (third-best)
//
// The position update is:
//   X(t+1) = (X1 + X2 + X3) / 3
// where each Xi represents movement toward a leader:
//   D_leader = |C * X_leader - X|
//   Xi = X_leader - A * D_leader
//
// For DISCRETE graph path-finding, "position" = a full valid path.
// "Moving toward" a leader = segment crossover: borrow a sub-path from the
// leader between two shared waypoints.
//
// The control parameter `a` decreases linearly from 2→0:
//   |A| > 1  →  wolf diverges from leaders (exploration)
//   |A| < 1  →  wolf converges on leaders  (exploitation)
// ─────────────────────────────────────────────────────────────────────────────

export class GreyWolfOptimizer {
    private adjList: Map<string, Map<string, number>>;
    private params: GWParams;
    private startCity: string;
    private endCity: string;

    constructor(startCity: string, endCity: string, params: GWParams) {
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

    // ── Helpers ──────────────────────────────────────────────────────────────

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

    /** BFS — guaranteed valid path, used as fallback. */
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

    /** Random-walk path — gives diverse initial population. */
    private generateRandomPath(start: string, end: string): string[] | null {
        const path = [start];
        let curr = start;
        for (let steps = 0; steps < 2000; steps++) {
            if (curr === end) return this.removeCycles(path);
            const edges = this.adjList.get(curr);
            if (!edges || edges.size === 0) return null;
            const prev = path[path.length - 2] ?? null;
            const choices = Array.from(edges.keys()).filter(e => e !== prev);
            const pool = choices.length > 0 ? choices : Array.from(edges.keys());
            const next = pool[Math.floor(Math.random() * pool.length)];
            path.push(next);
            curr = next;
        }
        return null;
    }

    // ── Core GWO operation: "move wolf toward a leader" ───────────────────────
    //
    // In continuous GWO: X_new = X_leader - A * |C * X_leader - X_wolf|
    //
    // Discrete analogue:
    //   1. Find cities that appear in BOTH the wolf's path and the leader's path.
    //   2. Pick two random shared waypoints (c1, c2).
    //   3. Replace the sub-path wolf[c1..c2] with leader[c1..c2].
    //   4. Remove cycles introduced by the splice.
    // ─────────────────────────────────────────────────────────────────────────

    private moveTowardLeader(wolf: string[], leader: string[]): string[] {
        const leaderSet = new Set(leader);

        // Shared waypoints (interior cities only — not start/end which are fixed)
        const shared = wolf.slice(1, -1).filter(c => leaderSet.has(c) && c !== this.startCity && c !== this.endCity);

        if (shared.length < 2) {
            // Fewer than 2 shared waypoints → fall back to a small random reroute
            return this.smallReroute(wolf);
        }

        // Pick two distinct shared waypoints randomly
        const i = Math.floor(Math.random() * shared.length);
        let j = Math.floor(Math.random() * shared.length);
        while (j === i) j = Math.floor(Math.random() * shared.length);

        const c1 = shared[Math.min(i, j)];
        const c2 = shared[Math.max(i, j)];

        const wi1 = wolf.indexOf(c1);
        const wi2 = wolf.indexOf(c2);
        const li1 = leader.indexOf(c1);
        const li2 = leader.indexOf(c2);

        if (wi1 < 0 || wi2 < 0 || li1 < 0 || li2 < 0 || wi1 >= wi2 || li1 >= li2) {
            return this.smallReroute(wolf);
        }

        // Build new path: wolf head + leader segment + wolf tail
        const newPath = [
            ...wolf.slice(0, wi1),       // wolf[start..c1)
            ...leader.slice(li1, li2 + 1), // leader[c1..c2] (the borrowed segment)
            ...wolf.slice(wi2 + 1),       // wolf(c2..end]
        ];

        const cleaned = this.removeCycles(newPath);

        // Guard: must still connect properly
        if (cleaned[0] !== this.startCity || cleaned[cleaned.length - 1] !== this.endCity) {
            return wolf; // revert
        }
        if (this.calcTotalDistance(cleaned) === Infinity) {
            return wolf;
        }
        return cleaned;
    }

    /** Small reroute of a random segment — used for exploration when |A|≥1. */
    private smallReroute(wolf: string[]): string[] {
        if (wolf.length < 3) return wolf;
        const idx = 1 + Math.floor(Math.random() * (wolf.length - 2));
        const rerouted = this.generateRandomPath(wolf[idx - 1], this.endCity);
        if (!rerouted) return wolf;
        const newPath = this.removeCycles([...wolf.slice(0, idx - 1), ...rerouted]);
        if (this.calcTotalDistance(newPath) === Infinity) return wolf;
        return newPath;
    }

    // ── Main optimisation loop ────────────────────────────────────────────────

    public run(onFrame: (frame: any) => void): Individual {
        const { packSize, maxIterations, maxNoImprove } = this.params;

        // ── Initialise pack ──────────────────────────────────────────────────
        const pack: Individual[] = [];
        for (let w = 0; w < packSize; w++) {
            let path: string[] | null = null;
            for (let t = 0; t < 50 && !path; t++) {
                path = this.generateRandomPath(this.startCity, this.endCity);
            }
            if (!path) path = this.findValidPath(this.startCity, this.endCity);
            pack.push({ path, dist: this.calcTotalDistance(path) });
        }

        // Sort ascending by distance
        pack.sort((a, b) => a.dist - b.dist);

        // ── Leader hierarchy ─────────────────────────────────────────────────
        // α = pack[0], β = pack[1], δ = pack[2]
        let alpha = { ...pack[0] };
        let beta  = { ...pack[Math.min(1, pack.length - 1)] };
        let delta = { ...pack[Math.min(2, pack.length - 1)] };

        let noImproveCount = 0;

        // ── Hunting loop ─────────────────────────────────────────────────────
        for (let iter = 0; iter < maxIterations; iter++) {

            // GWO control parameter: linearly decreases from 2 → 0
            const a = 2.0 * (1.0 - iter / maxIterations);

            for (let w = 0; w < pack.length; w++) {
                const wolf = pack[w];

                // Each wolf independently computes A1, A2, A3
                // A = 2*a*r1 - a  →  range [-2a, 2a]
                const A1 = 2 * a * Math.random() - a;
                const A2 = 2 * a * Math.random() - a;
                const A3 = 2 * a * Math.random() - a;

                // Generate 3 candidate positions — one toward each leader
                let X1: string[], X2: string[], X3: string[];

                if (Math.abs(A1) >= 1) {
                    X1 = this.smallReroute(wolf.path);   // explore
                } else {
                    X1 = this.moveTowardLeader(wolf.path, alpha.path); // exploit α
                }

                if (Math.abs(A2) >= 1) {
                    X2 = this.smallReroute(wolf.path);
                } else {
                    X2 = this.moveTowardLeader(wolf.path, beta.path);  // exploit β
                }

                if (Math.abs(A3) >= 1) {
                    X3 = this.smallReroute(wolf.path);
                } else {
                    X3 = this.moveTowardLeader(wolf.path, delta.path); // exploit δ
                }

                // X(t+1) = best of the three candidates (discrete "average")
                const d1 = this.calcTotalDistance(X1);
                const d2 = this.calcTotalDistance(X2);
                const d3 = this.calcTotalDistance(X3);

                let newPath = wolf.path;
                let newDist = wolf.dist;

                if (d1 < newDist) { newPath = X1; newDist = d1; }
                if (d2 < newDist) { newPath = X2; newDist = d2; }
                if (d3 < newDist) { newPath = X3; newDist = d3; }

                pack[w] = { path: newPath, dist: newDist };
            }

            // Re-sort pack and update hierarchy
            pack.sort((a, b) => a.dist - b.dist);

            if (pack[0].dist < alpha.dist) {
                alpha = { ...pack[0] };
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }
            beta  = { ...pack[Math.min(1, pack.length - 1)] };
            delta = { ...pack[Math.min(2, pack.length - 1)] };

            // Emit frame for UI playback (show the worst current wolf as "trial")
            onFrame({
                generation: iter,
                bestDistance: alpha.dist,
                trialPath: pack[pack.length - 1].path, // ω wolf = most exploratory
                bestPath: alpha.path,
            });

            if (noImproveCount >= maxNoImprove) break;
        }

        // Final frame
        onFrame({
            generation: maxIterations,
            bestDistance: alpha.dist,
            trialPath: alpha.path,
            bestPath: alpha.path,
        });

        return { path: alpha.path, dist: alpha.dist };
    }
}
