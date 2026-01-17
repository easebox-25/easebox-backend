import type { User } from "#infrastructure/database/schema/users.js";
import type { CompanyProfileRepository } from "#repositories/company-profile.repository.js";
import type { IndividualProfileRepository } from "#repositories/individual-profile.repository.js";
import type { UserRepository } from "#repositories/user.repository.js";
import type {
  AuthResponse,
  LoginInput,
  RegisterCompanyInput,
  RegisterIndividualInput,
} from "#shared/types/index.js";

import { generateTokens } from "#shared/utils/jwt.js";
import { hashPassword, verifyPassword } from "#shared/utils/password.js";

import type { VerificationService } from "./verification.service.js";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private individualProfileRepository: IndividualProfileRepository,
    private companyProfileRepository: CompanyProfileRepository,
    private verificationService: VerificationService
  ) {}

  async registerIndividual(
    input: RegisterIndividualInput
  ): Promise<AuthResponse> {
    const existingUser = await this.userRepository.existsByEmail(input.email);
    if (existingUser) {
      throw new AuthError(
        "A user with this email already exists",
        "EMAIL_EXISTS"
      );
    }

    if (!input.termsAccepted) {
      throw new AuthError(
        "You must accept the terms and conditions",
        "TERMS_NOT_ACCEPTED"
      );
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await this.userRepository.create({
      email: input.email.toLowerCase().trim(),
      password: hashedPassword,
      termsAccepted: true,
      userType: "individual",
    });

    const profile = await this.individualProfileRepository.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() ?? null,
      userId: user.id,
    });

    // Send verification email (don't block registration on failure)
    try {
      await this.verificationService.sendEmailVerification(user.id);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

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

  async registerCompany(input: RegisterCompanyInput): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await this.userRepository.existsByEmail(
      input.companyEmail
    );
    if (existingUser) {
      throw new AuthError(
        "A user with this email already exists",
        "EMAIL_EXISTS"
      );
    }

    // Check if RC number already exists
    const existingCompany = await this.companyProfileRepository.findByRcNumber(
      input.rcNumber
    );
    if (existingCompany) {
      throw new AuthError(
        "A company with this RC number already exists",
        "RC_NUMBER_EXISTS"
      );
    }

    if (!input.termsAccepted) {
      throw new AuthError(
        "You must accept the terms and conditions",
        "TERMS_NOT_ACCEPTED"
      );
    }

    const hashedPassword = await hashPassword(input.password);

    // Create user account
    const user = await this.userRepository.create({
      email: input.companyEmail.toLowerCase().trim(),
      password: hashedPassword,
      termsAccepted: true,
      userType: "logistics_company",
    });

    // Create company profile
    const profile = await this.companyProfileRepository.create({
      address: input.address.trim(),
      companyEmail: input.companyEmail.toLowerCase().trim(),
      companyName: input.companyName.trim(),
      companyPhone: input.companyPhone?.trim() ?? null,
      logoUrl: input.logoUrl ?? null,
      rcNumber: input.rcNumber.trim(),
      userId: user.id,
    });

    // Send verification email (don't block registration on failure)
    try {
      await this.verificationService.sendEmailVerification(user.id);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

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

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.password) {
      throw new AuthError(
        "This account uses social login. Please sign in with your social provider.",
        "NO_PASSWORD"
      );
    }

    const isPasswordValid = await verifyPassword(input.password, user.password);
    if (!isPasswordValid) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new AuthError(
        "Your account has been deactivated. Please contact support.",
        "ACCOUNT_DEACTIVATED"
      );
    }

    const profile = await this.individualProfileRepository.findByUserId(
      user.id
    );
    if (!profile) {
      throw new AuthError("User profile not found", "PROFILE_NOT_FOUND");
    }

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

  private sanitizeUser(user: User): Omit<User, "password"> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...sanitized } = user;
    return sanitized;
  }
}
