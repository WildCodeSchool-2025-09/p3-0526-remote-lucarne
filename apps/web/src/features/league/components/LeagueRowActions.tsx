import type { League } from "@lucarne/shared";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Button, temporaryIcons } from "../../../ui";

type LeagueActionType = "activate" | "deactivate" | "delete";

interface LeagueRowActionsProps {
  canDelete: boolean;
  canEdit: boolean;
  league: League;
  onAction: (action: LeagueActionType) => void;
}

function LeagueRowActions({ canDelete, canEdit, league, onAction }: LeagueRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ActionsIcon = temporaryIcons.actions;
  const actionType: LeagueActionType = league.status === "ACTIVE" || league.isActive
    ? "deactivate"
    : "activate";

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (trigger == null) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 148;
    const margin = 8;

    setMenuPosition({
      left: Math.min(Math.max(margin, rect.right - menuWidth), window.innerWidth - menuWidth - margin),
      top: Math.max(margin, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - margin)),
    });
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    updateMenuPosition();
    const onViewportChange = () => updateMenuPosition();
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
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
  }, [isOpen]);

  if (!canEdit) return null;

  const menu = isOpen && menuPosition != null ? createPortal(
    <div
      className="league-row-actions__menu"
      ref={menuRef}
      role="menu"
      style={menuPosition}
    >
      <Link
        className="league-row-actions__item"
        onClick={() => setIsOpen(false)}
        role="menuitem"
        to={`/dashboard/leagues/${league.id}/edit`}
      >
        Modifier
      </Link>
      <button
        className="league-row-actions__item"
        onClick={() => {
          setIsOpen(false);
          onAction(actionType);
        }}
        role="menuitem"
        type="button"
      >
        {actionType === "deactivate" ? "Désactiver" : "Activer"}
      </button>
      {canDelete ? (
        <button
          className="league-row-actions__item league-row-actions__item--danger"
          onClick={() => {
            setIsOpen(false);
            onAction("delete");
          }}
          role="menuitem"
          type="button"
        >
          Supprimer
        </button>
      ) : null}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="league-row-actions">
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Ouvrir les actions de ${league.name}`}
        className="league-row-actions__trigger"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            updateMenuPosition();
            setIsOpen(true);
          }
        }}
        ref={triggerRef}
        variant="ghost"
      >
        <ActionsIcon aria-hidden="true" className="league-row-actions__icon" size={20} />
        <span className="league-row-actions__mobile-label">Gérer</span>
      </Button>
      {menu}
    </div>
  );
}

export default LeagueRowActions;
export type { LeagueActionType };
