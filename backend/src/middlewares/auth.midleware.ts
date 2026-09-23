import type { Request, Response, NextFunction } from "express";
import type { SessionRole, SessionPayload } from "../services/sessiontoken.js";
import { getSessionSecret } from "../services/sessiontoken.js";
import jwt from "jsonwebtoken";

const extractToken = (req: Request): string | undefined => {
  // Cookie first (server-to-server calls and the original same-origin flow),
  // then Authorization: Bearer for direct cross-origin browser calls from the
  // admin frontend (it never receives the backend's httpOnly cookie because
  // NextAuth authenticates the login server-side).
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();

  return undefined;
};

const buildRoleMiddleware = (expectedRole: SessionRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);

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

/**
 * Accepts a valid session token of ANY role. Used only by the single generic
 * image-upload endpoint so one shared capability works for admin, user, guide
 * and owner features alike. Purely additive: no existing route, login flow or
 * token format is changed.
 */
export const anyAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

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

  switch (decoded.role) {
    case "user":
      req.userId = decoded.userId;
      break;
    case "admin":
      req.admin = decoded.userId;
      break;
    case "specific_guide":
      req.specific_guide = decoded.userId;
      break;
    case "common_guide":
      req.common_guide = decoded.userId;
      break;
    case "hotel_owner":
      req.hotel_owner = decoded.userId;
      break;
    case "restaurent_owner":
      req.restaurent_owner = decoded.userId;
      break;
    default:
      return res.status(401).json({
        message: "Unauthorized",
      });
  }

  next();
};

export const guideAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

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