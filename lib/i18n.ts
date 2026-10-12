import {
  portName,
  readLane,
  type Mode,
  type PortName,
  type Reading,
  type StatusKey,
  type Tone,
} from "@/lib/ports";
import { REFERRAL_LABEL, type Referral } from "@/lib/referral";
import type { PortWaitTime } from "@/lib/border-wait-times";

export type Locale = "en" | "es";

export const LOCALE_COOKIE = "usbordertime.lang";
export const LOCALE_STORAGE_KEY = "usbordertime.lang.v1";

/** Public address for questions and for deleting an account. */
export const CONTACT_EMAIL = "privacy@usbordertime.com";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}

type ModeCopy = Record<Exclude<Mode, "sentri">, string>;

export type Copy = {
  metaTitle: string;
  metaDescription: string;
  guidesTitle: string;
  /** Short label for a link to the public guides. */
  guidesLink: string;
  guidesDescription: string;
  guidesLead: string;
  guideStartHere: string;
  guideRelated: string;
  guideLiveHeading: string;
  guideLiveBody: string;
  guideOpenApp: string;
  guideSourceNote: string;
  guideOtherLanguage: string;
  guideAllGuides: string;
  guideLangName: string;
  guideBadge: string;
  guideRead: string;
  guideOpenShort: string;
  wallet: string;
  crossings: string;
  browse: string;
  nothingSaved: string;
  done: string;
  refresh: string;
  emptyTitle: string;
  emptyBody: string;
  browseCrossings: string;
  addCrossing: string;
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
  live: string;
  cameraLabel: (name: string) => string;
  cameraUnavailable: string;
  cameraViews: string;
  cameraRetry: string;
  cameraLoading: string;
  cameraUpdated: (ago: string) => string;
  cameraStale: (ago: string) => string;
  cameraOffline: string;
  cameraSource: string;
  cameraOfficial: string;
  cameraThirdParty: string;
  hourUnit: string;
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
  signInTitle: string;
  signInBody: string;
  signInWithGoogle: string;
  signInSwipe: string;
  signInRedirecting: string;
  signInHeadline: string;
  signInSample: string;
  referralTitle: string;
  referralBody: string;
  referralContinue: string;
  referralSaving: string;
  referralFailed: string;
  referralOption: Record<Referral, string>;
  privacyPolicy: string;
  termsOfUse: string;
  admin: string;
  privacyTitle: string;
  privacyUpdated: string;
  privacyLead: string;
  privacySections: readonly { heading: string; body: string }[];
  termsTitle: string;
  termsUpdated: string;
  termsLead: string;
  termsSections: readonly { heading: string; body: string }[];
  back: string;
  signOut: string;
  streakDays: (days: number) => string;
  /** One name per level, lowest first. */
  streakLevels: readonly string[];
  streakStart: string;
  streakDetail: (best: number, total: number) => string;
  streakNext: (days: number, goal: number) => string;
  signedInAs: (name: string) => string;
  signInFailed: string;
  profileError: string;
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
  share: string;
  shareNamed: (name: string) => string;
  shareCopied: string;
  shareFailed: string;
  shareTitle: (name: string, wait: string) => string;
  shareWait: (
    name: string,
    minutes: number,
    lane: string,
    place: string,
  ) => string;
  shareStatus: (
    name: string,
    status: string,
    lane: string,
    place: string,
  ) => string;
  savedSummary: (count: number, updatedAt: string | null) => string;
  reportedCount: (count: number) => string;
  minutes: (count: number) => string;
  minuteWait: (count: number) => string;
  averageShort: (count: number) => string;
  averageLabel: (count: number) => string;
  usualFlat: (count: number) => string;
  usualQuietAt: (time: string, count: number) => string;
  usualQuietFrom: (start: string, end: string, count: number) => string;
  usualNow: (count: number) => string;
  usualNowUpTo: (count: number, high: number) => string;
  usualAt: (time: string, count: number) => string;
  usualAtUpTo: (time: string, count: number, high: number) => string;
  usualNowNone: string;
  usualNone: (time: string) => string;
  usualEmpty: string;
  usualUnavailable: string;
  usualLoading: string;
  usualChart: string;
  usualTick: (hour: number) => string;
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
  alertTitle: string;
  alertOff: string;
  alertGroup: string;
  alertHintOff: string;
  alertHintOn: (lane: string, minutes: number) => string;
  alertOnToast: (name: string, lane: string, minutes: number) => string;
  alertOffToast: (name: string) => string;
  alertDenied: string;
  alertUnsupported: string;
  alertNeedsInstall: string;
  alertFailed: string;
  alertSchedule: string;
  schedules: string;
  schedulesSummary: (count: number) => string;
  ask: string;
  askSubtitle: string;
  askEmptyTitle: string;
  askEmptyBody: string;
  askSuggestions: readonly string[];
  askPlaceholder: string;
  askSend: string;
  askMic: string;
  askStop: string;
  askRecording: string;
  askThinking: string;
  askClear: string;
  askNote: string;
  askError: string;
  askBusy: string;
  askVoiceFailed: string;
  askNoSpeech: string;
  askMicDenied: string;
  askMicUnsupported: string;
  scheduleEmptyTitle: string;
  scheduleEmptyBody: string;
  scheduleNeedBridge: string;
  scheduleNew: string;
  scheduleNewTitle: string;
  scheduleEditTitle: string;
  scheduleStepBridge: string;
  scheduleStepTime: string;
  scheduleStepDays: string;
  scheduleStepBridgeLabel: string;
  scheduleStepTimeLabel: string;
  scheduleStepDaysLabel: string;
  scheduleNext: string;
  scheduleBack: string;
  scheduleTime: string;
  scheduleHour: string;
  scheduleMinute: string;
  schedulePeriod: string;
  scheduleDays: string;
  scheduleEveryDay: string;
  scheduleWeekdays: string;
  scheduleLane: string;
  scheduleBridges: string;
  scheduleBridgesHint: (selected: number, max: number) => string;
  scheduleNoBridges: string;
  scheduleZone: (zone: string) => string;
  scheduleName: string;
  scheduleNamePlaceholder: string;
  scheduleNameHint: string;
  scheduleSave: string;
  scheduleSaving: string;
  scheduleDelete: string;
  scheduleClose: string;
  schedulePause: (time: string) => string;
  scheduleResume: (time: string) => string;
  schedulePauseName: (name: string) => string;
  scheduleResumeName: (name: string) => string;
  schedulePaused: string;
  scheduleLimit: string;
  scheduleFailed: string;
  scheduleMissing: string;
  scheduleTitle: (time: string, lane: string) => string;
  scheduleWait: (name: string, minutes: number) => string;
  scheduleStatus: (name: string, status: string) => string;
  routesLead: string;
  routesSummary: (count: number) => string;
  routesMissing: string;
  scheduleTest: string;
  scheduleTestSending: string;
  scheduleTestSent: string;
  scheduleTestBody: string;
  alertTestTitle: string;
  alertTestBody: string;
  alertPushBody: (lane: string, minutes: number, threshold: number) => string;
  installTitle: string;
  installBody: string;
  installAdd: string;
  installDismiss: string;
  installMenu: string;
  installSheetTitle: string;
  installStepsIos: readonly string[];
  installStepsOther: readonly string[];
  installDone: string;
  tourReplay: string;
  tourSkip: string;
  tourBack: string;
  tourNext: string;
  tourDone: string;
  tourProgress: (step: number, total: number) => string;
  tourWelcomeTitle: string;
  tourWelcomeBody: string;
  tourFindTitle: string;
  tourFindBody: string;
  tourPickTitle: string;
  tourPickBody: string;
  tourOpenTitle: string;
  tourOpenBody: string;
  tourCameraTitle: string;
  tourCameraBody: string;
  tourLanesTitle: string;
  tourLanesBody: string;
  tourUsualTitle: string;
  tourUsualBody: string;
  tourCloseTitle: string;
  tourCloseBody: string;
  tourSchedulesTitle: string;
  tourSchedulesBody: string;
  tourAskTitle: string;
  tourAskBody: string;
  tourAccountTitle: string;
  tourAccountBody: string;
  tourDoneTitle: string;
  tourDoneBody: string;
  scheduleTourWelcomeTitle: string;
  scheduleTourWelcomeBody: string;
  scheduleTourBridgesTitle: string;
  scheduleTourBridgesBody: string;
  scheduleTourAddTitle: string;
  scheduleTourAddBody: string;
  scheduleTourCardTitle: string;
  scheduleTourCardBody: string;
  scheduleTourToggleTitle: string;
  scheduleTourToggleBody: string;
  scheduleTourDoneTitle: string;
  scheduleTourDoneBody: string;
  scheduleTourReplay: string;
  scheduleTourSheetBridges: string;
  scheduleTourSheetTime: string;
  scheduleTourSheetDays: string;
  mode: ModeCopy;
  tone: Record<Tone, string>;
  laneStatus: Record<StatusKey, string>;
};

export type DurationParts = {
  hours: number;
  minutes: number;
};

/** Whole hours and the minutes left over. 90 becomes 1 hour and 30 minutes. */
export function durationParts(totalMinutes: number): DurationParts {
  const total = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Compact label: "45 min", "1 hr", "1 hr 30 min". */
export function formatDuration(
  totalMinutes: number,
  hourUnit: string,
  minuteUnit: string,
): string {
  const { hours, minutes } = durationParts(totalMinutes);
  if (hours === 0) return `${minutes} ${minuteUnit}`;
  if (minutes === 0) return `${hours} ${hourUnit}`;
  return `${hours} ${hourUnit} ${minutes} ${minuteUnit}`;
}

/** Sentence form: "45 minutes", "1 hour", "1 hour 30 minutes". */
function durationSpoken(
  totalMinutes: number,
  hourOne: string,
  hourMany: string,
  minuteOne: string,
  minuteMany: string,
): string {
  const { hours, minutes } = durationParts(totalMinutes);
  const hourLabel = hours === 1 ? hourOne : hourMany;
  const minuteLabel = minutes === 1 ? minuteOne : minuteMany;
  if (hours === 0) return `${minutes} ${minuteLabel}`;
  if (minutes === 0) return `${hours} ${hourLabel}`;
  return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}

export const COPY: Record<Locale, Copy> = {
  en: {
    metaTitle: "Border Time",
    metaDescription:
      "Border Time is an independent app by BuildPalNorte that shows live U.S. land-port wait times from the public CBP feed, in English and Spanish.",
    guidesTitle: "Border crossing guides",
    guidesLink: "Guides",
    guidesDescription:
      "Border Time guides to the busiest U.S.–Mexico crossings: which bridge, which lane, how to read the wait CBP posts, and how that wait eases congestion.",
    guidesLead:
      "Which bridge to take, which lane to use, what a posted wait means, and how knowing it eases congestion. For the live number, open Border Time.",
    guideStartHere: "Start here",
    guideRelated: "Keep reading",
    guideLiveHeading: "See the wait right now",
    guideLiveBody:
      "Waits change every few minutes. Sign in to Border Time to see the live number for these crossings and save the ones you use.",
    guideOpenApp: "Open Border Time",
    guideSourceNote:
      "Wait times come from U.S. Customs and Border Protection. Which lanes a crossing offers can change, so CBP is the final word. Border Time is not CBP, the Department of Homeland Security, or Mexican customs, and these guides are not official advice.",
    guideOtherLanguage: "Leer en español",
    guideAllGuides: "All guides",
    guideLangName: "English",
    guideBadge: "Crossing guide",
    guideRead: "Read guide",
    guideOpenShort: "Open app",
    wallet: "Bridges",
    crossings: "Crossings",
    browse: "Browse",
    nothingSaved: "Nothing saved yet",
    done: "Done",
    refresh: "Refresh wait times",
    emptyTitle: "No bridges saved",
    emptyBody:
      "Add the bridges you cross and see their live wait times in one stack.",
    browseCrossings: "Browse crossings",
    addCrossing: "Add bridge",
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
    addToWallet: (name) => `Add ${name} to bridges`,
    removeFromWalletNamed: (name) => `Remove ${name} from bridges`,
    noMatch: (query) => `No crossings match "${query}"`,
    noCrossings: "No crossings here",
    noMatchHint: "Try a city name or switch borders.",
    loadErrorTitle: "Could not load wait times",
    loadErrorBody:
      "The CBP feed did not respond. Check your connection and try again.",
    tryAgain: "Try again",
    laneType: "Lane type",
    live: "Live",
    cameraLabel: (name) => `Live camera at ${name}`,
    cameraUnavailable: "Camera unavailable",
    cameraViews: "Camera views",
    cameraRetry: "Try again",
    cameraLoading: "Connecting…",
    cameraUpdated: (ago) => `Updated ${ago}`,
    cameraStale: (ago) => `No new picture since ${ago}`,
    cameraOffline: "Offline",
    cameraSource: "Camera source",
    cameraOfficial: "Official camera",
    cameraThirdParty: "Third-party camera",
    hourUnit: "hr",
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
    removeFromWallet: "Remove from bridges",
    sections: "Sections",
    languageToSpanish: "Cambiar a español",
    languageToEnglish: "Switch to English",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    signInTitle: "Border Time",
    signInBody: "Sign in with Google to see the bridges you cross.",
    signInWithGoogle: "Sign in with Google",
    signInSwipe: "Swipe up",
    signInRedirecting: "Signing in…",
    signInHeadline: "Know before you cross.",
    signInSample: "Sample",
    referralTitle: "How did you find us?",
    referralBody: "Pick one. It stays with your account.",
    referralContinue: "Continue",
    referralSaving: "Saving…",
    referralFailed: "Could not save that. Try again.",
    referralOption: REFERRAL_LABEL,
    privacyPolicy: "Privacy policy",
    termsOfUse: "Terms of use",
    admin: "Admin",
    privacyTitle: "Privacy policy",
    privacyUpdated: "Updated October 12, 2026",
    privacyLead:
      "Border Time shows live wait times at U.S. land ports. This page is what we keep.",
    privacySections: [
      {
        heading: "Who runs it",
        body: `Border Time is an independent app published by BuildPalNorte at usbordertime.com. It is not U.S. Customs and Border Protection, the Department of Homeland Security, or Mexican customs. Questions, and requests to delete an account, go to ${CONTACT_EMAIL}.`,
      },
      {
        heading: "Your account",
        body: "Signing in uses Google. Each visit saves a profile: the account id, your email, your name, and the address of your Google profile photo. A later visit refreshes those fields. The first time you sign in, we also ask how you found Border Time and save the option you pick. When you share a crossing, the link includes your account id. If someone new signs in from that link, we save your id on their profile, so we can see who brought them here. Their browser keeps that id in a cookie for 30 days, or until they sign in. We use the profile to keep you signed in and to show your name and photo, and the option to see what brings people here. We do not sell them, and we do not use them for advertising. Signing in also sets a session cookie in this browser so you stay signed in. Signing out removes that cookie.",
      },
      {
        heading: "Saved with your account",
        body: "The bridges you save, the cities you bookmark, your language, and light or dark mode are saved with your account. This browser keeps a copy so the page can show them right away. Language and appearance are also stored as cookies so the next visit can render that way. Signing out leaves the copy in this browser. The next sign-in on this browser brings the account copy back.",
      },
      {
        heading: "Wait times and cameras",
        body: "Wait times come from the public CBP feed. Those requests ask for ports and hours, not for anything about you. Nuevo and Viejo play a live camera from IPCamLive in the browser. We do not record that video. Your browser loads the picture from IPCamLive, so IPCamLive sees the network address of the device playing it. When a camera address stops working, we look up the new one and save it for the next visit. That address is not part of your account.",
      },
      {
        heading: "Wait alerts",
        body: "If you turn on a wait alert, we save the crossing, the lane, and the wait you picked with your account. To reach you, your browser gives us a private push address for that device. We check the public wait times about once a minute and send one notification when a lane drops under your number. The notification passes through the push service your browser uses: Apple, Google, or Mozilla. Turning an alert off deletes it. If you make an alarm, we also save its time, days, time zone, lane, bridges, and any name you gave it with your account, and send one notification with the current waits at that time. If you named it, that name is the notification's title. Deleting an alarm deletes it. Signing out removes this device's push address.",
      },
      {
        heading: "Visit streak",
        body: "To count a streak, the first time you open the app each day we save that day's date in your time zone with your account, along with your current streak, your longest streak, and how many days you have opened the app. We do not record what you looked at.",
      },
      {
        heading: "How the app is used",
        body: "We keep a short log on your account: the first time you open the app each day, each question you send in Ask, each wait alert you save, each alarm you save, and each time your bridges, bookmarks, language, or appearance are saved. The log counts those actions. It does not include the words you asked or which bridge you opened. The people who run Border Time can see those counts with your name and email.",
      },
      {
        heading: "Other services",
        body: "Google supplies your name, email, and photo at sign-in, and hosts the photo. Our database stores the account, the profile, your saved bridges, bookmarks, language, and appearance, your wait alerts, your alarms, your visit streak, the activity log, and device push addresses, and the current camera addresses. IPCamLive serves the two cameras. OpenAI receives the questions you type in Ask, and the text of a question you speak. We do not store the chat. If you speak a question in Chrome, Google receives the audio and returns the words. We receive only those words, not the recording. CBP publishes the wait times. What each of them does on its own side is covered by its own policy.",
      },
      {
        heading: "How long it stays",
        body: `Signing out ends the session in this browser and removes this device's push address. The profile, how you found us, who shared the link you signed up from, saved bridges, bookmarks, language, appearance, the streak, and the activity log stay until you ask us to delete the account. Write to ${CONTACT_EMAIL} and we delete the account and everything saved with it. Wait alerts stay until you turn them off. Alarms stay until you delete them. This browser keeps its copy until you clear the site's data.`,
      },
      {
        heading: "Children",
        body: `Border Time is not meant for children under 13, and we do not knowingly keep their information. If you believe we have, write to ${CONTACT_EMAIL} and we will delete it.`,
      },
      {
        heading: "Changes",
        body: "When this policy changes, the date at the top of this page changes with it.",
      },
    ],
    termsTitle: "Terms of use",
    termsUpdated: "Updated October 12, 2026",
    termsLead:
      "These terms cover Border Time at usbordertime.com. The privacy policy says what an account stores.",
    termsSections: [
      {
        heading: "What this is",
        body: "Border Time shows live wait times at U.S. land ports, from the public CBP feed, along with guides and Ask. It is an independent app published by BuildPalNorte. It is not U.S. Customs and Border Protection, the Department of Homeland Security, or Mexican customs.",
      },
      {
        heading: "Wait times",
        body: "The number is the one CBP published. It can be late, missing, or wrong. It is the wait to enter the United States, not the drive to the bridge. Border Time does not measure the line. A number is not a promise of how long you will wait.",
      },
      {
        heading: "Ask and the guides",
        body: "Ask is an AI, and it can be wrong. An answer about documents, duty, what you can bring, or a tourist permit is not legal, immigration, or customs advice. The guides are not official advice either. Confirm a rule with CBP or Mexican customs before you rely on it.",
      },
      {
        heading: "Cameras",
        body: "Nuevo and Viejo play a live camera from IPCamLive in your browser. We do not record it. The picture can be down or delayed. It is not a promise of the conditions at the bridge.",
      },
      {
        heading: "Alerts",
        body: "A wait alert or an alarm sends the number we had at that moment. It can arrive late, or not at all. It is not a promise that a lane is open or that the wait is still the one in the notification.",
      },
      {
        heading: "Your account",
        body: `You sign in with Google. The privacy policy says what we store. To delete the account and everything saved with it, write to ${CONTACT_EMAIL}.`,
      },
      {
        heading: "Use of the app",
        body: "Use Border Time for your own crossing. Do not use Ask to hide goods, skip inspection, or break the law.",
      },
      {
        heading: "No promise of an outcome",
        body: "Border Time is offered as it is. We are not responsible for a missed appointment, a fine, or a decision you made from a wait, a guide, a camera, or an Ask answer.",
      },
      {
        heading: "Changes",
        body: "When these terms change, the date at the top of this page changes with it.",
      },
    ],
    back: "Back",
    signOut: "Sign out",
    streakDays: (days) => `${days}-day streak`,
    streakLevels: ["Spark", "Flame", "Blaze", "Rocket", "Star", "Legend"],
    streakStart: "Come back tomorrow to start a streak",
    streakDetail: (best, total) =>
      `Best ${best} · ${total} ${total === 1 ? "day" : "days"} here`,
    streakNext: (days, goal) =>
      `${days} ${days === 1 ? "day" : "days"} to ${goal}`,
    signedInAs: (name) => `Signed in as ${name}`,
    signInFailed: "Could not sign in with Google",
    profileError: "Your profile could not be saved. Try again.",
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
    notFoundHeadline: "This page isn't one of your bridges",
    notFoundBody:
      "The link may be old or mistyped. Your saved crossings are right where you left them.",
    backToWallet: "Back to bridges",
    closed: "Closed",
    pageTitle: (title) => `${title} | Border Time`,
    share: "Share",
    shareNamed: (name) => `Share ${name}`,
    shareCopied: "Link copied",
    shareFailed: "Could not share",
    shareTitle: (name, wait) => `${name} · ${wait}`,
    shareWait: (name, minutes, lane, place) =>
      `${name} is ${formatDuration(minutes, "hr", "min")} to cross right now. ${lane}, ${place}.`,
    shareStatus: (name, status, lane, place) =>
      `${name} — ${status}. ${lane}, ${place}.`,
    savedSummary: (count, updatedAt) => {
      const noun = count === 1 ? "crossing" : "crossings";
      return updatedAt
        ? `${count} ${noun}, updated ${updatedAt}`
        : `${count} ${noun}`;
    },
    reportedCount: (count) => `${count} crossings reported by CBP`,
    minutes: (count) => formatDuration(count, "hr", "min"),
    minuteWait: (count) => {
      const { hours, minutes } = durationParts(count);
      if (hours === 0) return `${minutes} minute wait`;
      if (minutes === 0) return `${hours} hour wait`;
      return `${hours} hour ${minutes} minute wait`;
    },
    averageShort: (count) => `avg ${formatDuration(count, "hr", "min")}`,
    averageLabel: (count) =>
      `Average wait at this hour, ${durationSpoken(count, "hour", "hours", "minute", "minutes")}`,
    usualFlat: (count) =>
      `About the same all day, ${formatDuration(count, "hr", "min")}`,
    usualQuietAt: (time, count) =>
      `Quietest at ${time}, ${formatDuration(count, "hr", "min")}`,
    usualQuietFrom: (start, end, count) =>
      `Quietest from ${start} to ${end}, ${formatDuration(count, "hr", "min")}`,
    usualNow: (count) =>
      `Right now, usually ${formatDuration(count, "hr", "min")}`,
    usualNowUpTo: (count, high) =>
      `Right now, usually ${formatDuration(count, "hr", "min")}, up to ${formatDuration(high, "hr", "min")}`,
    usualAt: (time, count) =>
      `${time}, usually ${formatDuration(count, "hr", "min")}`,
    usualAtUpTo: (time, count, high) =>
      `${time}, usually ${formatDuration(count, "hr", "min")}, up to ${formatDuration(high, "hr", "min")}`,
    usualNowNone: "Right now, no usual wait",
    usualNone: (time) => `${time}, no usual wait`,
    usualEmpty: "CBP has not published a usual day for this lane.",
    usualUnavailable: "Usual waits are unavailable right now.",
    usualLoading: "Loading usual waits",
    usualChart: "Usual wait by hour",
    usualTick: (hour) => {
      const face = hour % 12 || 12;
      return `${face}${hour < 12 ? "a" : "p"}`;
    },
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
    movedTo: (name, position, total) =>
      `${name} moved to ${position} of ${total}`,
    alertTitle: "Wait alert",
    alertOff: "Off",
    alertGroup: "Notify me when the wait is under",
    alertHintOff:
      "Pick a wait and we'll notify you when this lane drops under it.",
    alertHintOn: (lane, minutes) =>
      `We'll notify you when ${lane} drops under ${formatDuration(minutes, "hr", "min")}.`,
    alertOnToast: (name, lane, minutes) =>
      `Alert on: ${name}, ${lane}, under ${formatDuration(minutes, "hr", "min")}`,
    alertOffToast: (name) => `Alert off for ${name}`,
    alertDenied:
      "Notifications are blocked. Allow them for this site in your browser settings.",
    alertUnsupported: "This browser can't send notifications.",
    alertNeedsInstall:
      "On iPhone, alerts need Border Time on your Home Screen. Add it, then open it from there.",
    alertFailed: "Could not save the alert. Try again.",
    alertSchedule: "Set a wait alert",
    schedules: "Alarms",
    schedulesSummary: (count) =>
      count === 0 ? "No alarms" : count === 1 ? "1 alarm" : `${count} alarms`,
    ask: "Ask",
    askSubtitle: "Crossings, customs, and ETAs",
    askEmptyTitle: "Ask about the border",
    askEmptyBody:
      "Live waits, which bridge is fastest, when to go, and what you can bring across. Type it or say it.",
    askSuggestions: [
      "Which Brownsville bridge is fastest right now?",
      "When is the best time to cross tomorrow morning?",
      "What can I bring back from Mexico duty-free?",
      "Do I need an FMM to go to Matamoros?",
    ],
    askPlaceholder: "Ask about a crossing or customs",
    askSend: "Send",
    askMic: "Ask with your voice",
    askStop: "Stop",
    askRecording: "Listening…",
    askThinking: "Checking the bridges…",
    askClear: "New chat",
    askNote: "AI can be wrong. For rules, confirm with CBP or Mexican customs.",
    askError: "Could not get an answer. Try again.",
    askBusy: "Too many questions. Wait a minute and try again.",
    askVoiceFailed: "Could not hear that. Try again or type it.",
    askNoSpeech: "No voice came through. Try again.",
    askMicDenied:
      "Microphone is blocked. Allow it for this site in your browser settings.",
    askMicUnsupported:
      "This browser can't turn speech into text. Type your question.",
    scheduleEmptyTitle: "A wait report, on time",
    scheduleEmptyBody:
      "Choose a bridge you saved, a time, and the days. We send the current wait to your phone, right then.",
    scheduleNeedBridge:
      "Save a bridge first. Alarms report on the bridges in your wallet.",
    scheduleNew: "New alarm",
    scheduleNewTitle: "New alarm",
    scheduleEditTitle: "Edit alarm",
    scheduleStepBridge: "Which bridge?",
    scheduleStepTime: "What time?",
    scheduleStepDays: "Which days?",
    scheduleStepBridgeLabel: "Bridge",
    scheduleStepTimeLabel: "Time",
    scheduleStepDaysLabel: "Days",
    scheduleNext: "Continue",
    scheduleBack: "Back",
    scheduleTime: "Send at",
    scheduleHour: "Hour",
    scheduleMinute: "Minute",
    schedulePeriod: "AM or PM",
    scheduleDays: "On",
    scheduleEveryDay: "Every day",
    scheduleWeekdays: "Weekdays",
    scheduleLane: "Lane",
    scheduleBridges: "Bridges",
    scheduleBridgesHint: (selected, max) => `${selected} of ${max} chosen`,
    scheduleNoBridges: "Choose at least one bridge.",
    scheduleZone: (zone) => `Times follow ${zone.replaceAll("_", " ")}`,
    scheduleName: "Name",
    scheduleNamePlaceholder: "Morning",
    scheduleNameHint: "Optional. This becomes the notification title.",
    scheduleSave: "Save alarm",
    scheduleSaving: "Saving…",
    scheduleDelete: "Delete",
    scheduleClose: "Close",
    schedulePause: (time) => `Pause the ${time} alarm`,
    scheduleResume: (time) => `Resume the ${time} alarm`,
    schedulePauseName: (name) => `Pause ${name}`,
    scheduleResumeName: (name) => `Resume ${name}`,
    schedulePaused: "Paused",
    scheduleLimit: "You can keep up to 8 alarms. Delete one to add another.",
    scheduleFailed: "Could not save the alarm. Try again.",
    scheduleMissing: "That alarm no longer exists.",
    scheduleTitle: (time, lane) => `${time} · ${lane}`,
    scheduleWait: (name, minutes) =>
      `${name}: ${formatDuration(minutes, "hr", "min")}`,
    scheduleStatus: (name, status) => `${name}: ${status}`,
    routesLead: "From your notification",
    routesSummary: (count) =>
      count === 1
        ? "1 bridge from your notification"
        : `${count} bridges from your notification`,
    routesMissing: "Those bridges aren't in the latest report.",
    scheduleTest: "Send a test",
    scheduleTestSending: "Sending…",
    scheduleTestSent: "Sent. Tap the notification.",
    scheduleTestBody: "This is a test. Tap it to see these bridges.",
    alertTestTitle: "Border Time",
    alertTestBody:
      "This is a test. A real alert names the bridge and the wait.",
    alertPushBody: (lane, minutes, threshold) =>
      `${lane} is ${formatDuration(minutes, "hr", "min")}, under your ${formatDuration(threshold, "hr", "min")} alert.`,
    installTitle: "Add Border Time to your Home Screen",
    installBody: "Open it like an app and get wait alerts.",
    installAdd: "Add",
    installDismiss: "Not now",
    installMenu: "Add to Home Screen",
    installSheetTitle: "Add to Home Screen",
    installStepsIos: [
      "Tap the Share button in Safari's toolbar, or under the ••• menu.",
      "Scroll down and tap Add to Home Screen.",
      "Tap Add. Then open Border Time from your Home Screen and sign in there. It keeps its own sign-in.",
    ],
    installStepsOther: [
      "Open your browser's menu.",
      "Tap Install app, or Add to Home screen.",
      "Confirm. Border Time opens from your Home Screen.",
    ],
    installDone: "Got it",
    tourReplay: "Take the tour",
    tourSkip: "Skip",
    tourBack: "Back",
    tourNext: "Next",
    tourDone: "Done",
    tourProgress: (step, total) => `${step} of ${total}`,
    tourWelcomeTitle: "Welcome to Border Time",
    tourWelcomeBody:
      "Let's add Puente Viejo and learn to read it. Takes about twenty seconds.",
    tourFindTitle: "Find a bridge",
    tourFindBody:
      "Tap + to find Puente Viejo, the bridge with the live camera.",
    tourPickTitle: "Add Puente Viejo",
    tourPickBody: "Tap the plus next to it to save it to your wallet.",
    tourOpenTitle: "This is your card",
    tourOpenBody: "Tap it to see the camera, the lane, and the usual wait.",
    tourCameraTitle: "Watch it live",
    tourCameraBody:
      "Puente Viejo and Puente Nuevo both carry a live camera, right at the top of the card.",
    tourLanesTitle: "Live, by lane",
    tourLanesBody: "Each lane shows its own wait. Tap one to switch.",
    tourUsualTitle: "What's normal",
    tourUsualBody:
      "The usual wait by hour, so a bad one stands out from a normal one.",
    tourCloseTitle: "Head back",
    tourCloseBody: "Tap Done to close the card.",
    tourSchedulesTitle: "Alarmas",
    tourSchedulesBody:
      "Set a time and day, and Border Time sends the wait for your bridge before you need to leave.",
    tourAskTitle: "Ask",
    tourAskBody:
      "Ask about hours, construction, or which lane is moving. It answers with the live wait in hand.",
    tourAccountTitle: "Your account",
    tourAccountBody: "Switch language or appearance, and find sign out here.",
    tourDoneTitle: "That's it",
    tourDoneBody:
      "Safe travels. You can replay this tour anytime from the account menu.",
    scheduleTourWelcomeTitle: "Welcome to Alarmas",
    scheduleTourWelcomeBody:
      "Pick a time and days, and Border Time sends the wait for your bridge before you need to leave.",
    scheduleTourBridgesTitle: "Save a bridge first",
    scheduleTourBridgesBody:
      "A schedule reports on your saved bridges. Browse crossings to add one.",
    scheduleTourAddTitle: "Create a schedule",
    scheduleTourAddBody:
      "Tap + to pick a time, days, and a bridge to hear about.",
    scheduleTourCardTitle: "Your schedule",
    scheduleTourCardBody:
      "The time, the lane, and the wait on each bridge right now. Tap it to make changes.",
    scheduleTourToggleTitle: "Pause anytime",
    scheduleTourToggleBody:
      "Flip this off to stop the notifications without deleting the schedule.",
    scheduleTourDoneTitle: "That's it",
    scheduleTourDoneBody: "Border Time will send the wait right on time.",
    scheduleTourReplay: "Replay the Alarmas tour",
    scheduleTourSheetBridges:
      "Pick up to six bridges and the lane you want to hear about.",
    scheduleTourSheetTime: "Choose when you want the alert.",
    scheduleTourSheetDays: "Pick the days, then tap Save.",
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
    metaDescription:
      "Border Time es una app independiente de BuildPalNorte que muestra en vivo los tiempos de espera de los puertos terrestres de EE. UU., tomados del feed público de CBP, en inglés y en español.",
    guidesTitle: "Guías para cruzar la frontera",
    guidesLink: "Guías",
    guidesDescription:
      "Guías de Border Time de los cruces más usados entre México y Estados Unidos: qué puente, qué carril, cómo leer el tiempo que publica CBP y cómo esa espera baja la congestión.",
    guidesLead:
      "Qué puente tomar, qué carril usar, qué significa el tiempo publicado y cómo saberlo baja la congestión. Para el número en vivo, abre Border Time.",
    guideStartHere: "Empieza aquí",
    guideRelated: "Sigue leyendo",
    guideLiveHeading: "Mira la espera ahora mismo",
    guideLiveBody:
      "Las esperas cambian cada pocos minutos. Inicia sesión en Border Time para ver el número en vivo de estos cruces y guardar los que usas.",
    guideOpenApp: "Abrir Border Time",
    guideSourceNote:
      "Los tiempos vienen de la Oficina de Aduanas y Protección Fronteriza de EE. UU. (CBP). Los carriles de cada cruce pueden cambiar, así que CBP tiene la última palabra. Border Time no es CBP, el Departamento de Seguridad Nacional ni la aduana mexicana, y estas guías no son un aviso oficial.",
    guideOtherLanguage: "Read in English",
    guideAllGuides: "Todas las guías",
    guideLangName: "Español",
    guideBadge: "Guía de cruce",
    guideRead: "Leer guía",
    guideOpenShort: "Abrir app",
    wallet: "Puentes",
    crossings: "Cruces",
    browse: "Explorar",
    nothingSaved: "Nada guardado",
    done: "Listo",
    refresh: "Actualizar tiempos de espera",
    emptyTitle: "Aún no hay puentes",
    emptyBody:
      "Agrega los puentes que cruzas y mira la espera en vivo, en un solo montón.",
    browseCrossings: "Ver cruces",
    addCrossing: "Agregar puente",
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
    addToWallet: (name) => `Agregar ${name} a tus puentes`,
    removeFromWalletNamed: (name) => `Quitar ${name} de tus puentes`,
    noMatch: (query) => `Ningún cruce coincide con "${query}"`,
    noCrossings: "No hay cruces aquí",
    noMatchHint: "Prueba con una ciudad o cambia de frontera.",
    loadErrorTitle: "No se pudieron cargar los tiempos",
    loadErrorBody: "CBP no respondió. Revisa tu conexión e intenta de nuevo.",
    tryAgain: "Intentar de nuevo",
    laneType: "Tipo de carril",
    live: "En vivo",
    cameraLabel: (name) => `Cámara en vivo de ${name}`,
    cameraUnavailable: "Cámara no disponible",
    cameraViews: "Vistas de la cámara",
    cameraRetry: "Reintentar",
    cameraLoading: "Conectando…",
    cameraUpdated: (ago) => `Actualizada ${ago}`,
    cameraStale: (ago) => `Sin imagen nueva desde ${ago}`,
    cameraOffline: "Sin señal",
    cameraSource: "Origen de la cámara",
    cameraOfficial: "Cámara oficial",
    cameraThirdParty: "Cámara de terceros",
    hourUnit: "h",
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
    removeFromWallet: "Quitar de tus puentes",
    sections: "Secciones",
    languageToSpanish: "Cambiar a español",
    languageToEnglish: "Switch to English",
    themeToLight: "Cambiar a modo claro",
    themeToDark: "Cambiar a modo oscuro",
    signInTitle: "Border Time",
    signInBody: "Inicia sesión con Google para ver los puentes que cruzas.",
    signInWithGoogle: "Iniciar sesión con Google",
    signInSwipe: "Desliza hacia arriba",
    signInRedirecting: "Iniciando sesión…",
    signInHeadline: "Sabe antes de cruzar.",
    signInSample: "Ejemplo",
    referralTitle: "¿Cómo nos encontraste?",
    referralBody: "Elige una. Se queda en tu cuenta.",
    referralContinue: "Continuar",
    referralSaving: "Guardando…",
    referralFailed: "No se pudo guardar. Intenta de nuevo.",
    referralOption: {
      friend: "Un amigo o familiar",
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      tiktok: "TikTok",
      facebook: "Facebook",
      google: "Google",
      other: "En otro lugar",
    },
    privacyPolicy: "Política de privacidad",
    termsOfUse: "Términos de uso",
    admin: "Admin",
    privacyTitle: "Política de privacidad",
    privacyUpdated: "Actualizada el 12 de octubre de 2026",
    privacyLead:
      "Border Time muestra los tiempos de espera en vivo de los puertos terrestres de Estados Unidos. Esta página dice qué guardamos.",
    privacySections: [
      {
        heading: "Quién lo opera",
        body: `Border Time es una app independiente publicada por BuildPalNorte en usbordertime.com. No es la Oficina de Aduanas y Protección Fronteriza de EE. UU. (CBP), ni el Departamento de Seguridad Nacional, ni la aduana mexicana. Las preguntas, y las solicitudes para borrar una cuenta, van a ${CONTACT_EMAIL}.`,
      },
      {
        heading: "Tu cuenta",
        body: "El inicio de sesión usa Google. Cada visita guarda un perfil: el id de la cuenta, tu correo, tu nombre y la dirección de tu foto de perfil de Google. Una visita posterior actualiza esos datos. La primera vez que inicias sesión, también preguntamos cómo encontraste Border Time y guardamos la opción que eliges. Cuando compartes un cruce, el enlace incluye el id de tu cuenta. Si alguien nuevo inicia sesión desde ese enlace, guardamos tu id en su perfil, para saber quién lo trajo. Su navegador guarda ese id en una cookie durante 30 días, o hasta que inicie sesión. Usamos el perfil para mantener tu sesión y para mostrar tu nombre y tu foto, y la opción para ver qué trae a la gente aquí. No los vendemos y no los usamos para publicidad. Al iniciar sesión también se guarda una cookie de sesión en este navegador para que sigas dentro. Al cerrar sesión, esa cookie se quita.",
      },
      {
        heading: "Guardado en tu cuenta",
        body: "Los puentes que guardas, las ciudades que fijas, tu idioma y el modo claro u oscuro se guardan con tu cuenta. Este navegador guarda una copia para mostrarlos de inmediato. El idioma y la apariencia también se guardan como cookies para que la siguiente visita se vea igual. Cerrar sesión deja la copia en este navegador. El siguiente inicio de sesión en este navegador trae de nuevo la copia de la cuenta.",
      },
      {
        heading: "Tiempos y cámaras",
        body: "Los tiempos de espera vienen del feed público de CBP. Esas consultas piden puertos y horarios, no datos sobre ti. Nuevo y Viejo reproducen una cámara en vivo de IPCamLive en el navegador. No grabamos ese video. Tu navegador carga la imagen desde IPCamLive, así que IPCamLive ve la dirección de red del dispositivo que la reproduce. Cuando una dirección de cámara deja de funcionar, buscamos la nueva y la guardamos para la siguiente visita. Esa dirección no forma parte de tu cuenta.",
      },
      {
        heading: "Alertas de espera",
        body: "Si activas una alerta de espera, guardamos con tu cuenta el cruce, el carril y la espera que elegiste. Para avisarte, tu navegador nos da una dirección push privada de ese dispositivo. Revisamos los tiempos públicos más o menos cada minuto y enviamos una notificación cuando un carril baja de tu número. La notificación pasa por el servicio push que usa tu navegador: Apple, Google o Mozilla. Al apagar una alerta, se borra. Si creas una alarma, también guardamos con tu cuenta su hora, días, zona horaria, carril, puentes y el nombre que le hayas puesto, y enviamos una notificación con las esperas actuales a esa hora. Si le pusiste nombre, ese nombre es el título de la notificación. Al eliminar una alarma, se borra. Al cerrar sesión, se quita la dirección push de este dispositivo.",
      },
      {
        heading: "Racha de visitas",
        body: "Para contar una racha, la primera vez que abres la app cada día guardamos con tu cuenta la fecha de ese día en tu zona horaria, junto con tu racha actual, tu racha más larga y cuántos días has abierto la app. No registramos qué viste.",
      },
      {
        heading: "Cómo se usa",
        body: "Guardamos un registro corto en tu cuenta: la primera vez que abres la app cada día, cada pregunta que envías en Preguntar, cada alerta de espera que guardas, cada alarma que guardas, y cada vez que se guardan tus puentes, ciudades, idioma o apariencia. El registro cuenta esas acciones. No incluye las palabras que preguntaste ni qué puente abriste. Quienes operan Border Time pueden ver esos conteos junto con tu nombre y tu correo.",
      },
      {
        heading: "Otros servicios",
        body: "Google aporta tu nombre, correo y foto al iniciar sesión, y aloja la foto. Nuestra base de datos guarda la cuenta, el perfil, tus puentes guardados, ciudades fijadas, idioma y apariencia, tus alertas de espera, tus alarmas, tu racha de visitas, el registro de uso y las direcciones push de tus dispositivos, y las direcciones actuales de las cámaras. IPCamLive sirve las dos cámaras. OpenAI recibe las preguntas que escribes en Preguntar, y el texto de una pregunta que dices. No guardamos el chat. Si dices una pregunta en Chrome, Google recibe el audio y devuelve las palabras. Nosotros recibimos solo esas palabras, no la grabación. CBP publica los tiempos de espera. Lo que cada uno hace por su cuenta lo cubre su propia política.",
      },
      {
        heading: "Cuánto tiempo permanece",
        body: `Cerrar sesión termina la sesión en este navegador y quita la dirección push de este dispositivo. El perfil, cómo nos encontraste, quién compartió el enlace con el que creaste la cuenta, los puentes guardados, las ciudades fijadas, el idioma, la apariencia, la racha y el registro de uso permanecen hasta que pidas borrar la cuenta. Escribe a ${CONTACT_EMAIL} y borramos la cuenta y todo lo que está guardado con ella. Las alertas de espera permanecen hasta que las apagues. Las alarmas permanecen hasta que las elimines. Este navegador guarda su copia hasta que borres los datos del sitio.`,
      },
      {
        heading: "Menores",
        body: `Border Time no está pensado para menores de 13 años, y no guardamos su información a sabiendas. Si crees que sí la tenemos, escribe a ${CONTACT_EMAIL} y la borramos.`,
      },
      {
        heading: "Cambios",
        body: "Cuando esta política cambie, cambia también la fecha al inicio de esta página.",
      },
    ],
    termsTitle: "Términos de uso",
    termsUpdated: "Actualizados el 12 de octubre de 2026",
    termsLead:
      "Estos términos cubren Border Time en usbordertime.com. La política de privacidad dice qué guarda una cuenta.",
    termsSections: [
      {
        heading: "Qué es esto",
        body: "Border Time muestra los tiempos de espera en vivo de los puertos terrestres de Estados Unidos, a partir del feed público de CBP, junto con guías y Preguntar. Es una app independiente publicada por BuildPalNorte. No es la Oficina de Aduanas y Protección Fronteriza de EE. UU. (CBP), ni el Departamento de Seguridad Nacional, ni la aduana mexicana.",
      },
      {
        heading: "Tiempos de espera",
        body: "El número es el que publicó CBP. Puede llegar tarde, faltar o estar mal. Es la espera para entrar a Estados Unidos, no el camino hasta el puente. Border Time no mide la fila. Un número no es una promesa de cuánto vas a esperar.",
      },
      {
        heading: "Preguntar y las guías",
        body: "Preguntar es una IA y puede equivocarse. Una respuesta sobre documentos, impuestos, lo que puedes traer o un permiso de turista no es asesoría legal, migratoria ni aduanera. Las guías tampoco son un aviso oficial. Confirma una regla con CBP o con la aduana mexicana antes de confiar en ella.",
      },
      {
        heading: "Cámaras",
        body: "Nuevo y Viejo reproducen una cámara en vivo de IPCamLive en tu navegador. No la grabamos. La imagen puede estar caída o retrasada. No es una promesa de cómo está el puente.",
      },
      {
        heading: "Alertas",
        body: "Una alerta de espera o una alarma envía el número que teníamos en ese momento. Puede llegar tarde, o no llegar. No es una promesa de que el carril esté abierto ni de que la espera siga siendo la de la notificación.",
      },
      {
        heading: "Tu cuenta",
        body: `Inicias sesión con Google. La política de privacidad dice qué guardamos. Para borrar la cuenta y todo lo que está guardado con ella, escribe a ${CONTACT_EMAIL}.`,
      },
      {
        heading: "Uso de la app",
        body: "Usa Border Time para tu propio cruce. No uses Preguntar para esconder mercancía, saltarte la inspección o romper la ley.",
      },
      {
        heading: "Sin promesa de un resultado",
        body: "Border Time se ofrece tal como está. No respondemos por una cita perdida, una multa o una decisión que hayas tomado a partir de una espera, una guía, una cámara o una respuesta de Preguntar.",
      },
      {
        heading: "Cambios",
        body: "Cuando estos términos cambien, cambia también la fecha al inicio de esta página.",
      },
    ],
    back: "Volver",
    signOut: "Cerrar sesión",
    streakDays: (days) => `Racha de ${days} ${days === 1 ? "día" : "días"}`,
    streakLevels: [
      "Chispa",
      "Llama",
      "Hoguera",
      "Cohete",
      "Estrella",
      "Leyenda",
    ],
    streakStart: "Vuelve mañana para empezar una racha",
    streakDetail: (best, total) =>
      `Mejor ${best} · ${total} ${total === 1 ? "día" : "días"} aquí`,
    streakNext: (days, goal) =>
      `${days} ${days === 1 ? "día" : "días"} para llegar a ${goal}`,
    signedInAs: (name) => `Sesión de ${name}`,
    signInFailed: "No se pudo iniciar sesión con Google",
    profileError: "No se pudo guardar tu perfil. Intenta de nuevo.",
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
    notFoundHeadline: "Esta página no está entre tus puentes",
    notFoundBody:
      "El enlace puede estar viejo o mal escrito. Tus cruces guardados siguen donde los dejaste.",
    backToWallet: "Volver a puentes",
    closed: "Cerrado",
    pageTitle: (title) => `${title} | Border Time`,
    share: "Compartir",
    shareNamed: (name) => `Compartir ${name}`,
    shareCopied: "Enlace copiado",
    shareFailed: "No se pudo compartir",
    shareTitle: (name, wait) => `${name} · ${wait}`,
    shareWait: (name, minutes, lane, place) =>
      `${name} está a ${formatDuration(minutes, "h", "min")} para cruzar. ${lane}, ${place}.`,
    shareStatus: (name, status, lane, place) =>
      `${name} — ${status}. ${lane}, ${place}.`,
    savedSummary: (count, updatedAt) => {
      const noun = count === 1 ? "cruce" : "cruces";
      return updatedAt
        ? `${count} ${noun}, actualizado ${updatedAt}`
        : `${count} ${noun}`;
    },
    reportedCount: (count) => `${count} cruces reportados por CBP`,
    minutes: (count) => formatDuration(count, "h", "min"),
    minuteWait: (count) =>
      `espera de ${durationSpoken(count, "hora", "horas", "minuto", "minutos")}`,
    averageShort: (count) => `promedio ${formatDuration(count, "h", "min")}`,
    averageLabel: (count) =>
      `Espera promedio a esta hora, ${durationSpoken(count, "hora", "horas", "minuto", "minutos")}`,
    usualFlat: (count) =>
      `Casi igual todo el día, ${formatDuration(count, "h", "min")}`,
    usualQuietAt: (time, count) =>
      `Más tranquilo a las ${time}, ${formatDuration(count, "h", "min")}`,
    usualQuietFrom: (start, end, count) =>
      `Más tranquilo de ${start} a ${end}, ${formatDuration(count, "h", "min")}`,
    usualNow: (count) =>
      `A esta hora, suele ser ${formatDuration(count, "h", "min")}`,
    usualNowUpTo: (count, high) =>
      `A esta hora, suele ser ${formatDuration(count, "h", "min")}, hasta ${formatDuration(high, "h", "min")}`,
    usualAt: (time, count) =>
      `${time}, suele ser ${formatDuration(count, "h", "min")}`,
    usualAtUpTo: (time, count, high) =>
      `${time}, suele ser ${formatDuration(count, "h", "min")}, hasta ${formatDuration(high, "h", "min")}`,
    usualNowNone: "A esta hora no hay promedio",
    usualNone: (time) => `${time}, sin promedio`,
    usualEmpty: "CBP no publicó un día habitual para este carril.",
    usualUnavailable: "Las esperas habituales no están disponibles.",
    usualLoading: "Cargando esperas habituales",
    usualChart: "Espera habitual por hora",
    usualTick: (hour) => `${hour}h`,
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
    movedTo: (name, position, total) =>
      `${name} pasó al puesto ${position} de ${total}`,
    alertTitle: "Alerta de espera",
    alertOff: "Apagada",
    alertGroup: "Avísame cuando la espera sea menor a",
    alertHintOff:
      "Elige una espera y te avisamos cuando este carril baje de ella.",
    alertHintOn: (lane, minutes) =>
      `Te avisamos cuando ${lane} baje de ${formatDuration(minutes, "h", "min")}.`,
    alertOnToast: (name, lane, minutes) =>
      `Alerta activa: ${name}, ${lane}, menos de ${formatDuration(minutes, "h", "min")}`,
    alertOffToast: (name) => `Alerta apagada para ${name}`,
    alertDenied:
      "Las notificaciones están bloqueadas. Permítelas para este sitio en los ajustes del navegador.",
    alertUnsupported: "Este navegador no puede enviar notificaciones.",
    alertNeedsInstall:
      "En iPhone, las alertas necesitan Border Time en tu pantalla de inicio. Agrégala y ábrela desde ahí.",
    alertFailed: "No se pudo guardar la alerta. Intenta de nuevo.",
    alertSchedule: "Poner una alerta de espera",
    schedules: "Alarmas",
    schedulesSummary: (count) =>
      count === 0
        ? "Ninguna alarma"
        : count === 1
          ? "1 alarma"
          : `${count} alarmas`,
    ask: "Preguntar",
    askSubtitle: "Puentes, aduana y tu tiempo estimado",
    askEmptyTitle: "Pregunta sobre la frontera",
    askEmptyBody:
      "Esperas en vivo, qué puente es más rápido, cuándo ir y qué puedes pasar. Escríbelo o dilo con tu voz.",
    askSuggestions: [
      "¿Qué puente de Brownsville está más rápido ahora?",
      "¿A qué hora conviene cruzar mañana en la mañana?",
      "¿Qué puedo traer de México sin pagar impuestos?",
      "¿Necesito FMM para ir a Matamoros?",
    ],
    askPlaceholder: "Pregunta sobre un puente o la aduana",
    askSend: "Enviar",
    askMic: "Preguntar con tu voz",
    askStop: "Detener",
    askRecording: "Escuchando…",
    askThinking: "Revisando los puentes…",
    askClear: "Nuevo chat",
    askNote:
      "La IA puede equivocarse. Confirma las reglas con CBP o la aduana de México.",
    askError: "No se pudo obtener una respuesta. Intenta de nuevo.",
    askBusy: "Demasiadas preguntas. Espera un minuto e intenta de nuevo.",
    askVoiceFailed: "No se pudo escuchar. Intenta de nuevo o escríbelo.",
    askNoSpeech: "No se oyó tu voz. Intenta de nuevo.",
    askMicDenied:
      "El micrófono está bloqueado. Permítelo para este sitio en los ajustes del navegador.",
    askMicUnsupported:
      "Este navegador no puede convertir la voz en texto. Escribe tu pregunta.",
    scheduleEmptyTitle: "Tu reporte de espera, a tiempo",
    scheduleEmptyBody:
      "Elige un puente que guardaste, una hora y los días. Te mandamos la espera actual al teléfono, justo entonces.",
    scheduleNeedBridge:
      "Guarda un puente primero. Las alarmas reportan los puentes de tu cartera.",
    scheduleNew: "Nueva alarma",
    scheduleNewTitle: "Nueva alarma",
    scheduleEditTitle: "Editar alarma",
    scheduleStepBridge: "¿Qué puente?",
    scheduleStepTime: "¿A qué hora?",
    scheduleStepDays: "¿Qué días?",
    scheduleStepBridgeLabel: "Puente",
    scheduleStepTimeLabel: "Hora",
    scheduleStepDaysLabel: "Días",
    scheduleNext: "Continuar",
    scheduleBack: "Atrás",
    scheduleTime: "Enviar a las",
    scheduleHour: "Hora",
    scheduleMinute: "Minuto",
    schedulePeriod: "a. m. o p. m.",
    scheduleDays: "Los días",
    scheduleEveryDay: "Todos los días",
    scheduleWeekdays: "Entre semana",
    scheduleLane: "Carril",
    scheduleBridges: "Puentes",
    scheduleBridgesHint: (selected, max) => `${selected} de ${max} elegidos`,
    scheduleNoBridges: "Elige al menos un puente.",
    scheduleZone: (zone) => `Las horas siguen ${zone.replaceAll("_", " ")}`,
    scheduleName: "Nombre",
    scheduleNamePlaceholder: "Mañana",
    scheduleNameHint: "Opcional. Pasa a ser el título de la notificación.",
    scheduleSave: "Guardar alarma",
    scheduleSaving: "Guardando…",
    scheduleDelete: "Eliminar",
    scheduleClose: "Cerrar",
    schedulePause: (time) => `Pausar la alarma de las ${time}`,
    scheduleResume: (time) => `Reanudar la alarma de las ${time}`,
    schedulePauseName: (name) => `Pausar ${name}`,
    scheduleResumeName: (name) => `Reanudar ${name}`,
    schedulePaused: "En pausa",
    scheduleLimit:
      "Puedes tener hasta 8 alarmas. Elimina una para agregar otra.",
    scheduleFailed: "No se pudo guardar la alarma. Intenta de nuevo.",
    scheduleMissing: "Esa alarma ya no existe.",
    scheduleTitle: (time, lane) => `${time} · ${lane}`,
    scheduleWait: (name, minutes) =>
      `${name}: ${formatDuration(minutes, "h", "min")}`,
    scheduleStatus: (name, status) => `${name}: ${status}`,
    routesLead: "De tu notificación",
    routesSummary: (count) =>
      count === 1
        ? "1 puente de tu notificación"
        : `${count} puentes de tu notificación`,
    routesMissing: "Esos puentes no están en el reporte más reciente.",
    scheduleTest: "Enviar una prueba",
    scheduleTestSending: "Enviando…",
    scheduleTestSent: "Enviada. Toca la notificación.",
    scheduleTestBody: "Esto es una prueba. Tócala para ver estos puentes.",
    alertTestTitle: "Border Time",
    alertTestBody:
      "Esto es una prueba. Una alerta real dice el puente y la espera.",
    alertPushBody: (lane, minutes, threshold) =>
      `${lane} está a ${formatDuration(minutes, "h", "min")}, menos de tu alerta de ${formatDuration(threshold, "h", "min")}.`,
    installTitle: "Agrega Border Time a tu pantalla de inicio",
    installBody: "Ábrela como una app y recibe alertas de espera.",
    installAdd: "Agregar",
    installDismiss: "Ahora no",
    installMenu: "Agregar a pantalla de inicio",
    installSheetTitle: "Agregar a pantalla de inicio",
    installStepsIos: [
      "Toca el botón Compartir en la barra de Safari, o en el menú •••.",
      "Baja y toca Agregar a pantalla de inicio.",
      "Toca Agregar. Luego abre Border Time desde tu pantalla de inicio e inicia sesión ahí. Guarda su propia sesión.",
    ],
    installStepsOther: [
      "Abre el menú de tu navegador.",
      "Toca Instalar app, o Agregar a pantalla de inicio.",
      "Confirma. Border Time se abre desde tu pantalla de inicio.",
    ],
    installDone: "Entendido",
    tourReplay: "Hacer el recorrido",
    tourSkip: "Omitir",
    tourBack: "Atrás",
    tourNext: "Siguiente",
    tourDone: "Listo",
    tourProgress: (step, total) => `${step} de ${total}`,
    tourWelcomeTitle: "Bienvenido a Border Time",
    tourWelcomeBody:
      "Agreguemos Puente Viejo y aprendamos a leerlo. Toma unos veinte segundos.",
    tourFindTitle: "Encuentra un puente",
    tourFindBody:
      "Toca + para encontrar Puente Viejo, el puente con cámara en vivo.",
    tourPickTitle: "Agrega Puente Viejo",
    tourPickBody: "Toca el más junto a él para guardarlo en tus puentes.",
    tourOpenTitle: "Esta es tu tarjeta",
    tourOpenBody: "Tócala para ver la cámara, el carril y la espera habitual.",
    tourCameraTitle: "Míralo en vivo",
    tourCameraBody:
      "Puente Viejo y Puente Nuevo tienen cámara en vivo, justo arriba de la tarjeta.",
    tourLanesTitle: "En vivo, por carril",
    tourLanesBody:
      "Cada carril muestra su propia espera. Toca uno para cambiar.",
    tourUsualTitle: "Lo normal",
    tourUsualBody:
      "La espera habitual por hora, para que una mala espera resalte frente a una normal.",
    tourCloseTitle: "Regresa",
    tourCloseBody: "Toca Listo para cerrar la tarjeta.",
    tourSchedulesTitle: "Alarmas",
    tourSchedulesBody:
      "Elige una hora y días, y Border Time te manda la espera de tu puente antes de que tengas que salir.",
    tourAskTitle: "Preguntar",
    tourAskBody:
      "Pregunta sobre horarios, construcción o qué carril avanza. Responde con la espera en vivo a la mano.",
    tourAccountTitle: "Tu cuenta",
    tourAccountBody:
      "Cambia el idioma o la apariencia, y encuentra cerrar sesión aquí.",
    tourDoneTitle: "Eso es todo",
    tourDoneBody:
      "Buen viaje. Puedes repetir este recorrido cuando quieras desde el menú de la cuenta.",
    scheduleTourWelcomeTitle: "Bienvenido a Alarmas",
    scheduleTourWelcomeBody:
      "Elige una hora y días, y Border Time te manda la espera de tu puente antes de que tengas que salir.",
    scheduleTourBridgesTitle: "Primero guarda un puente",
    scheduleTourBridgesBody:
      "Una alarma avisa sobre tus puentes guardados. Explora los cruces para agregar uno.",
    scheduleTourAddTitle: "Crea una alarma",
    scheduleTourAddBody:
      "Toca + para elegir una hora, días y un puente del que quieras saber.",
    scheduleTourCardTitle: "Tu alarma",
    scheduleTourCardBody:
      "La hora, el carril y la espera de cada puente en este momento. Tócala para hacer cambios.",
    scheduleTourToggleTitle: "Pausa cuando quieras",
    scheduleTourToggleBody:
      "Apaga esto para detener los avisos sin borrar la alarma.",
    scheduleTourDoneTitle: "Eso es todo",
    scheduleTourDoneBody: "Border Time te mandará la espera justo a tiempo.",
    scheduleTourReplay: "Repetir el recorrido de Alarmas",
    scheduleTourSheetBridges:
      "Elige hasta seis puentes y el carril del que quieras saber.",
    scheduleTourSheetTime: "Elige a qué hora quieres el aviso.",
    scheduleTourSheetDays: "Elige los días y toca Guardar.",
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
  return name.subtitle.toLowerCase().includes("canad")
    ? copy.canadianBorder
    : copy.mexicanBorder;
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

export function presentHours(
  hours: string,
  locale: Locale,
  copy: Copy,
): string {
  if (!hours) return copy.hoursUnavailable;
  return presentClock(hours, locale);
}

export type ShareMessage = {
  title: string;
  text: string;
};

/** The sentence a share sheet sends, and the title and description on that link. */
export function shareMessage(
  port: PortWaitTime,
  mode: Mode,
  copy: Copy,
): ShareMessage {
  const name = portName(port);
  const reading = readLane(port, mode);
  const lane = modeName(mode, port, copy);
  const place = placeSubtitle(name, copy);

  if (reading.minutes !== null) {
    return {
      title: copy.shareTitle(name.title, copy.minutes(reading.minutes)),
      text: copy.shareWait(name.title, reading.minutes, lane, place),
    };
  }

  const status = waitLabel(reading, copy);
  return {
    title: copy.shareTitle(name.title, status),
    text: copy.shareStatus(name.title, status, lane, place),
  };
}

export function presentPortStatus(status: string, copy: Copy): string {
  const key = status.trim().toLowerCase();
  if (!key) return copy.unknown;
  if (key === "open") return copy.open;
  if (key === "closed") return copy.closed;
  return status;
}
