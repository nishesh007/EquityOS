/**
 * Sprint 10C.R5 — typed text primitive.
 * Renders any typography variant with the correct semantic element.
 */

import { createElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TYPE_CLASSES, type TypeVariant } from "./typeScale";

const DEFAULT_ELEMENTS: Readonly<Record<TypeVariant, string>> = Object.freeze({
  displayXl: "h1",
  displayL: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  bodySmall: "p",
  caption: "p",
  label: "span",
  metric: "span",
  numeric: "span",
  mono: "code",
});

interface TextProps {
  variant: TypeVariant;
  children: ReactNode;
  /** Override the rendered element (e.g. as="div"). */
  as?: string;
  className?: string;
}

export function Text({ variant, children, as, className }: TextProps) {
  return createElement(
    as ?? DEFAULT_ELEMENTS[variant],
    { className: cn(TYPE_CLASSES[variant], className) },
    children
  );
}
