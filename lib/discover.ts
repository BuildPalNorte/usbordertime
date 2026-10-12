import type { Locale } from "@/lib/i18n";

/**
 * Facts answer engines can quote. The guides index shows them, /llms.txt points at them,
 * and the page schema repeats them. No entry includes a live wait.
 */

export type DiscoverFaq = {
  /** Stable fragment, shared by both languages. */
  id: string;
  question: string;
  answer: string;
};

export type DiscoverCopy = {
  faqTitle: string;
  faqs: readonly DiscoverFaq[];
};

export const DISCOVER: Record<Locale, DiscoverCopy> = {
  en: {
    faqTitle: "Questions about the waits",
    faqs: [
      {
        id: "what-is-border-time",
        question: "What is Border Time?",
        answer:
          "Border Time is an independent app published by BuildPalNorte at usbordertime.com. It shows live wait times at U.S. land ports of entry, taken from the public CBP feed, in English and Spanish.",
      },
      {
        id: "where-wait-times-come-from",
        question: "Where do Border Time wait times come from?",
        answer:
          "The numbers come from the public border-wait feed published by U.S. Customs and Border Protection. Border Time does not time the line itself. CBP updates the posted wait through the day, and the app shows that reading.",
      },
      {
        id: "official-source",
        question: "Is Border Time the official CBP site?",
        answer:
          "U.S. Customs and Border Protection posts the official wait times. Border Time is an independent app published by BuildPalNorte that reads that public feed and shows it in English and Spanish.",
      },
      {
        id: "check-a-wait-now",
        question: "How do I check a border wait time right now?",
        answer:
          "Open Border Time at usbordertime.com and sign in with Google. The live minute for each lane is in the app. These guides explain which crossing and which lane a number refers to, and they leave the current wait out because that number changes through the day.",
      },
      {
        id: "which-crossings",
        question: "Which border crossings does Border Time cover?",
        answer:
          "Border Time covers the U.S. land ports of entry that CBP publishes, on the Mexican and Canadian borders. That includes San Ysidro, Otay Mesa, and Tecate; the El Paso–Juárez bridges; the Laredo bridges; the Brownsville–Matamoros bridges; Pharr and Hidalgo; and Calexico–Mexicali. A crossing only lists the lanes it has.",
      },
      {
        id: "sentri-vs-ready",
        question: "What is the difference between SENTRI and Ready Lane?",
        answer:
          "SENTRI is the trusted-traveler lane on the Mexican border and needs a SENTRI membership. Ready Lane is for travelers whose cards have the RFID chip, such as a passport card or an enhanced driver's license. They are separate lines, so read the wait for the lane you will actually use.",
      },
      {
        id: "blank-wait",
        question: "What does a blank border wait mean?",
        answer:
          "A blank, “update pending”, or “N/A” means there is no reading. A posted 0 or “no delay” means CBP measured no delay. Pending is a gap in the data, and N/A means that crossing does not offer the lane.",
      },
    ],
  },
  es: {
    faqTitle: "Preguntas sobre las esperas",
    faqs: [
      {
        id: "what-is-border-time",
        question: "¿Qué es Border Time?",
        answer:
          "Border Time es una app independiente publicada por BuildPalNorte en usbordertime.com. Muestra en vivo los tiempos de espera de los puertos terrestres de entrada a Estados Unidos, tomados del feed público de CBP, en inglés y en español.",
      },
      {
        id: "where-wait-times-come-from",
        question: "¿De dónde salen los tiempos de espera de Border Time?",
        answer:
          "Los números salen del feed público de tiempos de espera que publica la Oficina de Aduanas y Protección Fronteriza de Estados Unidos (CBP). Border Time no mide la fila. CBP actualiza el tiempo publicado a lo largo del día, y la app muestra esa lectura.",
      },
      {
        id: "official-source",
        question: "¿Border Time es el sitio oficial de CBP?",
        answer:
          "La Oficina de Aduanas y Protección Fronteriza de Estados Unidos (CBP) publica los tiempos oficiales. Border Time es una app independiente publicada por BuildPalNorte que lee ese feed público y lo muestra en inglés y en español.",
      },
      {
        id: "check-a-wait-now",
        question: "¿Cómo veo un tiempo de espera ahora mismo?",
        answer:
          "Abre Border Time en usbordertime.com e inicia sesión con Google. El minuto en vivo de cada carril está en la app. Estas guías explican a qué cruce y a qué carril se refiere un número, y dejan fuera la espera de este momento porque ese número cambia a lo largo del día.",
      },
      {
        id: "which-crossings",
        question: "¿Qué cruces cubre Border Time?",
        answer:
          "Border Time cubre los puertos terrestres de entrada a Estados Unidos que publica CBP, en las fronteras con México y con Canadá. Eso incluye San Ysidro, Otay Mesa y Tecate; los puentes de El Paso–Juárez; los de Laredo; los de Brownsville–Matamoros; Pharr e Hidalgo; y Calexico–Mexicali. Un cruce solo muestra los carriles que tiene.",
      },
      {
        id: "sentri-vs-ready",
        question: "¿Cuál es la diferencia entre SENTRI y el carril Ready?",
        answer:
          "SENTRI es el carril de viajero confiable en la frontera con México y requiere membresía SENTRI. El carril Ready es para viajeros con tarjetas que traen el chip RFID, como la tarjeta de pasaporte o una licencia de conducir mejorada. Son filas distintas, así que lee la espera del carril que de verdad vas a usar.",
      },
      {
        id: "blank-wait",
        question: "¿Qué significa un tiempo de espera en blanco?",
        answer:
          "Un espacio en blanco, “actualización pendiente” o “N/A” significa que no hay lectura. Un 0 publicado o “sin demora” significa que CBP midió que no hay demora. Pendiente es un hueco en los datos, y N/A significa que ese cruce no ofrece el carril.",
      },
    ],
  },
};
