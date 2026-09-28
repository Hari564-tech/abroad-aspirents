# MERIDIAN - BACKEND ARCHITECTURE

> Confidential architecture document | 28 Sep 2026 | Meridian Student Operations

## Production Backend Architecture

End-to-end architecture for Admin, Employee, Student, University, Eligibility, Payments, Documents, Portals and Audit

Prepared from the complete project scope in this conversation and the supplied dashboard / university data sources

## Architecture Decision Summary

Build a modular monolith first: NestJS + Fastify API, PostgreSQL 18, Redis + BullMQ workers, private S3 object storage, email provider, and an isolated Student Upload Portal. Use events/outbox so high-load domains can be extracted later without redesigning the data model.

## Document Map
- 1. Executive architecture summary
- 2. Project scope and source traceability
- 3. Recommended technology stack
- 4. System context and runtime topology
- 5. Backend module architecture
- 6. Identity, authentication and authorization
- 7. Core domain model and database architecture
- 8. Student lifecycle and employee workflow
- 9. Leads, applications and status history
- 10. Payments and financial controls
- 11. University database and Excel import architecture
- 12. Student eligibility matching engine
- 13. Document management architecture
- 14. Student upload portal and controlled sharing
- 15. Notifications and communication
- 16. Audit, activity and compliance trail
- 17. Search, filtering, exports and reports
- 18. API contract and endpoint inventory
- 19. Events, queues and background jobs
- 20. Security architecture
- 21. Observability, reliability and disaster recovery
- 22. Deployment architecture and CI/CD
- 23. Performance and scaling
- 24. Testing strategy
- 25. Repository structure
- 26. Implementation phases and acceptance criteria
- 27. Architecture decisions, risks and open items
- 28. References and verification notes

# 1. Executive Architecture Summary
Meridian is a role-based student operations platform. The backend must be the system of record for students, employees, applications, payments, universities, eligibility analyses, documents, student upload portals, notifications and immutable activity history. The design below favors a modular monolith with asynchronous workers instead of premature microservices. This keeps implementation and operations manageable while preserving clear domain boundaries.

## Recommended architecture
```text
Web UI -> NestJS API -> PostgreSQL / Redis / S3 / Email. Heavy work is asynchronous through BullMQ workers.
All sensitive actions emit audit events. Document binaries live in private object storage; the database stores
metadata, versions and authorization context.
```
> Figure 1. Target runtime architecture

## Architecture principles
- Single source of truth: PostgreSQL owns business state and relationships.
- Secure by default: deny-by-default authorization, short-lived signed object URLs, encrypted sensitive fields and no credentials in client storage.
- Modular boundaries: each business capability owns controllers, services, repositories, policies, events and tests.
- Async where appropriate: file scanning, email, exports, report generation and large imports should not block HTTP requests.
- Explainability over black-box decisions: eligibility results store every rule evaluation and the requirement version used.
- Audit every material change: actor, subject, action, before/after, request ID, timestamp and source context.
- Data imports are staged and validated before becoming live records.
- Keep an extraction path: use transactional outbox and domain events so modules can later become separate services if needed.

# 2. Project Scope and Source Traceability
The architecture incorporates the full project scope developed in the conversation and the supplied files. The supplied dashboard requirements define student profile fields, payments, lead/status tracking, dashboard
metrics, university search fields and university CRUD/export. The later feature requirements add document management, student self-upload portals, eligibility matching, shortlist/report generation and audit integration.

| Source / scope area | Backend implications | Evidence / notes |
| --- | --- | --- |
| Student profile requirements | Student aggregate, academic profile, sensitive account credentials, country-specific fields, intake-aware IDs | Dashbaord data document: personal, academic, account, Germany-specific and payment fields. |
| Lead and application status | Lead ownership, Direct/B2B, status history, transitions and dashboard aggregates | Supplied status list includes Shortlisting Sent, Applications Started, Offered, Waiting, Deferred, Dropped, Private Registered, Private Shifted, Still Thinking and Got Visa. |
| University database | University, program, branch, intake, scores, application path, fee, deadlines, tuition, MOI, other requirements | Universities workbook contains Main, Copy of Main, Private Unis, Studienkolleg, Pharmacy and another copy sheet with different schemas. |
| Dashboard workbook | Import/migration layer plus derived reporting queries | Summer_2027_Main contains student/lead/payment data. Status_S27 contains summary rows and currently has formula errors, so production counts should be derived from normalized data. |
| Eligibility matching | Versioned requirement rules, explainable evaluator, missing-data review state, shortlist and report snapshots | Conversation requirement: select a student, analyze eligibility, shortlist universities and export a receipt-style report. |
| Document system | Object storage, metadata, versioning, requests, review state, portal access control and audit | Conversation requirement: employee upload + student portal, email-only/link-only/email+link, permissions, expiry, revoke and replace. |
| Admin audit | Append-only audit log and activity queries | Admin has Audit Center; material actions must be traceable. |

> **Data migration warning:** The supplied Status_S27 worksheet contains #VALUE! cells in calculated counts. Do not import those summary cells as authoritative metrics. Rebuild dashboard metrics from normalized student, lead, application and status-history records.

# 3. Recommended Technology Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | Stable TypeScript backend runtime. Node 24.11+ entered LTS and is maintained into 2028. |
| API framework | NestJS + Fastify adapter | Strong module/controller/provider boundaries and good fit for a maintainable modular monolith. |
| ORM | Prisma ORM 7 | Type-safe database access and migrations; use the stable 7 line for production rather than the Prisma 8 release candidate. |
| Database | PostgreSQL 18 | Primary transactional database, relational integrity, JSONB for raw import payloads / rule metadata, full-text and trigram search where useful. |
| Cache / queue | Redis + BullMQ | Caching, rate limiting, OTP/session helpers and background jobs. BullMQ is Redis-backed. |
| Object storage | Amazon S3 private bucket | Document binaries and report files. Use presigned upload/download URLs after backend authorization. |
| Email | Amazon SES | Portal invitations, OTPs, document requests, notifications and system email. |
| Document scan | ClamAV in isolated worker | Malware scanning before a newly uploaded object becomes downloadable. |
| PDF/report | Playwright/Chromium + HTML templates | Stable A4 report generation for eligibility reports, shortlist receipts and portal instructions. |
| Auth | First-party session auth with Argon2id + TOTP | HTTP-only secure cookies for internal users; portal tokens are separate opaque access credentials. |
| Observability | OpenTelemetry + structured logs + metrics | Traces, metrics and logs with request/correlation IDs. |
| Infra | AWS ECS Fargate + RDS PostgreSQL + ElastiCache + S3 + ALB | Managed production runtime; use Cloudflare WAF at the edge. |
| CI/CD | GitHub Actions + ECR + Terraform | Automated build, security checks, migrations, deploy and infrastructure changes. |

> **Current version note:** As of 28 Sep 2026, Node.js 24.21.0 is an LTS line; PostgreSQL 18.6 is the current PostgreSQL major/minor line. Prisma 7 remains the supported stable production line while Prisma 8 is documented as a release candidate. Version pinning should still be handled through a lockfile and a controlled upgrade policy.

# 4. System Context and Runtime Topology

## 4.1 Request flow
1. Browser requests app.meridian.example through Cloudflare WAF.
2. Next.js serves UI and proxies /api paths to the NestJS service through the internal load balancer.
3. NestJS authenticates the session and runs route guards plus policy checks.
4. Domain services execute transactions in PostgreSQL and use Redis only for cache/ephemeral state.
5. Large binary operations use presigned S3 URLs; the API remains the authorization authority.
6. Long-running tasks are enqueued to BullMQ and handled by worker processes.
7. Every material mutation publishes an outbox event in the same transaction; a dispatcher delivers it to Redis/BullMQ consumers.

## 4.2 Deployment topology
- Public edge: Cloudflare WAF/CDN -> AWS ALB.
- Web tier: Next.js deployment, preferably on Vercel or as an AWS service depending on organizational standard.
- API tier: 2+ ECS Fargate tasks behind ALB, horizontally scalable.
- Worker tier: separate ECS Fargate service with independent autoscaling on queue depth.
- Database: RDS PostgreSQL 18 Multi-AZ with automated backups and point-in-time recovery.
- Cache/queue: ElastiCache Redis with replication and failover.
- Files: S3 private bucket with versioning, lifecycle rules and object lock only where required.
- Secrets: AWS Secrets Manager + KMS; never commit credentials.

# 5. Backend Module Architecture
> Figure 2. Modular backend boundaries

| Module | Responsibility |
| --- | --- |
| AuthModule | Sessions, passwords, MFA, OTP, login security, session revocation. |
| UsersModule | Users, roles, permissions, employee profile and deactivation. |
| StudentsModule | Student aggregate, profile fields, academic fields, country-specific data, lifecycle. |
| LeadsModule | Lead source, Direct/B2B, ownership and reassignment. |
| ApplicationsModule | University application records, application status and timeline. |
| PaymentsModule | Processing fee, initial payment, remaining payment, discounts, payment transactions. |
| UniversitiesModule | University programs, requirements, intakes, application channels, fees and deadlines. |
| EligibilityModule | Requirement evaluator, runs, explainability, missing-data logic and snapshots. |
| ShortlistsModule | Student shortlists and ordered program selections. |
| DocumentsModule | Requirements, files, versions, requests, reviews and notes. |
| PortalsModule | Student portal token lifecycle, access method, permissions and sessions. |
| NotificationsModule | Email/in-app notifications and delivery state. |
| AuditModule | Append-only audit events, actor context, diff payloads and access logs. |
| ReportsModule | Eligibility reports, exports, A4 PDF generation and stored snapshots. |
| ImportsModule | Excel/CSV staging, mapping, normalization, validation, dedupe and commit. |
| SearchModule | Cross-entity search and filter abstraction. |
| SettingsModule | Reference data, countries, branches, intake definitions and configurable document rules. |

## Module coding rule
```text
src/
  modules/
    students/
      students.controller.ts
      students.service.ts
      students.repository.ts
      students.policy.ts
      dto/
      events/
      tests/
    documents/
    portals/
    eligibility/
    universities/
    applications/
    payments/
    audit/
  common/
    auth/
    db/
    storage/
    queue/
    events/
    logging/
    errors/
  workers/
    document-scan.worker.ts
    email.worker.ts
    report.worker.ts
    import.worker.ts
```

# 6. Identity, Authentication and Authorization

## 6.1 Internal user authentication
- Users are Employee or Admin in v1, with role-based permissions stored in the database.
- Passwords are hashed with Argon2id. Password reset uses short-lived, single-use tokens.
- Internal sessions use opaque random session IDs in Secure, HttpOnly cookies. Store only a hash of the session identifier server-side.
- Session rotation occurs after login, password reset and privilege changes.
- Admin accounts require TOTP MFA in production.
- Apply login throttling, IP/device heuristics, failed-attempt counters and temporary lockouts.
- Use origin validation and CSRF protection for cookie-authenticated state-changing requests.

## 6.2 Authorization
- RBAC decides broad capability: Admin vs Employee.
- Object-level policies decide which specific student, payment, document or portal a user may access.
- Employees should generally access students assigned to them; an explicit organization policy can permit
shared visibility.
- Financial mutations, credential reads, document deletion and portal configuration should be separate permissions.
- Student portal access is token-based and independent of internal RBAC.

| Permission | Typical role | Policy note |
| --- | --- | --- |
| student:read | Employee/Admin | Assigned students by default |
| student:update | Employee/Admin | Within scope |
| payment:update | Admin or explicitly delegated | High audit level |
| document:verify | Employee/Admin | Creates audit event |
| portal:configure | Employee/Admin | Creates audit event |
| audit:read | Admin | Admin only |
| credential:read | Restricted | Separate sensitive permission |
| university:manage | Admin | Employee read by default |

# 7. Core Domain Model and Database Architecture
Use PostgreSQL 18 as the transactional source of truth. Keep normalized core entities in relational tables.
Use JSONB only for flexible source payloads, requirement expressions and immutable snapshots. Do not use JSONB as a substitute for core relational integrity.

## 7.1 Core tables

| Table | Purpose |
| --- | --- |
| organizations | Tenant/company boundary for future multi-organization support. |
| users | Internal accounts including admins/employees. |
| roles | Role definitions. |
| permissions | Fine-grained capabilities. |
| user_roles | User-to-role assignment. |
| students | Primary student identity and lifecycle. |
| student_academics | CGPA, IELTS, TOEFL, Duolingo, German grade, GRE, German language. |
| student_country_details | Country-specific attributes such as APS / Uni-Assist workflow fields. |
| student_account_secrets | Encrypted sensitive credentials; strict permission boundary. |
| leads | Lead metadata and source. |
| student_assignments | Employee ownership/assignment history. |
| applications | Student-to-university-program application records. |
| application_status_history | Append-only lifecycle transitions. |
| payments | Fee totals, discount and current balance. |
| payment_transactions | Individual money movements. |
| universities | Institution master records. |
| university_programs | Course/program records with branch and campus context. |
| university_requirements | Versioned eligibility requirement records. |
| university_intakes | Program intake windows and deadlines. |
| import_batches | Each source workbook import. |
| import_rows | Raw staging records before normalization. |
| document_categories | Identity, Academic, Language, etc. |
| document_types | Passport, Transcript, SOP, etc. |
| document_requirements | Student-specific requested documents. |
| student_documents | Current logical document record. |
| document_versions | Immutable versions and S3 object metadata. |
| document_reviews | Verification/rejection/replacement records. |
| document_requests | Requests sent to student. |
| student_portals | Portal configuration and token status. |
| portal_sessions | Short-lived student portal sessions. |
| portal_access_logs | Student portal access history. |
| eligibility_runs | A run against a student profile version and rule set. |
| eligibility_results | Program-level rule outcomes and explanations. |
| shortlists | Student shortlist header. |
| shortlist_items | Ordered shortlist programs. |
| reports | Generated report metadata and S3 location. |
| notifications | In-app notification records. |
| notification_deliveries | Email/send provider delivery state. |
| audit_events | Append-only audit trail. |
| export_jobs | Async CSV/PDF export jobs. |
| outbox_events | Transactional outbox for domain events. |

## 7.2 Student aggregate
```text
students
- id UUID PK
- student_code VARCHAR UNIQUE NOT NULL
- intake_id FK
- country_code FK
- full_name
- phone_primary
- phone_secondary
- branch_id FK
- college_university
- lead_id FK NULL
- current_status_id FK
- assigned_employee_id FK
- profile_version BIGINT NOT NULL DEFAULT 1
- created_at / updated_at / deleted_at

student_academics
- student_id PK/FK
- cgpa NUMERIC(4,2)
- ielts NUMERIC(3,1)
- toefl INTEGER
- duolingo INTEGER
- german_grade NUMERIC(3,1)
- gre_score VARCHAR
- german_language VARCHAR
- updated_at
```

## 7.3 Sensitive data boundary
**Do not store plaintext credentials**
The project scope includes Gmail, APS and Uni-Assist credentials. Store secrets separately from the general student table, encrypted with a data-encryption key protected by KMS. Retrieval must require a dedicated permission and should itself create an audit event. Never return these values in general student list APIs.

# 8. Student Lifecycle and Employee Workflow
The backend should support both draft and active student records. The UI workflow may be multi-step, but the API should expose atomic domain operations rather than a single huge save endpoint.
8. Create draft student and allocate student code using intake-specific sequence rules.
9. Persist personal information and increment profile_version on meaningful changes.
10. Save academic profile and country-specific details.
11. Save application ownership, lead type and status.
12. Save payment information and create transactions for actual money movements.
13. Create document requirements and optional portal configuration.
14. Commit final student activation in a transaction.
15. Emit StudentCreated or StudentUpdated outbox events and audit records.

## Student ID generation
```text
Sequence key = intake_code + year + optional organization
Example:
W26 -> W26_001
S26 -> S26_001
JAN -> JAN_001
```
Use a database-backed sequence table with SELECT ... FOR UPDATE or PostgreSQL sequences so concurrent employee creation cannot produce duplicate IDs.

# 9. Leads, Applications and Status History
Model application status as a state machine with history rather than a single mutable label. The current status is a projection/cache of the latest approved transition.

```text
application_status_history
- id UUID PK
- application_id FK
- from_status
- to_status
- changed_by_user_id
- reason
- metadata JSONB
- created_at
Example transition:
Applications Started -> Offered
```
- Lead types: Direct and B2B.
- For B2B, store the B2B organization as a first-class field rather than embedding it in notes.
- Every status transition validates the state machine and creates an audit event.
- Dashboard counts query applications/status history or materialized projections rather than importing spreadsheet formulas.
- Allow employee reassignment while preserving assignment history.

# 10. Payments and Financial Controls
Payments should separate the current financial summary from transaction history. The summary supports dashboard display; transactions explain how the balance was reached.

```text
payments
- student_id PK/FK
- total_processing_fee_minor
- discount_minor
- initial_payment_minor
- remaining_payment_minor
- currency
- status
- version
- updated_at

payment_transactions
- id UUID PK
- student_id FK
- payment_id FK
- amount_minor
- currency
- type (initial / installment / refund / adjustment)
- reference
- recorded_by_user_id
- created_at
```

- Prefer integer minor units for money, e.g. paise/cents, plus ISO currency.
- Recalculate remaining balance server-side inside a transaction.
- Never allow the client to be the authoritative calculator.
- Payment edits should have higher audit severity and may require Admin or delegated permission.
- Exports should include transaction references, not just current totals.

# 11. University Database and Excel Import Architecture
The supplied Universities workbook contains multiple sheets with differing columns. The production backend should not mirror those sheets directly. Instead, import into a staging layer and normalize into
University -> Program -> Requirement -> Intake structures.

| Stage | Backend behavior |
| --- | --- |
| Source intake | Accept XLSX/CSV upload, create import_batch, checksum source file, record uploader. |
| Staging | Store each row as JSONB plus source sheet, row number and raw values. |
| Mapping | Select a mapping profile based on sheet structure, e.g. Main/Private Unis/Pharmacy. |
| Normalization | Clean branch labels, intake values, score types, fees, dates and boolean values. |
| Validation | Run required-field, range, duplicate and referential checks. |
| Deduplication | Match university + program + intake + branch using deterministic and fuzzy keys. |
| Review | Show import errors/warnings and allow admin to resolve or skip rows. |
| Commit | Upsert approved rows in a transaction or chunked transactions. |
| Publish | Increment university/program requirement versions so future eligibility runs know which rule version was used. |
- University workbook sheets observed: Main, Copy of Main, Private Unis, Studienkolleg, Pharmacy and Copy of Copy of Sheet1.
- The primary university schema includes university, course, branch, intake, IELTS, TOEFL, German language, GRE, German grade, application route, application fee, document courier, aptitude test, deadlines, tuition, MOI-based and other requirements.
- Private-university sheets have a different structure, including campus, duration, tuition and scholarship fields.
- Keep source_sheet, source_row and raw_payload for traceability.

# 12. Student Eligibility Matching Engine
> Figure 3. Explainable eligibility evaluation flow
The requested feature lets an employee select a student and compare the student profile against university requirements. The backend should treat this as an explainable rule evaluation system, not an admission-prediction model. The output should be Eligible, Review or Not Eligible based on configured requirements and available data.

| Rule type | Behavior |
| --- | --- |
| Exact / categorical | Country, intake, branch compatibility. |
| Minimum threshold | IELTS >= threshold, TOEFL >= threshold, CGPA >= threshold. |
| Maximum/better-is-lower | German grade <= threshold where configured. |
| OR groups | IELTS OR TOEFL. |
| AND groups | CGPA AND IELTS AND language. |
| Optional requirement | Does not block eligibility if absent. |
| Missing required data | Return Review, not Not Eligible, when the evaluator cannot verify the rule. |
| Text/complex requirement | Return Review unless a configured structured predicate exists. |
| Requirement versioning | Store requirement_version_id in every eligibility result. |

```text
eligibility_runs
- id UUID
- student_id
- student_profile_version
- rule_set_version
- analyzed_program_count
- eligible_count
- review_count
- not_eligible_count
- created_by_user_id
- created_at

eligibility_results
- run_id
- university_program_id
- result ENUM(eligible, review, not_eligible)
- matched_count
- total_applicable_count
- checks JSONB
- requirement_snapshot JSONB
- created_at
```

## Important wording
The backend must not expose a probability of getting a seat. The requested product behavior is a requirement-match aid. Reports should explicitly say that meeting configured requirements does not guarantee admission or
a seat.

# 13. Document Management Architecture
> Figure 4. Document upload and review flow

Never store document binaries in PostgreSQL. Store metadata and immutable versions in PostgreSQL and binary objects in private S3. The API remains the authorization authority and returns short-lived presigned URLs only after authorization.

| Stage | Backend behavior |
| --- | --- |
| Create logical document | Create document and version metadata with a pending state. |
| Create upload session | Authorize actor and issue an object key scoped to organization/student/document/version. |
| Presigned upload | Return short-lived PUT or multipart authorization. |
| Complete upload | Verify expected metadata, size and checksum. |
| Quarantine | Mark version uploaded_pending_scan; keep object private. |
| Scan worker | Run malware scanning and metadata extraction in an isolated worker. |
| Accept or quarantine | Safe -> under_review. Unsafe -> quarantined and inaccessible. |
| Review | Employee/admin verifies or rejects; replacement can be requested. |
| Versioning | Every replacement creates an immutable version while retaining history. |

Document tables
- document_categories: Identity, Academic, Language, Financial, Application, University, Visa, Other.
- document_types: configurable master data such as Passport, Transcript, SOP, LOR, etc.
- document_requirements: student-specific requests, required/optional flag, priority, due date, student instruction and university linkage.
- student_documents: logical document record pointing to the current version.
- document_versions: immutable version, object key, content type, byte size, checksum, scan result and timestamps.
- document_reviews: verify/reject/request-replacement history.
- document_access_events: sensitive view/download access where needed.

# 14. Student Upload Portal and Controlled Sharing
The Student Upload Portal is a separate security boundary. The token identifies exactly one student portal and never grants access to internal CRM objects outside the configured document scope.

| Mode | Enforcement |
| --- | --- |
| email_only | Student enters configured email and verifies an OTP before a portal session is created. |
| link_only | Valid opaque token is sufficient; token is long, random, revocable and rate-limited. |
| email_and_link | Valid token plus matching verified email/OTP is required. |

```text
student_portals
- id UUID
- student_id FK
- token_hash BYTEA UNIQUE
- access_method ENUM
- email_ciphertext NULL
- status active/revoked/expired
- expires_at NULL
- permissions JSONB
- created_by_user_id
- created_at / revoked_at / last_accessed_at

portal_sessions
- id UUID
- portal_id FK
- session_hash
- expires_at
- verified_email NULL
- created_at / last_seen_at
```

- Generate at least 256 bits of random token entropy; persist only a hash.
- Portal links must be checked for status and expiry on every request.
- Portal permissions are enforced server-side: view, upload, replace, delete, download.
- Delete=false by default. Portal configuration cannot bypass document-level requirements.
- For document download, authorize first then issue a short-lived S3 GET URL.
- For student upload, create a narrow upload session and object key tied to the document requirement.
- Rate-limit token attempts and OTP verification.
- Never expose internal employee/admin endpoints to the student portal session.

# 15. Notifications and Communication
- Portal created or regenerated -> email notification to student when configured.
- Document requested -> student notification with document name, instruction and due date.
- Student upload received -> assigned employee notification.
- Document rejected or replacement requested -> student notification.
- Portal nearing expiry -> optional reminder.
- Offer/status/payment events -> internal notification rules.
- All outbound emails should be asynchronous and idempotent with provider message IDs.

# 16. Audit, Activity and Compliance Trail
```text
audit_events
- id UUID PK
- organization_id
- actor_user_id NULL
- actor_type admin | employee | student | system
- action
- module
- entity_type
- entity_id
- request_id
- correlation_id
- ip_address
- user_agent
- before_json NULL
- after_json NULL
- metadata_json
- severity info | success | warning | critical
- created_at
```

- Write the audit record in the same transaction as the mutation whenever possible.
- Use before/after diffs for non-secret fields. Never log plaintext credentials or session tokens.
- Log sensitive document reads/downloads and secret retrievals separately from generic activity where useful.
- Protect audit tables from ordinary update/delete privileges.
- Provide Admin filters for actor, role, module, action, date, severity and entity.

# 17. Search, Filtering, Exports and Reports
- Use PostgreSQL indexes plus pg_trgm/full-text search for student names, IDs, universities and document names.
- Use cursor pagination for large student, document, university and audit collections.
- Export CSV/PDF jobs asynchronously to avoid blocking API requests.
- Store report snapshots so a later download reproduces the original report even if live data changes.
- Eligibility report snapshot should contain student profile version, requirement versions, result explanations and selected shortlist order.
- Generate A4 PDFs from HTML templates in a worker and store the PDF object privately in S3.

# 18. API Contract and Endpoint Inventory
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/mfa/verify
- POST /api/v1/auth/password/forgot
- POST /api/v1/auth/password/reset
### Users / Admin
- GET /api/v1/users
- POST /api/v1/users
- PATCH /api/v1/users/:id
- POST /api/v1/users/:id/disable
- GET /api/v1/roles
- GET /api/v1/permissions
### Students
- GET /api/v1/students
- POST /api/v1/students
- GET /api/v1/students/:id
- PATCH /api/v1/students/:id
- POST /api/v1/students/:id/assign
- GET /api/v1/students/:id/activity
### Leads
- GET /api/v1/leads
- POST /api/v1/leads
- PATCH /api/v1/leads/:id
- POST /api/v1/leads/:id/reassign
### Applications
- GET /api/v1/applications
- POST /api/v1/applications
- PATCH /api/v1/applications/:id
- POST /api/v1/applications/:id/status
- GET /api/v1/applications/:id/history
### Payments
- GET /api/v1/students/:id/payment
- PATCH /api/v1/students/:id/payment
- POST /api/v1/students/:id/payment/transactions
- GET /api/v1/payments
### Universities
- GET /api/v1/universities
- GET /api/v1/universities/:id
- POST /api/v1/universities
- PATCH /api/v1/universities/:id
- POST /api/v1/university-imports
- GET /api/v1/university-imports/:id
### Eligibility
- POST /api/v1/students/:id/eligibility/runs
- GET /api/v1/eligibility/runs/:id
- GET /api/v1/eligibility/runs/:id/results
- POST /api/v1/students/:id/shortlists
- GET /api/v1/students/:id/shortlist
- POST /api/v1/students/:id/eligibility-report
### Documents
- GET /api/v1/students/:id/documents
- POST /api/v1/students/:id/documents
- POST /api/v1/documents/upload-sessions
- POST /api/v1/documents/:id/complete-upload
- GET /api/v1/documents/:id
- POST /api/v1/documents/:id/verify
- POST /api/v1/documents/:id/reject
- POST /api/v1/documents/:id/request-replacement
- POST /api/v1/documents/:id/replace
- GET /api/v1/documents/:id/versions

### Portals
- POST /api/v1/students/:id/portal
- GET /api/v1/students/:id/portal
- PATCH /api/v1/portals/:id
- POST /api/v1/portals/:id/revoke
- POST /api/v1/portals/:id/regenerate
- POST /api/v1/portals/:id/send-email
- GET /api/v1/portals/:id/activity
### Public Student Portal
- GET /api/v1/public/portals/:token
- POST /api/v1/public/portals/:token/session
- GET /api/v1/public/portal/session/documents
- POST /api/v1/public/portal/session/documents/:requirementId/upload-session
- POST /api/v1/public/portal/session/documents/:id/complete
- POST /api/v1/public/portal/session/documents/:id/replace
### Audit
- GET /api/v1/audit
- GET /api/v1/audit/:id
- GET /api/v1/audit/export
### Reports / Exports
- POST /api/v1/exports
- GET /api/v1/exports/:id
- GET /api/v1/reports/:id
- GET /api/v1/reports/:id/download
### Health
- GET /health/live
- GET /health/ready
- GET /metrics

## API standards
Use /v1 versioning, DTO validation, consistent error envelopes, OpenAPI, request/correlation IDs, idempotency keys for retry-prone writes, cursor pagination and strict timeouts.

# 19. Events, Queues and Background Jobs
1. Begin transaction.
2. Change domain state.
3. Insert audit event.
4. Insert outbox event.
5. Commit.
6. Claim unpublished event.
7. Publish to BullMQ.
8. Mark published.
9. Process idempotently.
10. Retry with backoff.
11. Move exhausted jobs to dead-letter state.

| Queue | Jobs |
| --- | --- |
| documents | virus scan, preview, metadata extraction, cleanup |
| email | OTP, invite, request, reminder |
| reports | eligibility report, PDF export, CSV export |
| imports | parse, normalize, validate, dedupe, commit |
| maintenance | expire portals, session cleanup, orphan object cleanup |

# 20. Security Architecture

| Control | Rule |
| --- | --- |
| Transport | TLS, HSTS, Secure/HttpOnly cookies, trusted origins. |
| Auth | Argon2id, MFA for Admin, session rotation, revocation. |
| Authorization | RBAC + object-level policy + portal permissions. |
| Secrets | KMS-protected encryption and Secrets Manager; no secrets in source control. |
| Sensitive student fields | Separate table, encrypted fields, restricted read permission and audit on retrieval. |
| Documents | Private S3, short presigned URLs, upload validation, malware scan. |
| Portal tokens | Opaque, high-entropy, hashed at rest, expiry and revocation. |
| Rate limiting | IP + account + portal token based limits in Redis. |
| Validation | Strict DTO schemas, allow-lists, safe filenames and content metadata. |
| Logging | Structured logs with secret/PII filtering. |
| Audit | Append-only events, before/after diff without secrets, restricted database privileges. |
| Deletion | Soft-delete where auditability is needed; object retention policy for files. |

## Sensitive credential note
The project scope includes Gmail, APS and Uni-Assist credentials. The safer production posture is to avoid storing third-party passwords unless operationally required. If retained, isolate them in a dedicated secret boundary, encrypt at the application layer, minimize retrieval, and audit every access.

# 21. Observability, Reliability and Disaster Recovery
- Use OpenTelemetry for traces, metrics and logs; propagate request_id/correlation_id across API and worker jobs.
- Monitor API p95/p99 latency, error rate, DB pool utilization, Redis health, queue depth/retries, scan failures, email failures and S3 errors.
- Monitor business metrics: student registrations, active applications, offers, visas, pending payments, pending documents and portal uploads.
- Use RDS automated backups and point-in-time recovery; test restores regularly.
- Use S3 versioning where appropriate and lifecycle policies for old report/document versions.
- Define RPO/RTO explicitly with the business before production; suggested targets are RPO <= 15 min and RTO <= 1 hr for the core platform.

# 22. Deployment Architecture and CI/CD
- Cloudflare WAF at the edge -> AWS ALB -> Next.js and NestJS services.
- ECS Fargate runs the API with at least two tasks for production availability.
- A separate ECS worker service scales by queue depth.
- RDS PostgreSQL 18 provides primary storage; ElastiCache Redis provides cache/queues.
- S3 stores private documents and generated reports.
- Amazon SES handles email; CloudWatch/OpenTelemetry pipeline handles operational telemetry.
- GitHub Actions runs lint, typecheck, tests, security scan, image build, migration checks and deployment.
- Terraform manages infrastructure; environments: dev, staging, production.
- Use immutable container image tags from git SHA and maintain rollback versions.

# 23. Performance and Scaling
- Index filters by organization_id, status, employee_id, country, intake, branch, deadline and updated_at.
- Use keyset/cursor pagination for large tables.
- Cache reference data and frequently accessed university program metadata.
- Cache eligibility results by student profile version + requirement version; invalidate on changes.
- Run large eligibility scans, Excel imports and PDF generation asynchronously.
- Use S3 multipart upload for large files and verify checksums.
- Scale workers independently from the web/API layer.
- Introduce read replicas or a search service only when measured load justifies them.

# 24. Testing Strategy

| Test layer | Critical cases |
| --- | --- |
| Unit | Eligibility comparators, grade direction, payment balance, state transitions, policies. |
| Integration | PostgreSQL transactions, repositories, outbox, S3 signing, portal authorization. |
| Security | IDOR, RBAC bypass, token replay, brute force, CSRF, malicious upload, content-type spoofing. |
| Workflow | Student creation -> document request -> portal upload -> review -> report. |
| Import | Every source sheet structure, duplicates, malformed rows, date/score normalization. |
| Load | Students, universities, audit filters, upload sessions and concurrent ID generation. |
| DR | Database restore, queue retry, dead-letter recovery and orphan cleanup. |

# 25. Repository Structure
```text
meridian/
  apps/
    web/ # existing Next.js frontend
    api/ # NestJS + Fastify backend
    worker/ # background jobs
  packages/
    db/ # Prisma schema + migrations
    contracts/ # DTOs + OpenAPI/event contracts
    domain/ # pure domain rules
    config/ # env/config validation
    observability/ # telemetry
  infra/
    terraform/
    docker/
  docs/
    architecture/
    api/
    runbooks/
  tests/
    fixtures/
      students/
      universities/
      imports/
      documents/
```

# 26. Implementation Phases and Acceptance Criteria

| Phase | Scope |
| --- | --- |
| 0 - Foundation | Monorepo, NestJS, PostgreSQL, Prisma, Redis, sessions, config, logging, CI/CD. |
| 1 - Students and Employees | Student CRUD, intake IDs, roles, employee assignment, audit foundation. |
| 2 - Leads / Applications / Payments | Lead types, state machine, applications, payment transactions and dashboard queries. |
| 3 - Universities / Imports | Normalized university model, search/filter APIs, Excel staging/import/review. |
| 4 - Eligibility / Shortlist | Rule engine, explainability, run snapshots, shortlist and report data. |
| 5 - Documents | S3, upload sessions, scan worker, versions, request/review workflow. |
| 6 - Student Portal | Tokens, access modes, OTP, permissions, expiry, revoke, public portal APIs. |
| 7 - Notifications / Reports | Email, A4 PDF reports, exports and instruction sheets. |
| 8 - Hardening | Security testing, load testing, observability, backup/restore drill and penetration remediation. |

## Acceptance criteria
- Employee access is restricted by policy and object scope.
- Every material mutation produces an audit event.
- Dashboard metrics are derived from normalized records, not spreadsheet formulas.
- Eligibility is reproducible from stored profile and requirement versions.
- Documents are private and only accessible through authorized backend flows.
- Student portal cannot access internal CRM data outside its document scope.
- Uploaded documents are not released for review/download until scan processing succeeds.
- Document replacement preserves immutable history.
- Portal links can be expired and revoked immediately.
- Imports are staged, validated, deduplicated and reviewable.
- Backup restore is tested.
- All critical endpoints have unit/integration/security coverage.

# 27. Architecture Decisions, Risks and Open Items

| ID | Decision | Reason |
| --- | --- | --- |
| AD-01 | Modular monolith first | Lower operational complexity with strong module boundaries. |
| AD-02 | PostgreSQL source of truth | Consistent transactional model for student operations. |
| AD-03 | S3 for binaries | Scales document storage and supports signed access. |
| AD-04 | BullMQ workers | Offloads scanning, email, report and import workloads. |
| AD-05 | Versioned eligibility | Reproducible, explainable matching. |
| AD-06 | Separate portal security boundary | Prevents student self-service from exposing the internal CRM. |

## Key risks
- Sensitive student credentials are high-impact data; isolate, encrypt and minimize access.
- University requirements include free-text fields, so ambiguous conditions should become Review instead of false certainty.
- Source spreadsheets have inconsistent naming and formula issues; import normalization is required.
- Link-only portal sharing can be forwarded; use high-entropy tokens, expiry, revocation and rate limits.
- Large document collections require retention/lifecycle management.
- Premature microservices would increase operational overhead without immediate benefit for the current scale.

## Open items to finalize
- Exact employee access scope: assigned students only vs organization-wide.
- Whether credential storage is actually required and what approval is needed to read it.
- Definitive document master list and country/university-specific rules.
- Currency and tax rules for payments.
- Email sender/domain requirements.
- Data retention and deletion policy for documents, audit logs and portal sessions.
- Privacy/legal requirements applicable to student data.
- Final production SLOs and support/on-call expectations.

# 28. Final Backend Blueprint
The target system can be summarized as follows:
```text
        +----------------------+
        | Employee / Admin Web |
        | Next.js |
        +----------+-----------+
           |
        HTTPS / same-origin
           |
        +----------v-----------+
        | NestJS API + Fastify |
        | Modular Monolith |
        +--+----+----+----+----+
        | | | |
        PG18 Redis S3 SES
        | | |
        | BullMQ |
        | | |
        +--v----v----v----+
        | Worker Services |
        | Scan / Import |
        | Email / Reports |
        +------------------+
Student Upload Portal
Browser -> Public Portal API -> Portal Token/Session
   -> Document Scope Check -> Presigned S3 Upload
   -> Scan Worker -> Review -> Audit
```

## Recommended first production cut
Start with one NestJS API deployment plus one worker deployment. Keep all domain modules inside the same repository and database. Introduce separate services only after a measured need for independent scaling, deployment or security isolation.

# 29. Reference Notes
Current technology references were checked on 28 Sep 2026. The links below are the official sources used to validate framework/storage/runtime claims in this architecture.

| Reference | URL | Usage |
| --- | --- | --- |
| [1] Node.js current downloads | https://nodejs.org/en/download/current | Node 24.x is listed as LTS; the current page also lists Node 26 as Current. |
| [2] Next.js documentation | https://nextjs.org/docs | Current Next.js documentation and App Router reference. |
| [3] NestJS modules | https://docs.nestjs.com/modules | Module boundaries and provider encapsulation. |
| [4] NestJS techniques | https://docs.nestjs.com/techniques | Validation, logging, events, queues and file-storage related capabilities. |
| [5] Prisma PostgreSQL | https://www.prisma.io/docs/prisma-orm/quickstart/postgresql | PostgreSQL connectivity and migration workflow. |
| [6] PostgreSQL supported versions | https://www.postgresql.org/support/versioning/ | PostgreSQL 18 support and lifecycle. |
| [7] S3 presigned URLs | https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html | Time-limited signed upload/download access. |
| [8] S3 integrity | https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html | Checksum integrity validation. |
| [9] BullMQ | https://docs.bullmq.io/ | Redis-backed jobs, retries, priorities and workers. |
| [10] OpenTelemetry | https://opentelemetry.io/docs/ | Vendor-neutral traces, metrics and logs. |

## Source basis
Functional scope is grounded in the supplied Dashbaord data document, Universities List.xlsx, Dasboard.xlsx and the feature requirements developed throughout this conversation. The university workbook shows multiple differently structured sheets, while the dashboard workbook contains student/lead/payment data and summary formulas. The backend blueprint deliberately normalizes these inputs rather than copying spreadsheet structure into production.
