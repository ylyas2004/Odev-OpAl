import { GreyWolfOptimizer } from '../utils/greyWolf';
import type { GWParams } from '../utils/greyWolf';

self.onmessage = function (e) {
    const { startCity, endCity, params } = e.data as {
        startCity: string;
        endCity: string;
        params: GWParams;
    };

    const gwo = new GreyWolfOptimizer(startCity, endCity, params);

    const frames: Array<{
        generation: number;
        bestDistance: number;
        trialPath: string[];
        bestPath: string[];
    }> = [];

    const best = gwo.run((frame) => {
        frames.push(frame);
    });

    self.postMessage({
        type: 'done',
        bestDistance: best.dist,
        bestPath: best.path,
        totalGenerations: frames.length,
        frames,
    });
};
