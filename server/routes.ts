import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTemplateSchema, insertNewsletterSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Templates
  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const template = await storage.createTemplate({
      ...parsed.data,
      userId: req.user.id,
    });
    res.status(201).json(template);
  });

  app.get("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const templates = await storage.getTemplates(req.user.id);
    res.json(templates);
  });

  // Newsletters
  app.post("/api/newsletters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertNewsletterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const newsletter = await storage.createNewsletter({
      ...parsed.data,
      userId: req.user.id,
      status: 'draft',
    });
    res.status(201).json(newsletter);
  });

  app.get("/api/newsletters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const newsletters = await storage.getNewsletters(req.user.id);
    res.json(newsletters);
  });

  // Analytics
  app.get("/api/analytics/overview", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const newsletters = await storage.getNewsletters(req.user.id);
    const analytics = await storage.getAnalyticsAggregates(req.user.id);

    const overview = {
      totalNewsletters: newsletters.length,
      scheduledNewsletters: newsletters.filter(n => n.scheduleTime).length,
      totalViews: analytics.reduce((sum, a) => sum + a.totalViews, 0),
      avgEngagement: analytics.length ? 
        Math.round(analytics.reduce((sum, a) => sum + (a.totalClicks / a.totalViews * 100), 0) / analytics.length) : 
        0
    };

    res.json(overview);
  });

  app.get("/api/analytics/aggregates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const aggregates = await storage.getAnalyticsAggregates(req.user.id);
    res.json(aggregates);
  });

  app.post("/api/analytics/events", async (req, res) => {
    const event = await storage.createAnalyticsEvent({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    res.status(201).json(event);
  });

  app.post("/api/newsletters/:id/tweets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Here we would normally make the actual Twitter API call
      // For now, we'll simulate tweet fetching based on keywords
      const newsletter = await storage.updateNewsletter(parseInt(req.params.id), {
        tweetContent: [
          { id: "1", text: "Sample tweet 1" },
          { id: "2", text: "Sample tweet 2" }
        ]
      });
      res.json(newsletter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tweets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}