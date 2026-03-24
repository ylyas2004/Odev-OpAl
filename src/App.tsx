import React, { useState, useRef, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import RightPanel from './components/RightPanel';
import { CITIES } from './data/turkeyGraph';
import type { GAParams } from './utils/geneticAlgorithm';
import type { SAParams } from './utils/simulatedAnnealing';
import type { TabuParams } from './utils/tabuSearch';
import type { PSOParams } from './utils/particleSwarm';
import './App.css';

const DEFAULT_PARAMS: GAParams = {
  populationSize: 150,
  maxGenerations: 500,
  crossoverRate: 0.85,
  mutationRate: 0.15,
  elitismCount: 5,
  tournamentSize: 4,
  earlyStopGenerations: 60,
};

const DEFAULT_SA_PARAMS: SAParams = {
  initialTemperature: 1000,
  minTemperature: 0.1,
  coolingRate: 0.99,
  maxIterations: 1000,
  iterationsPerTemp: 20,
  coolingSchedule: 'geometric',
};

const DEFAULT_TABU_PARAMS: TabuParams = {
  tabuSize: 10,
  maxIterations: 500,
  neighborhoodSize: 20,
  maxNoImprove: 100,
};

const DEFAULT_PSO_PARAMS: PSOParams = {
  swarmSize: 40,
  maxIterations: 500,
  inertiaWeight: 0.7,
  cognitiveCoeff: 1.5,
  socialCoeff: 1.5,
  maxSwapsPerIter: 4,
  mutationRate: 0.1,
  useLocalBest: false,
  neighborhoodSize: 3,
  maxNoImprove: 100,
};

interface ResultState {
  generation: number;
  temperature?: number;
  bestDistance: number;
  bestPath: string[];
  status: 'idle' | 'running' | 'done';
}

const INITIAL_RESULTS: ResultState = {
  generation: 0,
  bestDistance: Infinity,
  bestPath: [],
  status: 'idle',
};

function CitySelect({
  label,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  value: string | null;
  onChange: (id: string) => void;
  excludeId?: string | null;
}) {
  const [search, setSearch] = useState('');
  const filtered = CITIES.filter(
    c => c.id !== excludeId && c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="city-select-wrapper header-select">
      <div className="select-inner">
        <span className="select-label">{label}:</span>
        <select
          value={value ?? ''}
          onChange={e => { onChange(e.target.value); setSearch(''); }}
          className="city-select"
        >
          <option value="" disabled>Seçiniz</option>
          {filtered.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function App() {
  const [startCity, setStartCity] = useState<string | null>(null);
  const [endCity, setEndCity] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<'ga' | 'sa' | 'tabu' | 'pso'>('ga');
  const [gaParams, setGaParams] = useState<GAParams>(DEFAULT_PARAMS);
  const [saParams, setSaParams] = useState<SAParams>(DEFAULT_SA_PARAMS);
  const [tabuParams, setTabuParams] = useState<TabuParams>(DEFAULT_TABU_PARAMS);
  const [psoParams, setPsoParams] = useState<PSOParams>(DEFAULT_PSO_PARAMS);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ResultState>(INITIAL_RESULTS);
  const [trialPath, setTrialPath] = useState<string[]>([]);
  const [simTimeSeconds, setSimTimeSeconds] = useState(10); // user requested 10 seconds default

  const workerRef = useRef<Worker | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const handleGaParamChange = useCallback((param: keyof GAParams, value: number) => {
    setGaParams((prev: GAParams) => ({ ...prev, [param]: value }));
  }, []);

  const handleSaParamChange = useCallback((param: keyof SAParams, value: number | string) => {
    setSaParams((prev: SAParams) => ({ ...prev, [param]: value as never }));
  }, []);

  const handleTabuParamChange = useCallback((param: keyof TabuParams, value: number) => {
    setTabuParams((prev: TabuParams) => ({ ...prev, [param]: value }));
  }, []);

  const handlePsoParamChange = useCallback((param: keyof PSOParams, value: number | boolean) => {
    setPsoParams((prev: PSOParams) => ({ ...prev, [param]: value as never }));
  }, []);

  const handleStartSimulation = useCallback(() => {
    if (!startCity || !endCity) return;

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    setIsRunning(true);
    setTrialPath([]);
    setResults({ ...INITIAL_RESULTS, status: 'running' });

    const worker = algorithm === 'sa'
      ? new Worker(new URL('./workers/saWorker.ts', import.meta.url), { type: 'module' })
      : algorithm === 'tabu'
        ? new Worker(new URL('./workers/tabuWorker.ts', import.meta.url), { type: 'module' })
        : algorithm === 'pso'
          ? new Worker(new URL('./workers/psoWorker.ts', import.meta.url), { type: 'module' })
          : new Worker(new URL('./workers/gaWorker.ts', import.meta.url), { type: 'module' });

    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<any>) => {
      const data = e.data;
      if (data.type === 'done') {
        const frames = data.frames;
        if (!frames || frames.length === 0) {
          setIsRunning(false);
          return;
        }

        const totalDuration = simTimeSeconds * 1000;
        const targetFps = 30; // Cap at 30 FPS to prevent SVG and React state lockups
        const targetDelay = 1000 / targetFps;

        let actualDelay = totalDuration / frames.length;
        let frameStep = 1;

        if (actualDelay < targetDelay) {
          actualDelay = targetDelay;
          frameStep = frames.length / (totalDuration / targetDelay);
        }

        let currentVirtualFrame = 0;

        playbackTimerRef.current = window.setInterval(() => {
          currentVirtualFrame += frameStep;
          const frameIdx = Math.floor(currentVirtualFrame);

          if (frameIdx >= frames.length) {
            if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
            setIsRunning(false);
            const finalFrame = frames[frames.length - 1];
            setResults({
              generation: finalFrame.generation,
              temperature: finalFrame.temperature,
              bestDistance: finalFrame.bestDistance,
              bestPath: finalFrame.bestPath,
              status: 'done'
            });
            setTrialPath([]);
          } else {
            const frame = frames[frameIdx];
            setTrialPath(frame.trialPath); // Render red line
            setResults(prev => ({
              ...prev,
              generation: frame.generation,
              temperature: frame.temperature,
              bestDistance: frame.bestDistance,
              bestPath: frame.bestPath,
            }));
          }
        }, actualDelay);
      }
    };

    worker.onerror = (err) => {
      console.error('GA Worker error:', err);
      setIsRunning(false);
      setResults(prev => ({ ...prev, status: 'idle' }));
    };

    worker.postMessage({
      type: 'start',
      startCity,
      endCity,
      params: algorithm === 'sa' ? saParams : algorithm === 'tabu' ? tabuParams : algorithm === 'pso' ? psoParams : gaParams,
    });
  }, [startCity, endCity, algorithm, gaParams, saParams, tabuParams, psoParams, simTimeSeconds]);

  const handleStopSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsRunning(false);
    setTrialPath([]);
    setResults(prev => ({ ...prev, status: 'done' }));
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const handleCityClick = useCallback((cityId: string) => {
    if (isRunning) return;

    // Reset paths when picking new cities
    setResults(INITIAL_RESULTS);
    setTrialPath([]);

    if (!startCity) {
      setStartCity(cityId);
    } else if (!endCity && cityId !== startCity) {
      setEndCity(cityId);
    } else if (cityId === startCity) {
      setStartCity(null);
    } else if (cityId === endCity) {
      setEndCity(null);
    } else {
      // Re-assign start if clicked elsewhere when both are set
      setStartCity(cityId);
      setEndCity(null);
    }
  }, [startCity, endCity, isRunning]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">🚛</div>
          <div className="header-text">
            <h1>Optimizasyon Algoritma Ödevi</h1>
            <span>Rota Optimizasyonu</span>
          </div>
        </div>

        <div className="header-center">
          <CitySelect label="Başlangıç" value={startCity} onChange={setStartCity} excludeId={endCity} />
          <span className="arrow">→</span>
          <CitySelect label="Bitiş" value={endCity} onChange={setEndCity} excludeId={startCity} />

          <div className="header-sim-control">
            <span className="sim-label">Süre: {simTimeSeconds}s</span>
            <input type="range" min="1" max="30" value={simTimeSeconds} onChange={e => setSimTimeSeconds(Number(e.target.value))} disabled={isRunning} className="sim-slider" title="Simülasyon Oynatma Süresi" />
          </div>

          <div className="header-btn-wrap">
            {isRunning ? (
              <button className="btn-stop btn-header" onClick={handleStopSimulation}>⏹ Durdur</button>
            ) : (
              <button className="btn-start btn-header" onClick={handleStartSimulation} disabled={!startCity || !endCity}>▶ Başlat</button>
            )}
          </div>
        </div>

        <div className="header-right">
          {results.status === 'running' && <span className="status-badge running" style={{ marginRight: '12px' }}>⚡ Hesaplanıyor</span>}
          {results.status === 'done' && <span className="status-badge done" style={{ marginRight: '12px' }}>✅ Tamamlandı</span>}

          <div className="header-distance">
            {algorithm === 'sa' ? (
              <>Sıcaklık: <span>{results.temperature !== undefined ? `${results.temperature.toFixed(2)}°` : `${saParams.initialTemperature}°`}</span> |</>
            ) : (
              <>İterasyon: <span>{results.generation}</span> |</>
            )}
            &nbsp;Mesafe: <span>{results.bestDistance !== Infinity ? `${Math.round(results.bestDistance)} km` : '∞'}</span>
          </div>
        </div>
      </header>

      {/* Path Breadcrumbs */}
      <div className="header-path-bar">
        <div className="path-label"> Optimal Rota: </div>
        <div className="path-cities">
          {results.bestPath.length > 0 ? (
            results.bestPath.map((id, idx) => (
              <React.Fragment key={idx}>
                <span className={idx === 0 ? "text-teal" : idx === results.bestPath.length - 1 ? "text-coral" : "text-blue"}>
                  {CITIES.find(c => c.id === id)?.name}
                </span>
                {idx < results.bestPath.length - 1 && <span className="path-arrow">›</span>}
              </React.Fragment>
            ))
          ) : (
            <span className="text-gray-500 italic">Henüz rota seçilmedi...</span>
          )}
        </div>
      </div>

      <div className="app-body">
        <div className="map-container">
          <MapView
            startCity={startCity}
            endCity={endCity}
            currentPath={trialPath}
            bestPath={results.bestPath}
            isRunning={isRunning}
            onCityClick={handleCityClick}
          />
          <div className="map-legend">
            <div className="legend-item"><span className="dot teal"></span> Başlangıç</div>
            <div className="legend-item"><span className="dot coral"></span> Bitiş</div>
            <div className="legend-item"><span className="dot blue"></span> Ara Durak</div>
            <div className="legend-item"><span className="line red-line"></span> Deneme Rotalar</div>
            <div className="legend-item"><span className="line green-line"></span> En İyi Rota (Bulunan)</div>
          </div>
          {!isRunning && (
            <div className="map-hint">
              {!startCity && <div className="map-tooltip">🖱️ Başlangıç için bir şehre tıklayın</div>}
              {startCity && !endCity && <div className="map-tooltip">🖱️ Bitiş için bir şehre tıklayın</div>}
            </div>
          )}
        </div>

        <RightPanel
          algorithm={algorithm}
          onAlgorithmChange={setAlgorithm}
          gaParams={gaParams}
          onGaParamChange={handleGaParamChange}
          saParams={saParams}
          onSaParamChange={handleSaParamChange}
          tabuParams={tabuParams}
          onTabuParamChange={handleTabuParamChange}
          psoParams={psoParams}
          onPsoParamChange={handlePsoParamChange}
          isRunning={isRunning}
          currentGeneration={results.generation}
          currentTemperature={results.temperature}
        />
      </div>
    </div>
  );
}

export default App;
