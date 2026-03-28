"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type AppSelectGroup = {
  label: string;
  options: AppSelectOption[];
};

type AppSelectItem = AppSelectOption | AppSelectGroup;

function isGroup(item: AppSelectItem): item is AppSelectGroup {
  return "options" in item;
}

type FlatOption = AppSelectOption & {
  groupLabel?: string;
};

type AppSelectProps = {
  value: string;
  onChange: (value: string) => void;
  items: AppSelectItem[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showGroupLabels?: boolean;
};

export default function AppSelect({
  value,
  onChange,
  items,
  placeholder = "Select",
  disabled = false,
  className = "",
  showGroupLabels = true,
}: AppSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const flatOptions = useMemo<FlatOption[]>(() => {
    const result: FlatOption[] = [];

    for (const item of items) {
      if (isGroup(item)) {
        for (const option of item.options) {
          result.push({
            ...option,
            groupLabel: item.label,
          });
        }
      } else {
        result.push(item);
      }
    }

    return result;
  }, [items]);

  const selectedOption = flatOptions.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
      setHighlightedIndex(-1);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      setHighlightedIndex(-1);
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.focus();
  }, [highlightedIndex, isOpen]);

  function openMenu() {
    if (disabled) return;

    const selectedIndex = flatOptions.findIndex((option) => option.value === value && !option.disabled);
    const firstEnabledIndex = flatOptions.findIndex((option) => !option.disabled);

    setIsOpen(true);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex);
  }

  function closeMenu() {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function moveHighlight(direction: 1 | -1) {
    if (flatOptions.length === 0) return;

    let nextIndex = highlightedIndex;

    for (let i = 0; i < flatOptions.length; i += 1) {
      nextIndex = nextIndex + direction;

      if (nextIndex < 0) nextIndex = flatOptions.length - 1;
      if (nextIndex >= flatOptions.length) nextIndex = 0;

      if (!flatOptions[nextIndex]?.disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    }
  }

  function handleOptionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    option: FlatOption,
    index: number
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstEnabledIndex = flatOptions.findIndex((item) => !item.disabled);
      setHighlightedIndex(firstEnabledIndex);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const reversedIndex = [...flatOptions].reverse().findIndex((item) => !item.disabled);
      if (reversedIndex === -1) return;
      setHighlightedIndex(flatOptions.length - 1 - reversedIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (option.disabled) return;
      onChange(option.value);
      closeMenu();
      buttonRef.current?.focus();
      return;
    }

    if (event.key === "Tab") {
      closeMenu();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      buttonRef.current?.focus();
      return;
    }

    setHighlightedIndex(index);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleButtonKeyDown}
        className="flex h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-left text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedOption ? "text-white" : "text-white/45"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/55 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[120] overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div role="listbox" className="max-h-72 overflow-y-auto py-2">
            {items.map((item, itemIndex) => {
              if (isGroup(item)) {
                return (
                  <div key={`group-${item.label}-${itemIndex}`} className="py-1">
                    {showGroupLabels ? (
                      <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/38">
                        {item.label}
                      </div>
                    ) : null}

                    {item.options.map((option) => {
                      const flatIndex = flatOptions.findIndex(
                        (flatOption) =>
                          flatOption.value === option.value && flatOption.groupLabel === item.label
                      );

                      const isSelected = option.value === value;
                      const isHighlighted = flatIndex === highlightedIndex;

                      return (
                        <button
                          key={`${item.label}-${option.value}`}
                          ref={(element) => {
                            optionRefs.current[flatIndex] = element;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={option.disabled}
                          onMouseEnter={() => setHighlightedIndex(flatIndex)}
                          onClick={() => {
                            if (option.disabled) return;
                            onChange(option.value);
                            closeMenu();
                            buttonRef.current?.focus();
                          }}
                          onKeyDown={(event) => handleOptionKeyDown(event, option, flatIndex)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                            option.disabled
                              ? "cursor-not-allowed text-white/25"
                              : isSelected
                                ? "cursor-pointer text-[#00FFC6]"
                                : "cursor-pointer text-white/88"
                          } ${isHighlighted && !option.disabled ? "bg-white/[0.06]" : ""}`}
                        >
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              const flatIndex = flatOptions.findIndex((flatOption) => flatOption.value === item.value);
              const isSelected = item.value === value;
              const isHighlighted = flatIndex === highlightedIndex;

              return (
                <button
                  key={item.value}
                  ref={(element) => {
                    optionRefs.current[flatIndex] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={item.disabled}
                  onMouseEnter={() => setHighlightedIndex(flatIndex)}
                  onClick={() => {
                    if (item.disabled) return;
                    onChange(item.value);
                    closeMenu();
                    buttonRef.current?.focus();
                  }}
                  onKeyDown={(event) => handleOptionKeyDown(event, item, flatIndex)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    item.disabled
                      ? "cursor-not-allowed text-white/25"
                      : isSelected
                        ? "cursor-pointer text-[#00FFC6]"
                        : "cursor-pointer text-white/88"
                  } ${isHighlighted && !item.disabled ? "bg-white/[0.06]" : ""}`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
