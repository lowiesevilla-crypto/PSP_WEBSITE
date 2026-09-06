import Link from "next/link";

export function AdminPagination({
  pathname,
  page,
  totalPages,
  totalItems,
  query = {},
}: {
  pathname: string;
  page: number;
  totalPages: number;
  totalItems: number;
  query?: Record<string, string | undefined>;
}) {
  const safeTotalPages = Math.max(1, totalPages);

  function href(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  }

  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <div className="admin-pagination-summary">
        <strong>{totalItems.toLocaleString("en-PH")}</strong> result{totalItems === 1 ? "" : "s"} · Page {page} of {safeTotalPages}
      </div>
      <div className="admin-pagination-actions">
        {page > 1 ? <Link className="btn admin-page-button" href={href(page - 1)}>Previous</Link> : <span className="btn admin-page-button is-disabled" aria-disabled="true">Previous</span>}
        {page < safeTotalPages ? <Link className="btn admin-page-button" href={href(page + 1)}>Next</Link> : <span className="btn admin-page-button is-disabled" aria-disabled="true">Next</span>}
      </div>
    </nav>
  );
}
