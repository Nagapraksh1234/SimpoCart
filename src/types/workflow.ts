export type Stage = "followup" | "quotation" | "approval" | "appointment" | "jobcard";
export type CallStatus = "pending" | "callback" | "no_answer" | "connected";

export interface QuoteItem {
  description: string;
  kind: "part" | "labour";
  qty: number;
  rate: number;
}

export interface Lead {
  _id: string;
  stage: Stage;
  callStatus: CallStatus;
  requirement?: string;
  nextCallAt?: string;
  assignedAgent?: string;
  updatedAt: string;
  customerId: { _id: string; name: string; phone: string };
  vehicleId?: { _id: string; regNo: string; make?: string; model?: string } | null;
  quotationId?: {
    _id: string;
    quoteNo: string;
    total: number;
    status: "draft" | "sent" | "approved" | "rejected";
  } | null;
  appointmentId?: {
    _id: string;
    slotStart: string;
    bay: string;
    status: "booked" | "arrived" | "no_show" | "cancelled";
  } | null;
  jobCardId?: {
    _id: string;
    jobNo: string;
    status: "open" | "in_progress" | "ready" | "delivered";
  } | null;
}

export interface BoardResponse {
  counts: Record<Stage, number>;
  board: Record<Stage, Lead[]>;
}

export interface NewLeadInput {
  name: string;
  phone: string;
  regNo: string;
  make?: string;
  model?: string;
  requirement?: string;
  assignedAgent?: string;
  nextCallAt?: string;
}