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
        id: "how-estimate",
        question: "How does Border Time estimate a wait?",
        answer:
          "The number is one stretch: from the back of that lane’s line to the primary inspection booth, the moment you reach the officer. When the queue is long, the back of the line can be in the other country. The drive to the line, the time with the officer, and a second inspection are left out. The average under the live number is the usual length of that same stretch for this hour. Border Time does not time the line.",
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
      {
        id: "canada-coverage",
        question: "Does Border Time include the Canadian border?",
        answer:
          "Yes. Border Time shows the U.S. land ports CBP publishes on the Canadian border as well as the Mexican border. The number is the wait to enter the United States. Peace Arch, the Detroit–Windsor crossings, the Buffalo–Niagara bridges, and Champlain are included when CBP lists them.",
      },
      {
        id: "sentri-vs-nexus",
        question: "What is the difference between SENTRI and NEXUS?",
        answer:
          "SENTRI is the trusted-traveler lane on the Mexican border. NEXUS is the trusted-traveler lane on the Canadian border. Border Time labels that lane SENTRI at a Mexican port and NEXUS at a Canadian port. They are separate from Ready Lane.",
      },
      {
        id: "truck-wait",
        question: "Which border wait should a truck driver read?",
        answer:
          "Read the commercial lane, or FAST if the driver and the load are enrolled in FAST. A passenger wait is a different line. Truck crossings such as Otay Mesa, Mariposa, World Trade, Pharr, and the Ambassador Bridge post their own commercial number.",
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
        id: "how-estimate",
        question: "¿Cómo estima Border Time una espera?",
        answer:
          "El número es un solo tramo: del final de la fila de ese carril a la caseta de inspección primaria, el momento en que llegas con el oficial. Si la cola es larga, el final de la fila puede estar en el otro país. El trayecto hasta la fila, el tiempo con el oficial y una segunda revisión quedan fuera. El promedio debajo del número en vivo es el largo usual de ese mismo tramo para esta hora. Border Time no mide la fila.",
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
      {
        id: "canada-coverage",
        question: "¿Border Time incluye la frontera con Canadá?",
        answer:
          "Sí. Border Time muestra los puertos terrestres de Estados Unidos que publica CBP en la frontera con Canadá y en la frontera con México. El número es la espera para entrar a Estados Unidos. Peace Arch, los cruces de Detroit–Windsor, los puentes de Buffalo–Niagara y Champlain entran cuando CBP los lista.",
      },
      {
        id: "sentri-vs-nexus",
        question: "¿Cuál es la diferencia entre SENTRI y NEXUS?",
        answer:
          "SENTRI es el carril de viajero confiable en la frontera con México. NEXUS es el de la frontera con Canadá. Border Time nombra ese carril SENTRI en un puerto de México y NEXUS en un puerto de Canadá. Los dos son distintos del carril Ready.",
      },
      {
        id: "truck-wait",
        question: "¿Qué espera debe leer quien maneja un camión?",
        answer:
          "Lee el carril comercial, o FAST si el conductor y la carga están inscritos en FAST. La espera de pasajeros es otra fila. Cruces de camiones como Otay Mesa, Mariposa, World Trade, Pharr y el Ambassador Bridge publican su propio número comercial.",
      },
    ],
  },
};
