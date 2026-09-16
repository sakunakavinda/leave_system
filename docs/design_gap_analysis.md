# System Design Gap Analysis
## Current System vs. Professional Leave Management Standards

> This document focuses entirely on **system design and business logic** — not code or technology.  
> Reference systems: SAP SuccessFactors, Workday, BambooHR, Zoho People, greytHR, OrangeHRM.

---

## 1. Leave Type Model

### Current System
A leave type is just a **label with a day count**. It has: name, code, color, default days, status.  
Leave rules (`annual_leave`, `sick_leave`, etc.) are attached to a **role + branch combination**.

### What Professional Systems Do
Leave types carry rich **policy configuration**, not just a count. Each leave type should define:

| Property | What it means |
|---|---|
| **Entitlement basis** | Is it fixed per year? Or does it accrue monthly? Or is it given on a specific date (hire anniversary)? |
| **Who is eligible** | All employees? Only permanent staff? Only employees with > 6 months tenure? Only female employees (maternity)? |
| **Carry-forward rules** | Can unused days roll over to next year? If so, how many days maximum? By what deadline? |
| **Encashment** | Can unused leave be paid out (encashed) at year-end? |
| **Minimum notice period** | How many days in advance must it be applied? (current system hardcodes 3 days for everything) |
| **Maximum consecutive days** | e.g., Casual leave cannot exceed 3 consecutive days |
| **Requires proof/attachment** | Sick leave may require a medical certificate if > 2 days |
| **Pro-rated for new joiners** | Does a person who joins mid-year get the full quota or only a fraction? |
| **Negative balance allowed** | Can someone take leave they haven't earned yet (borrow)? |
| **Weekends/public holidays count** | If someone takes Mon–Fri leave, do Saturday and Sunday count against the balance? |
| **Gender restriction** | Maternity, paternity |
| **Counted as paid or unpaid** | Some types (e.g., No-Pay Leave) affect salary |

### Gap Summary
> The current system treats all leave types identically with just a quota number. In reality, **Annual Leave**, **Sick Leave**, **Casual Leave**, **Maternity Leave**, **Paternity Leave**, and **No-Pay Leave** all behave very differently in terms of who gets them, when, and how they are counted.

---

## 2. Leave Entitlement & Accrual Model

### Current System
Each employee gets a flat quota per year defined by their role + branch rule.  
The quota resets implicitly each year (a new `leave_balances` row is created).

### What Professional Systems Do

**Entitlement** is the allocation of leave days to an employee for a period.

**Accrual** means leave builds up gradually over time. For example:
- An employee earns **1.25 days of Annual Leave per month** worked
- At month 1, they have 1.25 days they can take
- At month 12, they have 15 days
- If they leave mid-year, they only owe/are owed proportional days

**Three common models:**

| Model | How it works | Used for |
|---|---|---|
| **Flat allocation** | Full quota given on a fixed date (Jan 1 or hire date anniversary) | Casual, Sick leave |
| **Monthly accrual** | Days accumulate each month based on days worked | Annual leave in most countries |
| **Worked-hours accrual** | Days accumulate based on actual hours worked | Part-time workers |

**Proration** — when an employee joins mid-year, their annual entitlement is reduced proportionally.

### Gap Summary
> The current system gives the full flat quota forever with no concept of when the employee joined, how long they've worked, or monthly accrual. This is incorrect for annual leave in virtually every labour law context.

---

## 3. Employee Model & Employment Types

### Current System
An employee has: name, secret_code, role, branch, status.  
All employees are treated the same.

### What Professional Systems Do
The employee record carries employment metadata that **directly affects leave entitlement**:

| Field | Affects |
|---|---|
| **Employment type** | Full-time, Part-time, Contract, Intern → different leave quotas |
| **Hire date / Date of joining** | Determines proration of first-year leave; tenure-based bonus leave |
| **Confirmation date** | Some leave types (e.g., Annual leave) only kick in after probation |
| **Probation period** | Employees on probation may not be eligible for all leave types |
| **Contract end date** | Affects whether they can carry forward leave |
| **Work schedule / shift pattern** | A 4-day week employee has a different "1 day of leave" impact than a 5-day week employee |
| **Reporting manager (line manager)** | Used to route the approval to the right person |
| **HR manager / Department head** | Used for multi-level approval |
| **Gender** | Determines eligibility for maternity/paternity |

### Gap Summary
> The current system has no notion of hire date, contract type, or probation. All employees get the same treatment regardless of when they joined or what their employment type is. A system that doesn't know hire date cannot correctly compute entitlement.

---

## 4. Leave Approval Workflow

### Current System
One-level approval: Manager approves/rejects in the admin panel. There is no workflow — the manager just changes a status field.

### What Professional Systems Do
Leave approval follows a **workflow** — a defined sequence of approvers. Common models:

**Model 1: Single Approver (Line Manager)**  
Employee → Line Manager → Done.  
This is what the current system approximates.

**Model 2: Multi-Level Approval**  
Employee → Line Manager → Department Head → HR → Done.  
Used for long leaves, or above a certain number of days.

**Model 3: Auto-Approval**  
Certain leave types (e.g., emergency sick leave) auto-approve and notify.

**Key design concepts missing:**
- **Approval delegation** — What happens when the approver is on leave? Their backup should automatically receive the request.
- **Escalation** — If the approver doesn't act within N days, the request escalates to the next level or to HR.
- **Rejection with reason** — The approver should be required to state why they rejected.
- **Approval by HR vs. by Line Manager** — These are different roles in most systems. The current system has only one "manager" concept.
- **Leave request notification to approver** — In the current system, the manager has no way to know a new request came in unless they log in.

### Gap Summary
> The current system has no workflow engine — just a dropdown status change. There is no delegation, no escalation, no mandatory rejection reason, and no notification. The approval chain is entirely manual and relies on the manager proactively checking the admin panel.

---

## 5. Leave Balance Computation

### Current System
Balance is tracked as **taken days** counted up per year:
- Apply → `taken` increases
- Reject → `taken` decreases
- This is an "event-driven counter"

The "remaining" is: `quota - taken`

### What Professional Systems Do
Balance is a composite of several values:

```
Opening Balance (brought forward from last year)
  + Entitlement for this year (from the leave policy)
  + Adjustment (manual correction by HR)
  - Approved (and taken) leave
  - Pending (applied, not yet approved) leave — reserved
  = Available Balance
```

| Balance component | What it means |
|---|---|
| **Opening balance** | Days carried over from the previous year |
| **Entitlement** | Days allocated for the year by policy |
| **Pending** | Days applied for but not yet approved (should be shown separately, not deducted yet — or deducted as "tentative") |
| **Approved & taken** | Confirmed past leaves |
| **Approved & future** | Approved but not yet occurred |
| **Adjustment** | Manual additions/deductions by HR |
| **Lapsed** | Days that expired (carry-forward deadline passed) |

### Gap Summary
> The current system conflates "approved" and "pending" into the same deduction. In reality, pending leaves should be shown as "reserved" without fully reducing the available balance. Also there is no concept of opening balance (carry-forward) or HR manual adjustments.

---

## 6. Calendar & Public Holidays

### Current System
The system knows nothing about weekends or public holidays. If someone applies for leave from Monday to Friday, 5 days are deducted. If they apply for a Saturday, it is treated as a normal working day.

### What Professional Systems Do

**Working day calendar** — The system maintains:
1. **Work week definition** — Which days are working days for this organisation (Mon–Fri, Mon–Sat, etc.)
2. **Public holiday list** — Per country, per region, sometimes per branch (a branch in one province may have different public holidays)
3. **Organisation-defined holidays** — Company-specific closures

When a leave application spans a weekend or public holiday, those days are **automatically excluded** from the leave balance deduction.

Example: If public holidays are excluded and an employee applies for leave on Mon 14, Tue 15, Wed 16 (where Tue 15 is a public holiday), only **2 days** are deducted from their balance, not 3.

**Branch-specific calendars** — Different branches in different regions may observe different holidays.

### Gap Summary
> Without a working calendar and public holiday list, the leave deduction is always wrong. An employee who takes leave over a public holiday is penalised an extra day. This is non-compliant with virtually every labour law.

---

## 7. Leave Cancellation & Recall

### Current System
An employee can "Undo" a **pending** application (i.e., delete it before it is approved).  
There is no mechanism to cancel an **approved** leave after the fact.

### What Professional Systems Do

**Cancellation of a future approved leave:**
- Employee requests cancellation of an already-approved leave
- This triggers a **cancellation workflow** (may need manager approval again)
- On approval: the days are restored to the balance

**Recall by manager:**
- Manager can recall an approved leave if business needs change
- Employee is notified; this may require HR sign-off

**Late cancellation (after leave has started):**
- If an employee returns early from leave, the unused days are credited back
- This may require HR confirmation

**Cancellation of sick leave:**
- Typically cannot be cancelled retroactively since the days are already gone

### Gap Summary
> The current system has no cancellation workflow for approved leaves. Once approved, the leave is locked. This is a critical missing feature for any real organisation.

---

## 8. Substitution Model

### Current System
Substitution is mandatory for every leave application. Only employees with the **same role** and **same branch** can be substitutes. The substitute "confirms" via their secret code.

### What Professional Systems Do
Substitution (also called "delegation of duties" or "acting arrangement") is:

1. **Optional, not mandatory** — In most systems, substitution is only required for certain roles or leave durations, not for every leave application
2. **Separate from approval** — Substitute confirmation and manager approval are independent tracks; the leave should not be blocked by an unconfirmed substitute
3. **Formal handover document** — In senior roles, a handover note (list of pending tasks, contacts, etc.) is attached
4. **Auto-suggested by system** — The system recommends substitutes based on skills/role, not just branch+role match
5. **Substitute can decline** — The selected substitute should be able to decline (with reason), prompting the applicant to select another

### Gap Summary
> Making substitution mandatory for every single leave application is operationally impractical and not how most professional systems work. The substitution/delegation model needs to be decoupled from the core approval workflow and made optional or role-specific.

---

## 9. Notifications & Communication

### Current System
Zero notifications. A manager has to manually check the admin panel to see new applications. An employee has no way to know their leave was approved or rejected without logging in.

### What Professional Systems Do
Every key event triggers an automatic notification to the relevant party:

| Event | Who gets notified |
|---|---|
| Employee submits leave | Line manager (approval required) |
| Manager approves | Employee (confirmation) + HR (FYI) |
| Manager rejects | Employee (with rejection reason) |
| Leave about to start | Employee reminder (1–2 days before) |
| Employee selects substitute | Substitute (confirmation request) |
| Substitute confirms/declines | Original applicant |
| Leave balance is low | Employee (proactive warning) |
| Carry-forward deadline approaching | Employee + HR |
| Leave balance expires | Employee |

Notification channels: **email** is the bare minimum; modern systems also support **SMS**, **push notifications**, **in-app notifications**, and **Slack/Teams integration**.

### Gap Summary
> A leave system with no notifications forces everyone to manually poll a web page. This is the single biggest usability gap. The entire approval and communication loop depends on people proactively checking the system.

---

## 10. Leave Policy Assignment

### Current System
Leave rules are assigned per **role + branch combination**. This means:
- A "Senior Engineer" at the Colombo branch has a specific set of quotas.
- A "Senior Engineer" at the Kandy branch may have different quotas.
- This is a valid design for branch-specific policies.

### What Professional Systems Do
Most systems have a layered policy model:

```
Global default policy
  ↓ overridden by
Company-level policy
  ↓ overridden by
Department-level policy
  ↓ overridden by
Employee-group / grade policy (e.g., "Executive grade")
  ↓ overridden by
Individual employee-level override (manual HR adjustment)
```

**Leave group / Leave plan** — Employees are assigned to a "leave plan" or "leave group" that bundles all leave type entitlements together. This is cleaner than per-role-per-branch rules.

Example:
- "Executive Plan": 21 days Annual, 14 days Sick, 7 days Casual
- "Staff Plan": 14 days Annual, 10 days Sick, 5 days Casual
- "Intern Plan": 7 days Annual, 5 days Sick, 0 days Casual

Employees are assigned to a plan, not to individual rule rows.

### Gap Summary
> The current role+branch rule model is functional but rigid. Assigning employees to **named leave plans/groups** (instead of implicit role+branch combos) is cleaner, more portable, and easier for HR to manage. It also survives role changes — if an employee's role changes, their leave plan doesn't automatically change unless HR explicitly reassigns it.

---

## 11. Audit Trail & History

### Current System
There is no audit trail. If a manager approves, then rejects, then re-approves a leave application, there is no record of those events — only the current state.

### What Professional Systems Do
Every status change, balance adjustment, and policy change is logged:

| Event logged | Who did it | When | Old value | New value |
|---|---|---|---|---|
| Leave status changed | Manager name | Timestamp | Pending | Approved |
| Leave balance adjusted | HR name | Timestamp | 5 days | 8 days |
| Leave type quota changed | Admin | Timestamp | 14 days | 21 days |
| Employee's leave plan changed | HR | Timestamp | Staff Plan | Executive Plan |

This is critical for:
- **HR compliance** — Labour laws require records of leave decisions
- **Dispute resolution** — "I never rejected that leave" can be verified
- **Payroll integration** — Salary deductions for No-Pay Leave must be traceable
- **Reporting** — Trend analysis of leave patterns

### Gap Summary
> The current system has no audit log at all. The database only stores the current state. This makes it unusable for any HR compliance or legal dispute scenario.

---

## 12. Reporting & Analytics

### Current System
The admin panel has a monthly calendar view and a dashboard count of pending/approved/rejected applications. The employee-facing side has a heatmap and balance overview. There are no exported reports.

### What Professional Systems Do

Standard reports in a professional leave system:

| Report | Purpose |
|---|---|
| **Leave balance report** | All employees — remaining days per leave type as of today |
| **Leave taken report** | Date-range breakdown of who took what type of leave |
| **Absenteeism report** | Frequency and pattern of sick leave by employee/department |
| **Pending approvals report** | Applications waiting for action; escalation tracking |
| **Leave encashment report** | How much leave was paid out (for payroll) |
| **Carry-forward report** | Unused days to roll to next year, before expiry deadline |
| **Team coverage report** | How many people are absent per department per day; coverage risk |
| **New joiner proration report** | Entitlement calculated for mid-year joiners |
| **Year-end closing report** | Final leave positions for all employees at year-end |

All reports should be **exportable to Excel/PDF** and optionally scheduled to auto-email.

### Gap Summary
> The current system has visualisations (calendar, heatmap) but no structured reports. Visualisations help managers see patterns; structured reports are what HR actually uses to do their job (payroll, compliance, year-end).

---

## Summary Table: Design Gaps

| # | Design Area | Current State | Professional Standard |
|---|---|---|---|
| 1 | Leave Type Model | Name + day count | Rich policy: eligibility, notice period, consecutive limits, proof required, paid/unpaid, encashment |
| 2 | Entitlement & Accrual | Flat quota, yearly reset | Accrual model, proration for new joiners, carry-forward |
| 3 | Employee Model | Name + role + branch | Hire date, contract type, probation, work schedule, gender, reporting manager |
| 4 | Approval Workflow | Manual status change | Multi-level, delegation, escalation, rejection reason, notifications |
| 5 | Balance Computation | `quota - taken` (flat) | Opening balance + entitlement + adjustments - pending - taken |
| 6 | Calendar & Holidays | Not aware of weekends/holidays | Working day calendar, public holiday list per branch/region |
| 7 | Cancellation | Only pending cancellation (delete) | Cancellation workflow for approved leaves, early return credit |
| 8 | Substitution | Mandatory for all leaves | Optional, declination allowed, decoupled from approval |
| 9 | Notifications | None | Email/SMS/push for all events in the approval chain |
| 10 | Policy Assignment | Per role + branch rule | Named leave plans/groups assigned to employees |
| 11 | Audit Trail | None — only current state | Every event logged with actor, timestamp, old/new values |
| 12 | Reporting | Heatmap + calendar visualisation | 10+ structured HR reports, exportable, schedulable |

---

## Priority Order for Redesign

If redesigning from scratch, here is the logical order to tackle these:

```
1. Employee Model (hire date, employment type, reporting manager) — everything else depends on this
2. Working Calendar (weekdays + public holidays) — affects all balance calculations
3. Leave Type Policy (eligibility, accrual, notice, consecutive limits)
4. Leave Plans/Groups (bundle types into named plans, assign to employees)
5. Entitlement Engine (compute correct balance using accrual or flat model)
6. Approval Workflow (line manager → HR; delegation; escalation; rejection reason)
7. Cancellation Workflow (cancel approved future leave; early return)
8. Notifications (email at every workflow step)
9. Audit Trail (log every action)
10. Substitution (optional, decoupled, allow decline)
11. Reporting Engine (standard HR reports, export)
12. Payroll Integration (no-pay deductions, encashment)
```

---

*Analysis based on standard practices from SAP SuccessFactors, Workday HCM, BambooHR, Zoho People, greytHR, OrangeHRM, and various national labour law compliance requirements.*
