import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import "./app.css";

const stateOptions = [
  { label: "new", value: "new" },
  { label: "old", value: "old" },
];
const colorOptions = [
  { label: "blue", value: "blue" },
  { label: "yellow", value: "yellow" },
  { label: "red", value: "red" },
  { label: "green", value: "green" },
  { label: "purple", value: "purple" },
];
const assigneeOptions = [
  { label: "John", value: "john" },
  { label: "Anna", value: "anna" },
  { label: "Doug", value: "doug" },
  { label: "Mary", value: "mary" },
];

const filterData = (data, filters) => {
  return data.filter((item) => {
    return Object.entries(filters).every(([field, val]) => {
      if (val == null || val === "") return true;
      return item[field] === val;
    });
  });
};

export default function App() {
  const [filters, setFilters] = useState({
    status: null,
    color: null,
    assignee: null,
  });
  const [data, setData] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [pagination, setPagination] = useState({ first: 0, rows: 10 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/mock-data.json");
        const allData = await res.json();
        const filtered = filterData(allData, filters);
        setData(filtered);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    fetchData();
  }, [filters]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: null, color: null, assignee: null });
  };

  const onSelectionChange = (e) => {
    setSelectedItems(e.value);
  };

  const onPage = (event) => {
    setPagination({ first: event.first, rows: event.rows });
  };

  return (
    <>
      <div className="header">
        <div className="selection-info">
          <Button
            label={`${selectedItems.length ?? 0} selected`}
            severity="secondary"
            rounded
          />
        </div>
        <div className="filters">
          <Dropdown
            name="status"
            value={filters.status}
            options={stateOptions}
            onChange={onFilterChange}
            placeholder="Select status"
          />
          <Dropdown
            name="color"
            value={filters.color}
            options={colorOptions}
            onChange={onFilterChange}
            placeholder="Select color"
          />
          <Dropdown
            name="assignee"
            value={filters.assignee}
            options={assigneeOptions}
            onChange={onFilterChange}
            placeholder="Select Responsible"
          />
          <Button
            label="Reset Filters"
            onClick={resetFilters}
            severity="secondary"
          />
        </div>
      </div>
      <div className="data-table">
        <DataTable
          value={data}
          paginator
          first={pagination.first}
          rows={pagination.rows}
          onPage={onPage}
          totalRecords={data.length}
          onPageChange={(e) => onPage(e, 1)}
          selectionMode="multiple"
          selection={selectedItems}
          onSelectionChange={onSelectionChange}
          dataKey="name"
        >
          <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
          <Column field="name" header="Name" />
          <Column field="description" header="Description" />
          <Column field="status" header="Status" />
          <Column field="color" header="Color" />
          <Column field="assignee" header="Assignee" />
        </DataTable>
      </div>
    </>
  );
}
