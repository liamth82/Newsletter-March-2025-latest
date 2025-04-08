import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    // Create default sectors for the new user
    try {
      // Finance Sector
      await storage.createSector({
        userId: user.id,
        name: "Finance",
        description: "Financial news and market updates from trusted sources",
        handles: [
          "WSJ", "Bloomberg", "Forbes", "BusinessInsider", "TheEconomist", 
          "FT", "CNBCnow", "YahooFinance", "MarketWatch", "ReutersBiz"
        ]
      });

      // Technology Sector
      await storage.createSector({
        userId: user.id,
        name: "Technology",
        description: "Latest technology news and updates from industry leaders",
        handles: [
          "WIRED", "TechCrunch", "verge", "engadget", "mashable", 
          "techreview", "CNBC", "ForbesTech", "BBCTech", "HackerNews"
        ]
      });

      // Healthcare Sector
      await storage.createSector({
        userId: user.id,
        name: "Healthcare",
        description: "Healthcare news and medical research updates",
        handles: [
          "WHO", "CDCgov", "statnews", "NEJM", "KHNews", 
          "NIH", "NYTHealth", "Reuters_Health", "Medscape", "WebMD"
        ]
      });
      
      // Environmental Sector
      await storage.createSector({
        userId: user.id,
        name: "Environment",
        description: "Climate change and environmental news from authoritative sources",
        handles: [
          "NatGeo", "ClimateHome", "guardianeco", "insideclimate", "climate", 
          "ClimateReality", "UNEP", "GreenpeaceUK", "WWF", "nature"
        ]
      });
      
      console.log(`Created default sectors for user ${user.id}`);
    } catch (error) {
      console.error("Error creating default sectors:", error);
      // Continue with registration even if sector creation fails
    }

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
