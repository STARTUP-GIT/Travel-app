"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type EnquireContact = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  name?: string | null;
};

/**
 * Mobile-first "Enquire Now" actions. These open real native apps / mail
 * clients — no plain text links.
 */
export function EnquireButtons({ contact }: { contact: EnquireContact }) {
  const subject = encodeURIComponent(
    `Enquiry about ${contact.name ?? "travel guide"} – Karnataka Tourism Guide`
  );
  const body = encodeURIComponent(
    `Hi${contact.name ? " " + contact.name : ""},\n\nI'm interested in your services. Please get back to me.\n\nThanks,\nKarnataka Tourism Guide user`
  );

  const emailHref =
    contact.email && contact.email.includes("@")
      ? `mailto:${contact.email}?subject=${subject}&body=${body}`
      : null;
  const telHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : null;

  const whatsappNumber = normalizeWhatsapp(contact.whatsapp ?? contact.phone);
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi${contact.name ? " " + contact.name : ""}, I'd like to enquire about your services.`)}`
    : null;

  const actions: { label: string; href: string | null; icon: typeof Mail; tone: string }[] = [
    { label: "Email", href: emailHref, icon: Mail, tone: "bg-primary/10 text-primary" },
    { label: "WhatsApp", href: whatsappHref, icon: MessageCircle, tone: "bg-success/12 text-emerald-700" },
    { label: "Call", href: telHref, icon: Phone, tone: "bg-amber-400/16 text-amber-700" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ label, href, icon: Icon, tone }) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          className="h-auto flex-col gap-1.5 py-3"
          disabled={!href}
          onClick={() => {
            if (!href) {
              toast.error("This contact method is unavailable for this guide");
            }
          }}
          asChild={!!href}
        >
          {href ? (
            <a href={href} target={label === "WhatsApp" ? "_blank" : undefined} rel="noreferrer">
              <span className={`flex size-9 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-[18px]" />
              </span>
              <span className="text-xs font-semibold">{label}</span>
            </a>
          ) : (
            <>
              <span className={`flex size-9 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-[18px]" />
              </span>
              <span className="text-xs font-semibold">{label}</span>
            </>
          )}
        </Button>
      ))}
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