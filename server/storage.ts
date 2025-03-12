import { User, InsertUser, Template, Newsletter, AnalyticsEvent, AnalyticsAggregate, Sector, InsertSector, users, templates, newsletters, analyticsEvents, analyticsAggregates, sectors } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Template operations
  createTemplate(template: Omit<Template, "id" | "createdAt">): Promise<Template>;
  getTemplates(userId: number): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;

  // Newsletter operations
  createNewsletter(newsletter: Omit<Newsletter, "id" | "createdAt" | "tweetContent">): Promise<Newsletter>;
  getNewsletters(userId: number): Promise<Newsletter[]>;
  getNewsletter(id: number): Promise<Newsletter | undefined>;
  updateNewsletter(id: number, data: Partial<Newsletter>): Promise<Newsletter>;

  // Analytics operations
  createAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<AnalyticsEvent>;
  getAnalyticsAggregates(userId: number): Promise<AnalyticsAggregate[]>;

  // Sector operations
  createSector(sector: Omit<Sector, "id" | "createdAt"> & { userId: number }): Promise<Sector>;
  getSectors(userId: number): Promise<Sector[]>;
  getSector(id: number): Promise<Sector | undefined>;
  updateSector(id: number, data: Partial<Sector>): Promise<Sector>;
  deleteSector(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async createTemplate(template: Omit<Template, "id" | "createdAt">): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newTemplate;
  }

  async getTemplates(userId: number): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.userId, userId));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createNewsletter(newsletter: Omit<Newsletter, "id" | "createdAt" | "tweetContent">): Promise<Newsletter> {
    try {
      // Ensure arrays are properly initialized
      const payload = {
        ...newsletter,
        createdAt: new Date(),
        tweetContent: [], // Initialize as empty array
        keywords: Array.isArray(newsletter.keywords) ? newsletter.keywords : [], // Ensure keywords is an array
        tweetFilters: {
          ...newsletter.tweetFilters,
          newsOutlets: Array.isArray(newsletter.tweetFilters?.newsOutlets)
            ? newsletter.tweetFilters.newsOutlets
            : []
        }
      };

      const [newNewsletter] = await db
        .insert(newsletters)
        .values(payload)
        .returning();

      return newNewsletter;
    } catch (error) {
      console.error('Error creating newsletter:', error);
      throw new Error('Failed to create newsletter');
    }
  }

  async getNewsletters(userId: number): Promise<Newsletter[]> {
    return await db.select().from(newsletters).where(eq(newsletters.userId, userId));
  }

  async getNewsletter(id: number): Promise<Newsletter | undefined> {
    const [newsletter] = await db.select().from(newsletters).where(eq(newsletters.id, id));
    return newsletter;
  }

  async updateNewsletter(id: number, data: Partial<Newsletter>): Promise<Newsletter> {
    const [updated] = await db
      .update(newsletters)
      .set(data)
      .where(eq(newsletters.id, id))
      .returning();

    if (!updated) {
      throw new Error("Newsletter not found");
    }

    return updated;
  }

  async createAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<AnalyticsEvent> {
    const [newEvent] = await db.insert(analyticsEvents).values({
      ...event,
      timestamp: new Date()
    }).returning();
    return newEvent;
  }

  async getAnalyticsAggregates(userId: number): Promise<AnalyticsAggregate[]> {
    // First get all newsletter IDs for this user
    const userNewsletters = await db.select().from(newsletters).where(eq(newsletters.userId, userId));
    const newsletterIds = userNewsletters.map(n => n.id);

    // Then get aggregates for those newsletters
    return await db.select()
      .from(analyticsAggregates)
      .where(
        sql`${analyticsAggregates.newsletterId} = ANY(${newsletterIds})`
      );
  }

  async createSector(sector: Omit<Sector, "id" | "createdAt"> & { userId: number }): Promise<Sector> {
    const [newSector] = await db.insert(sectors).values({
      ...sector,
      createdAt: new Date()
    }).returning();
    return newSector;
  }

  async getSectors(userId: number): Promise<Sector[]> {
    return await db.select().from(sectors).where(eq(sectors.userId, userId));
  }

  async getSector(id: number): Promise<Sector | undefined> {
    const [sector] = await db.select().from(sectors).where(eq(sectors.id, id));
    return sector;
  }

  async updateSector(id: number, data: Partial<Sector>): Promise<Sector> {
    const [updated] = await db
      .update(sectors)
      .set(data)
      .where(eq(sectors.id, id))
      .returning();

    if (!updated) {
      throw new Error("Sector not found");
    }

    return updated;
  }

  async deleteSector(id: number): Promise<void> {
    await db.delete(sectors).where(eq(sectors.id, id));
  }
}

export const storage = new DatabaseStorage();