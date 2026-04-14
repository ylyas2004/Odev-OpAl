import { AntColonyOptimization } from '../utils/antColony';
import type { ACOParams } from '../utils/antColony';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string; endCity: string; params: ACOParams };

    const aco = new AntColonyOptimization(startCity, endCity, params);

    const frames: Array<{ generation: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    const bestSolution = aco.run((frame) => {
        frames.push(frame);
    });

    self.postMessage({
        type: 'done',
        bestDistance: bestSolution.dist,
        bestPath: bestSolution.path,
        totalGenerations: frames.length,
        frames,
    });
};
