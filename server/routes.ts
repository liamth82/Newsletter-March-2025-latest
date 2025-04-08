import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTemplateSchema, insertNewsletterSchema, insertSectorSchema } from "@shared/schema";
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

  // Update the PATCH route for newsletters
  app.patch("/api/newsletters/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log('Updating newsletter:', req.params.id);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const newsletter = await storage.getNewsletter(parseInt(req.params.id));
      if (!newsletter) {
        console.log('Newsletter not found:', req.params.id);
        return res.status(404).json({ message: "Newsletter not found" });
      }
      
      console.log('Existing newsletter:', JSON.stringify(newsletter, null, 2));

      const parsed = insertNewsletterSchema.safeParse(req.body);
      if (!parsed.success) {
        console.log('Validation failed:', parsed.error);
        return res.status(400).json({ message: "Invalid newsletter data", errors: parsed.error });
      }

      const updateData = {
        templateId: parsed.data.templateId,
        name: parsed.data.name,
        keywords: parsed.data.keywords,
        tweetFilters: parsed.data.tweetFilters || {
          verifiedOnly: false,
          minFollowers: 0,
          excludeReplies: false,
          excludeRetweets: false,
          safeMode: true,
          newsOutlets: [],
          followerThreshold: 'low',
          accountTypes: []
        }
      };
      
      console.log('Updating with data:', JSON.stringify(updateData, null, 2));

      const updated = await storage.updateNewsletter(parseInt(req.params.id), updateData);
      console.log('Update successful, returned newsletter:', JSON.stringify(updated, null, 2));

      res.json(updated);
    } catch (error) {
      console.error('Error updating newsletter:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update newsletter" 
      });
    }
  });


  // Twitter Integration
  app.post("/api/newsletters/:id/tweets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log('Fetching tweets for newsletter:', req.params.id);
      console.log('Request body:', req.body);

      // Prepare filters
      const filters = {
        verifiedOnly: req.body.verifiedOnly === true,
        minFollowers: parseInt(req.body.minFollowers) || 0,
        excludeReplies: req.body.excludeReplies === true,
        excludeRetweets: req.body.excludeRetweets === true,
        safeMode: req.body.safeMode !== false, // default to true
        newsOutlets: Array.isArray(req.body.newsOutlets) ? req.body.newsOutlets : [],
        followerThreshold: req.body.followerThreshold,
        accountTypes: req.body.accountTypes,
        sectorId: req.body.sectorId
      };
      
      // If sector is specified, get handles from that sector
      if (filters.sectorId) {
        try {
          const sector = await storage.getSector(filters.sectorId);
          if (sector && sector.handles && sector.handles.length > 0) {
            console.log(`Using ${sector.handles.length} handles from sector ${sector.name}`);
            // Merge with any manually added outlets
            const uniqueHandles = Array.from(new Set([...filters.newsOutlets, ...sector.handles]));
            filters.newsOutlets = uniqueHandles;
          }
        } catch (error) {
          console.error('Error fetching sector:', error);
        }
      }

      // Validate keywords only if we're not using a sector or news outlets
      const isUsingSources = filters.newsOutlets.length > 0;
      
      if (!isUsingSources && (!req.body.keywords || !Array.isArray(req.body.keywords) || req.body.keywords.length === 0 || 
          (req.body.keywords.length === 1 && (!req.body.keywords[0] || req.body.keywords[0].trim() === '')))) {
        return res.status(400).json({ 
          message: "Please provide at least one keyword or select a sector with handles"
        });
      }

      console.log('Using filters:', filters);

      // Fetch tweets
      const tweets = await searchTweets(req.body.keywords || [], filters);
      console.log(`Retrieved ${tweets.length} tweets`);

      // Check if we got any tweets
      if (tweets.length === 0) {
        // Return a more specific message to help user adjust their search
        return res.status(404).json({ 
          message: "No tweets found with your current search criteria. Try using broader keywords, reducing follower requirements, or selecting a different sector.",
          searchQuery: {
            keywords: req.body.keywords || [],
            filters: filters
          }
        });
      }

      // Update newsletter
      const newsletter = await storage.updateNewsletter(parseInt(req.params.id), {
        tweetContent: tweets
      });

      res.json(newsletter);
    } catch (error) {
      console.error('Error in tweet fetching route:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch tweets"
      });
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

  // Helper function to get pre-defined sectors with Twitter handles
  const getDefaultSectors = () => {
    return [
      {
        name: "Tech News",
        description: "Major technology news outlets and tech journalists",
        handles: [
          "WIRED", "TechCrunch", "TheVerge", "engadget", "mashable", 
          "CNET", "techreview", "FastCompany", "ForbesTech", "BBCTech",
          "WSJTech", "nytimesbits", "guardiantech", "ReutersTech", "FT"
        ]
      },
      {
        name: "Finance",
        description: "Financial news, markets, and economic analysis",
        handles: [
          "Bloomberg", "WSJ", "BusinessInsider", "FT", "Forbes", 
          "TheEconomist", "ReutersBiz", "CNNBusiness", "YahooFinance",
          "markets", "MarketWatch", "CNBC", "businessweek", "nytimesbusiness"
        ]
      },
      {
        name: "Healthcare",
        description: "Healthcare news, medical research, and health policy",
        handles: [
          "NEJM", "TheLancet", "statnews", "KHNews", "Reuters_Health",
          "CDCgov", "WHO", "NIH", "HarvardHealth", "MayoClinic", 
          "modrnhealth", "AmerMedicalAssn", "healthdotcom", "WebMD"
        ]
      },
      {
        name: "Sports",
        description: "Sports news, analysis, and updates across major leagues",
        handles: [
          "espn", "SportsCenter", "NBA", "NFL", "MLB", 
          "NHL", "FIFAcom", "BBCSport", "SInow", "CBSSports",
          "NBCSports", "SkySports", "FOXSports", "GolfChannel", "F1"
        ]
      },
      {
        name: "Entertainment",
        description: "Movies, TV, music, and celebrity news",
        handles: [
          "Variety", "THR", "EW", "ETonline", "usweekly", 
          "vulture", "RottenTomatoes", "IMDb", "BBCEntertain", "MTV",
          "netflix", "hulu", "PrimeVideo", "HBO", "Billboard"
        ]
      },
      {
        name: "Politics",
        description: "Political news and analysis",
        handles: [
          "politico", "thehill", "axios", "NPR", "BBCPolitics", 
          "FoxNews", "MSNBC", "CBSPolitics", "ABCPolitics", "CNNPolitics",
          "nprpolitics", "nytpolitics", "WSJPolitics", "guardian"
        ]
      },
      {
        name: "Science",
        description: "Scientific discoveries, research, and environmental news",
        handles: [
          "ScienceMagazine", "NatureMagazine", "sciam", "NewScientist", "NASA", 
          "NOAAClimate", "NatGeo", "PopSci", "DiscoverMag", "ScienceDaily",
          "physorg_com", "sciencenewsorg", "scifri", "guardianscience", "nytimesscience"
        ]
      },
      {
        name: "AI & ML",
        description: "Artificial intelligence, machine learning, and data science",
        handles: [
          "DeepMind", "OpenAI", "GoogleAI", "AndrewYNg", "facebookai", 
          "NvidiaAI", "Stanford_AI", "MIT_CSAIL", "TensorFlow", "PyTorch",
          "IBMResearch", "MSFTResearch", "lexfridman", "huggingface", "distillpub"
        ]
      }
    ];
  };

  // Sectors
  app.post("/api/sectors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertSectorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Ensure description is null if undefined to match schema
    const sectorData = {
      ...parsed.data,
      description: parsed.data.description ?? null,
      userId: req.user.id,
    };

    const sector = await storage.createSector(sectorData);
    res.status(201).json(sector);
  });
  
  // Create default sectors for a user
  app.post("/api/sectors/create-defaults", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const defaultSectors = getDefaultSectors();
      const createdSectors = [];
      
      for (const sectorData of defaultSectors) {
        const sector = await storage.createSector({
          ...sectorData,
          description: sectorData.description ?? null,
          userId: req.user.id,
        });
        createdSectors.push(sector);
      }
      
      res.status(201).json(createdSectors);
    } catch (error) {
      console.error("Error creating default sectors:", error);
      res.status(500).json({ message: "Failed to create default sectors" });
    }
  });

  app.get("/api/sectors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sectors = await storage.getSectors(req.user.id);
    res.json(sectors);
  });

  app.get("/api/sectors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const sector = await storage.getSector(parseInt(req.params.id));
    if (!sector) {
      return res.status(404).json({ message: "Sector not found" });
    }
    if (sector.userId !== req.user.id) {
      return res.sendStatus(403);
    }
    res.json(sector);
  });

  app.patch("/api/sectors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const sector = await storage.getSector(parseInt(req.params.id));
    if (!sector) {
      return res.status(404).json({ message: "Sector not found" });
    }
    if (sector.userId !== req.user.id) {
      return res.sendStatus(403);
    }

    const updated = await storage.updateSector(parseInt(req.params.id), req.body);
    res.json(updated);
  });

  app.delete("/api/sectors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const sector = await storage.getSector(parseInt(req.params.id));
    if (!sector) {
      return res.status(404).json({ message: "Sector not found" });
    }
    if (sector.userId !== req.user.id) {
      return res.sendStatus(403);
    }

    await storage.deleteSector(parseInt(req.params.id));
    res.sendStatus(204);
  });
  


  const httpServer = createServer(app);
  return httpServer;
}