import jwt from "jsonwebtoken";

export const generateSessionToken = (userId: string): string => {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1h",
    }
  );

  return token;
};