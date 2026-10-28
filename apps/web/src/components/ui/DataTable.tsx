import React from 'react';

export interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  mobileRender: (item: T) => React.ReactNode;
  rowKey: (item: T) => string | number;
}

export function DataTable<T>({ columns, data, mobileRender, rowKey }: DataTableProps<T>) {
  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto w-full bg-surface border border-outline-variant rounded-xl shadow-xl shadow-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              {columns.map((col, idx) => (
                <th scope="col"
                  key={idx}
                  className={`p-sm px-md font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-body-sm">
            {data.map((item) => (
              <tr
                key={rowKey(item)}
                className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors duration-150 group h-10"
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`p-sm px-md text-on-surface vertical-middle ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="flex flex-col gap-md md:hidden">
        {data.map((item) => (
          <div
            key={rowKey(item)}
            className="p-md bg-surface border border-outline-variant rounded-xl flex flex-col gap-sm shadow-lg shadow-black/20"
          >
            {mobileRender(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DataTable;
