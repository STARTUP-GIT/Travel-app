"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type EnquireContact = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  name?: string | null;
};

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const UNSAFE_IN_ADDRESS = /[\s<>"'(),:;\\/?#&=]/;

function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/'/g, "%27");
}

function normalizeProviderName(name?: string | null): string | null {
  const cleaned = (name ?? "").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeRecipient(email?: string | null): string | null {
  const cleaned = (email ?? "")
    .replace(/^[\s"'<]+/, "")
    .replace(/[\s"'<>]+$/, "")
    .trim();
  if (!cleaned || UNSAFE_IN_ADDRESS.test(cleaned)) return null;
  if (!EMAIL_PATTERN.test(cleaned)) return null;
  return cleaned;
}

export function buildEnquiryMailto(contact: EnquireContact): string | null {
  const recipient = normalizeRecipient(contact.email);
  if (!recipient) return null;

  const providerName = normalizeProviderName(contact.name);
  const subject = providerName
    ? `Enquiry about ${providerName} \u2013 Karnataka Tourism Guide`
    : "Enquiry \u2013 Karnataka Tourism Guide";
  const greeting = providerName ? `Hi ${providerName},` : "Hi,";
  const body = [
    greeting,
    "",
    "I'm interested in your services on Karnataka Tourism Guide. Please get back to me.",
    "",
    "Thanks,",
    "Karnataka Tourism Guide user",
  ].join("\n");

  return `mailto:${recipient}?subject=${encodeQueryValue(subject)}&body=${encodeQueryValue(body)}`;
}

/**
 * Mobile-first "Enquire Now" actions. These open real native apps / mail
 * clients — no plain text links.
 */
export function EnquireButtons({ contact }: { contact: EnquireContact }) {
  const emailHref = buildEnquiryMailto(contact);
  const telHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : null;

  const providerName = normalizeProviderName(contact.name);
  const whatsappNumber = normalizeWhatsapp(contact.whatsapp ?? contact.phone);
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `${providerName ? `Hi ${providerName}, ` : "Hi, "}I'd like to enquire about your services.`
      )}`
    : null;

  const actions: {
    label: string;
    href: string | null;
    icon: typeof Mail;
    tone: string;
    unavailable: string;
  }[] = [
    {
      label: "Email",
      href: emailHref,
      icon: Mail,
      tone: "bg-primary/10 text-primary",
      unavailable: "Email unavailable.",
    },
    {
      label: "WhatsApp",
      href: whatsappHref,
      icon: MessageCircle,
      tone: "bg-success/12 text-emerald-700",
      unavailable: "WhatsApp unavailable.",
    },
    {
      label: "Call",
      href: telHref,
      icon: Phone,
      tone: "bg-amber-400/16 text-amber-700",
      unavailable: "Phone unavailable.",
    },
  ];

  const tileClass = cn(buttonVariants({ variant: "outline" }), "h-auto flex-col gap-1.5 py-3");

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ label, href, icon: Icon, tone, unavailable }) => {
        const content = (
          <>
            <span className={`flex size-9 items-center justify-center rounded-full ${tone}`}>
              <Icon className="size-[18px]" />
            </span>
            <span className="text-xs font-semibold">{label}</span>
          </>
        );

        if (!href) {
          return (
            <button
              key={label}
              type="button"
              onClick={() => toast.error(unavailable)}
              className={cn(tileClass, "opacity-50")}
            >
              {content}
            </button>
          );
        }

        return (
          <a
            key={label}
            href={href}
            className={tileClass}
            target={label === "WhatsApp" ? "_blank" : undefined}
            rel={label === "WhatsApp" ? "noreferrer" : undefined}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}

function normalizeWhatsapp(number: string | null | undefined): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits.replace(/^0+/, "");
}
