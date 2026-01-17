import type {
  CompanyProfile,
  IndividualProfile,
  OtpType,
} from "#infrastructure/database/schema/users.js";

export interface ApiResponse<T = unknown> {
  data?: T;
  errors?: Record<string, string[]>;
  message: string;
  success: boolean;
}

export interface AuthResponse {
  profile: CompanyProfile | IndividualProfile;
  tokens: AuthTokens;
  user_id: string;
}

export interface AuthTokenPayload {
  email: string;
  userId: string;
  userType: UserType;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OAuthAuthInput {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  provider: OAuthProviderType;
  providerAccountId: string;
}

// OAuth types
export type OAuthProviderType = "apple" | "google";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterCompanyInput {
  address: string;
  companyEmail: string;
  companyName: string;
  companyPhone?: string;
  logoUrl?: string;
  password: string;
  rcNumber: string;
  termsAccepted: boolean;
}

export interface RegisterIndividualInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  termsAccepted: boolean;
}

export interface RequestVerificationInput {
  type: OtpType;
  userId: string;
}

export type UserType = "individual" | "logistics_company" | "rider";

export interface VerifyOtpInput {
  code: string;
  type: OtpType;
  userId: string;
}
