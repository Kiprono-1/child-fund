export type Faq = { q: string; a: string; category: string; tag?: string };

export const FAQ_CATEGORIES = [
  "All questions",
  "Eligibility",
  "Registering",
  "Verification",
  "Deposits & matching",
  "Using the account",
  "Privacy & fraud",
] as const;

export const FAQS: Faq[] = [
  {
    category: "Eligibility",
    q: "Who automatically receives the $1,000 federal seed deposit?",
    a: "Every U.S. citizen child born between January 1, 2025 and December 31, 2028 with a valid Social Security number. A parent or legal guardian still files the registration and completes identity verification, but the family is never required to contribute a single dollar for the account to be opened and funded.",
    tag: "Automatic cohort",
  },
  {
    category: "Eligibility",
    q: "My child was born before 2025. Can they still get an account?",
    a: "Yes. Children born before the automatic-enrollment window are registered in the guardian-funded cohort. You open the account and deposit funds yourself, and your state still matches a percentage of every contribution up to its annual cap. Any child under 18 with a valid SSN may hold an account.",
    tag: "Guardian-funded",
  },
  {
    category: "Eligibility",
    q: "Is there a family income limit?",
    a: "No. Every eligible child receives the same federal seed deposit regardless of household income. Households below 200% of the federal poverty line also receive a Supplemental Child Endowment of $250, credited automatically after the annual IRS data match. You never have to apply for it separately.",
  },
  {
    category: "Eligibility",
    q: "Is my child eligible if we live outside the United States?",
    a: "Children of U.S. citizens born abroad with a Consular Report of Birth Abroad are eligible. Register through the overseas desk at 1-844-555-4823 and use the state of the sponsoring parent's last U.S. residence for the state match.",
  },
  {
    category: "Eligibility",
    q: "Do adopted children qualify?",
    a: "Yes. A final adoption decree establishes you as the legal guardian for registration purposes. If the child was born inside the automatic window, the federal seed is still paid even if the adoption is finalized years later.",
  },
  {
    category: "Eligibility",
    q: "Do twins each get their own deposit?",
    a: "Yes. Every child receives an individual account and an individual full federal seed deposit. There is no per-family cap on the number of accounts or deposits.",
  },
  {
    category: "Registering",
    q: "How long does registration take?",
    a: "About ten minutes for the six-step online form. You can stop at any point — your draft is saved in your browser — and come back later to finish.",
  },
  {
    category: "Registering",
    q: "What information do I need before I start?",
    a: "The child's certified birth certificate details, the last four digits of the child's Social Security number, your own government photo ID, your state of legal residence, and the routing and account numbers of a custodian bank account at an FDIC or NCUA insured institution.",
  },
  {
    category: "Registering",
    q: "Does registration cost anything?",
    a: "No. Registration, identity verification, deposits and account maintenance are permanently free. Certified custodian banks are prohibited by the Fund Board from charging maintenance, minimum-balance, transfer or closure fees on a child trust account.",
    tag: "No fee",
  },
  {
    category: "Registering",
    q: "Can I register more than one child?",
    a: "Yes. Each child requires a separate Form CTF-1 and receives a separate reference number and account. After you submit one application you can choose 'Register another child' on the confirmation screen.",
  },
  {
    category: "Registering",
    q: "Can someone who is not the parent register a child?",
    a: "Only a parent or a court-appointed legal guardian may open the account. Grandparents, other relatives and friends may contribute to an existing account using the reference number, but they cannot open one or withdraw from it.",
  },
  {
    category: "Registering",
    q: "What if I do not have internet access at home?",
    a: "Call 1-844-555-4823 to request a paper Form CTF-1 by mail, or visit any participating state treasury office where staff will file the application with you at no charge.",
  },
  {
    category: "Verification",
    q: "How fast is identity verification?",
    a: "Login.gov and ID.me usually clear within the same business day. Secure document upload takes 3–5 business days for a specialist to review. In-person verification at a state treasury office is completed while you wait.",
  },
  {
    category: "Verification",
    q: "Which documents are accepted?",
    a: "An unexpired government photo ID (driver's license, state ID card or U.S. passport), the child's certified birth certificate, the child's Social Security card, a court-appointed guardianship order where applicable, and proof of U.S. residence such as a utility bill or lease.",
  },
  {
    category: "Verification",
    q: "Will you store my full Social Security number?",
    a: "This website only ever asks for the last four digits. The full SSN record match is performed by the Social Security Administration through a secure federal interface, and no full number is retained in the Child Trust Fund register.",
    tag: "Privacy",
  },
  {
    category: "Verification",
    q: "What happens if verification fails?",
    a: "You receive a plain-language notice explaining exactly why, and you may try again twice with a different method. After that, visit a state treasury office in person with originals, or file Form CTF-9 (Request for Reconsideration) within 60 days.",
  },
  {
    category: "Deposits & matching",
    q: "How quickly is the money deposited after I register?",
    a: "Identity verification takes 1–5 business days. The custodial account is then opened within 3 business days, the federal seed deposit is wired within 10 business days of verification, and the state match follows within 5 business days after that.",
  },
  {
    category: "Deposits & matching",
    q: "How does the state match on my contributions work?",
    a: "Each state matches a percentage of every guardian contribution, from 15% to 55%, up to an annual cap published on the state participation table. The match is credited within 5 business days of your deposit and appears as a separate line in the deposit ledger.",
  },
  {
    category: "Deposits & matching",
    q: "Is there a limit on how much I can contribute?",
    a: "Yes — $5,000 per child per program year, counting all contributors including grandparents and other relatives. Contributions above the limit are returned to the sender.",
  },
  {
    category: "Deposits & matching",
    q: "Are deposits taxable?",
    a: "Federal seed deposits, state matches and guardian contributions are not taxable income to the child or to the guardian. Investment earnings inside a CTF Growth Portfolio are tax-deferred until distribution, in the same way as a Series I savings bond.",
  },
  {
    category: "Deposits & matching",
    q: "What return does the account earn?",
    a: "A CTF Savings Account earns the program rate of 3.90% APY and is FDIC-insured. A CTF Growth Portfolio uses an age-based index allocation with a capped expense ratio of 0.05%; it may lose value. A CTF Treasury Ladder holds Series I bonds and 5-year Treasury notes backed by the full faith and credit of the United States.",
  },
  {
    category: "Using the account",
    q: "Can I withdraw money before the child turns 18?",
    a: "No, except in a documented hardship: medical emergency, prevention of eviction or foreclosure, or funeral expenses for an immediate family member. The custodian applies to the state treasury office with evidence, and the Fund Board reviews any appeal within 30 days.",
  },
  {
    category: "Using the account",
    q: "What can the money be used for at 18?",
    a: "Anything the young adult chooses: tuition or trade school, a rental deposit or down payment, business start-up capital, or a roll-forward into a retirement or brokerage account in their own name. No distribution is forced and nothing expires.",
  },
  {
    category: "Using the account",
    q: "Does the account affect financial aid or public benefits?",
    a: "Child trust accounts are excluded from the asset tests used by Medicaid, SNAP and Supplemental Security Income up to the statutory cap. For federal student aid they are treated as a custodial student asset; check with your state aid office for how it applies to your situation.",
  },
  {
    category: "Using the account",
    q: "What happens if we move to another state?",
    a: "The account moves with the child. Report your new address within 30 days. The new state's contribution match applies from the move date, and any opening match already received is never reclaimed.",
  },
  {
    category: "Using the account",
    q: "What happens if the custodian dies or loses custody?",
    a: "File Form CTF-4 with the state treasury office. Custody transfers, adoption finalizations and death of a custodian are recorded, a successor custodian is appointed, and the account and its balance remain the child's property throughout.",
  },
  {
    category: "Privacy & fraud",
    q: "How do I know a message from the program is genuine?",
    a: "Official emails come only from a childtrustfund.gov address and never ask for money, gift cards, your bank password or your full Social Security number. Phone calls from the program always reference your CTF case number. When in doubt, hang up and call 1-844-555-4823 yourself.",
    tag: "Security",
  },
  {
    category: "Privacy & fraud",
    q: "Someone offered to expedite my application for a fee. Is that real?",
    a: "No. It is a scam. Registration cannot be expedited for money and no official ever asks for a fee. Report it to the Office of Inspector General hotline at 1-800-555-0199 and through the contact form on this site.",
    tag: "Report fraud",
  },
  {
    category: "Privacy & fraud",
    q: "Who can see my child's account?",
    a: "Only you as custodian, the child after their 18th birthday, and authorized staff of the Treasury Fiscal Service, the Federal Fund Board and your state treasury office. Records are protected by the Privacy Act of 1974 under System of Records Notice Treasury/CTF.001.",
  },
  {
    category: "Privacy & fraud",
    q: "How do I report a change of address or a mistake?",
    a: "Use the contact form or call the Help Line. Address changes must be reported within 30 days. Corrections to a child's name or date of birth require a certified amended birth certificate.",
  },
];
