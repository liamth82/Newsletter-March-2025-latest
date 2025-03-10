import { User, InsertUser, Template, Newsletter } from "@shared/schema";
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
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<number, Template>;
  private newsletters: Map<number, Newsletter>;
  sessionStore: session.Store;
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.newsletters = new Map();
    this.currentId = { users: 1, templates: 1, newsletters: 1 };
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
}

export const storage = new MemStorage();
