import { betterAuth } from "better-auth";

/**
 * Better Auth provider configuration.
 * Used ONLY for OAuth handshake and retrieving provider user profiles.
 * Does NOT handle user creation, session management, or JWT issuance.
 */

export type OAuthProvider = "apple" | "google";

export interface OAuthProviderProfile {
  email: string;
  emailVerified: boolean;
  id: string; // Provider's account ID
  name?: string;
  picture?: string;
  provider: OAuthProvider;
}

export const auth = betterAuth({
  baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});

export function getOAuthRedirectUrl(provider: OAuthProvider): string {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/v1/auth/oauth/${provider}/callback`;
}

export const SUPPORTED_PROVIDERS: OAuthProvider[] = ["google", "apple"];

export function isValidProvider(provider: string): provider is OAuthProvider {
  return SUPPORTED_PROVIDERS.includes(provider as OAuthProvider);
}
