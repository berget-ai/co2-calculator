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

## Föreslagna åtgärder

1. **Fixa GPU time allocation** - Använd metodologins formel
2. **Fixa utilization** - Basera på modellstorlek, inte response time
3. **Fixa server overhead** - Konstant per node, dela på concurrency för CO₂
