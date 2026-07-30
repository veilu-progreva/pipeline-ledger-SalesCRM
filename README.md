# Pipeline Ledger — Sales CRM
### Implementation & Demo Documentation

A single tool for setters and closers: one Kanban board of lead cards feeds a
filterable log, a metrics dashboard, and an end-of-month forecast — nothing is
entered twice.

---

## 1. What's in the box

| Component | Purpose |
|---|---|
| **Board (Kanban)** | Main daily input. One card per lead, drag between 7 status columns. |
| **Lead Log** | Every field on every card, as a searchable/sortable table. |
| **Dashboard** | Auto-calculated setter, closer, and money metrics. Filterable by rep, source, date range. |
| **Projection** | Best/Expected/Worst case revenue & cash forecast for the rest of the month. |

Everything in the Log, Dashboard, and Projection is **derived** from the Board —
reps only ever fill out a lead card (and, once daily, their dial/DM count).

---

## 2. Getting it running

### 2.1 Prerequisites
- Node.js 18+ (`node -v` to check)

### 2.2 Install & run locally
```bash
cd pipeline-ledger
npm install
npm run dev
```
Open the localhost URL Vite prints (typically `http://localhost:5173`).

### 2.3 Demo it to the team live
```bash
npm run dev -- --host
```
This prints a **Network** URL (e.g. `http://192.168.1.42:5173`). Anyone on the
same wifi can open that URL on their own laptop or phone during the demo.

> **Data scope note:** the local build stores data per-browser (via
> `localStorage`, see `src/storageShim.js`). Each person who opens the network
> URL sees their *own* copy of the board, not a shared live one. That's fine
> for a walkthrough; see §6 if you want one shared board across the team.

### 2.4 Producing a shareable static build
```bash
npm run build      # outputs to dist/
npm run preview    # sanity-check the production build locally
```
`dist/` is a plain static site — drag it onto Netlify, run `vercel deploy`, or
serve it from any static host.

---

## 3. Walkthrough: the Board

1. **Add a lead** — click **+ New Lead** (top right) or the **+ Add Lead**
   button at the bottom of the *New* column.
2. Fill in **Contact** (name, company, email, phone, source, setter, closer).
3. Fill in **Dates** as they happen: Date Created, First Contact, Date Booked,
   Date of Meeting, Last Touch.
4. After the call, set **Meeting Status**, **Offer Made**, and **Sale Type**.
5. **Drag the card** to the next column as the deal progresses.
   - Dropping a card on **Lost** requires a **Loss Reason** — the card reopens
     automatically if it's missing, and won't save without one.
6. Fill in **Money** fields (deposit, deal value, cash collected, refunds,
   commission %) as they're confirmed. **Earnings** calculates itself — no
   manual math.
7. Cards get a **red flag** automatically when:
   - a *Follow-Up Ongoing* card hasn't been touched in 7+ days,
   - booking lag (Booked → Meeting) is over 4 days,
   - a *Deposit*-stage card has gone 14+ days without being paid in full.

---

## 4. Walkthrough: the Lead Log

- Search box filters by lead name, company, or email.
- Dropdown filters: Status, Setter, Closer.
- Click any column header to sort (click again to reverse).
- Rows with an active red flag (aging, booking lag, unpaid deposit) are
  highlighted.
- Click any row to open that lead's full card.

---

## 5. Walkthrough: the Dashboard

1. Set filters at the top: **Rep** (any setter or closer), **Source**, and a
   **date range** (filters on Date Created).
2. A red alert bar appears if any leads in the current filter are flagged
   (aging follow-ups / booking lag / unpaid deposits).
3. Scroll through: Money summary cards → Revenue Goal (editable) → Setter
   Metrics table → **Daily Setter Activity** log (add dials/DMs/conversations
   here — this is the one number reps type in once a day) → Closer Metrics
   table → Loss Reason pie chart & Revenue-by-Closer bar chart →
   Commissions Earned per closer.

### Setter metrics
| Metric | How it's calculated |
|---|---|
| Conversations | Sum of "conversations" logged in Daily Activity |
| Conv → Booked % | Leads with a Date Booked ÷ Conversations |
| Speed to Lead | Avg minutes, Date Created → First Contact |
| Booking Lag | Avg days, Date Booked → Date of Meeting |
| Calls Scheduled | Leads with a Date of Meeting |
| Calls Taken | Meeting Status = Show |
| Show-Up Rate % | Calls Taken ÷ Calls Scheduled |
| No-Shows / Cancels / Declines | Meeting Status = No-Show / Cancel / **DQ** |
| DQ Rate % | Declines (DQ) ÷ Calls Scheduled |

### Closer metrics
| Metric | How it's calculated |
|---|---|
| Offer Rate % | Offers Made ÷ Calls Taken (Show) |
| Close Rate % | Sales (Won) ÷ Calls Taken |
| Close Rate on Offers % | Sales ÷ Offers Made |
| 1-Call vs Follow-Up Sales | Count of Won leads by Sale Type |
| Avg Deal Size | Avg Deal Value across Won leads |
| RPC (Revenue Per Call) | Sum Deal Value (Won) ÷ Calls Taken |

### Money metrics
| Metric | How it's calculated |
|---|---|
| Deposits | Sum of Deposit Amount, all filtered leads |
| Revenue Generated | Sum of Deal Value, Won leads |
| Cash Collected | Sum of Cash Collected, all filtered leads |
| Net Revenue | Revenue Generated − Refunds/Clawbacks |
| Deposit → PIF Conversion % | Leads paid in full ÷ leads with a deposit |
| Avg Days to Collect | Avg days, (Meeting/Booked/Created date) → Date Paid in Full |
| Goal Completion % | Net Revenue ÷ Revenue Goal (goal is editable inline) |
| Commissions Earned | Per closer: Σ (Cash Collected − Refunds) × Commission % |

---

## 6. Walkthrough: Projection

- Reads every lead with a **Date of Meeting still to come this month**.
- Applies your team's **historical** show-up rate, offer rate, and
  close-on-offer rate, times **average deal size**, to estimate additional
  sales.
- **Expected** = current historical rates. **Best** = rates × 1.15 (capped at
  100%). **Worst** = rates × 0.8.
- Adds that projection to revenue/cash **already** booked or collected this
  month for the final Best/Expected/Worst totals.
- "Projected cash" applies the team's historical cash-collected-vs-deal-value
  ratio, since not every dollar of a deal is collected immediately.

---

## 7. Key design decisions (so the team isn't surprised)

- **Earnings formula:** `(Cash Collected − Refunds) × Commission %` — commission
  is paid on cash actually in hand, not on the full contract value.
- **Declines vs. Cancels:** the Meeting Status list has no separate "Decline"
  option, so **Declines reads from DQ**, and **Cancels from Cancel**.
- **Days to Collect:** measured from the Meeting (or Booked, or Created) date
  to Date Paid in Full — there's no separate "deposit date" field in the card.
- **Shared vs. local data:** in Claude.ai, the board is shared — everyone using
  the artifact sees the same leads. In the local build, storage is
  per-browser (see `src/storageShim.js`); swap that file for a real backend
  (Supabase/Firebase/small Express+SQLite API) to get one live shared board
  running locally or on a server, with no other code changes needed.

---

## 8. Known limitations / good next steps

- No login/auth — anyone with the link/URL can edit any card.
- No audit trail (who changed what, when).
- No CSV import/export yet.
- Mobile layout is responsive but data-dense tables (Log, Dashboard) are
  easiest to read on tablet/desktop.
- "Rep" filter on the Dashboard matches a lead if the rep is either its setter
  *or* closer — useful for a quick look, but check both roles aren't the same
  person if you want purely setter- or closer-only views.
