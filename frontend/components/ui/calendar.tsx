import * as React from "react";
import { DayPicker } from "react-day-picker";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "relative flex justify-center items-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "absolute left-1 top-1 size-8 hover:bg-white/10"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-1 top-1 size-8 hover:bg-white/10"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 text-[0.8rem] font-medium",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal"
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-lg [&>button]:hover:bg-primary",
        today: "[&>button]:bg-primary/20 [&>button]:rounded-lg",
        disabled: "[&>button]:text-muted-foreground/40 [&>button]:opacity-40",
        outside: "[&>button]:text-muted-foreground/50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", chevronClassName)} />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-4", chevronClassName)} />
            );
          }
          return (
            <ChevronDownIcon className={cn("size-4", chevronClassName)} />
          );
        },
      }}
      {...props}
    />
  );
}

export { Calendar };