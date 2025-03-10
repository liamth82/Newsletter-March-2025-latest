import { User, InsertUser, Template, Newsletter, AnalyticsEvent, AnalyticsAggregate } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  updateNewsletter(id: number, data: Partial<Newsletter>): Promise<Newsletter>;

  // Analytics operations
  createAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<AnalyticsEvent>;
  getAnalyticsAggregates(userId: number): Promise<AnalyticsAggregate[]>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<number, Template>;
  private newsletters: Map<number, Newsletter>;
  private analyticsEvents: Map<number, AnalyticsEvent>;
  private analyticsAggregates: Map<number, AnalyticsAggregate>;
  sessionStore: session.Store;
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.newsletters = new Map();
    this.analyticsEvents = new Map();
    this.analyticsAggregates = new Map();
    this.currentId = { 
      users: 1, 
      templates: 1, 
      newsletters: 1,
      analyticsEvents: 1,
      analyticsAggregates: 1 
    };
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTemplate(template: Omit<Template, "id" | "createdAt">): Promise<Template> {
    const id = this.currentId.templates++;
    const newTemplate: Template = {
      ...template,
      id,
      createdAt: new Date(),
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async getTemplates(userId: number): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(
      (template) => template.userId === userId,
    );
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createNewsletter(newsletter: Omit<Newsletter, "id" | "createdAt" | "tweetContent">): Promise<Newsletter> {
    const id = this.currentId.newsletters++;
    const newNewsletter: Newsletter = {
      ...newsletter,
      id,
      createdAt: new Date(),
      tweetContent: [],
    };
    this.newsletters.set(id, newNewsletter);
    return newNewsletter;
  }

  async getNewsletters(userId: number): Promise<Newsletter[]> {
    return Array.from(this.newsletters.values()).filter(
      (newsletter) => newsletter.userId === userId,
    );
  }

  async updateNewsletter(id: number, data: Partial<Newsletter>): Promise<Newsletter> {
    const newsletter = this.newsletters.get(id);
    if (!newsletter) throw new Error("Newsletter not found");
    
    const updatedNewsletter = { ...newsletter, ...data };
    this.newsletters.set(id, updatedNewsletter);
    return updatedNewsletter;
  }

  async createAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<AnalyticsEvent> {
    const id = this.currentId.analyticsEvents++;
    const newEvent: AnalyticsEvent = {
      ...event,
      id,
      timestamp: new Date(),
    };
    this.analyticsEvents.set(id, newEvent);

    // Update aggregates
    const newsletter = this.newsletters.get(event.newsletterId);
    if (newsletter) {
      const existingAggregate = Array.from(this.analyticsAggregates.values())
        .find(agg => agg.newsletterId === event.newsletterId);

      if (existingAggregate) {
        const updatedAggregate: AnalyticsAggregate = {
          ...existingAggregate,
          totalViews: event.eventType === 'view' ? existingAggregate.totalViews + 1 : existingAggregate.totalViews,
          totalClicks: event.eventType === 'click' ? existingAggregate.totalClicks + 1 : existingAggregate.totalClicks,
          lastUpdated: new Date(),
        };
        this.analyticsAggregates.set(existingAggregate.id, updatedAggregate);
      } else {
        const newAggregate: AnalyticsAggregate = {
          id: this.currentId.analyticsAggregates++,
          newsletterId: event.newsletterId,
          totalViews: event.eventType === 'view' ? 1 : 0,
          uniqueViews: event.eventType === 'view' ? 1 : 0,
          totalClicks: event.eventType === 'click' ? 1 : 0,
          uniqueClicks: event.eventType === 'click' ? 1 : 0,
          bounceRate: 0,
          avgReadTime: 0,
          lastUpdated: new Date(),
        };
        this.analyticsAggregates.set(newAggregate.id, newAggregate);
      }
    }

    return newEvent;
  }

  async getAnalyticsAggregates(userId: number): Promise<AnalyticsAggregate[]> {
    const userNewsletterIds = Array.from(this.newsletters.values())
      .filter(n => n.userId === userId)
      .map(n => n.id);

    return Array.from(this.analyticsAggregates.values())
      .filter(agg => userNewsletterIds.includes(agg.newsletterId));
  }
}

export const storage = new MemStorage();