"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { LegalSection } from "@/content/types";

export function LegalToc({ sections }: { sections: LegalSection[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(sections[0]?.id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => { const v = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id); },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    sections.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [sections]);

  function go(e: React.MouseEvent, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    el.focus({ preventScroll: true });
    setActive(id);
    setOpen(false);
  }

  const list = (
    <ol className="space-y-0.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`} onClick={e => go(e, s.id)} aria-current={active === s.id ? "location" : undefined}
            className={cn("flex min-h-9 items-baseline gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              active === s.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground")}
          >
            <span className="num w-5 shrink-0 text-xs tabular-nums">{i + 1}</span><span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav aria-label="Table of contents" className="lg:sticky lg:top-24 lg:self-start">
      {/* Mobile / tablet: collapsible */}
      <div className="rounded-2xl border bg-card lg:hidden">
        <button type="button" aria-expanded={open} aria-controls="toc-list" onClick={() => setOpen(o => !o)} className="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">
          Table of contents<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <div id="toc-list" hidden={!open} className="border-t p-2">{list}</div>
      </div>
      {/* Desktop: sticky */}
      <div className="hidden max-h-[calc(100dvh-8rem)] overflow-y-auto lg:block">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">On this page</p>
        {list}
      </div>
    </nav>
  );
}
