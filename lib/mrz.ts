/**
 * Reads the machine-readable strip (MRZ) printed on passports, ID cards, and card visas (ICAO 9303),
 * and the CURP printed on Mexican IDs. Pure text in, plain facts out. Client-safe.
 *
 * The strip carries check digits, so a bad OCR read is caught instead of trusted:
 * `confident` is true only when every check digit on the document passes.
 */
import { MRZ_COUNTRIES } from "@/lib/mrz-countries";

export type MrzFormat = "TD1" | "TD2" | "TD3";

export type MrzResult = {
  format: MrzFormat;
  /** A passport (P), or an ID card / card visa. Only a passport's number is a passport number. */
  kind: "passport" | "card";
  issuer: string;
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string;
  /** `YYYY-MM-DD`, or "" when the strip's date was not a real date. */
  birthDate: string;
  expiryDate: string;
  sex: "female" | "male" | null;
  /** Every check digit passed. */
  confident: boolean;
};

const WEIGHTS = [7, 3, 1];

function charValue(char: string): number {
  if (char >= "0" && char <= "9") return char.charCodeAt(0) - 48;
  if (char >= "A" && char <= "Z") return char.charCodeAt(0) - 55;
  return 0;
}

/** The ICAO check digit of a run of characters. */
export function checkDigit(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i += 1) sum += charValue(text[i]) * WEIGHTS[i % 3];
  return sum % 10;
}

function digitOk(data: string, check: string): boolean {
  // A "<" check digit means the field is empty and counts as zero.
  const given = check === "<" ? 0 : Number(check);
  return Number.isInteger(given) && checkDigit(data) === given;
}

// What a misread looks like: letters standing in for digits, and the other way around.
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G" };

function asDigits(text: string): string {
  return [...text].map((char) => TO_DIGIT[char] ?? char).join("");
}
function asLetters(text: string): string {
  return [...text].map((char) => TO_LETTER[char] ?? char).join("");
}

function isoDate(yymmdd: string, kind: "birth" | "expiry"): string {
  if (!/^\d{6}$/.test(yymmdd)) return "";
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const now = new Date().getFullYear() % 100;
  const year = kind === "expiry" ? 2000 + yy : yy > now ? 1900 + yy : 2000 + yy;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * OCR often reads the long run of "<" filler after the last name as "KLLLLLL" or "CCCCC".
 * Drops a trailing run that starts at a "<" and holds only "<", K, L, and C, with at least one letter.
 * A name that itself ends in K, L, or C (Michael) is safe: its run starts at its own last letter, not a "<".
 */
function stripFiller(field: string): string {
  const run = /<[<KLC]{3,}$/.exec(field);
  return run && /[KLC]/.test(run[0]) ? field.slice(0, run.index) : field;
}

function names(field: string): { surname: string; givenNames: string } {
  const [surname = "", ...rest] = field.split("<<");
  const clean = (part: string) => part.replace(/</g, " ").replace(/\s+/g, " ").trim();
  return { surname: clean(surname), givenNames: clean(rest.join(" ")) };
}

function sexOf(char: string): "female" | "male" | null {
  return char === "F" ? "female" : char === "M" ? "male" : null;
}

function plain(field: string): string {
  return field.replace(/</g, "").trim();
}

type Body = {
  issuer: string;
  nameField: string;
  documentNumber: string;
  documentCheck: string;
  nationality: string;
  birth: string;
  birthCheck: string;
  sex: string;
  expiry: string;
  expiryCheck: string;
  composite: string;
  compositeCheck: string;
};

function finish(format: MrzFormat, type: string, body: Body): MrzResult {
  const birth = asDigits(body.birth);
  const expiry = asDigits(body.expiry);
  const checks = [
    digitOk(body.documentNumber, asDigits(body.documentCheck)),
    digitOk(birth, asDigits(body.birthCheck)),
    digitOk(expiry, asDigits(body.expiryCheck)),
    digitOk(body.composite, asDigits(body.compositeCheck)),
  ];
  const { surname, givenNames } = names(stripFiller(asLetters(body.nameField).replace(/[^A-Z<]/g, "<")));
  return {
    format,
    kind: type.startsWith("P") ? "passport" : "card",
    issuer: asLetters(plain(body.issuer)),
    surname,
    givenNames,
    documentNumber: plain(body.documentNumber),
    nationality: asLetters(plain(body.nationality)),
    birthDate: checks[1] ? isoDate(birth, "birth") : "",
    expiryDate: checks[2] ? isoDate(expiry, "expiry") : "",
    sex: sexOf(body.sex),
    confident: checks.every(Boolean),
  };
}

function td3(l1: string, l2: string): MrzResult {
  return finish("TD3", l1.slice(0, 2), {
    issuer: l1.slice(2, 5),
    nameField: l1.slice(5, 44),
    documentNumber: l2.slice(0, 9),
    documentCheck: l2[9],
    nationality: l2.slice(10, 13),
    birth: l2.slice(13, 19),
    birthCheck: l2[19],
    sex: l2[20],
    expiry: l2.slice(21, 27),
    expiryCheck: l2[27],
    composite: l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43),
    compositeCheck: l2[43],
  });
}

function td2(l1: string, l2: string): MrzResult {
  return finish("TD2", l1.slice(0, 2), {
    issuer: l1.slice(2, 5),
    nameField: l1.slice(5, 36),
    documentNumber: l2.slice(0, 9),
    documentCheck: l2[9],
    nationality: l2.slice(10, 13),
    birth: l2.slice(13, 19),
    birthCheck: l2[19],
    sex: l2[20],
    expiry: l2.slice(21, 27),
    expiryCheck: l2[27],
    composite: l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 35),
    compositeCheck: l2[35],
  });
}

function td1(l1: string, l2: string, l3: string): MrzResult {
  return finish("TD1", l1.slice(0, 2), {
    issuer: l1.slice(2, 5),
    nameField: l3.slice(0, 30),
    documentNumber: l1.slice(5, 14),
    documentCheck: l1[14],
    nationality: l2.slice(15, 18),
    birth: l2.slice(0, 6),
    birthCheck: l2[6],
    sex: l2[7],
    expiry: l2.slice(8, 14),
    expiryCheck: l2[14],
    composite: l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29),
    compositeCheck: l2[29],
  });
}

const LENGTHS = [30, 36, 44] as const;

/** One OCR line as an MRZ candidate: only MRZ characters, nudged to the nearest real line length. */
function candidate(raw: string): string | null {
  const text = raw
    .toUpperCase()
    .replace(/[«‹〈]/g, "<")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");
  if (text.length < 25 || (text.match(/</g)?.length ?? 0) < 2) return null;
  let best: number | null = null;
  for (const length of LENGTHS) {
    const gap = Math.abs(text.length - length);
    if (gap <= 3 && (best === null || gap < Math.abs(text.length - best))) best = length;
  }
  if (best === null) return null;
  return text.length >= best ? text.slice(0, best) : text.padEnd(best, "<");
}

/** The best reading of the document in this OCR text, or null when there is no strip in it. */
export function parseMrz(ocrText: string): MrzResult | null {
  const lines = ocrText.split(/\r?\n/).map(candidate).filter((line): line is string => line !== null);
  const results: MrzResult[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const [a, b, c] = [lines[i], lines[i + 1], lines[i + 2]];
    if (a?.length === 44 && b?.length === 44) results.push(td3(a, b));
    else if (a?.length === 36 && b?.length === 36) results.push(td2(a, b));
    else if (a?.length === 30 && b?.length === 30 && c?.length === 30) results.push(td1(a, b, c));
  }
  if (results.length === 0) return null;
  return results.find((result) => result.confident) ?? results[0];
}

const CURP = /[A-Z]{4}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d/;

/** A Mexican CURP printed anywhere in the text, or "". */
export function findCurp(ocrText: string): string {
  for (const line of ocrText.toUpperCase().split(/\r?\n/)) {
    const hit = CURP.exec(line.replace(/[^A-Z0-9]/g, ""));
    if (hit) return hit[0];
  }
  return "";
}

/**
 * What a read fills in, as packet answers. A card's document number is not a passport number,
 * so only a passport sets the passport questions. Anything the strip does not carry is left alone.
 */
export function mrzAnswers(result: MrzResult | null, curp: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (result) {
    if (result.surname) out.surname = result.surname;
    if (result.givenNames) out.givenNames = result.givenNames;
    if (result.sex) out.sex = result.sex;
    if (result.birthDate) out.birthDate = result.birthDate;
    const nationality = MRZ_COUNTRIES[result.nationality]?.demonym;
    if (nationality) out.nationality = nationality;
    if (result.kind === "passport") {
      if (result.documentNumber) out.passportNumber = result.documentNumber;
      const issuer = MRZ_COUNTRIES[result.issuer]?.country;
      if (issuer) out.issueCountry = issuer;
      if (result.expiryDate) out.expiryDate = result.expiryDate;
    }
  }
  if (curp) out.curp = curp;
  return out;
}
