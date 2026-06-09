# Avvikelser mellan Implementation och Metodologi

## Kritiska avvikelser (bör fixas)

### 1. Section 3.1 - GPU Time Allocation
**Metodologi säger:**
```
t_gpu = T_response × (C_active / N_gpus_in_node)
```
Exempel: 8 requests på 8 GPUs = 2.5s × (8/8) = 2.5s per request

**Vi gör:**
```typescript
const concurrencyAdjustedTime = applyConcurrencyDelay(tokenAdjustedTime, concurrency);
// Detta lägger till en fördröjning baserat på concurrency, vilket är fel
```

**Problem:** Vi antar att högre concurrency automatiskt gör varje request längre. Men enligt metodologin är GPU-tiden per request bara response time × (concurrency / gpu_count). Om concurrency ≤ gpu_count, ska tiden vara oförändrad.

### 2. Section 3.3 - Power Interpolation
**Metodologi säger:**
- U_util ≈ 0.3 för små modeller
- U_util ≈ 0.6 för medium modeller  
- U_util ≈ 0.9 för stora modeller

**Vi gör:**
```typescript
const utilization = Math.min(1.0, concurrencyAdjustedTime / 10);
```

**Problem:** Vi baserar utilization på response time, inte modellstorlek. Enligt metodologin ska utilization vara baserad på modellens komplexitet.

### 3. Section 3.4 - Server Overhead
**Metodologi säger:**
- DL380 2U: ~600W
- DL360 1U: ~350W

**Vi gör:**
```typescript
const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / (1_000 * concurrency);
```

**Problem:** Vi delar server energy med concurrency, men enligt metodologin ska server power vara konstant per node, inte per request.

## Mindre avvikelser

### 4. Section 5.2 - Training Amortisation
**Metodologi:** 100 miljoner queries som default
**Vi:** 1 miljard queries

### 5. Section 2.2 - Time-of-Day
**Metodologi:** Specifika multipliers per tidsperiod
**Vi:** Generisk demandCurve per grid

## Åtgärdade avvikelser

### 6. Section 4.2 - Embodied Carbon Values ✅ FIXAD (2026-06-09)
**Tidigare:**
- H100: 2,200 kg (metodologi) vs 2,000 kg (implementation)
- A100: 1,600 kg (metodologi) vs 1,600 kg (implementation)

**Uppdaterad implementation:**
- H100: 2,000 kg (±30-50% osäkerhet)
- A100: 1,200 kg (±30-50% osäkerhet)
- H200: 2,500 kg (±30-50% osäkerhet)
- MI300X: 3,000 kg (±50% osäkerhet)

**Motivering:** Värdena har justerats baserat på:
- Dell/HPE server LCA rapporter (server-nivå data)
- "Chasing Carbon" (Gupta et al., HPCA 2021) - manufacturing dominerar livscykelutsläpp
- SCARIF (Ji et al., ISVLSI 2024) - chip area × process node metodik
- NVIDIA/AMD publicerar INTE per-GPU embodied carbon LCAs

**Åtgärd:** Detaljerad dokumentation tillagd i `hardware.ts` med osäkerhetskommentarer per GPU. Metodologi uppdaterad till v2.1.

### 7. Section 3.7 - PUE (Power Usage Effectiveness) ✅ FIXAD (2026-06-09)
**Tidigare:**
- Hårdkodad PUE = 1.2 för alla regioner
- Metodologi sa "1.20 for Swedish free-air cooling"

**Uppdaterad implementation:**
- Grid-specifik PUE per region:
  - Sverige: 1.15 (free-air cooling)
  - Norge: 1.15 (free-air cooling)
  - Quebec: 1.15 (free-air cooling)
  - Frankrike: 1.30 (mixed)
  - Tyskland: 1.35 (mechanical)
  - USA: 1.50 (mechanical)
  - Texas: 1.80 (extreme cooling)
  - Indien: 2.00 (extreme cooling)

**Motivering:** Klimatet påverkar kylningsbehovet dramatiskt. Sverige behöver ingen mekanisk kylning (free-air cooling), medan Texas och Indien behöver energiintensiv kylning. Detta ger ytterligare en fördel för nordiska datacenter utöver den rena elmixen.

**Åtgärd:**
- Lagt till `coolingFactor` och `typicalPue` i `GridRegion` typen
- Uppdaterat alla regioner i `grids.ts` med klimatspecifika värden
- Uppdaterat `calculator.ts` att använda `deploymentGrid.typicalPue`
- Uppdaterat tester att verifiera grid-specifik PUE
- Metodologi uppdaterad till v2.2 med ny sektion "Climate-Advantageous Cooling"

## Föreslagna åtgärder

1. **Fixa GPU time allocation** - Använd metodologins formel
2. **Fixa utilization** - Basera på modellstorlek, inte response time
3. **Fixa server overhead** - Konstant per node, dela på concurrency för CO₂
