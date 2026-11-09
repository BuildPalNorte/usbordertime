import type { Locale } from "@/lib/i18n";
import { GUIDE_INDEX_PATH } from "@/lib/guide-paths";

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

export const GUIDES_BASE: Record<Locale, string> = GUIDE_INDEX_PATH;

export const GUIDES: readonly Guide[] = [
  {
    id: "read-a-wait",
    related: ["estimate", "border-congestion", "san-ysidro-otay"],
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
    id: "estimate",
    related: ["read-a-wait", "best-time", "border-congestion"],
    en: {
      slug: "how-border-wait-estimates-work",
      label: "How the estimate works",
      title: "How Border Time estimates a border wait",
      description:
        "CBP’s wait runs from the back of the line to the primary inspection booth. The average under the live number is the usual length of that same stretch for this hour.",
      lead: "A crossing shows two numbers, and both measure the same stretch of the trip. The clock starts at the back of the line and stops when you reach the officer. U.S. Customs and Border Protection (CBP) posts that stretch. Border Time does not time it.",
      sections: [
        {
          heading: "From the back of the line to the booth",
          paragraphs: [
            "CBP’s number is one stretch. It starts when you reach the back of the line for the lane you are in, and it ends when you reach that lane’s primary inspection booth, the moment you get to the officer. On a long line the back of the queue can sit in Mexico or Canada, before the port itself. On a short line it can already be on the U.S. side. The start point moves with the line.",
            "The clock stops at the booth. It leaves out the time the officer spends with you, a second inspection, and the road after you are waved through. It also leaves out everything before the line: the drive to the crossing and the distance up to wherever the queue happens to end.",
            "Cars, Ready Lane, SENTRI, NEXUS, people on foot, and trucks each have their own line. The number is the back of the line you will join. The average under the live number is the usual length of that same stretch for this hour, not a measurement of a longer trip.",
          ],
        },
        {
          heading: "The live number",
          paragraphs: [
            "The large number is that stretch, as CBP posts it for the lane right now. Border Time refreshes that reading through the day. A blank is still a missing reading, not a short line.",
          ],
        },
        {
          heading: "The average under it",
          paragraphs: [
            "Under the live number the card says “avg” and a time. That is CBP’s average length of the same stretch, from the back of the line to the booth, for this hour on this lane. It is the usual wait, not a second measurement of the line you are in.",
            "Open the crossing and the same average is on every lane CBP publishes. The day chart draws those hourly averages for the lane on screen. It does not blend lanes together, and it does not fold today’s live reading into the bars.",
          ],
        },
        {
          heading: "The hour at the crossing",
          paragraphs: [
            "The average on the card is for the hour on the crossing’s own clock, not the hour on your phone. CBP leaves later hours blank until they have an average, so a missing hour uses the latest earlier hour that already has one. A published 0 stays 0. It is a real average. A lane with no average at all leaves that line off the card.",
          ],
        },
        {
          heading: "The high",
          paragraphs: [
            "CBP also lists a high for the hour. When that high sits above the average, the card shows the span from the average up to the high. When the high is not above the average, you see the average alone.",
          ],
        },
        {
          heading: "The quieter stretch",
          paragraphs: [
            "The day chart names the quietest part of those averages for the lane you are looking at. Hours that stay within 8 minutes of the quietest hour join that stretch. A stretch longer than 6 hours is cut to a 6-hour slice that still holds the quietest hour. When at least 18 hours are published and the whole day stays within those 8 minutes, the chart says the wait is about the same all day.",
            "The sentence uses the hours for that lane, as in “Quietest from 10 AM to 3 PM” when those are the hours. It is not a reservation, and it does not include the drive to the bridge.",
          ],
        },
        {
          heading: "How to use the two numbers",
          paragraphs: [
            "A live wait close to the average is an ordinary hour. A live wait well above it is a spike. When you will arrive later, use the usual wait for that hour. Neither number is a promise of your own crossing.",
          ],
        },
      ],
    },
    es: {
      slug: "como-funciona-la-estimacion",
      label: "Cómo funciona la estimación",
      title: "Cómo estima Border Time una espera en la frontera",
      description:
        "La espera de CBP va del final de la fila a la caseta de inspección primaria. El promedio debajo del número en vivo es el largo usual de ese mismo tramo para esta hora.",
      lead: "Un cruce muestra dos números, y los dos miden el mismo tramo del viaje. El reloj empieza al final de la fila y se detiene cuando llegas con el oficial. La Oficina de Aduanas y Protección Fronteriza de Estados Unidos (CBP) publica ese tramo. Border Time no lo mide.",
      sections: [
        {
          heading: "Del final de la fila a la caseta",
          paragraphs: [
            "El número de CBP es un solo tramo. Empieza cuando llegas al final de la fila del carril en el que vas, y termina cuando llegas a la caseta de inspección primaria de ese carril, en el momento en que estás con el oficial. Si la fila es larga, el final puede estar en México o en Canadá, antes del puerto. Si es corta, puede estar ya del lado de Estados Unidos. El punto de inicio se mueve con la fila.",
            "El reloj se detiene en la caseta. Deja fuera el tiempo que el oficial pasa contigo, una segunda revisión y el camino después de que te dejan pasar. También deja fuera todo lo que va antes de la fila: el trayecto al cruce y la distancia hasta donde la cola termine ese día.",
            "Los autos, el carril Ready, SENTRI, NEXUS, quien va a pie y los camiones tienen cada uno su fila. El número es el final de la fila a la que te vas a formar. El promedio debajo del número en vivo es el largo usual de ese mismo tramo para esta hora, no la medición de un viaje más largo.",
          ],
        },
        {
          heading: "El número en vivo",
          paragraphs: [
            "El número grande es ese tramo, tal como CBP lo publica para el carril ahora. Border Time actualiza esa lectura a lo largo del día. Un espacio en blanco sigue siendo una lectura que falta, no una fila corta.",
          ],
        },
        {
          heading: "El promedio debajo",
          paragraphs: [
            "Debajo del número en vivo la tarjeta dice “promedio” y un tiempo. Es el largo promedio que CBP da a ese mismo tramo, del final de la fila a la caseta, para esta hora en este carril. Es la espera usual, no una segunda medición de la fila en la que estás.",
            "Al abrir el cruce, el mismo promedio aparece en cada carril que CBP publica. La gráfica del día dibuja esos promedios por hora del carril que estás viendo. No mezcla carriles, y no mete la lectura en vivo de hoy en las barras.",
          ],
        },
        {
          heading: "La hora del cruce",
          paragraphs: [
            "El promedio de la tarjeta es el de la hora en el reloj del cruce, no el de la hora en tu teléfono. CBP deja las horas de más tarde en blanco hasta que tienen un promedio, así que una hora vacía usa la hora anterior más reciente que ya tiene uno. Un 0 publicado se queda en 0. Es un promedio real. Un carril sin ningún promedio deja esa línea fuera de la tarjeta.",
          ],
        },
        {
          heading: "El máximo",
          paragraphs: [
            "CBP también lista un máximo para la hora. Cuando ese máximo está por encima del promedio, la tarjeta muestra el tramo desde el promedio hasta el máximo. Cuando el máximo no está por encima del promedio, ves solo el promedio.",
          ],
        },
        {
          heading: "El tramo más tranquilo",
          paragraphs: [
            "La gráfica del día nombra la parte más tranquila de esos promedios para el carril que estás viendo. Las horas que se quedan a 8 minutos o menos de la hora más tranquila se suman a ese tramo. Un tramo de más de 6 horas se corta a un segmento de 6 horas que todavía incluye la hora más tranquila. Cuando hay al menos 18 horas publicadas y todo el día se queda dentro de esos 8 minutos, la gráfica dice que la espera es casi igual todo el día.",
            "La frase usa las horas de ese carril, como en “Más tranquilo de 10 a. m. a 3 p. m.” cuando esas son las horas. No es una reserva, y no incluye el trayecto hasta el puente.",
          ],
        },
        {
          heading: "Cómo usar los dos números",
          paragraphs: [
            "Una espera en vivo cerca del promedio es una hora normal. Una espera en vivo muy por encima es un pico. Si vas a llegar más tarde, usa la espera usual de esa hora. Ninguno de los dos números es una promesa de tu propio cruce.",
          ],
        },
      ],
    },
  },
  {
    id: "border-congestion",
    related: ["read-a-wait", "san-ysidro-otay", "el-paso-juarez"],
    en: {
      slug: "border-wait-times-and-congestion",
      label: "Wait times and congestion",
      title: "How knowing border wait times reduces congestion",
      description:
        "Knowing a border wait time cuts congestion: people who can switch bridges, hours, or lanes stop joining the crossing that is already full.",
      lead: "A border line is a shared queue. The wait U.S. Customs and Border Protection (CBP) posts gives people who can change their plan a reason to use another bridge, another hour, or another lane, and that is what eases congestion.",
      sections: [
        {
          heading: "One more car lengthens the line",
          paragraphs: [
            "The delay at a booth is shared by every vehicle behind the one at the front. Each car that joins adds waiting for the rest. People who always take the same bridge at the same hour stack that delay on one crossing, even when another bridge nearby still has room.",
          ],
        },
        {
          heading: "Switch bridges",
          paragraphs: [
            "Cities with more than one crossing are where a posted wait does the most. San Ysidro and Otay Mesa, the El Paso–Juárez bridges, the Laredo bridges, Pharr and Hidalgo, and the Brownsville crossings each publish their own number. A long wait on the usual bridge and a shorter one a few miles away is a reason to move.",
            "The cars that move are cars that no longer join the full line. Spare room at the quieter crossing gets used, and the busy one grows more slowly.",
          ],
        },
        {
          heading: "Shift the hour",
          paragraphs: [
            "Some trips can leave earlier or later. A wait that is long compared with the usual wait for this hour is the signal. Border Time shows both numbers on a crossing, so a spike stands apart from a bridge that is always busy at that time.",
            "An alert sends a note when a lane drops under a number you picked. An alarm checks the bridges you use at the hour you already travel. Either way, trips that did not need the peak sit somewhere else in the day, and the peak line is shorter.",
          ],
        },
        {
          heading: "Change lanes",
          paragraphs: [
            "Standard passenger, Ready Lane, SENTRI, pedestrian, commercial, and FAST are separate queues. The car line can be long while the walking lane is short, and a truck can sit in the commercial lane while FAST is moving. Reading the lane you will actually use keeps that trip off a booth that is already full.",
          ],
        },
        {
          heading: "When the short line fills up",
          paragraphs: [
            "If everyone who can switch piles onto whichever bridge is shortest at that minute, the short line becomes the long one. The wait helps when some travelers move and the rest stay with the bridge they need.",
            "Compare the live number with the usual wait for this hour. A bridge at its normal wait is full in the ordinary way. A bridge well above its usual wait is the one worth leaving.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempos-de-espera-y-congestion",
      label: "Tiempos de espera y congestión",
      title: "Cómo saber el tiempo de espera reduce la congestión",
      description:
        "Saber el tiempo de espera en la frontera baja la congestión: quien puede cambiar de puente, de hora o de carril deja de formarse en el cruce que ya está lleno.",
      lead: "Una fila en la frontera es una cola compartida. El tiempo que publica la Oficina de Aduanas y Protección Fronteriza de Estados Unidos (CBP) le da a quien puede cambiar de plan una razón para usar otro puente, otra hora u otro carril, y eso es lo que baja la congestión.",
      sections: [
        {
          heading: "Un auto más alarga la fila",
          paragraphs: [
            "La demora en una caseta la comparten todos los vehículos que van atrás. Cada auto que se forma le suma espera a los demás. Quien siempre toma el mismo puente a la misma hora acumula esa demora en un solo cruce, aunque otro puente cercano todavía tenga lugar.",
          ],
        },
        {
          heading: "Cambiar de puente",
          paragraphs: [
            "Las ciudades con más de un cruce son donde el tiempo publicado más sirve. San Ysidro y Otay Mesa, los puentes de El Paso–Juárez, los de Laredo, Pharr e Hidalgo, y los de Brownsville publican cada uno su número. Una espera larga en el puente de siempre y una más corta a pocos kilómetros es una razón para moverse.",
            "Los autos que se mueven son autos que ya no se forman en la fila llena. El lugar libre del cruce más tranquilo se usa, y el ocupado crece más despacio.",
          ],
        },
        {
          heading: "Mover la hora",
          paragraphs: [
            "Hay viajes que pueden salir antes o después. Una espera larga comparada con la usual para esta hora es la señal. Border Time muestra los dos números en cada cruce, así que un pico se distingue de un puente que a esa hora siempre está lleno.",
            "Una alerta avisa cuando un carril baja del número que elegiste. Una alarma revisa los puentes que usas a la hora en que ya viajas. En los dos casos, los viajes que no necesitaban la hora pico quedan en otro momento del día, y la fila del pico es más corta.",
          ],
        },
        {
          heading: "Cambiar de carril",
          paragraphs: [
            "El carril estándar de pasajeros, Ready, SENTRI, peatonal, comercial y FAST son filas distintas. La fila de autos puede ir larga mientras la de a pie va corta, y un camión puede quedarse en el comercial mientras FAST avanza. Leer el carril que de verdad vas a usar evita sumar ese viaje a una caseta que ya está llena.",
          ],
        },
        {
          heading: "Cuando la fila corta se llena",
          paragraphs: [
            "Si todos los que pueden cambiarse van al puente que en ese minuto está más corto, la fila corta se vuelve la larga. El tiempo ayuda cuando unos viajeros se mueven y los demás se quedan en el puente que necesitan.",
            "Compara el número en vivo con la espera usual de esta hora. Un puente en su espera normal está lleno de la forma de siempre. Un puente muy por encima de su espera usual es el que conviene dejar.",
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
  {
    id: "canada-border",
    related: ["peace-arch", "detroit-windsor", "buffalo-niagara"],
    en: {
      slug: "canada-border-wait-times",
      label: "Canadian border waits",
      title: "Canadian border wait times",
      description:
        "How to read a U.S.–Canada border wait: Peace Arch, Detroit–Windsor, Buffalo–Niagara, and Champlain, and why the number is the line into the United States.",
      lead: "CBP posts a wait for the Canadian border the same way it posts one for Mexico. The number is the line to enter the United States, and the lane that matters has a different name.",
      sections: [
        {
          heading: "The wait is into the United States",
          paragraphs: [
            "A Canadian-border wait on Border Time is the delay CBP reports for travelers entering the United States. It is not the line to enter Canada. The two countries run separate inspections, and only the U.S. number is in this app.",
          ],
        },
        {
          heading: "Where people actually cross",
          paragraphs: [
            "On the West Coast, Peace Arch and Pacific Highway at Blaine carry most of the Seattle–Vancouver traffic, with Sumas and Lynden as the smaller alternatives. In Michigan, the Ambassador Bridge and the Detroit–Windsor Tunnel serve Detroit, and the Blue Water Bridge serves Port Huron. In New York, the Peace Bridge, Rainbow Bridge, and Lewiston–Queenston Bridge split Buffalo and Niagara Falls, and Champlain carries I-87 toward Montreal.",
            "Each of those is its own crossing with its own lanes. “The Canada border” is not one line.",
          ],
        },
        {
          heading: "NEXUS, not SENTRI",
          paragraphs: [
            "The trusted-traveler lane on this border is NEXUS. Border Time labels that lane NEXUS at a Canadian port and SENTRI at a Mexican port, because they are different programs on the same kind of booth. Ready Lane, where a crossing has it, is the RFID line and is separate from NEXUS.",
          ],
        },
        {
          heading: "Compare the crossing you can reach",
          paragraphs: [
            "A shorter wait only helps if you can get to that crossing. Add the drive before you leave a bridge that is already on your route. Read the same lane on each one: standard if that is your line, NEXUS if you are enrolled, commercial if you drive a truck.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-frontera-canada",
      label: "Espera en la frontera con Canadá",
      title: "Tiempos de espera en la frontera con Canadá",
      description:
        "Cómo leer una espera entre Estados Unidos y Canadá: Peace Arch, Detroit–Windsor, Buffalo–Niagara y Champlain, y por qué el número es la fila para entrar a Estados Unidos.",
      lead: "CBP publica una espera en la frontera con Canadá igual que en la de México. El número es la fila para entrar a Estados Unidos, y el carril que importa tiene otro nombre.",
      sections: [
        {
          heading: "La espera es para entrar a Estados Unidos",
          paragraphs: [
            "Una espera de la frontera con Canadá en Border Time es la demora que CBP reporta para quien entra a Estados Unidos. No es la fila para entrar a Canadá. Los dos países hacen inspecciones distintas, y en esta app solo está el número de Estados Unidos.",
          ],
        },
        {
          heading: "Por dónde cruza la gente",
          paragraphs: [
            "En la costa oeste, Peace Arch y Pacific Highway en Blaine llevan la mayor parte del tráfico entre Seattle y Vancouver, y Sumas y Lynden son las alternativas más chicas. En Michigan, el Ambassador Bridge y el túnel Detroit–Windsor sirven a Detroit, y el Blue Water Bridge sirve a Port Huron. En Nueva York, el Peace Bridge, el Rainbow Bridge y el Lewiston–Queenston se reparten Buffalo y Niagara Falls, y Champlain lleva la I-87 hacia Montreal.",
            "Cada uno es un cruce con sus propios carriles. “La frontera con Canadá” no es una sola fila.",
          ],
        },
        {
          heading: "NEXUS, no SENTRI",
          paragraphs: [
            "El carril de viajero confiable en esta frontera es NEXUS. Border Time lo llama NEXUS en un puerto de Canadá y SENTRI en un puerto de México, porque son programas distintos en el mismo tipo de caseta. El carril Ready, donde el cruce lo tiene, es la fila con chip RFID y va aparte de NEXUS.",
          ],
        },
        {
          heading: "Compara el cruce al que sí llegas",
          paragraphs: [
            "Una espera más corta solo sirve si puedes llegar a ese cruce. Suma el trayecto antes de dejar un puente que ya está en tu ruta. Lee el mismo carril en cada uno: estándar si esa es tu fila, NEXUS si estás inscrito, comercial si manejas un camión.",
          ],
        },
      ],
    },
  },
  {
    id: "peace-arch",
    related: ["canada-border", "nexus", "ready-lane"],
    en: {
      slug: "peace-arch-pacific-highway-wait",
      label: "Peace Arch and Pacific Highway",
      title: "Peace Arch and Pacific Highway border wait times",
      description:
        "Peace Arch or Pacific Highway? Which Blaine crossing fits cars, walkers, and trucks, and when Sumas or Lynden is the better detour.",
      lead: "Blaine has two crossings a few minutes apart, and they are built for different traffic. Most of the Seattle–Vancouver line is one of those two.",
      sections: [
        {
          heading: "Peace Arch",
          paragraphs: [
            "Peace Arch is the I-5 crossing. It takes passenger cars and people on foot. Commercial trucks do not use it. If you are walking, or driving a car down I-5, this is the wait to read.",
          ],
        },
        {
          heading: "Pacific Highway",
          paragraphs: [
            "Pacific Highway sits just east of Peace Arch on State Route 543. It is the commercial crossing, and it also takes passenger cars. A truck reads this wait. A car stuck in the Peace Arch line can compare it before committing to the I-5 queue.",
          ],
        },
        {
          heading: "Sumas and Lynden",
          paragraphs: [
            "Sumas, on State Route 9 toward Huntingdon, takes cars and trucks and is the usual detour when both Blaine crossings are long and you are already east. Lynden, toward Aldergrove, is a smaller passenger crossing. Neither replaces Peace Arch when you are on I-5, and both are worth opening when the extra miles are short.",
          ],
        },
        {
          heading: "Which lane",
          paragraphs: [
            "Read NEXUS if you are enrolled, and the standard lane if you are not. A pedestrian wait at Peace Arch is not the car wait. Border Time shows the lane you pick, so switch it before you compare the two Blaine crossings.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-peace-arch",
      label: "Peace Arch y Pacific Highway",
      title: "Tiempo de espera en Peace Arch y Pacific Highway",
      description:
        "¿Peace Arch o Pacific Highway? Qué cruce de Blaine conviene para autos, peatones y camiones, y cuándo Sumas o Lynden es el mejor desvío.",
      lead: "Blaine tiene dos cruces a pocos minutos uno del otro y están hechos para tráfico distinto. Casi toda la fila entre Seattle y Vancouver es uno de esos dos.",
      sections: [
        {
          heading: "Peace Arch",
          paragraphs: [
            "Peace Arch es el cruce de la I-5. Recibe autos de pasajeros y gente a pie. Los camiones comerciales no lo usan. Si caminas, o si manejas un auto por la I-5, esta es la espera que debes leer.",
          ],
        },
        {
          heading: "Pacific Highway",
          paragraphs: [
            "Pacific Highway está justo al este de Peace Arch, sobre la ruta estatal 543. Es el cruce comercial y también recibe autos. Un camión lee esta espera. Un auto atorado en Peace Arch puede compararla antes de quedarse en la fila de la I-5.",
          ],
        },
        {
          heading: "Sumas y Lynden",
          paragraphs: [
            "Sumas, sobre la ruta estatal 9 hacia Huntingdon, recibe autos y camiones y es el desvío usual cuando los dos cruces de Blaine están largos y ya vienes del este. Lynden, hacia Aldergrove, es un cruce de pasajeros más pequeño. Ninguno sustituye a Peace Arch si vas por la I-5, y los dos valen una mirada cuando los kilómetros extra son pocos.",
          ],
        },
        {
          heading: "Qué carril",
          paragraphs: [
            "Lee NEXUS si estás inscrito, y el carril estándar si no. La espera peatonal de Peace Arch no es la espera de autos. Border Time muestra el carril que eliges, así que cámbialo antes de comparar los dos cruces de Blaine.",
          ],
        },
      ],
    },
  },
  {
    id: "detroit-windsor",
    related: ["canada-border", "buffalo-niagara", "truck-crossings"],
    en: {
      slug: "detroit-windsor-border-wait",
      label: "Detroit–Windsor crossings",
      title: "Detroit–Windsor border wait times",
      description:
        "Ambassador Bridge or the Detroit–Windsor Tunnel? Which crossing takes cars, which takes trucks, and when Blue Water at Port Huron is the alternative.",
      lead: "Detroit and Windsor have two crossings downtown of each other, and they do not take the same vehicles.",
      sections: [
        {
          heading: "Ambassador Bridge",
          paragraphs: [
            "The Ambassador Bridge carries passenger cars and commercial trucks between Detroit and Windsor. It does not have a walking lane. If you drive a truck into Michigan, this is the Detroit wait to read, on the commercial lane or on FAST if you are enrolled.",
          ],
        },
        {
          heading: "Detroit–Windsor Tunnel",
          paragraphs: [
            "The tunnel connects the two downtowns and takes passenger vehicles. It does not take commercial trucks. A car going downtown to downtown compares the tunnel with the Ambassador Bridge. A truck does not: the tunnel is the wrong crossing.",
          ],
        },
        {
          heading: "Blue Water Bridge",
          paragraphs: [
            "The Blue Water Bridge at Port Huron, about an hour north, crosses to Sarnia. It takes cars and trucks. It is a real alternative when you are already north of Detroit, or when both Detroit crossings are long and the extra drive is acceptable. It is not a shortcut from downtown.",
          ],
        },
        {
          heading: "Read your own lane",
          paragraphs: [
            "NEXUS is the trusted-traveler lane here. Compare NEXUS with NEXUS, and the standard car lane with the standard car lane. A commercial number on the Ambassador Bridge says nothing about the tunnel.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-detroit-windsor",
      label: "Cruces Detroit–Windsor",
      title: "Tiempo de espera en Detroit–Windsor",
      description:
        "¿El Ambassador Bridge o el túnel Detroit–Windsor? Qué cruce recibe autos, cuál recibe camiones y cuándo el Blue Water en Port Huron es la alternativa.",
      lead: "Detroit y Windsor tienen dos cruces, uno frente al centro del otro, y no reciben los mismos vehículos.",
      sections: [
        {
          heading: "Ambassador Bridge",
          paragraphs: [
            "El Ambassador Bridge lleva autos de pasajeros y camiones comerciales entre Detroit y Windsor. No tiene carril para caminar. Si manejas un camión hacia Michigan, esta es la espera de Detroit que debes leer, en el carril comercial o en FAST si estás inscrito.",
          ],
        },
        {
          heading: "Túnel Detroit–Windsor",
          paragraphs: [
            "El túnel conecta los dos centros y recibe vehículos de pasajeros. No recibe camiones comerciales. Un auto que va de centro a centro compara el túnel con el Ambassador Bridge. Un camión no: el túnel es el cruce equivocado.",
          ],
        },
        {
          heading: "Blue Water Bridge",
          paragraphs: [
            "El Blue Water Bridge en Port Huron, como una hora al norte, cruza hacia Sarnia. Recibe autos y camiones. Es una alternativa real si ya estás al norte de Detroit, o si los dos cruces de Detroit están largos y el trayecto extra te sirve. No es un atajo desde el centro.",
          ],
        },
        {
          heading: "Lee tu propio carril",
          paragraphs: [
            "NEXUS es el carril de viajero confiable aquí. Compara NEXUS con NEXUS, y el carril estándar de autos con el carril estándar de autos. Un número comercial del Ambassador Bridge no dice nada del túnel.",
          ],
        },
      ],
    },
  },
  {
    id: "buffalo-niagara",
    related: ["canada-border", "detroit-windsor", "nexus"],
    en: {
      slug: "buffalo-niagara-border-wait",
      label: "Buffalo and Niagara bridges",
      title: "Buffalo and Niagara Falls border wait times",
      description:
        "Peace Bridge, Rainbow Bridge, Lewiston–Queenston, or Whirlpool: which Buffalo–Niagara crossing fits cars, walkers, trucks, and NEXUS.",
      lead: "Buffalo and Niagara Falls are four crossings, not one. The bridge on your route and the lane you can use decide the wait.",
      sections: [
        {
          heading: "Peace Bridge",
          paragraphs: [
            "The Peace Bridge runs from Buffalo to Fort Erie. It takes passenger cars and commercial trucks, and it is the main crossing for people already in Buffalo. Read the commercial lane if you drive a truck and the passenger lane if you drive a car.",
          ],
        },
        {
          heading: "Rainbow Bridge",
          paragraphs: [
            "The Rainbow Bridge lands at Niagara Falls and takes passenger cars and people on foot. It does not take commercial trucks. Walkers read this pedestrian wait. A truck has to use Peace Bridge or Lewiston–Queenston instead.",
          ],
        },
        {
          heading: "Lewiston–Queenston",
          paragraphs: [
            "Lewiston–Queenston is north of the falls and connects to the highway on the Canadian side. It takes cars and trucks. When the Peace Bridge and Rainbow Bridge are both slow and you can reach the north end, this is the wait to put next to them.",
          ],
        },
        {
          heading: "Whirlpool",
          paragraphs: [
            "The Whirlpool Rapids Bridge is a NEXUS crossing. If you are not enrolled in NEXUS, it is not your lane. Enrolled drivers compare it with the NEXUS lane at the bridge they can also reach, not with the standard line.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-buffalo-niagara",
      label: "Puentes de Buffalo y Niagara",
      title: "Tiempo de espera en Buffalo y Niagara Falls",
      description:
        "Peace Bridge, Rainbow Bridge, Lewiston–Queenston o Whirlpool: qué cruce de Buffalo–Niagara conviene para autos, peatones, camiones y NEXUS.",
      lead: "Buffalo y Niagara Falls son cuatro cruces, no uno. El puente de tu ruta y el carril que puedes usar deciden la espera.",
      sections: [
        {
          heading: "Peace Bridge",
          paragraphs: [
            "El Peace Bridge va de Buffalo a Fort Erie. Recibe autos de pasajeros y camiones comerciales, y es el cruce principal para quien ya está en Buffalo. Lee el carril comercial si manejas un camión y el de pasajeros si manejas un auto.",
          ],
        },
        {
          heading: "Rainbow Bridge",
          paragraphs: [
            "El Rainbow Bridge llega a Niagara Falls y recibe autos de pasajeros y gente a pie. No recibe camiones comerciales. Quien camina lee esta espera peatonal. Un camión tiene que usar el Peace Bridge o Lewiston–Queenston.",
          ],
        },
        {
          heading: "Lewiston–Queenston",
          paragraphs: [
            "Lewiston–Queenston está al norte de las cataratas y conecta con la autopista del lado canadiense. Recibe autos y camiones. Cuando el Peace Bridge y el Rainbow Bridge van lentos y puedes llegar al extremo norte, esta es la espera que se pone junto a ellos.",
          ],
        },
        {
          heading: "Whirlpool",
          paragraphs: [
            "El Whirlpool Rapids Bridge es un cruce NEXUS. Si no estás inscrito en NEXUS, no es tu carril. Quien sí lo está lo compara con el carril NEXUS del puente al que también puede llegar, no con la fila estándar.",
          ],
        },
      ],
    },
  },
  {
    id: "champlain",
    related: ["canada-border", "buffalo-niagara", "nexus"],
    en: {
      slug: "champlain-border-wait",
      label: "Champlain and the northeast",
      title: "Champlain border wait time and the northeast crossings",
      description:
        "Champlain–Lacolle is the I-87 crossing toward Montreal. How it compares with Alexandria Bay, Highgate, and Derby Line, and which lane to read.",
      lead: "Most New York–Montreal traffic uses one crossing. Champlain is that crossing, and the smaller ports nearby are only useful when you are already close to them.",
      sections: [
        {
          heading: "Champlain",
          paragraphs: [
            "Champlain, New York, is the I-87 port opposite Lacolle, Quebec. It takes passenger cars and commercial trucks. If your route is the interstate, this is the wait to read, on the standard lane, on NEXUS if you are enrolled, or on the commercial lane if you drive a truck.",
          ],
        },
        {
          heading: "Highgate and Derby Line",
          paragraphs: [
            "Highgate Springs and Derby Line are the Vermont crossings, farther east. They are smaller. Check them when your route already runs through Vermont. They are a long detour from I-87.",
          ],
        },
        {
          heading: "Thousand Islands",
          paragraphs: [
            "Alexandria Bay’s Thousand Islands Bridge is west of Champlain, on the way to Kingston rather than Montreal. It takes cars and trucks. Compare it with Champlain only when both are plausible drives, not because the name “New York border” covers both.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-champlain",
      label: "Champlain y el noreste",
      title: "Tiempo de espera en Champlain y los cruces del noreste",
      description:
        "Champlain–Lacolle es el cruce de la I-87 hacia Montreal. Cómo se compara con Alexandria Bay, Highgate y Derby Line, y qué carril leer.",
      lead: "Casi todo el tráfico entre Nueva York y Montreal usa un cruce. Champlain es ese cruce, y los puertos chicos de al lado solo sirven cuando ya estás cerca.",
      sections: [
        {
          heading: "Champlain",
          paragraphs: [
            "Champlain, Nueva York, es el puerto de la I-87 frente a Lacolle, Quebec. Recibe autos de pasajeros y camiones comerciales. Si tu ruta es la autopista, esta es la espera que debes leer, en el carril estándar, en NEXUS si estás inscrito, o en el comercial si manejas un camión.",
          ],
        },
        {
          heading: "Highgate y Derby Line",
          paragraphs: [
            "Highgate Springs y Derby Line son los cruces de Vermont, más al este. Son más pequeños. Revísalos cuando tu ruta ya pasa por Vermont. Desde la I-87 son un desvío largo.",
          ],
        },
        {
          heading: "Thousand Islands",
          paragraphs: [
            "El puente Thousand Islands de Alexandria Bay está al oeste de Champlain, camino a Kingston y no a Montreal. Recibe autos y camiones. Compáralo con Champlain solo cuando los dos trayectos son posibles, no porque el nombre “frontera de Nueva York” cubra los dos.",
          ],
        },
      ],
    },
  },
  {
    id: "nogales",
    related: ["san-ysidro-otay", "sentri", "truck-crossings"],
    en: {
      slug: "nogales-border-wait",
      label: "Nogales crossings",
      title: "Nogales border wait times: DeConcini, Mariposa, and Morley",
      description:
        "Which Nogales crossing for cars, walkers, and trucks: DeConcini, Mariposa, or the Morley Gate, and how to read each wait.",
      lead: "Nogales, Arizona, and Nogales, Sonora, share three crossings. The downtown gates and the west-side port are not interchangeable.",
      sections: [
        {
          heading: "DeConcini",
          paragraphs: [
            "The DeConcini port is the downtown crossing. It takes passenger cars and pedestrians and is the one most people mean by “the Nogales border.” It is not the truck port.",
          ],
        },
        {
          heading: "Morley Gate",
          paragraphs: [
            "Morley is a pedestrian gate downtown, listed apart from the car lanes. If you are on foot, read the Morley or DeConcini pedestrian wait. The car number does not describe that line.",
          ],
        },
        {
          heading: "Mariposa",
          paragraphs: [
            "Mariposa is west of downtown, on State Route 189. It is the commercial port, and it also takes passenger cars. Trucks read the commercial and FAST lanes here. A car compares Mariposa with DeConcini before driving across town to chase a shorter line.",
          ],
        },
        {
          heading: "SENTRI at Nogales",
          paragraphs: [
            "SENTRI is the trusted-traveler lane on this border. Read it only if you can use it, and compare SENTRI with SENTRI when you are choosing between DeConcini and Mariposa.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-nogales",
      label: "Cruces de Nogales",
      title: "Tiempo de espera en Nogales: DeConcini, Mariposa y Morley",
      description:
        "Qué cruce de Nogales para autos, peatones y camiones: DeConcini, Mariposa o la garita Morley, y cómo leer cada espera.",
      lead: "Nogales, Arizona, y Nogales, Sonora, comparten tres cruces. Las garitas del centro y el puerto del oeste no se sustituyen.",
      sections: [
        {
          heading: "DeConcini",
          paragraphs: [
            "El puerto DeConcini es el cruce del centro. Recibe autos de pasajeros y peatones y es el que casi todos llaman “la garita de Nogales”. No es el puerto de camiones.",
          ],
        },
        {
          heading: "Garita Morley",
          paragraphs: [
            "Morley es una garita peatonal del centro, listada aparte de los carriles de autos. Si vas a pie, lee la espera peatonal de Morley o de DeConcini. El número de autos no describe esa fila.",
          ],
        },
        {
          heading: "Mariposa",
          paragraphs: [
            "Mariposa está al oeste del centro, sobre la ruta estatal 189. Es el puerto comercial y también recibe autos. Los camiones leen aquí los carriles comercial y FAST. Un auto compara Mariposa con DeConcini antes de cruzar la ciudad para seguir una fila más corta.",
          ],
        },
        {
          heading: "SENTRI en Nogales",
          paragraphs: [
            "SENTRI es el carril de viajero confiable en esta frontera. Léelo solo si puedes usarlo, y compara SENTRI con SENTRI cuando eliges entre DeConcini y Mariposa.",
          ],
        },
      ],
    },
  },
  {
    id: "san-luis",
    related: ["nogales", "calexico-mexicali", "walking-across"],
    en: {
      slug: "san-luis-lukeville-wait",
      label: "San Luis and Lukeville",
      title: "San Luis and Lukeville border wait times",
      description:
        "San Luis I or San Luis II for Yuma and San Luis Río Colorado, and when the smaller Lukeville crossing to Sonoyta is worth the drive.",
      lead: "The Yuma area has a downtown crossing and a commercial crossing a few miles apart. Lukeville is a different trip entirely.",
      sections: [
        {
          heading: "San Luis I",
          paragraphs: [
            "San Luis I is the downtown port between San Luis, Arizona, and San Luis Río Colorado. It takes passenger cars and pedestrians. People on foot, and cars headed into the center of town, read this wait.",
          ],
        },
        {
          heading: "San Luis II",
          paragraphs: [
            "San Luis II is east of town and is the commercial crossing. Trucks use it. Cars use it as the alternative when San Luis I is slow and the extra miles still land them where they are going.",
          ],
        },
        {
          heading: "Lukeville",
          paragraphs: [
            "Lukeville is south of Ajo, across from Sonoyta, on the way through Organ Pipe. It is a smaller passenger crossing with shorter hours than the San Luis ports. Check the hours CBP posts before you treat it as a backup, and do not drive there from Yuma only because the name is on the same border.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-san-luis-lukeville",
      label: "San Luis y Lukeville",
      title: "Tiempo de espera en San Luis y Lukeville",
      description:
        "San Luis I o San Luis II para Yuma y San Luis Río Colorado, y cuándo el cruce más chico de Lukeville hacia Sonoyta vale el camino.",
      lead: "La zona de Yuma tiene un cruce en el centro y un cruce comercial a pocos kilómetros. Lukeville es otro viaje.",
      sections: [
        {
          heading: "San Luis I",
          paragraphs: [
            "San Luis I es el puerto del centro entre San Luis, Arizona, y San Luis Río Colorado. Recibe autos de pasajeros y peatones. Quien va a pie, y los autos que van al centro, leen esta espera.",
          ],
        },
        {
          heading: "San Luis II",
          paragraphs: [
            "San Luis II está al este de la ciudad y es el cruce comercial. Lo usan los camiones. Los autos lo usan como alternativa cuando San Luis I va lento y los kilómetros extra igual los dejan donde van.",
          ],
        },
        {
          heading: "Lukeville",
          paragraphs: [
            "Lukeville está al sur de Ajo, frente a Sonoyta, camino de Organ Pipe. Es un cruce de pasajeros más pequeño, con horario más corto que los puertos de San Luis. Revisa el horario que publica CBP antes de tomarlo como respaldo, y no manejes hasta allá desde Yuma solo porque el nombre está en la misma frontera.",
          ],
        },
      ],
    },
  },
  {
    id: "eagle-pass-del-rio",
    related: ["laredo", "el-paso-juarez", "read-a-wait"],
    en: {
      slug: "eagle-pass-del-rio-wait",
      label: "Eagle Pass and Del Rio",
      title: "Eagle Pass and Del Rio border wait times",
      description:
        "Which Eagle Pass bridge for Piedras Negras, how Del Rio crosses to Ciudad Acuña, and how to read passenger and truck waits there.",
      lead: "Between Laredo and the Big Bend, two cities do most of the crossing. Each one has its own bridges, and they are not backups for each other unless the drive is already your plan.",
      sections: [
        {
          heading: "Eagle Pass Bridge I",
          paragraphs: [
            "Eagle Pass Bridge I is the downtown crossing to Piedras Negras. It takes passenger cars and pedestrians. It is the bridge people in the center of either city are usually headed for.",
          ],
        },
        {
          heading: "Camino Real",
          paragraphs: [
            "Camino Real, Eagle Pass Bridge II, sits south of downtown. It takes passenger cars and is the commercial crossing for trucks. Compare it with Bridge I on the same lane, and use the commercial or FAST number if you drive a truck.",
          ],
        },
        {
          heading: "Del Rio",
          paragraphs: [
            "The Del Rio International Bridge crosses to Ciudad Acuña. It is a separate city from Eagle Pass, a long drive upriver. Read it when Acuña or Del Rio is the destination. It is a poor substitute for Piedras Negras.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-eagle-pass-del-rio",
      label: "Eagle Pass y Del Rio",
      title: "Tiempo de espera en Eagle Pass y Del Rio",
      description:
        "Qué puente de Eagle Pass para Piedras Negras, cómo cruza Del Rio hacia Ciudad Acuña y cómo leer ahí las esperas de pasajeros y de camiones.",
      lead: "Entre Laredo y el Big Bend, dos ciudades hacen casi todo el cruce. Cada una tiene sus puentes, y no son respaldo una de la otra salvo que ese camino ya sea tu plan.",
      sections: [
        {
          heading: "Puente I de Eagle Pass",
          paragraphs: [
            "El Puente I de Eagle Pass es el cruce del centro hacia Piedras Negras. Recibe autos de pasajeros y peatones. Es el puente al que suele ir quien está en el centro de cualquiera de las dos ciudades.",
          ],
        },
        {
          heading: "Camino Real",
          paragraphs: [
            "Camino Real, el Puente II de Eagle Pass, está al sur del centro. Recibe autos de pasajeros y es el cruce comercial para camiones. Compáralo con el Puente I en el mismo carril, y usa el número comercial o FAST si manejas un camión.",
          ],
        },
        {
          heading: "Del Rio",
          paragraphs: [
            "El puente internacional de Del Rio cruza hacia Ciudad Acuña. Es otra ciudad, un trayecto largo río arriba desde Eagle Pass. Léelo cuando Acuña o Del Rio es el destino. Es un mal sustituto de Piedras Negras.",
          ],
        },
      ],
    },
  },
  {
    id: "santa-teresa",
    related: ["el-paso-juarez", "truck-crossings", "read-a-wait"],
    en: {
      slug: "santa-teresa-border-wait",
      label: "Santa Teresa",
      title: "Santa Teresa border wait time",
      description:
        "Santa Teresa, New Mexico, is the west-side alternative to the El Paso bridges: who it is for, and how to compare it with Ysleta and Tornillo.",
      lead: "Santa Teresa is not an El Paso bridge. It is the New Mexico port west of the city, and it was built with trucks in mind.",
      sections: [
        {
          heading: "Where it sits",
          paragraphs: [
            "The Santa Teresa port connects New Mexico with San Jerónimo, Chihuahua, west of El Paso and Ciudad Juárez. Cars can cross, and it is a main commercial port for the region. People use it to stay out of the El Paso city bridges.",
          ],
        },
        {
          heading: "Against the El Paso bridges",
          paragraphs: [
            "Ysleta is the southeast truck bridge inside El Paso. Tornillo is the far-east crossing. Santa Teresa is the west-side port. A truck compares the commercial and FAST waits at the ports it can reach. A car compares the passenger lane, then adds the drive through the west mesa before switching.",
          ],
        },
        {
          heading: "The lane still matters",
          paragraphs: [
            "A passenger number at Santa Teresa is not the truck number. SENTRI, Ready, and the standard lane are separate when the port offers them. A lane marked N/A is one this crossing does not post.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-santa-teresa",
      label: "Santa Teresa",
      title: "Tiempo de espera en Santa Teresa",
      description:
        "Santa Teresa, Nuevo México, es la alternativa del oeste a los puentes de El Paso: para quién sirve y cómo compararla con Ysleta y Tornillo.",
      lead: "Santa Teresa no es un puente de El Paso. Es el puerto de Nuevo México al oeste de la ciudad, y se construyó pensando en camiones.",
      sections: [
        {
          heading: "Dónde queda",
          paragraphs: [
            "El puerto de Santa Teresa conecta Nuevo México con San Jerónimo, Chihuahua, al oeste de El Paso y Ciudad Juárez. Los autos pueden cruzar, y es un puerto comercial importante de la región. La gente lo usa para no meterse a los puentes de la ciudad de El Paso.",
          ],
        },
        {
          heading: "Frente a los puentes de El Paso",
          paragraphs: [
            "Ysleta es el puente de camiones del sureste, dentro de El Paso. Tornillo es el cruce del extremo este. Santa Teresa es el puerto del oeste. Un camión compara las esperas comercial y FAST de los puertos a los que llega. Un auto compara el carril de pasajeros y luego suma el trayecto por el oeste antes de cambiar.",
          ],
        },
        {
          heading: "El carril sigue importando",
          paragraphs: [
            "Un número de pasajeros en Santa Teresa no es el número de camiones. SENTRI, Ready y el carril estándar van aparte cuando el puerto los ofrece. Un carril marcado N/A es uno que ese cruce no publica.",
          ],
        },
      ],
    },
  },
  {
    id: "sentri",
    related: ["ready-lane", "read-a-wait", "nogales"],
    en: {
      slug: "sentri-lane-wait-times",
      label: "SENTRI lane",
      title: "SENTRI lane wait times",
      description:
        "What the SENTRI wait measures, how it differs from Ready Lane and from the standard line, and which Mexican-border crossings post one.",
      lead: "SENTRI is its own line. The standard wait at the same bridge can be a different length at the same minute, so the number to read is the SENTRI number.",
      sections: [
        {
          heading: "What the lane is",
          paragraphs: [
            "SENTRI is the trusted-traveler program for the Mexican border. The lane is only for vehicles and people eligible to use it. Enrollment, the vehicle, and who may ride are CBP’s rules, and those rules are the ones to confirm at the Trusted Traveler Programs site before you rely on the lane.",
          ],
        },
        {
          heading: "Not Ready Lane",
          paragraphs: [
            "Ready Lane is the RFID line. A passport card or another Ready document is enough for Ready, and it is not enough for SENTRI. The two waits are posted separately. A short Ready number does not mean SENTRI is short, and the reverse is just as true.",
          ],
        },
        {
          heading: "Where you will see it",
          paragraphs: [
            "Busy Mexican-border passenger crossings post a SENTRI lane when they have one: San Ysidro, Otay Mesa, Calexico, Nogales, the El Paso bridges, Laredo’s passenger bridges, and the Rio Grande Valley and Brownsville crossings among them. A crossing that shows N/A for SENTRI does not offer that lane. NEXUS is the matching program on the Canadian border, and Border Time labels the lane that way there.",
          ],
        },
        {
          heading: "How to use the number",
          paragraphs: [
            "Compare SENTRI with SENTRI if you are choosing between bridges. The usual wait for this hour tells you whether the live SENTRI number is normal. A SENTRI line can still be long on a holiday or when the lane is short-staffed.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-carril-sentri",
      label: "Carril SENTRI",
      title: "Tiempo de espera del carril SENTRI",
      description:
        "Qué mide la espera SENTRI, en qué se distingue del carril Ready y de la fila estándar, y qué cruces de la frontera con México publican una.",
      lead: "SENTRI es su propia fila. La espera estándar del mismo puente puede durar otra cosa en el mismo minuto, así que el número que se lee es el de SENTRI.",
      sections: [
        {
          heading: "Qué es el carril",
          paragraphs: [
            "SENTRI es el programa de viajero confiable de la frontera con México. El carril es solo para vehículos y personas que pueden usarlo. La inscripción, el vehículo y quién puede ir a bordo son reglas de CBP, y esas reglas se confirman en el sitio de Trusted Traveler Programs antes de contar con el carril.",
          ],
        },
        {
          heading: "No es el carril Ready",
          paragraphs: [
            "El carril Ready es la fila con chip RFID. Una tarjeta de pasaporte u otro documento Ready alcanza para Ready, y no alcanza para SENTRI. Las dos esperas se publican aparte. Un número corto de Ready no significa que SENTRI esté corto, y al revés pasa igual.",
          ],
        },
        {
          heading: "Dónde lo vas a ver",
          paragraphs: [
            "Los cruces de pasajeros más usados de la frontera con México publican un carril SENTRI cuando lo tienen: San Ysidro, Otay Mesa, Calexico, Nogales, los puentes de El Paso, los puentes de pasajeros de Laredo, y los del Valle del Río Grande y de Brownsville, entre otros. Un cruce que muestra N/A en SENTRI no ofrece ese carril. NEXUS es el programa equivalente en la frontera con Canadá, y Border Time nombra así el carril allá.",
          ],
        },
        {
          heading: "Cómo usar el número",
          paragraphs: [
            "Compara SENTRI con SENTRI si estás eligiendo entre puentes. La espera usual de esta hora te dice si el número SENTRI en vivo es normal. La fila SENTRI también puede ir larga en un día festivo o cuando el carril tiene poco personal.",
          ],
        },
      ],
    },
  },
  {
    id: "nexus",
    related: ["canada-border", "ready-lane", "buffalo-niagara"],
    en: {
      slug: "nexus-lane-wait-times",
      label: "NEXUS lane",
      title: "NEXUS lane wait times",
      description:
        "What a NEXUS border wait means on the Canadian border, how it differs from Ready Lane, and which crossings are NEXUS-only.",
      lead: "On the Canadian border the trusted-traveler lane is NEXUS. Border Time uses that name there, on the same booth type it calls SENTRI in Mexico.",
      sections: [
        {
          heading: "What you are reading",
          paragraphs: [
            "A NEXUS wait is the delay CBP posts for the trusted-traveler lane at that port, for travelers entering the United States. It is not the standard car line. Enrollment rules, including who may be in the vehicle, belong to CBP’s NEXUS program.",
          ],
        },
        {
          heading: "Ready Lane is separate",
          paragraphs: [
            "Where a Canadian port offers Ready Lane, that wait is the RFID line and uses a different document rule. A NEXUS card can be a Ready document. A Ready document is not a NEXUS membership. Read the lane you will actually join.",
          ],
        },
        {
          heading: "Crossings that are NEXUS-only",
          paragraphs: [
            "The Whirlpool Rapids Bridge at Niagara Falls is a NEXUS crossing. If you are not enrolled, pick Peace Bridge, Rainbow Bridge, or Lewiston–Queenston instead. Other ports post a NEXUS lane next to a standard lane. Use the NEXUS number only when you can enter that lane.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-carril-nexus",
      label: "Carril NEXUS",
      title: "Tiempo de espera del carril NEXUS",
      description:
        "Qué significa una espera NEXUS en la frontera con Canadá, en qué se distingue del carril Ready y qué cruces son solo NEXUS.",
      lead: "En la frontera con Canadá el carril de viajero confiable es NEXUS. Border Time usa ese nombre ahí, en el mismo tipo de caseta que en México llama SENTRI.",
      sections: [
        {
          heading: "Qué estás leyendo",
          paragraphs: [
            "Una espera NEXUS es la demora que CBP publica para el carril de viajero confiable de ese puerto, para quien entra a Estados Unidos. No es la fila estándar de autos. Las reglas de inscripción, incluido quién puede ir en el vehículo, son del programa NEXUS de CBP.",
          ],
        },
        {
          heading: "El carril Ready va aparte",
          paragraphs: [
            "Donde un puerto de Canadá ofrece carril Ready, esa espera es la fila con chip RFID y usa otra regla de documentos. Una tarjeta NEXUS puede servir como documento Ready. Un documento Ready no es una membresía NEXUS. Lee el carril al que de verdad te vas a formar.",
          ],
        },
        {
          heading: "Cruces que son solo NEXUS",
          paragraphs: [
            "El Whirlpool Rapids Bridge en Niagara Falls es un cruce NEXUS. Si no estás inscrito, elige el Peace Bridge, el Rainbow Bridge o Lewiston–Queenston. Otros puertos publican un carril NEXUS junto a un carril estándar. Usa el número NEXUS solo cuando puedes entrar a ese carril.",
          ],
        },
      ],
    },
  },
  {
    id: "ready-lane",
    related: ["sentri", "read-a-wait", "nexus"],
    en: {
      slug: "ready-lane-wait-times",
      label: "Ready Lane",
      title: "Ready Lane border wait times",
      description:
        "Who Ready Lane is for, how the RFID line differs from SENTRI and NEXUS, and why everyone in the car needs an eligible card.",
      lead: "Ready Lane is the line for RFID travel cards. It is faster to join only when it is actually shorter than the standard lane, and only when every person in the car qualifies.",
      sections: [
        {
          heading: "The card, not the membership",
          paragraphs: [
            "Ready Lane takes travelers whose document has the RFID chip CBP’s readers use: a passport card, an enhanced driver’s license, a SENTRI, NEXUS, or Global Entry card, or a green card that qualifies. A passport book does not. Everyone in the vehicle needs an eligible document. One person with only a book sends the car to the standard lane.",
          ],
        },
        {
          heading: "A different number from SENTRI",
          paragraphs: [
            "SENTRI and NEXUS are trusted-traveler lanes. Ready Lane is not. The waits are posted separately, and on a busy morning they move on their own. Read Ready if you will use Ready. Read SENTRI or NEXUS if you will use that lane instead.",
          ],
        },
        {
          heading: "When a crossing has no Ready Lane",
          paragraphs: [
            "Some ports do not offer it. Border Time shows N/A for a lane the crossing does not post. That is not a closed lane and not a short wait. Use the standard number there.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-carril-ready",
      label: "Carril Ready",
      title: "Tiempo de espera del carril Ready",
      description:
        "Para quién es el carril Ready, en qué se distingue la fila RFID de SENTRI y de NEXUS, y por qué todas las personas del auto necesitan una tarjeta válida.",
      lead: "El carril Ready es la fila para tarjetas de viaje con chip RFID. Conviene formarse ahí solo cuando de verdad está más corta que el carril estándar, y solo cuando todas las personas del auto califican.",
      sections: [
        {
          heading: "La tarjeta, no la membresía",
          paragraphs: [
            "El carril Ready recibe a quien trae el chip RFID que leen los lectores de CBP: tarjeta de pasaporte, licencia de conducir mejorada, tarjeta SENTRI, NEXUS o Global Entry, o una green card que califique. El libro de pasaporte no. Todas las personas del vehículo necesitan un documento válido. Una persona que solo trae el libro manda el auto al carril estándar.",
          ],
        },
        {
          heading: "Un número distinto al de SENTRI",
          paragraphs: [
            "SENTRI y NEXUS son carriles de viajero confiable. El carril Ready no. Las esperas se publican aparte, y en una mañana llena se mueven cada una por su lado. Lee Ready si vas a usar Ready. Lee SENTRI o NEXUS si vas a usar ese carril.",
          ],
        },
        {
          heading: "Cuando un cruce no tiene carril Ready",
          paragraphs: [
            "Hay puertos que no lo ofrecen. Border Time muestra N/A en un carril que el cruce no publica. Eso no es un carril cerrado ni una espera corta. Ahí se usa el número estándar.",
          ],
        },
      ],
    },
  },
  {
    id: "truck-crossings",
    related: ["laredo", "read-a-wait", "nogales"],
    en: {
      slug: "commercial-truck-border-wait",
      label: "Truck and FAST lanes",
      title: "Commercial truck border wait times and FAST lanes",
      description:
        "Which crossings are built for trucks, how the commercial wait differs from the car wait, and what the FAST lane requires.",
      lead: "A truck is not in the passenger line. CBP posts a commercial wait, and a separate FAST wait, at the ports that move freight.",
      sections: [
        {
          heading: "Read the commercial lane",
          paragraphs: [
            "The commercial number is the standard truck lane. The passenger number beside it is a different queue and a different booth. A port that shows N/A for commercial does not take trucks. Passenger bridges such as San Ysidro and Peace Arch are in that group.",
          ],
        },
        {
          heading: "FAST is its own line",
          paragraphs: [
            "FAST is the faster commercial lane for enrolled drivers and enrolled loads. It is not open to every truck at the port. If you are not enrolled, the standard commercial wait is yours. If you are, compare FAST with FAST when you can choose ports.",
          ],
        },
        {
          heading: "Ports that trucks actually use",
          paragraphs: [
            "On the Mexican border, the freight ports include Otay Mesa, Calexico East, Mariposa at Nogales, Santa Teresa, Ysleta, World Trade and Colombia at Laredo, Pharr, and Veterans International at Brownsville. On the Canadian border, Pacific Highway, the Ambassador Bridge, Blue Water, the Peace Bridge, Lewiston–Queenston, and Champlain post commercial lanes. Each guide for those places says which bridge is the truck bridge.",
          ],
        },
        {
          heading: "The hour matters more for freight",
          paragraphs: [
            "Truck waits swing through the day as booths open and appointments stack up. The live number is the line now. The usual wait for this hour shows whether that line is ordinary. Border Time shows both, and an alert can watch the commercial or FAST lane you named.",
          ],
        },
      ],
    },
    es: {
      slug: "tiempo-espera-camiones-frontera",
      label: "Carriles de camiones y FAST",
      title: "Tiempo de espera de camiones y carriles FAST",
      description:
        "Qué cruces están hechos para camiones, en qué se distingue la espera comercial de la de autos y qué pide el carril FAST.",
      lead: "Un camión no va en la fila de pasajeros. CBP publica una espera comercial, y otra de FAST, en los puertos que mueven carga.",
      sections: [
        {
          heading: "Lee el carril comercial",
          paragraphs: [
            "El número comercial es el carril estándar de camiones. El número de pasajeros de al lado es otra fila y otra caseta. Un puerto que muestra N/A en comercial no recibe camiones. Puentes de pasajeros como San Ysidro y Peace Arch están en ese grupo.",
          ],
        },
        {
          heading: "FAST es su propia fila",
          paragraphs: [
            "FAST es el carril comercial más rápido para conductores inscritos y cargas inscritas. No está abierto a todos los camiones del puerto. Si no estás inscrito, la espera comercial estándar es la tuya. Si lo estás, compara FAST con FAST cuando puedes elegir puerto.",
          ],
        },
        {
          heading: "Puertos que sí usan los camiones",
          paragraphs: [
            "En la frontera con México, los puertos de carga incluyen Otay Mesa, Calexico Este, Mariposa en Nogales, Santa Teresa, Ysleta, World Trade y Colombia en Laredo, Pharr, y Veterans International en Brownsville. En la frontera con Canadá, Pacific Highway, el Ambassador Bridge, Blue Water, el Peace Bridge, Lewiston–Queenston y Champlain publican carriles comerciales. La guía de cada lugar dice cuál es el puente de camiones.",
          ],
        },
        {
          heading: "La hora importa más en la carga",
          paragraphs: [
            "Las esperas de camiones se mueven durante el día conforme abren casetas y se juntan las citas. El número en vivo es la fila de ahora. La espera usual de esta hora muestra si esa fila es la de siempre. Border Time muestra las dos, y una alerta puede vigilar el carril comercial o FAST que nombraste.",
          ],
        },
      ],
    },
  },
  {
    id: "best-time",
    related: ["estimate", "read-a-wait", "border-congestion"],
    en: {
      slug: "best-time-to-cross-the-border",
      label: "Best time to cross",
      title: "Best time to cross the border",
      description:
        "How to pick a quieter hour at a U.S. land port: what usually builds the line, and why the usual wait for that bridge beats a general rule.",
      lead: "There is no single quiet hour for every crossing. The useful comparison is the usual wait for this hour on the bridge and the lane you will use.",
      sections: [
        {
          heading: "What usually fills a line",
          paragraphs: [
            "Weekday mornings fill with work and school traffic at many Mexican-border cities. Friday afternoons and Sunday evenings fill with people heading home. Holiday weekends add a longer peak. Midday in the middle of the week is often the lighter stretch. Those are patterns, not a promise for the bridge in front of you.",
          ],
        },
        {
          heading: "Use the usual wait",
          paragraphs: [
            "Border Time keeps the usual wait for each hour next to the live number. A live wait that matches the usual one is an ordinary hour. A live wait well above it is a spike, and another bridge or a later hour may be the better plan. The usual figure is a typical value for that lane, not a booking.",
          ],
        },
        {
          heading: "The lane changes the hour",
          paragraphs: [
            "SENTRI, NEXUS, Ready, pedestrian, and commercial lanes peak at different times. A quiet car lane can sit beside a long truck lane. Pick the hour for the lane you will join, then add the drive to the bridge. The posted wait starts when you are in line. It does not include the trip to get there.",
          ],
        },
        {
          heading: "Let the crossing tell you",
          paragraphs: [
            "An alert watches a lane and sends a note when it drops under the number you set. A schedule checks the bridges you already use at the hour you already travel. Either one is more specific than a rule of thumb about “the border.”",
          ],
        },
      ],
    },
    es: {
      slug: "mejor-hora-para-cruzar",
      label: "Mejor hora para cruzar",
      title: "La mejor hora para cruzar la frontera",
      description:
        "Cómo elegir una hora más tranquila en un puerto terrestre de EE. UU.: qué suele llenar la fila y por qué la espera usual de ese puente vale más que una regla general.",
      lead: "No hay una sola hora tranquila para todos los cruces. La comparación útil es la espera usual de esta hora en el puente y el carril que vas a usar.",
      sections: [
        {
          heading: "Qué suele llenar una fila",
          paragraphs: [
            "Las mañanas de entre semana se llenan con el tráfico de trabajo y de escuela en muchas ciudades de la frontera con México. Los viernes por la tarde y los domingos por la noche se llenan con quien regresa a casa. Los fines de semana festivos alargan el pico. El mediodía a mitad de semana suele ser el tramo más ligero. Son patrones, no una promesa para el puente que tienes enfrente.",
          ],
        },
        {
          heading: "Usa la espera usual",
          paragraphs: [
            "Border Time guarda la espera usual de cada hora junto al número en vivo. Una espera en vivo que coincide con la usual es una hora normal. Una espera en vivo muy por encima es un pico, y otro puente u otra hora puede ser mejor plan. La cifra usual es un valor típico de ese carril, no una reserva.",
          ],
        },
        {
          heading: "El carril cambia la hora",
          paragraphs: [
            "Los carriles SENTRI, NEXUS, Ready, peatonal y comercial tienen el pico a horas distintas. Un carril de autos tranquilo puede estar junto a un carril de camiones largo. Elige la hora del carril al que te vas a formar y luego suma el trayecto al puente. La espera publicada empieza cuando ya estás en la fila. No incluye el camino para llegar.",
          ],
        },
        {
          heading: "Deja que el cruce te avise",
          paragraphs: [
            "Una alerta vigila un carril y manda un aviso cuando baja del número que fijaste. Un horario revisa los puentes que ya usas a la hora en que ya viajas. Cualquiera de los dos es más concreto que una regla general sobre “la frontera”.",
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
