# CO2 Emissions Calculator Library

## Overview

This is a standalone open-source library for calculating CO₂ emissions from AI inference, based on the SCI-AI specification.

## Structure

```
co2-emissions-calculator/
├── package.json              # npm package configuration
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest test configuration
├── Dockerfile                # Docker configuration
├── README.md                 # Main documentation
├── METHODOLOGY.md            # Detailed methodology
├── LICENSE                   # MIT License
├── .gitignore                # Git ignore rules
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── calculator.ts         # Core CO2 calculation logic
│   ├── huggingface.ts        # Hugging Face API integration
│   ├── api/
│   │   ├── server.ts         # Express API server
│   │   └── index.ts          # API exports
│   └── __tests__/
│       └── calculator.test.ts # Unit tests
└── examples/
    └── basic-usage.ts        # Usage examples
```

## How to Use

### Option 1: As an npm library

```bash
# Install from npm
npm install @berget/co2-emissions-calculator

# Use in your code
import { estimateCO2 } from '@berget/co2-emissions-calculator'

const result = estimateCO2({
  tokenCount: 1000,
  modelId: 'meta-llama/Llama-3.1-8B-Instruct',
  carbonIntensity: 450,
})

console.log(`CO2: ${result.co2Grams} grams`)
```

### Option 2: As a standalone API server

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Start the API server
npm start:api

# API will be available at http://localhost:3001
```

API Endpoints:

- `GET /health` - Health check
- `POST /api/estimate` - Estimate CO₂ emissions
- `GET /api/models` - Get all model profiles
- `GET /api/models/:modelId` - Get specific model profile

### Option 3: As a Docker container

```bash
# Build the Docker image
docker build -t co2-emissions-calculator .

# Run the container
docker run -p 3001:3001 co2-emissions-calculator

# API will be available at http://localhost:3001
```

## Integration with Backend API

To integrate this library with your backend API:

1. **Install the library**:

```bash
cd backend-api
npm install ../co2-emissions-calculator
```

2. **Update imports** in `src/services/chat.service.ts`:

```typescript
import { estimateCO2 } from "@berget/co2-emissions-calculator";
```

3. **Replace existing CO2 calculation**:

```typescript
// Old:
const tokenBasedCo2 = estimateCo2FromTokens(finalUsage.total_tokens);
const totalCo2 = gpuCo2Grams > 0 ? gpuCo2Grams : tokenBasedCo2;

// New:
const co2Estimation = estimateCO2({
  tokenCount: finalUsage.total_tokens,
  energyJoules: gpuEnergyJoules,
  modelId: request.model,
  carbonIntensity: gpuMetricsConfig.co2Factor,
});
const totalCo2 = co2Estimation.co2Grams;
```

## Publishing to npm

1. **Update version** in `package.json`:

```bash
npm version patch  # or minor, major
```

2. **Build the library**:

```bash
npm run build
```

3. **Publish to npm**:

```bash
npm publish
```

4. **Tag the release**:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Run example
npx tsx examples/basic-usage.ts
```

## Scientific References

This library implements:

1. **Software Carbon Intensity (SCI) Specification** - ISO/IEC 21031:2024
2. **SCI for AI Specification** - Green Software Foundation
3. **Strubell et al. (2019)** - "Energy and Policy Considerations for Deep Learning in NLP"
4. **Lacoste et al. (2019)** - "Quantifying the Carbon Emissions of Machine Learning"
5. **Hugging Face Model Cards CO2** - Industry standard for reporting AI model carbon emissions

See [METHODOLOGY.md](./METHODOLOGY.md) for detailed methodology.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- 📧 Email: engineering@berget.ai
- 🐛 Issues: [GitHub Issues](https://github.com/berget-ai/co2-emissions-calculator/issues)

---

Made with ❤️ by Berget
