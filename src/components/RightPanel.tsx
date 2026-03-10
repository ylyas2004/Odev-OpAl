import React, { useState } from 'react';
import type { GAParams } from '../utils/geneticAlgorithm';
import type { SAParams } from '../utils/simulatedAnnealing';

interface RightPanelProps {
    algorithm: 'ga' | 'sa';
    onAlgorithmChange: (algo: 'ga' | 'sa') => void;
    gaParams: GAParams;
    onGaParamChange: (param: keyof GAParams, value: number) => void;
    saParams: SAParams;
    onSaParamChange: (param: keyof SAParams, value: number | string) => void;
    isRunning: boolean;
    currentGeneration?: number;
    currentTemperature?: number;
}

function ParamSlider({
    label,
    value,
    min,
    max,
    step,
    description,
    onChange,
    disabled,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    description: string;
    onChange: (v: number) => void;
    disabled: boolean;
}) {
    return (
        <div className="param-group">
            <div className="param-header">
                <span className="param-label">{label}</span>
                <span className="param-value">{typeof value === 'number' && step < 1 ? value.toFixed(2) : value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                disabled={disabled}
                className="param-slider"
            />
            <span className="param-desc">{description}</span>
        </div>
    );
}

function CoolingGraph({ params, isRunning, currentStep, currentTemp }: { params: SAParams, isRunning: boolean, currentStep?: number, currentTemp?: number }) {
    const width = 260;
    const height = 100;
    const padding = 10;
    const maxSteps = params.maxIterations || 1000;
    const sampleRate = Math.max(1, Math.floor(maxSteps / 200));

    let points: [number, number][] = [];

    for (let step = 0; step <= maxSteps; step += sampleRate) {
        let t = params.initialTemperature;

        if (params.coolingSchedule === 'linear') {
            t = params.initialTemperature - params.coolingRate * step;
        } else if (params.coolingSchedule === 'boltzmann') {
            t = params.initialTemperature / Math.log(Math.E + step);
        } else if (params.coolingSchedule === 'cauchy') {
            t = params.initialTemperature / (1 + params.coolingRate * step);
        } else { // geometric
            t = params.initialTemperature * Math.pow(params.coolingRate, step);
        }

        if (t < params.minTemperature) t = params.minTemperature;
        points.push([step, t]);
    }

    // Scale to SVG coords
    const maxT = params.initialTemperature;
    const minT = 0;

    const pathData = points.map((p, i) => {
        const x = padding + (p[0] / maxSteps) * (width - 2 * padding);
        const y = padding + (height - 2 * padding) - ((p[1] - minT) / (maxT - minT)) * (height - 2 * padding);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    let markerActive = false;
    let markerX = 0;
    let markerY = 0;

    if (isRunning && currentStep !== undefined && currentTemp !== undefined) {
        markerActive = true;
        markerX = padding + (Math.min(currentStep, maxSteps) / maxSteps) * (width - 2 * padding);
        // Ensure we don't divide by zero if maxT == minT
        const tempScale = maxT > minT ? (Math.max(minT, currentTemp) - minT) / (maxT - minT) : 0;
        markerY = padding + (height - 2 * padding) - tempScale * (height - 2 * padding);
    }

    let formulaJsx;
    if (params.coolingSchedule === 'linear') formulaJsx = <>T<sub>k</sub> = T<sub>0</sub> - &alpha;k</>;
    else if (params.coolingSchedule === 'boltzmann') formulaJsx = <>T<sub>k</sub> = T<sub>0</sub> / ln(e + k)</>;
    else if (params.coolingSchedule === 'cauchy') formulaJsx = <>T<sub>k</sub> = T<sub>0</sub> / (1 + &alpha;k)</>;
    else formulaJsx = <>T<sub>k</sub> = T<sub>0</sub> &middot; &alpha;<sup>k</sup></>;

    return (
        <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Soğuma Eğrisi Tahmini
                </span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#f28b82', fontFamily: 'monospace', opacity: 1 }}>
                    {formulaJsx}
                </span>
            </div>
            <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* Axes */}
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                {/* Curve */}
                <path d={pathData} fill="none" stroke="#f28b82" strokeWidth="2" strokeLinejoin="round" />
                {/* Live Tracker Dot */}
                {markerActive && (
                    <circle
                        cx={markerX} cy={markerY} r="4"
                        fill="#fca5a5" stroke="#fff" strokeWidth="1.5"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(252, 165, 165, 0.8))', transition: 'all 0.1s linear' }}
                    />
                )}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'gray', marginTop: '4px' }}>
                <span>{params.initialTemperature}T</span>
                <span>Zaman →</span>
            </div>
        </div>
    );
}

const RightPanel: React.FC<RightPanelProps> = ({
    algorithm, onAlgorithmChange, gaParams, onGaParamChange, saParams, onSaParamChange, isRunning, currentGeneration, currentTemperature
}) => {
    const [showParams, setShowParams] = useState(true);
    const [panelWidth, setPanelWidth] = useState(340);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = panelWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (startX - moveEvent.pageX);
            const maxWidth = window.innerWidth * 0.4;
            setPanelWidth(Math.min(maxWidth, Math.max(300, newWidth)));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div className="right-panel" style={{ width: panelWidth, position: 'relative' }}>
            <div
                className="resize-handle"
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '6px',
                    height: '100%',
                    cursor: 'ew-resize',
                    zIndex: 100
                }}
            />
            <div className="panel-header">
                <div className="panel-title-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select className="algo-select" value={algorithm} onChange={e => onAlgorithmChange(e.target.value as 'ga' | 'sa')} disabled={isRunning}>
                        <option value="ga">Genetik Algoritma</option>
                        <option value="sa">Benzetimli Tavlama</option>
                    </select>
                </div>
            </div>

            <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                <div className="panel-content">
                    <div className="section-toggle"
                        onClick={() => setShowParams(p => !p)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '16px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>Gelişmiş Ayarlar</h3>
                        <span className="toggle-icon" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {showParams ? '▲' : '▼'}
                        </span>
                    </div>
                    {showParams && algorithm === 'ga' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Popülasyon Boyutu"
                                value={gaParams.populationSize}
                                min={20} max={300} step={10}
                                description="Her nesildeki birey sayısı. Büyük = daha iyi arama, daha uzun yavaş."
                                onChange={v => onGaParamChange('populationSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maksimum Nesil"
                                value={gaParams.maxGenerations}
                                min={50} max={1000} step={50}
                                description="Simülasyonun maksimum iterasyon limiti."
                                onChange={v => onGaParamChange('maxGenerations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Çaprazlama Oranı"
                                value={gaParams.crossoverRate}
                                min={0.1} max={1.0} step={0.05}
                                description="Yeni nesil oluşturulurken OX1 çaprazlaması olasılığı."
                                onChange={v => onGaParamChange('crossoverRate', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Mutasyon Oranı"
                                value={gaParams.mutationRate}
                                min={0.01} max={0.5} step={0.01}
                                description="Rastgele yeni yollar keşfetme ve gen değiştirme olasılığı."
                                onChange={v => onGaParamChange('mutationRate', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Elitizm Sayısı"
                                value={gaParams.elitismCount}
                                min={1} max={20} step={1}
                                description="Bir sonraki nesle bozulmadan aktarılacak en iyi birey sayısı."
                                onChange={v => onGaParamChange('elitismCount', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Turnuva Boyutu"
                                value={gaParams.tournamentSize}
                                min={2} max={15} step={1}
                                description="Turnuva seçilimindeki yarışmacı aday sayısı."
                                onChange={v => onGaParamChange('tournamentSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Erken Durdurma (Nesil)"
                                value={gaParams.earlyStopGenerations}
                                min={10} max={200} step={10}
                                description="İyileşme yakalanamazsa erken durdurma eşiği."
                                onChange={v => onGaParamChange('earlyStopGenerations', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                    {showParams && algorithm === 'sa' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="param-group" style={{ marginBottom: '-8px' }}>
                                <div className="param-header">
                                    <span className="param-label">Soğuma Formülü</span>
                                </div>
                                <select
                                    className="param-slider"
                                    style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid gray', borderRadius: '4px', marginTop: '4px' }}
                                    value={saParams.coolingSchedule as string}
                                    onChange={e => {
                                        const newSchedule = e.target.value as any;
                                        onSaParamChange('coolingSchedule', newSchedule);
                                        if (newSchedule === 'geometric') onSaParamChange('coolingRate', 0.99);
                                        else if (newSchedule === 'linear') onSaParamChange('coolingRate', 5);
                                        else if (newSchedule === 'cauchy') onSaParamChange('coolingRate', 0.01);
                                    }}
                                    disabled={isRunning}
                                >
                                    <option value="linear" style={{ color: 'black' }}>Linear (Doğrusal)</option>
                                    <option value="geometric" style={{ color: 'black' }}>Geometric (Eksponansiyel)</option>
                                    <option value="boltzmann" style={{ color: 'black' }}>Boltzmann (Logaritmik)</option>
                                    <option value="cauchy" style={{ color: 'black' }}>Cauchy (Ters/Hızlı SA)</option>
                                </select>
                                <span className="param-desc" style={{ marginTop: '4px' }}>Akademik standartlara uygun soğuma çizelgesi seçin.</span>
                            </div>

                            <CoolingGraph
                                params={saParams}
                                isRunning={isRunning}
                                currentStep={currentGeneration}
                                currentTemp={currentTemperature}
                            />

                            <ParamSlider
                                label="Başlangıç Sıcaklığı"
                                value={saParams.initialTemperature as number}
                                min={100} max={5000} step={100}
                                description="Sistemin başlangıç enerjisi. Yüksek değer daha çok arama yapar."
                                onChange={v => onSaParamChange('initialTemperature', v)}
                                disabled={isRunning}
                            />
                            {saParams.coolingSchedule !== 'boltzmann' && (
                                <ParamSlider
                                    label="Soğuma Oranı (α)"
                                    value={saParams.coolingRate as number}
                                    min={saParams.coolingSchedule === 'geometric' ? 0.8 : saParams.coolingSchedule === 'linear' ? 0.1 : 0.001}
                                    max={saParams.coolingSchedule === 'geometric' ? 0.999 : saParams.coolingSchedule === 'linear' ? 50 : 0.1}
                                    step={saParams.coolingSchedule === 'geometric' ? 0.001 : saParams.coolingSchedule === 'linear' ? 0.1 : 0.001}
                                    description="Seçilen formüle göre uygulanan azalma (alfa) çarpanı/çıkarımı."
                                    onChange={v => onSaParamChange('coolingRate', v)}
                                    disabled={isRunning}
                                />
                            )}
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={saParams.maxIterations as number}
                                min={100} max={5000} step={100}
                                description="Simülasyonun toplam döngü limiti."
                                onChange={v => onSaParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Deneme/Sıcaklık"
                                value={saParams.iterationsPerTemp as number}
                                min={5} max={100} step={5}
                                description="Her sıcaklık değerinde yapılacak komşu arama sayısı."
                                onChange={v => onSaParamChange('iterationsPerTemp', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Minimum Sıcaklık"
                                value={saParams.minTemperature as number}
                                min={0.01} max={10} step={0.01}
                                description="Algoritmanın duracağı son sıcaklık noktası."
                                onChange={v => onSaParamChange('minTemperature', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RightPanel;
