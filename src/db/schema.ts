import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * U.S. Trump Account (TA) — data model
 *
 * One `applications` row == one registered child account.
 * Money is always stored as whole U.S. cents (integer).
 */

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "verification_required"
  | "approved"
  | "funded"
  | "rejected";

export type DepositType =
  | "federal_seed"
  | "state_match"
  | "federal_supplement"
  | "parent_contribution"
  | "earnings";

export type DepositStatus = "scheduled" | "processing" | "posted" | "returned";

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  referenceNumber: varchar("reference_number", { length: 24 }).notNull().unique(),

  status: varchar("status", { length: 32 }).notNull().default("submitted"),
  statusMessage: text("status_message"),

  // ---- Parent / guardian -------------------------------------------------
  parentFullName: varchar("parent_full_name", { length: 160 }).notNull(),
  parentEmail: varchar("parent_email", { length: 200 }).notNull(),
  parentPhone: varchar("parent_phone", { length: 32 }).notNull(),
  parentDob: varchar("parent_dob", { length: 10 }).notNull(),
  parentSsnLast4: varchar("parent_ssn_last4", { length: 4 }).notNull(),
  parentRelationship: varchar("parent_relationship", { length: 32 }).notNull(),
  parentAddressLine1: varchar("parent_address_line1", { length: 200 }).notNull(),
  parentAddressLine2: varchar("parent_address_line2", { length: 200 }),
  parentCity: varchar("parent_city", { length: 100 }).notNull(),
  parentState: varchar("parent_state", { length: 2 }).notNull(),
  parentZip: varchar("parent_zip", { length: 10 }).notNull(),

  // ---- Child -------------------------------------------------------------
  childFirstName: varchar("child_first_name", { length: 80 }).notNull(),
  childMiddleName: varchar("child_middle_name", { length: 80 }),
  childLastName: varchar("child_last_name", { length: 80 }).notNull(),
  childDob: varchar("child_dob", { length: 10 }).notNull(),
  childGender: varchar("child_gender", { length: 24 }),
  childSsnLast4: varchar("child_ssn_last4", { length: 4 }).notNull(),
  childBirthCity: varchar("child_birth_city", { length: 100 }),
  childBirthState: varchar("child_birth_state", { length: 2 }),

  // ---- Program / account -------------------------------------------------
  participationTier: varchar("participation_tier", { length: 32 }).notNull(),
  autoEnrollment: boolean("auto_enrollment").notNull().default(false),
  accountType: varchar("account_type", { length: 32 }).notNull(),
  custodianBank: varchar("custodian_bank", { length: 160 }).notNull(),
  routingNumber: varchar("routing_number", { length: 9 }).notNull(),
  accountLast4: varchar("account_last4", { length: 4 }).notNull(),
  childAccountNumber: varchar("child_account_number", { length: 24 }),
  // Guardian account that owns this application (nullable for seeded/admin rows).
  guardianAccountId: integer("guardian_account_id").references(() => guardianAccounts.id, {
    onDelete: "set null",
  }),
  monthlyContribution: integer("monthly_contribution").notNull().default(0),

  federalSeedAmount: integer("federal_seed_amount").notNull().default(0),
  stateMatchAmount: integer("state_match_amount").notNull().default(0),
  annualSupplementAmount: integer("annual_supplement_amount").notNull().default(0),
  parentContributionAmount: integer("parent_contribution_amount").notNull().default(0),

  // ---- Verification ------------------------------------------------------
  verificationMethod: varchar("verification_method", { length: 48 }).notNull(),
  verificationStatus: varchar("verification_status", { length: 32 })
    .notNull()
    .default("not_started"),
  identityConsent: boolean("identity_consent").notNull().default(false),
  penaltyOfPerjury: boolean("penalty_of_perjury").notNull().default(false),
  electronicSignature: varchar("electronic_signature", { length: 160 }),

  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  depositType: varchar("deposit_type", { length: 32 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("scheduled"),
  description: text("description").notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("verification_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 160 }).notNull(),
  fileName: varchar("file_name", { length: 200 }).notNull(),
  fileSize: integer("file_size").notNull().default(0),
  mimeType: varchar("mime_type", { length: 120 }),
  reviewStatus: varchar("review_status", { length: 24 }).notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const statusEvents = pgTable("application_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 64 }).notNull(),
  detail: text("detail"),
  actor: varchar("actor", { length: 64 }).notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  topic: varchar("topic", { length: 64 }).notNull(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  state: varchar("state", { length: 2 }),
  referenceNumber: varchar("reference_number", { length: 24 }),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSignups = pgTable("newsletter_signups", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  state: varchar("state", { length: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guardianAccounts = pgTable("guardian_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});



/**
 * Key-value store for admin-editable site settings.
 * Each row is one setting identified by a unique key string.
 * Currently used for: contact_phone, contact_email, helpline_hours.
 */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
