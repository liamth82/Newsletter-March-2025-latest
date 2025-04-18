import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define Tweet-related schemas
export type TweetFilters = {
  verifiedOnly: boolean;
  minFollowers: number;
  excludeReplies: boolean;
  excludeRetweets: boolean;
  safeMode: boolean;
  newsOutlets: string[];
  sectorId?: number; // Optional sector ID to filter tweets by this sector's handles
  followerThreshold: 'low' | 'medium' | 'high'; // Different follower level categories
  accountTypes: ('news' | 'verified' | 'influencer')[]; // Types of accounts to include
  useSampleData?: boolean; // Flag to use sample data when Twitter API is unavailable
};

export type Tweet = {
  id: string;
  text: string;
  author_username: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
};

// Add NarrativeSettings type
export type NarrativeSettings = {
  style: 'professional' | 'casual' | 'storytelling';
  tone: 'formal' | 'conversational' | 'enthusiastic' | 'analytical';
  wordCount: number;
  paragraphCount: number;
  format?: 'article' | 'newsletter' | 'report' | 'memo';
  themeStyle?: 'minimal' | 'elegant' | 'bold' | 'modern';
  useQuotes?: boolean;
  improveSentences?: boolean;
  enhanceCohesion?: boolean;
  includeTransitions?: boolean;
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").default('general'),
  styles: json("styles").default({}),
  sections: json("sections").array().default([]),
  variables: json("variables").array().default([]),
  defaultTitle: text("default_title"),
  logos: json("logos").array().default([]),
  layout: text("layout").default('custom'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Update Newsletter schema to include narrativeSettings
export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  templateId: integer("template_id").notNull(),
  name: text("name").notNull().default('Untitled Newsletter'),
  keywords: text("keywords").array().notNull(),
  scheduleTime: timestamp("schedule_time"),
  status: text("status").notNull().default('draft'),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  totalRecipients: integer("total_recipients").default(0),
  deliveryStatus: text("delivery_status").default('pending'),
  tweetContent: json("tweet_content").$type<Tweet[]>().array().default([]),
  tweetFilters: json("tweet_filters").$type<TweetFilters>().default({
    verifiedOnly: false,
    minFollowers: 0,
    excludeReplies: false,
    excludeRetweets: false,
    safeMode: true,
    newsOutlets: [],
    followerThreshold: 'low',
    accountTypes: [],
    sectorId: undefined
  }),
  narrativeSettings: json("narrative_settings").$type<NarrativeSettings>().default({
    style: 'professional',
    tone: 'formal',
    wordCount: 300,
    paragraphCount: 6,
    format: 'newsletter',
    themeStyle: 'minimal',
    useQuotes: false,
    improveSentences: true,
    enhanceCohesion: true,
    includeTransitions: true
  })
});

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  newsletterId: integer("newsletter_id").notNull(),
  eventType: text("event_type").notNull(), // 'view', 'click', 'bounce'
  eventData: json("event_data").default({}),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const analyticsAggregates = pgTable("analytics_aggregates", {
  id: serial("id").primaryKey(),
  newsletterId: integer("newsletter_id").notNull(),
  totalViews: integer("total_views").default(0),
  uniqueViews: integer("unique_views").default(0),
  totalClicks: integer("total_clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  bounceRate: integer("bounce_rate").default(0),
  avgReadTime: integer("avg_read_time").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const sectors = pgTable("sectors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  handles: text("handles").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTemplateSchema = createInsertSchema(templates).pick({
  name: true,
  content: true,
  category: true,
  styles: true,
  sections: true,
  variables: true,
  defaultTitle: true,
  logos: true,
  layout: true,
});

export const insertNewsletterSchema = createInsertSchema(newsletters).pick({
  templateId: true,
  keywords: true,
  name: true,
}).extend({
  templateId: z.number(),
  keywords: z.array(z.string()),
  name: z.string().min(1, "Newsletter name is required"),
  tweetFilters: z.object({
    verifiedOnly: z.boolean().optional(),
    minFollowers: z.number().optional(),
    excludeReplies: z.boolean().optional(),
    excludeRetweets: z.boolean().optional(),
    safeMode: z.boolean().optional(),
    newsOutlets: z.array(z.string()).optional(),
    sectorId: z.number().optional(),
    followerThreshold: z.enum(['low', 'medium', 'high']).optional(),
    accountTypes: z.array(z.enum(['news', 'verified', 'influencer'])).optional(),
    useSampleData: z.boolean().optional()
  }).optional(),
  narrativeSettings: z.object({
    style: z.enum(['professional', 'casual', 'storytelling']),
    tone: z.enum(['formal', 'conversational', 'enthusiastic', 'analytical']),
    wordCount: z.number().min(100).max(1000),
    paragraphCount: z.number().min(1).max(12),
    format: z.enum(['article', 'newsletter', 'report', 'memo']).optional(),
    themeStyle: z.enum(['minimal', 'elegant', 'bold', 'modern']).optional(),
    useQuotes: z.boolean().optional(),
    improveSentences: z.boolean().optional(),
    enhanceCohesion: z.boolean().optional(),
    includeTransitions: z.boolean().optional()
  }).optional()
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).pick({
  newsletterId: true,
  eventType: true,
  eventData: true,
  userAgent: true,
  ipAddress: true,
});

export const insertSectorSchema = createInsertSchema(sectors).pick({
  name: true,
  description: true,
  handles: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Newsletter = typeof newsletters.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type AnalyticsAggregate = typeof analyticsAggregates.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type InsertSector = z.infer<typeof insertSectorSchema>;