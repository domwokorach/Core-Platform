import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { termsOfService } from "@/content/terms-of-service";

export const metadata: Metadata = { title: "Terms of Service | FINIX", description: "Terms governing use of FINIX." };

export default function TermsPage() { return <LegalLayout doc={termsOfService} />; }
