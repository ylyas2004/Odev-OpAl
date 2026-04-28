import { ButterflyOptimization } from '../utils/butterflyOptimization';
import type { BOAParams } from '../utils/butterflyOptimization';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string; endCity: string; params: BOAParams };

    const boa = new ButterflyOptimization(startCity, endCity, params);

    const frames: Array<{ generation: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    const bestSolution = boa.run((frame) => {
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
