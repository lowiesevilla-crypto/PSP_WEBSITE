import { Prisma } from "@prisma/client";

export type PlatformPayMongoConfig = {
  mode: "TEST" | "LIVE";
  secretKey: string;
  platformAccountId: string;
  feeBasisPoints: number;
  fixedFeeCentavos: number;
};

function integerEnv(name: string, min: number, max: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function toCentavos(amount: Prisma.Decimal) {
  if (amount.lte(0)) throw new Error("Payment amount must be greater than zero.");
  const centavos = amount.mul(100);
  if (!centavos.isInteger()) throw new Error("Payment amount has unsupported fractional centavos.");
  const value = centavos.toNumber();
  if (!Number.isSafeInteger(value)) throw new Error("Payment amount is outside the supported range.");
  return value;
}

export function getPlatformPayMongoConfig(): PlatformPayMongoConfig {
  const secretKey = process.env.PAYMONGO_PLATFORM_SECRET_KEY?.trim();
  const platformAccountId = process.env.PAYMONGO_PLATFORM_ACCOUNT_ID?.trim();
  if (!secretKey || !platformAccountId) {
    throw new Error("PayMongo Platforms is not configured for PSP split payments.");
  }
  if (!platformAccountId.startsWith("org_")) {
    throw new Error("PAYMONGO_PLATFORM_ACCOUNT_ID must be the PayMongo platform org_* account id.");
  }

  const mode: "TEST" | "LIVE" = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";
  if (mode === "TEST" && !secretKey.startsWith("sk_test_")) {
    throw new Error("PAYMONGO_PLATFORM_SECRET_KEY must be a PayMongo test or live secret key.");
  }
  if (mode === "LIVE" && process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() !== "true") {
    throw new Error("PayMongo live processing is disabled pending test-mode signoff and explicit approval.");
  }

  const feeBasisPoints = integerEnv("PLATFORM_CONVENIENCE_FEE_BPS", 0, 10000);
  const fixedFeeCentavos = integerEnv("PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS", 0, 100000000);
  if (feeBasisPoints === 0 && fixedFeeCentavos === 0) {
    throw new Error("Platform convenience fee is not configured.");
  }

  return { mode, secretKey, platformAccountId, feeBasisPoints, fixedFeeCentavos };
}

export function calculatePlatformConvenienceFee(baseAmount: Prisma.Decimal, config = getPlatformPayMongoConfig()) {
  const baseCentavos = toCentavos(baseAmount);
  const percentageCentavos = Math.round((baseCentavos * config.feeBasisPoints) / 10000);
  const feeCentavos = Math.max(1, percentageCentavos + config.fixedFeeCentavos);
  const grossCentavos = baseCentavos + feeCentavos;

  if (!Number.isSafeInteger(grossCentavos) || grossCentavos <= baseCentavos) {
    throw new Error("Calculated split-payment amount is invalid.");
  }

  return {
    baseCentavos,
    feeCentavos,
    grossCentavos,
    feeAmount: new Prisma.Decimal(feeCentavos).div(100),
    grossAmount: new Prisma.Decimal(grossCentavos).div(100),
  };
}
