export const bookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export type bookingStatus = (typeof bookingStatus)[keyof typeof bookingStatus];