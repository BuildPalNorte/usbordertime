"use client";

import { PaneTitle, usePublishPaneChrome } from "./pane-header";
import { SignInRequired } from "./sign-in-prompt";

const NO_HANDLERS = { onRefresh: () => {}, onDone: () => {}, onAdd: () => {} };

/** A tab that needs an account, shown to someone using the app without one. Same header, one card. */
export function GuestPane({
  title,
  subtitle,
  signInTitle,
  signInBody,
  ownsHeader,
}: {
  title: string;
  subtitle: string;
  signInTitle: string;
  signInBody: string;
  ownsHeader: boolean;
}) {
  usePublishPaneChrome(
    ownsHeader,
    { subtitle, action: "none", checking: false, refreshing: false },
    NO_HANDLERS,
  );

  return (
    <div>
      <header className="hidden pb-5 lg:block">
        <PaneTitle title={title} subtitle={subtitle} />
      </header>
      <div className="pane-body">
        <SignInRequired title={signInTitle} body={signInBody} />
      </div>
    </div>
  );
}
