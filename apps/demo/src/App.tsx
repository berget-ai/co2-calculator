import { useState, useMemo } from "react";
import {
  calculateInference,
  calculateComparisons,
  fmtTime,
  fmtNumber,
  fmtParams,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
  getModelsByCategory,
} from "@berget/co2-calculator";
import { Container, Stack } from "@berget-ai/ui";
import { Slider, Select } from "./components";

const PUE = 1.2;

export function CO2Calculator() {
  const [modelId, setModelId] = useState("meta-llama/Llama-3.1-8B-Instruct");
  const [hardwareKey, setHardwareKey] = useState("h200");
  const [deploymentGridKey, setDeploymentGridKey] = useState("sweden");
  const [referenceGridKey, setReferenceGridKey] = useState("sweden");
  const [responseTime, setResponseTime] = useState(1.2);
  const [concurrency, setConcurrency] = useState(8);
  const [hourOfDay, setHourOfDay] = useState(14);
  const [includeTraining, setIncludeTraining] = useState(true);
  const [lifetimeQueries, setLifetimeQueries] = useState(1_000_000_000);
  const [inputTokens, setInputTokens] = useState(800);
  const [outputTokens, setOutputTokens] = useState(400);

  const model = MODEL_PROFILES[modelId];
  const hardware = HARDWARE_CONFIGS[hardwareKey];
  const deploymentGrid = GRID_REGIONS[deploymentGridKey];
  const referenceGrid = GRID_REGIONS[referenceGridKey];

  const result = useMemo(() => {
    if (!model || !hardware || !deploymentGrid) return null;
    return calculateInference({
      modelProfile: model,
      hardware,
      deploymentGrid,
      referenceGrid,
      measuredResponseTimeSeconds: responseTime,
      inputTokens,
      outputTokens,
      concurrency,
      hourOfDay,
      includeTraining,
      lifetimeQueries,
    });
  }, [model, hardware, deploymentGrid, referenceGrid, responseTime, inputTokens, outputTokens, concurrency, hourOfDay, includeTraining, lifetimeQueries]);

  const comparisons = useMemo(() => {
    if (!result) return null;
    return calculateComparisons(result.totalCO2Grams, referenceGrid);
  }, [result, referenceGrid]);

  const modelsByCategory = getModelsByCategory();

  return (
    <Container>
      <Stack gap={8} style={{ padding: '2rem 0' }}>
        <h1 style={{ color: '#52B788', margin: 0 }}>CO₂ Calculator</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Controls */}
          <Stack gap={6}>
            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1.5rem' }}>
              <h2 style={{ marginTop: 0, color: '#52B788' }}>Model & Workload</h2>
              <Select value={modelId} onChange={(e) => {
                setModelId(e.target.value);
                const m = MODEL_PROFILES[e.target.value];
                if (m) {
                  setInputTokens(m.defaultInputTokens);
                  setOutputTokens(m.defaultOutputTokens);
                  setResponseTime(m.defaultResponseTimeSeconds);
                }
              }}>
                <optgroup label="Text Generation">
                  {modelsByCategory.text.map((m) => (
                    <option key={m.modelId} value={m.modelId}>{m.displayName}</option>
                  ))}
                </optgroup>
              </Select>
              
              <Slider label="Input Tokens" value={inputTokens} onChange={setInputTokens} min={1} max={32000} step={64} displayValue={String(inputTokens)} />
              <Slider label="Output Tokens" value={outputTokens} onChange={setOutputTokens} min={1} max={8000} step={32} displayValue={String(outputTokens)} />
            </div>
            
            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1.5rem' }}>
              <h2 style={{ marginTop: 0, color: '#52B788' }}>Infrastructure</h2>
              <Select value={hardwareKey} onChange={(e) => setHardwareKey(e.target.value)}>
                {Object.entries(HARDWARE_CONFIGS).map(([key, hw]) => (
                  <option key={key} value={key}>{hw.name}</option>
                ))}
              </Select>
              
              <Select value={deploymentGridKey} onChange={(e) => setDeploymentGridKey(e.target.value)}>
                {Object.entries(GRID_REGIONS).map(([key, g]) => (
                  <option key={key} value={key}>{g.name}</option>
                ))}
              </Select>
              
              <Slider label="Hour of Day" value={hourOfDay} onChange={setHourOfDay} min={0} max={23} step={1} displayValue={`${String(hourOfDay).padStart(2, '0')}:00`} />
              
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeTraining} onChange={(e) => setIncludeTraining(e.target.checked)} />
                  Include training CO₂
                </label>
              </div>
            </div>
          </Stack>
          
          {/* Results */}
          <div>
            {result && comparisons && (
              <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1.5rem' }}>
                <h2 style={{ marginTop: 0, color: '#52B788' }}>Carbon Impact</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#0a0a0a', borderRadius: '8px' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#52B788' }}>{result.totalCO2Grams.toFixed(4)}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>g CO₂e</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#0a0a0a', borderRadius: '8px' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#52B788' }}>{responseTime.toFixed(1)}s</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>GPU time</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#0a0a0a', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#52B788' }}>{deploymentGrid.name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{deploymentGrid.intensityGPerKwh} g/kWh</div>
                  </div>
                </div>
                
                <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#52B788', marginBottom: '0.5rem' }}>Component Breakdown</h3>
                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>GPU energy</td>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>{result.components.gpuOperational.co2Grams.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Server infrastructure</td>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>{result.components.serverOperational.co2Grams.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Datacenter overhead</td>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>{result.components.datacenterOverhead.co2Grams.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Hardware embodied</td>
                      <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>{result.components.embodied.co2Grams.toFixed(4)}</td>
                    </tr>
                    {includeTraining && (
                      <tr>
                        <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Training CO₂</td>
                        <td style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>{result.components.trainingAmortised.co2Grams.toFixed(4)}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 'bold' }}>
                      <td style={{ padding: '0.75rem 0', borderTop: '2px solid #52B788' }}>Total</td>
                      <td style={{ padding: '0.75rem 0', borderTop: '2px solid #52B788', textAlign: 'right', color: '#52B788', fontSize: '1.125rem' }}>{result.totalCO2Grams.toFixed(4)}</td>
                    </tr>
                  </tbody>
                </table>
                
                <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#52B788', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Everyday Equivalent</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>☕</span>
                    <div>
                      <div style={{ fontSize: '0.875rem' }}>Microwave: <strong>{fmtTime(comparisons.microwaveSeconds)}</strong></div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>({referenceGrid.name})</div>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>💡</span>
                    <div>
                      <div style={{ fontSize: '0.875rem' }}>LED bulb: <strong>{fmtTime(comparisons.ledBulbSeconds)}</strong></div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>({referenceGrid.name})</div>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🚗</span>
                    <div style={{ fontSize: '0.875rem' }}>Car: <strong>{comparisons.carKm.toFixed(3)} km</strong></div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📱</span>
                    <div style={{ fontSize: '0.875rem' }}>Phone: <strong>{comparisons.phoneChargePercent.toFixed(2)}%</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Stack>
    </Container>
  );
}
