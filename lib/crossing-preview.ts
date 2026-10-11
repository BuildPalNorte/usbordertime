import { getBorderWaitTimes, type PortWaitTime } from "@/lib/border-wait-times";
import { COPY, shareMessage, type Copy, type Locale, type ShareMessage } from "@/lib/i18n";
import { defaultMode, readLane, type Mode } from "@/lib/ports";
import {
  crossingImagePath,
  crossingSharePath,
  isPortParam,
  laneQuery,
} from "@/lib/routes";

export type CrossingPreview = {
  port: PortWaitTime;
  mode: Mode;
  locale: Locale;
  copy: Copy;
  message: ShareMessage;
  path: string;
  image: string;
};

/**
 * The wait a shared link describes. `lang` on the link wins so the preview
 * matches the message that was sent. An unpublished lane falls back to the
 * crossing's usual one.
 */
export async function crossingPreview(
  portNumber: string,
  laneValue: string | null,
  locale: Locale,
): Promise<CrossingPreview | null> {
  if (!isPortParam(portNumber)) return null;

  let ports: PortWaitTime[];
  try {
    ports = (await getBorderWaitTimes()).ports;
  } catch {
    return null;
  }

  const port = ports.find((item) => item.portNumber === portNumber);
  if (!port) return null;

  const requested = laneQuery(laneValue);
  const mode =
    requested && readLane(port, requested).available ? requested : defaultMode(port);
  const copy = COPY[locale];

  return {
    port,
    mode,
    locale,
    copy,
    message: shareMessage(port, mode, copy),
    path: crossingSharePath(port.portNumber, mode, locale),
    image: crossingImagePath(port.portNumber, mode, locale),
  };
}
