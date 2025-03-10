import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  templateId: integer("template_id").notNull(),
  keywords: text("keywords").array().notNull(),
  scheduleTime: timestamp("schedule_time"),
  status: text("status").notNull().default('draft'),
  tweetContent: json("tweet_content").array(),
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
  scheduleTime: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Newsletter = typeof newsletters.$inferSelect;