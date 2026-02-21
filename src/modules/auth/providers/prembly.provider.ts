import { IDType } from "#shared/types/index.js";
import { RequestService } from "#shared/utils/index.js";
import type { VerificationProvider, VerificationResult } from "./verification.provider.js";

interface PremblyNINResponse {
  status: boolean;
  response_code: string;
  message: string;
  data?: {
    firstname?: string;
    surname?: string;
    middlename?: string;
    birthdate?: string;
    gender?: string;
    photo?: string;
    nin?: string;
  };
}

interface PremblyRCResponse {
  status: boolean;
  response_code: string;
  message: string;
  data?: {
    rc_number?: string;
    company_name?: string;
    registration_date?: string;
    company_type?: string;
    status?: string;
  };
}

type PremblyResponse = PremblyNINResponse | PremblyRCResponse;

export class PremblyVerificationProvider implements VerificationProvider {
  private requestService: RequestService;
  private apiKey: string;
  private baseURL = "https://api.prembly.com";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PREMBLY_API_KEY || "";
    
    if (!this.apiKey) {
      throw new Error(
        "Prembly API key is required. Set PREMBLY_API_KEY environment variable or pass it to the constructor."
      );
    }

    this.requestService = new RequestService(this.baseURL, {
      accept: "application/json",
      "content-type": "application/json",
      "X-API-Key": this.apiKey,
    });
  }

  async verify(
    idNumber: string,
    idType: IDType
  ): Promise<Record<string, unknown>> {
    try {
      if (idType === "nigerian_national_id") {
        return await this.verifyNIN(idNumber);
      }

      if (idType === "rc_number") {
        return await this.verifyRCNumber(idNumber);
      }

      throw new Error(`Unsupported ID type: ${idType}`);
    } catch (error) {
      return {
        status: false,
        response_code: "ERROR",
        message:
          error instanceof Error ? error.message : "Verification failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  transform(data: Record<string, unknown>): VerificationResult {
    const response = data as unknown as PremblyResponse;

    if ("error" in data && data.error) {
      return {
        isValid: false,
        error: typeof data.error === "string" ? data.error : "Verification failed",
        data,
      };
    }

    if (!response.status || response.response_code !== "200") {
      return {
        isValid: false,
        error: response.message || "Verification failed",
        data,
      };
    }

    return {
      isValid: true,
      data: response.data || data,
    };
  }

  private async verifyNIN(idNumber: string): Promise<Record<string, unknown>> {
    const response = await this.requestService.post<PremblyNINResponse>(
      "/verification/vnin-basic",
      { number: idNumber },
      {
        retry: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        },
      }
    );

    return response as unknown as Record<string, unknown>;
  }

  private async verifyRCNumber(
    rcNumber: string
  ): Promise<Record<string, unknown>> {
    // Remove "RC-" prefix if present for the API call
    const number = rcNumber.replace(/^RC-/, "");

    const response = await this.requestService.post<PremblyRCResponse>(
      "verification/cac",
      { number },
      {
        retry: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        },
      }
    );

    return response as unknown as Record<string, unknown>;
  }
}

