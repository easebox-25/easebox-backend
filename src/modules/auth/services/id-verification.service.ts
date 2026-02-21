import { CompanyProfile, IndividualProfile, RiderProfile } from "#infrastructure/database/schema/users.js";
import type { CompanyProfileRepository } from "#repositories/company-profile.repository.js";
import type { UserRepository } from "#repositories/user.repository.js";
import { IDType, type UserType } from "#shared/types/index.js";

import type { VerificationProvider, VerificationResult } from "../providers/verification.provider.js";


const VALID_ID_TYPES: Record<UserType, readonly IDType[]> = {
  "logistics_company": ["rc_number"],
  "individual": ["nigerian_national_id"],
  "rider": ["nigerian_national_id"],
} as const;

export class IdVerificationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "IdVerificationError";
  }
}

export class IdVerificationService {
  constructor(
    private verificationProvider: VerificationProvider,
    private userRepository: UserRepository,
    private companyProfileRepository: CompanyProfileRepository
  ) {}

  async verifyId(
    userId: string,
    idNumber: string,
    idType: IDType
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new IdVerificationError("User not found", "USER_NOT_FOUND");
    }

    if (!VALID_ID_TYPES[user.userType]?.includes(idType)) {
      throw new IdVerificationError(
        "This ID type is not supported for this user type",
        "INVALID_ID_TYPE"
      );
    }

    // Route to appropriate verification method based on ID type
    switch (idType) {
      case "rc_number":
        await this.verifyRCNumber(userId, idNumber);
        break;
      case "nigerian_national_id":
        await this.verifyNigerianNationalId(userId, idNumber);
        break;
      default:
        throw new IdVerificationError(
          "Unsupported ID type",
          "UNSUPPORTED_ID_TYPE"
        );
    }
  }

  private async verifyRCNumber(
    userId: string,
    idNumber: string
  ): Promise<void> {
    
    if (!/^\d{6}$/.test(idNumber)) {
      throw new IdVerificationError(
        "RC Number must be a string of exactly 6 digits (e.g., 092932)",
        "INVALID_RC_FORMAT"
      );
    }

    const companyProfile = await this.companyProfileRepository.findByUserId(
      userId
    );
    if (!companyProfile) {
      throw new IdVerificationError(
        "Company profile not found",
        "PROFILE_NOT_FOUND"
      );
    }

    const existingCompany =
      await this.companyProfileRepository.findByRcNumber(idNumber);
    if (existingCompany && existingCompany.userId !== userId) {
      throw new IdVerificationError(
        "A company with this RC number already exists",
        "RC_NUMBER_EXISTS"
      );
    }

    const response = await this.verificationProvider.verifyRCNumber(idNumber);

    const verificationResult = this.verificationProvider.transform(response);

    if (!verificationResult.isValid || 
      !this.checkBusinessName(companyProfile, verificationResult) || 
      !this.checkAddress(companyProfile, verificationResult)) {
      throw new IdVerificationError(
        verificationResult.error ?? "ID verification failed",
        "VERIFICATION_FAILED"
      );
    }

    await this.companyProfileRepository.updateByUserId(userId, {
      rcNumber: idNumber,
    });
  }

  private async verifyNigerianNationalId(userId: string, idNumber: string): Promise<void> {

    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new IdVerificationError("User not found", "USER_NOT_FOUND");
    }
    
    const existingUser = await this.userRepository.findByVerificationIdNumber(idNumber);
    if (existingUser && existingUser.id !== userId) {
      throw new IdVerificationError(
        "A user with this Nigerian National ID already exists",
        "NIGERIAN_NATIONAL_ID_EXISTS"
      );
    }
    
    const response = await this.verificationProvider.verifyNIN(idNumber);

    const verificationResult = this.verificationProvider.transform(response);

    if (!verificationResult.isValid) {
      throw new IdVerificationError(
        verificationResult.error ?? "ID verification failed",
        "VERIFICATION_FAILED"
      );
    }
  }

  private checkName(user: RiderProfile, verificationResult: VerificationResult): boolean {
    if (!verificationResult.data) {
      return false;
    }

    const verificationFirstName = String(verificationResult.data.firstname || "").trim();
    const verificationMiddleName = String(verificationResult.data.middlename || "").trim();
    const verificationSurname = String(verificationResult.data.surname || "").trim();

    const verificationFullName = [
      verificationFirstName,
      verificationMiddleName,
      verificationSurname,
    ]
      .filter((part) => part.length > 0)
      .join(" ")
      .toLowerCase()
      .trim();

    const userFirstName = String(user.firstName || "").trim();
    const userMiddleName = String(user.middleName || "").trim();
    const userLastName = String(user.lastName || "").trim();

    const userFullName = [userFirstName, userMiddleName, userLastName]
      .filter((part) => part.length > 0)
      .join(" ")
      .toLowerCase()
      .trim();

    return verificationFullName === userFullName;
  }

  private checkBusinessName(company: CompanyProfile, verificationResult: VerificationResult): boolean {
    const companyName = verificationResult.data?.company_name;
    if (
      !companyName ||
      typeof companyName !== "string" ||
      companyName.toLocaleLowerCase() !== company.companyName.toLocaleLowerCase()
    ) {
      return false;
    }
    return true;
  }

  private checkAddress(user: CompanyProfile | RiderProfile, verificationResult: VerificationResult): boolean {
    const address = verificationResult.data?.address;
    if (
      !address ||
      typeof address !== "string" ||
      address.toLocaleLowerCase() !== user.address.toLocaleLowerCase()
    ) {
      return false;
    }
    return true;
  }
}

