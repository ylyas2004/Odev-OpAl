import React, { useState } from 'react';
import type { GAParams } from '../utils/geneticAlgorithm';
import type { SAParams } from '../utils/simulatedAnnealing';
import type { TabuParams } from '../utils/tabuSearch';
import type { PSOParams } from '../utils/particleSwarm';
import type { ACOParams } from '../utils/antColony';

import type { ABCParams } from '../utils/beeColony';
import type { BOAParams } from '../utils/butterflyOptimization';
import type { FAParams } from '../utils/fireflyAlgorithm';
import type { GWParams } from '../utils/greyWolf';

interface RightPanelProps {
    algorithm: 'ga' | 'sa' | 'tabu' | 'pso' | 'aco' | 'abc' | 'boa' | 'fa' | 'gw';
    onAlgorithmChange: (algo: 'ga' | 'sa' | 'tabu' | 'pso' | 'aco' | 'abc' | 'boa' | 'fa' | 'gw') => void;
    gaParams: GAParams;
    onGaParamChange: (param: keyof GAParams, value: number) => void;
    saParams: SAParams;
    onSaParamChange: (param: keyof SAParams, value: number | string) => void;
    tabuParams: TabuParams;
    onTabuParamChange: (param: keyof TabuParams, value: number) => void;
    psoParams: PSOParams;
    onPsoParamChange: (param: keyof PSOParams, value: number | boolean) => void;
    acoParams: ACOParams;
    onAcoParamChange: (param: keyof ACOParams, value: number) => void;
    abcParams: ABCParams;
    onAbcParamChange: (param: keyof ABCParams, value: number) => void;
    boaParams: BOAParams;
    onBoaParamChange: (param: keyof BOAParams, value: number) => void;
    faParams: FAParams;
    onFaParamChange: (param: keyof FAParams, value: number) => void;
    gwParams: GWParams;
    onGwParamChange: (param: keyof GWParams, value: number) => void;
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
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', height: 'auto' }}>
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
    algorithm, onAlgorithmChange, gaParams, onGaParamChange, saParams, onSaParamChange, tabuParams, onTabuParamChange, psoParams, onPsoParamChange, acoParams, onAcoParamChange, abcParams, onAbcParamChange, boaParams, onBoaParamChange, faParams, onFaParamChange, gwParams, onGwParamChange, isRunning, currentGeneration, currentTemperature
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
                    <select className="algo-select" value={algorithm} onChange={e => onAlgorithmChange(e.target.value as 'ga' | 'sa' | 'tabu' | 'pso' | 'aco' | 'abc' | 'boa' | 'fa' | 'gw')} disabled={isRunning}>
                        <option value="ga">Genetik Algoritma</option>
                        <option value="sa">Benzetimli Tavlama</option>
                        <option value="tabu">Tabu Arama</option>
                        <option value="pso">Parçacık Sürüsü (PSO)</option>
                        <option value="aco">Karınca Kolonisi (ACO)</option>
                        <option value="abc">Yapay Arı Kolonisi (ABC)</option>
                        <option value="boa">Kelebek Optimizasyonu (BOA)</option>
                        <option value="fa">Ateşböceği Algoritması (FA)</option>
                        <option value="gw">Gri Kurt (GWO)</option>
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
                    {showParams && algorithm === 'tabu' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Tabu Listesi Boyutu"
                                value={tabuParams.tabuSize}
                                min={3} max={50} step={1}
                                description="Yasaklı hareketlerin hafıza boyutu. Büyük = daha az döngü, daha yavaş."
                                onChange={v => onTabuParamChange('tabuSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={tabuParams.maxIterations}
                                min={50} max={2000} step={50}
                                description="Algoritmanın toplam dış döngü limiti."
                                onChange={v => onTabuParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Komşuluk Boyutu"
                                value={tabuParams.neighborhoodSize}
                                min={5} max={80} step={5}
                                description="Her iterasyonda değerlendirilen aday komşu çözüm sayısı."
                                onChange={v => onTabuParamChange('neighborhoodSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={tabuParams.maxNoImprove}
                                min={10} max={300} step={10}
                                description="Bu kadar ardışık iterasyonda iyileşme olmazsa durdur (sabırlılık)."
                                onChange={v => onTabuParamChange('maxNoImprove', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                    {showParams && algorithm === 'pso' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Sürü Büyüklüğü (N)"
                                value={psoParams.swarmSize}
                                min={10} max={150} step={5}
                                description="Arama yapan parçacık (çözüm adayı) sayısı. Büyük = geniş arama."
                                onChange={v => onPsoParamChange('swarmSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={psoParams.maxIterations}
                                min={50} max={2000} step={50}
                                description="Sürünün toplam hareket adımı limiti."
                                onChange={v => onPsoParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Atalet Katsayısı (w)"
                                value={psoParams.inertiaWeight}
                                min={0.1} max={1.0} step={0.05}
                                description="Önceki hızın ne kadarı korunur. Yüksek = keşif, Düşük = sömürü."
                                onChange={v => onPsoParamChange('inertiaWeight', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Bilişsel Kat. (c1)"
                                value={psoParams.cognitiveCoeff}
                                min={0.5} max={3.0} step={0.1}
                                description="Parçacığın kendi en iyi çözümüne çekilme gücü (kişisel bellek)."
                                onChange={v => onPsoParamChange('cognitiveCoeff', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Sosyal Kat. (c2)"
                                value={psoParams.socialCoeff}
                                min={0.5} max={3.0} step={0.1}
                                description="Parçacığın sürünün en iyi çözümüne çekilme gücü (sosyal bellek)."
                                onChange={v => onPsoParamChange('socialCoeff', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. Takas/İter."
                                value={psoParams.maxSwapsPerIter}
                                min={1} max={15} step={1}
                                description="Hız vektörünün boyutu. Düşük = küçük adımlar, Yüksek = büyük sıçramalar."
                                onChange={v => onPsoParamChange('maxSwapsPerIter', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Mutasyon Oranı"
                                value={psoParams.mutationRate}
                                min={0.0} max={0.5} step={0.01}
                                description="Rastgele keşif için iki ara şehri takas etme olasılığı."
                                onChange={v => onPsoParamChange('mutationRate', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={psoParams.maxNoImprove}
                                min={10} max={500} step={10}
                                description="Bu kadar iterasyonda global en iyi iyileşmezse erken dur."
                                onChange={v => onPsoParamChange('maxNoImprove', v)}
                                disabled={isRunning}
                            />
                            {/* lBest Topoloji Switcher */}
                            <div className="param-group">
                                <div className="param-header">
                                    <span className="param-label">V-Sürü Topolojisi (lBest)</span>
                                    <span className="param-value">{psoParams.useLocalBest ? 'Açık' : 'Kapalı'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        onClick={() => onPsoParamChange('useLocalBest', false)}
                                        disabled={isRunning}
                                        style={{
                                            flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                                            background: !psoParams.useLocalBest ? 'var(--accent-primary, #4f8ef7)' : 'rgba(255,255,255,0.08)',
                                            color: !psoParams.useLocalBest ? '#fff' : 'rgba(255,255,255,0.5)',
                                            transition: 'all 0.2s',
                                        }}
                                    >Küresel (gBest)</button>
                                    <button
                                        onClick={() => onPsoParamChange('useLocalBest', true)}
                                        disabled={isRunning}
                                        style={{
                                            flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                                            background: psoParams.useLocalBest ? 'var(--accent-primary, #4f8ef7)' : 'rgba(255,255,255,0.08)',
                                            color: psoParams.useLocalBest ? '#fff' : 'rgba(255,255,255,0.5)',
                                            transition: 'all 0.2s',
                                        }}
                                    >Yerel (lBest)</button>
                                </div>
                                <span className="param-desc" style={{ marginTop: '4px' }}>lBest: Her parçacık sadece komşularını gören V-şekilli sürü formasyonu kullanır.</span>
                            </div>
                            {psoParams.useLocalBest && (
                                <ParamSlider
                                    label="Komşuluk Yarıçapı"
                                    value={psoParams.neighborhoodSize}
                                    min={1} max={10} step={1}
                                    description="lBest topolojisinde her parçacığın gördüğü komşu pencere büyüklüğü."
                                    onChange={v => onPsoParamChange('neighborhoodSize', v)}
                                    disabled={isRunning}
                                />
                            )}
                        </div>
                    )}
                    {showParams && algorithm === 'aco' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Karınca Sayısı"
                                value={acoParams.antCount}
                                min={5} max={100} step={5}
                                description="Her iterasyonda tur oluşturan karınca sayısı. Fazla = geniş arama."
                                onChange={v => onAcoParamChange('antCount', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={acoParams.maxIterations}
                                min={50} max={1000} step={50}
                                description="Toplam koloni döngüsü limiti."
                                onChange={v => onAcoParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Feromon Etkisi (α)"
                                value={acoParams.alpha}
                                min={0.1} max={5.0} step={0.1}
                                description="Yüksek α → karıncalar önceki feromon izlerine daha çok uyar."
                                onChange={v => onAcoParamChange('alpha', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Sezgisel Etki (β)"
                                value={acoParams.beta}
                                min={0.1} max={8.0} step={0.1}
                                description="Yüksek β → karıncalar kısa kenarları daha çok tercih eder."
                                onChange={v => onAcoParamChange('beta', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Buharlaşma Oranı (ρ)"
                                value={acoParams.evaporationRate}
                                min={0.01} max={0.99} step={0.01}
                                description="Her iterasyonda feromondaki azalma oranı. Yüksek = hızlı unutma."
                                onChange={v => onAcoParamChange('evaporationRate', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Feromon Sabiti (Q)"
                                value={acoParams.Q}
                                min={10} max={500} step={10}
                                description="Karıncanın bıraktığı feromon miktarı (Q / tur mesafesi formülü)."
                                onChange={v => onAcoParamChange('Q', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Başlangıç Feromon"
                                value={acoParams.initialPheromone}
                                min={0.1} max={5.0} step={0.1}
                                description="Tüm kenarlarda başlangıçta eşit dağıtılan feromon seviyesi."
                                onChange={v => onAcoParamChange('initialPheromone', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={acoParams.maxNoImprove}
                                min={10} max={300} step={10}
                                description="Bu kadar iterasyon iyileşme olmazsa erken dur."
                                onChange={v => onAcoParamChange('maxNoImprove', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                    {showParams && algorithm === 'abc' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Arı Sayısı (N)"
                                value={abcParams.beeCount}
                                min={10} max={200} step={10}
                                description="Kolonideki toplam arı sayısı (İşçi + Gözcü). Fazla = daha çok kaynak tarama."
                                onChange={v => onAbcParamChange('beeCount', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={abcParams.maxIterations}
                                min={50} max={2000} step={50}
                                description="Algoritmanın toplam döngü limiti."
                                onChange={v => onAbcParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Terketme Sınırı (Limit)"
                                value={abcParams.limit}
                                min={5} max={100} step={5}
                                description="Bir besin kaynağının geliştirilemezse terkedilmesi için deneme eşiği (Kaşif arı fazı)."
                                onChange={v => onAbcParamChange('limit', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={abcParams.maxNoImprove}
                                min={10} max={500} step={10}
                                description="Global en iyi bu kadar iterasyon değişmezse erken dur."
                                onChange={v => onAbcParamChange('maxNoImprove', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                    {showParams && algorithm === 'boa' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Kelebek Sayısı (N)"
                                value={boaParams.butterflyCount}
                                min={10} max={200} step={10}
                                description="Sürüdeki toplam kelebek sayısı. Fazla = geniş arama alanı."
                                onChange={v => onBoaParamChange('butterflyCount', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={boaParams.maxIterations}
                                min={50} max={2000} step={50}
                                description="Algoritmanın toplam döngü limiti."
                                onChange={v => onBoaParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Koku Katsayısı (c)"
                                value={boaParams.c}
                                min={0.01} max={1.0} step={0.01}
                                description="Sensör modülü koku algı katsayısı. Algoritma ilerledikçe artar."
                                onChange={v => onBoaParamChange('c', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Kuvvet Üssü (a)"
                                value={boaParams.a}
                                min={0.1} max={0.9} step={0.1}
                                description="Kokunun yayılma derecesini belirler."
                                onChange={v => onBoaParamChange('a', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Geçiş Olasılığı (p)"
                                value={boaParams.p}
                                min={0.1} max={0.9} step={0.1}
                                description="Küresel (Global) ve Yerel (Local) arama arasındaki geçiş olasılığı."
                                onChange={v => onBoaParamChange('p', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={boaParams.maxNoImprove}
                                min={10} max={500} step={10}
                                description="Global en iyi bu kadar iterasyon değişmezse erken dur."
                                onChange={v => onBoaParamChange('maxNoImprove', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                    {showParams && algorithm === 'fa' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Ateşböceği Sayısı"
                                value={faParams.fireflyCount}
                                min={10} max={200} step={10}
                                description="Kolonideki toplam ateşböceği sayısı. Büyük = daha iyi araştırma."
                                onChange={v => onFaParamChange('fireflyCount', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={faParams.maxIterations}
                                min={50} max={2000} step={50}
                                description="Simülasyonun dış döngü limiti."
                                onChange={v => onFaParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Rastgelelik (α)"
                                value={faParams.alpha}
                                min={0.0} max={1.0} step={0.05}
                                description="Ateşböceklerinin hareketine eklenen rastgele adım büyüklüğü."
                                onChange={v => onFaParamChange('alpha', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Temel Çekicilik (β₀)"
                                value={faParams.beta0}
                                min={0.1} max={5.0} step={0.1}
                                description="Uzaklık sıfırken maksimum çekim gücü. Yüksek = daha hızlı yakınsama."
                                onChange={v => onFaParamChange('beta0', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Işık Emilimi (γ)"
                                value={faParams.gamma}
                                min={0.01} max={2.0} step={0.01}
                                description="Mesafeyle ışığın ne kadar azalacağı. Yüksek = sadece yakındakini görür."
                                onChange={v => onFaParamChange('gamma', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={faParams.maxNoImprove}
                                min={10} max={500} step={10}
                                description="Global en iyi bu kadar iterasyon değişmezse erken dur."
                                onChange={v => onFaParamChange('maxNoImprove', v)}
                                disabled={isRunning}
                            />
                        </div>
                    )}
                    {showParams && algorithm === 'gw' && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Kurt Sürüsü (Pack Size)"
                                value={gwParams.packSize}
                                min={5} max={100} step={1}
                                description="Sürüdeki toplam kurt sayısı (Alfa, Beta, Delta ve Omega)."
                                onChange={v => onGwParamChange('packSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İterasyon"
                                value={gwParams.maxIterations}
                                min={50} max={2000} step={50}
                                description="Algoritmanın toplam avlanma döngüsü limiti."
                                onChange={v => onGwParamChange('maxIterations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maks. İyileşmesizlik"
                                value={gwParams.maxNoImprove}
                                min={10} max={500} step={10}
                                description="Alfa kurdun pozisyonu bu kadar iterasyon değişmezse erken dur."
                                onChange={v => onGwParamChange('maxNoImprove', v)}
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
