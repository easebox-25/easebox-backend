import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    userId: string;
    userType: string;
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Authentication required. Please provide a valid token.",
        success: false,
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        message: "Invalid or expired token. Please login again.",
        success: false,
      });
      return;
    }

    // Attach user info to request
    req.user = {
      email: payload.email,
      userId: payload.userId,
      userType: payload.userType,
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: "Authentication failed",
      success: false,
    });
  }
}

