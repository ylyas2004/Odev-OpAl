import { RouteGeneticAlgorithm } from '../utils/geneticAlgorithm';
import type { GAParams } from '../utils/geneticAlgorithm';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string, endCity: string, params: GAParams };

    const ga = new RouteGeneticAlgorithm(startCity, endCity, params);

    let frames: Array<{ generation: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    // The GA class handles the internal loop. We just pass a callback to collect the frames for animation.
    const bestSolution = ga.run((frame) => {
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
