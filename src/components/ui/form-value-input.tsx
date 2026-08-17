"use client";

import type { Ref } from "react";

export function FormValueInput({
  name,
  value,
  required,
  disabled,
  inputRef,
  onValueChange,
}: {
  name: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onValueChange?: (value: string) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={value}
      required={required}
      disabled={disabled}
      tabIndex={-1}
      aria-hidden
      data-testid={`form-value-${name}`}
      className="sr-only"
      onChange={(event) => onValueChange?.(event.target.value)}
    />
  );
}
