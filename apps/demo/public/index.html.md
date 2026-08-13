# We open source our CO₂ emissions — and so should you

There's real confusion about AI's emissions — and the reason is a lack of transparency. That responsibility doesn't sit with the person typing a prompt; it sits with the companies that choose where to run their servers, and the buyers who procure AI without asking. At Berget AI we've committed to full transparency about ours: every response reports its own CO₂. Now we're releasing our methods and code as open source, so the rest of the industry can do the same.

**In short — if you buy or build on AI:**

- **The most important choice is the right model for the task.** Reaching for an ever-larger model by default is the wrong path: a frontier model can emit roughly **12× more CO₂ per query** than a specialised one that does the same job just as well — even on a clean grid. We need, collectively, to learn to use the specialised models.
- **Choosing well is impossible without transparency.** Teams building AI services need the numbers to evaluate the right model for each task on CO₂ — which is why our call to the industry is to include CO₂ in every response, like tokens.
- **The same request can also emit 50× more CO₂ for the energy it burns, depending on where the servers sit** — and almost no provider publishes the number. Below: the full method, from first principles.

When you procure AI, a handful of choices decide almost all of the footprint: where the servers run, which model you use, whether you share the hardware or run your own, how well its cache is tuned, and whether the hardware is new or refurbished. The model you choose and the grid it runs on dwarf everything else.

---

## The problem: No one can hold AI accountable for numbers nobody publishes

AI's environmental footprint is real, and the industry that builds it has a responsibility to measure and report it. Yet a buyer comparing two providers, or a team choosing between two models, has no way to compare their climate impact — not because the physics is unknowable, but because almost nobody publishes it.

And when numbers do appear, they're calculated differently every time, so anyone can draw the boundary that makes them look best. That isn't just an inconvenience; it's how accountability is avoided. Without comparability, there is nothing to hold anyone to.

Part of the problem is that the footprint is genuinely hard to wrap your head around. A single AI request depends on the model, where the server runs, the carbon mix of that grid, and even the time of day — too many moving parts for anyone to hold an intuition for, let alone compare two providers by hand. That's exactly why we don't just publish a formula: we track the CO₂ of every individual request, so the number is already there, the same way every time. The method below shows how.

> **Method — system boundary.** We follow the Green Software Foundation's SCI-AI specification and adopt its "consumer" boundary: the consumer side of inference — operational energy, datacenter overhead and hardware. Training is excluded (see §5). Network transmission and the end-user's device are out of scope. We deliberately exclude model training: the underlying figures are self-reported, vary by ±50%, and would dominate the per-query number while being the least verifiable part. We prefer a smaller number we can defend over a bigger one we can't.

---

## §1 · The workload: The model you choose is the biggest lever you control

Of all the choices behind an AI request, the model is the one that moves the footprint most — and the one most teams can change tomorrow. But to see that, we need a concrete workload: we can't talk about "AI's footprint" in the abstract, only about a specific model doing a specific job. A quick chat reply and a long code analysis are very different jobs, and the model you choose sets the scale of the work.

Under the hood, though, the model is mostly a means to an end. What the footprint really comes down to is simpler: **how many seconds your query occupies the infrastructure, and how many other users share it at the same time.** Everything else — model size, context length, caching — is just a means to estimate that one number: GPU-seconds per query.

Size sets the floor: a model must fit in GPU memory (weights, plus ~20% for the KV cache), so a trillion-parameter model occupies several GPUs at once while a small quantised one fits on a single card. Context length and cache then stretch or shrink the time: long prompts mean more tokens and a growing KV cache, while a cached prefix lets the model skip most of that work. And concurrency decides how many queries split the fixed cost of the servers.

**The size of that lever is easy to underestimate.** On our own infrastructure, the same short question answered by a large MoE frontier model (Kimi K3, 2.8T) comes out at roughly **300 mg CO₂**, where a specialised model that handles the task just as well (Gemma 4 31B) comes out at **25 mg** — about a **12×** gap, on the same clean Swedish grid. A cleaner grid narrows the operational part of that gap, but it cannot close it: most of the difference is the extra hardware the larger model ties up. The frontier model is the right tool for some tasks — but not all of them, and reaching for it by default is a choice with a measurable cost.

> **Method — GPU time.** We treat GPU-seconds per query as the fundamental unit: everything else (model size, context, cache) is a means to estimate it. A KV cache and activations add ~20% memory overhead on top of the raw model weights. Cached prompts are modeled as cheaper, because re-processing a cached prefix is mostly skipped. Request length scales sub-linearly with tokens (√token ratio) and grows slightly with concurrency (logarithmic delay above 8 concurrent users). Model parameters and usage figures are refreshed from public sources (EcoLogits, Hugging Face, OpenRouter). Rather than inventing per-model energy figures, we lean on published model cards and independent measurement projects, then scale by the actual time a query occupies the GPU. Two models of the same size can still differ — architecture, quantisation and serving efficiency matter — so we treat per-model data as the best available estimate, not ground truth. Sources: Rincé & Banse (2025), EcoLogits, JOSS 10(111); Fu et al. (2024), LLMCO2, arXiv:2410.02950; OpenRouter.

---

## §2 · The grid: Location, location, location

The same GPU doing the same work can emit 50× more CO₂ *for the energy it burns* depending on where it sits. Sweden's grid runs on hydro and nuclear at roughly 8 g CO₂/kWh; a gas-and-coal-heavy grid can exceed 400 g. That 50× is the operational part — the electricity. Once you include the hardware's embodied cost (which doesn't move with the grid), the total difference is smaller but still large. The difference is not a rounding error.

One more subtlety: **when** the query runs matters too. A grid's carbon intensity isn't constant over the day — a typical day is busy around midday and quiet at night, and demand and the available generation mix shift hour by hour, so the marginal electricity at peak hours is dirtier than off-peak. We handle this with a deliberate two-level approximation: a *peak-period factor* that scales the intensity up by ~15% during the day, and a *low-period factor* that scales it down to ~70% at night — deliberately asymmetric, so that over a full 24-hour cycle the daytime overestimate "pays for" the night-time underestimate and the long-run total lands at about +2% (conservative, not optimistic). The upshot for you: *moving a call to the night genuinely lowers its CO₂* — roughly 30% — because the cleaner off-peak mix is real, not an accounting trick. Throughout we show numbers for 14:00 — the peak, conservative case.

And underneath it all, the meter never fully stops: even an idle GPU keeps drawing a standby baseline — our own measurements put it at roughly 120 W per card on a flagship node at 0% load; the card never drops into a low-power idle/suspend mode. That standby cost is part of your query too, shared across whoever is using the node, which is why a busy node wastes so much less than an idle one.

> **Method — grid intensity.** Carbon intensity is the single largest geographical factor, and it is well-documented. We use conservative figures: for Sweden we assume 8 g/kWh even though the fossil-free PPA mix is closer to 2.5 g, to account for transmission losses and lifecycle effects. For time-of-day we deliberately over-estimate during the day and under-estimate at night, so that on balance the approximation lands near — or slightly above — the truth. Where a region has several plausible values, we pick the higher one. (Regional yearly average, adjusted up +15% in peak and down to 70% in low-demand periods.)

### Cooling and water usage

Servers don't just consume power for computation — they consume power to get rid of the heat that computation generates. That overhead is captured by **PUE (Power Usage Effectiveness)**: the ratio of total facility energy to the energy that actually reaches the IT equipment. The lower the PUE, the less energy is wasted on overhead.

And this is where geography really bites. In a cold Nordic climate you can cool with outside air for most of the year — fans and filters, essentially — reaching a PUE around 1.15 with *zero water*. In a hot or humid climate that free lunch disappears: you need energy-intensive mechanical chillers, pushing PUE toward 1.80, and the most common approach — evaporative cooling — consumes up to 2 litres of water per kWh. Same model, same query, but a datacenter in Texas can spend over five times as much energy on cooling alone, and drain a scarce water supply doing it. Cooling isn't a footnote; it's a first-order difference.

> **Method — cooling.** Cooling overhead (PUE) and water use are modeled from regional climate, not measured per-datacenter. Nordic free-air cooling is assumed to use no water (0.0 L/kWh); evaporative cooling in hot/dry climates uses up to ~2.0 L/kWh. PUE ranges from ~1.15 (free-air, Nordics/Quebec) to ~2.0 (extreme cooling, hot climates). Sources: Uptime Institute (2024) Global Data Center Survey; Siddik et al. (2021), Env. Res. Lett.

---

## §3 · Shared or your own: Whose hardware does it run on — and how many share it?

The same model on the same grid can still emit very differently depending on one more choice: whether you run it on your own server, share a node with others (as with Berget AI), or ride a hyperscaler that packs many tenants onto the same hardware. The difference comes down to a single mechanism — **how many requests split the fixed cost of the node.**

**This is the quiet case for shared infrastructure over a server of your own.** Run a model on an on-prem box and you own the GPU for the whole month — whether it's busy or not. Its servers, cooling and networking draw power around the clock, and its entire manufacturing footprint lands on your queries alone. Spread over a quiet month, that embodied cost per request can dwarf the operational energy by an order of magnitude. On a shared node those fixed costs are split across everyone using it, which is why a busy shared GPU almost always beats a private one that mostly waits.

**Caching is a smaller lever on its own — around 10% — but it compounds with sharing.** When a cached prefix lets the model skip most of the prefill, each request occupies the GPU for less time, which means more requests fit on the same hardware, so the fixed cost is shared across more of them. The direct saving is modest; the real value is that it lets a busy shared node stay busy. The catch is that this is hard to do well on your own box — it needs the right serving framework, KV-cache management and spare memory — so it tends to be exactly the advantage a dedicated provider can offer and an on-prem setup can't.

**On the concurrency curve:** every fixed cost — the server's standby draw, the chassis, the cooling, and the GPU's own manufacturing footprint — is split across however many requests share the node. More sharing, less each. The benefit is steepest at the start: going from one user to eight divides those fixed costs by eight, while going from eight to thirty-two only divides them by four more. That's why the curve drops sharply and then levels off — the fixed costs are already divided down to almost nothing, so there's progressively less left to share. A private server sits at the far left of this curve, carrying the whole fixed cost alone; a busy shared node sits far to the right.

> **Method — sharing.** Every fixed cost — GPU compute energy, GPU idle baseline, server, cooling and GPU embodied carbon — is divided by the number of requests genuinely sharing the GPU (the productive batch). Each request bears its own token-adjusted GPU-time share, so short requests bear less and long reasoning requests more; the total across the request mix conserves the node's full fixed cost. An idle GPU is NOT in a deep sleep: our DCGM measurements show ~122 W per B300 card at 0% load (spec ~125 W). That is the node's standby draw. Each request in the breakdown bears only its share of it — the per-GPU standby (idle ÷ 8 GPUs) divided by the concurrent requests sharing the card — so the idle line per request is tens of watts, not the full 122 W. We also add the incremental active power (25% of the idle→peak span) while computing. On-prem (deployment = "onprem") forces concurrency to 1: the whole node's fixed cost lands on your queries alone. Source: Fu et al. (2024), LLMCO2, arXiv:2410.02950.

---

## §4 · The hardware: Hardware has a history

Every GPU carries the cost of its own manufacturing — and that cost is significant. We estimate roughly **1,000 kg of CO₂ per datacenter GPU**, a figure that already includes the GPU's share of the whole node it lives in (the CPU, memory, storage, chassis and networking are divided across its eight GPUs). The figures come from server-level life-cycle assessments by Dell and HPE, with the total manufacturing footprint divided per GPU. New hardware amortises that cost over its lifetime; refurbished hardware carries zero embodied carbon, because those emissions are already spent.

So what hardware does your chosen model actually need? The binding constraint is memory: a model's weights (plus ~20% for the KV cache) must fit in GPU memory, and that alone decides how many cards the query has to occupy. A small model fits on a single card — it doesn't need a flagship node; a trillion-parameter model needs several cards just to hold its weights.

That matters because a smaller model can often run on **older, humbler hardware.** A small, quantised model fits on a single card; a trillion-parameter model has to be spread across several. An older inference card like the NVIDIA L4 embodies only ~300 kg — a fraction of a flagship H200 — and because that hardware has already been in service for years, much of its manufacturing footprint is already amortised. Choosing a right-sized model on mature hardware can cut emissions dramatically before you've optimised anything else.

> **Method — embodied carbon.** Embodied carbon is ~1,000 kg CO₂ per datacenter GPU. That is the whole node's manufacturing footprint (~7–8 t) divided across its 8 GPUs, so it already includes each GPU's share of the CPU, RAM, SSD, chassis and networking — there is no separate "node" term on top. Amortised over a 5-year lifetime and allocated per query by GPU-seconds. GPUs needed per model = model size × bytes/parameter × 1.2 (KV-cache overhead), divided by GPU memory — so larger models span more GPUs. Refurbished hardware is counted as zero embodied carbon — the manufacturing emissions are already spent. Per-GPU figures carry ±30–50% uncertainty: NVIDIA/AMD don't publish per-GPU LCAs, so we derive them from server-level reports. Sources: NVIDIA HGX H100 PCF Summary (2024); Dell LCA of PowerEdge servers (2023); Gupta et al. (2021), "Chasing Carbon", HPCA; Boavizta.

---

## §5 · The total: Putting it all together

Add operational energy, datacenter overhead and embodied hardware — and you get the figure that's been following you down this page. Small per query, but multiplied by billions of queries it becomes very real. That's exactly why it belongs in every response.

> **Method — the total.** The total is the sum of the components above — no hidden factors. Training is excluded throughout: provider figures are self-reported and vary by ±50%, so including them would make the headline number the least verifiable part of the result. We show only operational + hardware emissions, which we can stand behind. The coffee comparison anchors to an 800W microwave on Sweden's clean grid (so the number of "clean seconds" is large precisely because the baseline is so low); the grid contrast applies the grid ratio only to the energy part, since embodied hardware emissions are location-independent. Water usage reflects the cooling model for the selected region.

---

## Reality check: How we check the numbers against the meters

Models are only useful if they're checked against reality. Because Berget AI owns its own hardware and networking equipment — and isn't dependent on external cloud providers — we can measure, with high precision, how much CO₂ our infrastructure actually emits each day. That lets us compare the totals reported through our APIs against real, metered consumption, and validate our assumptions against the physical world.

Doing that reconciliation in real time is hard, though. A full month's total emissions only become clear after the fact, and they then have to be allocated back across every individual request made during that period. So we run this revision continuously, refining the model as the metered data comes in. And because most teams don't own their hardware the way we do, we share the code openly — so others can verify, adapt and improve it for their own circumstances.

> **Method — verification.** Continuous reconciliation against metered consumption is more practical than real-time per-request verification. Monthly totals are allocated back across individual requests after the fact. Berget AI owns and operates its own hardware and networking, so true consumption is directly measurable. The gap between reported and measured emissions tells us whether our assumptions (PUE, idle draw, utilisation) hold, and lets us tighten them over time.

---

## The standard we propose: What we're asking for

**If you provide AI:** report `usage.emissions.co2e_grams` in every response — the method and the code above are open, so use them, scrutinise them, improve them. There are drop-in integrations for Express, FastAPI and Prometheus in the integration guide. **If you procure AI:** require emissions data, and the location of the servers, in your contracts. **If you build on AI:** ask your provider for it.

This only works if the industry moves together — a number you can't compare across providers is just a number. So help us spread the word. And if you find a flaw in our method, tell us: the code is open precisely so it can be checked, challenged and improved. Transparency is the prerequisite; accountability is the point.

**If you procure AI:** Choosing a provider on a clean grid is one of the largest emissions decisions you make — and on Sweden's hydro-and-nuclear grid it's also a vote for domestic, fossil-free infrastructure. Put it in the contract. A clause you can adapt:

> "The supplier shall report the CO₂e emissions of each API call, and the physical location(s) of the servers on which the service runs, and shall make these available to the buyer on request."

**If you shape policy:** Sweden has one of the cleanest electricity mixes in the world — which makes Swedish AI infrastructure a genuine competitive advantage, for both the climate and the industry. But an advantage you can't measure is one you can't claim. Requiring providers to disclose per-request emissions turns Sweden's clean grid from a talking point into a verifiable selling point.

---

*This is the prose of the interactive guide at [co2.berget.ai](https://co2.berget.ai), reproduced as Markdown for LLM readers and reviewers (the site itself is client-rendered). The interactive version lets you change the model, region, sharing, hardware and time of day and watch every figure recompute live. Method: [METHODOLOGY.md](https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md). Code: [@berget/co2-calculator](https://github.com/berget-ai/co2-calculator).*
