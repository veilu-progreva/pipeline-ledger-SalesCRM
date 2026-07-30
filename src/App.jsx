import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  Plus, X, Search, ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Users, Target, Trash2, Phone, Mail, Calendar, ChevronDown,
  LayoutGrid, Table2, BarChart3, Rocket, Clock, Flame, Info,
} from "lucide-react";

/* =========================================================================
   TOKENS / CONSTANTS
========================================================================= */

const STATUSES = ["New", "Proposal", "Deposit", "Follow-Up Ongoing", "Meeting Follow-Up", "Won", "Lost"];

const STATUS_COLOR = {
  "New": "#6366F1",
  "Proposal": "#2563EB",
  "Deposit": "#B7862C",
  "Follow-Up Ongoing": "#F59E0B",
  "Meeting Follow-Up": "#0EA5E9",
  "Won": "#0E7C4A",
  "Lost": "#DC2626",
};

const MEETING_STATUSES = ["", "Show", "No-Show", "Rescheduled By Us", "Rescheduled By Them", "Cancel", "DQ"];
const LOSS_REASONS = ["Price", "Timing", "Partner-Spouse", "Competitor", "Ghosted", "Not Qualified"];
const LOSS_COLORS = ["#DC2626", "#B7862C", "#6366F1", "#0EA5E9", "#667085", "#0E7C4A"];
const SOURCES = ["Facebook Ads", "Referral", "Cold Outbound", "Webinar", "Instagram DM", "Google Ads"];
const SETTERS = ["Jordan K", "Maya R", "Sam T"];
const CLOSERS = ["Alex P", "Riley D"];

const EMPTY_LEAD = () => ({
  id: uid(),
  leadName: "", company: "", email: "", phone: "",
  source: SOURCES[0], setterName: SETTERS[0], closerName: CLOSERS[0],
  dateCreated: todayStr(), firstContact: "", dateBooked: "", dateOfMeeting: "",
  meetingStatus: "", offerMade: "", saleType: "",
  status: "New", lossReason: "",
  depositAmount: "", dealValue: "", cashCollected: "", datePaidInFull: "",
  refundAmount: "", commissionPct: 10,
  lastTouch: todayStr(), notes: "",
});

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function fmtMoney(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}
function fmtPct(n) { if (n === null || n === undefined || isNaN(n)) return "—"; return `${n.toFixed(1)}%`; }
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da) || isNaN(db)) return null;
  return (db - da) / 86400000;
}
function minutesBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da) || isNaN(db)) return null;
  return (db - da) / 60000;
}
function daysSince(d) {
  if (!d) return null;
  return daysBetween(d, new Date().toISOString());
}
function avg(arr) {
  const clean = arr.filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}
function computeEarnings(lead) {
  const rev = num(lead.cashCollected) - num(lead.refundAmount);
  return Math.max(rev, 0) * (num(lead.commissionPct) / 100);
}
function bookingLagDays(lead) { return daysBetween(lead.dateBooked, lead.dateOfMeeting); }
function isBookingLagHigh(lead) { const l = bookingLagDays(lead); return l !== null && l > 4; }
function isFollowUpAging(lead) {
  if (lead.status !== "Follow-Up Ongoing") return false;
  const d = daysSince(lead.lastTouch);
  return d !== null && d >= 7;
}
function depositRefDate(lead) { return lead.dateOfMeeting || lead.dateBooked || lead.dateCreated; }
function isDepositUnpaidLate(lead) {
  if (lead.status !== "Deposit" || lead.datePaidInFull) return false;
  const d = daysSince(depositRefDate(lead));
  return d !== null && d >= 14;
}

/* =========================================================================
   SEED DATA
========================================================================= */

function seedLeads() {
  const rows = [
    ["Dana Whitfield", "Whitfield & Co", "Facebook Ads", "Jordan K", "Alex P", "2026-07-02", "2026-07-02T09:14", "2026-07-03", "2026-07-08", "Show", "yes", "1-Call", "Won", "", 500, 6000, 6000, "2026-07-09", 0, 10],
    ["Marcus Iyer", "Iyer Consulting", "Referral", "Maya R", "Riley D", "2026-07-03", "2026-07-03T11:02", "2026-07-05", "2026-07-10", "Show", "yes", "Follow-Up", "Follow-Up Ongoing", "", 500, 8000, 500, "", 0, 10],
    ["Priya Chandra", "Chandra Interiors", "Webinar", "Sam T", "Alex P", "2026-07-05", "2026-07-06T14:40", "2026-07-07", "2026-07-11", "No-Show", "", "", "New", "", "", "", "", "", "", 10],
    ["Ben Okafor", "Okafor Realty", "Cold Outbound", "Jordan K", "Riley D", "2026-06-20", "2026-06-20T10:05", "2026-06-22", "2026-06-27", "Show", "yes", "1-Call", "Won", "", 1000, 12000, 12000, "2026-06-28", 0, 12],
    ["Sophie Lang", "Lang Studio", "Instagram DM", "Maya R", "Alex P", "2026-07-08", "2026-07-08T08:50", "2026-07-09", "2026-07-14", "Show", "no", "", "Meeting Follow-Up", "", "", "", "", "", "", 10],
    ["Theo Marsh", "Marsh Legal", "Google Ads", "Sam T", "Riley D", "2026-07-10", "2026-07-11T16:20", "2026-07-12", "2026-07-16", "Cancel", "", "", "Lost", "Timing", "", "", "", "", "", 10],
    ["Nadia Reyes", "Reyes Group", "Referral", "Jordan K", "Alex P", "2026-07-01", "2026-07-01T09:30", "2026-07-02", "2026-07-06", "Show", "yes", "1-Call", "Won", "", 750, 9500, 9500, "2026-07-07", 500, 10],
    ["Colin Vance", "Vance Digital", "Facebook Ads", "Maya R", "Riley D", "2026-07-12", "2026-07-13T10:10", "2026-07-15", "2026-07-20", "", "", "", "Proposal", "", "", "", "", "", "", 10],
    ["Isabel Ortiz", "Ortiz Media", "Webinar", "Sam T", "Alex P", "2026-06-25", "2026-06-25T13:00", "2026-06-27", "2026-07-01", "Show", "yes", "Follow-Up", "Deposit", "", 400, 5400, 400, "", 0, 10],
    ["Grant Ashby", "Ashby & Sons", "Cold Outbound", "Jordan K", "Riley D", "2026-07-14", "2026-07-15T09:00", "2026-07-16", "2026-07-21", "Rescheduled By Them", "", "", "Follow-Up Ongoing", "", "", "", "", "", "2026-07-10", 10],
    ["Wren Castillo", "Castillo Homes", "Instagram DM", "Maya R", "Alex P", "2026-07-16", "2026-07-16T15:45", "2026-07-17", "2026-07-22", "Show", "yes", "1-Call", "Won", "", 600, 7200, 7200, "2026-07-23", 0, 10],
    ["Owen Mercer", "Mercer Finance", "Referral", "Sam T", "Riley D", "2026-07-18", "2026-07-19T08:15", "2026-07-20", "2026-07-24", "DQ", "", "", "Lost", "Not Qualified", "", "", "", "", "", 10],
    ["Layla Haddad", "Haddad Retail", "Google Ads", "Jordan K", "Alex P", "2026-07-06", "2026-07-06T09:55", "2026-07-08", "2026-07-13", "Show", "no", "", "Follow-Up Ongoing", "", "", "", "", "", "2026-07-14", 10],
    ["Felix Duarte", "Duarte Auto", "Facebook Ads", "Maya R", "Riley D", "2026-07-20", "2026-07-20T12:30", "2026-07-21", "2026-07-25", "Show", "yes", "1-Call", "Won", "", 900, 11000, 11000, "2026-07-26", 0, 10],
    ["Anna Kowalski", "Kowalski Law", "Cold Outbound", "Sam T", "Alex P", "2026-07-21", "2026-07-22T09:40", "2026-07-23", "2026-07-28", "Show", "yes", "1-Call", "Deposit", "", 1200, 15000, 1200, "", 0, 10],
    ["Hugo Fontaine", "Fontaine Design", "Webinar", "Jordan K", "Riley D", "2026-07-09", "2026-07-09T17:00", "2026-07-10", "2026-07-15", "No-Show", "", "", "Follow-Up Ongoing", "", "", "", "", "", "2026-07-11", 10],
    ["Ruth Adeyemi", "Adeyemi Ventures", "Referral", "Maya R", "Alex P", "2026-07-24", "2026-07-24T10:20", "2026-07-25", "2026-07-29", "Show", "yes", "Follow-Up", "Meeting Follow-Up", "", "", "", "", "", "", 10],
    ["Victor Nguyen", "Nguyen Tech", "Instagram DM", "Sam T", "Riley D", "2026-07-23", "2026-07-24T11:11", "2026-07-25", "2026-07-30", "", "", "", "New", "", "", "", "", "", "", 10],
    ["Celeste Bardot", "Bardot Beauty", "Google Ads", "Jordan K", "Alex P", "2026-07-13", "2026-07-13T09:05", "2026-07-14", "2026-07-19", "Show", "yes", "1-Call", "Won", "", 550, 6600, 6600, "2026-07-20", 0, 10],
    ["Marcus Iyer II", "Iyer North", "Cold Outbound", "Maya R", "Riley D", "2026-06-15", "2026-06-15T13:20", "2026-06-17", "2026-06-22", "Cancel", "", "", "Lost", "Ghosted", "", "", "", "", "", 10],
  ];
  return rows.map((r) => ({
    id: uid(), leadName: r[0], company: r[1], email: `${r[0].split(" ")[0].toLowerCase()}@example.com`,
    phone: "555-0100", source: r[2], setterName: r[3], closerName: r[4],
    dateCreated: r[5], firstContact: r[6], dateBooked: r[7], dateOfMeeting: r[8],
    meetingStatus: r[9], offerMade: r[10], saleType: r[11], status: r[12], lossReason: r[13],
    depositAmount: r[14], dealValue: r[15], cashCollected: r[16], datePaidInFull: r[17],
    refundAmount: r[18], lastTouch: r[19] || r[8] || r[5], commissionPct: r[20], notes: "",
  }));
}

function seedActivities() {
  const days = ["2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-28"];
  const out = [];
  SETTERS.forEach((s, si) => {
    days.forEach((d, di) => {
      out.push({ id: uid(), date: d, setterName: s, dials: 40 + si * 5 + di * 2, dms: 20 + si * 3, conversations: 8 + si + (di % 3) });
    });
  });
  return out;
}

/* =========================================================================
   SMALL UI PRIMITIVES
========================================================================= */

function Field({ label, children, hint, required }) {
  return (
    <label className="ple-field">
      <span className="ple-field-label">{label}{required && <span style={{ color: "#DC2626" }}> *</span>}</span>
      {children}
      {hint && <span className="ple-field-hint">{hint}</span>}
    </label>
  );
}

function TextInput(props) { return <input {...props} className={"ple-input " + (props.className || "")} />; }
function SelectInput({ options, ...props }) {
  return (
    <select {...props} className={"ple-input " + (props.className || "")}>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o || "—"}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

function Badge({ color, children }) {
  return <span className="ple-badge" style={{ background: color + "1A", color }}>{children}</span>;
}

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="ple-stat">
      <div className="ple-stat-top">
        <span className="ple-stat-label">{label}</span>
        {Icon && <Icon size={15} color={accent || "#667085"} />}
      </div>
      <div className="ple-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="ple-stat-sub">{sub}</div>}
    </div>
  );
}

/* =========================================================================
   LEAD MODAL (add / edit)
========================================================================= */

function LeadModal({ lead, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(lead);
  const [error, setError] = useState("");
  const set = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  function handleSave() {
    if (form.status === "Lost" && !form.lossReason) {
      setError("Loss Reason is required when status is Lost.");
      return;
    }
    setError("");
    onSave(form);
  }

  const earnings = computeEarnings(form);

  return (
    <div className="ple-modal-overlay" onMouseDown={onClose}>
      <div className="ple-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ple-modal-header">
          <h2>{lead.leadName ? "Edit Lead" : "New Lead"}</h2>
          <button className="ple-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ple-modal-body">
          <section className="ple-section">
            <h3>Contact</h3>
            <div className="ple-grid-3">
              <Field label="Lead Name" required><TextInput value={form.leadName} onChange={set("leadName")} placeholder="Full name" /></Field>
              <Field label="Company"><TextInput value={form.company} onChange={set("company")} /></Field>
              <Field label="Source"><SelectInput options={SOURCES} value={form.source} onChange={set("source")} /></Field>
              <Field label="Email"><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
              <Field label="Phone #"><TextInput value={form.phone} onChange={set("phone")} /></Field>
              <Field label="Setter"><SelectInput options={SETTERS} value={form.setterName} onChange={set("setterName")} /></Field>
              <Field label="Closer"><SelectInput options={CLOSERS} value={form.closerName} onChange={set("closerName")} /></Field>
            </div>
          </section>

          <section className="ple-section">
            <h3>Status &amp; Dates</h3>
            <div className="ple-grid-3">
              <Field label="Lead Status"><SelectInput options={STATUSES} value={form.status} onChange={set("status")} /></Field>
              <Field label="Date Created"><TextInput type="date" value={form.dateCreated} onChange={set("dateCreated")} /></Field>
              <Field label="First Contact Date/Time"><TextInput type="datetime-local" value={form.firstContact} onChange={set("firstContact")} /></Field>
              <Field label="Date Meeting Booked"><TextInput type="date" value={form.dateBooked} onChange={set("dateBooked")} /></Field>
              <Field label="Date of Meeting"><TextInput type="date" value={form.dateOfMeeting} onChange={set("dateOfMeeting")} /></Field>
              <Field label="Last Touch Date" hint="Drives the 7-day follow-up aging flag"><TextInput type="date" value={form.lastTouch} onChange={set("lastTouch")} /></Field>
            </div>
          </section>

          <section className="ple-section">
            <h3>Meeting &amp; Call Outcome</h3>
            <div className="ple-grid-3">
              <Field label="Meeting Status"><SelectInput options={MEETING_STATUSES} value={form.meetingStatus} onChange={set("meetingStatus")} /></Field>
              <Field label="Offer Made">
                <SelectInput options={[{ value: "", label: "—" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={form.offerMade} onChange={set("offerMade")} />
              </Field>
              <Field label="Sale Type">
                <SelectInput options={[{ value: "", label: "—" }, { value: "1-Call", label: "1-Call Sale" }, { value: "Follow-Up", label: "Follow-Up Sale" }]} value={form.saleType} onChange={set("saleType")} />
              </Field>
            </div>
            {form.status === "Lost" && (
              <div className="ple-grid-3">
                <Field label="Loss Reason" required>
                  <SelectInput options={["", ...LOSS_REASONS]} value={form.lossReason} onChange={set("lossReason")} />
                </Field>
              </div>
            )}
          </section>

          <section className="ple-section">
            <h3>Money</h3>
            <div className="ple-grid-3">
              <Field label="Deposit Amount"><TextInput type="number" value={form.depositAmount} onChange={set("depositAmount")} /></Field>
              <Field label="Total Deal Value"><TextInput type="number" value={form.dealValue} onChange={set("dealValue")} /></Field>
              <Field label="Cash Collected"><TextInput type="number" value={form.cashCollected} onChange={set("cashCollected")} /></Field>
              <Field label="Date Paid In Full"><TextInput type="date" value={form.datePaidInFull} onChange={set("datePaidInFull")} /></Field>
              <Field label="Refund / Clawback Amount"><TextInput type="number" value={form.refundAmount} onChange={set("refundAmount")} /></Field>
              <Field label="Commission %"><TextInput type="number" value={form.commissionPct} onChange={set("commissionPct")} /></Field>
            </div>
            <div className="ple-earnings-row">
              <span>Earnings (auto)</span>
              <strong className="ple-mono">{fmtMoney(earnings)}</strong>
              <span className="ple-field-hint">= (Cash Collected − Refunds) × Commission %</span>
            </div>
          </section>

          {error && <div className="ple-error"><AlertTriangle size={15} /> {error}</div>}
        </div>

        <div className="ple-modal-footer">
          {lead.leadName && (
            <button className="ple-btn ple-btn-danger" onClick={() => onDelete(form.id)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="ple-btn ple-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ple-btn ple-btn-primary" onClick={handleSave}>Save Lead</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   VIEW 1 — KANBAN BOARD
========================================================================= */

function LeadCardMini({ lead, onOpen, onDragStart }) {
  const aging = isFollowUpAging(lead);
  const lagHigh = isBookingLagHigh(lead);
  const depositLate = isDepositUnpaidLate(lead);
  const flagged = aging || lagHigh || depositLate;

  return (
    <div
      className={"ple-card" + (flagged ? " ple-card-flagged" : "")}
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onOpen(lead)}
      style={{ borderLeftColor: STATUS_COLOR[lead.status] }}
    >
      <div className="ple-card-top">
        <span className="ple-card-name">{lead.leadName || "Untitled lead"}</span>
        {flagged && <AlertTriangle size={14} color="#DC2626" />}
      </div>
      <div className="ple-card-company">{lead.company || "—"}</div>
      <div className="ple-card-row">
        <Badge color="#667085">{lead.setterName}</Badge>
        <Badge color="#667085">{lead.closerName}</Badge>
      </div>
      <div className="ple-card-row ple-card-meta">
        <span><Calendar size={11} /> {fmtDate(lead.dateOfMeeting || lead.dateCreated)}</span>
        {num(lead.dealValue) > 0 && <span className="ple-mono">{fmtMoney(lead.dealValue)}</span>}
      </div>
      {aging && <div className="ple-flag-line">Untouched 7+ days</div>}
      {lagHigh && !aging && <div className="ple-flag-line">Booking lag &gt; 4 days</div>}
      {depositLate && !aging && !lagHigh && <div className="ple-flag-line">Deposit unpaid 14+ days</div>}
    </div>
  );
}

function KanbanBoard({ leads, onOpen, onMove, onAdd }) {
  const dragId = useRef(null);

  function handleDrop(e, status) {
    e.preventDefault();
    if (dragId.current) onMove(dragId.current, status);
    dragId.current = null;
  }

  return (
    <div className="ple-board">
      {STATUSES.map((status) => {
        const cards = leads.filter((l) => l.status === status);
        const colValue = cards.reduce((s, l) => s + num(l.dealValue), 0);
        return (
          <div
            key={status}
            className="ple-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="ple-column-header" style={{ borderTopColor: STATUS_COLOR[status] }}>
              <span className="ple-column-title">{status}</span>
              <span className="ple-column-count">{cards.length}</span>
            </div>
            <div className="ple-column-sum ple-mono">{fmtMoney(colValue)}</div>
            <div className="ple-column-body">
              {cards.map((l) => (
                <LeadCardMini key={l.id} lead={l} onOpen={onOpen} onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = "move"; }} />
              ))}
              {status === "New" && (
                <button className="ple-add-card" onClick={onAdd}><Plus size={14} /> Add Lead</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
   VIEW 2 — LEAD LOG
========================================================================= */

const LOG_COLUMNS = [
  { key: "leadName", label: "Lead" }, { key: "company", label: "Company" },
  { key: "source", label: "Source" }, { key: "setterName", label: "Setter" },
  { key: "closerName", label: "Closer" }, { key: "status", label: "Status" },
  { key: "meetingStatus", label: "Meeting" }, { key: "dateCreated", label: "Created" },
  { key: "dateOfMeeting", label: "Meeting Date" }, { key: "dealValue", label: "Deal Value" },
  { key: "cashCollected", label: "Cash Collected" }, { key: "lossReason", label: "Loss Reason" },
];

function LeadLog({ leads, onOpen }) {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [setterF, setSetterF] = useState("all");
  const [closerF, setCloserF] = useState("all");
  const [sort, setSort] = useState({ key: "dateCreated", dir: "desc" });

  const rows = useMemo(() => {
    let r = leads.filter((l) => {
      if (statusF !== "all" && l.status !== statusF) return false;
      if (setterF !== "all" && l.setterName !== setterF) return false;
      if (closerF !== "all" && l.closerName !== closerF) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(l.leadName + l.company + l.email).toLowerCase().includes(s)) return false;
      }
      return true;
    });
    r.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (["dealValue", "cashCollected"].includes(sort.key)) { av = num(av); bv = num(bv); }
      if (av === undefined || av === "") av = sort.dir === "asc" ? Infinity : -Infinity;
      if (bv === undefined || bv === "") bv = sort.dir === "asc" ? Infinity : -Infinity;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [leads, search, statusF, setterF, closerF, sort]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="ple-log">
      <div className="ple-toolbar">
        <div className="ple-search">
          <Search size={14} />
          <input placeholder="Search leads, companies, emails…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <SelectInput className="ple-toolbar-select" options={[{ value: "all", label: "All Statuses" }, ...STATUSES]} value={statusF} onChange={(e) => setStatusF(e.target.value)} />
        <SelectInput className="ple-toolbar-select" options={[{ value: "all", label: "All Setters" }, ...SETTERS]} value={setterF} onChange={(e) => setSetterF(e.target.value)} />
        <SelectInput className="ple-toolbar-select" options={[{ value: "all", label: "All Closers" }, ...CLOSERS]} value={closerF} onChange={(e) => setCloserF(e.target.value)} />
        <span className="ple-toolbar-count">{rows.length} leads</span>
      </div>
      <div className="ple-table-wrap">
        <table className="ple-table">
          <thead>
            <tr>
              {LOG_COLUMNS.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label} <ArrowUpDown size={11} style={{ opacity: sort.key === c.key ? 1 : 0.3 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} onClick={() => onOpen(l)} className={isFollowUpAging(l) || isBookingLagHigh(l) || isDepositUnpaidLate(l) ? "ple-row-flagged" : ""}>
                <td>{l.leadName || "—"}</td>
                <td>{l.company || "—"}</td>
                <td>{l.source}</td>
                <td>{l.setterName}</td>
                <td>{l.closerName}</td>
                <td><Badge color={STATUS_COLOR[l.status]}>{l.status}</Badge></td>
                <td>{l.meetingStatus || "—"}</td>
                <td>{fmtDate(l.dateCreated)}</td>
                <td>{fmtDate(l.dateOfMeeting)}</td>
                <td className="ple-mono">{l.dealValue ? fmtMoney(l.dealValue) : "—"}</td>
                <td className="ple-mono">{l.cashCollected ? fmtMoney(l.cashCollected) : "—"}</td>
                <td>{l.lossReason || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: "center", padding: 24, color: "#98A2B3" }}>No leads match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   VIEW 3 — DASHBOARD
========================================================================= */

function DashboardFilters({ filters, setFilters }) {
  const reps = ["all", ...SETTERS, ...CLOSERS];
  return (
    <div className="ple-toolbar">
      <SelectInput className="ple-toolbar-select" options={[{ value: "all", label: "All Reps" }, ...reps.filter((r) => r !== "all").map((r) => ({ value: r, label: r }))]} value={filters.rep} onChange={(e) => setFilters((f) => ({ ...f, rep: e.target.value }))} />
      <SelectInput className="ple-toolbar-select" options={[{ value: "all", label: "All Sources" }, ...SOURCES]} value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))} />
      <label className="ple-date-range"><span>From</span><TextInput type="date" value={filters.start} onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))} /></label>
      <label className="ple-date-range"><span>To</span><TextInput type="date" value={filters.end} onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))} /></label>
      {(filters.rep !== "all" || filters.source !== "all" || filters.start || filters.end) && (
        <button className="ple-btn ple-btn-ghost" onClick={() => setFilters({ rep: "all", source: "all", start: "", end: "" })}>Clear</button>
      )}
    </div>
  );
}

function ActivityLog({ activities, onAdd, onDelete }) {
  const [form, setForm] = useState({ date: todayStr(), setterName: SETTERS[0], dials: "", dms: "", conversations: "" });
  return (
    <div className="ple-panel">
      <h3>Daily Setter Activity</h3>
      <div className="ple-activity-form">
        <TextInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <SelectInput options={SETTERS} value={form.setterName} onChange={(e) => setForm((f) => ({ ...f, setterName: e.target.value }))} />
        <TextInput type="number" placeholder="Dials" value={form.dials} onChange={(e) => setForm((f) => ({ ...f, dials: e.target.value }))} />
        <TextInput type="number" placeholder="DMs sent" value={form.dms} onChange={(e) => setForm((f) => ({ ...f, dms: e.target.value }))} />
        <TextInput type="number" placeholder="Conversations" value={form.conversations} onChange={(e) => setForm((f) => ({ ...f, conversations: e.target.value }))} />
        <button className="ple-btn ple-btn-primary" onClick={() => { onAdd({ ...form, id: uid() }); setForm((f) => ({ ...f, dials: "", dms: "", conversations: "" })); }}>
          <Plus size={14} /> Log
        </button>
      </div>
      <div className="ple-table-wrap" style={{ maxHeight: 180 }}>
        <table className="ple-table ple-table-compact">
          <thead><tr><th>Date</th><th>Setter</th><th>Dials</th><th>DMs</th><th>Conversations</th><th></th></tr></thead>
          <tbody>
            {activities.slice().reverse().slice(0, 8).map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.date)}</td><td>{a.setterName}</td><td className="ple-mono">{a.dials || 0}</td>
                <td className="ple-mono">{a.dms || 0}</td><td className="ple-mono">{a.conversations || 0}</td>
                <td><button className="ple-icon-btn" onClick={() => onDelete(a.id)}><X size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dashboard({ leads, activities, revenueGoal, setRevenueGoal, onAddActivity, onDeleteActivity }) {
  const [filters, setFilters] = useState({ rep: "all", source: "all", start: "", end: "" });

  const filtered = useMemo(() => leads.filter((l) => {
    if (filters.rep !== "all" && l.setterName !== filters.rep && l.closerName !== filters.rep) return false;
    if (filters.source !== "all" && l.source !== filters.source) return false;
    if (filters.start && l.dateCreated && l.dateCreated < filters.start) return false;
    if (filters.end && l.dateCreated && l.dateCreated > filters.end) return false;
    return true;
  }), [leads, filters]);

  const filteredActivities = useMemo(() => activities.filter((a) => {
    if (filters.rep !== "all" && a.setterName !== filters.rep) return false;
    if (filters.start && a.date < filters.start) return false;
    if (filters.end && a.date > filters.end) return false;
    return true;
  }), [activities, filters]);

  const setterRows = useMemo(() => SETTERS.map((s) => {
    const own = filtered.filter((l) => l.setterName === s);
    const acts = filteredActivities.filter((a) => a.setterName === s);
    const conversations = acts.reduce((sum, a) => sum + num(a.conversations), 0);
    const booked = own.filter((l) => l.dateBooked).length;
    const scheduled = own.filter((l) => l.dateOfMeeting).length;
    const taken = own.filter((l) => l.meetingStatus === "Show").length;
    const noShows = own.filter((l) => l.meetingStatus === "No-Show").length;
    const cancels = own.filter((l) => l.meetingStatus === "Cancel").length;
    const declines = own.filter((l) => l.meetingStatus === "DQ").length;
    const speed = avg(own.filter((l) => l.firstContact).map((l) => minutesBetween(l.dateCreated, l.firstContact)));
    const lag = avg(own.filter((l) => l.dateBooked && l.dateOfMeeting).map((l) => bookingLagDays(l)));
    return {
      name: s, conversations, booked,
      bookRate: conversations ? (booked / conversations) * 100 : null,
      speed, lag, scheduled, taken, noShows, cancels, declines,
      showRate: scheduled ? (taken / scheduled) * 100 : null,
      dqRate: scheduled ? (declines / scheduled) * 100 : null,
    };
  }), [filtered, filteredActivities]);

  const closerRows = useMemo(() => CLOSERS.map((c) => {
    const own = filtered.filter((l) => l.closerName === c);
    const taken = own.filter((l) => l.meetingStatus === "Show").length;
    const offers = own.filter((l) => l.meetingStatus === "Show" && l.offerMade === "yes").length;
    const won = own.filter((l) => l.status === "Won");
    const oneCall = won.filter((l) => l.saleType === "1-Call").length;
    const followUp = won.filter((l) => l.saleType === "Follow-Up").length;
    const revenue = won.reduce((sum, l) => sum + num(l.dealValue), 0);
    return {
      name: c, taken, offers,
      offerRate: taken ? (offers / taken) * 100 : null,
      sales: won.length,
      closeRate: taken ? (won.length / taken) * 100 : null,
      closeRateOnOffers: offers ? (won.length / offers) * 100 : null,
      oneCall, followUp,
      avgDeal: won.length ? revenue / won.length : null,
      rpc: taken ? revenue / taken : null,
    };
  }), [filtered]);

  const lossData = useMemo(() => {
    const lost = filtered.filter((l) => l.status === "Lost");
    return LOSS_REASONS.map((r) => ({ name: r, value: lost.filter((l) => l.lossReason === r).length })).filter((d) => d.value > 0);
  }, [filtered]);

  const revenueByCloser = useMemo(() => CLOSERS.map((c) => ({
    name: c, revenue: filtered.filter((l) => l.closerName === c && l.status === "Won").reduce((s, l) => s + num(l.dealValue), 0),
  })), [filtered]);

  const money = useMemo(() => {
    const deposits = filtered.reduce((s, l) => s + num(l.depositAmount), 0);
    const won = filtered.filter((l) => l.status === "Won");
    const revenue = won.reduce((s, l) => s + num(l.dealValue), 0);
    const cash = filtered.reduce((s, l) => s + num(l.cashCollected), 0);
    const refunds = filtered.reduce((s, l) => s + num(l.refundAmount), 0);
    const withDeposit = filtered.filter((l) => num(l.depositAmount) > 0);
    const paidInFull = withDeposit.filter((l) => l.datePaidInFull);
    const daysToCollect = avg(paidInFull.map((l) => daysBetween(depositRefDate(l), l.datePaidInFull)));
    const net = revenue - refunds;
    return {
      deposits, totalSales: won.length, revenue, cash, refunds, net,
      depositToPifPct: withDeposit.length ? (paidInFull.length / withDeposit.length) * 100 : null,
      daysToCollect, goalPct: revenueGoal ? (net / revenueGoal) * 100 : 0,
    };
  }, [filtered, revenueGoal]);

  const commissionsByCloser = useMemo(() => CLOSERS.map((c) => ({
    name: c, earnings: filtered.filter((l) => l.closerName === c).reduce((s, l) => s + computeEarnings(l), 0),
  })), [filtered]);

  const followUpAgingCount = filtered.filter(isFollowUpAging).length;
  const bookingLagHighCount = filtered.filter(isBookingLagHigh).length;
  const depositUnpaidCount = filtered.filter(isDepositUnpaidLate).length;

  return (
    <div className="ple-dashboard">
      <DashboardFilters filters={filters} setFilters={setFilters} />

      {(followUpAgingCount > 0 || bookingLagHighCount > 0 || depositUnpaidCount > 0) && (
        <div className="ple-alert-bar">
          <Flame size={15} color="#DC2626" />
          <span>
            {followUpAgingCount > 0 && <><strong>{followUpAgingCount}</strong> follow-ups aging 7+ days. </>}
            {bookingLagHighCount > 0 && <><strong>{bookingLagHighCount}</strong> bookings lagging 4+ days. </>}
            {depositUnpaidCount > 0 && <><strong>{depositUnpaidCount}</strong> deposits unpaid 14+ days.</>}
          </span>
        </div>
      )}

      <div className="ple-stat-grid">
        <StatCard label="Deposits" value={fmtMoney(money.deposits)} icon={DollarSign} />
        <StatCard label="Total Sales" value={money.totalSales} icon={Target} />
        <StatCard label="Revenue Generated" value={fmtMoney(money.revenue)} icon={TrendingUp} accent="#0E7C4A" />
        <StatCard label="Cash Collected" value={fmtMoney(money.cash)} icon={DollarSign} />
        <StatCard label="Refunds / Clawbacks" value={fmtMoney(money.refunds)} icon={TrendingDown} accent="#DC2626" />
        <StatCard label="Net Revenue" value={fmtMoney(money.net)} icon={DollarSign} accent="#0E7C4A" />
        <StatCard label="Deposit → PIF Conv." value={fmtPct(money.depositToPifPct)} icon={Target} />
        <StatCard label="Avg Days to Collect" value={money.daysToCollect !== null ? money.daysToCollect.toFixed(1) : "—"} icon={Clock} />
      </div>

      <div className="ple-panel">
        <div className="ple-panel-header-row">
          <h3>Revenue Goal</h3>
          <div className="ple-goal-edit">
            <span>$</span>
            <TextInput type="number" value={revenueGoal} onChange={(e) => setRevenueGoal(num(e.target.value))} />
          </div>
        </div>
        <div className="ple-progress-track">
          <div className="ple-progress-fill" style={{ width: `${Math.min(100, money.goalPct)}%`, background: money.goalPct >= 100 ? "#0E7C4A" : "#B7862C" }} />
        </div>
        <div className="ple-field-hint">{fmtMoney(money.net)} of {fmtMoney(revenueGoal)} — {fmtPct(money.goalPct)} of goal</div>
      </div>

      <div className="ple-panel">
        <h3>Setter Metrics</h3>
        <div className="ple-table-wrap">
          <table className="ple-table">
            <thead>
              <tr>
                <th>Setter</th><th>Conversations</th><th>Booked</th><th>Conv→Booked %</th>
                <th>Speed to Lead (min)</th><th>Booking Lag (days)</th><th>Scheduled</th><th>Taken</th>
                <th>No-Shows</th><th>Cancels</th><th>Declines (DQ)</th><th>Show-Up %</th><th>DQ Rate %</th>
              </tr>
            </thead>
            <tbody>
              {setterRows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td><td className="ple-mono">{r.conversations}</td><td className="ple-mono">{r.booked}</td>
                  <td className="ple-mono">{fmtPct(r.bookRate)}</td>
                  <td className={"ple-mono" + (r.speed !== null && r.speed > 120 ? " ple-cell-warn" : "")}>{r.speed !== null ? r.speed.toFixed(0) : "—"}</td>
                  <td className={"ple-mono" + (r.lag !== null && r.lag > 4 ? " ple-cell-warn" : "")}>{r.lag !== null ? r.lag.toFixed(1) : "—"}</td>
                  <td className="ple-mono">{r.scheduled}</td><td className="ple-mono">{r.taken}</td>
                  <td className="ple-mono">{r.noShows}</td><td className="ple-mono">{r.cancels}</td><td className="ple-mono">{r.declines}</td>
                  <td className="ple-mono">{fmtPct(r.showRate)}</td><td className="ple-mono">{fmtPct(r.dqRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ple-field-hint">Declines are read from the DQ meeting status; Cancels from the Cancel status.</p>
      </div>

      <ActivityLog activities={filteredActivities} onAdd={onAddActivity} onDelete={onDeleteActivity} />

      <div className="ple-panel">
        <h3>Closer Metrics</h3>
        <div className="ple-table-wrap">
          <table className="ple-table">
            <thead>
              <tr>
                <th>Closer</th><th>Calls Taken</th><th>Offers Made</th><th>Offer Rate %</th>
                <th>Sales</th><th>Close Rate %</th><th>Close Rate on Offers %</th>
                <th>1-Call Sales</th><th>Follow-Up Sales</th><th>Avg Deal Size</th><th>RPC</th>
              </tr>
            </thead>
            <tbody>
              {closerRows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td><td className="ple-mono">{r.taken}</td><td className="ple-mono">{r.offers}</td>
                  <td className="ple-mono">{fmtPct(r.offerRate)}</td><td className="ple-mono">{r.sales}</td>
                  <td className="ple-mono">{fmtPct(r.closeRate)}</td><td className="ple-mono">{fmtPct(r.closeRateOnOffers)}</td>
                  <td className="ple-mono">{r.oneCall}</td><td className="ple-mono">{r.followUp}</td>
                  <td className="ple-mono">{r.avgDeal !== null ? fmtMoney(r.avgDeal) : "—"}</td>
                  <td className="ple-mono">{r.rpc !== null ? fmtMoney(r.rpc) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ple-grid-2">
        <div className="ple-panel">
          <h3>Loss Reason Breakdown</h3>
          {lossData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={lossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(d) => `${d.name} (${d.value})`}>
                  {lossData.map((d, i) => <Cell key={d.name} fill={LOSS_COLORS[i % LOSS_COLORS.length]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="ple-field-hint">No lost leads in this filter.</p>}
        </div>
        <div className="ple-panel">
          <h3>Revenue by Closer</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByCloser}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RTooltip formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="revenue" fill="#0E5F52" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ple-panel">
        <h3>Commissions Earned (net of clawbacks)</h3>
        <div className="ple-stat-grid">
          {commissionsByCloser.map((c) => (
            <StatCard key={c.name} label={c.name} value={fmtMoney(c.earnings)} icon={DollarSign} accent="#B7862C" />
          ))}
          <StatCard label="Follow-Up Aging (7+ days)" value={followUpAgingCount} icon={AlertTriangle} accent={followUpAgingCount ? "#DC2626" : undefined} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PROJECTION MODULE
========================================================================= */

function Projection({ leads }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const todayIso = todayStr();

  const monthLeads = leads.filter((l) => l.dateOfMeeting && l.dateOfMeeting >= monthStart && l.dateOfMeeting <= monthEnd);
  const wonThisMonth = monthLeads.filter((l) => l.status === "Won");
  const alreadyRevenue = wonThisMonth.reduce((s, l) => s + num(l.dealValue), 0);
  const alreadyCash = leads.filter((l) => l.dateCreated >= monthStart).reduce((s, l) => s + num(l.cashCollected), 0);

  const upcoming = monthLeads.filter((l) => l.dateOfMeeting >= todayIso && l.status !== "Won" && l.status !== "Lost");

  const historical = leads.filter((l) => l.meetingStatus);
  const scheduledHist = leads.filter((l) => l.dateOfMeeting).length || 1;
  const takenHist = historical.filter((l) => l.meetingStatus === "Show").length;
  const showRate = takenHist / scheduledHist;
  const offersHist = historical.filter((l) => l.meetingStatus === "Show" && l.offerMade === "yes").length;
  const offerRate = takenHist ? offersHist / takenHist : 0;
  const wonHist = leads.filter((l) => l.status === "Won").length;
  const closeRate = offersHist ? wonHist / offersHist : 0;
  const dealSizes = leads.filter((l) => l.status === "Won").map((l) => num(l.dealValue));
  const avgDeal = dealSizes.length ? dealSizes.reduce((a, b) => a + b, 0) / dealSizes.length : 0;
  const cashRatio = (() => {
    const won = leads.filter((l) => l.status === "Won" && num(l.dealValue) > 0);
    if (!won.length) return 1;
    return avg(won.map((l) => Math.min(1, num(l.cashCollected) / num(l.dealValue)))) || 1;
  })();

  function scenario(mult, label) {
    const sr = Math.min(1, showRate * mult);
    const or_ = Math.min(1, offerRate * mult);
    const cr = Math.min(1, closeRate * mult);
    const projectedSales = upcoming.length * sr * or_ * cr;
    const projectedRevenue = projectedSales * avgDeal;
    const totalRevenue = alreadyRevenue + projectedRevenue;
    const totalCash = alreadyCash + projectedRevenue * cashRatio;
    return { label, sr, or_, cr, projectedSales, totalRevenue, totalCash };
  }

  const worst = scenario(0.8, "Worst Case");
  const expected = scenario(1, "Expected Case");
  const best = scenario(1.15, "Best Case");

  return (
    <div className="ple-dashboard">
      <div className="ple-panel">
        <h3><Rocket size={16} style={{ verticalAlign: "-2px", marginRight: 6 }} />End-of-Month Forecast</h3>
        <p className="ple-field-hint">
          Based on {upcoming.length} meetings still scheduled this month, applied against your team's historical
          show-up rate ({fmtPct(showRate * 100)}), offer rate ({fmtPct(offerRate * 100)}), close-on-offer rate
          ({fmtPct(closeRate * 100)}), and average deal size ({fmtMoney(avgDeal)}). Best/worst flex those rates ±15–20%.
        </p>
      </div>
      <div className="ple-grid-3-even">
        {[worst, expected, best].map((s) => (
          <div key={s.label} className={"ple-panel ple-scenario" + (s.label === "Expected Case" ? " ple-scenario-main" : "")}>
            <h3>{s.label}</h3>
            <div className="ple-stat-value" style={{ fontSize: 28 }}>{fmtMoney(s.totalRevenue)}</div>
            <div className="ple-field-hint">Projected revenue</div>
            <div className="ple-stat-value" style={{ fontSize: 20, marginTop: 10, color: "#0E5F52" }}>{fmtMoney(s.totalCash)}</div>
            <div className="ple-field-hint">Projected cash collected</div>
            <div className="ple-scenario-detail">
              <span>Show-up {fmtPct(s.sr * 100)}</span>
              <span>Offer {fmtPct(s.or_ * 100)}</span>
              <span>Close/offer {fmtPct(s.cr * 100)}</span>
              <span>~{s.projectedSales.toFixed(1)} new sales</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ple-panel">
        <h3>Already Booked This Month</h3>
        <div className="ple-stat-grid">
          <StatCard label="Meetings This Month" value={monthLeads.length} icon={Calendar} />
          <StatCard label="Upcoming (Not Yet Held)" value={upcoming.length} icon={Clock} />
          <StatCard label="Already Won Revenue" value={fmtMoney(alreadyRevenue)} icon={TrendingUp} accent="#0E7C4A" />
          <StatCard label="Already Collected Cash" value={fmtMoney(alreadyCash)} icon={DollarSign} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROOT APP
========================================================================= */

const STORAGE_KEY = "pipeline-ledger-data";

export default function PipelineLedgerApp() {
  const [leads, setLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [revenueGoal, setRevenueGoal] = useState(100000);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("kanban");
  const [modalLead, setModalLead] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setLeads(parsed.leads && parsed.leads.length ? parsed.leads : seedLeads());
          setActivities(parsed.activities && parsed.activities.length ? parsed.activities : seedActivities());
          setRevenueGoal(parsed.revenueGoal || 100000);
        } else {
          setLeads(seedLeads());
          setActivities(seedActivities());
        }
      } catch (e) {
        setLeads(seedLeads());
        setActivities(seedActivities());
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      window.storage.set(STORAGE_KEY, JSON.stringify({ leads, activities, revenueGoal }), true).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [leads, activities, revenueGoal, loaded]);

  function openNewLead() { setModalLead(EMPTY_LEAD()); }
  function openLead(lead) { setModalLead(lead); }
  function closeModal() { setModalLead(null); }
  function saveLead(form) {
    setLeads((prev) => {
      const exists = prev.some((l) => l.id === form.id);
      return exists ? prev.map((l) => (l.id === form.id ? form : l)) : [...prev, form];
    });
    setModalLead(null);
  }
  function deleteLead(id) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setModalLead(null);
  }
  function moveLead(id, status) {
    setLeads((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, status };
      if (status === "Lost" && !l.lossReason) {
        setTimeout(() => setModalLead(updated), 0);
      }
      return updated;
    }));
  }
  function addActivity(entry) { setActivities((prev) => [...prev, entry]); }
  function deleteActivity(id) { setActivities((prev) => prev.filter((a) => a.id !== id)); }

  const NAV = [
    { key: "kanban", label: "Board", icon: LayoutGrid },
    { key: "log", label: "Lead Log", icon: Table2 },
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "projection", label: "Projection", icon: Rocket },
  ];

  return (
    <div className="ple-app">
      <Styles />
      <header className="ple-header">
        <div className="ple-brand">
          <span className="ple-brand-mark">$</span>
          <div>
            <div className="ple-brand-title">Pipeline Ledger</div>
            <div className="ple-brand-sub">Setter &amp; closer sales tracker</div>
          </div>
        </div>
        <nav className="ple-nav">
          {NAV.map((n) => (
            <button key={n.key} className={"ple-nav-btn" + (view === n.key ? " ple-nav-btn-active" : "")} onClick={() => setView(n.key)}>
              <n.icon size={15} /> {n.label}
            </button>
          ))}
        </nav>
        <button className="ple-btn ple-btn-primary ple-btn-header" onClick={openNewLead}><Plus size={15} /> New Lead</button>
      </header>

      <div className="ple-shared-note"><Info size={12} /> Shared board — all data here is visible to everyone using this artifact.</div>

      <main className="ple-main">
        {view === "kanban" && <KanbanBoard leads={leads} onOpen={openLead} onMove={moveLead} onAdd={openNewLead} />}
        {view === "log" && <LeadLog leads={leads} onOpen={openLead} />}
        {view === "dashboard" && (
          <Dashboard leads={leads} activities={activities} revenueGoal={revenueGoal} setRevenueGoal={setRevenueGoal}
            onAddActivity={addActivity} onDeleteActivity={deleteActivity} />
        )}
        {view === "projection" && <Projection leads={leads} />}
      </main>

      {modalLead && <LeadModal lead={modalLead} onClose={closeModal} onSave={saveLead} onDelete={deleteLead} />}
    </div>
  );
}

/* =========================================================================
   STYLES
========================================================================= */

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

      .ple-app {
        --ink: #101828; --ink-soft: #667085; --border: #E4E7EC; --bg: #F4F6F8; --surface: #FFFFFF;
        --accent: #0E5F52; --gold: #B7862C; --danger: #DC2626; --danger-bg: #FEF2F2;
        font-family: 'Inter', system-ui, sans-serif; color: var(--ink); background: var(--bg);
        min-height: 100vh; font-size: 14px; line-height: 1.4;
      }
      .ple-app * { box-sizing: border-box; }
      .ple-mono { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-variant-numeric: tabular-nums; }

      .ple-header {
        display: flex; align-items: center; gap: 20px; padding: 14px 20px;
        background: var(--surface); border-bottom: 1px solid var(--border); flex-wrap: wrap;
        position: sticky; top: 0; z-index: 20;
      }
      .ple-brand { display: flex; align-items: center; gap: 10px; margin-right: auto; }
      .ple-brand-mark {
        width: 34px; height: 34px; border-radius: 8px; background: var(--accent); color: #fff;
        display: flex; align-items: center; justify-content: center; font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 18px;
      }
      .ple-brand-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -0.01em; }
      .ple-brand-sub { font-size: 11.5px; color: var(--ink-soft); }
      .ple-nav { display: flex; gap: 4px; background: var(--bg); padding: 4px; border-radius: 10px; overflow-x: auto; }
      .ple-nav-btn {
        display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: none; background: transparent;
        border-radius: 7px; font-size: 13px; font-weight: 500; color: var(--ink-soft); cursor: pointer; white-space: nowrap;
      }
      .ple-nav-btn-active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px rgba(16,24,40,.08); }
      .ple-btn-header { white-space: nowrap; }

      .ple-shared-note {
        display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-soft);
        background: #EEF4F3; padding: 6px 20px; border-bottom: 1px solid var(--border);
      }

      .ple-main { padding: 20px; max-width: 1400px; margin: 0 auto; }

      /* Buttons */
      .ple-btn {
        display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 8px;
        font-size: 13px; font-weight: 600; border: 1px solid transparent; cursor: pointer;
      }
      .ple-btn-primary { background: var(--accent); color: #fff; }
      .ple-btn-primary:hover { background: #0B4B40; }
      .ple-btn-ghost { background: transparent; color: var(--ink-soft); border-color: var(--border); }
      .ple-btn-ghost:hover { background: var(--bg); }
      .ple-btn-danger { background: var(--danger-bg); color: var(--danger); }
      .ple-icon-btn { background: none; border: none; cursor: pointer; color: var(--ink-soft); display: flex; padding: 4px; border-radius: 6px; }
      .ple-icon-btn:hover { background: var(--bg); }

      /* Kanban */
      .ple-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; }
      .ple-column { min-width: 250px; max-width: 270px; flex: 0 0 auto; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; max-height: calc(100vh - 210px); }
      .ple-column-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 12px 6px; border-top: 3px solid; border-radius: 12px 12px 0 0; }
      .ple-column-title { font-weight: 600; font-size: 13px; }
      .ple-column-count { font-size: 11px; background: var(--bg); color: var(--ink-soft); padding: 1px 7px; border-radius: 20px; }
      .ple-column-sum { font-size: 11px; color: var(--ink-soft); padding: 0 12px 8px; border-bottom: 1px dashed var(--border); }
      .ple-column-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
      .ple-card {
        background: var(--surface); border: 1px solid var(--border); border-left: 3px solid;
        border-radius: 8px; padding: 10px 11px; cursor: grab; transition: box-shadow .15s;
      }
      .ple-card:hover { box-shadow: 0 2px 8px rgba(16,24,40,.08); }
      .ple-card-flagged { background: var(--danger-bg); }
      .ple-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }
      .ple-card-name { font-weight: 600; font-size: 13px; }
      .ple-card-company { font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }
      .ple-card-row { display: flex; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
      .ple-card-meta { justify-content: space-between; font-size: 11px; color: var(--ink-soft); align-items: center; }
      .ple-card-meta span { display: inline-flex; align-items: center; gap: 4px; }
      .ple-flag-line { margin-top: 6px; font-size: 10.5px; color: var(--danger); font-weight: 600; }
      .ple-add-card {
        border: 1px dashed var(--border); background: transparent; border-radius: 8px; padding: 8px;
        display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--ink-soft); cursor: pointer; font-size: 12.5px;
      }
      .ple-add-card:hover { background: var(--bg); }
      .ple-badge { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }

      /* Toolbar / filters */
      .ple-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
      .ple-search { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; flex: 1; min-width: 200px; color: var(--ink-soft); }
      .ple-search input { border: none; outline: none; flex: 1; font-size: 13px; background: transparent; color: var(--ink); }
      .ple-toolbar-select { width: auto; }
      .ple-toolbar-count { font-size: 12px; color: var(--ink-soft); margin-left: auto; }
      .ple-date-range { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-soft); }
      .ple-date-range input { width: 140px; }

      /* Inputs */
      .ple-input {
        border: 1px solid var(--border); border-radius: 7px; padding: 8px 10px; font-size: 13px;
        background: var(--surface); color: var(--ink); width: 100%; font-family: inherit;
      }
      .ple-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
      .ple-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
      .ple-field-label { font-size: 11.5px; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .03em; }
      .ple-field-hint { font-size: 11px; color: var(--ink-soft); }

      /* Table */
      .ple-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
      .ple-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .ple-table th { text-align: left; padding: 10px 12px; background: var(--bg); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .02em; color: var(--ink-soft); cursor: pointer; white-space: nowrap; border-bottom: 1px solid var(--border); }
      .ple-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
      .ple-table tbody tr:hover { background: var(--bg); cursor: pointer; }
      .ple-table tbody tr:last-child td { border-bottom: none; }
      .ple-row-flagged { background: var(--danger-bg); }
      .ple-table-compact th, .ple-table-compact td { padding: 6px 10px; }
      .ple-cell-warn { color: var(--danger); font-weight: 600; }

      /* Panels / stats */
      .ple-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .ple-panel h3 { font-family: 'Space Grotesk', sans-serif; font-size: 14px; margin: 0 0 12px; font-weight: 600; }
      .ple-panel-header-row { display: flex; justify-content: space-between; align-items: center; }
      .ple-dashboard { display: flex; flex-direction: column; }
      .ple-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px; }
      .ple-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
      .ple-stat-top { display: flex; justify-content: space-between; align-items: center; }
      .ple-stat-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: var(--ink-soft); font-weight: 600; }
      .ple-stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600; margin-top: 4px; }
      .ple-stat-sub { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
      .ple-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .ple-grid-3-even { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 16px; }
      .ple-alert-bar { display: flex; align-items: center; gap: 8px; background: var(--danger-bg); color: #7A1913; border: 1px solid #FCA5A5; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; font-size: 12.5px; }

      .ple-goal-edit { display: flex; align-items: center; gap: 4px; }
      .ple-goal-edit input { width: 140px; }
      .ple-progress-track { height: 8px; background: var(--bg); border-radius: 6px; margin-top: 10px; overflow: hidden; }
      .ple-progress-fill { height: 100%; border-radius: 6px; transition: width .3s; }

      .ple-activity-form { display: grid; grid-template-columns: 130px 130px 90px 90px 110px auto; gap: 8px; margin-bottom: 12px; align-items: center; }

      .ple-scenario { text-align: center; }
      .ple-scenario-main { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
      .ple-scenario-detail { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 12px; font-size: 11px; color: var(--ink-soft); }
      .ple-scenario-detail span { background: var(--bg); padding: 3px 8px; border-radius: 20px; }

      /* Modal */
      .ple-modal-overlay { position: fixed; inset: 0; background: rgba(16,24,40,.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
      .ple-modal { background: var(--surface); border-radius: 14px; width: 100%; max-width: 780px; max-height: 90vh; display: flex; flex-direction: column; }
      .ple-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
      .ple-modal-header h2 { font-family: 'Space Grotesk', sans-serif; font-size: 16px; margin: 0; }
      .ple-modal-body { padding: 16px 20px; overflow-y: auto; }
      .ple-modal-footer { display: flex; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border); }
      .ple-section { margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px dashed var(--border); }
      .ple-section:last-child { border-bottom: none; }
      .ple-section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); margin: 0 0 10px; }
      .ple-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 14px; }
      .ple-earnings-row { display: flex; align-items: center; gap: 10px; background: var(--bg); border-radius: 8px; padding: 10px 12px; margin-top: 6px; font-size: 12.5px; }
      .ple-error { display: flex; align-items: center; gap: 6px; background: var(--danger-bg); color: var(--danger); padding: 8px 12px; border-radius: 8px; font-size: 12.5px; }

      @media (max-width: 860px) {
        .ple-grid-2, .ple-grid-3-even { grid-template-columns: 1fr; }
        .ple-grid-3 { grid-template-columns: 1fr 1fr; }
        .ple-activity-form { grid-template-columns: 1fr 1fr; }
        .ple-header { padding: 10px 12px; }
        .ple-main { padding: 12px; }
      }
      @media (max-width: 520px) {
        .ple-grid-3 { grid-template-columns: 1fr; }
        .ple-brand-sub { display: none; }
      }
    `}</style>
  );
}
