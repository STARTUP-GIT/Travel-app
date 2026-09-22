export type ReportTopic = "place" | "guide" | "hotel" | "restaurant" | "app" | "other";

export type ReportIssue = {
  id: string;
  topic: ReportTopic;
  description: string;
  refType?: string;
  refId?: string;
  contact?: string;
  createdAt: string;
};