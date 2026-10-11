import type { Locale } from "@/lib/i18n";

/**
 * Public crossing guides. Client-safe: no server imports.
 * Every guide is written twice, with its own slug in each language.
 * No guide quotes a live wait. The app owns that number.
 */

export type GuideSection = { heading: string; paragraphs: string[] };

export type GuideText = {
  slug: string;
  /** Short name for links and the index. */
  label: string;
  title: string;
  description: string;
  lead: string;
  sections: GuideSection[];
};

export type Guide = {
  id: string;
  /** Guides to point at when this one ends. */
  related: string[];
  en: GuideText;
  es: GuideText;
};

export const GUIDES_BASE: Record<Locale, string> = {
  en: "/guides",
  es: "/es/guias",
};

export const GUIDES: readonly Guide[] = [
  {
    id: "read-a-wait",
    related: ["san-ysidro-otay", "el-paso-juarez", "brownsville-matamoros"],
    en: {
      slug: "how-to-read-a-border-wait",
      label: "How to read a border wait",
      title: "How to read a border wait time",
      description:
        "What CBP border wait times mean: the six lanes, SENTRI versus Ready Lane, why a blank is not zero, and when a wait counts as long.",
      lead: "U.S. Customs and Border Protection (CBP) posts a wait for each lane at each crossing. The number is useful once you know which lane it describes and what it leaves out.",
      sections: [
        {
          heading: "The six lanes",
          paragraphs: [
            "Standard passenger is the regular car lane. Ready Lane is for travelers whose cards have the RFID chip, such as a passport card or an enhanced license. SENTRI is the trusted-traveler lane on the Mexican border and needs a SENTRI membership.",
            "Pedestrian is the walking lane. Commercial is the standard truck lane, and FAST is the faster truck lane for enrolled drivers and loads. A crossing only lists the lanes it has, so a bridge with no pedestrian lane shows none.",
          ],
        },
        {
          heading: "A blank is not zero",
          paragraphs: [
            "A posted 0 or “no delay” means CBP measured no delay. A blank, “update pending”, or “N/A” means there is no reading. Pending is a gap in the data, not a short line, and N/A means that crossing does not offer the lane.",
            "“Lanes closed” and a closed port are different from a short wait. If no lanes are open, there is nothing to wait in.",
          ],
        },
        {
          heading: "What counts as long",
          paragraphs: [
            "Border Time colors a wait clear at 15 minutes or less, moderate from 16 to 45 minutes, and a long wait above 45. Those are our bands for reading the number quickly, not a CBP standard.",
            "A wait is CBP’s report of how long a vehicle entering the line now is expected to spend before reaching the booth. It is not a measurement of your crossing, and it moves fast around rush hours, holidays, and after an incident on the bridge.",
          ],
        },
        {
          heading: "Use the usual wait, not just the live one",
          paragraphs: [
            "The live number tells you about now. The usual wait for this hour tells you whether now is normal. Border Time shows both on a crossing, so a 40-minute wait on a bridge that usually runs 15 is a different decision from 40 on a bridge that always runs 40.",
          ],
        },
      ],
    },
    es: {
      slug: "como-leer-un-tiempo-de-espera",
      label: "Cómo leer un tiempo de espera",
      title: "Cómo leer un tiempo de espera en la frontera",
      description:
        "Qué significan los tiempos de espera de CBP: los seis carriles, SENTRI contra carril Ready, por qué un espacio en blanco no es cero y cuándo una espera es larga.",
      lead: "La Oficina de Aduanas y Protección Fronteriza de Estados Unidos (CBP) publica una espera para cada carril de cada cruce. El número sirve cuando sabes a qué carril se refiere y qué deja fuera.",
      sections: [
        {
          heading: "Los seis carriles",
          paragraphs: [
            "El carril estándar de pasajeros es el de autos normal. El carril Ready es para viajeros con tarjetas que traen el chip RFID, como la tarjeta de pasaporte o una licencia mejorada. SENTRI es el carril de viajero confiable en la frontera con México y requiere membresía SENTRI.",
            "Peatonal es el carril para cruzar caminando. Comercial es el carril estándar de camiones y FAST es el carril rápido para conductores y cargas inscritos. Un cruce solo muestra los carriles que tiene, así que un puente sin carril peatonal no muestra ninguno.",
          ],
        },
        {
          heading: "Un espacio en blanco no es cero",
          paragraphs: [
            "Un 0 publicado o “sin demora” significa que CBP midió que no hay demora. Un espacio en blanco, “actualización pendiente” o “N/A” significa que no hay lectura. Pendiente es un hueco en los datos, no una fila corta, y N/A significa que ese cruce no ofrece el carril.",
            "“Carriles cerrados” y un puerto cerrado no son lo mismo que una espera corta. Si no hay carriles abiertos, no hay fila que esperar.",
          ],
        },
        {
          heading: "Qué cuenta como larga",
          paragraphs: [
            "Border Time marca una espera como libre con 15 minutos o menos, moderada de 16 a 45 minutos y larga por encima de 45. Son nuestros rangos para leer el número rápido, no un estándar de CBP.",
            "La espera es el reporte de CBP de cuánto se espera que tarde un vehículo que se forma ahora hasta llegar a la caseta. No mide tu cruce, y cambia rápido en horas pico, en días festivos y después de un incidente en el puente.",
          ],
        },
        {
          heading: "Mira la espera usual, no solo la actual",
          paragraphs: [
            "El número en vivo te dice cómo está ahora. La espera usual para esta hora te dice si ahora es normal. Border Time muestra las dos en cada cruce, así que 40 minutos en un puente que suele tener 15 es una decisión distinta a 40 en uno que siempre tiene 40.",
          ],
        },
      ],
    },
  },
  {
    id: "san-ysidro-otay",
    related: ["read-a-wait", "walking-across", "calexico-mexicali"],
    en: {
      slug: "san-ysidro-otay-mesa-wait",
      label: "San Ysidro and Otay Mesa",
      title: "San Ysidro and Otay Mesa border wait times",
      description:
        "San Ysidro or Otay Mesa? Which San Diego–Tijuana crossing fits cars, pedestrians, and trucks, and how to read each one's wait.",
      lead: "San Diego has two big crossings into Tijuana, and they are built for different traffic. Picking the right one is often worth more than picking the right hour.",
      sections: [
        {
          heading: "San Ysidro",
          paragraphs: [
            "San Ysidro is the main passenger crossing and the one most people mean when they say “the San Diego border”. It has standard, Ready, and SENTRI lanes for cars and separate pedestrian lanes. It does not take commercial trucks.",
            "Its pedestrian crossing is listed separately from the car lanes, so check the pedestrian wait if you are on foot rather than reading the car number.",
          ],
        },
        {
          heading: "Otay Mesa",
          paragraphs: [
            "Otay Mesa sits farther east and is the big commercial crossing in the region, with standard and FAST truck lanes. It also has passenger car and pedestrian lanes, which makes it the usual alternative when San Ysidro is backed up and you are coming from the east side of San Diego.",
            "If you drive a truck, Otay Mesa is the crossing to read. If you drive a car, compare it against San Ysidro before you commit to a route.",
          ],
        },
        {
          heading: "Tecate",
          paragraphs: [
            "Tecate is a smaller crossing about an hour east. It is quieter, has shorter hours than the big two, and is worth checking if the drive suits you. It is not a substitute for San Ysidro when you are in the city.",
          ],
        },
        {
          heading: "Choosing between them",
          paragraphs: [
            "Compare the same lane on both. A SENTRI card makes the SENTRI lane the one to read, and a Ready card makes Ready the one to read. Add the drive between the two crossings to the difference before you switch.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-san-ysidro-otay",
      label: "San Ysidro y Otay Mesa",
      title: "Tiempo de espera en San Ysidro y Otay Mesa",
      description:
        "¿San Ysidro u Otay Mesa? Qué cruce entre San Diego y Tijuana conviene para autos, peatones y camiones, y cómo leer su espera.",
      lead: "San Diego tiene dos cruces grandes hacia Tijuana y están hechos para tráfico distinto. Elegir el correcto suele valer más que elegir la hora correcta.",
      sections: [
        {
          heading: "San Ysidro",
          paragraphs: [
            "San Ysidro es el cruce principal de pasajeros y el que casi todos llaman “la garita de San Diego”. Tiene carriles estándar, Ready y SENTRI para autos y carriles peatonales aparte. No recibe camiones comerciales.",
            "El cruce peatonal aparece separado de los carriles de autos, así que si vas a pie revisa la espera peatonal y no la de autos.",
          ],
        },
        {
          heading: "Otay Mesa",
          paragraphs: [
            "Otay Mesa está más al este y es el cruce comercial grande de la región, con carriles estándar y FAST para camiones. También tiene carriles de autos y peatones, por eso es la alternativa usual cuando San Ysidro está lleno y vienes del este de San Diego.",
            "Si manejas un camión, Otay Mesa es el cruce que debes mirar. Si manejas un auto, compáralo con San Ysidro antes de decidir la ruta.",
          ],
        },
        {
          heading: "Tecate",
          paragraphs: [
            "Tecate es un cruce más pequeño, como una hora al este. Es más tranquilo, tiene horario más corto que los dos grandes y vale la pena revisarlo si el camino te conviene. No sustituye a San Ysidro cuando estás en la ciudad.",
          ],
        },
        {
          heading: "Cómo elegir entre ellos",
          paragraphs: [
            "Compara el mismo carril en los dos. Con tarjeta SENTRI el carril a mirar es SENTRI, y con tarjeta Ready es Ready. Suma el trayecto entre los dos cruces a la diferencia antes de cambiar.",
          ],
        },
      ],
    },
  },
  {
    id: "el-paso-juarez",
    related: ["read-a-wait", "walking-across", "laredo"],
    en: {
      slug: "el-paso-juarez-bridges",
      label: "El Paso–Juárez bridges",
      title: "El Paso–Juárez bridges and wait times",
      description:
        "Paso del Norte, Stanton, Ysleta, Bridge of the Americas, and Tornillo: what each El Paso crossing is for and how to compare their waits.",
      lead: "“El Paso” is not one crossing. Each bridge serves a different part of the city and Ciudad Juárez, and the waits can be far apart at the same minute.",
      sections: [
        {
          heading: "Paso del Norte and Stanton",
          paragraphs: [
            "Paso del Norte is the downtown bridge and the one most pedestrians use, since it lands steps from downtown El Paso. Stanton Street is next to it and also takes cars and walkers, which makes it the first alternative when Paso del Norte is slow.",
          ],
        },
        {
          heading: "Bridge of the Americas",
          paragraphs: [
            "Bridge of the Americas, often called BOTA or the free bridge, connects the central part of both cities. It carries cars and walkers and is a common choice for people coming from the east side of El Paso.",
          ],
        },
        {
          heading: "Ysleta",
          paragraphs: [
            "Ysleta, on the Zaragoza side, is farther southeast and is where trucks mostly cross. It also takes cars, and its waits often differ from the central bridges when downtown is crowded.",
          ],
        },
        {
          heading: "Tornillo",
          paragraphs: [
            "Tornillo is the far-east crossing, a drive from the city. Check it when the central bridges are long and the extra miles are worth the shorter line.",
          ],
        },
        {
          heading: "How to compare them",
          paragraphs: [
            "Read the same lane on every bridge. A Ready or SENTRI card changes which lane to read, and a pedestrian wait is never the car wait. Border Time lets you save the two or three bridges you would use, so the comparison sits in one place.",
          ],
        },
      ],
    },
    es: {
      slug: "puentes-el-paso-juarez",
      label: "Puentes El Paso–Juárez",
      title: "Puentes entre El Paso y Juárez y sus tiempos de espera",
      description:
        "Paso del Norte, Stanton, Ysleta, Puente de las Américas y Tornillo: para qué sirve cada cruce de El Paso y cómo comparar sus esperas.",
      lead: "“El Paso” no es un solo cruce. Cada puente atiende una parte distinta de la ciudad y de Ciudad Juárez, y las esperas pueden ser muy distintas en el mismo minuto.",
      sections: [
        {
          heading: "Paso del Norte y Stanton",
          paragraphs: [
            "Paso del Norte es el puente del centro y el que más usan los peatones, porque llega a pocos pasos del centro de El Paso. El puente Stanton está junto a él y también recibe autos y peatones, así que es la primera alternativa cuando Paso del Norte va lento.",
          ],
        },
        {
          heading: "Puente de las Américas",
          paragraphs: [
            "El Puente de las Américas, conocido como BOTA o puente libre, conecta la zona central de ambas ciudades. Recibe autos y peatones y es una opción común para quien viene del este de El Paso.",
          ],
        },
        {
          heading: "Ysleta",
          paragraphs: [
            "Ysleta, del lado de Zaragoza, está más al sureste y es por donde cruzan sobre todo los camiones. También recibe autos, y sus esperas suelen ser distintas a las de los puentes centrales cuando el centro está lleno.",
          ],
        },
        {
          heading: "Tornillo",
          paragraphs: [
            "Tornillo es el cruce del extremo este, a un trayecto de la ciudad. Revísalo cuando los puentes centrales estén largos y valgan la pena los kilómetros extra.",
          ],
        },
        {
          heading: "Cómo compararlos",
          paragraphs: [
            "Lee el mismo carril en todos los puentes. Una tarjeta Ready o SENTRI cambia qué carril leer, y la espera peatonal nunca es la espera de autos. En Border Time puedes guardar los dos o tres puentes que usarías y comparar todo en un lugar.",
          ],
        },
      ],
    },
  },
  {
    id: "laredo",
    related: ["read-a-wait", "el-paso-juarez", "brownsville-matamoros"],
    en: {
      slug: "laredo-bridge-wait-times",
      label: "Laredo bridges",
      title: "Laredo bridge wait times: passenger and truck crossings",
      description:
        "Which Laredo bridge for cars and which for trucks: Gateway to the Americas, Juárez–Lincoln, Colombia, and World Trade, and how to read their waits.",
      lead: "Laredo handles more truck traffic than almost any other land port, so some of its bridges are built around trucks and not around cars.",
      sections: [
        {
          heading: "Bridges for cars and people",
          paragraphs: [
            "Gateway to the Americas, also called Bridge I, and Juárez–Lincoln, Bridge II, are the passenger crossings. Bridge I is the downtown one, near the old center of Laredo and the busiest for walkers. Bridge II is farther north and a useful alternative when Bridge I is slow.",
          ],
        },
        {
          heading: "Bridges for trucks",
          paragraphs: [
            "World Trade Bridge and Colombia Solidarity are the commercial crossings. World Trade carries most of the trucks. Colombia is farther northwest and often has a different wait. If you drive a truck, compare the standard and FAST truck lanes at both and ignore the passenger numbers.",
          ],
        },
        {
          heading: "Reading Laredo’s numbers",
          paragraphs: [
            "Each bridge lists only the lanes it offers. A truck bridge will show no car wait, and a passenger bridge will show no truck wait. A missing number there is expected, not a problem.",
            "Truck waits can swing a lot over a day, so the usual wait for the hour matters more than the live number alone.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-puentes-laredo",
      label: "Puentes de Laredo",
      title: "Tiempo de espera en los puentes de Laredo: pasajeros y camiones",
      description:
        "Qué puente de Laredo es para autos y cuál para camiones: Gateway to the Americas, Juárez–Lincoln, Colombia y World Trade, y cómo leer sus esperas.",
      lead: "Laredo maneja más tráfico de camiones que casi cualquier otro puerto terrestre, así que algunos de sus puentes están pensados para camiones y no para autos.",
      sections: [
        {
          heading: "Puentes para autos y personas",
          paragraphs: [
            "Gateway to the Americas, también llamado Puente I, y Juárez–Lincoln, el Puente II, son los cruces de pasajeros. El Puente I es el del centro, cerca del casco antiguo de Laredo y el más usado por peatones. El Puente II está más al norte y es una alternativa útil cuando el Puente I va lento.",
          ],
        },
        {
          heading: "Puentes para camiones",
          paragraphs: [
            "World Trade Bridge y Colombia Solidarity son los cruces comerciales. World Trade recibe la mayoría de los camiones. Colombia está más al noroeste y muchas veces tiene una espera distinta. Si manejas un camión, compara los carriles estándar y FAST en ambos e ignora los números de pasajeros.",
          ],
        },
        {
          heading: "Cómo leer los números de Laredo",
          paragraphs: [
            "Cada puente muestra solo los carriles que ofrece. Un puente de camiones no mostrará espera de autos, y uno de pasajeros no mostrará espera de camiones. Que falte un número ahí es normal, no un problema.",
            "Las esperas de camiones pueden variar mucho durante el día, así que la espera usual de la hora importa más que el número en vivo solo.",
          ],
        },
      ],
    },
  },
  {
    id: "brownsville-matamoros",
    related: ["read-a-wait", "walking-across", "rgv"],
    en: {
      slug: "brownsville-matamoros-bridges",
      label: "Brownsville–Matamoros bridges",
      title: "Brownsville–Matamoros bridges: Nuevo, Viejo, and De los tomates",
      description:
        "Nuevo, Viejo, and De los tomates: how Brownsville and Matamoros locals tell the bridges apart, and how to check each one's wait and live camera.",
      lead: "Ask anyone in Brownsville or Matamoros which bridge they take and you will hear Nuevo, Viejo, or De los tomates. CBP lists them under other names.",
      sections: [
        {
          heading: "Which name is which",
          paragraphs: [
            "Nuevo is the Gateway International Bridge. Viejo is the B&M, the Brownsville and Matamoros bridge. De los tomates is Veterans International. Border Time shows the names people use, with CBP’s name kept alongside so you can match them.",
          ],
        },
        {
          heading: "Nuevo and Viejo",
          paragraphs: [
            "The two older bridges are the ones close to downtown on both sides, and walkers and cars both use them. Their waits often move together, but not always, so it is worth checking both before choosing.",
            "Border Time shows a live camera for Nuevo and for Viejo, which lets you see the line and not just the number. Other crossings do not have one.",
          ],
        },
        {
          heading: "De los tomates",
          paragraphs: [
            "Veterans International is the newer bridge farther out. People use it to skip the downtown traffic, and it is the crossing that handles trucks. Its wait can be very different from the downtown pair, so a quick look is often worth the detour.",
          ],
        },
        {
          heading: "Saving your bridges",
          paragraphs: [
            "Most people who cross here use one or two bridges. Save those in Border Time and they stay at the top, and you can set an alert for when a wait drops under the time you want.",
          ],
        },
      ],
    },
    es: {
      slug: "puentes-brownsville-matamoros",
      label: "Puentes Brownsville–Matamoros",
      title: "Puentes Brownsville–Matamoros: Nuevo, Viejo y De los tomates",
      description:
        "Nuevo, Viejo y De los tomates: cómo distingue la gente de Brownsville y Matamoros los puentes, y cómo ver la espera y la cámara en vivo de cada uno.",
      lead: "Pregunta a cualquiera en Brownsville o Matamoros qué puente usa y oirás Nuevo, Viejo o De los tomates. CBP los lista con otros nombres.",
      sections: [
        {
          heading: "Cuál es cuál",
          paragraphs: [
            "Nuevo es el Gateway International Bridge. Viejo es el B&M, el puente Brownsville y Matamoros. De los tomates es Veterans International. Border Time muestra los nombres que usa la gente y deja el nombre de CBP al lado para que puedas relacionarlos.",
          ],
        },
        {
          heading: "Nuevo y Viejo",
          paragraphs: [
            "Los dos puentes más antiguos son los cercanos al centro en ambos lados, y los usan peatones y autos. Sus esperas muchas veces se mueven juntas, pero no siempre, así que conviene revisar los dos antes de elegir.",
            "Border Time muestra una cámara en vivo de Nuevo y de Viejo, para que veas la fila y no solo el número. Los demás cruces no tienen una.",
          ],
        },
        {
          heading: "De los tomates",
          paragraphs: [
            "Veterans International es el puente más nuevo y más alejado. La gente lo usa para evitar el tráfico del centro, y es el cruce que recibe camiones. Su espera puede ser muy distinta a la del par del centro, así que a menudo vale la pena mirarlo antes del desvío.",
          ],
        },
        {
          heading: "Guarda tus puentes",
          paragraphs: [
            "La mayoría de quienes cruzan aquí usa uno o dos puentes. Guárdalos en Border Time y se quedan arriba, y puedes poner una alerta para cuando la espera baje del tiempo que quieres.",
          ],
        },
      ],
    },
  },
  {
    id: "rgv",
    related: ["read-a-wait", "brownsville-matamoros", "laredo"],
    en: {
      slug: "pharr-hidalgo-anzalduas",
      label: "Pharr, Hidalgo, and Anzalduas",
      title: "Pharr, Hidalgo, and Anzalduas bridge wait times",
      description:
        "Which Rio Grande Valley bridge for McAllen and Reynosa: Hidalgo, Anzalduas, or Pharr, and how their waits differ for cars and trucks.",
      lead: "The Rio Grande Valley has several bridges close together, so the right choice depends more on lane and destination than on distance.",
      sections: [
        {
          heading: "Hidalgo",
          paragraphs: [
            "Hidalgo, known as the McAllen–Hidalgo–Reynosa bridge, is the main passenger crossing for McAllen and the one most walkers use. It takes cars and pedestrians and is usually the first one people check.",
          ],
        },
        {
          heading: "Anzalduas",
          paragraphs: [
            "Anzalduas is a passenger-vehicle crossing west of Hidalgo, and it does not take trucks. It tends to be calmer, so it is the usual alternative when Hidalgo is busy, as long as you drive a car.",
          ],
        },
        {
          heading: "Pharr",
          paragraphs: [
            "Pharr, the Pharr–Reynosa bridge, is the commercial crossing and the one trucks use here. Check the standard and FAST truck waits for Pharr if you drive freight, and use Hidalgo or Anzalduas if you drive a car.",
          ],
        },
        {
          heading: "Donna and Progreso",
          paragraphs: [
            "Donna and Progreso are smaller crossings farther east and west along the river. Both are worth checking if you are already near them, but neither replaces the three above for most trips.",
          ],
        },
      ],
    },
    es: {
      slug: "pharr-hidalgo-anzalduas",
      label: "Pharr, Hidalgo y Anzalduas",
      title: "Tiempo de espera en los puentes de Pharr, Hidalgo y Anzalduas",
      description:
        "Qué puente del Valle del Río Grande para McAllen y Reynosa: Hidalgo, Anzalduas o Pharr, y cómo se diferencian sus esperas para autos y camiones.",
      lead: "El Valle del Río Grande tiene varios puentes muy cerca unos de otros, así que la decisión depende más del carril y del destino que de la distancia.",
      sections: [
        {
          heading: "Hidalgo",
          paragraphs: [
            "Hidalgo, el puente McAllen–Hidalgo–Reynosa, es el cruce principal de pasajeros para McAllen y el que más usan los peatones. Recibe autos y peatones y casi siempre es el primero que la gente revisa.",
          ],
        },
        {
          heading: "Anzalduas",
          paragraphs: [
            "Anzalduas es un cruce de vehículos de pasajeros al oeste de Hidalgo y no recibe camiones. Suele estar más tranquilo, por eso es la alternativa usual cuando Hidalgo está lleno, siempre que manejes un auto.",
          ],
        },
        {
          heading: "Pharr",
          paragraphs: [
            "Pharr, el puente Pharr–Reynosa, es el cruce comercial y el que usan los camiones aquí. Revisa las esperas estándar y FAST de camiones en Pharr si manejas carga, y usa Hidalgo o Anzalduas si manejas un auto.",
          ],
        },
        {
          heading: "Donna y Progreso",
          paragraphs: [
            "Donna y Progreso son cruces más pequeños, hacia el este y el oeste a lo largo del río. Conviene revisarlos si ya estás cerca, pero ninguno sustituye a los tres anteriores en la mayoría de los viajes.",
          ],
        },
      ],
    },
  },
  {
    id: "calexico-mexicali",
    related: ["read-a-wait", "san-ysidro-otay", "walking-across"],
    en: {
      slug: "calexico-mexicali-wait",
      label: "Calexico East and West",
      title: "Calexico East and West border wait times",
      description:
        "Calexico East or West? Which Calexico–Mexicali crossing is for cars and walkers, which takes trucks, and how to compare their waits.",
      lead: "Calexico has two crossings into Mexicali, and they are meant for different trips.",
      sections: [
        {
          heading: "Calexico West",
          paragraphs: [
            "Calexico West is the downtown crossing. It takes cars and pedestrians and lands in the center of Calexico, so it is the one most people on foot use. It does not take commercial trucks.",
          ],
        },
        {
          heading: "Calexico East",
          paragraphs: [
            "Calexico East sits a few miles east of town. It has passenger lanes and is the commercial crossing, so trucks use it. If you drive a car and West is slow, East is the alternative, and the extra miles are usually small.",
          ],
        },
        {
          heading: "Picking one",
          paragraphs: [
            "Compare the same lane on both. A pedestrian will almost always want West, a truck must use East, and a car can choose by the posted wait and by where it is going on the other side.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-calexico-mexicali",
      label: "Calexico Este y Oeste",
      title: "Tiempo de espera en Calexico Este y Calexico Oeste",
      description:
        "¿Calexico Este u Oeste? Qué cruce entre Calexico y Mexicali sirve para autos y peatones, cuál recibe camiones y cómo comparar sus esperas.",
      lead: "Calexico tiene dos cruces hacia Mexicali y cada uno es para viajes distintos.",
      sections: [
        {
          heading: "Calexico Oeste",
          paragraphs: [
            "Calexico Oeste es el cruce del centro. Recibe autos y peatones y llega al centro de Calexico, por eso es el que más usa la gente que va a pie. No recibe camiones comerciales.",
          ],
        },
        {
          heading: "Calexico Este",
          paragraphs: [
            "Calexico Este está unos kilómetros al este de la ciudad. Tiene carriles de pasajeros y es el cruce comercial, así que lo usan los camiones. Si manejas un auto y el Oeste va lento, el Este es la alternativa, y los kilómetros extra suelen ser pocos.",
          ],
        },
        {
          heading: "Cómo elegir",
          paragraphs: [
            "Compara el mismo carril en los dos. Un peatón casi siempre querrá el Oeste, un camión debe usar el Este, y un auto puede elegir por la espera publicada y por adónde va del otro lado.",
          ],
        },
      ],
    },
  },
  {
    id: "walking-across",
    related: ["san-ysidro-otay", "el-paso-juarez", "brownsville-matamoros"],
    en: {
      slug: "walking-across-the-border",
      label: "Walking across the border",
      title: "Walking across the border: pedestrian wait times",
      description:
        "How to check a pedestrian border wait at San Ysidro, El Paso, and Brownsville, and why the walking line is not the car line.",
      lead: "Pedestrian lanes have their own line and their own wait. Reading the car number when you are on foot tells you very little.",
      sections: [
        {
          heading: "Read the pedestrian lane",
          paragraphs: [
            "CBP posts the pedestrian wait separately from every vehicle lane. A bridge can have a long car line and a short walking line, or the other way around. In Border Time, switch the card to the walking lane before you read the number.",
          ],
        },
        {
          heading: "Where it matters most",
          paragraphs: [
            "San Ysidro, the El Paso bridges, and Brownsville’s downtown bridges are where many people cross on foot. Each guide for those places covers which bridge fits walkers.",
          ],
        },
        {
          heading: "Before you go",
          paragraphs: [
            "Check the hours first. Some pedestrian lanes close earlier than car lanes, and a crossing that lists the lane as closed has no wait to read. Keep your documents ready, since the wait only counts time in line.",
          ],
        },
      ],
    },
    es: {
      slug: "cruzar-caminando",
      label: "Cruzar caminando",
      title: "Cruzar caminando: tiempos de espera peatonales",
      description:
        "Cómo revisar la espera peatonal en San Ysidro, El Paso y Brownsville, y por qué la fila a pie no es la fila de autos.",
      lead: "Los carriles peatonales tienen su propia fila y su propia espera. Si vas a pie, leer el número de autos te dice muy poco.",
      sections: [
        {
          heading: "Lee el carril peatonal",
          paragraphs: [
            "CBP publica la espera peatonal aparte de cada carril de vehículos. Un puente puede tener una fila larga de autos y una corta a pie, o al revés. En Border Time, cambia la tarjeta al carril peatonal antes de leer el número.",
          ],
        },
        {
          heading: "Dónde importa más",
          paragraphs: [
            "San Ysidro, los puentes de El Paso y los puentes del centro de Brownsville son donde mucha gente cruza a pie. La guía de cada lugar explica qué puente le conviene a quien camina.",
          ],
        },
        {
          heading: "Antes de salir",
          paragraphs: [
            "Revisa primero el horario. Algunos carriles peatonales cierran antes que los de autos, y un cruce que marca el carril como cerrado no tiene espera que leer. Ten tus documentos listos, porque la espera solo cuenta el tiempo en fila.",
          ],
        },
      ],
    },
  },
];

export function guideById(id: string): Guide | undefined {
  return GUIDES.find((guide) => guide.id === id);
}

export function guideBySlug(locale: Locale, slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide[locale].slug === slug);
}

export function guidePath(locale: Locale, guide: Guide): string {
  return `${GUIDES_BASE[locale]}/${guide[locale].slug}`;
}

export function guideIndexPath(locale: Locale): string {
  return GUIDES_BASE[locale];
}
