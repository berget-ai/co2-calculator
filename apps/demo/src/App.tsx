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
} from "@berget/co2-emissions-calculator";
import type { ModelProfile, HardwareConfig, GridRegion } from "@berget/co2-emissions-calculator";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@berget/ui";
import { Container, Stack } from "@berget/ui";
import { Slider, Select, Checkbox } from "./components";

function App() {
  // Form state
  const [modelId, setModelId] = useState<string>("meta-llama/Llama-3.1-8B-Instruct");
  const [hardwareKey, setHardwareKey] = useState<string>("h200");
  const [deploymentGridKey, setDeploymentGridKey] = useState<string>("sweden");
  const [referenceGridKey, setReferenceGridKey] = useState<string>("sweden");
  const [responseTime, setResponseTime] = useState<number>(1.2);
  const [concurrency, setConcurrency] = useState<number>(8);
  const [hourOfDay, setHourOfDay] = useState<number>(14);
  const [includeTraining, setIncludeTraining] = useState<boolean>(true);
  const [lifetimeQueries, setLifetimeQueries] = useState<number>(1_000_000_000);
  const [inputTokens, setInputTokens] = useState<number>(800);
  const [outputTokens, setOutputTokens] = useState<number>(400);

  // Derived
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
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="border-b border-[rgba(229,221,213,0.08)] bg-[rgba(26,26,26,0.6)] backdrop-blur-[12px]">
        <Container>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L28 9v14l-12 7L4 23V9l12-7z" stroke="#52B788" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="2" fill="#52B788" />
              </svg>
              <span className="font-semibold text-white text-lg">Berget AI</span>
            </div>
            <span className="bg-[rgba(82,183,136,0.15)] text-[#52B788] px-3 py-1 rounded-full text-xs font-semibold border border-[rgba(82,183,136,0.25)]">
              CO₂ Impact Calculator
            </span>
          </div>
        </Container>
      </header>

      <main className="py-12">
        <Container>
          <Stack direction="column" gap={8}>
            {/* Hero */}
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="font-['Ovo'] text-4xl md:text-5xl text-white mb-4">
                Calculate Your <span className="text-[#52B788]">AI Carbon Footprint</span>
              </h1>
              <p className="text-[rgba(229,221,213,0.75)] text-lg mb-6">
                Estimate the complete carbon footprint of a single AI inference query.
                Compare grid intensities, model sizes, and workload characteristics.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <span className="bg-[rgba(82,183,136,0.12)] text-[#52B788] border border-[rgba(82,183,136,0.2)] px-3 py-1.5 rounded-lg text-sm">
                  Scientifically Validated
                </span>
                <span className="bg-[rgba(15,64,90,0.3)] text-[#6ab0d6] border border-[rgba(15,64,90,0.4)] px-3 py-1.5 rounded-lg text-sm">
                  SCI-AI Compliant
                </span>
                <span className="bg-[rgba(82,183,136,0.12)] text-[#52B788] border border-[rgba(82,183,136,0.2)] px-3 py-1.5 rounded-lg text-sm">
                  Global Grids
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Controls */}
              <Stack direction="column" gap={6}>
                <Card variant="highlight">
                  <CardHeader>
                    <CardTitle>Model & Workload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack direction="column" gap={6}>
                      {/* Model */}
                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                          Model
                        </label>
                        <Select
                          value={modelId}
                          onChange={(e) => {
                            setModelId(e.target.value);
                            const m = MODEL_PROFILES[e.target.value];
                            if (m) {
                              setInputTokens(m.defaultInputTokens);
                              setOutputTokens(m.defaultOutputTokens);
                              setResponseTime(m.defaultResponseTimeSeconds);
                            }
                          }}
                        >
                          <optgroup label="Text Generation">
                            {modelsByCategory.text.map((m) => (
                              <option key={m.modelId} value={m.modelId}>
                                {m.displayName} · {fmtParams(m.parameters)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Embeddings">
                            {modelsByCategory.embedding.map((m) => (
                              <option key={m.modelId} value={m.modelId}>
                                {m.displayName} · {fmtParams(m.parameters)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Reranking">
                            {modelsByCategory.reranker.map((m) => (
                              <option key={m.modelId} value={m.modelId}>
                                {m.displayName} · {fmtParams(m.parameters)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Speech-to-Text">
                            {modelsByCategory.speech.map((m) => (
                              <option key={m.modelId} value={m.modelId}>
                                {m.displayName} · {fmtParams(m.parameters)}
                              </option>
                            ))}
                          </optgroup>
                        </Select>
                      </div>

                      {/* Tokens */}
                      <Slider
                        label="Input Tokens"
                        value={inputTokens}
                        onChange={setInputTokens}
                        min={1}
                        max={32000}
                        step={64}
                        displayValue={String(inputTokens)}
                      />
                      <Slider
                        label="Output Tokens"
                        value={outputTokens}
                        onChange={setOutputTokens}
                        min={1}
                        max={8000}
                        step={32}
                        displayValue={String(outputTokens)}
                      />
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="highlight">
                  <CardHeader>
                    <CardTitle>GPU Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack direction="column" gap={6}>
                      <Slider
                        label="Measured Response Time"
                        value={responseTime}
                        onChange={setResponseTime}
                        min={0.1}
                        max={30}
                        step={0.1}
                        displayValue={`${responseTime.toFixed(1)}s`}
                      />
                      <Slider
                        label="Concurrent Requests"
                        value={concurrency}
                        onChange={setConcurrency}
                        min={1}
                        max={64}
                        step={1}
                        displayValue={String(concurrency)}
                      />
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="highlight">
                  <CardHeader>
                    <CardTitle>Infrastructure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack direction="column" gap={6}>
                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                          Hardware
                        </label>
                        <Select value={hardwareKey} onChange={(e) => setHardwareKey(e.target.value)}>
                          {Object.entries(HARDWARE_CONFIGS).map(([key, hw]) => (
                            <option key={key} value={key}>
                              {hw.name} ({hw.gpuCount} GPUs)
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                          Deployment Grid
                        </label>
                        <Select value={deploymentGridKey} onChange={(e) => setDeploymentGridKey(e.target.value)}>
                          <optgroup label="100% Renewable / Nuclear">
                            {Object.entries(GRID_REGIONS).filter(([,g]) => g.intensityGPerKwh < 50).map(([key, g]) => (
                              <option key={key} value={key}>{g.fullLabel}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Mixed Grid">
                            {Object.entries(GRID_REGIONS).filter(([,g]) => g.intensityGPerKwh >= 50 && g.intensityGPerKwh < 600).map(([key, g]) => (
                              <option key={key} value={key}>{g.fullLabel}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Coal-Heavy">
                            {Object.entries(GRID_REGIONS).filter(([,g]) => g.intensityGPerKwh >= 600).map(([key, g]) => (
                              <option key={key} value={key}>{g.fullLabel}</option>
                            ))}
                          </optgroup>
                        </Select>
                      </div>

                      <Slider
                        label="Hour of Day"
                        value={hourOfDay}
                        onChange={setHourOfDay}
                        min={0}
                        max={23}
                        step={1}
                        displayValue={`${String(hourOfDay).padStart(2, '0')}:00`}
                      />

                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                          Comparison Grid (for energy equivalents)
                        </label>
                        <Select value={referenceGridKey} onChange={(e) => setReferenceGridKey(e.target.value)}>
                          {Object.entries(GRID_REGIONS).map(([key, g]) => (
                            <option key={key} value={key}>{g.name} · {g.intensityGPerKwh} g/kWh</option>
                          ))}
                        </Select>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                        <Checkbox
                          checked={includeTraining}
                          onChange={(e) => setIncludeTraining(e.target.checked)}
                        />
                        <label className="text-sm text-[hsl(var(--foreground))]">
                          Include training CO₂ (amortised)
                        </label>
                      </div>

                      <Slider
                        label="Expected Lifetime Queries"
                        value={Math.log10(lifetimeQueries)}
                        onChange={(v) => setLifetimeQueries(Math.round(Math.pow(10, v)))}
                        min={6}
                        max={12}
                        step={0.1}
                        displayValue={fmtNumber(lifetimeQueries)}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>

              {/* Right: Results */}
              <Stack direction="column" gap={6}>
                {result && comparisons && (
                  <>
                    {/* Main Results */}
                    <Card variant="solid">
                      <CardHeader>
                        <CardTitle>Carbon Impact</CardTitle>
                        <CardDescription>
                          {model?.displayName} · {fmtParams(model?.parameters || 0)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="text-center p-4 bg-[rgba(0,0,0,0.25)] rounded-xl">
                            <div className="text-3xl font-medium text-[#52B788] font-mono">
                              {result.totalCO2Grams.toFixed(4)}
                            </div>
                            <div className="text-xs text-[rgba(229,221,213,0.5)] mt-1 uppercase tracking-wider">
                              g CO₂e per query
                            </div>
                          </div>
                          <div className="text-center p-4 bg-[rgba(0,0,0,0.25)] rounded-xl">
                            <div className="text-3xl font-medium text-[#52B788] font-mono">
                              {responseTime.toFixed(1)}
                            </div>
                            <div className="text-xs text-[rgba(229,221,213,0.5)] mt-1 uppercase tracking-wider">
                              seconds
                            </div>
                            <div className="text-xs text-[rgba(229,221,213,0.4)]">GPU time</div>
                          </div>
                          <div className="text-center p-4 bg-[rgba(0,0,0,0.25)] rounded-xl">
                            <div className="text-2xl font-medium text-[#52B788] font-mono">
                              {deploymentGrid.name}
                            </div>
                            <div className="text-xs text-[rgba(229,221,213,0.5)] mt-1 uppercase tracking-wider">
                              {deploymentGrid.intensityGPerKwh} g/kWh
                            </div>
                            <div className="text-xs text-[rgba(229,221,213,0.4)]">deployment grid</div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b border-[rgba(229,221,213,0.06)]">
                            <span className="text-sm text-[rgba(229,221,213,0.85)]">
                              GPU energy ({hardware.name}, {Math.min(100, Math.round((responseTime / 10) * 100))}% util.)
                            </span>
                            <span className="font-mono text-[hsl(var(--foreground))]">
                              {result.components.gpuOperational.co2Grams.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-[rgba(229,221,213,0.06)]">
                            <span className="text-sm text-[rgba(229,221,213,0.85)]">
                              Server infrastructure ({hardware.formFactor})
                            </span>
                            <span className="font-mono text-[hsl(var(--foreground))]">
                              {result.components.serverOperational.co2Grams.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-[rgba(229,221,213,0.06)]">
                            <span className="text-sm text-[rgba(229,221,213,0.85)]">
                              Datacenter overhead (PUE {PUE})
                            </span>
                            <span className="font-mono text-[hsl(var(--foreground))]">
                              {result.components.datacenterOverhead.co2Grams.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-[rgba(229,221,213,0.06)]">
                            <span className="text-sm text-[rgba(229,221,213,0.85)]">
                              Hardware embodied (amortised)
                            </span>
                            <span className="font-mono text-[hsl(var(--foreground))]">
                              {result.components.embodied.co2Grams.toFixed(4)}
                            </span>
                          </div>
                          {includeTraining && (
                            <div className="flex justify-between items-center py-2 border-b border-[rgba(229,221,213,0.06)]">
                              <span className="text-sm text-[rgba(229,221,213,0.85)]">
                                Training CO₂ (amortised)
                              </span>
                              <span className="font-mono text-[hsl(var(--foreground))]">
                                {result.components.trainingAmortised.co2Grams.toFixed(4)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-3 border-t-2 border-[rgba(82,183,136,0.3)] mt-2">
                            <span className="text-base font-semibold text-white">
                              Total per query ({inputTokens + outputTokens} tokens)
                            </span>
                            <span className="font-mono text-[#52B788] text-lg font-semibold">
                              {result.totalCO2Grams.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Comparisons */}
                    <Card variant="highlight">
                      <CardHeader>
                        <CardTitle>Everyday Equivalent</CardTitle>
                        <CardDescription>
                          Per 1 request (shown as {referenceGrid.name} equivalent)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(139,69,19,0.2)] flex items-center justify-center text-xl">
                              ☕
                            </div>
                            <div>
                              <div className="text-sm text-[rgba(229,221,213,0.8)]">
                                Microwave for <strong className="text-white">{fmtTime(comparisons.microwaveSeconds)}</strong>
                              </div>
                              <div className="text-xs text-[rgba(229,221,213,0.5)]">({referenceGrid.name})</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(255,200,50,0.15)] flex items-center justify-center text-xl">
                              💡
                            </div>
                            <div>
                              <div className="text-sm text-[rgba(229,221,213,0.8)]">
                                LED bulb for <strong className="text-white">{fmtTime(comparisons.ledBulbSeconds)}</strong>
                              </div>
                              <div className="text-xs text-[rgba(229,221,213,0.5)]">({referenceGrid.name})</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(57,117,214,0.15)] flex items-center justify-center text-xl">
                              🚗
                            </div>
                            <div className="text-sm text-[rgba(229,221,213,0.8)]">
                              Car: <strong className="text-white">{comparisons.carKm.toFixed(3)} km</strong>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(82,183,136,0.15)] flex items-center justify-center text-xl">
                              📱
                            </div>
                            <div className="text-sm text-[rgba(229,221,213,0.8)]">
                              Phone charge: <strong className="text-white">{comparisons.phoneChargePercent.toFixed(2)}%</strong>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg col-span-2">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(207,255,139,0.12)] flex items-center justify-center text-xl">
                              ✈️
                            </div>
                            <div className="text-sm text-[rgba(229,221,213,0.8)]">
                              Flight: <strong className="text-white">{comparisons.flightPermille.toFixed(3)}‰</strong> of a short-haul
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-[rgba(82,183,136,0.08)] rounded-lg border border-[rgba(82,183,136,0.2)]">
                          <div className="text-sm">
                            <strong className="text-[#52B788]">
                              {deploymentGrid.name}: {result.effectiveIntensityGPerKwh} g/kWh
                            </strong>{" "}
                            → {result.totalCO2Grams.toFixed(4)} g CO₂e{" "}
                            <span className="text-[rgba(229,221,213,0.5)]">
                              (shown as {referenceGrid.name} equivalent)
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </Stack>
            </div>
          </Stack>
        </Container>
      </main>
    </div>
  );
}

export default App;
