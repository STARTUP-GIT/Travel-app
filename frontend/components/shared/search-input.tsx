"use client";

import { Search } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.ComponentProps<"input">, "onSubmit"> & {
  onSubmit?: (value: string) => void;
};

export function SearchInput({
  className,
  onSubmit,
  placeholder = "Search…",
  ...props
}: SearchInputProps) {
  const [value, setValue] = React.useState("");
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    setValue("");
  }, [pathname]);

  const isSearchPath = pathname.includes("/search");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSearchPath) {
      router.replace(`/search?q=${encodeURIComponent(value.trim())}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
    onSubmit?.(value.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn("pl-9 pr-4", className)}
        aria-label="Search"
        {...props}
      />
    </form>
  );
}