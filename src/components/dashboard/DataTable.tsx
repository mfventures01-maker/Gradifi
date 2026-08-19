/**
 * GRADIFI / SEFAES - DATA TABLE COMPONENT
 * Generic sortable, filterable, searchable responsive data table with pagination, loading skeletons, and empty states.
 */

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Inbox } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  id?: string;
  title?: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  actionButton?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  id,
  title,
  subtitle,
  columns,
  data,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search records...',
  pageSize = 8,
  emptyMessage = 'No records found.',
  actionButton,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((item) =>
      Object.values(item).some((val) =>
        val !== null && val !== undefined ? String(val).toLowerCase().includes(term) : false
      )
    );
  }, [data, searchTerm]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header Bar */}
      {(title || searchable || actionButton) && (
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
            {searchable && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}
            {actionButton}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto min-h-60">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={String(col.key) || idx}
                  scope="col"
                  className={`py-3.5 px-4 ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-4 px-4">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
                    {searchTerm && (
                      <p className="text-xs text-slate-400 mt-1">
                        No matches found for "{searchTerm}". Try another search term.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {columns.map((col, cIdx) => (
                    <td key={String(col.key) || cIdx} className={`py-3.5 px-4 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row, (currentPage - 1) * pageSize + rIdx)
                        : row[col.key as keyof T] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > pageSize && (
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-medium text-slate-700">
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-slate-700">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-medium text-slate-700">{sortedData.length}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
