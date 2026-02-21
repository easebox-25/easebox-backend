import type { Database } from "#infrastructure/database/index.js";
import type { NewUser, User } from "#infrastructure/database/schema/users.js";

import { individualProfiles, users } from "#infrastructure/database/schema/users.js";
import { eq } from "drizzle-orm";

export class UserRepository {
  constructor(private db: Database) {}

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== undefined;
  }

  async findByEmail(email: string): Promise<undefined | User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async findById(id: string): Promise<undefined | User> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async update(id: string, data: Partial<NewUser>): Promise<undefined | User> {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async findByNigerianNationalId(nigerianNationalId: string): Promise<undefined | User> {
    const [user] = await this.db.select().from(users)
    .leftJoin(individualProfiles, eq(users.id, individualProfiles.userId))
    .where(eq(individualProfiles.idNumber, nigerianNationalId))
    .limit(1);
    
    return user ? user.users : undefined;
  }
}
