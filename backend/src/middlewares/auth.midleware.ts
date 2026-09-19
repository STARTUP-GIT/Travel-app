import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "../types/express.js";


export const userauthMiddleware = (req: Request,res: Response,next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Internal Server Error",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
    };

    req.userId  = decoded.userId ;

    next();
  } catch {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};

export const specificGuideAuthMiddleware = (req: Request,res: Response,next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Internal Server Error",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
    };

    req.specific_guide = decoded.userId;

    next();
  } catch {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};

export const commonGuideAuthMiddleware = (req: Request,res: Response,next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Internal Server Error",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
    };

    req.common_guide = decoded.userId;

    next();
  } catch {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};

export const adminAuthMiddleware = (req: Request,res: Response,next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Internal Server Error",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
    };

    req.admin = decoded.userId;

    next();
  } catch {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};