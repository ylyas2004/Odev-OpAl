import { SimulatedAnnealing } from '../utils/simulatedAnnealing';
import type { SAParams } from '../utils/simulatedAnnealing';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string, endCity: string, params: SAParams };

    const sa = new SimulatedAnnealing(startCity, endCity, params);

    let frames: Array<{ generation: number; temperature?: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    const bestSolution = sa.run((frame) => {
        frames.push(frame);
    });

    self.postMessage({
        type: 'done',
        bestDistance: bestSolution.dist,
        bestPath: bestSolution.path,
        totalGenerations: frames.length,
        frames
    });
};
