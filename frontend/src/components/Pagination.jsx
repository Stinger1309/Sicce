import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Paginación compacta en móvil (prev/next + página X de Y)
 * y números limitados en desktop.
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  darkMode = false,
  totalItems,
  pageSize,
  className = '',
}) => {
  const pages = useMemo(() => {
    if (totalPages <= 1) return [];
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  if (!totalPages || totalPages <= 1) return null;

  const btnBase = `inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    darkMode
      ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
  }`;

  const btnActive = darkMode
    ? 'bg-[#2A9D8F] text-white border-[#2A9D8F] hover:bg-[#238b7e]'
    : 'bg-[#2A9D8F] text-white border-[#2A9D8F] hover:bg-[#238b7e]';

  const from =
    totalItems != null && pageSize
      ? (currentPage - 1) * pageSize + 1
      : null;
  const to =
    totalItems != null && pageSize
      ? Math.min(currentPage * pageSize, totalItems)
      : null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
    >
      <p
        className={`text-xs sm:text-sm text-center sm:text-left ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        {from != null && to != null && totalItems != null ? (
          <>
            Mostrando {from}–{to} de {totalItems}
          </>
        ) : (
          <>
            Página {currentPage} de {totalPages}
          </>
        )}
      </p>

      <div className="flex items-center justify-center gap-1 flex-wrap">
        <button
          type="button"
          className={btnBase}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="Primera página"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          className={btnBase}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Números: ocultos en móvil muy estrecho */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`${btnBase} ${p === currentPage ? btnActive : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <span
          className={`sm:hidden text-sm px-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          {currentPage}/{totalPages}
        </span>

        <button
          type="button"
          className={btnBase}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Siguiente"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className={btnBase}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
