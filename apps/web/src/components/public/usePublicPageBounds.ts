import { useEffect } from "react";
import type { SetURLSearchParams } from "react-router";

export function usePublicPageBounds(page: number, totalPages: number | undefined, setSearch: SetURLSearchParams) {
  useEffect(() => {
    if (totalPages === undefined || page <= Math.max(1, totalPages)) return;
    setSearch((current) => {
      const next = new URLSearchParams(current); next.set("page", String(Math.max(1, totalPages))); return next;
    }, { replace: true });
  }, [page, totalPages, setSearch]);
}
