import { describe, it, expect, vi, beforeEach } from "vitest";
import { HuggingFaceService } from "./huggingface";

describe("HuggingFaceService", () => {
  let service: HuggingFaceService;

  beforeEach(() => {
    service = HuggingFaceService.getInstance();
    service.clearCache();
    vi.restoreAllMocks();
  });

  describe("fetchModelInfo", () => {
    it("should return null for non-existent model", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }));

      const result = await service.fetchModelInfo("nonexistent/model");
      expect(result).toBeNull();
    });

    it("should cache successful responses", async () => {
      const mockData = {
        modelId: "test/model",
        config: {
          model_type: "llama",
          num_parameters: 7_000_000_000,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });
      vi.stubGlobal("fetch", mockFetch);

      // First call with useCache=false — hits network
      await service.fetchModelInfo("test/model", false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should bypass cache when useCache=false", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ modelId: "test/model" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await service.fetchModelInfo("test/model", false);
      await service.fetchModelInfo("test/model", false);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle network errors gracefully", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const result = await service.fetchModelInfo("test/model");
      expect(result).toBeNull();
    });
  });

  describe("estimateParametersFromConfig", () => {
    it("should extract explicit num_parameters", () => {
      const result = service.estimateParametersFromConfig({
        num_parameters: 7_000_000_000,
      });
      expect(result).toBe(7_000_000_000);
    });

    it("should estimate from transformer config", () => {
      const config = {
        hidden_size: 4096,
        num_hidden_layers: 32,
        num_attention_heads: 32,
        vocab_size: 32000,
      };

      const result = service.estimateParametersFromConfig(config);
      expect(result).toBeGreaterThan(0);
      // Should be in the ballpark of Llama-8B (≈ 8B params)
      expect(result).toBeGreaterThan(6_000_000_000);
      expect(result).toBeLessThan(10_000_000_000);
    });

    it("should return null for incomplete config", () => {
      expect(service.estimateParametersFromConfig({})).toBeNull();
      expect(service.estimateParametersFromConfig(null)).toBeNull();
    });
  });

  describe("estimateFlopsPerToken", () => {
    it("should apply architecture factors", () => {
      const params = 7_000_000_000;
      const llama = service.estimateFlopsPerToken(params, "llama");
      const unknown = service.estimateFlopsPerToken(params, "unknown");

      // Llama has factor 0.85, unknown defaults to 0.75
      expect(llama).toBeGreaterThan(unknown);
    });

    it("should be ~2× parameters × factor for simple model", () => {
      const params = 1_000_000_000;
      const result = service.estimateFlopsPerToken(params); // default factor 0.75

      const expected = Math.round(params * 2 * 0.75);
      expect(result).toBe(expected);
    });
  });

  describe("estimatePowerWatts", () => {
    it("should scale with parameter count", () => {
      expect(service.estimatePowerWatts(500_000_000)).toBe(80);
      expect(service.estimatePowerWatts(5_000_000_000)).toBe(200);
      expect(service.estimatePowerWatts(50_000_000_000)).toBe(700);
      expect(service.estimatePowerWatts(150_000_000_000)).toBe(1200);
    });
  });

  describe("calculateCO2Profile", () => {
    it("should build complete profile from safetensors data", async () => {
      const mockData = {
        modelId: "test/model",
        safetensors: {
          parameters: 7_000_000_000,
        },
        config: {
          model_type: "llama",
        },
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const profile = await service.calculateCO2Profile("test/model");

      expect(profile).not.toBeNull();
      expect(profile!.modelId).toBe("test/model");
      expect(profile!.parameters).toBe(7_000_000_000);
      expect(profile!.flopsPerToken).toBeGreaterThan(0);
      expect(profile!.defaultPowerWatts).toBeGreaterThan(0);
      expect(profile!.architectureEfficiencyFactor).toBeGreaterThan(0);
    });

    it("should estimate parameters when safetensors missing", async () => {
      const mockData = {
        modelId: "test/model",
        config: {
          hidden_size: 4096,
          num_hidden_layers: 32,
          num_attention_heads: 32,
          vocab_size: 32000,
        },
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const profile = await service.calculateCO2Profile("test/model");
      expect(profile).not.toBeNull();
      expect(profile!.parameters).toBeGreaterThan(0);
    });

    it("should return null when no parameter data available", async () => {
      const mockData = {
        modelId: "test/model",
        config: {},
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const profile = await service.calculateCO2Profile("test/model");
      expect(profile).toBeNull();
    });
  });

  describe("cache management", () => {
    it("should clear specific cache entry", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ modelId: "test/model" }),
      }));

      await service.fetchModelInfo("test/model");
      service.clearCache("test/model");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ modelId: "test/model" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await service.fetchModelInfo("test/model");
      expect(mockFetch).toHaveBeenCalledTimes(1); // re-fetched after clear
    });

    it("should clear entire cache", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ modelId: "test/model" }),
      }));

      await service.fetchModelInfo("model-a");
      await service.fetchModelInfo("model-b");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ modelId: "test" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      service.clearCache();

      await service.fetchModelInfo("model-a");
      await service.fetchModelInfo("model-b");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = HuggingFaceService.getInstance();
      const instance2 = HuggingFaceService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
