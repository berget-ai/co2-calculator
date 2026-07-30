import { Code, Globe, Wrench } from "lucide-react";
import { CategoryModelPicker } from "./CategoryModelPicker";
import { RegionPicker } from "./RegionPicker";
import { HardwarePicker } from "./HardwarePicker";
import { ConcurrencyTimeExplorer } from "./ConcurrencyTimeExplorer";
import { ConcurrencyChart } from "./ConcurrencyChart";
import { DailyLoadChart } from "./DailyLoadChart";
import { ResultsPanel } from "./ResultsPanel";
import { ApiResponseBlock } from "./ApiResponseBlock";
import { MethodPanel } from "./MethodPanel";
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
}: GuideProps) {
  const { category, model, grid, result, modelCategories } = derived;

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
          Stop hiding the CO₂ emissions from AI.
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
          can change the assumptions as you read.
        </p>
      </header>

      {/* ═══ THE PROBLEM ═══ */}
      <Section id="the-problem">
        <div style={prose.kicker}>The problem</div>
        <h2 style={prose.h2}>Your users can't choose what they can't compare</h2>
        <p style={prose.p}>
          AI's environmental footprint is real, and our industry has a responsibility to own it. But responsibility
          starts with measurement. Today, a developer choosing between two models or two providers has no way to compare
          their climate impact — not because the physics is unknowable, but because almost nobody publishes the numbers.
          And when numbers do appear, they're calculated differently every time, so anyone can pick the boundary that
          makes them look best. Comparability isn't a nice-to-have; it's the whole game.
        </p>
        <p style={prose.p}>
          That's why we built this: an open attempt to both simplify and standardize the calculation. Just as every API
          response already reports tokens, we believe it should report CO₂ — as close to the true cost as physics
          allows. Here's how we do it.
        </p>
        <MethodPanel
          assumptions={[
            "System boundary: the consumer side of inference — operational energy, datacenter overhead and hardware. Training is excluded (see below).",
            "Network transmission and the end-user's device are out of scope.",
          ]}
          reasoning="We follow the Green Software Foundation's SCI-AI specification and adopt its 'consumer' boundary. We deliberately exclude model training: the underlying figures are self-reported, vary by ±50%, and would dominate the per-query number while being the least verifiable part. We prefer a smaller number we can defend over a bigger one we can't."
          sources={[
            { label: "Green Software Foundation — Software Carbon Intensity for AI (SCI-AI) Specification v2.0", url: "https://sci.greensoftware.foundation/" },
            { label: "Full methodology document (METHODOLOGY.md), reviewed by the Stockholm Environment Institute", url: "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md" },
          ]}
        />
      </Section>

      {/* ═══ §1 MODEL & USE CASE ═══ */}
      <Section id="the-model">
        <div style={prose.kicker}>§1 · Where the numbers come from</div>
        <h2 style={prose.h2}>First, choose a model and a type of usage</h2>
        <p style={prose.p}>
          Every calculation needs a concrete starting point: a workload. We can't reason about "AI's footprint" in the
          abstract — only about a specific model doing a specific job. So the example below asks you to supply one:
          pick the use case closest to yours, then a model. A quick chat reply and a long code analysis are very
          different jobs, and the model you choose sets the scale of the work. Watch the JSON at the top — and the
          running total in the footer — update as you change it.
        </p>
        <InteractiveFrame label="pick a model and use case">
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
        <p style={prose.p}>
          Under the hood, though, the model is mostly a means to an end. What the footprint really comes down to is
          simpler: <strong>how many seconds your query occupies the infrastructure, and how many other users share it at
          the same time.</strong> Everything else — model size, context length, caching — is just a means to estimate
          that one number: GPU-seconds per query.
        </p>
        <p style={prose.p}>
          Size sets the floor: a model must fit in GPU memory (weights, plus ~20% for the KV cache), so a trillion-parameter
          model occupies several GPUs at once while a small quantized one fits on a single card. Context length and cache
          then stretch or shrink the time: long prompts mean more tokens and a growing KV cache, while a cached prefix
          lets the model skip most of that work. And concurrency decides how many queries split the fixed cost of the
          servers. Try it — here's roughly how long your request occupies the GPU, and how sharing the node changes it.
        </p>
        <InteractiveFrame label="request length & sharing">
          <ConcurrencyTimeExplorer
            category={category}
            model={model}
            concurrency={state.concurrency}
            onConcurrencyChange={actions.setConcurrency}
          />
        </InteractiveFrame>
        <p style={prose.p}>
          This is also the quiet case for <strong>shared infrastructure over a server of your own.</strong> If you ran
          this model on an on-prem box, it would sit nearly idle most of the day — yet the servers, cooling and
          networking would draw power around the clock, and their entire manufacturing footprint would land on your
          queries alone. On a shared node those fixed costs are split across everyone using it, which is why a busy
          shared GPU usually beats a private one that mostly waits. The catch: each extra concurrent user also queues
          behind the others, so every query occupies the GPU a little longer — and since the GPU's own manufacturing
          cost is billed per GPU-second, that part creeps up as sharing grows.
        </p>
        <InteractiveFrame label="shared vs solo — the concurrency trade-off">
          <ConcurrencyChart
            category={category}
            model={model}
            grid={grid}
            concurrency={state.concurrency}
            gpuCondition={state.gpuCondition}
            otherComputeCondition={state.otherComputeCondition}
          />
        </InteractiveFrame>
        <p style={prose.p}>
          How deep the dip is depends on how much of your stack is shareable at all: choose brand-new infrastructure in
          §3 and the shared (orange) part grows, making the middle sag more; with mostly-embodied hardware the curve
          stays fairly flat. There's no single "right" utilization — only a trade-off you can now see.
        </p>
        <p style={prose.p}>
          The second dimension is <strong>time.</strong> A typical day is busy around midday and quiet at night, and
          the grid's carbon intensity follows: the marginal electricity at peak hours is dirtier than off-peak. We
          model this with a day factor of ×1.15 and a night factor of ×0.7 — deliberately asymmetric, so that over a
          full 24-hour cycle the daytime overestimate "pays for" the night-time underestimate and the long-run total
          lands at about +2% (conservative, not optimistic). The upshot for you:{" "}
          <em>moving a call to the night genuinely lowers its CO₂</em> — roughly 30% — because the cleaner off-peak mix
          is real, not an accounting trick. And underneath it all, the GPUs aren't assumed to run hot around the clock:
          an idle card sits in a low-power state, drawing only its idle watts until a query actually arrives.
        </p>
        <InteractiveFrame label="a typical day — usage and CO₂ by hour">
          <DailyLoadChart />
        </InteractiveFrame>
        <MethodPanel
          assumptions={[
            "We treat GPU-seconds per query as the fundamental unit: everything else (model size, context, cache) is a means to estimate it.",
            "A KV cache and activations add ~20% memory overhead on top of the raw model weights.",
            "Cached prompts are modeled as cheaper, because re-processing a cached prefix is mostly skipped.",
            "Request length scales sub-linearly with tokens (√token ratio) and grows slightly with concurrency (logarithmic delay above 8 concurrent users).",
            "Server, cooling and shared-infra costs are divided by concurrency (sharing wins); GPU energy and GPU embodied carbon scale with the longer GPU-time (queueing loses). The net curve depends on how much of the stack is shareable — nearly flat when embodied hardware dominates, deeper-dipping when infrastructure is new.",
            "Time-of-day: peak ×1.15 (day) and low ×0.7 (night) are asymmetric on purpose — weighted over 24h they net to ≈+2%, so the daytime overestimate finances the night-time underestimate plus a small conservative margin. Running at night genuinely emits less CO₂ (cleaner off-peak marginal mix), ~30% lower per query.",
            "Idle GPUs are modeled in a low-power state (idle watts), not at peak draw — only the active query time adds incremental power (25% of the idle→peak span).",
            "Model parameters and usage figures are refreshed from public sources (EcoLogits, Hugging Face, OpenRouter).",
          ]}
          reasoning="Rather than inventing per-model energy figures, we lean on published model cards and independent measurement projects, then scale by the actual time a query occupies the GPU. Two models of the same size can still differ — architecture, quantization and serving efficiency matter — so we treat per-model data as the best available estimate, not ground truth."
          sources={[
            { label: "Rincé & Banse (2025) — EcoLogits: Evaluating the Environmental Impacts of Generative AI, JOSS 10(111)", url: "https://doi.org/10.21105/joss.07471" },
            { label: "Fu et al. (2024) — LLMCO2: Advancing Accurate Carbon Footprint Prediction for LLM Inferences, arXiv:2410.02950", url: "https://arxiv.org/abs/2410.02950" },
            { label: "OpenRouter model activity API (usage statistics)", url: "https://openrouter.ai/" },
          ]}
        />
      </Section>

      {/* ═══ §2 LOCATION ═══ */}
      <Section id="the-location">
        <div style={prose.kicker}>§2 · Where the numbers come from</div>
        <h2 style={prose.h2}>Location, location, location</h2>
        <p style={prose.p}>
          The same GPU doing the same work can emit 50× more CO₂ depending on where it sits. Sweden's grid runs on hydro
          and nuclear at roughly 8 g CO₂/kWh; a gas-and-coal-heavy grid can exceed 400 g.
        </p>
        <p style={prose.p}>
          Click around the globe. The difference is not a rounding error — it's the single biggest lever we have.
        </p>
        <InteractiveFrame label="pick a region">
          <RegionPicker region={state.region} onRegionSelect={actions.setRegion} />
        </InteractiveFrame>
        <p style={prose.p}>
          One more subtlety: <strong>when</strong> the query runs matters too. A grid's carbon intensity isn't constant
          over the day — demand and the available generation mix shift hour by hour. We handle this with a deliberate
          two-level approximation: a <em>peak-period factor</em> that scales the intensity up by ~15% during the day,
          and a <em>low-period factor</em> that scales it down to ~70% at night. It's a rough model, but it nudges the
          estimate in the right direction and avoids pretending the grid is flat. Throughout this page we show numbers
          for 14:00 — the peak, conservative case.
        </p>
        <MethodPanel
          assumptions={[
            "Grid carbon intensity is a regional yearly average, adjusted up (+15%) in peak periods and down (to 70%) in low-demand periods rather than modeled hour-by-hour.",
            "All figures on this page are shown for 14:00 (peak, conservative).",
          ]}
          reasoning="Carbon intensity is the single largest geographical factor, and it is well-documented. We use conservative figures: for Sweden we assume 8 g/kWh even though the fossil-free PPA mix is closer to 2.5 g, to account for transmission losses and lifecycle effects. For time-of-day we deliberately over-estimate during the day and under-estimate at night, so that on balance the approximation lands near — or slightly above — the truth. Where a region has several plausible values, we pick the higher one."
          sources={[
            { label: "IEA (2024) — Electricity Emissions Factors by Country", url: "https://www.iea.org/data-and-statistics" },
            { label: "EPA (2023) — eGRID Database", url: "https://www.epa.gov/egrid" },
          ]}
        />

        {/* ── Cooling sub-section ── */}
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: C.peak, marginTop: "3rem", marginBottom: "0.75rem" }}>
          Why cooling is its own line item
        </h3>
        <p style={prose.p}>
          Servers don't just consume power for computation — they consume power to get rid of the heat that computation
          generates. That overhead is captured by <strong>PUE (Power Usage Effectiveness)</strong>: the ratio of total
          facility energy to the energy that actually reaches the IT equipment. The lower the PUE, the less energy is
          wasted on overhead.
        </p>
        <p style={prose.p}>
          And this is where geography really bites. In a cold Nordic climate you can cool with outside air for most of
          the year — fans and filters, essentially — reaching a PUE around 1.15 with <em>zero water</em>. In a hot or
          humid climate that free lunch disappears: you need energy-intensive mechanical chillers, pushing PUE toward
          1.80, and the most common approach — evaporative cooling — consumes up to 2 liters of water per kWh. Same
          model, same query, but a datacenter in Texas can use ~57% more energy just staying cool, and drain a scarce
          water supply doing it. Cooling isn't a footnote; it's a first-order difference.
        </p>
        <MethodPanel
          assumptions={[
            "Cooling overhead (PUE) and water use are modeled from regional climate, not measured per-datacenter.",
            "Nordic free-air cooling is assumed to use no water (0.0 L/kWh); evaporative cooling in hot/dry climates uses up to ~2.0 L/kWh.",
            "PUE ranges from ~1.15 (free-air, Nordics/Quebec) to ~2.0 (extreme cooling, hot climates).",
          ]}
          reasoning="Cooling is both an energy and a water problem, and both scale with climate. We model it as a multiplier on top of IT energy (PUE) plus a water-per-kWh factor, using climate-typical values rather than claiming to know any specific facility's real-time efficiency. This keeps the estimate honest: cooling is significant, well-documented, and strongly regional — but it varies from one building to the next."
          sources={[
            { label: "Uptime Institute (2024) — Global Data Center Survey (PUE by region)", url: "https://uptimeinstitute.com/resources/research-and-reports" },
            { label: "Siddik et al. (2021) — The environmental footprint of data centers in the United States, Env. Res. Lett.", url: "https://doi.org/10.1088/1748-9326/ac8e40" },
          ]}
        />
      </Section>

      {/* ═══ §3 HARDWARE ═══ */}
      <Section id="the-hardware">
        <div style={prose.kicker}>§3 · Where the numbers come from</div>
        <h2 style={prose.h2}>Hardware has a history</h2>
        <p style={prose.p}>
          Every GPU carries the cost of its own manufacturing — and that cost is significant. We estimate roughly{" "}
          <strong>1,000 kg of CO₂ per datacenter GPU</strong> (and ~4,000 kg for the surrounding node: CPU, memory,
          storage, networking). The figures come from server-level life-cycle assessments by Dell and HPE, with the
          non-GPU components subtracted. New hardware amortizes that cost over its lifetime; refurbished hardware
          carries zero embodied carbon, because those emissions are already spent.
        </p>
        <p style={prose.p}>
          Model size decides how many GPUs a query needs. A small, quantized model fits on a single card; a
          trillion-parameter model has to be spread across several. And here's the part people miss:{" "}
          <strong>a smaller model can often run on older, humbler hardware.</strong> An older inference card like the
          NVIDIA L4 embodies only ~300 kg — a fraction of a flagship H200 — and because that hardware has already been
          in service for years, much of its manufacturing footprint is already amortized. Choosing a right-sized model
          on mature hardware can cut emissions dramatically before you've optimized anything else.
        </p>
        <InteractiveFrame label="configure hardware">
          <HardwarePicker
            gpuCondition={state.gpuCondition}
            otherComputeCondition={state.otherComputeCondition}
            onGpuConditionChange={actions.setGpuCondition}
            onOtherComputeConditionChange={actions.setOtherComputeCondition}
          />
        </InteractiveFrame>
        <MethodPanel
          assumptions={[
            "Embodied carbon is ~1,000 kg CO₂ per datacenter GPU and ~4,000 kg for the rest of the node (CPU, RAM, SSD, chassis, network), amortized over a 5-year lifetime and allocated per query by GPU-seconds.",
            "GPUs needed per model = model size × bytes/parameter × 1.2 (KV-cache overhead), divided by GPU memory — so larger models span more GPUs.",
            "Refurbished hardware is counted as zero embodied carbon — the manufacturing emissions are already spent.",
            "Per-GPU figures carry ±30–50% uncertainty: NVIDIA/AMD don't publish per-GPU LCAs, so we derive them from server-level reports.",
          ]}
          reasoning="Manufacturing dominates lifecycle emissions for datacenter hardware, so embodied carbon can't be ignored despite the uncertainty. We estimate it with life-cycle assessment: manufacturer product-carbon-footprint data at the server level, disaggregated per component. And because older hardware has already amortized much of its footprint, right-sizing a model to mature hardware is often the single biggest saving available."
          sources={[
            { label: "NVIDIA (2024) — HGX H100 Product Carbon Footprint Summary", url: "https://images.nvidia.com/aem-dam/Solutions/documents/HGX-H100-PCF-Summary.pdf" },
            { label: "Dell Technologies (2023) — Life Cycle Assessment of PowerEdge servers (R750: 2,181–3,880 kg embodied)" },
            { label: "Gupta et al. (2021) — Chasing Carbon: The Elusive Environmental Footprint of Computing, HPCA", url: "https://doi.org/10.1109/HPCA51647.2021.00076" },
            { label: "Boavizta — open-source IT hardware LCA tool", url: "https://www.boavizta.org/" },
          ]}
        />
      </Section>

      {/* ═══ §4 TOGETHER ═══ */}
      <Section id="the-total">
        <div style={prose.kicker}>§4 · Where the numbers come from</div>
        <h2 style={prose.h2}>Putting it all together</h2>
        <p style={prose.p}>
          Add operational energy, datacenter overhead and embodied hardware — and you get the number at the top of this
          page. Small per query, but multiplied by billions of queries, it becomes very real. That's exactly why it
          belongs in every response.
        </p>
        {result && (
          <InteractiveFrame label="the full breakdown">
            <ResultsPanel result={result} model={model} grid={grid} />
          </InteractiveFrame>
        )}
        <MethodPanel
          assumptions={[
            "The total is the sum of the components above — no hidden factors.",
            "Training is excluded throughout: provider figures are self-reported and vary by ±50%, so including them would make the headline number the least verifiable part of the result. We show only operational + hardware emissions, which we can stand behind.",
            "The coffee comparison anchors to an 800W microwave; the Germany contrast applies the grid ratio only to the energy part, since embodied hardware emissions are location-independent.",
            "Water usage reflects the cooling model for the selected region.",
          ]}
          reasoning="We'd rather show a number you can interrogate than one you have to trust. Every component is visible in the breakdown, every assumption is listed in these panels, and the full derivation is in the open methodology document. If a figure looks wrong, you can trace exactly where it came from."
          sources={[
            { label: "Full methodology document (METHODOLOGY.md), reviewed by the Stockholm Environment Institute", url: "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md" },
            { label: "Open-source calculator library (@berget/co2-calculator)", url: "https://github.com/berget-ai/co2-emissions-calculator" },
          ]}
        />
      </Section>

      {/* ═══ VERIFICATION ═══ */}
      <Section id="the-verification">
        <div style={prose.kicker}>Reality check</div>
        <h2 style={prose.h2}>How do we verify these numbers are correct?</h2>
        <p style={prose.p}>
          Models are only useful if they're checked against reality. Because Berget AI owns its own hardware and
          networking equipment — and isn't dependent on external cloud providers — we can measure, with high precision,
          how much CO₂ our infrastructure actually emits each day. That lets us compare the totals reported through our
          APIs against real, metered consumption, and validate our assumptions against the physical world.
        </p>
        <p style={prose.p}>
          Doing that reconciliation in real time is hard, though. A full month's total emissions only become clear after
          the fact, and they then have to be allocated back across every individual request made during that period. So
          we run this revision continuously, refining the model as the metered data comes in. And because most teams
          don't own their hardware the way we do, we share the code openly — so others can verify, adapt and improve it
          for their own circumstances.
        </p>
        <MethodPanel
          assumptions={[
            "Continuous reconciliation against metered consumption is more practical than real-time per-request verification.",
            "Monthly totals are allocated back across individual requests after the fact.",
            "Berget AI owns and operates its own hardware and networking, so true consumption is directly measurable.",
          ]}
          reasoning="The calculator is a model, and any model can drift. Owning the hardware means we don't have to trust a cloud provider's estimate — we can read the meters. The gap between reported and measured emissions tells us whether our assumptions (PUE, idle draw, utilization) hold, and lets us tighten them over time. Open-sourcing the method is the point: verification shouldn't require owning a datacenter."
          sources={[
            { label: "Open-source calculator library (@berget/co2-calculator)", url: "https://github.com/berget-ai/co2-emissions-calculator" },
            { label: "Full methodology document (METHODOLOGY.md), reviewed by the Stockholm Environment Institute", url: "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md" },
          ]}
        />
      </Section>

      {/* ═══ THE ASK ═══ */}
      <Section id="the-standard">
        <div style={prose.kicker}>The standard we propose</div>
        <h2 style={prose.h2}>Adopt this. Demand this.</h2>
        <p style={prose.p}>
          If you build on AI APIs: ask your provider for <code>co2_grams</code> in every response. If you provide them:
          the method and the code above are open — use them, scrutinize them, improve them. Your users can only make
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
