import { FireflyAlgorithm } from '../utils/fireflyAlgorithm';
import type { FAParams } from '../utils/fireflyAlgorithm';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string; endCity: string; params: FAParams };

    const fa = new FireflyAlgorithm(startCity, endCity, params);

    const frames: Array<{ generation: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    const bestSolution = fa.run((frame) => {
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
