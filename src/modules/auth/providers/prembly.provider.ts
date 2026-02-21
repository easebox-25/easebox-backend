import { RequestService } from "#shared/utils/index.js";
import type { VerificationProvider, VerificationResult } from "./verification.provider.js";

interface PremblyNINResponse {
  status: boolean;
  response_code: string;
  detail?: string;
  message?: string;
  nin_data?: {
    birthdate?: string;
    firstname?: string;
    middlename?: string;
    surname?: string;
    residence_address?: string;
    gender?: string;
    telephoneno?: string;
    photo?: string;
  };
  verification?: {
    status?: string;
    reference?: string;
    verification_id?: number;
  };
}

interface PremblyRCResponse {
  status: boolean;
  response_code: string;
  detail?: string;
  message?: string;
  data?: {
    rc_number?: string;
    company_name?: string;
    branchAddress?: string;
    company_address?: string;
    company_status?: string;
    state?: string;
    city?: string;
    lga?: string;
    registrationDate?: string;
    company_type?: string;
    email_address?: string;
  };
  verification?: {
    status?: string;
    reference?: string;
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

  async verifyNIN(idNumber: string): Promise<Record<string, unknown>> {
    try {
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

  async verifyRCNumber(rcNumber: string): Promise<Record<string, unknown>> {
    try {
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

    if (!response.status || response.response_code !== "00") {
      return {
        isValid: false,
        error:
          response.detail ||
          response.message ||
          "Verification failed",
        data,
      };
    }

    let standardizedData: Record<string, unknown> = {};

    if ("nin_data" in response && response.nin_data) {
      const ninData = response.nin_data;
      standardizedData = {
        birthdate: ninData.birthdate,
        firstname: ninData.firstname,
        middlename: ninData.middlename,
        surname: ninData.surname,
        residence_address: ninData.residence_address,
      };
    }
    
    else if ("data" in response && response.data && "company_name" in response.data) {
      const rcData = response.data;
      standardizedData = {
        company_name: rcData.company_name,
        branchAddress: rcData.branchAddress,
      };
    }
    else {
      standardizedData = data;
    }

    return {
      isValid: true,
      data: standardizedData,
    };
  }

}

