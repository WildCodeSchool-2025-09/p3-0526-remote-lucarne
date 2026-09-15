import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Button } from "./Button";
import { temporaryIcons } from "./icons";

type ResourceAction = {
  key: string;
  label: string;
  tone?: "default" | "danger";
} & (
  | { href: string; onSelect?: never }
  | { href?: never; onSelect: () => void }
);

interface ResourceActionsPopoverProps {
  actions: ResourceAction[];
  mobileLabel?: string;
  popoverLabel?: string;
  triggerLabel: string;
}

function ResourceActionsPopover({
  actions,
  mobileLabel = "Gérer",
  popoverLabel = "Actions disponibles",
  triggerLabel,
}: ResourceActionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const ActionsIcon = temporaryIcons.actions;

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger == null) return;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 180;
    const popoverHeight = actions.length * 40 + 8;
    const margin = 8;

    setPopoverPosition({
      left: Math.min(Math.max(margin, rect.right - popoverWidth), window.innerWidth - popoverWidth - margin),
      top: Math.max(margin, Math.min(rect.bottom + 4, window.innerHeight - popoverHeight - margin)),
    });
  }, [actions.length]);

  useEffect(() => {
    if (!isOpen) return undefined;

    updatePopoverPosition();
    popoverRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onViewportChange = () => updatePopoverPosition();
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && !triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, updatePopoverPosition]);

  const popover = isOpen && popoverPosition != null ? createPortal(
    <div
      aria-label={popoverLabel}
      className="resource-actions-popover__panel"
      id={popoverId}
      ref={popoverRef}
      role="group"
      style={popoverPosition}
    >
      {actions.map((action) => {
        const className = `resource-actions-popover__item${action.tone === "danger" ? " resource-actions-popover__item--danger" : ""}`;

        return action.href != null ? (
          <Link className={className} key={action.key} onClick={() => setIsOpen(false)} to={action.href}>
            {action.label}
          </Link>
        ) : (
          <button
            className={className}
            key={action.key}
            onClick={() => {
              setIsOpen(false);
              triggerRef.current?.focus();
              action.onSelect();
            }}
            type="button"
          >
            {action.label}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="resource-actions-popover">
      <Button
        aria-controls={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        className="resource-actions-popover__trigger"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            updatePopoverPosition();
            setIsOpen(true);
          }
        }}
        ref={triggerRef}
        variant="ghost"
      >
        <ActionsIcon aria-hidden="true" className="resource-actions-popover__icon" size={20} />
        <span className="resource-actions-popover__mobile-label">{mobileLabel}</span>
      </Button>
      {popover}
    </div>
  );
}

export { ResourceActionsPopover };
export type { ResourceAction, ResourceActionsPopoverProps };
