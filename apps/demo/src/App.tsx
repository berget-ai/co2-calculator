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
  getConcurrencyFromTrafficPattern,
  applyConcurrencyDelay,
} from "@berget/co2-calculator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PUE = 1.2;

// Berget AI Design Tokens
const COLORS = {
  night: '#0A0A0A',
  slate: '#1A1A1A',
  moss: '#52B788',
  lichen: '#8FBC8F',
  cloud: '#E5DDD5',
  peak: '#FFFFFF',
  fjord: '#1A3A4A',
  spruce: '#2D6B4F',
  border: 'rgba(255, 255, 255, 0.1)',
  card: 'rgba(26, 26, 26, 0.4)',
  muted: 'rgba(255, 255, 255, 0.8)',
};

const FONTS = {
  serif: '"Ovo", Georgia, serif',
  sans: '"DM Sans", system-ui, sans-serif',
  mono: '"DM Mono", monospace',
};

const RADIUS = {
  sm: '16px',
  md: '24px',
  lg: '32px',
  xs: '12px',
};

// Layout Components
function Container({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '0 clamp(1rem, 0.82rem + 0.76vw, 1.5rem)' 
    }}>
      {children}
    </div>
  );
}

function Stack({ children, gap = 4, style }: { children: React.ReactNode; gap?: number; style?: React.CSSProperties }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap * 0.25}rem`, ...style }}>{children}</div>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: COLORS.card,
      borderRadius: RADIUS.md,
      border: `1px solid ${COLORS.border}`,
      padding: 'clamp(1.5rem, 1.14rem + 1.52vw, 2.5rem)',
      backdropFilter: 'blur(8px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'moss' }) {
  const variants = {
    default: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.peak,
    },
    moss: {
      background: 'rgba(82, 183, 136, 0.2)',
      color: COLORS.moss,
    },
  };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.25rem 0.75rem',
      borderRadius: RADIUS.sm,
      fontSize: '0.75rem',
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      ...variants[variant],
    }}>
      {children}
    </span>
  );
}

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

  // Beräkna justerad response time för visning
  const adjustedResponseTime = useMemo(() => {
    if (!model) return responseTime;
    const tokenRatio = (inputTokens + outputTokens) / 
      (model.defaultInputTokens + model.defaultOutputTokens);
    const tokenAdjustedTime = responseTime * Math.sqrt(tokenRatio);
    return applyConcurrencyDelay(tokenAdjustedTime, concurrency);
  }, [model, inputTokens, outputTokens, responseTime, concurrency]);

  const modelsByCategory = getModelsByCategory();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: COLORS.night, 
      color: COLORS.cloud, 
      fontFamily: FONTS.sans,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${COLORS.border}`,
        padding: 'clamp(1rem, 0.82rem + 0.76vw, 1.5rem) 0',
      }}>
        <Container>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.moss}, ${COLORS.spruce})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}>
              🌿
            </div>
            <span style={{
              fontFamily: FONTS.sans,
              fontWeight: 600,
              fontSize: '1.125rem',
              color: COLORS.peak,
            }}>
              Berget AI
            </span>
          </div>
        </Container>
      </header>

      <Container>
        <Stack gap={8} style={{ padding: 'clamp(2.5rem, 1.96rem + 2.29vw, 4rem) 0' }}>
          {/* Hero Section */}
          <div>
            <Badge variant="moss">CO₂ Impact Calculator</Badge>
            <h1 style={{ 
              fontFamily: FONTS.serif,
              fontSize: 'clamp(1.875rem, 0.714rem + 4.76vw, 5rem)',
              fontWeight: 400,
              lineHeight: 1.5,
              color: COLORS.peak,
              margin: '1rem 0 0.5rem',
              letterSpacing: '-0.01em',
            }}>
              AI Carbon Footprint
            </h1>
            <p style={{ 
              fontSize: '1.125rem',
              lineHeight: 1.6,
              color: COLORS.muted,
              maxWidth: '600px',
              margin: 0,
            }}>
              Estimate the environmental impact of AI inference with production-calibrated data. 
              Compare models, hardware, and energy grids.
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', 
            gap: 'clamp(1.5rem, 1.14rem + 1.52vw, 2.5rem)' 
          }}>
            {/* Controls */}
            <Stack gap={6}>
              <Card>
                <h2 style={{ 
                  fontFamily: FONTS.serif,
                  fontSize: 'clamp(1.25rem, 1.16rem + 0.38vw, 1.5rem)',
                  fontWeight: 400,
                  color: COLORS.moss,
                  marginTop: 0,
                  marginBottom: '1.5rem',
                  lineHeight: 1.5,
                }}>
                  Model & Workload
                </h2>
                
                <Stack gap={4}>
                  <Select value={modelId} onValueChange={(value) => {
                    setModelId(value);
                    const m = MODEL_PROFILES[value];
                    if (m) {
                      setInputTokens(m.defaultInputTokens);
                      setOutputTokens(m.defaultOutputTokens);
                      setResponseTime(m.defaultResponseTimeSeconds);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelsByCategory.text.map((m) => (
                        <SelectItem key={m.modelId} value={m.modelId}>{m.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Slider 
                    label="Input Tokens" 
                    value={inputTokens} 
                    onValueChange={(value) => setInputTokens(value)} 
                    min={1} 
                    max={32000} 
                    step={64} 
                    displayValue={String(inputTokens)} 
                  />
                  <Slider 
                    label="Output Tokens" 
                    value={outputTokens} 
                    onValueChange={(value) => setOutputTokens(value)} 
                    min={1} 
                    max={8000} 
                    step={32} 
                    displayValue={String(outputTokens)} 
                  />
                </Stack>
              </Card>
              
              <Card>
                <h2 style={{ 
                  fontFamily: FONTS.serif,
                  fontSize: 'clamp(1.25rem, 1.16rem + 0.38vw, 1.5rem)',
                  fontWeight: 400,
                  color: COLORS.moss,
                  marginTop: 0,
                  marginBottom: '1.5rem',
                  lineHeight: 1.5,
                }}>
                  Infrastructure
                </h2>
                
                <Stack gap={4}>
                  <Select value={hardwareKey} onValueChange={setHardwareKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hardware" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(HARDWARE_CONFIGS).map(([key, hw]) => (
                        <SelectItem key={key} value={key}>{hw.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={deploymentGridKey} onValueChange={setDeploymentGridKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grid region" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GRID_REGIONS).map(([key, g]) => (
                        <SelectItem key={key} value={key}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Slider 
                    label="Hour of Day" 
                    value={hourOfDay} 
                    onValueChange={(value) => {
                      setHourOfDay(value);
                      // Auto-adjust concurrency based on traffic pattern
                      setConcurrency(getConcurrencyFromTrafficPattern(value));
                    }} 
                    min={0} 
                    max={23} 
                    step={1} 
                    displayValue={`${String(hourOfDay).padStart(2, '0')}:00`} 
                  />
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: COLORS.muted,
                    padding: '0.5rem 0',
                  }}>
                    <span>Estimated load:</span>
                    <Badge variant="moss">{concurrency} concurrent requests</Badge>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      (auto from traffic pattern)
                    </span>
                  </div>
                  
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: COLORS.muted,
                  }}>
                    <input 
                      type="checkbox" 
                      checked={includeTraining} 
                      onChange={(e) => setIncludeTraining(e.target.checked)}
                      style={{ accentColor: COLORS.moss }}
                    />
                    Include training CO₂ amortization
                  </label>
                </Stack>
              </Card>
            </Stack>
            
            {/* Results */}
            <div>
              {result && comparisons && (
                <Stack gap={6}>
                  {/* Main Result Card */}
                  <Card style={{
                    background: `linear-gradient(135deg, rgba(82, 183, 136, 0.1), rgba(26, 26, 26, 0.4))`,
                    borderColor: 'rgba(82, 183, 136, 0.3)',
                  }}>
                    <h2 style={{ 
                      fontFamily: FONTS.serif,
                      fontSize: 'clamp(1.25rem, 1.16rem + 0.38vw, 1.5rem)',
                      fontWeight: 400,
                      color: COLORS.moss,
                      marginTop: 0,
                      marginBottom: '1.5rem',
                    }}>
                      Carbon Impact
                    </h2>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '1rem',
                      marginBottom: '2rem',
                    }}>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '1.5rem 1rem',
                        background: 'rgba(10, 10, 10, 0.6)',
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ 
                          fontSize: 'clamp(1.5rem, 1.2rem + 1.2vw, 2.5rem)', 
                          fontWeight: 700, 
                          color: COLORS.moss,
                          fontFamily: FONTS.mono,
                          lineHeight: 1.2,
                        }}>
                          {result.totalCO2Grams.toFixed(4)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.5rem' }}>
                          g CO₂e
                        </div>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '1.5rem 1rem',
                        background: 'rgba(10, 10, 10, 0.6)',
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ 
                          fontSize: 'clamp(1.5rem, 1.2rem + 1.2vw, 2.5rem)', 
                          fontWeight: 700, 
                          color: COLORS.moss,
                          fontFamily: FONTS.mono,
                          lineHeight: 1.2,
                        }}>
                          {adjustedResponseTime.toFixed(2)}s
                        </div>
                        <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.5rem' }}>
                          Adjusted GPU time
                        </div>
                        <div style={{ fontSize: '0.625rem', color: COLORS.muted, marginTop: '0.25rem', opacity: 0.6 }}>
                          Base: {responseTime.toFixed(1)}s
                        </div>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '1.5rem 1rem',
                        background: 'rgba(10, 10, 10, 0.6)',
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ 
                          fontSize: 'clamp(1.25rem, 1rem + 1vw, 2rem)', 
                          fontWeight: 700, 
                          color: COLORS.moss,
                          lineHeight: 1.2,
                        }}>
                          {concurrency}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.5rem' }}>
                          Concurrent requests
                        </div>
                        <div style={{ fontSize: '0.625rem', color: COLORS.muted, marginTop: '0.25rem', opacity: 0.6 }}>
                          Auto from traffic pattern
                        </div>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '1.5rem 1rem',
                        background: 'rgba(10, 10, 10, 0.6)',
                        borderRadius: RADIUS.sm,
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ 
                          fontSize: 'clamp(1.25rem, 1rem + 1vw, 2rem)', 
                          fontWeight: 700, 
                          color: COLORS.moss,
                          lineHeight: 1.2,
                        }}>
                          {deploymentGrid.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.5rem' }}>
                          {deploymentGrid.intensityGPerKwh} g/kWh
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Breakdown Card */}
                  <Card>
                    <h3 style={{ 
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: COLORS.moss,
                      marginBottom: '1rem',
                      fontWeight: 600,
                    }}>
                      Component Breakdown
                    </h3>
                    
                    <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                      <tbody>
                        {[
                          { label: 'GPU energy', value: result.components.gpuOperational.co2Grams },
                          { label: 'Server infrastructure', value: result.components.serverOperational.co2Grams },
                          { label: 'Datacenter overhead', value: result.components.datacenterOverhead.co2Grams },
                          { label: 'Hardware embodied', value: result.components.embodied.co2Grams },
                          ...(includeTraining ? [{ label: 'Training CO₂', value: result.components.trainingAmortised.co2Grams }] : []),
                        ].map((item, i, arr) => (
                          <tr key={item.label} style={{
                            borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                          }}>
                            <td style={{ padding: '0.75rem 0', color: COLORS.muted }}>{item.label}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontFamily: FONTS.mono }}>
                              {item.value.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight: 'bold' }}>
                          <td style={{ 
                            padding: '1rem 0', 
                            borderTop: `2px solid ${COLORS.moss}`,
                            color: COLORS.peak,
                          }}>
                            Total
                          </td>
                          <td style={{ 
                            padding: '1rem 0', 
                            borderTop: `2px solid ${COLORS.moss}`,
                            textAlign: 'right', 
                            color: COLORS.moss, 
                            fontSize: '1.125rem',
                            fontFamily: FONTS.mono,
                          }}>
                            {result.totalCO2Grams.toFixed(4)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Card>

                  {/* Comparisons Card */}
                  <Card>
                    <h3 style={{ 
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: COLORS.moss,
                      marginBottom: '1rem',
                      fontWeight: 600,
                    }}>
                      Everyday Equivalent
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { icon: '☕', label: 'Microwave', value: fmtTime(comparisons.microwaveSeconds), sub: referenceGrid.name },
                        { icon: '💡', label: 'LED bulb', value: fmtTime(comparisons.ledBulbSeconds), sub: referenceGrid.name },
                        { icon: '🚗', label: 'Car', value: `${comparisons.carKm.toFixed(3)} km`, sub: null },
                        { icon: '📱', label: 'Phone', value: `${comparisons.phoneChargePercent.toFixed(2)}%`, sub: null },
                      ].map((item) => (
                        <div key={item.label} style={{
                          padding: '1rem',
                          background: 'rgba(10, 10, 10, 0.6)',
                          borderRadius: RADIUS.sm,
                          border: `1px solid ${COLORS.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.875rem', color: COLORS.peak }}>
                              {item.label}: <strong style={{ color: COLORS.moss }}>{item.value}</strong>
                            </div>
                            {item.sub && (
                              <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.25rem' }}>
                                ({item.sub})
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Stack>
              )}
            </div>
          </div>
        </Stack>
      </Container>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: '2rem 0',
        marginTop: 'auto',
      }}>
        <Container>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
            color: COLORS.muted,
          }}>
            <span>© 2025 Berget AI. All rights reserved.</span>
            <span>Methodology based on MLCommons Power Benchmark</span>
          </div>
        </Container>
      </footer>
    </div>
  );
}
