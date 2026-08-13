"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

export function ButtonLink({
  href,
  children,
  variant,
  size,
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      render={<Link href={href} />}
      nativeButton={false}
      {...rest}
    >
      {children}
    </Button>
  );
}