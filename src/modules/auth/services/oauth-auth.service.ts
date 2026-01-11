import type { IndividualProfileRepository } from "#repositories/individual-profile.repository.js";
import type { OAuthIdentityRepository } from "#repositories/oauth-identity.repository.js";
import type { UserRepository } from "#repositories/user.repository.js";
import type { AuthResponse } from "#shared/types/index.js";

import { generateTokens } from "#shared/utils/jwt.js";

import type { OAuthProvider } from "../providers/better-auth.provider.js";

export interface OAuthAuthInput {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  provider: OAuthProvider;
  providerAccountId: string;
}

export class OAuthAuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "OAuthAuthError";
  }
}

export class OAuthAuthService {
  constructor(
    private userRepository: UserRepository,
    private oauthIdentityRepository: OAuthIdentityRepository,
    private individualProfileRepository: IndividualProfileRepository
  ) {}

  /**
   * Handle OAuth authentication flow.
   * 1. Find existing user by provider identity
   * 2. If not found, find by email
   * 3. If still not found, create new user
   * 4. Link OAuth identity to user
   * 5. Issue JWT tokens
   */
  async authenticateWithOAuth(input: OAuthAuthInput): Promise<AuthResponse> {
    // Step 1: Check if user already has this OAuth identity linked
    const existingUserByProvider =
      await this.oauthIdentityRepository.findUserByProviderIdentity(
        input.provider,
        input.providerAccountId
      );

    if (existingUserByProvider) {
      const profile = await this.individualProfileRepository.findByUserId(
        existingUserByProvider.id
      );

      if (!profile) {
        throw new OAuthAuthError("User profile not found", "PROFILE_NOT_FOUND");
      }

      const tokens = generateTokens({
        email: existingUserByProvider.email,
        userId: existingUserByProvider.id,
        userType: existingUserByProvider.userType,
      });

      return {
        profile,
        tokens,
        user_id: existingUserByProvider.id,
      };
    }

    // Step 2: Check if user exists by email
    const existingUserByEmail = await this.userRepository.findByEmail(
      input.email
    );

    if (existingUserByEmail) {
      // User exists with this email, link the OAuth identity
      await this.linkOAuthIdentity(
        existingUserByEmail.id,
        input.provider,
        input.providerAccountId,
        input.email
      );

      // Mark email as verified if provider confirms it
      if (input.emailVerified && !existingUserByEmail.emailVerified) {
        await this.userRepository.update(existingUserByEmail.id, {
          emailVerified: true,
        });
      }

      const profile = await this.individualProfileRepository.findByUserId(
        existingUserByEmail.id
      );

      if (!profile) {
        throw new OAuthAuthError("User profile not found", "PROFILE_NOT_FOUND");
      }

      const tokens = generateTokens({
        email: existingUserByEmail.email,
        userId: existingUserByEmail.id,
        userType: existingUserByEmail.userType,
      });

      return {
        profile,
        tokens,
        user_id: existingUserByEmail.id,
      };
    }

    // Step 3: Create new user with OAuth
    return this.createUserWithOAuth(input);
  }

  async getLinkedProviders(userId: string): Promise<string[]> {
    const identities = await this.oauthIdentityRepository.findByUserId(userId);
    return identities.map((identity) => identity.provider);
  }

  async unlinkProvider(userId: string, provider: OAuthProvider): Promise<void> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new OAuthAuthError("User not found", "USER_NOT_FOUND");
    }

    const identities = await this.oauthIdentityRepository.findByUserId(userId);
    const hasPassword = user.password !== null;

    if (!hasPassword && identities.length <= 1) {
      throw new OAuthAuthError(
        "Cannot unlink the only authentication method. Please set a password first.",
        "CANNOT_UNLINK_ONLY_AUTH"
      );
    }

    await this.oauthIdentityRepository.deleteByUserIdAndProvider(
      userId,
      provider
    );
  }

  private async createUserWithOAuth(
    input: OAuthAuthInput
  ): Promise<AuthResponse> {
    // Create user without password (OAuth-only user)
    const user = await this.userRepository.create({
      email: input.email.toLowerCase().trim(),
      emailVerified: input.emailVerified,
      password: null,
      termsAccepted: true,
      userType: "individual",
    });

    // Create individual profile
    const profile = await this.individualProfileRepository.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: null,
      userId: user.id,
    });

    // Link OAuth identity
    await this.linkOAuthIdentity(
      user.id,
      input.provider,
      input.providerAccountId,
      input.email
    );

    // Generate tokens
    const tokens = generateTokens({
      email: user.email,
      userId: user.id,
      userType: user.userType,
    });

    return {
      profile,
      tokens,
      user_id: user.id,
    };
  }

  private async linkOAuthIdentity(
    userId: string,
    provider: OAuthProvider,
    providerAccountId: string,
    providerEmail: string
  ): Promise<void> {
    const existingIdentity =
      await this.oauthIdentityRepository.findByProviderAndAccountId(
        provider,
        providerAccountId
      );

    if (existingIdentity && existingIdentity.userId !== userId) {
      throw new OAuthAuthError(
        "This OAuth account is already linked to another user",
        "OAUTH_ACCOUNT_LINKED"
      );
    }

    const userProviderIdentity =
      await this.oauthIdentityRepository.findByUserIdAndProvider(
        userId,
        provider
      );

    if (!userProviderIdentity) {
      await this.oauthIdentityRepository.create({
        provider,
        providerAccountId,
        providerEmail: providerEmail.toLowerCase().trim(),
        userId,
      });
    }
  }
}
