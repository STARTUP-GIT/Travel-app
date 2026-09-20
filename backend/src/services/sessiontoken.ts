import jwt from "jsonwebtoken";

export type SessionRole =
  | "user"
  | "admin"
  | "specific_guide"
  | "common_guide"
  | "hotel_owner"
  | "restaurent_owner";

export interface SessionPayload {
  userId: string;
  role: SessionRole;
}

const getSessionSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required but is not set. Set JWT_SECRET before starting the server."
    );
  }

  return secret;
};

export const generateSessionToken = (
  userId: string,
  role: SessionRole
): string => {
  const token = jwt.sign({ userId, role }, getSessionSecret(), {
    expiresIn: "1h",
  });

  return token;
};

export const verifySessionToken = (token: string): SessionPayload => {
  return jwt.verify(token, getSessionSecret()) as SessionPayload;
};

export { getSessionSecret };