"use client";

import { type ReactNode } from "react";
import { CounselProvider } from "./CounselProvider";
import {
  DesktopCounselDrawer,
  MobileCounselDrawer,
  CounselTriggerButton,
} from "./GuildCounselDrawer";

type Props = {
  topBar:   ReactNode;
  children: ReactNode;
};
export function CounselLayout({ topBar, children }: Props) {
  return (
    <CounselProvider>
      {/* Top bar — always visible */}
      {topBar}

      {/* Content row: page + desktop drawer as flex siblings */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Scrollable page content */}
        <div
          className="flex-1 overflow-y-auto overscroll-y-contain min-w-0"
          data-scroll-lock
        >
          {children}
        </div>

        {/* Desktop drawer — always mounted, animated width */}
        <DesktopCounselDrawer />
      </div>

      {/* Mobile bottom sheet — fixed overlay, only on small screens */}
      <MobileCounselDrawer />

      {/* Floating trigger — visible when drawer is closed */}
      <CounselTriggerButton />
    </CounselProvider>
  );
}
