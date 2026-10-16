import { request } from "../api/Client";
import type { BoardResponse, CallStatus, Lead, NewLeadInput, QuoteItem } from "../types/workflow";

export const getBoard = () => request<BoardResponse>("GET", "/workflow/board");

// 1. Follow-up
export const createLead = (body: NewLeadInput) => request<Lead>("POST", "/leads", body);
export const logCall = (
  leadId: string,
  body: { callStatus: CallStatus; note?: string; nextCallAt?: string; by?: string }
) => request("PATCH", `/leads/${leadId}/call`, body);
export const markLost = (leadId: string, reason?: string) =>
  request("PATCH", `/leads/${leadId}/lost`, { reason });

// 2-3. Quotation and approval
export const saveQuotation = (leadId: string, items: QuoteItem[]) =>
  request("POST", `/leads/${leadId}/quotation`, { items });
export const sendQuotation = (quotationId: string) =>
  request("POST", `/quotations/${quotationId}/send`);
export const respondQuotation = (quotationId: string, approved: boolean, reason?: string) =>
  request("PATCH", `/quotations/${quotationId}/respond`, { approved, reason });

// 4. Appointment
export const bookAppointment = (leadId: string, slotStart: string, bay: string) =>
  request("POST", `/leads/${leadId}/appointment`, { slotStart, bay });
export const markArrived = (appointmentId: string) =>
  request("PATCH", `/appointments/${appointmentId}/arrived`);

// 5. Job card
export const convertToJobCard = (appointmentId: string) =>
  request("POST", `/appointments/${appointmentId}/convert`);
export const updateJobCard = (jobCardId: string, body: { status?: string; technician?: string }) =>
  request("PATCH", `/jobcards/${jobCardId}`, body);