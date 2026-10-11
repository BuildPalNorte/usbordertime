import type { Mode, PortName, Reading, StatusKey, Tone } from "@/lib/ports";
import type { PortWaitTime } from "@/lib/border-wait-times";

export type Locale = "en" | "es";

export const LOCALE_COOKIE = "usbordertime.lang";
export const LOCALE_STORAGE_KEY = "usbordertime.lang.v1";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}

type ModeCopy = Record<Exclude<Mode, "sentri">, string>;

export type Copy = {
  metaTitle: string;
  metaDescription: string;
  wallet: string;
  crossings: string;
  browse: string;
  nothingSaved: string;
  done: string;
  refresh: string;
  emptyTitle: string;
  emptyBody: string;
  browseCrossings: string;
  startWithBrownsville: string;
  loading: string;
  searchLabel: string;
  searchPlaceholder: string;
  clearSearch: string;
  border: string;
  mexico: string;
  canada: string;
  all: string;
  add: string;
  added: string;
  showDetails: (name: string) => string;
  hideDetails: (name: string) => string;
  addToWallet: (name: string) => string;
  removeFromWalletNamed: (name: string) => string;
  noMatch: (query: string) => string;
  noCrossings: string;
  noMatchHint: string;
  loadErrorTitle: string;
  loadErrorBody: string;
  tryAgain: string;
  laneType: string;
  minuteUnit: string;
  notPublished: string;
  status: string;
  hours: string;
  reported: string;
  unknown: string;
  unavailable: string;
  open: string;
  hoursUnavailable: string;
  localTime: (time: string) => string;
  removeFromWallet: string;
  sections: string;
  languageToSpanish: string;
  languageToEnglish: string;
  themeToLight: string;
  themeToDark: string;
  canadianBorder: string;
  mexicanBorder: string;
  cbpNotice: string;
  undo: string;
  view: string;
  notFoundTitle: string;
  notFoundCard: string;
  notFoundCrossing: string;
  notFoundRoute: string;
  notFoundLanes: string;
  notFoundHeadline: string;
  notFoundBody: string;
  backToWallet: string;
  closed: string;
  pageTitle: (title: string) => string;
  savedSummary: (count: number, updatedAt: string | null) => string;
  reportedCount: (count: number) => string;
  minutes: (count: number) => string;
  minuteWait: (count: number) => string;
  lanesOpen: (open: number, max: number | null) => string;
  bookmark: (city: string) => string;
  removeBookmark: (city: string) => string;
  bookmarkedToast: (city: string) => string;
  removedBookmarkToast: (city: string) => string;
  addedToast: (name: string) => string;
  removedToast: (name: string) => string;
  reorderHint: string;
  sendBackHint: string;
  sentToBack: (name: string) => string;
  movedTo: (name: string, position: number, total: number) => string;
  mode: ModeCopy;
  tone: Record<Tone, string>;
  laneStatus: Record<StatusKey, string>;
};

export const COPY: Record<Locale, Copy> = {
  en: {
    metaTitle: "Border Time",
    metaDescription: "Live US border wait times for the bridges you cross, kept in a wallet.",
    wallet: "Wallet",
    crossings: "Crossings",
    browse: "Browse",
    nothingSaved: "Nothing saved yet",
    done: "Done",
    refresh: "Refresh wait times",
    emptyTitle: "Your wallet is empty",
    emptyBody: "Add the bridges you cross and see their live wait times in one stack.",
    browseCrossings: "Browse crossings",
    startWithBrownsville: "Start with Brownsville",
    loading: "Loading live data",
    searchLabel: "Search crossings",
    searchPlaceholder: "Search a bridge or city",
    clearSearch: "Clear search",
    border: "Border",
    mexico: "Mexico",
    canada: "Canada",
    all: "All",
    add: "Add",
    added: "Added",
    showDetails: (name) => `Show details for ${name}`,
    hideDetails: (name) => `Hide details for ${name}`,
    addToWallet: (name) => `Add ${name} to wallet`,
    removeFromWalletNamed: (name) => `Remove ${name} from wallet`,
    noMatch: (query) => `No crossings match "${query}"`,
    noCrossings: "No crossings here",
    noMatchHint: "Try a city name or switch borders.",
    loadErrorTitle: "Could not load wait times",
    loadErrorBody: "The CBP feed did not respond. Check your connection and try again.",
    tryAgain: "Try again",
    laneType: "Lane type",
    minuteUnit: "min",
    notPublished: "Not published here",
    status: "Status",
    hours: "Hours",
    reported: "Reported",
    unknown: "Unknown",
    unavailable: "Unavailable",
    open: "Open",
    hoursUnavailable: "Hours unavailable",
    localTime: (time) => `${time} local`,
    removeFromWallet: "Remove from wallet",
    sections: "Sections",
    languageToSpanish: "Cambiar a español",
    languageToEnglish: "Switch to English",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    canadianBorder: "Canadian border",
    mexicanBorder: "Mexican border",
    cbpNotice: "CBP notice, in English",
    undo: "Undo",
    view: "View",
    notFoundTitle: "Page not found",
    notFoundCard: "Page not found",
    notFoundCrossing: "No such crossing",
    notFoundRoute: "Route",
    notFoundLanes: "0 lanes open",
    notFoundHeadline: "This page isn't in your wallet",
    notFoundBody: "The link may be old or mistyped. Your saved crossings are right where you left them.",
    backToWallet: "Back to wallet",
    closed: "Closed",
    pageTitle: (title) => `${title} | Border Time`,
    savedSummary: (count, updatedAt) => {
      const noun = count === 1 ? "crossing" : "crossings";
      return updatedAt ? `${count} ${noun}, updated ${updatedAt}` : `${count} ${noun}`;
    },
    reportedCount: (count) => `${count} crossings reported by CBP`,
    minutes: (count) => `${count} min`,
    minuteWait: (count) => `${count} minute wait`,
    lanesOpen: (open, max) => {
      const base = `${open} ${open === 1 ? "lane" : "lanes"} open`;
      return max ? `${base} of ${max}` : base;
    },
    bookmark: (city) => `Bookmark ${city}`,
    removeBookmark: (city) => `Remove bookmark for ${city}`,
    bookmarkedToast: (city) => `Bookmarked ${city}`,
    removedBookmarkToast: (city) => `Removed bookmark for ${city}`,
    addedToast: (name) => `Added ${name}`,
    removedToast: (name) => `Removed ${name}`,
    reorderHint: "Hold and drag to rearrange",
    sendBackHint: "Swipe left or right to send it back",
    sentToBack: (name) => `${name} sent to the back`,
    movedTo: (name, position, total) => `${name} moved to ${position} of ${total}`,
    mode: {
      car: "Car",
      ready: "Ready lane",
      walk: "Walking",
      truck: "Truck",
      fast: "FAST truck",
    },
    tone: {
      clear: "Clear",
      busy: "Moderate",
      slow: "Long wait",
      closed: "Closed",
      unknown: "No data",
    },
    laneStatus: {
      closed: "Closed",
      notOffered: "Not offered",
      lanesClosed: "Lanes closed",
      pending: "Update pending",
    },
  },
  es: {
    metaTitle: "Border Time",
    metaDescription: "Tiempos de espera en vivo de los puentes que cruzas, guardados en una cartera.",
    wallet: "Cartera",
    crossings: "Cruces",
    browse: "Explorar",
    nothingSaved: "Nada guardado",
    done: "Listo",
    refresh: "Actualizar tiempos de espera",
    emptyTitle: "Tu cartera está vacía",
    emptyBody: "Agrega los puentes que cruzas y mira la espera en vivo, en un solo montón.",
    browseCrossings: "Ver cruces",
    startWithBrownsville: "Empezar con Brownsville",
    loading: "Cargando datos en vivo",
    searchLabel: "Buscar cruces",
    searchPlaceholder: "Busca un puente o una ciudad",
    clearSearch: "Borrar búsqueda",
    border: "Frontera",
    mexico: "México",
    canada: "Canadá",
    all: "Todos",
    add: "Agregar",
    added: "Agregado",
    showDetails: (name) => `Ver detalles de ${name}`,
    hideDetails: (name) => `Ocultar detalles de ${name}`,
    addToWallet: (name) => `Agregar ${name} a la cartera`,
    removeFromWalletNamed: (name) => `Quitar ${name} de la cartera`,
    noMatch: (query) => `Ningún cruce coincide con "${query}"`,
    noCrossings: "No hay cruces aquí",
    noMatchHint: "Prueba con una ciudad o cambia de frontera.",
    loadErrorTitle: "No se pudieron cargar los tiempos",
    loadErrorBody: "CBP no respondió. Revisa tu conexión e intenta de nuevo.",
    tryAgain: "Intentar de nuevo",
    laneType: "Tipo de carril",
    minuteUnit: "min",
    notPublished: "Aquí no se publica",
    status: "Estado",
    hours: "Horario",
    reported: "Reportado",
    unknown: "Desconocido",
    unavailable: "No disponible",
    open: "Abierto",
    hoursUnavailable: "Horario no disponible",
    localTime: (time) => `${time} hora local`,
    removeFromWallet: "Quitar de la cartera",
    sections: "Secciones",
    languageToSpanish: "Cambiar a español",
    languageToEnglish: "Switch to English",
    themeToLight: "Cambiar a modo claro",
    themeToDark: "Cambiar a modo oscuro",
    canadianBorder: "Frontera con Canadá",
    mexicanBorder: "Frontera con México",
    cbpNotice: "Aviso de CBP, en inglés",
    undo: "Deshacer",
    view: "Ver",
    notFoundTitle: "Página no encontrada",
    notFoundCard: "Página no encontrada",
    notFoundCrossing: "Este cruce no existe",
    notFoundRoute: "Ruta",
    notFoundLanes: "0 carriles abiertos",
    notFoundHeadline: "Esta página no está en tu cartera",
    notFoundBody: "El enlace puede estar viejo o mal escrito. Tus cruces guardados siguen donde los dejaste.",
    backToWallet: "Volver a la cartera",
    closed: "Cerrado",
    pageTitle: (title) => `${title} | Border Time`,
    savedSummary: (count, updatedAt) => {
      const noun = count === 1 ? "cruce" : "cruces";
      return updatedAt ? `${count} ${noun}, actualizado ${updatedAt}` : `${count} ${noun}`;
    },
    reportedCount: (count) => `${count} cruces reportados por CBP`,
    minutes: (count) => `${count} min`,
    minuteWait: (count) => `espera de ${count} min`,
    lanesOpen: (open, max) => {
      const unit = open === 1 ? "carril abierto" : "carriles abiertos";
      const base = `${open} ${unit}`;
      return max ? `${base} de ${max}` : base;
    },
    bookmark: (city) => `Marcar ${city}`,
    removeBookmark: (city) => `Quitar marcador de ${city}`,
    bookmarkedToast: (city) => `${city} marcada`,
    removedBookmarkToast: (city) => `Se quitó el marcador de ${city}`,
    addedToast: (name) => `Se agregó ${name}`,
    removedToast: (name) => `Se quitó ${name}`,
    reorderHint: "Mantén pulsado y arrastra para reordenar",
    sendBackHint: "Desliza a la izquierda o a la derecha para enviarla atrás",
    sentToBack: (name) => `${name} pasó atrás`,
    movedTo: (name, position, total) => `${name} pasó al puesto ${position} de ${total}`,
    mode: {
      car: "Auto",
      ready: "Carril Ready",
      walk: "A pie",
      truck: "Camión",
      fast: "Camión FAST",
    },
    tone: {
      clear: "Despejado",
      busy: "Moderado",
      slow: "Larga espera",
      closed: "Cerrado",
      unknown: "Sin datos",
    },
    laneStatus: {
      closed: "Cerrado",
      notOffered: "No se ofrece",
      lanesClosed: "Carriles cerrados",
      pending: "Pendiente",
    },
  },
};

export function placeSubtitle(name: PortName, copy: Copy): string {
  if (!name.subtitleIsRegion) return name.subtitle;
  return name.subtitle.toLowerCase().includes("canad") ? copy.canadianBorder : copy.mexicanBorder;
}

export function modeName(mode: Mode, port: PortWaitTime, copy: Copy): string {
  if (mode === "sentri") {
    return port.border.toLowerCase().includes("canad") ? "NEXUS" : "SENTRI";
  }
  return copy.mode[mode];
}

export function waitLabel(reading: Reading, copy: Copy): string {
  if (reading.minutes !== null) return copy.minutes(reading.minutes);
  return copy.laneStatus[reading.statusKey];
}

export function lanesLabel(reading: Reading, copy: Copy): string {
  if (reading.lanesOpen === null) return waitLabel(reading, copy);
  return copy.lanesOpen(reading.lanesOpen, reading.maxLanes);
}

export function presentClock(value: string, locale: Locale): string {
  if (locale === "en") return value;
  return value
    .replace(/24\s*hrs\/day/gi, "24 horas")
    .replace(/\bmidnight\b/gi, "medianoche")
    .replace(/\bnoon\b/gi, "mediodía")
    .replace(/\bhrs\b/gi, "h")
    .replace(/\bam\b/gi, "a. m.")
    .replace(/\bpm\b/gi, "p. m.");
}

export function presentHours(hours: string, locale: Locale, copy: Copy): string {
  if (!hours) return copy.hoursUnavailable;
  return presentClock(hours, locale);
}

export function presentPortStatus(status: string, copy: Copy): string {
  const key = status.trim().toLowerCase();
  if (!key) return copy.unknown;
  if (key === "open") return copy.open;
  if (key === "closed") return copy.closed;
  return status;
}
