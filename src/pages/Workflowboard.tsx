import { useMemo, useState } from "react";
import {
  convertToJobCard, markArrived, markLost, respondQuotation, sendQuotation, updateJobCard,
} from "../api/workflow";
import { useWorkflowBoard } from "../hooks/useWorkflowBoard";
import type { Lead, Stage } from "../types/workflow";
import ActionModal, { type ModalState } from "./Actionmodals";
import "./WorkflowBoard.css";

type Tone = "amber" | "blue" | "green" | "red" | "gray";

interface CardAction { label: string; primary?: boolean; run: () => void }
interface CardView {
  chip: [string, Tone];
  lines: string[];
  amount?: string;
  meta?: string;
  actions: CardAction[];
}

const STAGES: { id: Stage; title: string; color: string }[] = [
  { id: "followup", title: "Follow-ups", color: "#B45309" },
  { id: "quotation", title: "Quotation", color: "#1D4ED8" },
  { id: "approval", title: "Customer Approval", color: "#6D28D9" },
  { id: "appointment", title: "Appointment", color: "#0F766E" },
  { id: "jobcard", title: "Job Card", color: "#15803D" },
];

const NEXT_JOB_STATUS = {
  open: { to: "in_progress", label: "Start work" },
  in_progress: { to: "ready", label: "Mark ready" },
  ready: { to: "delivered", label: "Mark delivered" },
} as const;

const money = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

export default function WorkflowBoard() {
  const { data, loading, error, reload } = useWorkflowBoard();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  /** Runs a one-click API action, then refreshes the board. */
  const act = (fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
      setToast("");
      await reload();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Action failed");
    }
  };

  const view = (lead: Lead): CardView => {
    const veh = lead.vehicleId;
    const vehicleLine = veh ? `${veh.make ?? ""} ${veh.model ?? ""} · ${veh.regNo}`.trim() : "";
    const q = lead.quotationId;
    const a = lead.appointmentId;
    const j = lead.jobCardId;

    switch (lead.stage) {
      case "followup": {
        const chip: [string, Tone] =
          lead.callStatus === "no_answer" ? ["No answer", "red"]
          : lead.callStatus === "callback" ? [`Callback ${when(lead.nextCallAt)}`.trim(), "gray"]
          : lead.callStatus === "connected" ? ["Connected", "green"]
          : isToday(lead.nextCallAt) ? ["Due today", "amber"] : ["To call", "amber"];
        return {
          chip,
          lines: [vehicleLine, lead.customerId.phone, lead.requirement ?? ""],
          actions: [
            { label: "Log call", run: () => setModal({ kind: "call", lead }) },
            { label: "Create quote", primary: true, run: () => setModal({ kind: "quote", lead }) },
          ],
        };
      }
      case "quotation":
        return {
          chip: ["Draft", "blue"],
          lines: [`${q?.quoteNo ?? ""} · ${vehicleLine}`],
          amount: q ? money(q.total) : undefined,
          actions: [
            { label: "Edit quote", run: () => setModal({ kind: "quote", lead }) },
            { label: "Send to customer", primary: true, run: act(() => sendQuotation(q!._id)) },
          ],
        };
      case "approval": {
        const base = { lines: [`${q?.quoteNo ?? ""} · ${vehicleLine}`], amount: q ? money(q.total) : undefined };
        if (q?.status === "approved")
          return { ...base, chip: ["Approved", "green"], actions: [
            { label: "Book appointment", primary: true, run: () => setModal({ kind: "appointment", lead }) },
          ] };
        if (q?.status === "rejected")
          return { ...base, chip: ["Rejected", "red"], actions: [
            { label: "Mark lost", run: act(() => markLost(lead._id, "Quotation rejected")) },
          ] };
        return { ...base, chip: ["Waiting", "gray"], actions: [
          { label: "Reject", run: () => setModal({ kind: "reject", lead }) },
          { label: "Approved", primary: true, run: act(() => respondQuotation(q!._id, true)) },
        ] };
      }
      case "appointment": {
        const arrived = a?.status === "arrived";
        return {
          chip: arrived ? ["Vehicle arrived", "green"] : [when(a?.slotStart), "blue"],
          lines: [vehicleLine, `${when(a?.slotStart)} · Bay ${a?.bay ?? ""}`],
          actions: [arrived
            ? { label: "Convert to Job Card", primary: true, run: act(() => convertToJobCard(a!._id)) }
            : { label: "Vehicle received", primary: true, run: act(() => markArrived(a!._id)) }],
        };
      }
      case "jobcard": {
        const next = j && j.status !== "delivered" ? NEXT_JOB_STATUS[j.status] : undefined;
        return {
          chip: j?.status === "ready" ? ["Ready for delivery", "green"] : [j?.status === "open" ? "Open" : "In progress", "blue"],
          lines: [`${j?.jobNo ?? ""} · ${vehicleLine}`],
          actions: next ? [{ label: next.label, primary: true, run: act(() => updateJobCard(j!._id, { status: next.to })) }] : [],
        };
      }
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const out = {} as Record<Stage, Lead[]>;
    STAGES.forEach((s) => {
      out[s.id] = (data?.board[s.id] ?? []).filter(
        (l) => !q || `${l.customerId.name} ${l.customerId.phone} ${l.vehicleId?.regNo ?? ""}`.toLowerCase().includes(q)
      );
    });
    return out;
  }, [data, q]);

  return (
    <div className="wb-app">
      <header className="wb-top">
        <div className="wb-logo">GarageDesk</div>
        <nav className="wb-nav">
          {["Dashboard", "Workflow", "Customers", "Job Cards", "Invoices"].map((n) => (
            <span key={n} className={n === "Workflow" ? "wb-on" : ""}>{n}</span>
          ))}
        </nav>
        <input className="wb-search" type="text" placeholder="Search customer, phone or reg. no."
          aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="wb-btn" style={{ marginLeft: "auto" }}
          onClick={() => setModal({ kind: "newLead" })}>+ New Follow-up</button>
      </header>

      {error && <div className="wb-banner" role="alert">{error} <button type="button" className="wb-link" onClick={reload}>Retry</button></div>}
      {toast && <div className="wb-banner" role="alert">{toast}</div>}

      <section className="wb-strip">
        {STAGES.map((s, idx) => (
          <div className="wb-step" key={s.id}>
            <div><small>{idx + 1} · {s.title}</small><b>{filtered[s.id].length}</b></div>
          </div>
        ))}
      </section>

      <main className="wb-board">
        {STAGES.map((s) => (
          <section className="wb-col" key={s.id}>
            <div className="wb-ch">
              <span><span className="wb-dot" style={{ background: s.color }} />{s.title}</span>
              <span className="wb-muted">{filtered[s.id].length}</span>
            </div>
            {loading && !data && <div className="wb-muted">Loading…</div>}
            {!loading && filtered[s.id].length === 0 && <div className="wb-empty">Nothing here</div>}
            {filtered[s.id].map((lead) => {
              const v = view(lead);
              return (
                <div className="wb-card" key={lead._id}>
                  <div className="wb-row">
                    <span className="wb-name">{lead.customerId.name}</span>
                    <span className={`wb-chip wb-${v.chip[1]}`}>{v.chip[0]}</span>
                  </div>
                  <div className="wb-muted">
                    {v.lines.filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                  {v.amount && <div className="wb-row"><span className="wb-name">{v.amount}</span></div>}
                  <div className="wb-row">
                    <span className="wb-muted">{lead.assignedAgent ? `Agent: ${lead.assignedAgent}` : ""}</span>
                    <span className="wb-btns">
                      {v.actions.map((x) => (
                        <button key={x.label} type="button" className={`wb-btn wb-sm ${x.primary ? "" : "wb-alt"}`} onClick={x.run}>{x.label}</button>
                      ))}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </main>

      {modal && (
        <ActionModal modal={modal} onClose={() => setModal(null)}
          onDone={() => { setModal(null); reload(); }} />
      )}
    </div>
  );
}