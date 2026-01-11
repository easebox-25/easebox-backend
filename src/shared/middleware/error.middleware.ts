import type { ApiResponse } from "#shared/types/index.js";
import type { NextFunction, Request, Response } from "express";

 
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);

  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    success: false,
  });
}
