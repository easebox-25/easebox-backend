import type { VerificationProvider, VerificationResult } from "./verification.provider.js";

export class DummyVerificationProvider implements VerificationProvider {
  async verifyNIN(idNumber: string): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            idNumber,
            idType: "nigerian_national_id",
            verifiedAt: new Date().toISOString(),
          },
          isValid: true,
        });
      }, 500);
    });
  }

  async verifyRCNumber(rcNumber: string): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            idNumber: rcNumber,
            idType: "rc_number",
            verifiedAt: new Date().toISOString(),
          },
          isValid: true,
        });
      }, 500);
    });
  }

  transform(data: Record<string, unknown>): VerificationResult {
    return {
      isValid: true,
      data,
    };
  }
}

