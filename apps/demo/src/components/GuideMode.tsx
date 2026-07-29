import { BookOpen, Calculator, Code, Globe, Wrench } from "lucide-react";
import { CategoryModelPicker } from "./CategoryModelPicker";
import { RegionPicker } from "./RegionPicker";
import { TrainingExplorer } from "./TrainingExplorer";
import { HardwarePicker } from "./HardwarePicker";
import { ResultsPanel } from "./ResultsPanel";
import { ApiResponseBlock } from "./ApiResponseBlock";
import { C, prose } from "./shared";
import type { CalculatorActions, CalculatorDerived, CalculatorState } from "./types";

interface GuideProps {
  state: CalculatorState;
  actions: CalculatorActions;
  derived: CalculatorDerived;
  modelsLoading: boolean;
  modelsError: string | null;
  hasFetchedData: boolean;
  onRefreshModels: () => void;
  onModelSelect: (id: string) => void;
  onOpenCalculator: () => void;
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: "4rem", scrollMarginTop: "4rem" }}>
      {children}
    </section>
  );
}

function InteractiveFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: `1px solid ${C.borderHover}`,
        borderRadius: 12,
        padding: "1.25rem",
        marginTop: "1.5rem",
        marginBottom: "1.5rem",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      <div
        style={{
          fontSize: "0.65rem",
          fontWeight: 600,
          color: C.moss,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "1rem",
        }}
      >
        Interactive — {label}
      </div>
      {children}
    </div>
  );
}

export function GuideMode({
  state,
  actions,
  derived,
  modelsLoading,
  modelsError,
  hasFetchedData,
  onRefreshModels,
  onModelSelect,
  onOpenCalculator,
}: GuideProps) {
  const { category, model, grid, result, modelComparisons, modelCategories } = derived;

  return (
    <article>
      {/* ═══ HERO — start with the evidence ═══ */}
      <header style={{ marginBottom: "3.5rem", marginTop: "1rem" }}>
        <div style={prose.kicker}>A call to action</div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
            fontWeight: 800,
            color: C.peak,
            lineHeight: 1.15,
            marginBottom: "1rem",
            letterSpacing: "-0.02em",
          }}
        >
          Stop hiding the CO₂ emissions from AI inference.
        </h1>
        <p style={{ ...prose.p, fontSize: "1.125rem" }}>
          This is what transparency looks like. We share our full methodology and code — so the industry can be more
          responsible, and users can be more informed.
        </p>

        {/* The live JSON */}
        <div
          style={{
            border: `1px solid ${C.borderMoss}`,
            borderRadius: 12,
            padding: "1.25rem",
            marginTop: "1.75rem",
            background: C.ghost,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Code size={16} strokeWidth={1.5} style={{ color: C.moss }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak }}>
              Every Berget AI response carries its footprint
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.65rem",
                padding: "0.15rem 0.5rem",
                borderRadius: 4,
                background: "rgba(96,165,128,0.15)",
                color: C.moss,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Live
            </span>
          </div>
          <ApiResponseBlock result={result} model={model} selectedModel={state.selectedModel} highlightKey="co2" />
        </div>

        <p style={{ ...prose.p, marginTop: "1.5rem" }}>
          Every number in that response has a story. Below, we walk through exactly where each one comes from — and you
          can change the assumptions as you read.{" "}
          <button
            onClick={onOpenCalculator}
            style={{
              background: "none",
              border: "none",
              color: C.moss,
              cursor: "pointer",
              fontSize: "inherit",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Or skip straight to the calculator →
          </button>
        </p>
      </header>

      {/* ═══ THE PROBLEM ═══ */}
      <Section id="the-problem">
        <div style={prose.kicker}>The problem</div>
        <h2 style={prose.h2}>You can't choose what you can't compare</h2>
        <p style={prose.p}>
          AI's environmental footprint is real, and our industry has a responsibility to own it. But responsibility
          starts with measurement. Today, a developer choosing between two models or two providers has no way to compare
          their climate impact — not because the physics is unknowable, but because almost nobody publishes the numbers.
        </p>
        <p style={prose.p}>
          And when numbers do appear, they're calculated differently every time. Without a shared methodology, anyone
          can pick the boundary that makes them look best. Comparability isn't a nice-to-have; it's the whole game.
        </p>
        <p style={prose.p}>
          That's why we built this: an open attempt to both simplify and standardize the calculation. And just as every
          API response already reports tokens, we believe it should report CO₂ — as close to the true cost as physics
          allows. Here's how we do it.
        </p>
      </Section>

      {/* ═══ §1 MODEL ═══ */}
      <Section id="the-model">
        <div style={prose.kicker}>§1 · Where the numbers come from</div>
        <h2 style={prose.h2}>It starts with a model</h2>
        <p style={prose.p}>
          A larger model does more work per query: more parameters means more floating-point operations, more GPU time,
          more energy. The first input to the calculation is simply <em>which model are you running?</em> Pick one below
          and watch the JSON at the top — and the running total in the footer — update.
        </p>
        <InteractiveFrame label="pick a model">
          <CategoryModelPicker
            modelCategory={state.modelCategory}
            selectedModel={state.selectedModel}
            modelCategories={modelCategories}
            onCategoryChange={actions.setModelCategory}
            onModelSelect={onModelSelect}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            hasFetchedData={hasFetchedData}
            onRefresh={onRefreshModels}
          />
        </InteractiveFrame>
      </Section>

      {/* ═══ §2 LOCATION ═══ */}
      <Section id="the-location">
        <div style={prose.kicker}>§2 · Where the numbers come from</div>
        <h2 style={prose.h2}>Location, location, location</h2>
        <p style={prose.p}>
          The same GPU doing the same work can emit 50× more CO₂ depending on where it sits. Sweden's grid runs on hydro
          and nuclear at roughly 8 g CO₂/kWh; a gas-and-coal-heavy grid can exceed 400 g. Climate matters too: cold
          regions cool their datacenters with outside air (PUE 1.15), while hot regions burn energy on mechanical
          cooling (PUE 1.80) — and evaporate millions of liters of water doing it.
        </p>
        <p style={prose.p}>Click around the globe. The difference is not a rounding error — it's the single biggest lever we have.</p>
        <InteractiveFrame label="pick a region">
          <RegionPicker region={state.region} onRegionSelect={actions.setRegion} />
        </InteractiveFrame>
      </Section>

      {/* ═══ §3 TRAINING ═══ */}
      <Section id="the-training">
        <div style={prose.kicker}>§3 · Where the numbers come from</div>
        <h2 style={prose.h2}>The one-time cost of training</h2>
        <p style={prose.p}>
          Before a model answers its first prompt, it has already emitted a large, fixed amount of CO₂ during training.
          We don't ignore that cost — we amortize it: total training emissions divided by the number of queries the
          model serves over its lifetime. That's why a heavily-used model can have a <em>smaller</em> per-query training
          cost than a cheaper-to-train but rarely-used one.
        </p>
        <InteractiveFrame label="explore training amortization">
          <TrainingExplorer
            model={model}
            result={result}
            lifetimeQueries={state.lifetimeQueries}
            includeTraining={state.includeTraining}
            onIncludeTrainingChange={actions.setIncludeTraining}
            modelComparisons={modelComparisons}
            selectedModel={state.selectedModel}
            onModelSelect={(id, lq) => {
              onModelSelect(id);
              actions.setLifetimeQueries(lq);
            }}
          />
        </InteractiveFrame>
      </Section>

      {/* ═══ §4 HARDWARE ═══ */}
      <Section id="the-hardware">
        <div style={prose.kicker}>§4 · Where the numbers come from</div>
        <h2 style={prose.h2}>Hardware has a history</h2>
        <p style={prose.p}>
          Manufacturing a GPU embodies roughly a ton of CO₂ before it ever computes anything. New hardware amortizes
          that cost over its lifetime; refurbished hardware carries zero embodied carbon, because those emissions are
          already spent. Utilization matters too — the more queries share a server, the smaller each query's share of
          the infrastructure.
        </p>
        <InteractiveFrame label="configure hardware">
          <HardwarePicker
            gpuCondition={state.gpuCondition}
            otherComputeCondition={state.otherComputeCondition}
            concurrency={state.concurrency}
            onGpuConditionChange={actions.setGpuCondition}
            onOtherComputeConditionChange={actions.setOtherComputeCondition}
            onConcurrencyChange={actions.setConcurrency}
          />
        </InteractiveFrame>
      </Section>

      {/* ═══ §5 TOGETHER ═══ */}
      <Section id="the-total">
        <div style={prose.kicker}>§5 · Where the numbers come from</div>
        <h2 style={prose.h2}>Putting it all together</h2>
        <p style={prose.p}>
          Add operational energy, datacenter overhead, embodied hardware and (optionally) amortized training — and you
          get the number at the top of this page. Small per query, but multiplied by billions of queries, it becomes
          very real. That's exactly why it belongs in every response.
        </p>
        {result && (
          <InteractiveFrame label="the full breakdown">
            <ResultsPanel
              result={result}
              model={model}
              grid={grid}
              lifetimeQueries={state.lifetimeQueries}
              includeTraining={state.includeTraining}
              onIncludeTrainingChange={actions.setIncludeTraining}
            />
          </InteractiveFrame>
        )}
      </Section>

      {/* ═══ §6 THE ASK ═══ */}
      <Section id="the-standard">
        <div style={prose.kicker}>The standard we propose</div>
        <h2 style={prose.h2}>Adopt this. Demand this.</h2>
        <p style={prose.p}>
          If you build on AI APIs: ask your provider for <code>co2_grams</code> in every response. If you provide them:
          the method and the code above are open — use them, scrutinize them, improve them. Consumers can only make
          responsible choices when the numbers are on the table.
        </p>

        <div
          style={{
            background: "rgba(96, 165, 128, 0.08)",
            borderRadius: 12,
            padding: "1.5rem",
            border: `1px solid ${C.borderMoss}`,
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Globe size={24} strokeWidth={1.5} style={{ color: C.moss }} />
            <span style={{ fontWeight: 600, color: C.peak, fontSize: "1.125rem" }}>Include CO₂ in Every Response</span>
          </div>
          <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0, marginBottom: "1rem" }}>
            Just like Berget AI does — return{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
              co2_grams
            </code>{" "}
            and{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
              gpu_energy_joules
            </code>{" "}
            in your API responses. Your users deserve to know the environmental cost of each request.
          </p>
          <ApiResponseBlock result={result} model={model} selectedModel={state.selectedModel} highlightKey="co2" />
        </div>

        {/* Library code */}
        <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
            <Wrench size={16} strokeWidth={1.5} style={{ marginRight: "0.5rem" }} /> Use this library
          </div>
          <pre
            style={{
              margin: 0,
              padding: "0.75rem",
              background: "rgba(0,0,0,0.5)",
              borderRadius: 6,
              fontSize: "0.75rem",
              overflow: "auto",
              color: C.cloud,
            }}
          >
{`import { calculateInference } from "@berget/co2-calculator";

const result = calculateInference({
  modelProfile: MODEL_PROFILES["${state.selectedModel}"],
  hardware: HARDWARE_CONFIGS.h200,
  deploymentGrid: GRID_REGIONS["${state.region}"],
  measuredResponseTimeSeconds: ${category.responseTime},
  inputTokens: ${model?.defaultInputTokens},
  outputTokens: ${model?.defaultOutputTokens},
  concurrency: ${state.concurrency},
  hourOfDay: 14,
  includeTraining: true,
  lifetimeQueries: ${state.lifetimeQueries.toLocaleString()},
});

// Total: ${result ? (result.totalCO2Grams < 1 ? (result.totalCO2Grams * 1000).toFixed(1) + " mg" : result.totalCO2Grams.toFixed(1) + " g") : "—"} CO₂e per request`}
          </pre>
        </div>

        {/* Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <a
            href="https://github.com/berget-ai/co2-emissions-calculator"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem",
              background: C.ghost,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              color: C.cloud,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            <Code size={18} strokeWidth={1.5} />
            <span>GitHub Repository</span>
          </a>
          <a
            href="https://berget.ai/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem",
              background: C.ghost,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              color: C.cloud,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            <Globe size={18} strokeWidth={1.5} />
            <span>Berget AI Docs</span>
          </a>
        </div>
      </Section>
    </article>
  );
}

// Re-export icons used by the header toggle for convenience
export { BookOpen, Calculator };
