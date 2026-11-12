import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { privacyPolicy } from "@/content/privacy-policy";

export const metadata: Metadata = { title: "Privacy Policy | FINIX", description: "Privacy information for FINIX users." };

export default function PrivacyPage() { return <LegalLayout doc={privacyPolicy} />; }
