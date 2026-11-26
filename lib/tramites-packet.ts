/**
 * The agency packet: the answers a visa helper needs, gathered one section at a time.
 * Client-safe. The draft stays in this browser (see `tramites-packet-store.ts`).
 * Questions and validation are plain data, never a model's guess.
 */
import { TRAMITES_PATH_IDS, type TramitesPathId } from "@/lib/tramites";

export const PACKET_PATH = "/tramites/packet";

/** Stored in place of a value when the person ticks "Does not apply". */
export const NOT_APPLICABLE = "__na__";

export const SECTION_IDS = [
  "errand",
  "personal",
  "contact",
  "passport",
  "travel",
  "prior",
  "uscontact",
  "family",
  "work",
  "security",
  "docs",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export type StepId = SectionId | "review";

export type FieldKind = "text" | "date" | "tel" | "email" | "select" | "yesno" | "textarea";

export type Condition = {
  id: string;
  /** Visible only when the other answer equals this. */
  equals?: string;
  /** Visible only when the other answer is one of these. */
  in?: readonly string[];
  /** Visible only when the other answer is filled in and is not this. */
  notEquals?: string;
};

export type FieldDef = {
  id: string;
  kind: FieldKind;
  required?: boolean;
  /** Offers a "Does not apply" tick that satisfies the field. */
  dna?: boolean;
  showIf?: Condition;
  /** Browser autofill hint. */
  autoComplete?: string;
};

/** What each select offers. A new option needs its words in both languages. */
export const OPTIONS = {
  errand: TRAMITES_PATH_IDS,
  sex: ["female", "male"],
  marital: ["single", "married", "commonLaw", "widowed", "divorced", "separated"],
  purpose: ["tourism", "business", "medical", "other"],
  payer: ["self", "relative", "employer", "other"],
  contactRelation: ["relative", "friend", "business", "hotel", "other"],
  occupation: ["employed", "selfEmployed", "student", "homemaker", "retired", "unemployed"],
} as const;

export type OptionsField = keyof typeof OPTIONS;
export type OptionKey = {
  [K in OptionsField]: `${K}.${(typeof OPTIONS)[K][number]}`;
}[OptionsField];

export const SECURITY_IDS = [
  "secDisease",
  "secDrugs",
  "secArrested",
  "secControlled",
  "secTrafficking",
  "secTerror",
  "secFraud",
  "secRemoved",
  "secOverstay",
  "secEntry",
] as const;
export type SecurityId = (typeof SECURITY_IDS)[number];

/** A yes here tells the agency to look at the whole file. */
export const SECURITY_FLAGS: readonly SecurityId[] = ["secFraud", "secRemoved", "secOverstay", "secEntry"];

const BASE_FIELDS = [
  { id: "errand", kind: "select", required: true },

  { id: "surname", kind: "text", required: true, autoComplete: "family-name" },
  { id: "givenNames", kind: "text", required: true, autoComplete: "given-name" },
  { id: "nativeName", kind: "text", dna: true },
  { id: "otherNames", kind: "yesno", required: true },
  { id: "otherNamesList", kind: "textarea", required: true, showIf: { id: "otherNames", equals: "yes" } },
  { id: "sex", kind: "select", required: true, autoComplete: "sex" },
  { id: "marital", kind: "select", required: true },
  { id: "birthDate", kind: "date", required: true, autoComplete: "bday" },
  { id: "birthCity", kind: "text", required: true },
  { id: "birthState", kind: "text", dna: true },
  { id: "birthCountry", kind: "text", required: true, autoComplete: "country-name" },
  { id: "nationality", kind: "text", required: true },
  { id: "otherNationality", kind: "yesno", required: true },
  { id: "otherNationalityList", kind: "textarea", required: true, showIf: { id: "otherNationality", equals: "yes" } },
  { id: "curp", kind: "text", dna: true },
  { id: "ssn", kind: "text", dna: true },
  { id: "taxId", kind: "text", dna: true },

  { id: "street", kind: "text", required: true, autoComplete: "street-address" },
  { id: "city", kind: "text", required: true, autoComplete: "address-level2" },
  { id: "state", kind: "text", required: true, autoComplete: "address-level1" },
  { id: "postal", kind: "text", dna: true, autoComplete: "postal-code" },
  { id: "country", kind: "text", required: true, autoComplete: "country-name" },
  { id: "mailingSame", kind: "yesno", required: true },
  { id: "mailingAddress", kind: "textarea", required: true, showIf: { id: "mailingSame", equals: "no" } },
  { id: "phone", kind: "tel", required: true, autoComplete: "tel" },
  { id: "phone2", kind: "tel", dna: true },
  { id: "email", kind: "email", required: true, autoComplete: "email" },
  { id: "social", kind: "text", dna: true },

  { id: "passportNumber", kind: "text", required: true },
  { id: "bookNumber", kind: "text", dna: true },
  { id: "issueCountry", kind: "text", required: true },
  { id: "issueCity", kind: "text", required: true },
  { id: "issueDate", kind: "date", required: true },
  { id: "expiryDate", kind: "date", required: true },
  { id: "passportLost", kind: "yesno", required: true },
  { id: "passportLostDetails", kind: "textarea", required: true, showIf: { id: "passportLost", equals: "yes" } },

  { id: "purpose", kind: "select", required: true },
  { id: "plans", kind: "yesno", required: true },
  { id: "arrivalDate", kind: "date", required: true },
  { id: "stayLength", kind: "text", required: true },
  { id: "usAddress", kind: "textarea", required: true },
  { id: "payer", kind: "select", required: true },
  { id: "payerDetails", kind: "textarea", required: true, showIf: { id: "payer", notEquals: "self" } },
  { id: "companions", kind: "yesno", required: true },
  { id: "companionsList", kind: "textarea", required: true, showIf: { id: "companions", equals: "yes" } },

  { id: "beenToUS", kind: "yesno", required: true },
  { id: "lastVisit", kind: "text", required: true, showIf: { id: "beenToUS", equals: "yes" } },
  { id: "hadVisa", kind: "yesno", required: true },
  { id: "visaDetails", kind: "textarea", required: true, showIf: { id: "hadVisa", equals: "yes" } },
  { id: "refused", kind: "yesno", required: true },
  { id: "refusedDetails", kind: "textarea", required: true, showIf: { id: "refused", equals: "yes" } },
  { id: "visaLost", kind: "yesno", required: true },
  { id: "visaLostDetails", kind: "textarea", required: true, showIf: { id: "visaLost", equals: "yes" } },

  { id: "contactName", kind: "text", dna: true, required: true },
  { id: "contactRelation", kind: "select", showIf: { id: "contactName", notEquals: NOT_APPLICABLE } },
  { id: "contactAddress", kind: "textarea", showIf: { id: "contactName", notEquals: NOT_APPLICABLE } },
  { id: "contactPhone", kind: "tel", showIf: { id: "contactName", notEquals: NOT_APPLICABLE } },

  { id: "fatherName", kind: "text", dna: true, required: true },
  { id: "fatherBirth", kind: "date", dna: true },
  { id: "motherName", kind: "text", dna: true, required: true },
  { id: "motherBirth", kind: "date", dna: true },
  { id: "spouseName", kind: "text", required: true, showIf: { id: "marital", in: ["married", "commonLaw"] } },
  { id: "spouseBirth", kind: "date", showIf: { id: "marital", in: ["married", "commonLaw"] } },
  { id: "usRelatives", kind: "yesno", required: true },
  { id: "usRelativesList", kind: "textarea", required: true, showIf: { id: "usRelatives", equals: "yes" } },

  { id: "occupation", kind: "select", required: true },
  {
    id: "employerName",
    kind: "text",
    required: true,
    showIf: { id: "occupation", in: ["employed", "selfEmployed", "student"] },
  },
  {
    id: "employerAddress",
    kind: "textarea",
    required: true,
    showIf: { id: "occupation", in: ["employed", "selfEmployed", "student"] },
  },
  { id: "employerPhone", kind: "tel", showIf: { id: "occupation", in: ["employed", "selfEmployed", "student"] } },
  { id: "income", kind: "text", dna: true, showIf: { id: "occupation", in: ["employed", "selfEmployed"] } },
  { id: "duties", kind: "textarea", showIf: { id: "occupation", in: ["employed", "selfEmployed", "student"] } },
  { id: "prevJob", kind: "yesno", required: true },
  { id: "prevJobDetails", kind: "textarea", required: true, showIf: { id: "prevJob", equals: "yes" } },
] as const satisfies readonly FieldDef[];

const SECURITY_FIELDS: readonly FieldDef[] = SECURITY_IDS.flatMap((id): FieldDef[] => [
  { id, kind: "yesno", required: true },
  { id: `${id}Why`, kind: "textarea", required: true, showIf: { id, equals: "yes" } },
]);

type BaseFieldId = (typeof BASE_FIELDS)[number]["id"];
export type FieldId = BaseFieldId | SecurityId | `${SecurityId}Why`;

const ALL_FIELDS: readonly FieldDef[] = [...BASE_FIELDS, ...SECURITY_FIELDS];
const FIELD_BY_ID = new Map<string, FieldDef>(ALL_FIELDS.map((field) => [field.id, field]));

export const SECTION_FIELDS: Record<Exclude<SectionId, "docs">, readonly FieldId[]> = {
  errand: ["errand"],
  personal: [
    "surname",
    "givenNames",
    "nativeName",
    "otherNames",
    "otherNamesList",
    "sex",
    "marital",
    "birthDate",
    "birthCity",
    "birthState",
    "birthCountry",
    "nationality",
    "otherNationality",
    "otherNationalityList",
    "curp",
    "ssn",
    "taxId",
  ],
  contact: [
    "street",
    "city",
    "state",
    "postal",
    "country",
    "mailingSame",
    "mailingAddress",
    "phone",
    "phone2",
    "email",
    "social",
  ],
  passport: [
    "passportNumber",
    "bookNumber",
    "issueCountry",
    "issueCity",
    "issueDate",
    "expiryDate",
    "passportLost",
    "passportLostDetails",
  ],
  travel: [
    "purpose",
    "plans",
    "arrivalDate",
    "stayLength",
    "usAddress",
    "payer",
    "payerDetails",
    "companions",
    "companionsList",
  ],
  prior: [
    "beenToUS",
    "lastVisit",
    "hadVisa",
    "visaDetails",
    "refused",
    "refusedDetails",
    "visaLost",
    "visaLostDetails",
  ],
  uscontact: ["contactName", "contactRelation", "contactAddress", "contactPhone"],
  family: [
    "fatherName",
    "fatherBirth",
    "motherName",
    "motherBirth",
    "spouseName",
    "spouseBirth",
    "usRelatives",
    "usRelativesList",
  ],
  work: [
    "occupation",
    "employerName",
    "employerAddress",
    "employerPhone",
    "income",
    "duties",
    "prevJob",
    "prevJobDetails",
  ],
  security: SECURITY_IDS.flatMap((id) => [id, `${id}Why` as const]),
};

const securityPage = (ids: readonly SecurityId[]): readonly FieldId[] =>
  ids.flatMap((id) => [id, `${id}Why` as const]);

/**
 * Each section is shown as a few short screens, never a wall of questions.
 * A page's titles live in `COPY.tramites.packet.pageTitles`, in the same order.
 * Every id here must also be in `SECTION_FIELDS` for that section.
 */
export const SECTION_PAGES: Record<Exclude<SectionId, "docs">, readonly (readonly FieldId[])[]> = {
  errand: [["errand"]],
  personal: [
    ["surname", "givenNames", "nativeName", "otherNames", "otherNamesList"],
    ["sex", "marital", "birthDate", "birthCity", "birthState", "birthCountry"],
    ["nationality", "otherNationality", "otherNationalityList", "curp", "ssn", "taxId"],
  ],
  contact: [
    ["street", "city", "state", "postal", "country", "mailingSame", "mailingAddress"],
    ["phone", "phone2", "email", "social"],
  ],
  passport: [
    ["passportNumber", "bookNumber", "issueCountry", "issueCity"],
    ["issueDate", "expiryDate", "passportLost", "passportLostDetails"],
  ],
  travel: [
    ["purpose", "plans", "arrivalDate", "stayLength"],
    ["usAddress", "payer", "payerDetails", "companions", "companionsList"],
  ],
  prior: [
    ["beenToUS", "lastVisit", "hadVisa", "visaDetails"],
    ["refused", "refusedDetails", "visaLost", "visaLostDetails"],
  ],
  uscontact: [["contactName", "contactRelation", "contactAddress", "contactPhone"]],
  family: [
    ["fatherName", "fatherBirth", "motherName", "motherBirth"],
    ["spouseName", "spouseBirth", "usRelatives", "usRelativesList"],
  ],
  work: [
    ["occupation", "employerName", "employerAddress", "employerPhone", "income", "duties"],
    ["prevJob", "prevJobDetails"],
  ],
  security: [
    securityPage(["secDisease", "secDrugs", "secArrested", "secControlled"]),
    securityPage(["secTrafficking", "secTerror", "secFraud"]),
    securityPage(["secRemoved", "secOverstay", "secEntry"]),
  ],
};

/**
 * Answers that are true for the person, not for one errand. They are remembered on this device
 * (`tramites-profile-store.ts`) the moment they are typed, and fill in the next packet or form.
 * A new form should read these instead of asking again.
 */
export const PROFILE_FIELD_IDS: readonly FieldId[] = [
  "surname",
  "givenNames",
  "nativeName",
  "sex",
  "marital",
  "birthDate",
  "birthCity",
  "birthState",
  "birthCountry",
  "nationality",
  "curp",
  "ssn",
  "taxId",
  "street",
  "city",
  "state",
  "postal",
  "country",
  "phone",
  "phone2",
  "email",
  "passportNumber",
  "bookNumber",
  "issueCountry",
  "issueCity",
  "issueDate",
  "expiryDate",
];

const PROFILE_SET = new Set<string>(PROFILE_FIELD_IDS);
export function isProfileField(id: string): boolean {
  return PROFILE_SET.has(id);
}

export function fieldDef(id: string): FieldDef | undefined {
  return FIELD_BY_ID.get(id);
}

export type Answers = Readonly<Record<string, string>>;

/** The key a checked document is stored under. */
export function docKey(index: number): string {
  return `doc:${index}`;
}

export function isVisible(field: FieldDef, answers: Answers): boolean {
  const rule = field.showIf;
  if (!rule) return true;
  const value = answers[rule.id] ?? "";
  if (rule.equals !== undefined) return value === rule.equals;
  if (rule.in) return rule.in.includes(value);
  if (rule.notEquals !== undefined) return value !== "" && value !== rule.notEquals;
  return true;
}

export function visibleFields(section: SectionId, answers: Answers): FieldDef[] {
  if (section === "docs") return [];
  const out: FieldDef[] = [];
  for (const id of SECTION_FIELDS[section]) {
    const field = FIELD_BY_ID.get(id);
    if (field && isVisible(field, answers)) out.push(field);
  }
  return out;
}

export type FieldProblem = "required" | "email" | "birthFuture" | "expiryOrder" | "expired";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Null when the answer is fine. Dates are `YYYY-MM-DD`, which compare as plain text. */
export function fieldProblem(field: FieldDef, answers: Answers): FieldProblem | null {
  const value = (answers[field.id] ?? "").trim();
  if (value === NOT_APPLICABLE) return field.dna ? null : "required";
  if (value === "") return field.required ? "required" : null;
  if (field.kind === "email" && !EMAIL.test(value)) return "email";
  if (field.id === "birthDate" && value > today()) return "birthFuture";
  if (field.id === "expiryDate") {
    const issued = answers.issueDate ?? "";
    if (issued && value <= issued) return "expiryOrder";
    if (value < today()) return "expired";
  }
  return null;
}

/** Fields in this section that still need an answer, in order. */
export function sectionProblems(section: SectionId, answers: Answers): { id: string; problem: FieldProblem }[] {
  const out: { id: string; problem: FieldProblem }[] = [];
  for (const field of visibleFields(section, answers)) {
    const problem = fieldProblem(field, answers);
    if (problem) out.push({ id: field.id, problem });
  }
  return out;
}

/** The visible fields of each page of a section. Docs and errand are one page. Empty pages drop out. */
export function pageFields(section: SectionId, answers: Answers): FieldDef[][] {
  if (section === "docs") return [[]];
  const pages: FieldDef[][] = [];
  for (const ids of SECTION_PAGES[section]) {
    const fields: FieldDef[] = [];
    for (const id of ids) {
      const field = FIELD_BY_ID.get(id);
      if (field && isVisible(field, answers)) fields.push(field);
    }
    if (fields.length > 0) pages.push(fields);
  }
  return pages.length > 0 ? pages : [[]];
}

/** How many screens this section has right now. */
export function pageCount(section: SectionId): number {
  return section === "docs" ? 1 : SECTION_PAGES[section].length;
}

/** Problems on one page only. */
export function pageProblems(fields: readonly FieldDef[], answers: Answers): { id: string; problem: FieldProblem }[] {
  const out: { id: string; problem: FieldProblem }[] = [];
  for (const field of fields) {
    const problem = fieldProblem(field, answers);
    if (problem) out.push({ id: field.id, problem });
  }
  return out;
}

export function sectionHasProblems(section: SectionId, answers: Answers): boolean {
  return sectionProblems(section, answers).length > 0;
}

/** Security items answered yes that the agency should read closely. */
export function flaggedSecurity(answers: Answers): SecurityId[] {
  return SECURITY_FLAGS.filter((id) => answers[id] === "yes");
}

export function packetPathFrom(answers: Answers): TramitesPathId {
  const value = answers.errand ?? "";
  return (TRAMITES_PATH_IDS as readonly string[]).includes(value) ? (value as TramitesPathId) : "first";
}

export function packetHref(path?: TramitesPathId | null): string {
  return path ? `${PACKET_PATH}?path=${path}` : PACKET_PATH;
}

export function isSectionId(value: unknown): value is StepId {
  return value === "review" || (typeof value === "string" && (SECTION_IDS as readonly string[]).includes(value));
}
