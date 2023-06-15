import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table as TANTable,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Atom } from 'lucide-react';
import { ChangeEvent } from 'react';
import * as React from 'react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { SkeletonPanel, SkeletonTable } from '@/components/ui/Skeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import emitter, { EVENT_OPEN_PLAN_PICKER_DIALOG } from '@/lib/events';

interface QueriesDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  showUpgradeMessage?: boolean;
}

function DataTable<TData, TValue>({
  table,
  columns,
  bodyOnly,
}: {
  table: TANTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  bodyOnly?: boolean;
}) {
  return (
    <Table>
      <colgroup>
        <col className="w-[calc(50%-220px)]" />
        <col className="w-[150px]" />
        <col className="w-[190px]" />
      </colgroup>
      {!bodyOnly && (
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
      )}
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export function QueriesDataTable<TData, TValue>({
  columns,
  data,
  loading,
  showUpgradeMessage,
}: QueriesDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <div className="relative">
          <Input
            inputSize="sm"
            placeholder="Search questions..."
            value={
              (table.getColumn('prompt')?.getFilterValue() as string) ?? ''
            }
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              table.getColumn('prompt')?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
          <SkeletonPanel loading={loading} />
        </div>
        {/* <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="plain" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenu.CheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenu.CheckboxItem>
                );
              })}
          </DropdownMenu.Content>
        </DropdownMenu.Root> */}
      </div>
      <div className="relative flex min-h-[320px] flex-col rounded-md">
        <SkeletonTable loading={loading} />
        <DataTable table={table} columns={columns} />
        {showUpgradeMessage && !loading && (
          <div className="relative mt-2 flex flex-col">
            <div className="z-10 flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-900 bg-neutral-1100/10 p-12 backdrop-blur-md">
              <Atom className="h-6 w-6 text-white" />
              <h2 className="font-bold text-neutral-100">Enable Insights</h2>
              <p className="mb-4 max-w-lg text-center text-sm text-neutral-300">
                Get insight into the questions your users are asking, which ones
                went unanswered, what content is most cited, and other metrics
                to better understand how your prompt performs and improve your
                content.
              </p>
              <Button
                buttonSize="sm"
                variant="glow"
                light
                onClick={() => {
                  emitter.emit(EVENT_OPEN_PLAN_PICKER_DIALOG);
                }}
              >
                Upgrade to Pro
              </Button>
            </div>
            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col overflow-hidden border-neutral-900 bg-neutral-1100/10 backdrop-blur-md">
              <div className="absolute inset-x-0 bottom-0 top-10 z-10 bg-neutral-1100/5 bg-gradient-to-t from-neutral-1100 to-neutral-1100/0 backdrop-blur-md" />
              <div className="z-0 py-2">
                <DataTable table={table} columns={columns} bodyOnly />
                <DataTable table={table} columns={columns} bodyOnly />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="py-4">
        <div className="relative flex items-center justify-end space-x-2">
          <SkeletonPanel loading={loading} />
          {/* <div className="flex-1 text-sm text-neutral-500">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected. Insights
            are generated once a day. Sensitive information is redacted.
          </div> */}
          <div className="flex-1 text-xs text-neutral-500">
            Insights are generated every hour. Sensitive information is
            redacted.
          </div>
          {/* <div className="flex flex-row gap-2">
            <Button
              variant="plain"
              buttonSize="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="plain"
              buttonSize="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
