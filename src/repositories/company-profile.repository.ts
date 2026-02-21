import type { Database } from "#infrastructure/database/index.js";
import type {
  CompanyProfile,
  NewCompanyProfile,
} from "#infrastructure/database/schema/users.js";

import { companyProfiles } from "#infrastructure/database/schema/users.js";
import { eq } from "drizzle-orm";

export class CompanyProfileRepository {
  constructor(private db: Database) {}

  async create(data: NewCompanyProfile): Promise<CompanyProfile> {
    const [profile] = await this.db
      .insert(companyProfiles)
      .values(data)
      .returning();
    return profile;
  }

  async findById(id: string): Promise<CompanyProfile | undefined> {
    const [profile] = await this.db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.id, id));
    return profile;
  }

  async findByUserId(userId: string): Promise<CompanyProfile | undefined> {
    const [profile] = await this.db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.userId, userId));
    return profile;
  }

  async findByRcNumber(rcNumber: string): Promise<CompanyProfile | undefined> {
    const [profile] = await this.db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.rcNumber, rcNumber));
    return profile;
  }

  async update(
    id: string,
    data: Partial<NewCompanyProfile>
  ): Promise<CompanyProfile | undefined> {
    const [profile] = await this.db
      .update(companyProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companyProfiles.id, id))
      .returning();
    return profile;
  }

  async updateByUserId(
    userId: string,
    data: Partial<NewCompanyProfile>
  ): Promise<CompanyProfile | undefined> {
    const [profile] = await this.db
      .update(companyProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companyProfiles.userId, userId))
      .returning();
    return profile;
  }
}

