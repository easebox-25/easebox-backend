import type { ApiResponse, AuthResponse } from "#shared/types/index.js";
import type { NextFunction, Request, Response } from "express";

import {
  isValidProvider,
  type OAuthProvider,
  type OAuthProviderProfile,
} from "../providers/better-auth.provider.js";
import {
  OAuthAuthError,
  OAuthAuthService,
} from "../services/oauth-auth.service.js";

interface OAuthCallbackBody {
  email: string;
  email_verified?: boolean;
  emailVerified?: boolean;
  id: string;
  name?: string;
}

export class OAuthController {
  constructor(private oauthAuthService: OAuthAuthService) {}

  getLinkedProviders = async (
    req: Request,
    res: Response<ApiResponse<{ providers: string[] }>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as Request & { user?: { userId: string } }).user
        ?.userId;

      if (!userId) {
        res.status(401).json({
          message: "Authentication required",
          success: false,
        });
        return;
      }

      const providers = await this.oauthAuthService.getLinkedProviders(userId);

      res.status(200).json({
        data: { providers },
        message: "Linked providers retrieved successfully",
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle OAuth callback from provider.
   * This is called after Better Auth completes the OAuth handshake.
   */
  handleCallback = async (
    req: Request<{ provider: string }>,
    res: Response<ApiResponse<AuthResponse>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { provider } = req.params;

      if (!isValidProvider(provider)) {
        res.status(400).json({
          message: `Invalid OAuth provider: ${provider}`,
          success: false,
        });
        return;
      }

      const profile = this.extractProfileFromRequest(req, provider);

      if (!profile) {
        res.status(400).json({
          message: "OAuth profile not found in request",
          success: false,
        });
        return;
      }

      const { firstName, lastName } = this.parseName(profile.name ?? "");

      const result = await this.oauthAuthService.authenticateWithOAuth({
        email: profile.email,
        emailVerified: profile.emailVerified,
        firstName,
        lastName,
        provider,
        providerAccountId: profile.id,
      });

      res.status(200).json({
        data: result,
        message: "OAuth authentication successful",
        success: true,
      });
    } catch (error) {
      if (error instanceof OAuthAuthError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          message: error.message,
          success: false,
        });
        return;
      }

      next(error);
    }
  };

  unlinkProvider = async (
    req: Request<{ provider: string }>,
    res: Response<ApiResponse<void>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { provider } = req.params;
      const userId = (req as Request & { user?: { userId: string } }).user
        ?.userId;

      if (!userId) {
        res.status(401).json({
          message: "Authentication required",
          success: false,
        });
        return;
      }

      if (!isValidProvider(provider)) {
        res.status(400).json({
          message: `Invalid OAuth provider: ${provider}`,
          success: false,
        });
        return;
      }

      await this.oauthAuthService.unlinkProvider(userId, provider);

      res.status(200).json({
        message: `${provider} account unlinked successfully`,
        success: true,
      });
    } catch (error) {
      if (error instanceof OAuthAuthError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          message: error.message,
          success: false,
        });
        return;
      }

      next(error);
    }
  };

  private extractProfileFromRequest(
    req: Request,
    provider: OAuthProvider
  ): null | OAuthProviderProfile {
    const betterAuthUser = (req as Request & { user?: OAuthProviderProfile })
      .user;
    if (betterAuthUser) {
      return { ...betterAuthUser, provider };
    }

    // Check if profile is in query params (some OAuth flows)
    const { email, email_verified, id, name } = req.query;
    if (typeof email === "string" && typeof id === "string") {
      return {
        email,
        emailVerified: email_verified === "true",
        id,
        name: typeof name === "string" ? name : undefined,
        provider,
      };
    }

    // Check request body
    const body = req.body as null | OAuthCallbackBody | undefined;
    if (body?.email && body.id) {
      return {
        email: body.email,
        emailVerified: body.emailVerified ?? body.email_verified ?? false,
        id: body.id,
        name: body.name,
        provider,
      };
    }

    return null;
  }

  private getStatusCodeForError(code: string): number {
    switch (code) {
      case "CANNOT_UNLINK_ONLY_AUTH":
        return 400;
      case "OAUTH_ACCOUNT_LINKED":
        return 409;
      case "PROFILE_NOT_FOUND":
      case "USER_NOT_FOUND":
        return 404;
      default:
        return 400;
    }
  }

  private parseName(fullName: string): { firstName: string; lastName: string } {
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
}
