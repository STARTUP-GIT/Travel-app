declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}
declare global {
  namespace Express {
    interface Request {
      specific_guide: string;
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      common_guide: string;
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      admin: string;
    }
  }
}

export {};