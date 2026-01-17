import { db } from "#infrastructure/database/index.js";
import {
  CompanyProfileRepository,
  IndividualProfileRepository,
  OAuthIdentityRepository,
  OtpRepository,
  UserRepository,
} from "#repositories/index.js";
import { uploadLogo } from "#shared/middleware/index.js";
import { toNodeHandler } from "better-auth/node";
import { Router } from "express";

import {
  AuthController,
  OAuthController,
  VerificationController,
} from "./controllers/index.js";
import { auth } from "./providers/better-auth.provider.js";
import {
  AuthService,
  OAuthAuthService,
  VerificationService,
} from "./services/index.js";

const router = Router();

// Initialize repositories
const userRepository = new UserRepository(db);
const individualProfileRepository = new IndividualProfileRepository(db);
const companyProfileRepository = new CompanyProfileRepository(db);
const otpRepository = new OtpRepository(db);
const oauthIdentityRepository = new OAuthIdentityRepository(db);

// Initialize services
const verificationService = new VerificationService(
  otpRepository,
  userRepository
);
const authService = new AuthService(
  userRepository,
  individualProfileRepository,
  companyProfileRepository,
  verificationService
);
const oauthAuthService = new OAuthAuthService(
  userRepository,
  oauthIdentityRepository,
  individualProfileRepository
);

// Initialize controllers
const authController = new AuthController(authService);
const verificationController = new VerificationController(verificationService);
const oauthController = new OAuthController(oauthAuthService);

router.post("/individual/register", authController.registerIndividual);
router.post("/individual/login", authController.login);

router.post(
  "/company/register",
  uploadLogo.single("logo"),
  authController.registerCompany
);

router.post(
  "/verification/request",
  verificationController.requestVerification
);
router.post("/verification/verify", verificationController.verifyAccount);

router.all("/oauth/*splat", (req, res) => {
  return toNodeHandler(auth)(req, res);
});

router.post("/oauth/:provider/token", oauthController.issueTokens);
router.get("/oauth/providers", oauthController.getLinkedProviders);
router.delete("/oauth/:provider/unlink", oauthController.unlinkProvider);

export default router;
