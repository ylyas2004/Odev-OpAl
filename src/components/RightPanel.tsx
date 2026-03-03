import React, { useState } from 'react';
import type { GAParams } from '../workers/gaWorker';

interface RightPanelProps {
    gaParams: GAParams;
    onParamChange: (param: keyof GAParams, value: number) => void;
    isRunning: boolean;
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

const RightPanel: React.FC<RightPanelProps> = ({
    gaParams, onParamChange, isRunning
}) => {
    const [showParams, setShowParams] = useState(true);

    return (
        <div className="right-panel">
            <div className="panel-header">
                <div className="panel-title-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="panel-icon">⚙️</span>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Algoritmayı Optimize Et</h2>
                    </div>
                    <select className="algo-select" disabled>
                        <option value="ga">Genetik Algoritma</option>
                        <option value="aco" disabled>Ant Colony (Yapım Aşamasında)</option>
                        <option value="abc" disabled>Bee Swarm (Yapım Aşamasında)</option>
                        <option value="sa" disabled>Simulated Annealing (Yapım Aşamasında)</option>
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
                    {showParams && (
                        <div className="params-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ParamSlider
                                label="Popülasyon Boyutu"
                                value={gaParams.populationSize}
                                min={20} max={300} step={10}
                                description="Her nesildeki birey sayısı. Büyük = daha iyi arama, daha uzun yavaş."
                                onChange={v => onParamChange('populationSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Maksimum Nesil"
                                value={gaParams.maxGenerations}
                                min={50} max={1000} step={50}
                                description="Simülasyonun maksimum iterasyon limiti."
                                onChange={v => onParamChange('maxGenerations', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Çaprazlama Oranı"
                                value={gaParams.crossoverRate}
                                min={0.1} max={1.0} step={0.05}
                                description="Yeni nesil oluşturulurken OX1 çaprazlaması olasılığı."
                                onChange={v => onParamChange('crossoverRate', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Mutasyon Oranı"
                                value={gaParams.mutationRate}
                                min={0.01} max={0.5} step={0.01}
                                description="Rastgele yeni yollar keşfetme ve gen değiştirme olasılığı."
                                onChange={v => onParamChange('mutationRate', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Elitizm Sayısı"
                                value={gaParams.elitismCount}
                                min={1} max={20} step={1}
                                description="Bir sonraki nesle bozulmadan aktarılacak en iyi birey sayısı."
                                onChange={v => onParamChange('elitismCount', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Turnuva Boyutu"
                                value={gaParams.tournamentSize}
                                min={2} max={15} step={1}
                                description="Turnuva seçilimindeki yarışmacı aday sayısı."
                                onChange={v => onParamChange('tournamentSize', v)}
                                disabled={isRunning}
                            />
                            <ParamSlider
                                label="Erken Durdurma (Nesil)"
                                value={gaParams.earlyStopGenerations}
                                min={10} max={200} step={10}
                                description="İyileşme yakalanamazsa erken durdurma eşiği."
                                onChange={v => onParamChange('earlyStopGenerations', v)}
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
