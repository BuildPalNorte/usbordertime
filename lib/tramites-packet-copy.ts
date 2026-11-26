import type {
  FieldId,
  FieldProblem,
  OptionKey,
  SectionId,
  SecurityId,
} from "@/lib/tramites-packet";

/** Words for the agency packet, in both languages. `COPY.tramites.packet` points here. */

export type PacketFieldCopy = { label: string; help?: string; placeholder?: string };

export type TramitesPacketCopy = {
  metaTitle: string;
  metaDescription: string;
  entry: { title: string; body: string; cta: string; resume: string };
  back: string;
  saved: string;
  stepOf: (n: number, total: number) => string;
  progressLabel: string;
  next: string;
  previous: string;
  toReview: string;
  dna: string;
  yes: string;
  no: string;
  choose: string;
  errors: Record<FieldProblem, string>;
  fixCount: (n: number) => string;
  sections: Record<SectionId, { title: string; lead: string }>;
  /** One title per screen of a section, in order. A one-screen section repeats its own title. */
  pageTitles: Record<SectionId, readonly string[]>;
  /** Shown when answers were filled in from details saved on this device. */
  reused: string;
  scan: {
    title: string;
    body: string;
    take: string;
    choose: string;
    reading: string;
    readingFirst: string;
    found: string;
    use: string;
    retry: string;
    partial: string;
    done: (n: number) => string;
    noStrip: string;
    failed: string;
    privacy: string;
  };
  percentDone: (pct: number) => string;
  fields: Record<FieldId, PacketFieldCopy>;
  options: Record<OptionKey, string>;
  docs: { have: string; none: string };
  review: {
    title: string;
    lead: string;
    edit: string;
    blank: string;
    stepsLeft: (n: number) => string;
    finish: string;
    flagTitle: string;
    flagBody: string;
    attestLabel: string;
    attestLocked: string;
    readyTitle: string;
    readyBody: string;
    copy: string;
    copied: string;
    clear: string;
    clearConfirm: string;
    soon: string;
  };
  nudge: { title: string; body: string; dismiss: string };
  hedge: string;
  privacy: string;
};

/** Every security question reads the same way: a yes opens one explanation box. */
function security(
  questions: Record<SecurityId, string>,
  why: PacketFieldCopy,
): Record<SecurityId | `${SecurityId}Why`, PacketFieldCopy> {
  const out: Record<string, PacketFieldCopy> = {};
  for (const [id, label] of Object.entries(questions)) {
    out[id] = { label };
    out[`${id}Why`] = why;
  }
  return out as Record<SecurityId | `${SecurityId}Why`, PacketFieldCopy>;
}

const en: TramitesPacketCopy = {
  metaTitle: "Prepare your visa packet",
  metaDescription: "Answer once, step by step, and get a complete packet ready for an agency to file. Saved on your device.",
  entry: {
    title: "Get your packet ready for an agency",
    body: "Answer the questions a visa helper needs, one short step at a time. Everything stays on this device. Nothing is sent or filed.",
    cta: "Prepare my packet",
    resume: "Continue my packet",
  },
  back: "Back to checklist",
  saved: "Saved on this device",
  stepOf: (n, total) => {
    if (n >= total) return "Last step";
    if (n >= total - 2) return `Almost done · ${n} of ${total}`;
    return `${n} of ${total}`;
  },
  progressLabel: "Packet progress",
  next: "Continue",
  previous: "Back",
  toReview: "Review my packet",
  dna: "Does not apply",
  yes: "Yes",
  no: "No",
  choose: "Choose one",
  errors: {
    required: "This one is needed.",
    email: "Check the email address.",
    birthFuture: "That date is in the future.",
    expiryOrder: "Expiry must come after the issue date.",
    expired: "This passport has expired.",
  },
  fixCount: (n) => (n === 1 ? "1 answer needs a look." : `${n} answers need a look.`),
  pageTitles: {
    errand: ["What do you need?"],
    personal: ["Your name", "Where and when you were born", "Nationality and IDs"],
    contact: ["Where you live", "How to reach you"],
    passport: ["Your passport", "Dates on your passport"],
    travel: ["Your trip", "Where you will stay"],
    prior: ["Your past visits", "Refusals and lost visas"],
    uscontact: ["Who you will see in the U.S."],
    family: ["Your parents", "Spouse and relatives"],
    work: ["What you do", "Past work"],
    security: ["Health and the law", "Safety and honesty", "Past stays and entries"],
    docs: ["Documents"],
  },
  reused: "Filled in from details you saved on this device. Check they are still right.",
  scan: {
    title: "Skip the typing: scan your passport or ID",
    body: "Take a photo and we fill in what we can. You check it before it goes in.",
    take: "Take a photo",
    choose: "Choose a photo",
    reading: "Reading your document…",
    readingFirst: "Reading your document… the first time takes a little longer.",
    found: "Here is what we read",
    use: "Fill these in",
    retry: "Try again",
    partial: "Some of this may be misread. Check each answer after it is filled in.",
    done: (n) => (n === 1 ? "Filled in 1 answer. Check it below." : `Filled in ${n} answers. Check them below.`),
    noStrip:
      "We could not find the two or three lines of letters and < marks at the bottom of the page. Try a flat, well-lit photo with those lines in view.",
    failed: "That did not work on this device. You can type your answers instead.",
    privacy: "Read on this device. The photo is not uploaded or saved.",
  },
  percentDone: (pct) => `${pct}% done`,
  sections: {
    errand: { title: "What do you need?", lead: "Pick the errand and we will tailor your document list." },
    personal: { title: "About you", lead: "Write it the way your passport shows it." },
    contact: { title: "How to reach you", lead: "Where you live, and how the agency can contact you." },
    passport: { title: "Your passport", lead: "Open the photo page and copy it exactly." },
    travel: { title: "Your trip", lead: "A best guess is fine for dates you have not booked." },
    prior: { title: "Past U.S. travel", lead: "Visas and visits you have had before." },
    uscontact: { title: "Who you will see in the U.S.", lead: "A person or place you will visit. Tick the box if there is none." },
    family: { title: "Your family", lead: "Parents, spouse, and relatives in the U.S." },
    work: { title: "Work or school", lead: "What you do now, and any past job." },
    security: {
      title: "Background questions",
      lead: "Answer honestly. A yes does not decide anything here. Your agency will need the details.",
    },
    docs: { title: "Documents", lead: "Tick what you already have. Nothing is uploaded." },
  },
  fields: {
    errand: { label: "I need" },
    surname: { label: "Surnames", help: "Both family names, as in the passport." },
    givenNames: { label: "Given names", help: "All first and middle names." },
    nativeName: { label: "Name in your own alphabet", help: "Only if it is not written in English letters." },
    otherNames: { label: "Have you used other names?", help: "A maiden name or an earlier spelling." },
    otherNamesList: { label: "Other names", placeholder: "One per line" },
    sex: { label: "Sex" },
    marital: { label: "Marital status" },
    birthDate: { label: "Date of birth" },
    birthCity: { label: "City of birth" },
    birthState: { label: "State of birth" },
    birthCountry: { label: "Country of birth" },
    nationality: { label: "Nationality", placeholder: "Mexican" },
    otherNationality: { label: "Do you hold another nationality?" },
    otherNationalityList: { label: "Which ones?" },
    curp: { label: "CURP or national ID number" },
    ssn: { label: "U.S. Social Security number", help: "Only if one was ever issued to you." },
    taxId: { label: "U.S. taxpayer ID", help: "Only if one was ever issued to you." },
    street: { label: "Street and number" },
    city: { label: "City" },
    state: { label: "State" },
    postal: { label: "Postal code" },
    country: { label: "Country" },
    mailingSame: { label: "Is your mailing address the same?" },
    mailingAddress: { label: "Mailing address" },
    phone: { label: "Main phone", help: "Include the area code." },
    phone2: { label: "Second phone" },
    email: { label: "Email" },
    social: { label: "Social media handles", help: "Usernames you use. The form asks for them." },
    passportNumber: { label: "Passport number" },
    bookNumber: { label: "Passport book number", help: "Printed on the pages of newer passports." },
    issueCountry: { label: "Issuing country" },
    issueCity: { label: "City of issue" },
    issueDate: { label: "Issue date" },
    expiryDate: { label: "Expiry date" },
    passportLost: { label: "Has a passport ever been lost or stolen?" },
    passportLostDetails: { label: "What happened?" },
    purpose: { label: "Main reason for the trip" },
    plans: { label: "Have you booked travel?" },
    arrivalDate: { label: "Date you expect to arrive" },
    stayLength: { label: "How long will you stay?", placeholder: "For example, 7 days" },
    usAddress: { label: "Where will you stay?", help: "Hotel or address, with city and state." },
    payer: { label: "Who pays for the trip?" },
    payerDetails: { label: "Who is that?", help: "Name, relationship, and contact." },
    companions: { label: "Is anyone traveling with you?" },
    companionsList: { label: "Who?", help: "Name and relationship, one per line." },
    beenToUS: { label: "Have you been to the U.S. before?" },
    lastVisit: { label: "When was your last visit and for how long?" },
    hadVisa: { label: "Have you had a U.S. visa?" },
    visaDetails: { label: "Visa details", help: "Number, issue date, and type if you know them." },
    refused: { label: "Has a visa ever been refused?" },
    refusedDetails: { label: "What happened?", help: "Date, place, and the reason given." },
    visaLost: { label: "Was a visa ever lost or stolen?" },
    visaLostDetails: { label: "What happened?" },
    contactName: { label: "Name of the person or place" },
    contactRelation: { label: "How are they related to you?" },
    contactAddress: { label: "Their address" },
    contactPhone: { label: "Their phone" },
    fatherName: { label: "Father's full name" },
    fatherBirth: { label: "Father's date of birth" },
    motherName: { label: "Mother's full name" },
    motherBirth: { label: "Mother's date of birth" },
    spouseName: { label: "Spouse's full name" },
    spouseBirth: { label: "Spouse's date of birth" },
    usRelatives: { label: "Do you have relatives in the U.S.?" },
    usRelativesList: { label: "Who and where?", help: "Name, relationship, and their U.S. status." },
    occupation: { label: "What do you do?" },
    employerName: { label: "Employer or school" },
    employerAddress: { label: "Address" },
    employerPhone: { label: "Phone" },
    income: { label: "Monthly income", help: "In pesos, as a rough figure." },
    duties: { label: "What do you do there?" },
    prevJob: { label: "Did you have another job or school before?" },
    prevJobDetails: { label: "Tell us about it", help: "Where, what you did, and the dates." },
    ...security(
      {
        secDisease: "Do you have a contagious disease that is a public health risk?",
        secDrugs: "Are you, or have you been, a drug abuser or addict?",
        secArrested: "Have you ever been arrested or convicted of a crime?",
        secControlled: "Have you ever broken a law on controlled substances?",
        secTrafficking: "Have you ever been involved in human trafficking?",
        secTerror: "Have you ever been involved in terrorism or supported a terrorist group?",
        secFraud: "Have you ever sought a visa or entry to the U.S. by fraud or false papers?",
        secRemoved: "Have you ever been removed or deported from any country?",
        secOverstay: "Have you ever stayed in the U.S. longer than you were allowed?",
        secEntry: "Have you ever entered the U.S. without being inspected?",
      },
      { label: "Explain", help: "Dates, places, and what happened. Your agency needs this." },
    ),
  },
  options: {
    "errand.first": "First visa",
    "errand.card": "Border crossing card",
    "errand.renewal": "Renewal",
    "errand.lost": "Lost or stolen",
    "sex.female": "Female",
    "sex.male": "Male",
    "marital.single": "Single",
    "marital.married": "Married",
    "marital.commonLaw": "Living together",
    "marital.widowed": "Widowed",
    "marital.divorced": "Divorced",
    "marital.separated": "Separated",
    "purpose.tourism": "Tourism or visit",
    "purpose.business": "Business",
    "purpose.medical": "Medical care",
    "purpose.other": "Something else",
    "payer.self": "I do",
    "payer.relative": "A relative",
    "payer.employer": "My employer",
    "payer.other": "Someone else",
    "contactRelation.relative": "Relative",
    "contactRelation.friend": "Friend",
    "contactRelation.business": "Business contact",
    "contactRelation.hotel": "Hotel",
    "contactRelation.other": "Other",
    "occupation.employed": "Employed",
    "occupation.selfEmployed": "Self-employed",
    "occupation.student": "Student",
    "occupation.homemaker": "Homemaker",
    "occupation.retired": "Retired",
    "occupation.unemployed": "Not working",
  },
  docs: { have: "I have this", none: "Pick an errand first and its documents will appear here." },
  review: {
    title: "Review your packet",
    lead: "Check each section. Tap Edit to change anything.",
    edit: "Edit",
    blank: "Not answered",
    stepsLeft: (n) => (n === 1 ? "1 step still needs answers." : `${n} steps still need answers.`),
    finish: "Finish",
    flagTitle: "Your agency should read this closely",
    flagBody:
      "You answered yes to a question about a past stay, removal, or entry. This packet cannot judge that. Talk to someone who can review your whole file.",
    attestLabel: "I read every answer and it is true and complete.",
    attestLocked: "Finish every step to sign off.",
    readyTitle: "Your packet is ready",
    readyBody: "Everything is here for when you are ready to hand it off. Copy the summary, or keep going later — it stays on this device.",
    copy: "Copy summary",
    copied: "Copied",
    clear: "Delete my packet",
    clearConfirm: "Delete this packet and the saved details that fill in new ones, from this device? This cannot be undone.",
    soon: "Agency handoff is coming soon.",
  },
  nudge: {
    title: "Keep your progress safe",
    body: "Sign in with Google to find your packet again if you switch phones. You can keep going without it.",
    dismiss: "Not now",
  },
  hedge: "Independent help from Border Time. Not a government office, not legal advice, and no approval is promised.",
  privacy: "Your answers stay in this browser, and your basic details are kept here so you only type them once. Clearing site data removes them.",
};

const es: TramitesPacketCopy = {
  metaTitle: "Prepara tu expediente de visa",
  metaDescription: "Responde una vez, paso a paso, y deja un expediente completo listo para que una agencia lo tramite. Se guarda en tu dispositivo.",
  entry: {
    title: "Deja tu expediente listo para una agencia",
    body: "Responde lo que necesita quien te ayuda con la visa, en pasos cortos. Todo se queda en este dispositivo. No se envía ni se presenta nada.",
    cta: "Preparar mi expediente",
    resume: "Continuar mi expediente",
  },
  back: "Volver a la lista",
  saved: "Guardado en este dispositivo",
  stepOf: (n, total) => {
    if (n >= total) return "Último paso";
    if (n >= total - 2) return `Casi listo · ${n} de ${total}`;
    return `${n} de ${total}`;
  },
  progressLabel: "Avance del expediente",
  next: "Continuar",
  previous: "Atrás",
  toReview: "Revisar mi expediente",
  dna: "No aplica",
  yes: "Sí",
  no: "No",
  choose: "Elige una",
  errors: {
    required: "Este dato es necesario.",
    email: "Revisa el correo.",
    birthFuture: "Esa fecha es futura.",
    expiryOrder: "El vencimiento debe ser después de la expedición.",
    expired: "Este pasaporte está vencido.",
  },
  fixCount: (n) => (n === 1 ? "1 respuesta necesita revisión." : `${n} respuestas necesitan revisión.`),
  pageTitles: {
    errand: ["¿Qué necesitas?"],
    personal: ["Tu nombre", "Dónde y cuándo naciste", "Nacionalidad e identificaciones"],
    contact: ["Dónde vives", "Cómo contactarte"],
    passport: ["Tu pasaporte", "Fechas de tu pasaporte"],
    travel: ["Tu viaje", "Dónde te quedarás"],
    prior: ["Tus visitas anteriores", "Negativas y visas perdidas"],
    uscontact: ["A quién verás en EE. UU."],
    family: ["Tus padres", "Cónyuge y familiares"],
    work: ["A qué te dedicas", "Trabajo anterior"],
    security: ["Salud y ley", "Seguridad y honestidad", "Estancias y entradas pasadas"],
    docs: ["Documentos"],
  },
  reused: "Llenado con datos que guardaste en este dispositivo. Revisa que sigan correctos.",
  scan: {
    title: "Sin teclear: escanea tu pasaporte o identificación",
    body: "Toma una foto y llenamos lo que podamos. Tú lo revisas antes de que se guarde.",
    take: "Tomar foto",
    choose: "Elegir foto",
    reading: "Leyendo tu documento…",
    readingFirst: "Leyendo tu documento… la primera vez tarda un poco más.",
    found: "Esto es lo que leímos",
    use: "Llenar estos datos",
    retry: "Intentar de nuevo",
    partial: "Algo de esto podría estar mal leído. Revisa cada respuesta después de llenarla.",
    done: (n) => (n === 1 ? "Se llenó 1 respuesta. Revísala abajo." : `Se llenaron ${n} respuestas. Revísalas abajo.`),
    noStrip:
      "No encontramos las dos o tres líneas de letras y signos < al pie de la página. Prueba con una foto plana y bien iluminada donde se vean esas líneas.",
    failed: "No funcionó en este dispositivo. Puedes escribir tus respuestas.",
    privacy: "Se lee en este dispositivo. La foto no se sube ni se guarda.",
  },
  percentDone: (pct) => `${pct}% listo`,
  sections: {
    errand: { title: "¿Qué necesitas?", lead: "Elige el trámite y ajustamos tu lista de documentos." },
    personal: { title: "Sobre ti", lead: "Escríbelo como aparece en tu pasaporte." },
    contact: { title: "Cómo contactarte", lead: "Dónde vives y cómo te localiza la agencia." },
    passport: { title: "Tu pasaporte", lead: "Abre la página de la foto y cópialo igual." },
    travel: { title: "Tu viaje", lead: "Si aún no reservas, una fecha aproximada sirve." },
    prior: { title: "Viajes previos a EE. UU.", lead: "Visas y visitas que ya tuviste." },
    uscontact: { title: "A quién verás en EE. UU.", lead: "Una persona o lugar que visitarás. Marca la casilla si no hay." },
    family: { title: "Tu familia", lead: "Padres, cónyuge y familiares en EE. UU." },
    work: { title: "Trabajo o escuela", lead: "A qué te dedicas ahora y algún empleo anterior." },
    security: {
      title: "Preguntas de antecedentes",
      lead: "Responde con la verdad. Un sí no decide nada aquí. Tu agencia necesitará los detalles.",
    },
    docs: { title: "Documentos", lead: "Marca lo que ya tienes. No se sube nada." },
  },
  fields: {
    errand: { label: "Necesito" },
    surname: { label: "Apellidos", help: "Los dos apellidos, como en el pasaporte." },
    givenNames: { label: "Nombres", help: "Todos los nombres." },
    nativeName: { label: "Nombre en tu alfabeto", help: "Solo si no se escribe con letras latinas." },
    otherNames: { label: "¿Has usado otros nombres?", help: "Apellido de soltera o una grafía anterior." },
    otherNamesList: { label: "Otros nombres", placeholder: "Uno por línea" },
    sex: { label: "Sexo" },
    marital: { label: "Estado civil" },
    birthDate: { label: "Fecha de nacimiento" },
    birthCity: { label: "Ciudad de nacimiento" },
    birthState: { label: "Estado de nacimiento" },
    birthCountry: { label: "País de nacimiento" },
    nationality: { label: "Nacionalidad", placeholder: "Mexicana" },
    otherNationality: { label: "¿Tienes otra nacionalidad?" },
    otherNationalityList: { label: "¿Cuáles?" },
    curp: { label: "CURP o número de identificación" },
    ssn: { label: "Número de Seguro Social de EE. UU.", help: "Solo si alguna vez te asignaron uno." },
    taxId: { label: "ID de contribuyente de EE. UU.", help: "Solo si alguna vez te asignaron uno." },
    street: { label: "Calle y número" },
    city: { label: "Ciudad" },
    state: { label: "Estado" },
    postal: { label: "Código postal" },
    country: { label: "País" },
    mailingSame: { label: "¿Tu dirección de correo es la misma?" },
    mailingAddress: { label: "Dirección de correo" },
    phone: { label: "Teléfono principal", help: "Con lada." },
    phone2: { label: "Segundo teléfono" },
    email: { label: "Correo electrónico" },
    social: { label: "Redes sociales", help: "Tus usuarios. El formulario los pide." },
    passportNumber: { label: "Número de pasaporte" },
    bookNumber: { label: "Número de libreta", help: "Viene impreso en las hojas de los pasaportes nuevos." },
    issueCountry: { label: "País que lo expidió" },
    issueCity: { label: "Ciudad de expedición" },
    issueDate: { label: "Fecha de expedición" },
    expiryDate: { label: "Fecha de vencimiento" },
    passportLost: { label: "¿Alguna vez perdiste o te robaron un pasaporte?" },
    passportLostDetails: { label: "¿Qué pasó?" },
    purpose: { label: "Motivo principal del viaje" },
    plans: { label: "¿Ya reservaste el viaje?" },
    arrivalDate: { label: "Fecha en que piensas llegar" },
    stayLength: { label: "¿Cuánto tiempo te quedarás?", placeholder: "Por ejemplo, 7 días" },
    usAddress: { label: "¿Dónde te hospedarás?", help: "Hotel o dirección, con ciudad y estado." },
    payer: { label: "¿Quién paga el viaje?" },
    payerDetails: { label: "¿Quién es?", help: "Nombre, parentesco y contacto." },
    companions: { label: "¿Viaja alguien contigo?" },
    companionsList: { label: "¿Quién?", help: "Nombre y parentesco, uno por línea." },
    beenToUS: { label: "¿Has estado en EE. UU.?" },
    lastVisit: { label: "¿Cuándo fue tu última visita y cuánto duró?" },
    hadVisa: { label: "¿Has tenido visa de EE. UU.?" },
    visaDetails: { label: "Datos de la visa", help: "Número, fecha y tipo si los sabes." },
    refused: { label: "¿Alguna vez te negaron una visa?" },
    refusedDetails: { label: "¿Qué pasó?", help: "Fecha, lugar y el motivo que te dieron." },
    visaLost: { label: "¿Alguna vez perdiste o te robaron una visa?" },
    visaLostDetails: { label: "¿Qué pasó?" },
    contactName: { label: "Nombre de la persona o lugar" },
    contactRelation: { label: "¿Qué relación tiene contigo?" },
    contactAddress: { label: "Su dirección" },
    contactPhone: { label: "Su teléfono" },
    fatherName: { label: "Nombre completo de tu padre" },
    fatherBirth: { label: "Fecha de nacimiento de tu padre" },
    motherName: { label: "Nombre completo de tu madre" },
    motherBirth: { label: "Fecha de nacimiento de tu madre" },
    spouseName: { label: "Nombre completo de tu cónyuge" },
    spouseBirth: { label: "Fecha de nacimiento de tu cónyuge" },
    usRelatives: { label: "¿Tienes familiares en EE. UU.?" },
    usRelativesList: { label: "¿Quiénes y dónde?", help: "Nombre, parentesco y su situación migratoria." },
    occupation: { label: "¿A qué te dedicas?" },
    employerName: { label: "Empresa o escuela" },
    employerAddress: { label: "Dirección" },
    employerPhone: { label: "Teléfono" },
    income: { label: "Ingreso mensual", help: "En pesos, aproximado." },
    duties: { label: "¿Qué haces ahí?" },
    prevJob: { label: "¿Tuviste otro empleo o escuela antes?" },
    prevJobDetails: { label: "Cuéntanos", help: "Dónde, qué hacías y las fechas." },
    ...security(
      {
        secDisease: "¿Tienes una enfermedad contagiosa que sea un riesgo para la salud pública?",
        secDrugs: "¿Eres o has sido consumidor o adicto a drogas?",
        secArrested: "¿Alguna vez te arrestaron o condenaron por un delito?",
        secControlled: "¿Alguna vez violaste una ley sobre sustancias controladas?",
        secTrafficking: "¿Alguna vez participaste en trata de personas?",
        secTerror: "¿Alguna vez participaste en terrorismo o apoyaste a un grupo terrorista?",
        secFraud: "¿Alguna vez buscaste una visa o entrar a EE. UU. con fraude o documentos falsos?",
        secRemoved: "¿Alguna vez te removieron o deportaron de algún país?",
        secOverstay: "¿Alguna vez te quedaste en EE. UU. más tiempo del permitido?",
        secEntry: "¿Alguna vez entraste a EE. UU. sin ser inspeccionado?",
      },
      { label: "Explica", help: "Fechas, lugares y qué pasó. Tu agencia lo necesita." },
    ),
  },
  options: {
    "errand.first": "Primera visa",
    "errand.card": "Tarjeta de cruce",
    "errand.renewal": "Renovación",
    "errand.lost": "Perdida o robada",
    "sex.female": "Mujer",
    "sex.male": "Hombre",
    "marital.single": "Soltero(a)",
    "marital.married": "Casado(a)",
    "marital.commonLaw": "Unión libre",
    "marital.widowed": "Viudo(a)",
    "marital.divorced": "Divorciado(a)",
    "marital.separated": "Separado(a)",
    "purpose.tourism": "Turismo o visita",
    "purpose.business": "Negocios",
    "purpose.medical": "Atención médica",
    "purpose.other": "Otro",
    "payer.self": "Yo",
    "payer.relative": "Un familiar",
    "payer.employer": "Mi empleador",
    "payer.other": "Otra persona",
    "contactRelation.relative": "Familiar",
    "contactRelation.friend": "Amistad",
    "contactRelation.business": "Contacto de negocios",
    "contactRelation.hotel": "Hotel",
    "contactRelation.other": "Otro",
    "occupation.employed": "Empleado(a)",
    "occupation.selfEmployed": "Por mi cuenta",
    "occupation.student": "Estudiante",
    "occupation.homemaker": "Hogar",
    "occupation.retired": "Jubilado(a)",
    "occupation.unemployed": "Sin trabajo",
  },
  docs: { have: "Ya lo tengo", none: "Elige primero un trámite y aquí aparecen sus documentos." },
  review: {
    title: "Revisa tu expediente",
    lead: "Revisa cada sección. Toca Editar para cambiar algo.",
    edit: "Editar",
    blank: "Sin responder",
    stepsLeft: (n) => (n === 1 ? "A 1 paso aún le faltan respuestas." : `A ${n} pasos aún les faltan respuestas.`),
    finish: "Terminar",
    flagTitle: "Tu agencia debe leer esto con cuidado",
    flagBody:
      "Respondiste que sí a una pregunta sobre una estancia, remoción o entrada pasada. Este expediente no puede evaluarlo. Habla con alguien que revise tu caso completo.",
    attestLabel: "Leí cada respuesta y es verdadera y completa.",
    attestLocked: "Termina todos los pasos para firmar.",
    readyTitle: "Tu expediente está listo",
    readyBody: "Todo está aquí para cuando quieras entregarlo. Copia el resumen, o sigue después — se queda en este dispositivo.",
    copy: "Copiar resumen",
    copied: "Copiado",
    clear: "Borrar mi expediente",
    clearConfirm: "¿Borrar este expediente y los datos guardados que llenan los nuevos, de este dispositivo? No se puede deshacer.",
    soon: "La entrega a una agencia llega pronto.",
  },
  nudge: {
    title: "Cuida tu avance",
    body: "Inicia sesión con Google para encontrar tu expediente si cambias de teléfono. Puedes seguir sin hacerlo.",
    dismiss: "Ahora no",
  },
  hedge: "Ayuda independiente de Border Time. No es una oficina de gobierno, no es asesoría legal y no se promete aprobación.",
  privacy: "Tus respuestas se quedan en este navegador, y tus datos básicos se guardan aquí para que los escribas una sola vez. Borrar los datos del sitio los elimina.",
};

export const PACKET_COPY = { en, es } as const;
