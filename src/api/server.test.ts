import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app";

describe("API Integration Tests", () => {
  describe("GET /health", () => {
    it("should return ok status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.version).toBeDefined();
    });
  });

  describe("POST /api/estimate", () => {
    it("should estimate CO2 with token count only", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: 1000,
          modelId: "meta-llama/Llama-3.1-8B-Instruct",
        });

      expect(response.status).toBe(200);
      expect(response.body.co2Grams).toBeGreaterThan(0);
      expect(response.body.co2PerToken).toBeGreaterThan(0);
      expect(response.body.method).toBe("token-estimate");
      expect(response.body.details).toBeDefined();
    });

    it("should estimate CO2 with energy measurement (gpu-energy method)", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: 1000,
          energyJoules: 50000,
          modelId: "meta-llama/Llama-3.1-8B-Instruct",
          carbonIntensity: 450,
        });

      expect(response.status).toBe(200);
      expect(response.body.co2Grams).toBeGreaterThan(0);
      expect(response.body.method).toBe("gpu-energy");
      expect(response.body.energyKwh).toBeGreaterThan(0);
    });

    it("should return zero for zero tokens", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: 0,
          modelId: "meta-llama/Llama-3.1-8B-Instruct",
        });

      expect(response.status).toBe(200);
      expect(response.body.co2Grams).toBe(0);
      expect(response.body.co2PerToken).toBe(0);
    });

    it("should reject negative token counts", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: -1,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request body");
    });

    it("should reject invalid request body (string tokenCount)", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: "not-a-number",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request body");
    });

    it("should work with unknown model IDs", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: 500,
          modelId: "unknown-org/unknown-model-123",
        });

      expect(response.status).toBe(200);
      expect(response.body.co2Grams).toBeGreaterThan(0);
      expect(response.body.method).toBe("token-estimate");
    });

    it("should allow omitting optional fields", async () => {
      const response = await request(app)
        .post("/api/estimate")
        .send({
          tokenCount: 100,
        });

      expect(response.status).toBe(200);
      expect(response.body.co2Grams).toBeGreaterThan(0);
    });
  });

  describe("GET /api/models", () => {
    it("should return list of supported models", async () => {
      const response = await request(app).get("/api/models");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
      expect(response.body.profiles).toBeDefined();

      // Verify some known models exist
      expect(response.body.models).toContain(
        "meta-llama/Llama-3.1-8B-Instruct",
      );
    });
  });

  describe("GET /api/models/:modelId", () => {
    it("should return 404 for unknown model on HuggingFace", async () => {
      const response = await request(app).get(
        "/api/models/nonexistent-model-xyz-12345",
      );
      expect(response.status).toBe(404);
    });
  });
});
