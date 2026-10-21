import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, withRetry } from "@/db";
import {
  applications,
  deposits,
  documents,
  guardianAccounts,
  inquiries,
  newsletterSignups,
  siteSettings,
  statusEvents,
  type ApplicationStatus,
  type DepositType,
  type DepositStatus,
} from "@/db/schema";
import { ANNUAL_CONTRIBUTION_LIMIT_CENTS, MINIMUM_INITIAL_DEPOSIT_CENTS, quoteBenefits, tierForDob } from "./program";
import { getState, STATES } from "./states";

export type NewApplicationInput = {
  parentFullName: string;
  parentEmail: string;
  parentPhone: string;
  parentDob: string;
  parentSsnLast4: string;
  parentRelationship: string;
  parentAddressLine1: string;
  parentAddressLine2?: string;
  parentCity: string;
  parentState: string;
  parentZip: string;
  childFirstName: string;
  childMiddleName?: string;
  childLastName: string;
  childDob: string;
  childGender?: string;
  childSsnLast4: string;
  childBirthCity?: string;
  childBirthState?: string;
  accountType: string;
  custodianBank: string;
  routingNumber: string;
  accountLast4: string;
  monthlyContribution: number;
  verificationMethod: string;
  identityConsent: boolean;
  penaltyOfPerjury: boolean;
  electronicSignature: string;
  /** Guardian account that owns this application (set when submitted by a logged-in guardian). */
  guardianAccountId?: number;
};

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newReference(d = new Date()): string {
  let tail = "";
  for (let i = 0; i < 6; i += 1) {
    tail += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `CTF-${d.getFullYear()}-${tail}`;
}

function newAccountNumber(): string {
  let n = "";
  for (let i = 0; i < 10; i += 1) n += Math.floor(Math.random() * 10);
  return `CTF${n.slice(0, 5)}-${n.slice(5)}`;
}

export function validateApplication(input: Partial<NewApplicationInput>): {
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const req = (key: keyof NewApplicationInput, label: string) => {
    const v = input[key];
    if (v === undefined || v === null || String(v).trim() === "") {
      errors[key] = `${label} is required.`;
    }
  };

  req("parentFullName", "Parent or guardian full name");
  req("parentEmail", "Email address");
  req("parentPhone", "Phone number");
  req("parentDob", "Parent date of birth");
  req("parentRelationship", "Relationship to child");
  req("parentAddressLine1", "Street address");
  req("parentCity", "City");
  req("parentState", "State");
  req("parentZip", "ZIP code");
  req("childFirstName", "Child first name");
  req("childLastName", "Child last name");
  req("childDob", "Child date of birth");
  req("accountType", "Account type");
  req("custodianBank", "Custodian bank");
  req("verificationMethod", "Verification method");
  req("electronicSignature", "Electronic signature");

  if (input.parentEmail && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(input.parentEmail)) {
    errors.parentEmail = "Enter a valid email address.";
  }
  if (input.parentSsnLast4 && !/^\d{4}$/.test(input.parentSsnLast4)) {
    errors.parentSsnLast4 = "Enter the last 4 digits only.";
  }
  if (input.childSsnLast4 && !/^\d{4}$/.test(input.childSsnLast4)) {
    errors.childSsnLast4 = "Enter the child's SSN last 4 digits.";
  }
  if (input.parentZip && !/^\d{5}(-\d{4})?$/.test(input.parentZip)) {
    errors.parentZip = "Enter a valid 5-digit ZIP code.";
  }
  if (input.routingNumber && !/^\d{9}$/.test(input.routingNumber)) {
    errors.routingNumber = "A bank routing number is exactly 9 digits.";
  }
  if (input.accountLast4 && !/^\d{4}$/.test(input.accountLast4)) {
    errors.accountLast4 = "Enter the last 4 digits of the account.";
  }
  if (input.parentState && !getState(input.parentState)) {
    errors.parentState = "Select a valid state or territory.";
  }
  if (!input.identityConsent) {
    errors.identityConsent = "You must authorize the identity check.";
  }
  if (!input.penaltyOfPerjury) {
    errors.penaltyOfPerjury = "You must certify the information is true.";
  }
  if (
    input.electronicSignature &&
    input.parentFullName &&
    input.electronicSignature.trim().toLowerCase() !== input.parentFullName.trim().toLowerCase()
  ) {
    errors.electronicSignature = "Your electronic signature must match your full legal name.";
  }
  if (input.childDob && Number.isNaN(new Date(`${input.childDob}T00:00:00`).getTime())) {
    errors.childDob = "Enter a valid date of birth.";
  }

  if (
    typeof input.monthlyContribution === "number" &&
    input.monthlyContribution > 0 &&
    input.monthlyContribution < MINIMUM_INITIAL_DEPOSIT_CENTS
  ) {
    errors.monthlyContribution = "Initial deposit must be at least $1,500.00 per child.";
  }

  return { errors };
}

async function logEvent(
  applicationId: number,
  event: string,
  detail: string,
  actor = "system",
) {
  await db.insert(statusEvents).values({ applicationId, event, detail, actor });
}

export async function createApplication(input: NewApplicationInput) {
  const { errors } = validateApplication(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  const state = getState(input.parentState);
  const quote = quoteBenefits({
    dob: input.childDob,
    stateCode: input.parentState,
    guardianMonthlyCents: input.monthlyContribution * 100,
  });

  const reference = newReference();
  const needsDocuments = input.verificationMethod === "document_upload";

  const [row] = await db
    .insert(applications)
    .values({
      referenceNumber: reference,
      status: needsDocuments ? "verification_required" : "under_review",
      statusMessage: needsDocuments
        ? "Upload your photo ID and the child's certified birth certificate to continue."
        : "Identity proofing initiated. A benefits specialist will confirm within 2 business days.",
      parentFullName: input.parentFullName.trim(),
      parentEmail: input.parentEmail.trim().toLowerCase(),
      parentPhone: input.parentPhone.trim(),
      parentDob: input.parentDob,
      parentSsnLast4: input.parentSsnLast4 ?? "0000",
      parentRelationship: input.parentRelationship,
      parentAddressLine1: input.parentAddressLine1.trim(),
      parentAddressLine2: input.parentAddressLine2?.trim() || null,
      parentCity: input.parentCity.trim(),
      parentState: input.parentState.toUpperCase(),
      parentZip: input.parentZip.trim(),
      childFirstName: input.childFirstName.trim(),
      childMiddleName: input.childMiddleName?.trim() || null,
      childLastName: input.childLastName.trim(),
      childDob: input.childDob,
      childGender: input.childGender || null,
      childSsnLast4: input.childSsnLast4 ?? "0000",
      childBirthCity: input.childBirthCity?.trim() || null,
      childBirthState: input.childBirthState?.toUpperCase() || input.parentState.toUpperCase(),
      participationTier: quote.tier.tier,
      autoEnrollment: quote.tier.autoEnrollment,
      accountType: input.accountType,
      custodianBank: input.custodianBank.trim(),
      routingNumber: input.routingNumber,
      accountLast4: input.accountLast4,
      monthlyContribution: input.monthlyContribution * 100,
      federalSeedAmount: quote.tier.federalSeedCents,
      stateMatchAmount: quote.stateMatchCents,
      annualSupplementAmount: quote.tier.federalSupplementCents,
      parentContributionAmount: input.monthlyContribution * 100,
      verificationMethod: input.verificationMethod,
      verificationStatus: needsDocuments ? "awaiting_documents" : "in_progress",
      identityConsent: true,
      penaltyOfPerjury: true,
      electronicSignature: input.electronicSignature.trim(),
      guardianAccountId: input.guardianAccountId ?? null,
    })
    .returning();

  await logEvent(
    row.id,
    "application_submitted",
    `Application received from ${row.parentFullName} for ${row.childFirstName} ${row.childLastName} (born ${row.childDob}).`,
    "guardian",
  );
  await logEvent(
    row.id,
    "intake_check",
    `Federal intake validated the SSN record, ${state?.name ?? "state"} residency and custodian bank routing number.`,
    "system",
  );
  if (needsDocuments) {
    await logEvent(
      row.id,
      "documents_requested",
      "Guardian photo ID and certified birth certificate requested through the secure document portal.",
      "system",
    );
  } else {
    await logEvent(
      row.id,
      "verification_started",
      `Identity proofing started using ${input.verificationMethod.replace(/_/g, " ")}.`,
      "system",
    );
  }

  return {
    ok: true as const,
    reference: row.referenceNumber,
    status: row.status as ApplicationStatus,
    quote,
  };
}

export type DepositRow = typeof deposits.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type EventRow = typeof statusEvents.$inferSelect;

export type ApplicationDetail = {
  application: ApplicationRow;
  deposits: DepositRow[];
  documents: DocumentRow[];
  events: EventRow[];
  state: ReturnType<typeof getState>;
  balanceCents: number;
  scheduledCents: number;
  projectionAt18Cents: number;
};

export async function getApplicationDetail(
  reference: string,
  lastName?: string,
  guardianAccountId?: number,
): Promise<ApplicationDetail | null | { error: string }> {
  await ensureSeedData();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);

  if (!application) return null;
  if (
    lastName &&
    lastName.trim().toLowerCase() !== application.childLastName.toLowerCase()
  ) {
    return { error: "The last name does not match this reference number." };
  }
  // Guard: if a guardian account id is provided, verify the application belongs to them.
  if (
    guardianAccountId !== undefined &&
    application.guardianAccountId !== guardianAccountId
  ) {
    return null;
  }

  const [depRows, docRows, eventRows] = await Promise.all([
    db
      .select()
      .from(deposits)
      .where(eq(deposits.applicationId, application.id))
      .orderBy(desc(deposits.postedAt), desc(deposits.createdAt)),
    db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, application.id))
      .orderBy(desc(documents.uploadedAt)),
    db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, application.id))
      .orderBy(statusEvents.createdAt),
  ]);

  const balanceCents = depRows
    .filter((d) => d.status === "posted")
    .reduce((acc, d) => acc + d.amountCents, 0);
  const scheduledCents = depRows
    .filter((d) => d.status === "scheduled" || d.status === "processing")
    .reduce((acc, d) => acc + d.amountCents, 0);

  const projectionAt18Cents = quoteBenefits({
    dob: application.childDob,
    stateCode: application.parentState,
    guardianMonthlyCents: application.monthlyContribution,
  }).projectionAt18Cents;

  return {
    application,
    deposits: depRows,
    documents: docRows,
    events: eventRows,
    state: getState(application.parentState),
    balanceCents,
    scheduledCents,
    projectionAt18Cents,
  };
}

export async function addDocuments(
  reference: string,
  items: { docType: string; fileName: string; fileSize: number; mimeType?: string }[],
) {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!application) return { ok: false as const, error: "Application not found." };
  if (items.length === 0) return { ok: false as const, error: "Select at least one document." };

  await db.insert(documents).values(
    items.map((i) => ({
      applicationId: application.id,
      docType: i.docType,
      fileName: i.fileName,
      fileSize: i.fileSize,
      mimeType: i.mimeType ?? null,
      reviewStatus: "pending",
    })),
  );

  const [existing] = await db
    .select({ value: count() })
    .from(documents)
    .where(eq(documents.applicationId, application.id));

  await db
    .update(applications)
    .set({
      status: "under_review",
      verificationStatus: existing.value >= 2 ? "in_review" : "awaiting_documents",
      statusMessage:
        existing.value >= 2
          ? "Documents received. A verification specialist is reviewing your submission."
          : "Documents received. One more document is required to complete verification.",
      updatedAt: new Date(),
    })
    .where(eq(applications.id, application.id));

  await logEvent(
    application.id,
    "documents_uploaded",
    `${items.length} document(s) uploaded: ${items.map((i) => i.fileName).join(", ")}.`,
    "guardian",
  );

  return { ok: true as const, count: existing.value };
}

const STATUS_FLOW: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "funded",
];

/** Moves an application one step forward through the agency review pipeline. */
export async function advanceApplication(reference: string) {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!application) return { ok: false as const, error: "Application not found." };
  if (application.status === "funded") {
    return { ok: false as const, error: "This account is already funded." };
  }
  if (application.status === "verification_required") {
    return {
      ok: false as const,
      error: "Upload the requested verification documents before the review can continue.",
    };
  }

  const idx = STATUS_FLOW.indexOf(application.status as ApplicationStatus);
  const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
  const state = getState(application.parentState);

  if (next === "approved") {
    const acct = newAccountNumber();
    await db
      .update(applications)
      .set({
        status: "approved",
        verificationStatus: "verified",
        childAccountNumber: acct,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        statusMessage: `Identity verified. Custodial account ${acct} is being opened at ${application.custodianBank}.`,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, application.id));
    await logEvent(
      application.id,
      "identity_verified",
      `${application.parentFullName} passed identity proofing. ${state?.agency ?? "State treasury"} confirmed residency.`,
      "specialist",
    );
    await logEvent(
      application.id,
      "account_opened",
      `Custodial account ${acct} opened at ${application.custodianBank} ••••${application.accountLast4}.`,
      "system",
    );
    return { ok: true as const, status: "approved" as ApplicationStatus };
  }

  // next === "funded": post every scheduled deposit
  const now = new Date();
  const rows: (typeof deposits.$inferInsert)[] = [];

  if (application.autoEnrollment && application.federalSeedAmount > 0) {
    rows.push({
      applicationId: application.id,
      depositType: "federal_seed",
      amountCents: application.federalSeedAmount,
      status: "posted",
      description: "Federal Child Trust Fund seed deposit",
      source: "U.S. Department of the Treasury",
      postedAt: now,
      scheduledFor: now,
    });
  }
  if (application.autoEnrollment && application.stateMatchAmount > 0) {
    rows.push({
      applicationId: application.id,
      depositType: "state_match",
      amountCents: application.stateMatchAmount,
      status: "posted",
      description: `${state?.name ?? "State"} Child Trust Fund opening match`,
      source: state?.agency ?? "State Treasury Office",
      postedAt: new Date(now.getTime() + 3 * 864e5),
      scheduledFor: new Date(now.getTime() + 3 * 864e5),
    });
  }
  if (application.annualSupplementAmount > 0) {
    rows.push({
      applicationId: application.id,
      depositType: "federal_supplement",
      amountCents: application.annualSupplementAmount,
      status: "scheduled",
      description: "Federal birthday supplement (year 1)",
      source: "U.S. Department of the Treasury",
      scheduledFor: nextBirthday(application.childDob),
    });
  }
  if (application.monthlyContribution > 0) {
    rows.push({
      applicationId: application.id,
      depositType: "parent_contribution",
      amountCents: application.monthlyContribution,
      status: "posted",
      description: "Guardian recurring contribution — first installment",
      source: `${application.custodianBank} ••••${application.accountLast4}`,
      postedAt: now,
      scheduledFor: now,
    });
    rows.push({
      applicationId: application.id,
      depositType: "parent_contribution",
      amountCents: application.monthlyContribution,
      status: "scheduled",
      description: "Guardian recurring contribution — next installment",
      source: `${application.custodianBank} ••••${application.accountLast4}`,
      scheduledFor: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    });
  }

  if (rows.length > 0) await db.insert(deposits).values(rows);

  await db
    .update(applications)
    .set({
      status: "funded",
      verificationStatus: "verified",
      statusMessage: "All federal and state deposits have been wired to the child's account.",
      approvedAt: application.approvedAt ?? now,
      updatedAt: now,
    })
    .where(eq(applications.id, application.id));

  await logEvent(
    application.id,
    "funds_deposited",
    `${rows.filter((r) => r.status === "posted").length} deposit(s) posted to ${application.childAccountNumber ?? "the custodial account"}.`,
    "system",
  );

  return { ok: true as const, status: "funded" as ApplicationStatus };
}

function nextBirthday(dob: string): Date {
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), (m ?? 1) - 1, d ?? 1);
  if (next < now) next = new Date(now.getFullYear() + 1, (m ?? 1) - 1, d ?? 1);
  void y;
  return next;
}

export async function addGuardianDeposit(
  reference: string,
  amountCents: number,
  recurring: boolean,
) {
  if (!Number.isFinite(amountCents) || amountCents < MINIMUM_INITIAL_DEPOSIT_CENTS) {
    return { ok: false as const, error: "A minimum deposit of $1,500.00 is required per child." };
  }
  if (amountCents > ANNUAL_CONTRIBUTION_LIMIT_CENTS) {
    return {
      ok: false as const,
      error: `Contributions may not exceed $${(
        ANNUAL_CONTRIBUTION_LIMIT_CENTS / 100
      ).toLocaleString("en-US")} in a single program year.`,
    };
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!application) return { ok: false as const, error: "Application not found." };
  if (application.status !== "approved" && application.status !== "funded") {
    return {
      ok: false as const,
      error:
        "Contributions can only be made after the account has been verified and opened. Complete identity verification first.",
    };
  }

  const state = getState(application.parentState);
  const now = new Date();
  const matchCents = Math.min(
    Math.round((amountCents * (state?.contributionMatchPct ?? 0)) / 100),
    state?.contributionMatchCapCents ?? 0,
  );

  const rows: (typeof deposits.$inferInsert)[] = [
    {
      applicationId: application.id,
      depositType: "parent_contribution",
      amountCents,
      status: "posted",
      description: recurring
        ? "Guardian recurring contribution"
        : "Guardian one-time contribution",
      source: `${application.custodianBank} ••••${application.accountLast4}`,
      postedAt: now,
      scheduledFor: now,
    },
  ];
  if (matchCents > 0) {
    rows.push({
      applicationId: application.id,
      depositType: "state_match",
      amountCents: matchCents,
      status: "scheduled",
      description: `${state?.name ?? "State"} contribution match (${state?.contributionMatchPct ?? 0}%)`,
      source: state?.agency ?? "State Treasury Office",
      scheduledFor: new Date(now.getTime() + 5 * 864e5),
    });
  }
  await db.insert(deposits).values(rows);

  await db
    .update(applications)
    .set({
      status: "funded",
      monthlyContribution: recurring ? amountCents : application.monthlyContribution,
      parentContributionAmount: application.parentContributionAmount + amountCents,
      updatedAt: now,
    })
    .where(eq(applications.id, application.id));

  await logEvent(
    application.id,
    "contribution_posted",
    `Guardian contribution of $${(amountCents / 100).toFixed(2)} posted${
      matchCents > 0 ? `, with a $${(matchCents / 100).toFixed(2)} state match queued` : ""
    }.`,
    "guardian",
  );

  return { ok: true as const, matchCents };
}

export type ProgramStats = {
  totalApplications: number;
  fundedAccounts: number;
  pendingVerification: number;
  totalFederalCents: number;
  totalStateCents: number;
  totalGuardianCents: number;
  totalPostedCents: number;
  scheduledCents: number;
  participatingStates: number;
  byState: { code: string; name: string; applications: number; postedCents: number }[];
};

export async function getProgramStats(): Promise<ProgramStats> {
  await ensureSeedData();

  const [totals] = await db
    .select({
      totalApplications: count(applications.id),
      fundedAccounts: sql<number>`sum(case when ${applications.status} = 'funded' then 1 else 0 end)::int`,
      pendingVerification: sql<number>`sum(case when ${applications.status} = 'verification_required' then 1 else 0 end)::int`,
    })
    .from(applications);

  const [money] = await db
    .select({
      federal: sql<number>`coalesce(sum(case when ${deposits.depositType} = 'federal_seed' or ${deposits.depositType} = 'federal_supplement' then ${deposits.amountCents} else 0 end),0)::bigint`,
      stateMatch: sql<number>`coalesce(sum(case when ${deposits.depositType} = 'state_match' then ${deposits.amountCents} else 0 end),0)::bigint`,
      guardian: sql<number>`coalesce(sum(case when ${deposits.depositType} = 'parent_contribution' then ${deposits.amountCents} else 0 end),0)::bigint`,
      posted: sql<number>`coalesce(sum(case when ${deposits.status} = 'posted' then ${deposits.amountCents} else 0 end),0)::bigint`,
      scheduled: sql<number>`coalesce(sum(case when ${deposits.status} <> 'posted' then ${deposits.amountCents} else 0 end),0)::bigint`,
    })
    .from(deposits);

  const stateRows = await db
    .select({
      code: applications.parentState,
      applications: count(applications.id),
      postedCents: sql<number>`coalesce(sum(case when ${deposits.status} = 'posted' then ${deposits.amountCents} else 0 end),0)::bigint`,
    })
    .from(applications)
    .leftJoin(deposits, eq(deposits.applicationId, applications.id))
    .groupBy(applications.parentState)
    .orderBy(desc(sql`count(${applications.id})`));

  return {
    totalApplications: Number(totals?.totalApplications ?? 0),
    fundedAccounts: Number(totals?.fundedAccounts ?? 0),
    pendingVerification: Number(totals?.pendingVerification ?? 0),
    totalFederalCents: Number(money?.federal ?? 0),
    totalStateCents: Number(money?.stateMatch ?? 0),
    totalGuardianCents: Number(money?.guardian ?? 0),
    totalPostedCents: Number(money?.posted ?? 0),
    scheduledCents: Number(money?.scheduled ?? 0),
    participatingStates: STATES.filter((s) => s.participating).length,
    byState: stateRows.map((r) => ({
      code: r.code,
      name: getState(r.code)?.name ?? r.code,
      applications: Number(r.applications),
      postedCents: Number(r.postedCents),
    })),
  };
}

export async function getRecentApplications(limit = 6) {
  await ensureSeedData();
  const rows = await db
    .select({
      referenceNumber: applications.referenceNumber,
      childFirstName: applications.childFirstName,
      childLastName: applications.childLastName,
      parentState: applications.parentState,
      status: applications.status,
      autoEnrollment: applications.autoEnrollment,
      childDob: applications.childDob,
      submittedAt: applications.submittedAt,
    })
    .from(applications)
    .orderBy(desc(applications.submittedAt))
    .limit(limit);
  return rows;
}

export async function createInquiry(input: {
  topic: string;
  fullName: string;
  email: string;
  phone?: string;
  state?: string;
  referenceNumber?: string;
  message: string;
}) {
  if (!input.fullName.trim() || !input.email.trim() || !input.message.trim()) {
    return { ok: false as const, error: "Name, email and message are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(input.email)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  await db.insert(inquiries).values({
    topic: input.topic || "general",
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    state: input.state?.toUpperCase() || null,
    referenceNumber: input.referenceNumber?.trim().toUpperCase() || null,
    message: input.message.trim(),
  });
  return { ok: true as const };
}

export async function subscribeNewsletter(email: string, state?: string) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(clean)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  await db
    .insert(newsletterSignups)
    .values({ email: clean, state: state?.toUpperCase() || null })
    .onConflictDoNothing();
  return { ok: true as const };
}

/* ------------------------------------------------------------------ */
/* Guardian accounts (Option A authentication)                        */
/* ------------------------------------------------------------------ */

export async function createGuardianAccount(input: {
  email: string;
  fullName: string;
  passwordHash: string;
}): Promise<
  | { ok: true; guardian: { id: number; email: string; fullName: string } }
  | { ok: false; duplicate: true }
> {
  await ensureSeedData();
  const email = input.email.trim().toLowerCase();
  try {
    const [row] = await db
      .insert(guardianAccounts)
      .values({
        email,
        fullName: input.fullName.trim(),
        passwordHash: input.passwordHash,
      })
      .returning({
        id: guardianAccounts.id,
        email: guardianAccounts.email,
        fullName: guardianAccounts.fullName,
      });
    return { ok: true, guardian: { id: row.id, email: row.email, fullName: row.fullName } };
  } catch (err: unknown) {
    // pg unique-violation code 23505 — map to a duplicate sentinel (→ 409).
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, duplicate: true };
    }
    // Some drivers (e.g. Neon HTTP) wrap the pg error in a cause property; also
    // fall back to a string search for deep nesting.
    const errStr = String(err);
    if (errStr.includes("23505") || errStr.includes("duplicate key")) {
      return { ok: false, duplicate: true };
    }
    throw err;
  }
}

export async function getGuardianAccountByEmail(email: string) {
  await ensureSeedData();
  const [row] = await db
    .select()
    .from(guardianAccounts)
    .where(eq(guardianAccounts.email, email.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function getGuardianAccountById(id: number) {
  await ensureSeedData();
  const [row] = await db
    .select()
    .from(guardianAccounts)
    .where(eq(guardianAccounts.id, id))
    .limit(1);
  return row ?? null;
}

export async function getApplicationsByGuardianId(guardianAccountId: number) {
  await ensureSeedData();
  return db
    .select({
      referenceNumber: applications.referenceNumber,
      status: applications.status,
      childFirstName: applications.childFirstName,
      childLastName: applications.childLastName,
      childDob: applications.childDob,
      parentState: applications.parentState,
      submittedAt: applications.submittedAt,
      guardianAccountId: applications.guardianAccountId,
    })
    .from(applications)
    .where(eq(applications.guardianAccountId, guardianAccountId))
    .orderBy(desc(applications.submittedAt));
}

/**
 * Returns the posted balance for every application belonging to a guardian,
 * in a single SQL query (no N+1).
 */
export async function getBalancesByGuardianId(
  guardianId: number,
): Promise<{ referenceNumber: string; balanceCents: number }[]> {
  await ensureSeedData();
  const rows = await db
    .select({
      referenceNumber: applications.referenceNumber,
      balanceCents: sql<number>`coalesce(sum(case when ${deposits.status} = 'posted' then ${deposits.amountCents} else 0 end), 0)::bigint`,
    })
    .from(applications)
    .leftJoin(deposits, eq(deposits.applicationId, applications.id))
    .where(eq(applications.guardianAccountId, guardianId))
    .groupBy(applications.referenceNumber);
  return rows.map((r) => ({
    referenceNumber: r.referenceNumber,
    balanceCents: Number(r.balanceCents),
  }));
}

export async function linkApplicationToGuardian(
  reference: string,
  guardianAccountId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSeedData();
  const [row] = await db
    .select({ id: applications.id, currentOwner: applications.guardianAccountId })
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!row) return { ok: false, error: "Application not found." };
  if (row.currentOwner !== null) {
    return { ok: false, error: "Application already linked to a guardian account." };
  }
  await db
    .update(applications)
    .set({ guardianAccountId, updatedAt: new Date() })
    .where(eq(applications.id, row.id));
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Seed data so the program dashboards are populated on first visit.  */
/* ------------------------------------------------------------------ */

/**
 * Idempotent DDL so the program works against a freshly provisioned database
 * even before `drizzle-kit push` has been run.
 */
async function ensureSchema() {
  // The Neon HTTP driver does not support multiple statements in one execute()
  // call ("cannot insert multiple commands into a prepared statement"), so each
  // DDL statement is sent individually.
  await db.execute(sql`
    create table if not exists applications (
      id serial primary key,
      reference_number varchar(24) not null unique,
      status varchar(32) not null default 'submitted',
      status_message text,
      parent_full_name varchar(160) not null,
      parent_email varchar(200) not null,
      parent_phone varchar(32) not null,
      parent_dob varchar(10) not null,
      parent_ssn_last4 varchar(4) not null,
      parent_relationship varchar(32) not null,
      parent_address_line1 varchar(200) not null,
      parent_address_line2 varchar(200),
      parent_city varchar(100) not null,
      parent_state varchar(2) not null,
      parent_zip varchar(10) not null,
      child_first_name varchar(80) not null,
      child_middle_name varchar(80),
      child_last_name varchar(80) not null,
      child_dob varchar(10) not null,
      child_gender varchar(24),
      child_ssn_last4 varchar(4) not null,
      child_birth_city varchar(100),
      child_birth_state varchar(2),
      participation_tier varchar(32) not null,
      auto_enrollment boolean not null default false,
      account_type varchar(32) not null,
      custodian_bank varchar(160) not null,
      routing_number varchar(9) not null,
      account_last4 varchar(4) not null,
      child_account_number varchar(24),
      monthly_contribution integer not null default 0,
      federal_seed_amount integer not null default 0,
      state_match_amount integer not null default 0,
      annual_supplement_amount integer not null default 0,
      parent_contribution_amount integer not null default 0,
      verification_method varchar(48) not null,
      verification_status varchar(32) not null default 'not_started',
      identity_consent boolean not null default false,
      penalty_of_perjury boolean not null default false,
      electronic_signature varchar(160),
      submitted_at timestamptz not null default now(),
      reviewed_at timestamptz,
      approved_at timestamptz,
      updated_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists deposits (
      id serial primary key,
      application_id integer not null references applications(id) on delete cascade,
      deposit_type varchar(32) not null,
      amount_cents integer not null,
      status varchar(24) not null default 'scheduled',
      description text not null,
      source varchar(120) not null,
      scheduled_for timestamptz,
      posted_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists verification_documents (
      id serial primary key,
      application_id integer not null references applications(id) on delete cascade,
      doc_type varchar(160) not null,
      file_name varchar(200) not null,
      file_size integer not null default 0,
      mime_type varchar(120),
      review_status varchar(24) not null default 'pending',
      uploaded_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists application_events (
      id serial primary key,
      application_id integer not null references applications(id) on delete cascade,
      event varchar(64) not null,
      detail text,
      actor varchar(64) not null default 'system',
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists inquiries (
      id serial primary key,
      topic varchar(64) not null,
      full_name varchar(160) not null,
      email varchar(200) not null,
      phone varchar(32),
      state varchar(2),
      reference_number varchar(24),
      message text not null,
      handled boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists newsletter_signups (
      id serial primary key,
      email varchar(200) not null unique,
      state varchar(2),
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create index if not exists deposits_application_id_idx
      on deposits (application_id)
  `);
  await db.execute(sql`
    create index if not exists application_events_application_id_idx
      on application_events (application_id)
  `);
  await db.execute(sql`
    create index if not exists verification_documents_application_id_idx
      on verification_documents (application_id)
  `);
  await db.execute(sql`
    alter table verification_documents alter column doc_type type varchar(160)
  `);
  await db.execute(sql`
    create table if not exists guardian_accounts (
      id serial primary key,
      email text not null,
      full_name text not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create unique index if not exists guardian_accounts_email_key
      on guardian_accounts (email)
  `);
  await db.execute(sql`
    alter table applications add column if not exists guardian_account_id integer
      references guardian_accounts(id) on delete set null
  `);
  await db.execute(sql`
    create table if not exists site_settings (
      key varchar(64) primary key,
      value text not null,
      updated_at timestamptz not null default now()
    )
  `);
  // Seed default contact settings if not present
  await db.execute(sql`
    insert into site_settings (key, value) values
      ('contact_phone', '1-800-555-0199'),
      ('contact_email', 'support@childtrustfund.gov'),
      ('helpline_hours', 'Monday–Friday, 8:00 a.m. – 8:00 p.m. Eastern')
    on conflict (key) do nothing
  `);
}

let initPromise: Promise<void> | null = null;

/**
 * Single-flight initialization: creates the tables (if missing) and seeds the
 * demonstration register. Concurrent callers await the same promise so the home
 * page and the dashboard never query half-created tables.
 */
function ensureSeedData(): Promise<void> {
  if (!initPromise) {
    initPromise = runSeed().catch((err) => {
      initPromise = null;
      console.error("CTF register initialization failed:", err);
    });
  }
  return initPromise;
}

async function runSeed(): Promise<void> {
    await withRetry(() => ensureSchema());
    const [row] = await db.select({ value: count() }).from(applications);
    if (Number(row?.value ?? 0) > 0) return;

    const firstNames = [
      "Amelia", "Noah", "Sofia", "Liam", "Camila", "Ethan", "Aaliyah", "Mateo",
      "Harper", "Josiah", "Naomi", "Ezra", "Isabella", "Malik", "Elena", "Caleb",
      "Priya", "Diego", "Zoe", "Hudson", "Leilani", "Marcus", "Ruby", "Owen",
      "Fatima", "Julian", "Grace", "Adrian", "Nina", "Samuel",
    ];
    const lastNames = [
      "Whitfield", "Okafor", "Ramirez", "Nguyen", "Kowalski", "Bennett", "Alvarez",
      "Fitzgerald", "Nakamura", "Brooks", "Delgado", "Harrington", "Osei", "Castellanos",
      "Lindqvist", "Moreau", "Pike", "Vasquez", "Thornton", "Achebe",
    ];
    const banks = [
      "First National Custodian Bank", "Pacific Trust & Savings", "Heritage Community Bank",
      "Liberty Federal Credit Union", "Meridian Savings Bank", "Great Plains Trust Bank",
    ];
    const statuses: ApplicationStatus[] = [
      "funded", "funded", "funded", "approved", "under_review", "verification_required", "submitted",
    ];

    const now = Date.now();
    const rows: (typeof applications.$inferInsert)[] = [];
    const plan: { idx: number; status: ApplicationStatus; dob: string }[] = [];

    for (let i = 0; i < 120; i += 1) {
      const st = STATES[i % STATES.length];
      const first = firstNames[i % firstNames.length];
      const last = lastNames[(i * 7) % lastNames.length];
      const status = statuses[i % statuses.length];
      const auto = i % 3 !== 2;
      const year = auto ? 2025 + (i % 4) : 2016 + (i % 9);
      const month = 1 + (i % 12);
      const day = 1 + ((i * 3) % 27);
      const dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const tier = tierForDob(dob);
      const monthly = i % 4 === 0 ? (10 + (i % 8) * 5) * 100 : 0;
      const stateMatch = tier.autoEnrollment ? st.stateMatchCents : 0;
      const submitted = new Date(now - (120 - i) * 864e5 * 1.7);

      rows.push({
        referenceNumber: newReference(submitted),
        status,
        statusMessage:
          status === "funded"
            ? "All federal and state deposits have been wired to the child's account."
            : status === "approved"
              ? "Identity verified. Custodial account is being opened."
              : status === "verification_required"
                ? "Upload your photo ID and the child's certified birth certificate to continue."
                : "A benefits specialist is reviewing the registration details.",
        parentFullName: `${lastNames[(i * 3) % lastNames.length]} Guardian`,
        parentEmail: `guardian${i}@example.com`,
        parentPhone: `(202) 555-0${String(100 + i).slice(0, 3)}`,
        parentDob: `19${85 + (i % 12)}-0${1 + (i % 9)}-1${i % 9}`,
        parentSsnLast4: String(1000 + i).slice(-4),
        parentRelationship: i % 3 === 0 ? "Parent (mother)" : "Parent (father)",
        parentAddressLine1: `${100 + i} Constitution Ave`,
        parentCity: st.name.split(" ")[0],
        parentState: st.code,
        parentZip: String(10000 + i * 37).slice(0, 5),
        childFirstName: first,
        childLastName: last,
        childDob: dob,
        childGender: i % 2 === 0 ? "Female" : "Male",
        childSsnLast4: String(2000 + i).slice(-4),
        childBirthCity: st.name.split(" ")[0],
        childBirthState: st.code,
        participationTier: tier.tier,
        autoEnrollment: tier.autoEnrollment,
        accountType: i % 3 === 0 ? "ctf_growth" : i % 3 === 1 ? "ctf_savings" : "ctf_treasury",
        custodianBank: banks[i % banks.length],
        routingNumber: String(100000000 + i * 12345).slice(0, 9),
        accountLast4: String(3000 + i).slice(-4),
        childAccountNumber: status === "funded" || status === "approved" ? newAccountNumber() : null,
        monthlyContribution: monthly,
        federalSeedAmount: tier.federalSeedCents,
        stateMatchAmount: stateMatch,
        annualSupplementAmount: tier.federalSupplementCents,
        parentContributionAmount: 0,
        verificationMethod: i % 4 === 0 ? "document_upload" : i % 4 === 1 ? "login_gov" : i % 4 === 2 ? "id_me" : "in_person",
        verificationStatus:
          status === "funded" || status === "approved" ? "verified" : status === "verification_required" ? "awaiting_documents" : "in_progress",
        identityConsent: true,
        penaltyOfPerjury: true,
        electronicSignature: `${lastNames[(i * 3) % lastNames.length]} Guardian`,
        submittedAt: submitted,
        reviewedAt: status === "approved" || status === "funded" ? submitted : null,
        approvedAt: status === "funded" ? submitted : null,
        updatedAt: submitted,
      });
      plan.push({ idx: i, status, dob });
    }

    const inserted = await db.insert(applications).values(rows).returning({ id: applications.id });

    const depositRows: (typeof deposits.$inferInsert)[] = [];
    const eventRows: (typeof statusEvents.$inferInsert)[] = [];

    inserted.forEach((rec, i) => {
      const meta = rows[i];
      const status = plan[i].status;
      const st = getState(meta.parentState)!;
      eventRows.push({
        applicationId: rec.id,
        event: "application_submitted",
        detail: `Application received for ${meta.childFirstName} ${meta.childLastName}.`,
        actor: "guardian",
        createdAt: meta.submittedAt as Date,
      });
      if (status !== "funded" && status !== "approved") return;

      eventRows.push({
        applicationId: rec.id,
        event: "identity_verified",
        detail: `${st.agency} confirmed state residency and identity.`,
        actor: "specialist",
        createdAt: meta.submittedAt as Date,
      });

      if (status !== "funded") return;
      const posted = new Date((meta.submittedAt as Date).getTime() + 6 * 864e5);
      if (meta.autoEnrollment && meta.federalSeedAmount) {
        depositRows.push({
          applicationId: rec.id,
          depositType: "federal_seed",
          amountCents: meta.federalSeedAmount,
          status: "posted",
          description: "Federal Child Trust Fund seed deposit",
          source: "U.S. Department of the Treasury",
          postedAt: posted,
          scheduledFor: posted,
        });
      }
      if (meta.autoEnrollment && meta.stateMatchAmount) {
        depositRows.push({
          applicationId: rec.id,
          depositType: "state_match",
          amountCents: meta.stateMatchAmount,
          status: "posted",
          description: `${st.name} Child Trust Fund opening match`,
          source: st.agency,
          postedAt: new Date(posted.getTime() + 3 * 864e5),
          scheduledFor: new Date(posted.getTime() + 3 * 864e5),
        });
      }
      if (meta.annualSupplementAmount) {
        depositRows.push({
          applicationId: rec.id,
          depositType: "federal_supplement",
          amountCents: meta.annualSupplementAmount,
          status: "scheduled",
          description: "Federal birthday supplement (year 1)",
          source: "U.S. Department of the Treasury",
          scheduledFor: nextBirthday(meta.childDob),
        });
      }
      if (meta.monthlyContribution) {
        depositRows.push({
          applicationId: rec.id,
          depositType: "parent_contribution",
          amountCents: meta.monthlyContribution,
          status: "posted",
          description: "Guardian recurring contribution — first installment",
          source: `${meta.custodianBank} ••••${meta.accountLast4}`,
          postedAt: posted,
          scheduledFor: posted,
        });
      }
      eventRows.push({
        applicationId: rec.id,
        event: "funds_deposited",
        detail: "Federal and state deposits wired to the custodial account.",
        actor: "system",
        createdAt: posted,
      });
    });

    if (depositRows.length > 0) await db.insert(deposits).values(depositRows);
    if (eventRows.length > 0) await db.insert(statusEvents).values(eventRows);
}

export function resetInitialization() {
  initPromise = null;
}

// ------------------------------------------------------------------ //
// Admin service functions                                             //
// ------------------------------------------------------------------ //

export async function adminGetAllApplications(opts: {
  page?: number;
  status?: string;
  search?: string;
}): Promise<{ rows: ApplicationRow[]; total: number; pages: number }> {
  await ensureSeedData();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (opts.status) conditions.push(eq(applications.status, opts.status));
  if (opts.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(applications.referenceNumber, pattern),
        ilike(applications.parentFullName, pattern),
        ilike(applications.childFirstName, pattern),
        ilike(applications.childLastName, pattern),
      ),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(applications)
    .where(where);

  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select()
    .from(applications)
    .where(where)
    .orderBy(desc(applications.submittedAt))
    .limit(pageSize)
    .offset(offset);

  return { rows, total, pages: Math.ceil(total / pageSize) };
}

export async function adminGetApplicationDetail(
  reference: string,
): Promise<ApplicationDetail | null> {
  await ensureSeedData();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!application) return null;

  const [depRows, docRows, eventRows] = await Promise.all([
    db
      .select()
      .from(deposits)
      .where(eq(deposits.applicationId, application.id))
      .orderBy(desc(deposits.postedAt), desc(deposits.createdAt)),
    db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, application.id))
      .orderBy(desc(documents.uploadedAt)),
    db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, application.id))
      .orderBy(statusEvents.createdAt),
  ]);

  const balanceCents = depRows
    .filter((d) => d.status === "posted")
    .reduce((acc, d) => acc + d.amountCents, 0);
  const scheduledCents = depRows
    .filter((d) => d.status === "scheduled" || d.status === "processing")
    .reduce((acc, d) => acc + d.amountCents, 0);

  const projectionAt18Cents = quoteBenefits({
    dob: application.childDob,
    stateCode: application.parentState,
    guardianMonthlyCents: application.monthlyContribution,
  }).projectionAt18Cents;

  return {
    application,
    deposits: depRows,
    documents: docRows,
    events: eventRows,
    state: getState(application.parentState),
    balanceCents,
    scheduledCents,
    projectionAt18Cents,
  };
}

export async function adminUpdateApplication(
  reference: string,
  fields: Partial<{
    parentFullName: string;
    parentEmail: string;
    parentPhone: string;
    parentAddressLine1: string;
    parentAddressLine2: string | null;
    parentCity: string;
    parentState: string;
    parentZip: string;
    childFirstName: string;
    childMiddleName: string | null;
    childLastName: string;
    childDob: string;
    verificationStatus: string;
    participationTier: string;
  }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSeedData();
  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!app) return { ok: false, error: "Application not found." };

  await db
    .update(applications)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(applications.id, app.id));

  await db.insert(statusEvents).values({
    applicationId: app.id,
    event: "admin_edit",
    detail: `Admin updated fields: ${Object.keys(fields).join(", ")}.`,
    actor: "admin",
  });

  return { ok: true };
}

export async function adminSetApplicationStatus(
  reference: string,
  status: ApplicationStatus,
  notes: string,
  actor = "admin",
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSeedData();
  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.referenceNumber, reference.trim().toUpperCase()))
    .limit(1);
  if (!app) return { ok: false, error: "Application not found." };

  await db
    .update(applications)
    .set({ status, statusMessage: notes, updatedAt: new Date() })
    .where(eq(applications.id, app.id));

  await db.insert(statusEvents).values({
    applicationId: app.id,
    event: "status_override",
    detail: notes,
    actor,
  });

  return { ok: true };
}

export async function adminGetAllInquiries(opts?: {
  handled?: boolean;
}): Promise<(typeof inquiries.$inferSelect)[]> {
  await ensureSeedData();
  const conditions = [];
  if (opts?.handled !== undefined) {
    conditions.push(eq(inquiries.handled, opts.handled));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(inquiries)
    .where(where)
    .orderBy(desc(inquiries.createdAt));
}

export async function adminMarkInquiryHandled(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSeedData();
  const result = await db
    .update(inquiries)
    .set({ handled: true })
    .where(eq(inquiries.id, id));
  if ((result.rowCount ?? 0) === 0) {
    return { ok: false, error: "Not found." };
  }
  return { ok: true };
}

export async function adminGetNewsletterSignups(): Promise<
  (typeof newsletterSignups.$inferSelect)[]
> {
  await ensureSeedData();
  return db.select().from(newsletterSignups).orderBy(desc(newsletterSignups.createdAt));
}

export type AdminStats = {
  totalApplications: number;
  pendingReview: number;
  fundedAccounts: number;
  totalPostedCents: number;
};

export async function adminGetStats(): Promise<AdminStats> {
  await ensureSeedData();

  const [row] = await db
    .select({
      totalApplications: sql<number>`count(*)::int`,
      pendingReview: sql<number>`sum(case when ${applications.status} in ('submitted','under_review','verification_required') then 1 else 0 end)::int`,
      fundedAccounts: sql<number>`sum(case when ${applications.status} = 'funded' then 1 else 0 end)::int`,
    })
    .from(applications);

  const [moneyRow] = await db
    .select({
      totalPostedCents: sql<number>`coalesce(sum(case when ${deposits.status} = 'posted' then ${deposits.amountCents} else 0 end),0)::bigint`,
    })
    .from(deposits);

  return {
    totalApplications: Number(row?.totalApplications ?? 0),
    pendingReview: Number(row?.pendingReview ?? 0),
    fundedAccounts: Number(row?.fundedAccounts ?? 0),
    totalPostedCents: Number(moneyRow?.totalPostedCents ?? 0),
  };
}

// ------------------------------------------------------------------ //
// Admin dashboard stats (extended)                                    //
// ------------------------------------------------------------------ //

export type TierBreakdown = { tier: string; count: number; pct: number }[];
export type StatusDistribution = { status: string; count: number }[];
export type DepositTypeTotals = { depositType: string; totalCents: number }[];

export type AdminDashboardStats = AdminStats & {
  approvedAccounts: number;
  totalGuardianAccounts: number;
  tierBreakdown: TierBreakdown;
  statusDistribution: StatusDistribution;
  depositTypeTotals: DepositTypeTotals;
};

export async function adminGetDashboardStats(): Promise<AdminDashboardStats> {
  await ensureSeedData();

  const [appRow, moneyRow, gaRow, tierRows, statusRows, depositTypeRows] = await Promise.all([
    db
      .select({
        totalApplications: sql<number>`count(*)::int`,
        pendingReview: sql<number>`sum(case when ${applications.status} in ('submitted','under_review','verification_required') then 1 else 0 end)::int`,
        fundedAccounts: sql<number>`sum(case when ${applications.status} = 'funded' then 1 else 0 end)::int`,
        approvedAccounts: sql<number>`sum(case when ${applications.status} = 'approved' then 1 else 0 end)::int`,
      })
      .from(applications)
      .then((rows) => rows[0]),

    db
      .select({
        totalPostedCents: sql<number>`coalesce(sum(case when ${deposits.status} = 'posted' then ${deposits.amountCents} else 0 end),0)::bigint`,
      })
      .from(deposits)
      .then((rows) => rows[0]),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(guardianAccounts)
      .then((rows) => rows[0]),

    db
      .select({
        tier: applications.participationTier,
        cnt: sql<number>`count(*)::int`,
      })
      .from(applications)
      .groupBy(applications.participationTier)
      .orderBy(desc(sql`count(*)`)),

    db
      .select({
        status: applications.status,
        cnt: sql<number>`count(*)::int`,
      })
      .from(applications)
      .groupBy(applications.status)
      .orderBy(desc(sql`count(*)`)),

    db
      .select({
        depositType: deposits.depositType,
        totalCents: sql<number>`sum(${deposits.amountCents})::bigint`,
      })
      .from(deposits)
      .where(eq(deposits.status, "posted"))
      .groupBy(deposits.depositType)
      .orderBy(desc(sql`sum(${deposits.amountCents})`)),
  ]);

  const total = Number(appRow?.totalApplications ?? 0);

  return {
    totalApplications: total,
    pendingReview: Number(appRow?.pendingReview ?? 0),
    fundedAccounts: Number(appRow?.fundedAccounts ?? 0),
    approvedAccounts: Number(appRow?.approvedAccounts ?? 0),
    totalPostedCents: Number(moneyRow?.totalPostedCents ?? 0),
    totalGuardianAccounts: Number(gaRow?.total ?? 0),
    tierBreakdown: tierRows.map((r) => ({
      tier: r.tier,
      count: Number(r.cnt),
      pct: total > 0 ? (Number(r.cnt) / total) * 100 : 0,
    })),
    statusDistribution: statusRows.map((r) => ({
      status: r.status,
      count: Number(r.cnt),
    })),
    depositTypeTotals: depositTypeRows.map((r) => ({
      depositType: r.depositType,
      totalCents: Number(r.totalCents),
    })),
  };
}

// ------------------------------------------------------------------ //
// Admin deposit CRUD                                                  //
// ------------------------------------------------------------------ //

export type AdminDepositInput = {
  depositType: DepositType;
  amountCents: number;
  description: string;
  status: DepositStatus;
  scheduledFor: string | null;
  /** Institution or system that originated the deposit (defaults to "Admin Portal"). */
  source?: string;
};


export async function adminAddDeposit(
  applicationId: number,
  fields: AdminDepositInput,
): Promise<DepositRow> {
  const [row] = await db
    .insert(deposits)
    .values({
      applicationId,
      depositType: fields.depositType,
      amountCents: fields.amountCents,
      description: fields.description,
      status: fields.status,
      source: fields.source ?? "Admin Portal",
      scheduledFor: fields.scheduledFor ? new Date(fields.scheduledFor) : null,
      postedAt: fields.status === "posted" ? new Date() : null,
    })
    .returning();
  return row;
}

export async function adminUpdateDeposit(
  id: number,
  fields: Partial<AdminDepositInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Fetch current row first so we can set postedAt correctly
  const [current] = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
  if (!current) return { ok: false, error: "Not found." };

  const updateSet: Partial<typeof deposits.$inferInsert> = {};
  if (fields.depositType !== undefined) updateSet.depositType = fields.depositType;
  if (fields.amountCents !== undefined) updateSet.amountCents = fields.amountCents;
  if (fields.description !== undefined) updateSet.description = fields.description;
  if (fields.status !== undefined) {
    updateSet.status = fields.status;
    if (fields.status === "posted" && current.postedAt === null) {
      updateSet.postedAt = new Date();
    }
  }
  if ("scheduledFor" in fields) {
    updateSet.scheduledFor = fields.scheduledFor ? new Date(fields.scheduledFor) : null;
  }
  if (fields.source !== undefined) updateSet.source = fields.source || "Admin Portal";

  const result = await db.update(deposits).set(updateSet).where(eq(deposits.id, id));
  if ((result.rowCount ?? 0) === 0) return { ok: false, error: "Not found." };
  return { ok: true };
}

export async function adminDeleteDeposit(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await db.delete(deposits).where(eq(deposits.id, id));
  if ((result.rowCount ?? 0) === 0) return { ok: false, error: "Not found." };
  return { ok: true };
}

export async function adminGetApplicationBalances(
  appIds: number[],
): Promise<Map<number, number>> {
  if (appIds.length === 0) return new Map();
  const rows = await db
    .select({
      applicationId: deposits.applicationId,
      totalCents: sql<number>`sum(${deposits.amountCents})::bigint`,
    })
    .from(deposits)
    .where(
      and(
        // inArray with an empty array produces invalid SQL ("IN ()") — the
        // early-return above guards this, but the comment makes that explicit.
        inArray(deposits.applicationId, appIds),
        eq(deposits.status, "posted"),
      ),
    )
    .groupBy(deposits.applicationId);
  return new Map(rows.map((r) => [r.applicationId, Number(r.totalCents)]));
}

// ------------------------------------------------------------------ //
// Site settings                                                       //
// ------------------------------------------------------------------ //

export type SiteContactInfo = {
  contactPhone: string;
  contactEmail: string;
  helplineHours: string;
};

export async function getSiteContactInfo(): Promise<SiteContactInfo> {
  await ensureSeedData();
  const rows = await db
    .select()
    .from(siteSettings)
    .where(
      sql`${siteSettings.key} in ('contact_phone','contact_email','helpline_hours')`
    );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    contactPhone: map["contact_phone"] ?? "1-800-555-0199",
    contactEmail: map["contact_email"] ?? "support@childtrustfund.gov",
    helplineHours: map["helpline_hours"] ?? "Monday–Friday, 8:00 a.m. – 8:00 p.m. Eastern",
  };
}

export async function adminUpdateSiteSettings(
  updates: Partial<SiteContactInfo>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const pairs: [string, string][] = [];
    if (updates.contactPhone !== undefined) pairs.push(["contact_phone", updates.contactPhone]);
    if (updates.contactEmail !== undefined) pairs.push(["contact_email", updates.contactEmail]);
    if (updates.helplineHours !== undefined) pairs.push(["helpline_hours", updates.helplineHours]);
    for (const [key, value] of pairs) {
      await db
        .insert(siteSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
    }
    return { ok: true };
  } catch (err) {
    console.error("adminUpdateSiteSettings failed:", err);
    return { ok: false, error: "Failed to save settings." };
  }
}
