import type { Database } from "#infrastructure/database/index.js";
import type {
  NewOAuthIdentity,
  OAuthIdentity,
  User,
} from "#infrastructure/database/schema/users.js";

import {
  oauthIdentities,
  users,
} from "#infrastructure/database/schema/users.js";
import { and, eq } from "drizzle-orm";

export class OAuthIdentityRepository {
  constructor(private db: Database) {}

  async create(data: NewOAuthIdentity): Promise<OAuthIdentity> {
    const [identity] = await this.db
      .insert(oauthIdentities)
      .values(data)
      .returning();
    return identity;
  }

  async deleteByUserIdAndProvider(
    userId: string,
    provider: string
  ): Promise<void> {
    await this.db
      .delete(oauthIdentities)
      .where(
        and(
          eq(oauthIdentities.userId, userId),
          eq(oauthIdentities.provider, provider)
        )
      );
  }

  async findByProviderAndAccountId(
    provider: string,
    providerAccountId: string
  ): Promise<OAuthIdentity | undefined> {
    const [identity] = await this.db
      .select()
      .from(oauthIdentities)
      .where(
        and(
          eq(oauthIdentities.provider, provider),
          eq(oauthIdentities.providerAccountId, providerAccountId)
        )
      );
    return identity;
  }

  async findByUserId(userId: string): Promise<OAuthIdentity[]> {
    return this.db
      .select()
      .from(oauthIdentities)
      .where(eq(oauthIdentities.userId, userId));
  }

  async findByUserIdAndProvider(
    userId: string,
    provider: string
  ): Promise<OAuthIdentity | undefined> {
    const [identity] = await this.db
      .select()
      .from(oauthIdentities)
      .where(
        and(
          eq(oauthIdentities.userId, userId),
          eq(oauthIdentities.provider, provider)
        )
      );
    return identity;
  }

  async findUserByProviderIdentity(
    provider: string,
    providerAccountId: string
  ): Promise<undefined | User> {
    const result = await this.db
      .select({ user: users })
      .from(oauthIdentities)
      .innerJoin(users, eq(oauthIdentities.userId, users.id))
      .where(
        and(
          eq(oauthIdentities.provider, provider),
          eq(oauthIdentities.providerAccountId, providerAccountId)
        )
      );
    return result[0]?.user;
  }
}
