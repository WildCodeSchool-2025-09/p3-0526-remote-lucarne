import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
}

function Pagination({ label = "Pagination", page, totalPages, onPageChange }: PaginationProps) {
  return (
    <nav aria-label={label} className="lucarne-pagination">
      <Button disabled={page === 1} onClick={() => onPageChange(page - 1)} variant="outline">Précédent</Button>
      <span>Page {page} sur {totalPages}</span>
      <Button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} variant="outline">Suivant</Button>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
