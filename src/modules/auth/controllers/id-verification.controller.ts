import type { ApiResponse, IDType } from "#shared/types/index.js";
import type { NextFunction, Response } from "express";

import { authenticate, type AuthenticatedRequest } from "#shared/middleware/index.js";
import { z } from "zod";

import {
  IdVerificationError,
  IdVerificationService,
} from "../services/id-verification.service.js";
import { idVerificationSchema } from "../validators/id-verification.validators.js";

export class IdVerificationController {
  constructor(private idVerificationService: IdVerificationService) {}

  verifyId = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      
      const validatedData = idVerificationSchema.parse(req.body);

      
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          message: "Authentication required",
          success: false,
        });
        return;
      }

      // Verify ID
      await this.idVerificationService.verifyId(
        userId,
        validatedData.id_number,
        validatedData.id_type as IDType
      );

      res.status(200).json({
        message: "ID verified successfully",
        success: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((issue) => {
          const path = issue.path.join(".");
          const existingErrors = errors[path] ?? [];
          existingErrors.push(issue.message);
          errors[path] = existingErrors;
        });

        res.status(400).json({
          errors,
          message: "Validation failed",
          success: false,
        });
        return;
      }

      if (error instanceof IdVerificationError) {
        const statusMap: Record<string, number> = {
          INVALID_RC_FORMAT: 400,
          INVALID_USER_TYPE: 403,
          PROFILE_NOT_FOUND: 404,
          RC_NUMBER_EXISTS: 409,
          UNSUPPORTED_ID_TYPE: 400,
          USER_NOT_FOUND: 404,
          VERIFICATION_FAILED: 400,
        };
        const statusCode = statusMap[error.code] ?? 400;

        res.status(statusCode).json({
          message: error.message,
          success: false,
        });
        return;
      }

      next(error);
    }
  };
}

// Export a middleware-wrapped version for use in routes
export function createIdVerificationController(
  idVerificationService: IdVerificationService
) {
  const controller = new IdVerificationController(idVerificationService);
  return [authenticate, controller.verifyId.bind(controller)];
}

