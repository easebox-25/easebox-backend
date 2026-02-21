import { IDType } from "#shared/types/index.js";
import type { VerificationProvider, VerificationResult } from "./verification.provider.js";

export class DummyVerificationProvider implements VerificationProvider {
  async verify(
    idNumber: string,
    idType: IDType
  ): Promise<Record<string, unknown>> {
    // Dummy implementation - always returns valid for now
    // In production, this would call an actual verification API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            idNumber,
            idType,
            verifiedAt: new Date().toISOString(),
          },
          isValid: true,
        });
      }, 500); // Simulate API call delay
    });
  }
  transform(data: Record<string, unknown>): VerificationResult {
    return {
      isValid: true,
      data,
    };
  }
}

