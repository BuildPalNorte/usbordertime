import { describe, expect, it } from "vitest";
import { hasProfanity } from "@/lib/profanity";

describe("hasProfanity", () => {
  it("lets ordinary border talk through", () => {
    for (const text of [
      "Line is moving fast, about 30 min",
      "Two lanes closed at the bridge",
      "Matamoros side looks clear",
      "Scunthorpe",
      "class assignment for my assistant",
      "cocktail and a classic cocker spaniel",
      "pass the bus, it was as bad as yesterday",
      "analysis of the bassoon",
      "Hello! Buenas tardes, la fila va rápido",
      "El puente está lleno, no hay carriles abiertos",
      "I a m here",
      "shiitake and shitake mushrooms, a mishit golf shot",
      "Vergara called, la computadora no prende",
      "Cumbria, the title, a pass, a badge, a glass of water",
      "Traffic cone by the left lane, cono naranja",
      "Okay! Great! Almost there!",
      "Pasé por la aduana y no había fila",
      "Buenas tardes, nos vemos en la tarde",
    ]) {
      expect(hasProfanity(text), text).toBe(false);
    }
  });

  it("catches plain words in both languages", () => {
    for (const text of ["this is shit", "what a bitch", "que pendejo", "eres un PENDEJO!!", "puta madre", "bullshit line", "no mames", "carajo que fila", "joder", "stfu"]) {
      expect(hasProfanity(text), text).toBe(true);
    }
  });

  it("catches the usual disguises", () => {
    for (const text of ["sh1t", "@ss", "f.u.c.k", "f u c k", "fuuuuck", "p u t a", "Pendéjo", "fucking line", "asses", "xxniggaxx", "motherfucking", "fuckface", "sh!t", "pendejadas", "malditos pinches"]) {
      expect(hasProfanity(text), text).toBe(true);
    }
  });

  it("catches slurs aimed at the people who cross", () => {
    expect(hasProfanity("go home wetback")).toBe(true);
  });
});
