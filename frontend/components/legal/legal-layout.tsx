"use client";

import { motion, useReducedMotion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import { LegalHeader } from "./legal-header";
import { LegalFooter } from "./legal-footer";
import { LegalToc } from "./legal-toc";
import type { LegalDocument } from "@/content/types";

const ease = [0.22, 1, 0.36, 1] as const;

export function LegalLayout({ doc }: { doc: LegalDocument }) {
  const reduce = useReducedMotion();
  const date = new Date(`${doc.lastUpdated}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const enter = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease } };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#content" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <LegalHeader />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <motion.div {...enter}>
          <h1 className="text-balance text-[2rem] font-semibold leading-tight tracking-[-0.03em] sm:text-[2.5rem]">{doc.title}</h1>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">{doc.subtitle}</p>
          <p className="mt-4 text-[13px] text-muted-foreground">Last updated: <time dateTime={doc.lastUpdated}>{date}</time></p>
          <p role="note" className="mt-5 flex max-w-2xl items-start gap-2.5 rounded-xl border bg-muted px-4 py-3 text-[13px] leading-relaxed">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span><strong className="font-semibold">Draft for legal review.</strong> This document has not been reviewed by counsel. Items marked “Legal review required” must be completed before public release.</span>
          </p>
        </motion.div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          <LegalToc sections={doc.sections} />
          <article className="min-w-0 max-w-[44rem]">
            {doc.sections.map((s, i) => (
              <motion.section
                key={s.id} aria-labelledby={`${s.id}-h`}
                {...(reduce ? {} : { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "0px 0px -10% 0px" }, transition: { duration: 0.3, ease } })}
                className="border-t py-8 first:border-t-0 first:pt-0"
              >
                <h2 id={s.id} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold tracking-[-0.02em] outline-none">
                  <span id={`${s.id}-h`}><span className="num mr-2.5 text-muted-foreground">{i + 1}.</span>{s.title}</span>
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-foreground/85">
                  {s.paragraphs.map(p => <p key={p}>{p}</p>)}
                </div>
                {s.review && <p className="mt-4 rounded-lg border border-dashed px-3.5 py-2.5 text-[13px] leading-relaxed text-muted-foreground"><strong className="font-semibold text-foreground">Legal review required:</strong> {s.review}</p>}
              </motion.section>
            ))}
          </article>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
