"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useBattleTransition } from "@/components/battle/BattleTransition";

/**
 * A link that blacks out on its way.
 *
 * Entering a battle or a lesson is a stage change, and it should feel like
 * one whether the stage is a phase inside a component (which QuizClient runs
 * through `useBattleTransition` directly) or a different route. This is that
 * beat for the route case: the click is intercepted, the blackout runs, and
 * the push happens while the screen is dark.
 *
 * It still renders a real `next/link`, so the href is a real href — prefetch,
 * middle-click, cmd-click, "open in new tab" and "copy link address" all keep
 * working, and the transition is skipped for exactly the clicks where the
 * visitor was never going to watch it. Anything that swallowed the anchor
 * would take that away.
 */
export default function TransitionLink({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  /** Runs once the blackout is dark, just before the push. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { run, overlay } = useBattleTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Modified clicks belong to the browser: they open somewhere this tab
    // isn't, so blacking this tab out would be theatre over nothing.
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    run(() => {
      onNavigate?.();
      router.push(href);
    });
  }

  return (
    <>
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>
      {overlay}
    </>
  );
}
