import { useState } from "react";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: "What does \"g CO₂e per query\" mean?",
    answer: (
      <>
        <strong>CO₂e</strong> = carbon dioxide equivalent. It measures total greenhouse gas impact, not just CO₂.
        {" "}
        <strong>Per query</strong> = one complete AI inference call (your prompt in, generated response out).
        This number includes everything: GPU energy, server infrastructure, datacenter cooling, hardware manufacturing, and a fair share of training emissions.
      </>
    ),
  },
  {
    question: "Why is hardware embodied carbon the biggest component?",
    answer: (
      <>
        Embodied carbon accounts for the energy used to manufacture the GPU chip and assemble the server. 
        Unlike operational energy (which is only consumed while running), embodied energy is a one-time cost 
        amortised over the hardware's lifetime. For short inference calls, this can dominate — just like 
        the environmental cost of building a factory matters even when it's only producing small items.
      </>
    ),
  },
  {
    question: "How do you decide how many GPUs a model needs?",
    answer: (
      <>
        Auto-allocation based on model size:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>≤10B parameters → 1 GPU (fits easily in memory)</li>
          <li>10-40B → 2 GPUs (model/base-tag)</li>
          <li>40-100B → 4 GPUs (tensor/or paralle)</li>
          <li>&gt;100B → 8 GPUs (full node)</li>
        </ul>
        This reflects real-world vLLM deployments where larger models require tensor parallelism.
      </>
    ),
  },
  {
    question: "What is the dual-grid comparison?",
    answer: (
      <>
        <strong>Deployment grid</strong> = where the AI physically runs (impact: Texas vs Sweden makes a huge difference).
        {" "}
        <strong>Reference grid</strong> = your home grid for energy equivalents (makes comparisons relatable).
        <br /><br />
        Example: Running Llama 8B in Texas produces X grams CO₂. If we translate that energy to Swedish grid (8 g/kWh), 
        it's like running your microwave for Y minutes. Same energy, very different planet.
      </>
    ),
  },
  {
    question: "Where do the training CO₂ numbers come from?",
    answer: (
      <>
        In priority order:
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li><strong>Manufacturer reports</strong> — Meta, Mistral AI, Google publish sustainability data</li>
          <li><strong>SCI-AI estimates</strong> — extrapolation from disclosed runs</li>
          <li><strong>Parameter scaling</strong> — last resort heuristic</li>
        </ol>
        Most training CO₂ figures are unfortunately estimates. Few companies publish this openly.
      </>
    ),
  },
  {
    question: "Why does concurrency matter?",
    answer: (
      <>
        Server infrastructure (CPU, network, RAM, chassis) is a fixed cost per node. When 8 requests 
        run concurrently, they share that overhead. A single request at 3 AM pays the full idle cost alone; 
        at peak time with 20 concurrent requests, each request's share is 1/20th. This reflects real cloud economics.
      </>
    ),
  },
  {
    question: "Why is PUE 1.2 used?",
    answer: (
      <>
        PUE (Power Usage Effectiveness) measures datacenter efficiency. 1.2 means for every 1 kWh used by servers, 
        0.2 kWh goes to cooling, power distribution, and facility overhead. Modern hyperscale datacenters achieve 1.1-1.3; 
        1.2 is a realistic average for GPU-accelerated facilities.
      </>
    ),
  },
  {
    question: "How accurate is this compared to real measurements?",
    answer: (
      <>
        <strong>GPU energy</strong>: ±20% accurate when response time is measured (from vLLM logs or benchmarks).
        <br />
        <strong>Embodied</strong>: ±30% (industry averages from Li et al., 2023).
        <br />
        <strong>Training</strong>: ±50% or worse (most figures are estimates).
        <br /><br />
        This calculator is designed for <strong>comparisons</strong> (Sweden vs Texas, 8B vs 70B model) more than absolute precision. 
        For production monitoring, integrate with the library and feed real Prometheus metrics.
      </>
    ),
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-[800px] mx-auto">
      <h2
        className="font-['Ovo'] text-2xl text-white mb-6 text-center"
      >
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-[rgba(26,26,26,0.6)] border border-[rgba(229,221,213,0.08)] rounded-xl overflow-hidden"
          >
            <button
              className="w-full px-6 py-4 text-left flex justify-between items-center"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
            >
              <span className="text-[0.9375rem] font-medium text-[#E5DDD5]">
                {faq.question}
              </span>
              <span
                className="text-[#52B788] text-lg transition-transform duration-200"
                style={{
                  transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                ▼
              </span>
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-sm text-[rgba(229,221,213,0.75)] leading-relaxed">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
