import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTemplateSchema, insertNewsletterSchema } from "@shared/schema";
import { searchTweets } from "./services/twitter";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Templates
  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Ensure template content has required placeholders
    if (!parsed.data.content || !parsed.data.content.includes('{{newsletter_title}}') || !parsed.data.content.includes('{{tweets}}')) {
      return res.status(400).json({
        message: "Template content must include {{newsletter_title}} and {{tweets}} placeholders"
      });
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

  app.get("/api/templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log('Fetching template:', req.params.id);
    try {
      const template = await storage.getTemplate(parseInt(req.params.id));
      if (!template) {
        console.log('Template not found:', req.params.id);
        return res.status(404).json({ message: "Template not found" });
      }

      // Log template content for debugging
      console.log('Template found:', {
        id: template.id,
        content: template.content,
        hasTitle: template.content?.includes('{{newsletter_title}}'),
        hasTweets: template.content?.includes('{{tweets}}')
      });

      res.json(template);
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
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

  app.get("/api/newsletters/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const newsletter = await storage.getNewsletter(parseInt(req.params.id));
      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter not found" });
      }
      res.json(newsletter);
    } catch (error) {
      console.error('Error fetching newsletter:', error);
      res.status(500).json({ message: "Failed to fetch newsletter" });
    }
  });

  // Twitter Integration
  app.post("/api/newsletters/:id/tweets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log('Fetching tweets for newsletter:', req.params.id, 'request body:', req.body);

      if (!req.body.keywords || !Array.isArray(req.body.keywords)) {
        return res.status(400).json({ message: "Keywords must be provided as an array" });
      }

      const filters = {
        verifiedOnly: req.body.verifiedOnly === true,
        minFollowers: parseInt(req.body.minFollowers) || 0,
        excludeReplies: req.body.excludeReplies === true,
        excludeRetweets: req.body.excludeRetweets === true,
        safeMode: req.body.safeMode === true,
        newsOutlets: req.body.newsOutlets || []
      };

      const tweets = await searchTweets(req.body.keywords, filters);
      console.log('Successfully fetched filtered tweets:', tweets);

      // Process tweets ensuring all required fields are present
      const processedTweets = tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_username: tweet.author_username,
        metrics: {
          retweet_count: tweet.public_metrics?.retweet_count || 0,
          reply_count: tweet.public_metrics?.reply_count || 0,
          like_count: tweet.public_metrics?.like_count || 0,
          quote_count: tweet.public_metrics?.quote_count || 0
        }
      }));

      const newsletter = await storage.updateNewsletter(parseInt(req.params.id), {
        tweetContent: processedTweets
      });

      console.log('Updated newsletter with filtered tweets:', newsletter);
      res.json(newsletter);
    } catch (error) {
      console.error('Failed to fetch tweets:', error);
      res.status(500).json({ message: "Failed to fetch tweets" });
    }
  });

  // Analytics
  app.get("/api/analytics/overview", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const newsletters = await storage.getNewsletters(req.user.id);
    const analytics = await storage.getAnalyticsAggregates(req.user.id);

    const overview = {
      totalNewsletters: newsletters.length,
      scheduledNewsletters: newsletters.filter(n => n.scheduleTime).length,
      totalViews: analytics.reduce((sum, a) => sum + (a.totalViews ?? 0), 0),
      avgEngagement: analytics.length ?
        Math.round(analytics.reduce((sum, a) => {
          const views = a.totalViews ?? 0;
          const clicks = a.totalClicks ?? 0;
          return views > 0 ? sum + (clicks / views * 100) : sum;
        }, 0) / analytics.length) :
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

  const httpServer = createServer(app);
  return httpServer;
}