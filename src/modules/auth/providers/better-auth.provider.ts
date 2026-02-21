import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db } from "#infrastructure/database/index.js";
import {
  individualProfiles,
  users,
} from "#infrastructure/database/schema/users.js";
import { generateTokens } from "#shared/utils/jwt.js";

/**
 * Better Auth provider configuration.
 * Handles OAuth handshake AND user creation/authentication.
 * Creates users, profiles, and OAuth identities during the callback.
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

export interface OAuthCallbackResult {
  isNewUser: boolean;
  profile: {
    firstName: string;
    id: string;
    lastName: string;
    phone: string | null;
    userId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  userId: string;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return { firstName: "User", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

export const auth = betterAuth({
  baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const { firstName, lastName } = parseName(user.name ?? "");
          await db.insert(individualProfiles).values({
            firstName,
            lastName,
            phone: null,
            userId: user.id,
          });
        },

        before: async (user) => {
          return {
            data: {
              ...user,
              emailVerified: user.emailVerified ?? false,
              isActive: true,
              password: null,
              phoneVerified: false,
              termsAccepted: true,
              userType: "individual",
            },
          };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      mapProfileToUser: (profile) => {
        return {
          email: profile.email,
          emailVerified: profile.email_verified ?? false,
          name: profile.name,
        };
      },
    },
  },

  callbacks: {
    async session({
      session,
      user,
    }: {
      session: Record<string, unknown>;
      user: Record<string, unknown>;
    }) {
      return {
        ...session,
        user: {
          ...user,
          userType: (user as { userType?: string }).userType ?? "individual",
        },
      };
    },
  },
});

/**
 * Handle post-OAuth authentication to issue our JWT tokens.
 * Called after Better Auth completes the OAuth flow.
 */
export async function handleOAuthComplete(
  userId: string
): Promise<OAuthCallbackResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new Error("User not found after OAuth");
  }

  const [profile] = await db
    .select()
    .from(individualProfiles)
    .where(eq(individualProfiles.userId, userId));

  if (!profile) {
    throw new Error("Profile not found after OAuth");
  }

  const tokens = generateTokens({
    email: user.email,
    userId: user.id,
    userType: user.userType,
  });

  return {
    isNewUser: false,
    profile: {
      firstName: profile.firstName,
      id: profile.id,
      lastName: profile.lastName,
      phone: profile.phone,
      userId: profile.userId,
    },
    tokens,
    userId: user.id,
  };
}

export function getOAuthRedirectUrl(provider: OAuthProvider): string {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/v1/auth/oauth/${provider}/callback`;
}

export const SUPPORTED_PROVIDERS: OAuthProvider[] = ["google", "apple"];

export function isValidProvider(provider: string): provider is OAuthProvider {
  return SUPPORTED_PROVIDERS.includes(provider as OAuthProvider);
}
