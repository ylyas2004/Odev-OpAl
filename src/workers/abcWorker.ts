import { ArtificialBeeColony } from '../utils/beeColony';
import type { ABCParams } from '../utils/beeColony';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string; endCity: string; params: ABCParams };

    const abc = new ArtificialBeeColony(startCity, endCity, params);

    const frames: Array<{ generation: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    const bestSolution = abc.run((frame) => {
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
