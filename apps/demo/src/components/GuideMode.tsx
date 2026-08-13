import { Code, Globe, Wrench } from "lucide-react";
import { CategoryModelPicker } from "./CategoryModelPicker";
import { RegionPicker } from "./RegionPicker";
import { HardwarePicker } from "./HardwarePicker";
import { ConcurrencyTimeExplorer } from "./ConcurrencyTimeExplorer";
import { ConcurrencyChart } from "./ConcurrencyChart";
import { DailyLoadChart } from "./DailyLoadChart";
import { CoolingWaterChart } from "./CoolingWaterChart";
import { LeversDonut } from "./LeversDonut";
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
          We open source our CO₂ emissions — and so should you.
        </h1>
        <p style={{ ...prose.p, fontSize: "1.125rem" }}>
          There's real confusion about AI's emissions — and the reason is a lack of transparency. That responsibility
          doesn't sit with the person typing a prompt; it sits with the companies that choose where to run their
          servers, and the buyers who procure AI without asking. At Berget AI we've committed to full transparency
          about ours: every response reports its own CO₂. Now we're releasing our methods and code as open source, so
          the rest of the industry can do the same.
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
          <ApiResponseBlock result={result} model={model} selectedModel={state.selectedModel} region={state.region} highlightKey="co2" />
        </div>

        {/* TL;DR for decision-makers */}
        <div
          style={{
            border: `1px solid ${C.borderMoss}`,
            borderLeft: `4px solid ${C.moss}`,
            borderRadius: 10,
            padding: "1.25rem 1.5rem",
            marginTop: "1.75rem",
            background: C.ghost,
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: C.moss,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.75rem",
            }}
          >
            In short — if you buy or build on AI
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.15rem", color: C.peak, lineHeight: 1.6, fontSize: "0.95rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              The most important choice is the <strong>right model for the task</strong>. Reaching for an
              ever-larger model by default is the wrong path: a frontier model can emit roughly <strong>12× more CO₂
              per query</strong> than a specialised one that does the same job just as well — even on a clean grid.
              We need, collectively, to learn to use the specialised models.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              Choosing well is impossible without transparency. Teams building AI services need the numbers to
              evaluate the right model for each task on CO₂ — which is why our call to the industry is to include
              CO₂ in every response, like tokens.
            </li>
            <li>
              The same request can also emit 50× more CO₂ for the energy it burns, depending on where the servers sit
              — and almost no provider publishes the number. Below: the full method, from first principles.
            </li>
          </ul>
        </div>

        {/* The levers, at a glance */}
        <p style={{ ...prose.p, marginTop: "2rem" }}>
          When you procure AI, a handful of choices decide almost all of the footprint: where the servers run, which
          model you use, whether you share the hardware or run your own, how well its cache is tuned, and whether the
          hardware is new or refurbished. The ring below shows the span from the best to the worst option within each
          choice — computed live from our calculator, so it stays honest as we learn. The model you choose and the
          grid it runs on dwarf everything else.
        </p>
        <InteractiveFrame label="the levers — best to worst within each choice">
          <LeversDonut />
        </InteractiveFrame>
      </header>

      {/* ═══ THE PROBLEM ═══ */}
      <Section id="the-problem">
        <div style={prose.kicker}>The problem</div>
        <h2 style={prose.h2}>No one can hold AI accountable for numbers nobody publishes</h2>
        <p style={prose.p}>
          AI's environmental footprint is real, and the industry that builds it has a responsibility to measure and
          report it. Yet a buyer comparing two providers, or a team choosing between two models, has no way to compare
          their climate impact — not because the physics is unknowable, but because almost nobody publishes it.
        </p>
        <p style={prose.p}>
          And when numbers do appear, they're calculated differently every time, so anyone can draw the boundary that
          makes them look best. That isn't just an inconvenience; it's how accountability is avoided. Without
          comparability, there is nothing to hold anyone to.
        </p>
        <p style={prose.p}>
          Part of the problem is that the footprint is genuinely hard to wrap your head around. A single AI request
          depends on the model, where the server runs, the carbon mix of that grid, and even the time of day — too
          many moving parts for anyone to hold an intuition for, let alone compare two providers by hand. That's
          exactly why we don't just publish a formula: we track the CO₂ of every individual request, so the number is
          already there, the same way every time. The method below shows how.
        </p>
        <MethodPanel
          assumptions={[
            "System boundary: the consumer side of inference — operational energy, datacenter overhead and hardware. Training is excluded (see below).",
            "Network transmission and the end-user's device are out of scope.",
          ]}
          reasoning="We follow the Green Software Foundation's SCI-AI specification and adopt its 'consumer' boundary. We deliberately exclude model training: the underlying figures are self-reported, vary by ±50%, and would dominate the per-query number while being the least verifiable part. We prefer a smaller number we can defend over a bigger one we can't."
          sources={[
            { label: "Green Software Foundation — Software Carbon Intensity for AI (SCI-AI) Specification v2.0", url: "https://sci.greensoftware.foundation/" },
            { label: "Full methodology document (METHODOLOGY.md), with targeted comments from a researcher at the Stockholm Environment Institute", url: "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md" },
          ]}
        />
      </Section>

      {/* ═══ §1 MODEL & USE CASE ═══ */}
      <Section id="the-model">
        <div style={prose.kicker}>§1 · The workload</div>
        <h2 style={prose.h2}>The model you choose is the biggest lever you control</h2>
        <p style={prose.p}>
          Of all the choices behind an AI request, the model is the one that moves the footprint most — and the one
          most teams can change tomorrow. But to see that, we need a concrete workload: we can't talk about "AI's
          footprint" in the abstract, only about a specific model doing a specific job. So the example below asks you
          to supply one: pick the use case closest to yours, then a model. A quick chat reply and a long code analysis
          are very different jobs, and the model you choose sets the scale of the work. Watch the JSON at the top —
          and the running total in the footer — update as you change it.
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
        {/* Sentinel: when the model chip row scrolls out of view, a sticky clone pins to the top */}
        <div id="model-row-sentinel" style={{ height: 1 }} aria-hidden="true" />
        <p style={prose.p}>
          Under the hood, though, the model is mostly a means to an end. What the footprint really comes down to is
          simpler: <strong>how many seconds your query occupies the infrastructure, and how many other users share it at
          the same time.</strong> Everything else — model size, context length, caching — is just a means to estimate
          that one number: GPU-seconds per query.
        </p>
        <p style={prose.p}>
          Size sets the floor: a model must fit in GPU memory (weights, plus ~20% for the KV cache), so a trillion-parameter
          model occupies several GPUs at once while a small quantised one fits on a single card. Context length and cache
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
          The size of that lever is easy to underestimate. On our own infrastructure, the
          same short question answered by a large MoE frontier model (Kimi K3, 2.8T) comes out at roughly
          <strong> 300&nbsp;mg CO₂</strong>, where a specialised model that handles the task just as well (Gemma 4
          31B) comes out at <strong> 25&nbsp;mg</strong> — about a <strong>12×</strong> gap, on the same clean Swedish
          grid. A cleaner grid narrows the operational part of that gap, but it cannot close it: most of the
          difference is the extra hardware the larger model ties up. The frontier model is the right tool for some
          tasks — but not all of them, and reaching for it by default is a choice with a measurable cost.
        </p>
        <InteractiveFrame label="a typical day — usage and CO₂ by hour">
          <DailyLoadChart hourOfDay={state.hourOfDay} onHourChange={actions.setHourOfDay} />
        </InteractiveFrame>
        <MethodPanel
          assumptions={[
            "We treat GPU-seconds per query as the fundamental unit: everything else (model size, context, cache) is a means to estimate it.",
            "A KV cache and activations add ~20% memory overhead on top of the raw model weights.",
            "Cached prompts are modeled as cheaper, because re-processing a cached prefix is mostly skipped.",
            "Request length scales sub-linearly with tokens (√token ratio) and grows slightly with concurrency (logarithmic delay above 8 concurrent users).",
            "Every fixed cost — GPU compute energy, GPU idle baseline, server, cooling and GPU embodied carbon — is divided by the number of requests genuinely sharing the GPU (the productive batch). Each request bears its own token-adjusted GPU-time share, so short requests bear less and long reasoning requests more; the total across the request mix conserves the node's full fixed cost.",
            "Time-of-day: peak ×1.15 (day) and low ×0.7 (night) are asymmetric on purpose — weighted over 24h they net to ≈+2%, so the daytime overestimate finances the night-time underestimate plus a small conservative margin. Running at night genuinely emits less CO₂ (cleaner off-peak marginal mix), ~30% lower per query.",
            "An idle GPU is NOT in a deep sleep: our DCGM measurements show ~122 W per B300 card at 0% load (spec ~125 W). That is the node's standby draw. Each request in the breakdown below bears only its share of it — the per-GPU standby (idle ÷ 8 GPUs) divided by the concurrent requests sharing the card — so the idle line per request is tens of watts, not the full 122 W. We also add the incremental active power (25% of the idle→peak span) while computing.",
            "Model parameters and usage figures are refreshed from public sources (EcoLogits, Hugging Face, OpenRouter).",
          ]}
          reasoning="Rather than inventing per-model energy figures, we lean on published model cards and independent measurement projects, then scale by the actual time a query occupies the GPU. Two models of the same size can still differ — architecture, quantisation and serving efficiency matter — so we treat per-model data as the best available estimate, not ground truth."
          sources={[
            { label: "Rincé & Banse (2025) — EcoLogits: Evaluating the Environmental Impacts of Generative AI, JOSS 10(111)", url: "https://doi.org/10.21105/joss.07471" },
            { label: "Fu et al. (2024) — LLMCO2: Advancing Accurate Carbon Footprint Prediction for LLM Inferences, arXiv:2410.02950", url: "https://arxiv.org/abs/2410.02950" },
            { label: "OpenRouter model activity API (usage statistics)", url: "https://openrouter.ai/" },
          ]}
        />
      </Section>

      {/* ═══ §2 LOCATION ═══ */}
      <Section id="the-location">
        <div style={prose.kicker}>§2 · The grid</div>
        <h2 style={prose.h2}>Location, location, location</h2>
        <p style={prose.p}>
          The same GPU doing the same work can emit 50× more CO₂ <em>for the energy it burns</em> depending on where it
          sits. Sweden's grid runs on hydro and nuclear at roughly 8 g CO₂/kWh; a gas-and-coal-heavy grid can exceed
          400 g. That 50× is the operational part — the electricity. Once you include the hardware's embodied cost
          (which doesn't move with the grid), the total difference is smaller but still large.
        </p>
        <p style={prose.p}>
          Click around the globe. The difference is not a rounding error — and because it compounds with the model
          choice, it's one of the biggest levers we have.
        </p>
        <InteractiveFrame label="pick a region">
          <RegionPicker region={state.region} onRegionSelect={actions.setRegion} />
        </InteractiveFrame>
        {/* Sentinel: when the region chip row scrolls out of view, a sticky clone pins to the top */}
        <div id="region-row-sentinel" style={{ height: 1 }} aria-hidden="true" />
        <p style={prose.p}>
          One more subtlety: <strong>when</strong> the query runs matters too. A grid's carbon intensity isn't constant
          over the day — a typical day is busy around midday and quiet at night, and demand and the available
          generation mix shift hour by hour, so the marginal electricity at peak hours is dirtier than off-peak. We
          handle this with a deliberate two-level approximation: a <em>peak-period factor</em> that scales the
          intensity up by ~15% during the day, and a <em>low-period factor</em> that scales it down to ~70% at night —
          deliberately asymmetric, so that over a full 24-hour cycle the daytime overestimate "pays for" the
          night-time underestimate and the long-run total lands at about +2% (conservative, not optimistic). The
          upshot for you: <em>moving a call to the night genuinely lowers its CO₂</em> — roughly 30% — because the
          cleaner off-peak mix is real, not an accounting trick. Throughout this page we show numbers for 14:00 — the
          peak, conservative case.
        </p>
        <p style={prose.p}>
          And underneath it all, the meter never fully stops: even an idle GPU keeps drawing a standby baseline — our
          own measurements put it at roughly 120 W per card on a flagship node at 0% load; the card never drops into a
          low-power idle/suspend mode. That standby cost is part of your query too, shared across whoever is using the
          node, which is why a busy node wastes so much less than an idle one.
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
          Cooling and water usage
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
          1.80, and the most common approach — evaporative cooling — consumes up to 2 litres of water per kWh. Same
          model, same query, but a datacenter in Texas can spend over five times as much energy on cooling alone, and
          drain a scarce water supply doing it. Cooling isn't a footnote; it's a first-order difference.
        </p>
        <InteractiveFrame label="the sky the heat has to be rejected into">
          <CoolingWaterChart
            grid={grid}
            region={state.region}
            onRegionSelect={actions.setRegion}
            energyKwh={result?.components.gpuOperational.energyKwh}
            waterLiters={result?.waterLiters}
          />
        </InteractiveFrame>
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

      {/* ═══ §3 SHARING / DEPLOYMENT ═══ */}
      <Section id="the-sharing">
        <div style={prose.kicker}>§3 · Shared or your own</div>
        <h2 style={prose.h2}>Whose hardware does it run on — and how many share it?</h2>
        <p style={prose.p}>
          The same model on the same grid can still emit very differently depending on one more choice: whether you
          run it on your own server, share a node with others (as with Berget AI), or ride a hyperscaler that packs
          many tenants onto the same hardware. The difference comes down to a single mechanism —{" "}
          <strong>how many requests split the fixed cost of the node.</strong>
        </p>
        <p style={prose.p}>
          This is the quiet case for <strong>shared infrastructure over a server of your own.</strong> Run a model on
          an on-prem box and you own the GPU for the whole month — whether it's busy or not. Its servers, cooling and
          networking draw power around the clock, and its entire manufacturing footprint lands on your queries alone.
          Spread over a quiet month, that embodied cost per request can dwarf the operational energy by an order of
          magnitude. On a shared node those fixed costs are split across everyone using it, which is why a busy shared
          GPU almost always beats a private one that mostly waits.
        </p>
        <p style={prose.p}>
          Caching is a smaller lever on its own — the ring above puts it at around 10% — but it compounds with
          sharing. When a cached prefix lets the model skip most of the prefill, each request occupies the GPU for
          less time, which means more requests fit on the same hardware, so the fixed cost is shared across more of
          them. The direct saving is modest; the real value is that it lets a busy shared node stay busy. The catch is
          that this is hard to do well on your own box — it needs the right serving framework, KV-cache management
          and spare memory — so it tends to be exactly the advantage a dedicated provider can offer and an on-prem
          setup can't.
        </p>
        <InteractiveFrame label="shared vs solo — the concurrency trade-off">
          <ConcurrencyChart
            category={category}
            model={model}
            grid={grid}
            concurrency={state.concurrency}
            gpuCondition={state.gpuCondition}
            infraCondition={state.infraCondition}
            onConcurrencyChange={actions.setConcurrency}
          />
        </InteractiveFrame>
        <p style={prose.p}>
          Watch the white curve as you drag the slider. Every fixed cost — the server's standby draw, the chassis, the
          cooling, and the GPU's own manufacturing footprint — is split across however many requests share the node.
          More sharing, less each. The benefit is steepest at the start: going from one user to eight divides those
          fixed costs by eight, while going from eight to thirty-two only divides them by four more. That's why the
          curve drops sharply and then levels off — the fixed costs are already divided down to almost nothing, so
          there's progressively less left to share. A private server sits at the far left of this curve, carrying the
          whole fixed cost alone; a busy shared node sits far to the right.
        </p>
        <MethodPanel
          assumptions={[
            "Every fixed cost — GPU compute energy, GPU idle baseline, server, cooling and GPU embodied carbon — is divided by the number of requests genuinely sharing the GPU (the productive batch). Each request bears its own token-adjusted GPU-time share, so short requests bear less and long reasoning requests more; the total across the request mix conserves the node's full fixed cost.",
            "An idle GPU is NOT in a deep sleep: our DCGM measurements show ~122 W per B300 card at 0% load (spec ~125 W). That is the node's standby draw. Each request in the breakdown below bears only its share of it — the per-GPU standby (idle ÷ 8 GPUs) divided by the concurrent requests sharing the card — so the idle line per request is tens of watts, not the full 122 W. We also add the incremental active power (25% of the idle→peak span) while computing.",
            "On-prem (deployment = 'onprem') forces concurrency to 1: the whole node's fixed cost lands on your queries alone.",
          ]}
          reasoning="Sharing is where the fixed costs live or die. A node's standby draw, chassis, cooling and embodied carbon are spent whether the GPU is busy or idle, so the only question that matters is how many requests they are divided across. We model the whole range from a private server (concurrency 1) to a busy shared node, because that single number — genuine concurrency — decides most of the fixed-cost allocation per query."
          sources={[
            { label: "Fu et al. (2024) — LLMCO2: Advancing Accurate Carbon Footprint Prediction for LLM Inferences, arXiv:2410.02950", url: "https://arxiv.org/abs/2410.02950" },
          ]}
        />
      </Section>

      {/* ═══ §4 HARDWARE ═══ */}
      <Section id="the-hardware">
        <div style={prose.kicker}>§4 · The hardware</div>
        <h2 style={prose.h2}>Hardware has a history</h2>
        <p style={prose.p}>
          Every GPU carries the cost of its own manufacturing — and that cost is significant. We estimate roughly{" "}
          <strong>1,000 kg of CO₂ per datacenter GPU</strong>, a figure that already includes the GPU's share of the
          whole node it lives in (the CPU, memory, storage, chassis and networking are divided across its eight
          GPUs). The figures come from server-level life-cycle assessments by Dell and HPE, with the total
          manufacturing footprint divided per GPU. New hardware amortises that cost over its lifetime; refurbished
          hardware carries zero embodied carbon, because those emissions are already spent.
        </p>
        <p style={prose.p}>
          So what hardware does your chosen model actually need? The binding constraint is memory: the model's
          weights, plus the KV cache of every request being served at once, must fit in GPU memory — and that decides
          how many cards the query has to occupy.{" "}
          {result && result.gpusAllocated <= 1 ? (
            <>
              The model you picked above fits on a <strong>single card</strong> — it doesn't need a flagship node, and
              that opens up a real saving.
            </>
          ) : (
            <>
              The model you picked above needs <strong>{result?.gpusAllocated ?? "several"} cards</strong> — for a
              large model, it's the weights plus the KV cache of all its concurrent requests that spread it across
              the node. That footprint follows it no matter where it runs.
            </>
          )}
        </p>
        <p style={prose.p}>
          That matters because a smaller model can often run on <strong>older, humbler hardware.</strong> A small,
          quantised model fits on a single card; a trillion-parameter model has to be spread across several. An older
          inference card like the NVIDIA L4 embodies only ~300 kg — a fraction of a flagship B300 — and because that
          hardware has already been in service for years, much of its manufacturing footprint is already amortised.
          Choosing a right-sized model on mature hardware can cut emissions dramatically before you've optimised
          anything else.
        </p>
        <InteractiveFrame label="configure hardware">
          <HardwarePicker
            gpuCondition={state.gpuCondition}
            onGpuConditionChange={actions.setGpuCondition}
            infraCondition={state.infraCondition}
            onInfraConditionChange={actions.setInfraCondition}
          />
        </InteractiveFrame>
        <MethodPanel
          assumptions={[
            "Embodied carbon is ~1,000 kg CO₂ per datacenter GPU. That is the whole node's manufacturing footprint (~7–8 t) divided across its 8 GPUs, so it already includes each GPU's share of the CPU, RAM, SSD, chassis and networking — there is no separate 'node' term on top. Amortised over a 5-year lifetime and allocated per query by GPU-seconds.",
            "GPUs needed per model = model size × bytes/parameter × 1.2 (KV-cache overhead), divided by GPU memory — so larger models span more GPUs.",
            "Refurbished hardware is counted as zero embodied carbon — the manufacturing emissions are already spent.",
            "Per-GPU figures carry ±30–50% uncertainty: NVIDIA/AMD don't publish per-GPU LCAs, so we derive them from server-level reports.",
          ]}
          reasoning="Manufacturing dominates lifecycle emissions for datacenter hardware, so embodied carbon can't be ignored despite the uncertainty. We estimate it with life-cycle assessment: manufacturer product-carbon-footprint data at the server level, disaggregated per component. And because older hardware has already amortised much of its footprint, right-sizing a model to mature hardware is often the single biggest saving available."
          sources={[
            { label: "NVIDIA (2024) — HGX H100 Product Carbon Footprint Summary", url: "https://images.nvidia.com/aem-dam/Solutions/documents/HGX-H100-PCF-Summary.pdf" },
            { label: "Dell Technologies (2023) — Life Cycle Assessment of PowerEdge servers (R750: 2,181–3,880 kg embodied)" },
            { label: "Gupta et al. (2021) — Chasing Carbon: The Elusive Environmental Footprint of Computing, HPCA", url: "https://doi.org/10.1109/HPCA51647.2021.00076" },
            { label: "Boavizta — open-source IT hardware LCA tool", url: "https://www.boavizta.org/" },
          ]}
        />
      </Section>

      {/* ═══ §5 TOGETHER ═══ */}
      <Section id="the-total">
        <div style={prose.kicker}>§5 · The total</div>
        <h2 style={prose.h2}>Putting it all together</h2>
        <p style={prose.p}>
          Add operational energy, datacenter overhead and embodied hardware — and you get the figure that's been
          following you down this page. Small per query, but multiplied by billions of queries it becomes very real.
          That's exactly why it belongs in every response.
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
            { label: "Full methodology document (METHODOLOGY.md), with targeted comments from a researcher at the Stockholm Environment Institute", url: "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md" },
            { label: "Open-source calculator library (@berget/co2-calculator)", url: "https://github.com/berget-ai/co2-calculator" },
          ]}
        />
      </Section>

      {/* ═══ VERIFICATION ═══ */}
      <Section id="the-verification">
        <div style={prose.kicker}>Reality check</div>
        <h2 style={prose.h2}>How we check the numbers against the meters</h2>
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
          reasoning="The calculator is a model, and any model can drift. Owning the hardware means we don't have to trust a cloud provider's estimate — we can read the meters. The gap between reported and measured emissions tells us whether our assumptions (PUE, idle draw, utilisation) hold, and lets us tighten them over time. Open-sourcing the method is the point: verification shouldn't require owning a datacenter."
          sources={[
            { label: "Open-source calculator library (@berget/co2-calculator)", url: "https://github.com/berget-ai/co2-calculator" },
            { label: "Full methodology document (METHODOLOGY.md), with targeted comments from a researcher at the Stockholm Environment Institute", url: "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md" },
          ]}
        />
      </Section>

      {/* ═══ THE ASK ═══ */}
      <Section id="the-standard">
        <div style={prose.kicker}>The standard we propose</div>
        <h2 style={prose.h2}>What we're asking for</h2>
        <p style={prose.p}>
          <strong>If you provide AI:</strong> report <code>usage.emissions.co2e_grams</code> in every response — the method and the code
          above are open, so use them, scrutinise them, improve them. There are drop-in integrations for Express,
          FastAPI and Prometheus in the{" "}
          <a href="https://github.com/berget-ai/co2-calculator/blob/main/ADVANCED_USAGE.md" target="_blank" rel="noopener noreferrer" style={{ color: C.moss }}>
            integration guide
          </a>
          . <strong>If you procure AI:</strong> require emissions data, and the location of the servers, in your
          contracts. <strong>If you build on AI:</strong> ask your provider for it.
        </p>
        <p style={prose.p}>
          This only works if the industry moves together — a number you can't compare across providers is just a number.
          So help us spread the word. And if you find a flaw in our method, tell us: the code is open precisely so it can
          be checked, challenged and improved. Transparency is the prerequisite; accountability is the point.
        </p>

        {/* Procurement + policy cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", margin: "1.75rem 0" }}>
          {/* For buyers */}
          <div style={{ border: `1px solid ${C.borderMoss}`, borderRadius: 12, padding: "1.25rem", background: C.ghost }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.moss, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>
              If you procure AI
            </div>
            <p style={{ fontSize: "0.875rem", color: C.cloud, lineHeight: 1.6, margin: "0 0 0.75rem" }}>
              Choosing a provider on a clean grid is one of the largest emissions decisions you make — and on Sweden's
              hydro-and-nuclear grid it's also a vote for domestic, fossil-free infrastructure. Put it in the contract.
              A clause you can adapt:
            </p>
            <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "0.85rem", fontSize: "0.8rem", color: C.peak, lineHeight: 1.55, fontStyle: "italic", border: `1px solid ${C.border}` }}>
              "The supplier shall report the CO₂e emissions of each API call, and the physical location(s) of the
              servers on which the service runs, and shall make these available to the buyer on request."
            </div>
          </div>

          {/* For policymakers */}
          <div style={{ border: `1px solid ${C.borderMoss}`, borderRadius: 12, padding: "1.25rem", background: C.ghost }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.moss, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>
              If you shape policy
            </div>
            <p style={{ fontSize: "0.875rem", color: C.cloud, lineHeight: 1.6, margin: 0 }}>
              Sweden has one of the cleanest electricity mixes in the world — which makes Swedish AI infrastructure a
              genuine competitive advantage, for both the climate and the industry. But an advantage you can't measure
              is one you can't claim. Requiring providers to disclose per-request emissions turns Sweden's clean grid
              from a talking point into a verifiable selling point.
            </p>
          </div>
        </div>

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
            Just like Berget AI does — return an{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
              emissions
            </code>{" "}
            object inside{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
              usage
            </code>{" "}
            with{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
              co2e_grams
            </code>{" "}
            and{" "}
            <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
              energy_kwh
            </code>{" "}
            in your API responses. Your users deserve to know the environmental cost of each request.
          </p>
          <ApiResponseBlock result={result} model={model} selectedModel={state.selectedModel} region={state.region} highlightKey="co2" />
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
  hardware: HARDWARE_CONFIGS.b300,
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
            href="https://github.com/berget-ai/co2-calculator"
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
