import { IDType } from "#shared/types/index.js";

export interface VerificationResult {
  isValid: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface VerificationProvider {
  verify(idNumber: string, idType: IDType): Promise<Record<string, unknown>>;
  transform(data: Record<string, unknown>): VerificationResult;
}

