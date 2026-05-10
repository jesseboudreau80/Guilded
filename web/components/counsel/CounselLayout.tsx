"use client";

import { type ReactNode } from "react";
import { CounselProvider } from "./CounselProvider";
import {
  DesktopCounselDrawer,
  MobileCounselDrawer,
  CounselTriggerButton,
} from "./GuildCounselDrawer";

type Props = {
  /** The top bar slot — receives ReactNode from the server layout.
   *  Because this client component wraps it, client children of the
   *  topBar (like CounselTopBarButton) can access CounselContext. */
  topBar:   ReactNode;
  children: ReactNode;
};

/**
 * CounselLayout wraps the entire right side of the dashboard.
 *
 * It provides CounselContext to all descendants (including client
 * components nested inside server-rendered slots like DashboardTopBar).
 *
 * Layout structure:
 *   CounselLayout (flex col)
 *   ├─ topBar slot (DashboardTopBar + CounselTopBarButton)
 *   └─ content row (flex)
 *      ├─ page content (flex-1, scrollable)
 *      ├─ DesktopCounselDrawer (w-80 or w-0, animated)
 *      ├─ MobileCounselDrawer (fixed bottom sheet)
 *      └─ CounselTriggerButton (fixed, bottom-right)
 */
export function CounselLayout({ topBar, children }: Props) {
  return (
    <CounselProvider>
      {/* Top bar — always visible */}
      {topBar}

      {/* Content row: page + desktop drawer as flex siblings */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto min-w-0">
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
