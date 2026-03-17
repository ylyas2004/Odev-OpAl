import { TabuSearch } from '../utils/tabuSearch';
import type { TabuParams } from '../utils/tabuSearch';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as { startCity: string; endCity: string; params: TabuParams };

    const ts = new TabuSearch(startCity, endCity, params);

    const frames: Array<{ generation: number; bestDistance: number; trialPath: string[]; bestPath: string[] }> = [];

    const bestSolution = ts.run((frame) => {
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
