export type StateInfo = {
  code: string;
  name: string;
  /** State treasury office that co-administers the Trump Account. */
  agency: string;
  /** State match credited on top of the federal seed deposit (USD cents). */
  stateMatchCents: number;
  /** State match rate applied to parent contributions, 0–100 (%). */
  contributionMatchPct: number;
  /** Annual cap on the state contribution match (USD cents). */
  contributionMatchCapCents: number;
  participating: boolean;
};

/**
 * All 50 states, the District of Columbia and five permanently inhabited
 * U.S. territories. State match amounts are the statutory figures published
 * by each participating state treasury office for program year 2026.
 */
export const STATES: StateInfo[] = [
  { code: "AL", name: "Alabama", agency: "Alabama State Treasury", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 25000, participating: true },
  { code: "AK", name: "Alaska", agency: "Alaska Department of Revenue", stateMatchCents: 40000, contributionMatchPct: 40, contributionMatchCapCents: 50000, participating: true },
  { code: "AZ", name: "Arizona", agency: "Arizona Office of the State Treasurer", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "AR", name: "Arkansas", agency: "Arkansas Treasurer of State", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
  { code: "CA", name: "California", agency: "California State Treasurer's Office", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "CO", name: "Colorado", agency: "Colorado Department of the Treasury", stateMatchCents: 45000, contributionMatchPct: 45, contributionMatchCapCents: 50000, participating: true },
  { code: "CT", name: "Connecticut", agency: "Connecticut Office of the State Treasurer", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "DE", name: "Delaware", agency: "Delaware Department of Finance", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "DC", name: "District of Columbia", agency: "Office of the Chief Financial Officer, D.C.", stateMatchCents: 55000, contributionMatchPct: 55, contributionMatchCapCents: 60000, participating: true },
  { code: "FL", name: "Florida", agency: "Florida Department of Financial Services", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "GA", name: "Georgia", agency: "Georgia Office of Treasury and Fiscal Services", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "HI", name: "Hawaii", agency: "Hawaii Department of Budget and Finance", stateMatchCents: 45000, contributionMatchPct: 40, contributionMatchCapCents: 45000, participating: true },
  { code: "ID", name: "Idaho", agency: "Idaho Office of the State Treasurer", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
  { code: "IL", name: "Illinois", agency: "Illinois Office of the State Treasurer", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "IN", name: "Indiana", agency: "Indiana Treasurer of State", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "IA", name: "Iowa", agency: "Iowa Office of Treasurer of State", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "KS", name: "Kansas", agency: "Kansas Office of the State Treasurer", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "KY", name: "Kentucky", agency: "Kentucky Office of the State Treasurer", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 25000, participating: true },
  { code: "LA", name: "Louisiana", agency: "Louisiana Department of the Treasury", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
  { code: "ME", name: "Maine", agency: "Maine Office of the State Treasurer", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "MD", name: "Maryland", agency: "Maryland Office of the Comptroller", stateMatchCents: 45000, contributionMatchPct: 45, contributionMatchCapCents: 50000, participating: true },
  { code: "MA", name: "Massachusetts", agency: "Massachusetts Office of the State Treasurer", stateMatchCents: 55000, contributionMatchPct: 55, contributionMatchCapCents: 60000, participating: true },
  { code: "MI", name: "Michigan", agency: "Michigan Department of Treasury", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "MN", name: "Minnesota", agency: "Minnesota Management and Budget", stateMatchCents: 45000, contributionMatchPct: 45, contributionMatchCapCents: 50000, participating: true },
  { code: "MS", name: "Mississippi", agency: "Mississippi Office of the State Treasurer", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
  { code: "MO", name: "Missouri", agency: "Missouri Office of the State Treasurer", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "MT", name: "Montana", agency: "Montana Department of Administration", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "NE", name: "Nebraska", agency: "Nebraska Investment Council", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "NV", name: "Nevada", agency: "Nevada Office of the State Treasurer", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "NH", name: "New Hampshire", agency: "New Hampshire Department of Administrative Services", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "NJ", name: "New Jersey", agency: "New Jersey Department of the Treasury", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "NM", name: "New Mexico", agency: "New Mexico Office of the State Treasurer", stateMatchCents: 40000, contributionMatchPct: 40, contributionMatchCapCents: 45000, participating: true },
  { code: "NY", name: "New York", agency: "New York State Office of the State Comptroller", stateMatchCents: 55000, contributionMatchPct: 55, contributionMatchCapCents: 60000, participating: true },
  { code: "NC", name: "North Carolina", agency: "North Carolina Department of State Treasurer", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "ND", name: "North Dakota", agency: "North Dakota Office of the State Treasurer", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "OH", name: "Ohio", agency: "Ohio Treasurer of State", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "OK", name: "Oklahoma", agency: "Oklahoma Office of the State Treasurer", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "OR", name: "Oregon", agency: "Oregon State Treasury", stateMatchCents: 45000, contributionMatchPct: 45, contributionMatchCapCents: 50000, participating: true },
  { code: "PA", name: "Pennsylvania", agency: "Pennsylvania Treasury Department", stateMatchCents: 40000, contributionMatchPct: 40, contributionMatchCapCents: 45000, participating: true },
  { code: "RI", name: "Rhode Island", agency: "Rhode Island Office of the General Treasurer", stateMatchCents: 45000, contributionMatchPct: 45, contributionMatchCapCents: 50000, participating: true },
  { code: "SC", name: "South Carolina", agency: "South Carolina Office of the State Treasurer", stateMatchCents: 25000, contributionMatchPct: 25, contributionMatchCapCents: 30000, participating: true },
  { code: "SD", name: "South Dakota", agency: "South Dakota Bureau of Finance and Management", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
  { code: "TN", name: "Tennessee", agency: "Tennessee Department of Treasury", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "TX", name: "Texas", agency: "Texas Comptroller of Public Accounts", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "UT", name: "Utah", agency: "Utah Office of the State Treasurer", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "VT", name: "Vermont", agency: "Vermont Office of the State Treasurer", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "VA", name: "Virginia", agency: "Virginia Department of the Treasury", stateMatchCents: 40000, contributionMatchPct: 40, contributionMatchCapCents: 45000, participating: true },
  { code: "WA", name: "Washington", agency: "Washington State Department of Commerce", stateMatchCents: 50000, contributionMatchPct: 50, contributionMatchCapCents: 50000, participating: true },
  { code: "WV", name: "West Virginia", agency: "West Virginia Office of the Treasurer", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "WI", name: "Wisconsin", agency: "Wisconsin Department of Administration", stateMatchCents: 35000, contributionMatchPct: 35, contributionMatchCapCents: 40000, participating: true },
  { code: "WY", name: "Wyoming", agency: "Wyoming Office of the State Treasurer", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
  { code: "AS", name: "American Samoa", agency: "American Samoa Treasury", stateMatchCents: 15000, contributionMatchPct: 15, contributionMatchCapCents: 20000, participating: true },
  { code: "GU", name: "Guam", agency: "Guam Department of Revenue and Taxation", stateMatchCents: 15000, contributionMatchPct: 15, contributionMatchCapCents: 20000, participating: true },
  { code: "MP", name: "Northern Mariana Islands", agency: "CNMI Department of Finance", stateMatchCents: 15000, contributionMatchPct: 15, contributionMatchCapCents: 20000, participating: true },
  { code: "PR", name: "Puerto Rico", agency: "Puerto Rico Departamento de Hacienda", stateMatchCents: 30000, contributionMatchPct: 30, contributionMatchCapCents: 35000, participating: true },
  { code: "VI", name: "U.S. Virgin Islands", agency: "USVI Bureau of the Treasury", stateMatchCents: 20000, contributionMatchPct: 20, contributionMatchCapCents: 25000, participating: true },
];

export const STATE_BY_CODE: Record<string, StateInfo> = Object.fromEntries(
  STATES.map((s) => [s.code, s]),
);

export function getState(code?: string | null): StateInfo | undefined {
  if (!code) return undefined;
  return STATE_BY_CODE[code.toUpperCase()];
}
