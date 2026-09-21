import type { Request, Response, NextFunction } from "express";
import type { SessionRole, SessionPayload } from "../services/sessiontoken.js";
import { getSessionSecret } from "../services/sessiontoken.js";
import jwt from "jsonwebtoken";

const buildRoleMiddleware = (expectedRole: SessionRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    let secret: string;

    try {
      secret = getSessionSecret();
    } catch {
      return res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
    }

    let decoded: SessionPayload;

    try {
      decoded = jwt.verify(token, secret) as SessionPayload;
    } catch {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (decoded.role !== expectedRole) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const identityId = decoded.userId;

    switch (expectedRole) {
      case "user":
        req.userId = identityId;
        break;
      case "admin":
        req.admin = identityId;
        break;
      case "specific_guide":
        req.specific_guide = identityId;
        break;
      case "common_guide":
        req.common_guide = identityId;
        break;
      case "hotel_owner":
        req.hotel_owner = identityId;
        break;
      case "restaurent_owner":
        req.restaurent_owner = identityId;
        break;
    }

    next();
  };
};

export const userauthMiddleware = buildRoleMiddleware("user");
export const adminAuthMiddleware = buildRoleMiddleware("admin");
export const specificGuideAuthMiddleware = buildRoleMiddleware("specific_guide");
export const commonGuideAuthMiddleware = buildRoleMiddleware("common_guide");
export const hotelOwnerAuthMiddleware = buildRoleMiddleware("hotel_owner");
export const restaurentOwnerAuthMiddleware = buildRoleMiddleware("restaurent_owner");

export const guideAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  let secret: string;

  try {
    secret = getSessionSecret();
  } catch {
    return res.status(500).json({
      message: "JWT_SECRET is not configured",
    });
  }

  let decoded: SessionPayload;

  try {
    decoded = jwt.verify(token, secret) as SessionPayload;
  } catch {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (decoded.role === "specific_guide") {
    req.specific_guide = decoded.userId;
  } else if (decoded.role === "common_guide") {
    req.common_guide = decoded.userId;
  } else {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  next();
};