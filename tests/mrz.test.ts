import { describe, expect, it } from "vitest";
import { checkDigit, findCurp, mrzAnswers, parseMrz } from "@/lib/mrz";

// The specimen documents printed in ICAO Doc 9303.
const TD3 = ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"];
const TD2 = ["I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<", "D231458907UTO7408122F1204159<<<<<<<6"];
const TD1 = ["I<UTOD231458907<<<<<<<<<<<<<<<", "7408122F1204159UTO<<<<<<<<<<<6", "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"];

describe("check digits", () => {
  it("matches the specimen digits", () => {
    expect(checkDigit("L898902C3")).toBe(6);
    expect(checkDigit("740812")).toBe(2);
    expect(checkDigit("120415")).toBe(9);
  });
});

describe("parseMrz", () => {
  it("reads a passport and trusts it when every check digit passes", () => {
    const result = parseMrz(TD3.join("\n"));
    expect(result).toMatchObject({
      format: "TD3",
      kind: "passport",
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
      documentNumber: "L898902C3",
      nationality: "UTO",
      birthDate: "1974-08-12",
      expiryDate: "2012-04-15",
      sex: "female",
      confident: true,
    });
  });

  it("reads a two-line card and a three-line ID card", () => {
    expect(parseMrz(TD2.join("\n"))).toMatchObject({ format: "TD2", kind: "card", surname: "ERIKSSON", confident: true });
    expect(parseMrz(TD1.join("\n"))).toMatchObject({
      format: "TD1",
      kind: "card",
      documentNumber: "D23145890",
      birthDate: "1974-08-12",
      confident: true,
    });
  });

  it("finds the strip among other printed text, with spaces and lookalike characters", () => {
    const noisy = [
      "UNITED STATES OF UTOPIA",
      "PASSPORT / PASAPORTE",
      "Surname ERIKSSON",
      TD3[0].replace("<<ANNA", "<< ANNA"),
      // Letters where digits belong, and a stray space.
      "L898902C36UTO74O8l22F12O4159ZE184226B<<<<<1 0",
      "",
    ].join("\n");
    const result = parseMrz(noisy);
    expect(result).toMatchObject({ birthDate: "1974-08-12", expiryDate: "2012-04-15", confident: true });
  });

  it("drops filler that OCR read as letters, without cutting a name that ends in K, L, or C", () => {
    const line2 = TD3[1];
    const misread = "P<MEXERIKSSON<<ANNA<MARIA<KLLLLLLLLLLLLLLLLL".padEnd(44, "L");
    expect(parseMrz([misread, line2].join("\n"))).toMatchObject({ surname: "ERIKSSON", givenNames: "ANNA MARIA" });

    const michael = "P<MEXERIKSSON<<MICHAEL<<<<<<<<<<<<<<<<<<<<<<".slice(0, 44);
    expect(parseMrz([michael, line2].join("\n"))?.givenNames).toBe("MICHAEL");
    const trailing = "P<MEXERIKSSON<<ANNA<MICHAEL<<<<KLLLLLLLLLLLL".padEnd(44, "L");
    expect(parseMrz([trailing, line2].join("\n"))?.givenNames).toBe("ANNA MICHAEL");
  });

  it("does not trust a wrong date, and says so", () => {
    const wrong = TD3[1].replace("7408122", "7408132"); // the check digit no longer fits
    const result = parseMrz([TD3[0], wrong].join("\n"));
    expect(result?.confident).toBe(false);
    expect(result?.birthDate).toBe("");
  });

  it("returns null when there is no strip", () => {
    expect(parseMrz("")).toBeNull();
    expect(parseMrz("Just a photo of a cat\nwith some words")).toBeNull();
  });

  it("puts the right century on a birth date, and 20xx on an expiry", () => {
    // Builds a passport whose check digits all pass, so only the century is in question.
    function passport(birth: string, expiry: string): string {
      const number = "L898902C3";
      const personal = "<<<<<<<<<<<<<<";
      const head = `${number}${checkDigit(number)}UTO${birth}${checkDigit(birth)}F${expiry}${checkDigit(expiry)}${personal}${checkDigit(personal)}`;
      const composite = head.slice(0, 10) + head.slice(13, 20) + head.slice(21, 43);
      return [TD3[0], `${head}${checkDigit(composite)}`].join("\n");
    }
    const thisYear = new Date().getFullYear() % 100;
    const old = String((thisYear + 1) % 100).padStart(2, "0");
    const recent = String(thisYear).padStart(2, "0");

    const grown = parseMrz(passport(`${old}0101`, "350101"));
    expect(grown?.confident).toBe(true);
    expect(grown?.birthDate).toBe(`${old > String(thisYear) ? 1900 + Number(old) : 2000 + Number(old)}-01-01`);
    expect(grown?.birthDate.startsWith("19")).toBe(true);
    expect(grown?.expiryDate).toBe("2035-01-01");

    expect(parseMrz(passport(`${recent}0101`, "350101"))?.birthDate).toBe(`${2000 + thisYear}-01-01`);
  });
});

describe("mrzAnswers", () => {
  it("fills a passport's questions", () => {
    const answers = mrzAnswers(parseMrz(TD3.join("\n").replace(/UTO/g, "MEX")), "");
    expect(answers).toMatchObject({
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
      sex: "female",
      birthDate: "1974-08-12",
      nationality: "Mexican",
      passportNumber: "L898902C3",
      issueCountry: "Mexico",
      expiryDate: "2012-04-15",
    });
  });

  it("never calls an ID card's number a passport number", () => {
    const answers = mrzAnswers(parseMrz(TD1.join("\n")), "");
    expect(answers.passportNumber).toBeUndefined();
    expect(answers.expiryDate).toBeUndefined();
    expect(answers.surname).toBe("ERIKSSON");
  });

  it("adds a CURP and leaves out countries it does not know", () => {
    const answers = mrzAnswers(parseMrz(TD3.join("\n")), "GALM920415MTSRPR09");
    expect(answers.curp).toBe("GALM920415MTSRPR09");
    expect(answers.nationality).toBeUndefined();
  });
});

describe("findCurp", () => {
  it("finds a CURP on a line of an INE front", () => {
    expect(findCurp("CREDENCIAL PARA VOTAR\nCURP GALM920415 MTSRPR09\nSEXO M")).toBe("GALM920415MTSRPR09");
    expect(findCurp("nothing here")).toBe("");
  });
});
