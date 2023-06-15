import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, MoreHorizontal } from 'lucide-react';

import Button from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tag } from '@/components/ui/Tag';
import { formatShortDateTime } from '@/lib/utils';
import { PromptQueryStat } from '@/types/types';

export const columns: ColumnDef<PromptQueryStat>[] = [
  // {
  //   id: 'select',
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={table.getIsAllPageRowsSelected()}
  //       indeterminate={table.getIsSomeRowsSelected()}
  //       onChange={table.getToggleAllRowsSelectedHandler()}
  //       aria-label="Select all"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onChange={row.getToggleSelectedHandler()}
  //       aria-label="Select row"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: 'prompt',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      return (
        <Button
          className="p-0 text-neutral-300"
          noStyle
          onClick={() => column.toggleSorting(sorted === 'asc')}
        >
          <div className="flex flex-row items-center gap-2">
            Question
            {sorted === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
          </div>
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="w-full overflow-hidden truncate text-neutral-300">
        {row.getValue('prompt')}
      </div>
    ),
  },
  {
    accessorKey: 'no_response',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      return (
        <Button
          className="p-0 text-neutral-300"
          noStyle
          onClick={() => column.toggleSorting(sorted === 'asc')}
        >
          <div className="flex flex-row items-center gap-2">
            Status
            {sorted === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
          </div>
        </Button>
      );
    },
    cell: ({ row }) => {
      const noResponse = !!row.getValue('no_response');
      if (!noResponse) {
        return <></>;
      }
      return (
        <div className="overflow-hidden">
          <Tag color="orange">No response</Tag>
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      const sorted = column.getIsSorted();
      return (
        <Button
          className="p-0 text-neutral-300"
          noStyle
          onClick={() => column.toggleSorting(sorted === 'asc')}
        >
          <div className="flex flex-row items-center gap-2">
            Date
            {sorted === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
          </div>
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = formatShortDateTime(parseISO(row.getValue('created_at')));
      return (
        <div className="overflow-hidden truncate whitespace-nowrap text-sm text-neutral-500">
          {date}
        </div>
      );
    },
  },
  // {
  //   id: 'actions',
  //   enableHiding: false,
  //   cell: ({ row }) => {
  //     const payment = row.original;

  //     return (
  //       <DropdownMenu.Root>
  //         <DropdownMenu.Trigger asChild>
  //           <Button noStyle className="flex items-center">
  //             <span className="sr-only">Open menu</span>
  //             <MoreHorizontal className="h-4 w-4 text-neutral-500" />
  //           </Button>
  //         </DropdownMenu.Trigger>
  //         <DropdownMenu.Content align="end">
  //           <DropdownMenu.Label>Actions</DropdownMenu.Label>
  //           <DropdownMenu.Item
  //             onClick={() => navigator.clipboard.writeText(payment.id)}
  //           >
  //             Copy payment ID
  //           </DropdownMenu.Item>
  //           <DropdownMenu.Separator />
  //           <DropdownMenu.Item>View customer</DropdownMenu.Item>
  //           <DropdownMenu.Item>View payment details</DropdownMenu.Item>
  //         </DropdownMenu.Content>
  //       </DropdownMenu.Root>
  //     );
  //   },
  // },
];
