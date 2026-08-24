import assert from 'node:assert/strict';
import {
  calculateChargeFromResolvedData,
  type ChargeInput,
  type ResolvedChargeData,
} from './rateEngine';

function runCase(
  name: string,
  input: ChargeInput,
  resolved: ResolvedChargeData,
  expected: {
    volumetricWeightKg: number;
    chargeableWeightKg: number;
    baseCharge: number;
    codSurcharge: number;
    totalCharge: number;
  },
): void {
  const result = calculateChargeFromResolvedData(input, resolved);

  assert.equal(result.volumetricWeightKg, expected.volumetricWeightKg);
  assert.equal(result.chargeableWeightKg, expected.chargeableWeightKg);
  assert.equal(result.baseCharge, expected.baseCharge);
  assert.equal(result.codSurcharge, expected.codSurcharge);
  assert.equal(result.totalCharge, expected.totalCharge);

  console.log(`${name}: PASS`);
  console.log(JSON.stringify(result, null, 2));
}

runCase(
  'Intra-zone B2C prepaid',
  {
    pickupPincode: '110001',
    dropPincode: '110002',
    lengthCm: 50,
    breadthCm: 40,
    heightCm: 30,
    actualWeightKg: 10,
    orderType: 'B2C',
    paymentType: 'prepaid',
  },
  {
    pickupZone: { id: 'zone-a', name: 'Zone A' },
    dropZone: { id: 'zone-a', name: 'Zone A' },
    rateCard: {
      id: 'b2c-intra',
      basePrice: 60,
      pricePerKg: 14,
      codSurchargeFlat: 20,
      codSurchargePct: 1,
    },
  },
  {
    volumetricWeightKg: 12,
    chargeableWeightKg: 12,
    baseCharge: 228,
    codSurcharge: 0,
    totalCharge: 228,
  },
);

runCase(
  'Inter-zone B2B COD',
  {
    pickupPincode: '110001',
    dropPincode: '400001',
    lengthCm: 40,
    breadthCm: 30,
    heightCm: 25,
    actualWeightKg: 8,
    orderType: 'B2B',
    paymentType: 'cod',
  },
  {
    pickupZone: { id: 'zone-a', name: 'Zone A' },
    dropZone: { id: 'zone-b', name: 'Zone B' },
    rateCard: {
      id: 'b2b-inter',
      basePrice: 180,
      pricePerKg: 25,
      codSurchargeFlat: 40,
      codSurchargePct: 1.5,
    },
  },
  {
    volumetricWeightKg: 6,
    chargeableWeightKg: 8,
    baseCharge: 380,
    codSurcharge: 45.7,
    totalCharge: 425.7,
  },
);

runCase(
  'Intra-zone B2B COD',
  {
    pickupPincode: '110001',
    dropPincode: '110003',
    lengthCm: 10,
    breadthCm: 10,
    heightCm: 10,
    actualWeightKg: 5,
    orderType: 'B2B',
    paymentType: 'cod',
  },
  {
    pickupZone: { id: 'zone-a', name: 'Zone A' },
    dropZone: { id: 'zone-a', name: 'Zone A' },
    rateCard: {
      id: 'b2b-intra',
      basePrice: 100,
      pricePerKg: 18,
      codSurchargeFlat: 30,
      codSurchargePct: 1,
    },
  },
  {
    volumetricWeightKg: 0.2,
    chargeableWeightKg: 5,
    baseCharge: 190,
    codSurcharge: 31.9,
    totalCharge: 221.9,
  },
);

runCase(
  'Inter-zone B2C prepaid',
  {
    pickupPincode: '110001',
    dropPincode: '400001',
    lengthCm: 50,
    breadthCm: 40,
    heightCm: 30,
    actualWeightKg: 10,
    orderType: 'B2C',
    paymentType: 'prepaid',
  },
  {
    pickupZone: { id: 'zone-a', name: 'Zone A' },
    dropZone: { id: 'zone-b', name: 'Zone B' },
    rateCard: {
      id: 'b2c-inter',
      basePrice: 110,
      pricePerKg: 20,
      codSurchargeFlat: 25,
      codSurchargePct: 1.25,
    },
  },
  {
    volumetricWeightKg: 12,
    chargeableWeightKg: 12,
    baseCharge: 350,
    codSurcharge: 0,
    totalCharge: 350,
  },
);
