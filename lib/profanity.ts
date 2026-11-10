/** Client-safe. No server imports here. */

/**
 * A language check for the bridge chat, English and Spanish. It is a first line, not a judge: a word
 * list cannot read intent, so harassment in clean words still needs a person. What it does is stop
 * the obvious abuse before it is posted, cheaply, in the browser (instant feedback) and on the
 * server (the rule that counts).
 *
 * Whole words only, so "class", "assistant", "Scunthorpe" and "cocktail" pass. Common disguises are
 * undone first: accents, leet digits and symbols (`sh1t`, `@ss`), stretched letters (`fuuuck`),
 * and letters spaced out (`f.u.c.k`, `p u t a`). Words are stored without accents.
 */

const WORDS = new Set(
  [
    // English: profanity
    "fuck", "fucks", "fucker", "fuckers", "fucking", "fucked", "fuckin", "fuckn", "fukin", "fck", "fuk",
    "fuker", "phuck", "phuk", "fuckface", "fuckhead", "fuckwit", "motherfucker", "motherfuckers",
    "mofo", "mofos", "wtfuck", "stfu",
    "shit", "shits", "shitty", "shyt", "shitface", "shithead", "shitshow", "shitbag", "shitass",
    "bullshit", "horseshit", "dipshit", "dumbshit", "apeshit",
    "bitch", "bitches", "bitchy", "bitching", "bitchass", "sonofabitch",
    "bastard", "bastards", "asshole", "assholes", "asshat", "assface", "asswipe", "assclown",
    "ass", "jackass", "dumbass", "smartass", "fatass", "lameass", "kissass", "badass",
    "arse", "arsehole", "bollocks", "bellend", "wanker", "tosser", "twat", "prick", "pricks",
    "douche", "douchebag", "douchebags",
    "dick", "dicks", "dickhead", "dickwad", "dickface", "cock", "cocks", "cocksucker", "cocksuckers",
    "pussy", "cunt", "cunts", "blowjob", "blowjobs", "handjob", "jerkoff", "wank", "jizz", "cumshot",
    "tits", "titties", "clit", "nutsack", "ballsack", "numbnuts", "dildo", "anus",
    "whore", "whores", "whorebag", "slut", "sluts", "slutty", "skank", "thot", "hooker",
    "piss", "pissed", "pisser", "kys",
    // English: slurs
    "retard", "retarded", "retards", "libtard", "spastic", "mongoloid",
    "fag", "fags", "faggot", "faggots", "tranny", "lesbo",
    "nigger", "niggers", "nigga", "niggas", "nigra", "niglet", "darkie", "sambo", "jigaboo", "coon",
    "spic", "spics", "wetback", "wetbacks", "beaner", "beaners", "greaser", "chink", "chinks", "gook",
    "gooks", "zipperhead", "slanteye", "kike", "kikes", "kyke", "heeb", "yid", "paki", "raghead",
    "towelhead", "wop", "dago", "squaw", "honky",
    // Spanish: profanity
    "puta", "putas", "puto", "putos", "putamadre", "putazo", "putiza", "putear", "puteada", "putita",
    "hijueputa", "hijoputa", "hijodeputa", "hijoeputa", "hdp", "ptm", "ctm", "conchatumadre",
    "conchesumadre", "chingatumadre", "valemadre", "valemadres",
    "pendejo", "pendeja", "pendejos", "pendejas", "pendejada", "pendejadas",
    "cabron", "cabrona", "cabrones", "cabronazo", "cabronas",
    "chingar", "chingada", "chingado", "chingados", "chingadera", "chingaderas", "chinga", "chingas",
    "chingue", "chinguen", "chingate", "chingatela",
    "verga", "vergas", "vergazo", "mierda", "mierdas", "mierdero", "culero", "culera", "culo", "culos",
    "culiao", "culiado", "culiada", "ojete", "ojetes", "pinche", "pinches", "pija", "pijas", "pichula",
    "joto", "jotos", "maricon", "maricones", "marica", "mariconas", "mamon", "mamona", "mamada",
    "mamadas", "mamabicho", "mamaguevo", "mames", "zorra", "zorras", "furcia", "ramera", "cagada",
    "cagar", "cagado", "carajo", "carajos", "joder", "jodido", "jodida", "jodete", "gilipollas",
    "huevon", "huevona", "weon", "weona", "aweonao", "boludo", "boluda", "pelotudo", "pelotuda",
    "malparido", "malparida", "gonorrea", "pajero", "pajera", "puneta", "punetas",
    "frijolero", "frijolera",
  ].map((word) => word.toLowerCase()),
);

/** Unambiguous enough to catch inside a longer token (`xxniggaxx`, `fuckface`). Nothing here is a real word. */
const STRONG = [
  "nigger", "nigga", "faggot", "fuck", "shit", "bitch", "asshole", "dickhead", "whore", "mierda",
  "cabron", "motherfuck", "cocksuck", "chingad", "pendej", "hijueputa",
];

/** Real words that happen to hold a STRONG string. */
const SAFE = new Set(["shitake", "shitakes", "mishit", "mishits", "mishitting", "shittim"]);

const SUFFIXES = ["s", "es", "ed", "ing"];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i",
};

function fold(text: string, leet: boolean): string {
  const plain = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return leet ? plain.replace(/[013457@$!]/g, (char) => LEET[char] ?? char) : plain;
}

/** Words, with any run of single letters (`f u c k`) joined back into one. */
function tokens(folded: string): string[] {
  const out: string[] = [];
  let run = "";
  for (const part of folded.split(/[^a-z]+/)) {
    if (!part) continue;
    if (part.length === 1) {
      run += part;
      continue;
    }
    if (run) out.push(run);
    run = "";
    out.push(part);
  }
  if (run) out.push(run);
  return out;
}

/** `fuuuck` as `fuck` and as `fuuck`; `assss` as `ass`. */
function shrink(token: string, keep: number): string {
  return token.replace(/(.)\1{2,}/g, (_, char: string) => char.repeat(keep));
}

function forms(token: string): string[] {
  const bases = [token, shrink(token, 1), shrink(token, 2)];
  const all = new Set(bases);
  for (const base of bases) {
    for (const suffix of SUFFIXES) {
      if (base.endsWith(suffix) && base.length - suffix.length >= 3) {
        all.add(base.slice(0, -suffix.length));
      }
    }
  }
  return [...all];
}

function tokenIsBad(token: string): boolean {
  if (forms(token).some((form) => WORDS.has(form))) return true;
  if (token.length < 5 || SAFE.has(token)) return false;
  return STRONG.some((strong) => token.includes(strong));
}

/** True when the text holds a word this chat does not allow. */
export function hasProfanity(text: string): boolean {
  for (const leet of [false, true]) {
    if (tokens(fold(text, leet)).some(tokenIsBad)) return true;
  }
  return false;
}
