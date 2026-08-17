"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormValueInput } from "@/components/ui/form-value-input";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

const triggerClassName = cn(
  "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-input px-4 py-2 text-base text-foreground shadow-sm outline-none transition-[color,box-shadow,background-color,transform] md:text-sm",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "data-[placeholder]:text-muted-foreground",
  "active:scale-[0.99]",
);

function Select({
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  required,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const current = isControlled ? value : internal;
  const hiddenRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isControlled) return;
    const form = hiddenRef.current?.form;
    if (!form) return;
    const onReset = () => setInternal(defaultValue ?? "");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, isControlled]);

  function handleChange(next: string) {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  }

  return (
    <>
      {name ? (
        <FormValueInput
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          inputRef={hiddenRef}
          onValueChange={handleChange}
        />
      ) : null}
      <SelectPrimitive.Root
        value={current || undefined}
        onValueChange={handleChange}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          className={cn(triggerClassName, className)}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className={cn(
              "relative z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-card",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
          >
            <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
              <ChevronUp className="size-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              {options
                .filter((option) => option.value)
                .map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center rounded-lg py-2.5 pe-8 ps-3 text-sm outline-none select-none",
                    "focus:bg-accent focus:text-accent-foreground",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                    "data-[state=checked]:text-brand",
                  )}
                >
                  <>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute end-2 flex size-4 items-center justify-center">
                      <Check className="size-4 text-brand" strokeWidth={2.25} />
                    </SelectPrimitive.ItemIndicator>
                  </>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
              <ChevronDown className="size-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </>
  );
}

export { Select };
