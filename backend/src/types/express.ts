declare global {
  namespace Express {
    interface Request {
      userId?: string;
      specific_guide?: string;
      common_guide?: string;
      admin?: string;
      hotel_owner?: string;
      restaurent_owner?: string;
    }
  }
}

export {};