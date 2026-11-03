"use client";

import React from "react";
import { maskInput, type InputMask } from "@peanut/validators";

export interface NormalizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask?: InputMask | false;
}

type Field = HTMLInputElement | HTMLTextAreaElement;

// Count significant characters after the caret, so inserted punctuation and the
// default DDI do not move the caret to the end when editing in the middle.
function updateValue(
  element: Field,
  format: (value: string) => string,
  deleting?: string,
) {
  let raw = element.value;
  const start = element.selectionStart;
  const end = element.selectionEnd;
  let suffix =
    start === null
      ? 0
      : raw.slice(start).replace(/[^A-Za-z0-9\u00c0-\uffff]/g, "").length;
  let next = format(raw);
  if (
    deleting &&
    start !== null &&
    format(raw) !== raw &&
    next === element.dataset.formattedValue
  ) {
    const before = raw.slice(0, start),
      after = raw.slice(start);
    if (deleting === "deleteContentBackward")
      raw =
        before.replace(
          /[A-Za-z0-9\u00c0-\uffff][^A-Za-z0-9\u00c0-\uffff]*$/,
          "",
        ) + after;
    if (deleting === "deleteContentForward") {
      raw =
        before +
        after.replace(
          /^[^A-Za-z0-9\u00c0-\uffff]*[A-Za-z0-9\u00c0-\uffff]/,
          "",
        );
      suffix = Math.max(0, suffix - 1);
    }
    next = format(raw);
  }
  element.value = next;
  element.dataset.formattedValue = next;
  if (start !== null && start === end) {
    let caret = next.length;
    for (
      let i = next.length - 1, remaining = suffix;
      i >= 0 && remaining > 0;
      i--
    ) {
      if (/[A-Za-z0-9\u00c0-\uffff]/.test(next.charAt(i))) {
        remaining--;
        caret = i;
      }
    }
    try {
      element.setSelectionRange(caret, caret);
    } catch {
      /* email/number inputs have no selection API */
    }
  }
}

export const NormalizedInput = React.forwardRef<
  HTMLInputElement,
  NormalizedInputProps
>(
  (
    {
      mask,
      type = "text",
      onChange,
      onBlur,
      value,
      defaultValue,
      onCompositionEnd,
      ...props
    },
    ref,
  ) => {
    const mode =
      mask === false
        ? undefined
        : mask ||
          (type === "email"
            ? "email"
            : type === "tel"
              ? "phone"
              : type === "text"
                ? "text"
                : undefined);
    const format = (v: string, finalize = false) =>
      mode ? maskInput(v, mode, finalize) : v;
    const displayed = typeof value === "string" ? format(value) : value;
    const change = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (mode && !(event.nativeEvent as InputEvent).isComposing)
        updateValue(
          event.currentTarget,
          format,
          (event.nativeEvent as InputEvent).inputType,
        );
      onChange?.(event);
    };
    return (
      <input
        {...props}
        ref={ref}
        type={mode === "phone" ? "tel" : type}
        inputMode={
          props.inputMode ||
          (mode === "phone"
            ? "tel"
            : mode === "cep" ||
                mode === "cpf" ||
                mode === "cnpj" ||
                mode === "document"
              ? "numeric"
              : undefined)
        }
        autoCapitalize={
          mode === "email" || mode === "website" || mode === "hostname"
            ? "none"
            : props.autoCapitalize
        }
        spellCheck={
          mode === "email" || mode === "website" ? false : props.spellCheck
        }
        value={displayed}
        defaultValue={
          typeof defaultValue === "string" ? format(defaultValue) : defaultValue
        }
        data-formatted-value={displayed}
        onChange={change}
        onCompositionEnd={(event) => {
          if (mode) {
            updateValue(event.currentTarget, format);
            onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>);
          }
          onCompositionEnd?.(event);
        }}
        onBlur={(event) => {
          if (
            mode &&
            event.currentTarget.value !==
              format(event.currentTarget.value, true)
          ) {
            updateValue(event.currentTarget, (v) => format(v, true));
            onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>);
          }
          onBlur?.(event);
        }}
      />
    );
  },
);
NormalizedInput.displayName = "NormalizedInput";

export interface NormalizedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  mask: "address" | "emailList" | "phoneList";
}

export function NormalizedTextarea({
  mask,
  value,
  onChange,
  onBlur,
  onCompositionEnd,
  ...props
}: NormalizedTextareaProps) {
  const format = (v: string, finalize = false) =>
    mask === "address"
      ? maskInput(v, "address", finalize)
      : v
          .split(/([\n;,])/)
          .map((part) =>
            /^[\n;,]$/.test(part)
              ? part
              : mask === "phoneList"
                ? maskInput(part, "phone")
                : maskInput(part, "email"),
          )
          .join("");
  return (
    <textarea
      {...props}
      value={typeof value === "string" ? format(value) : value}
      data-formatted-value={
        typeof value === "string" ? format(value) : undefined
      }
      onChange={(event) => {
        if (!(event.nativeEvent as InputEvent).isComposing)
          updateValue(
            event.currentTarget,
            format,
            (event.nativeEvent as InputEvent).inputType,
          );
        onChange?.(event);
      }}
      onCompositionEnd={(event) => {
        updateValue(event.currentTarget, format);
        onChange?.(event as unknown as React.ChangeEvent<HTMLTextAreaElement>);
        onCompositionEnd?.(event);
      }}
      onBlur={(event) => {
        if (
          event.currentTarget.value !== format(event.currentTarget.value, true)
        ) {
          updateValue(event.currentTarget, (v) => format(v, true));
          onChange?.(
            event as unknown as React.ChangeEvent<HTMLTextAreaElement>,
          );
        }
        onBlur?.(event);
      }}
    />
  );
}
