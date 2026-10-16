import { type FormEvent, type ReactNode, useState } from "react";
import { bookAppointment, createLead, logCall, respondQuotation, saveQuotation } from "../api/workflow";
import type { CallStatus, Lead, QuoteItem } from "../types/workflow";

export type ModalState =
  | { kind: "newLead" }
  | { kind: "call"; lead: Lead }
  | { kind: "quote"; lead: Lead }
  | { kind: "appointment"; lead: Lead }
  | { kind: "reject"; lead: Lead };

interface Props {
  modal: ModalState;
  onClose: () => void;
  onDone: () => void;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

function Shell({
  title, onClose, onSubmit, busy, error, submitLabel, children,
}: {
  title: string; onClose: () => void; onSubmit: (e: FormEvent) => void;
  busy: boolean; error: string; submitLabel: string; children: ReactNode;
}) {
  return (
    <div className="wb-overlay" onClick={onClose}>
      <form className="wb-modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2>{title}</h2>
        {children}
        {error && <div className="wb-error" role="alert">{error}</div>}
        <div className="wb-actions">
          <button type="button" className="wb-btn wb-alt" onClick={onClose}>Cancel</button>
          <button type="submit" className="wb-btn" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="wb-field"><span>{label}</span>{children}</label>;
}

/** Runs an async save, shows errors inside the modal, closes + reloads on success. */
function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = (fn: () => Promise<unknown>) => async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

/* ---------- New follow-up ---------- */
function NewLeadForm({ onClose, onDone }: Omit<Props, "modal">) {
  const [f, setF] = useState({ name: "", phone: "", regNo: "", make: "", model: "", requirement: "", assignedAgent: "", nextCallAt: "" });
  const { busy, error, submit } = useSubmit(onDone);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Shell title="New follow-up" onClose={onClose} busy={busy} error={error} submitLabel="Add follow-up"
      onSubmit={submit(() => createLead({ ...f, nextCallAt: toIso(f.nextCallAt) }))}>
      <Field label="Customer name"><input required value={f.name} onChange={set("name")} /></Field>
      <Field label="Phone"><input required value={f.phone} onChange={set("phone")} inputMode="tel" /></Field>
      <div className="wb-form-row">
        <Field label="Reg. no."><input required value={f.regNo} onChange={set("regNo")} placeholder="KA05MN4821" /></Field>
        <Field label="Make"><input value={f.make} onChange={set("make")} /></Field>
        <Field label="Model"><input value={f.model} onChange={set("model")} /></Field>
      </div>
      <Field label="Requirement"><input value={f.requirement} onChange={set("requirement")} placeholder="Brake service + AC check" /></Field>
      <div className="wb-form-row">
        <Field label="Assigned agent"><input value={f.assignedAgent} onChange={set("assignedAgent")} /></Field>
        <Field label="Next call"><input type="datetime-local" value={f.nextCallAt} onChange={set("nextCallAt")} /></Field>
      </div>
    </Shell>
  );
}

/* ---------- Log call ---------- */
function CallForm({ lead, onClose, onDone }: { lead: Lead } & Omit<Props, "modal">) {
  const [status, setStatus] = useState<CallStatus>("connected");
  const [note, setNote] = useState("");
  const [next, setNext] = useState("");
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <Shell title={`Log call · ${lead.customerId.name}`} onClose={onClose} busy={busy} error={error} submitLabel="Save call"
      onSubmit={submit(() => logCall(lead._id, { callStatus: status, note, nextCallAt: toIso(next) }))}>
      <Field label="Call result">
        <select value={status} onChange={(e) => setStatus(e.target.value as CallStatus)}>
          <option value="connected">Connected</option>
          <option value="callback">Asked for callback</option>
          <option value="no_answer">No answer</option>
        </select>
      </Field>
      <Field label="Notes"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Next call (optional)"><input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
    </Shell>
  );
}

/* ---------- Quotation ---------- */
const blankItem = (): QuoteItem => ({ description: "", kind: "part", qty: 1, rate: 0 });

function QuoteForm({ lead, onClose, onDone }: { lead: Lead } & Omit<Props, "modal">) {
  const [items, setItems] = useState<QuoteItem[]>([blankItem()]);
  const { busy, error, submit } = useSubmit(onDone);
  const total = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const update = (idx: number, patch: Partial<QuoteItem>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  return (
    <Shell title={`Quotation · ${lead.customerId.name}`} onClose={onClose} busy={busy} error={error} submitLabel="Save quotation"
      onSubmit={submit(() => saveQuotation(lead._id, items))}>
      {items.map((it, idx) => (
        <div className="wb-form-row wb-item" key={idx}>
          <Field label="Item"><input required value={it.description} onChange={(e) => update(idx, { description: e.target.value })} /></Field>
          <Field label="Type">
            <select value={it.kind} onChange={(e) => update(idx, { kind: e.target.value as QuoteItem["kind"] })}>
              <option value="part">Part</option>
              <option value="labour">Labour</option>
            </select>
          </Field>
          <Field label="Qty"><input type="number" min={1} value={it.qty} onChange={(e) => update(idx, { qty: Number(e.target.value) })} /></Field>
          <Field label="Rate (₹)"><input type="number" min={0} value={it.rate} onChange={(e) => update(idx, { rate: Number(e.target.value) })} /></Field>
          {items.length > 1 && (
            <button type="button" className="wb-btn wb-alt wb-sm" onClick={() => setItems(items.filter((_, i) => i !== idx))}>Remove</button>
          )}
        </div>
      ))}
      <button type="button" className="wb-btn wb-alt wb-sm" onClick={() => setItems([...items, blankItem()])}>+ Add item</button>
      <div className="wb-total">Total: ₹ {total.toLocaleString("en-IN")}</div>
    </Shell>
  );
}

/* ---------- Appointment ---------- */
function AppointmentForm({ lead, onClose, onDone }: { lead: Lead } & Omit<Props, "modal">) {
  const [slot, setSlot] = useState("");
  const [bay, setBay] = useState("1");
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <Shell title={`Book appointment · ${lead.customerId.name}`} onClose={onClose} busy={busy} error={error} submitLabel="Book"
      onSubmit={submit(() => bookAppointment(lead._id, toIso(slot) as string, bay))}>
      <Field label="Date and time"><input required type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} /></Field>
      <Field label="Bay"><input required value={bay} onChange={(e) => setBay(e.target.value)} /></Field>
    </Shell>
  );
}

/* ---------- Reject quotation ---------- */
function RejectForm({ lead, onClose, onDone }: { lead: Lead } & Omit<Props, "modal">) {
  const [reason, setReason] = useState("");
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <Shell title={`Reject quotation · ${lead.customerId.name}`} onClose={onClose} busy={busy} error={error} submitLabel="Mark rejected"
      onSubmit={submit(() => respondQuotation(lead.quotationId!._id, false, reason))}>
      <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Price too high" /></Field>
    </Shell>
  );
}

export default function ActionModal({ modal, onClose, onDone }: Props) {
  switch (modal.kind) {
    case "newLead": return <NewLeadForm onClose={onClose} onDone={onDone} />;
    case "call": return <CallForm lead={modal.lead} onClose={onClose} onDone={onDone} />;
    case "quote": return <QuoteForm lead={modal.lead} onClose={onClose} onDone={onDone} />;
    case "appointment": return <AppointmentForm lead={modal.lead} onClose={onClose} onDone={onDone} />;
    case "reject": return <RejectForm lead={modal.lead} onClose={onClose} onDone={onDone} />;
  }
}