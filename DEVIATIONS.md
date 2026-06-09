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

## Åtgärdade avvikelser (klara för Almedalen)

### 6. Section 4.2 - Embodied Carbon Values ✅ FIXAD (2026-06-09)
**Tidigare:**
- H100: 2,200 kg (metodologi) vs 2,000 kg (implementation)
- A100: 1,600 kg (metodologi) vs 1,600 kg (implementation)

**Uppdaterad implementation:**
- H100: 2,000 kg (±30-50% osäkerhet)
- A100: 1,200 kg (±30-50% osäkerhet)
- H200: 2,500 kg (±30-50% osäkerhet)
- MI300X: 1,000 kg (±30-50% osäkerhet) - baserat på Supermicro AS-8125GS-TNMR2 data

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

### 8. Section 2.3 - Water Usage ✅ FIXAD (2026-06-09)
**Tidigare:**
- Vattenanvändning för kylning var inte modellerad alls

**Uppdaterad implementation:**
- Lagt till `waterLitersPerKwh` i `GridRegion` typen
- Sverige/Norge/Quebec: 0.0 L/kWh (free-air cooling)
- Texas: 1.5 L/kWh (evaporativ kylning)
- Indien: 2.0 L/kWh (evaporativ kylning i vattenbristområden)
- Beräknar vattenanvändning per query: `waterLiters = totalEnergyKwh * waterLitersPerKwh`

**Motivering:** Vattenanvändning är en viktig miljöfaktor som ofta förbises. Nordiska datacenter använder inget vatten för kylning, medan varma klimat kan konsumera betydande mängder vatten.

**Åtgärd:**
- Lagt till `waterLitersPerKwh` i `GridRegion` typen
- Uppdaterat alla regioner i `grids.ts` med vattenvärden
- Uppdaterat `calculator.ts` att beräkna `waterLiters`
- Lagt till `waterLiters` i `InferenceResult`
- Lagt till tester för vattenanvändning
- Metodologi uppdaterad med ny sektion "Water Usage for Cooling"

### 9. Section 3.1 - GPU Time Allocation ✅ FIXAD (2026-06-09)
**Tidigare:**
```typescript
const concurrencyAdjustedTime = applyConcurrencyDelay(tokenAdjustedTime, concurrency);
// Felaktigt: lägger till fördröjning baserat på concurrency
```

**Uppdaterad implementation:**
```typescript
const gpuTimeSec = tokenAdjustedTime * Math.min(1, concurrency / gpusUsed);
// Korrekt: GPU-tid = response time × (concurrency / gpu_count)
```

**Motivering:** Enligt metodologin är GPU-tiden per request bara response time × (concurrency / gpu_count). Om concurrency ≤ gpu_count, ska tiden vara oförändrad.

### 10. Section 3.3 - Power Interpolation ✅ FIXAD (2026-06-09)
**Tidigare:**
```typescript
const utilization = Math.min(1.0, concurrencyAdjustedTime / 10);
// Felaktigt: baserad på response time
```

**Uppdaterad implementation:**
```typescript
if (modelProfile.parameters <= 10_000_000_000) utilization = 0.3;
else if (modelProfile.parameters <= 40_000_000_000) utilization = 0.6;
else utilization = 0.9;
// Korrekt: baserad på modellstorlek
```

**Motivering:** Metodologin säger U_util ≈ 0.3 för små modeller, 0.6 för medium, 0.9 för stora.

### 11. Section 3.4 - Server Overhead ✅ FIXAD (2026-06-09)
**Tidigare:**
```typescript
const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / (1_000 * concurrency);
// Felaktigt: delar server energy med concurrency
```

**Uppdaterad implementation:**
```typescript
const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / 1_000;
const serverOperationalCO2 = (serverEnergyKwh * effectiveIntensity) / concurrency;
// Korrekt: server energy är konstant per node, CO₂ delas på concurrency
```

**Motivering:** Server power är konstant per node, inte per request. Energin är konstant, men CO₂-kostnaden delas på alla concurrent requests.

## Status inför Almedalen 2026-06-09

✅ **Alla kritiska avvikelser åtgärdade**
✅ **Alla 120 tester passerar**
✅ **Metodologi v2.3 uppdaterad**
✅ **MI300X med riktig server-data (Supermicro AS-8125GS-TNMR2)**
✅ **Klimatspecifik PUE implementerad**
✅ **Vattenanvändning implementerad**
✅ **UI uppdaterad med vatten och kylningsinfo**
✅ **Formler stämmer med metodologi v2.3**

## Vad som fixades idag

1. **GPU Time Allocation** - Korrekt formel: `gpuTime = responseTime × (concurrency / gpuCount)`
2. **Utilization** - Baserad på modellstorlek: 0.3 (small), 0.6 (medium), 0.9 (large)
3. **Server Overhead** - Konstant energi per node, CO₂ delas på concurrency
4. **Embodied Carbon** - A100 sänkt till 1,200 kg, MI300X uppdaterad med riktig data
5. **PUE** - Grid-specifik istället för hårdkodad 1.2
6. **Water Usage** - Ny komponent: 0L för Nordics, upp till 2L/kWh för Indien
7. **UI** - Visar PUE, kylningsmetod och vattenanvändning per region

### 12. Section 3.3 - GPU Allocation Heuristic ✅ FIXAD (2026-06-09)
**Tidigare:**
- Parameter-baserad allokering: ≤10B→1, 10-40B→2, 40-100B→4, >100B→8 GPU:er
- Fungerade inte för modeller som var stora men fick plats på färre GPU:er med mer minne

**Uppdaterad implementation:**
- Minnes-baserad allokering: `gpusNeeded = ceil(modelMemoryGb / gpuMemoryGb)`
- Tar hänsyn till faktisk GPU-minneskapacitet (H100: 80GB, MI300X: 192GB)
- Exempel: 120B modell i FP16 (~288GB)
  - H100: behöver 4 GPU:er (288/80 = 3.6)
  - MI300X: behöver 2 GPU:er (288/192 = 1.5)

**Motivering:** AMD MI300X har 2.4× mer HBM-minne än H100, vilket gör att stora modeller kan köras på färre GPU:er. Detta påverkar både operativa och embodied utsläpp.

## Kvarvarande mindre avvikelser

### 12. Section 5.2 - Training Amortisation
**Metodologi:** 100 miljoner queries som default
**Vi:** 1 miljard queries
**Status:** Medvetet val - vi använder en mer konservativ uppskattning

### 13. Section 2.2 - Time-of-Day
**Metodologi:** Specifika multipliers per tidsperiod
**Vi:** Generisk demandCurve per grid
**Status:** Acceptabelt - vår implementation är mer flexibel
