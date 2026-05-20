import express from "express";
import { z } from "zod";
import {
  estimateCO2,
  getAllModelCO2Profiles,
  huggingFaceService,
} from "../index";

export const app = express();

app.use(express.json());

const estimateSchema = z.object({
  tokenCount: z.number().min(0),
  energyJoules: z.number().optional(),
  modelId: z.string().optional(),
  carbonIntensity: z.number().optional(),
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

app.post("/api/estimate", (req, res) => {
  try {
    const params = estimateSchema.parse(req.body);
    const result = estimateCO2(params);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Invalid request body", details: error.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/api/models", (_req, res) => {
  const models = getAllModelCO2Profiles();
  res.json({
    models: Object.keys(models),
    profiles: models,
  });
});

app.get("/api/models/:modelId", async (req, res) => {
  try {
    const { modelId } = req.params;
    const profile = await huggingFaceService.calculateCO2Profile(modelId);

    if (!profile) {
      res.status(404).json({ error: "Model not found" });
    } else {
      res.json(profile);
    }
  } catch (_error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
