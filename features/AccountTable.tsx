"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  RowSelectionState,
} from "@tanstack/react-table";
import { AccountWithStatus, Account } from "@/types";
import { Copy, Trash2, CopyPlus, Columns, LayoutList, Pencil, CheckSquare, Square, ExternalLink, Sparkles, Maximize2, Minimize2, Download } from "lucide-react";
import { formatCountdown, formatReadyAt } from "@/utils/date";

interface AccountTableProps {
  data: AccountWithStatus[];
  onUpdate: (id: string, updatedFields: Partial<Account>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCopyEmail: (email: string) => void;
  onEditAccount: (account: AccountWithStatus) => void;
  onOpenFullscreen?: (account: AccountWithStatus) => void;
  isWorkspaceFullscreen?: boolean;
  onToggleWorkspaceFullscreen?: () => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchUpdateTier?: (ids: string[], isPremium: boolean) => void;
  onBatchUpdateResetType?: (ids: string[], limitResetType: "Daily" | "Weekly") => void;
  onBatchExport?: (selectedAccounts: Account[]) => void;
  globalFilter: string;
}

export function AccountTable({
  data,
  onUpdate,
  onDelete,
  onDuplicate,
  onCopyEmail,
  onEditAccount,
  onOpenFullscreen,
  isWorkspaceFullscreen,
  onToggleWorkspaceFullscreen,
  onBatchDelete,
  onBatchUpdateTier,
  onBatchUpdateResetType,
  onBatchExport,
  globalFilter,
}: AccountTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Account } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [windowWidth, setWindowWidth] = useState(1024);
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleEdit = (id: string, field: keyof Account, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingCell) {
      let parsedValue: any = editValue;
      if (editingCell.field === "weeklyLimit") {
        parsedValue = isNaN(parseInt(editValue, 10)) ? 0 : parseInt(editValue, 10);
      } else if (editingCell.field === "dailyLimit") {
        if (editValue.toLowerCase() === "no limit" || editValue.toLowerCase() === "nolimit") {
          parsedValue = "No Limit";
        } else if (editValue === "100%" || editValue === "100") {
          parsedValue = "100%";
        } else {
          parsedValue = isNaN(parseInt(editValue, 10)) ? 0 : parseInt(editValue, 10);
        }
      } else if (editingCell.field === "isPremium") {
        parsedValue = editValue === "true";
      }
      onUpdate(editingCell.id, { [editingCell.field]: parsedValue });
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const paddingClass = density === "compact" ? "py-2" : "py-3";

  // Helper to render editable text directly
  const renderCell = (row: any, field: keyof Account, value: string, type: string = "text", options: {label: string, value: string}[] = []) => {
    const isEditing = editingCell?.id === row.original.id && editingCell?.field === field;
    if (isEditing) {
      if (type === "select") {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="px-2 py-0.5 text-xs border border-primary rounded bg-surface-container-lowest outline-none shadow-sm font-medium"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
      return (
        <input
          autoFocus
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="px-2 py-0.5 text-xs border border-primary rounded bg-surface-container-lowest outline-none shadow-sm font-medium"
        />
      );
    }

    return (
      <span
        onDoubleClick={() => handleEdit(row.original.id, field, value)}
        className="cursor-pointer hover:bg-surface-container-low px-1.5 py-0.5 rounded truncate select-none transition-colors"
        title="Double click to quick edit"
      >
        {type === "select" ? options.find(o => o.value === value)?.label || value : value}
      </span>
    );
  };

  const columns = useMemo<ColumnDef<AccountWithStatus>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer w-4 h-4"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer w-4 h-4"
          />
        ),
      },
      {
        accessorKey: "email",
        header: "Account Details",
        cell: ({ row }) => {
          const acc = row.original;
          const resetType = acc.limitResetType || "Daily";
          const isEditingPremium = editingCell?.id === acc.id && editingCell?.field === "isPremium";
          const isEditingReset = editingCell?.id === acc.id && editingCell?.field === "limitResetType";

          return (
            <div className="flex flex-col gap-1 min-w-0 pr-2">
              {/* Line 1: Email */}
              <div className="font-semibold text-on-surface truncate text-sm flex items-center gap-1.5">
                {renderCell(row, "email", acc.email, "email")}
              </div>

              {/* Line 2: Tier & Limit Reset Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {isEditingPremium ? (
                  renderCell(row, "isPremium", acc.isPremium.toString(), "select", [{label: "Premium", value: "true"}, {label: "Standard", value: "false"}])
                ) : (
                  <span 
                    onDoubleClick={() => handleEdit(acc.id, "isPremium", acc.isPremium.toString())}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer select-none ${
                      acc.isPremium 
                        ? "bg-primary-fixed text-on-primary-fixed" 
                        : "bg-surface-variant text-on-surface-variant"
                    }`}
                    title="Double click to change tier"
                  >
                    {acc.isPremium ? "Premium" : "Standard"}
                  </span>
                )}

                {isEditingReset ? (
                  renderCell(row, "limitResetType", resetType, "select", [{label: "Daily", value: "Daily"}, {label: "Weekly", value: "Weekly"}])
                ) : (
                  <span 
                    onDoubleClick={() => handleEdit(acc.id, "limitResetType", resetType)}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer select-none ${
                      resetType === "Weekly" 
                        ? "bg-purple-100 text-purple-800 border border-purple-200" 
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                    title="Double click to change reset type"
                  >
                    {resetType} Reset
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "weeklyLimit",
        header: "Limits (W / D)",
        cell: ({ row }) => {
          const acc = row.original;
          const dailyDisplay = acc.dailyLimit === "No Limit" ? "No Limit" : acc.dailyLimit === "100%" ? "100%" : (acc.dailyLimit ?? 0).toString();
          const isEditingDaily = editingCell?.id === acc.id && editingCell?.field === "dailyLimit";

          return (
            <div className="flex flex-col gap-1 text-xs font-medium">
              {/* Line 1: Weekly Limit */}
              <div className="flex items-center gap-1">
                <span className="text-on-surface-variant text-[11px]">W:</span>
                <span className="font-semibold text-on-surface">
                  {renderCell(row, "weeklyLimit", (acc.weeklyLimit ?? 0).toString(), "number")}
                </span>
              </div>

              {/* Line 2: Daily Limit */}
              <div className="flex items-center gap-1">
                <span className="text-on-surface-variant text-[11px]">D:</span>
                {isEditingDaily ? (
                  renderCell(row, "dailyLimit", dailyDisplay, "text")
                ) : acc.dailyLimit === "100%" ? (
                  <span 
                    onDoubleClick={() => handleEdit(acc.id, "dailyLimit", "100%")}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer shadow-xs"
                    title="Daily reset completed - 100% limit restored!"
                  >
                    100% ⚡
                  </span>
                ) : acc.dailyLimit === "No Limit" ? (
                  <span 
                    onDoubleClick={() => handleEdit(acc.id, "dailyLimit", "No Limit")}
                    className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer"
                  >
                    No Limit
                  </span>
                ) : (
                  <span className="font-semibold text-on-surface">
                    {renderCell(row, "dailyLimit", dailyDisplay, "number")}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "checkingDate",
        header: "Checking & Duration",
        cell: ({ row }) => {
          const acc = row.original;
          return (
            <div className="flex flex-col gap-1 text-xs">
              {/* Line 1: Checking Date & Time */}
              <div className="font-medium text-on-surface">
                {acc.checkingDate} <span className="text-on-surface-variant text-[11px] font-normal">{acc.checkingTime}</span>
              </div>

              {/* Line 2: Reset Duration */}
              <div className="text-[11px] text-on-surface-variant font-medium">
                Duration: <span className="font-semibold text-on-surface">{renderCell(row, "resetDuration", acc.resetDuration, "text")}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "readyAtDate",
        header: "Ready At",
        cell: ({ row }) => {
          const formatted = formatReadyAt(row.original.readyAtDate);
          return (
            <div className="flex flex-col text-xs leading-snug">
              {/* Line 1: Date */}
              <span className="font-semibold text-on-surface">{formatted.date}</span>
              {/* Line 2: Time */}
              {formatted.time && <span className="text-on-surface-variant text-[11px]">{formatted.time}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "readyStatus",
        header: "Status",
        cell: ({ row }) => {
          const { readyStatus, timeRemaining, weeklyLimit, limitResetType, progressPercent } = row.original;
          const isReady = readyStatus === "Ready";
          const resetType = limitResetType || "Daily";
          const isLimitLow = resetType === "Daily" && (weeklyLimit ?? 0) < 20;

          return (
            <div className="flex flex-col items-start gap-1 min-w-0">
              {/* Line 1: Status Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isReady ? "bg-[#ccfbf1] text-[#0f766e]" : "bg-[#fef3c7] text-[#b45309]"
                  }`}
                >
                  {isReady ? "🟢 Ready" : "⏳ Waiting"}
                </span>

                {isLimitLow && (
                  <span 
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                    title="Daily limit reset: Weekly limit is under 20"
                  >
                    ⚠️ Limit Low
                  </span>
                )}
              </div>

              {/* Line 2: Live Real-Time Countdown Ticker & Mini Progress Bar */}
              {!isReady && timeRemaining && (
                <div className="w-full max-w-[140px] flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300">
                    {formatCountdown(timeRemaining)}
                  </span>
                  {progressPercent !== undefined && (
                    <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${progressPercent}%` }} 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {onOpenFullscreen && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenFullscreen(row.original); }}
                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors"
                title="Open Fullscreen Focus Inspector"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onCopyEmail(row.original.email); }}
              className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
              title="Copy Email & Open"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEditAccount(row.original); }}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
              title="Edit Account Details"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(row.original.id); }}
              className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
              title="Duplicate"
            >
              <CopyPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(row.original.id); }}
              className="p-1.5 text-error hover:bg-error-container rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [editingCell, editValue, density, onCopyEmail, onDuplicate, onDelete, onEditAccount, onOpenFullscreen]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      }
    }
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedIds = useMemo(() => selectedRows.map(r => r.original.id), [selectedRows]);

  const isMobile = windowWidth < 768; // Mobile view fallback

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="text-xs font-semibold text-on-surface-variant px-1 flex justify-between items-center">
          <span>{data.length} Accounts</span>
          {onToggleWorkspaceFullscreen && (
            <button
              onClick={onToggleWorkspaceFullscreen}
              className="text-primary font-bold flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md"
            >
              {isWorkspaceFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isWorkspaceFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
            </button>
          )}
        </div>
        {table.getRowModel().rows.map(row => {
          const acc = row.original;
          const isReady = acc.readyStatus === "Ready";
          const resetType = acc.limitResetType || "Daily";
          const isLimitLow = resetType === "Daily" && (acc.weeklyLimit ?? 0) < 20;
          const formatted = formatReadyAt(acc.readyAtDate);

          return (
            <div key={acc.id} className="bg-surface rounded-xl p-3.5 border border-outline-variant/50 soft-shadow flex flex-col gap-2.5">
              <div className="flex justify-between items-start border-b border-outline-variant/30 pb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="font-bold text-on-surface truncate text-xs sm:text-sm">{acc.email}</span>
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      acc.isPremium ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-variant text-on-surface-variant"
                    }`}>
                      {acc.isPremium ? "Premium" : "Standard"}
                    </span>
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      resetType === "Weekly" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {resetType} Reset
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isReady ? "bg-[#ccfbf1] text-[#0f766e]" : "bg-[#fef3c7] text-[#b45309]"
                      }`}
                    >
                      {isReady ? "🟢 Ready" : "⏳ Waiting"}
                    </span>
                    {isLimitLow && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        ⚠️ Limit Low
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0 bg-surface-container-low rounded-lg p-1">
                  {onOpenFullscreen && (
                    <button onClick={() => onOpenFullscreen(acc)} className="p-1 text-on-surface-variant hover:text-primary rounded" title="Fullscreen Inspector"><Maximize2 className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => onEditAccount(acc)} className="p-1 text-primary rounded" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onCopyEmail(acc.email)} className="p-1 text-outline rounded" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDuplicate(acc.id)} className="p-1 text-outline rounded" title="Duplicate"><CopyPlus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(acc.id)} className="p-1 text-error rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-on-surface-variant block text-[10px]">Limits (W/D)</span>
                  <span className="text-on-surface font-semibold">{acc.weeklyLimit ?? 0} / {acc.dailyLimit === "100%" ? "100% ⚡" : acc.dailyLimit}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block text-[10px]">Duration</span>
                  <span className="text-on-surface font-semibold">{acc.resetDuration}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block text-[10px]">Checking Date</span>
                  <span className="text-on-surface font-semibold">{acc.checkingDate} {acc.checkingTime}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block text-[10px]">Ready At</span>
                  <span className="text-on-surface font-semibold">{formatted.date} {formatted.time}</span>
                </div>
              </div>
            </div>
          )
        })}
        {table.getRowModel().rows.length === 0 && (
          <div className="py-8 text-center text-on-surface-variant text-sm font-medium">No accounts found.</div>
        )}
      </div>
    );
  }

  // DESKTOP / LAPTOP FLUID TABLE (ZERO HORIZONTAL SCROLLBAR)
  return (
    <div className="bg-surface rounded-xl border border-outline-variant/50 soft-shadow flex flex-col flex-1 min-h-[480px] w-full overflow-hidden relative">
      
      {/* Floating Bulk Operations Toolbar (Appears when rows selected) */}
      {selectedCount > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-on-surface text-surface px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 border border-outline-variant/30 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="bg-primary text-on-primary px-2 py-0.5 rounded-md text-[11px] font-bold">
            {selectedCount} Selected
          </span>
          
          <div className="w-px h-4 bg-surface-variant/40" />

          {/* Export Selected Accounts Button */}
          {onBatchExport && (
            <button
              onClick={() => {
                const selectedAccs = selectedRows.map(r => r.original);
                onBatchExport(selectedAccs);
                setRowSelection({});
              }}
              className="hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Export selected accounts to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Selected ({selectedCount})</span>
            </button>
          )}

          {onBatchUpdateTier && (
            <button
              onClick={() => {
                onBatchUpdateTier(selectedIds, true);
                setRowSelection({});
              }}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              Set Premium
            </button>
          )}

          {onBatchUpdateTier && (
            <button
              onClick={() => {
                onBatchUpdateTier(selectedIds, false);
                setRowSelection({});
              }}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              Set Standard
            </button>
          )}

          {onBatchUpdateResetType && (
            <button
              onClick={() => {
                onBatchUpdateResetType(selectedIds, "Daily");
                setRowSelection({});
              }}
              className="hover:text-primary transition-colors"
            >
              Set Daily Reset
            </button>
          )}

          {onBatchUpdateResetType && (
            <button
              onClick={() => {
                onBatchUpdateResetType(selectedIds, "Weekly");
                setRowSelection({});
              }}
              className="hover:text-primary transition-colors"
            >
              Set Weekly Reset
            </button>
          )}

          {onBatchDelete && (
            <button
              onClick={() => {
                onBatchDelete(selectedIds);
                setRowSelection({});
              }}
              className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedCount})
            </button>
          )}

          <button
            onClick={() => setRowSelection({})}
            className="text-outline hover:text-surface transition-colors ml-2 text-[11px]"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table Top Toolbar */}
      <div className="px-4 py-2.5 border-b border-surface-container-high bg-surface flex justify-between items-center z-30 sticky top-0 shrink-0">
        <span className="text-xs font-semibold text-on-surface-variant">{data.length} Accounts</span>
        <div className="flex items-center gap-2 relative">
          
          {/* Row Density Toggle Button */}
          <button 
            onClick={() => setDensity(d => d === "comfortable" ? "compact" : "comfortable")}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-md transition-colors"
            title="Toggle Row Density"
          >
            <LayoutList className="w-4 h-4" />
          </button>

          {/* Column Toggle Button */}
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-md transition-colors ${isSettingsOpen ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'}`}
            title="Toggle Columns"
          >
            <Columns className="w-4 h-4" />
          </button>

          {/* Go / Exit Fullscreen Button Right Beside Toggle Bar */}
          {onToggleWorkspaceFullscreen && (
            <button
              onClick={onToggleWorkspaceFullscreen}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isWorkspaceFullscreen 
                  ? "bg-primary text-on-primary shadow-sm" 
                  : "text-primary hover:bg-primary/10 border border-primary/20"
              }`}
              title={isWorkspaceFullscreen ? "Exit Fullscreen Workspace" : "Go Fullscreen Workspace"}
            >
              {isWorkspaceFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isWorkspaceFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</span>
            </button>
          )}
          
          {isSettingsOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-outline-variant rounded-xl shadow-lg p-2 z-50">
              <div className="text-xs font-semibold mb-2 px-2 text-on-surface-variant">Toggle Columns</div>
              {table.getAllLeafColumns().map(column => {
                if (column.id === 'actions' || column.id === 'email' || column.id === 'select') return null;
                return (
                  <label key={column.id} className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-surface-container-low rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="rounded text-primary focus:ring-primary/20 bg-surface-container-lowest border-outline-variant"
                    />
                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Table Container (Fluid w-full, ZERO horizontal scrollbar) */}
      <div className="overflow-y-auto flex-1 w-full custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs table-fixed">
          <thead className="sticky top-0 z-20 bg-surface-container-lowest shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-surface-container-high">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`py-3 px-3 font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider bg-surface-container-lowest ${
                      header.id === "select" ? "w-10" : ""
                    }`}
                  >
                    {header.id === "select" ? (
                      flexRender(header.column.columnDef.header, header.getContext())
                    ) : (
                      <div 
                        className="cursor-pointer hover:text-on-surface flex items-center gap-1 select-none font-bold truncate"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-[10px]">
                          {{
                            asc: " 🔼",
                            desc: " 🔽",
                          }[header.column.getIsSorted() as string] ?? null}
                        </span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-surface-container-high bg-surface">
            {table.getRowModel().rows.map((row, rowIndex) => {
              const isSelected = row.getIsSelected();
              const isEven = rowIndex % 2 === 0;
              const rowBgClass = isEven ? "bg-surface" : "bg-surface-bright";
              
              return (
                <tr 
                  key={row.id} 
                  onClick={() => setSelectedRowId(row.id)}
                  className={`group transition-colors cursor-default ${rowBgClass} hover:bg-surface-container-low ${isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={`${paddingClass} px-3 align-top`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-on-surface-variant font-medium text-sm">
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Table Pagination Footer */}
      <div className="px-4 py-3 border-t border-surface-container-high bg-surface-container-lowest flex items-center justify-between shrink-0 z-20 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant hidden sm:inline font-medium">Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="border-outline-variant rounded-md px-2 py-1 bg-surface outline-none focus:ring-2 focus:ring-primary/20 font-medium"
          >
            {[20, 50, 100, 500].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div className="flex gap-1">
            <button
              className="px-2.5 py-1 border border-outline-variant rounded-md disabled:opacity-50 hover:bg-surface-container-low transition-colors font-medium"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev
            </button>
            <button
              className="px-2.5 py-1 border border-outline-variant rounded-md disabled:opacity-50 hover:bg-surface-container-low transition-colors font-medium"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
