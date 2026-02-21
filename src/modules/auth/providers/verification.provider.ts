export interface VerificationResult {
  isValid: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface VerificationProvider {
  verifyNIN(idNumber: string): Promise<Record<string, unknown>>;
  verifyRCNumber(rcNumber: string): Promise<Record<string, unknown>>;
  transform(data: Record<string, unknown>): VerificationResult;
}

