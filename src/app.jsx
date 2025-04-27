import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Panel } from "primereact/panel";
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

export default function App() {
  const [filters, setFilters] = useState({
    status: null,
    color: null,
    assignee: null,
  });
  const [data, setData] = useState([]);
  const [actions, setActions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 1,
    pageSize: 10,
  });

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.color) params.append("color", filters.color);
    if (filters.assignee) params.append("assignee", filters.assignee);
    params.append("page", pageInfo.page);
    params.append("pageSize", pageInfo.pageSize);

    try {
      const res = await fetch(`/api/items?${params.toString()}`);
      if (!res.ok) {
        console.error("Server error:", res.status, res.statusText);
        return;
      }
      const { items, totalRecords } = await res.json();
      setData(items);
      setTotal(totalRecords);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    load();
  }, [filters, pageInfo]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const resetFilters = () => {
    setFilters({ status: null, color: null, assignee: null });
  };
  const onPage = (e) => setPageInfo({ page: e.page + 1, pageSize: e.rows });

  const onSelectionChange = (e) => {
    let action = "partial";
    if (e.value.length == pageInfo.pageSize) {
      action = "select_all";
    } else if (e.value.length == 0) {
      action = "deselect_all";
    }

    setSelectedItems(e.value);
    setActions((prev) => {
      const newActions = [...prev];
      if (action === "partial") {
        newActions.push({ filters, action, items: e.value });
      } else {
        newActions.push({ filters, action });
      }
      return newActions;
    });
  };

  const reconstructSelection = async () => {
    try {
      const res = await fetch("/api/items/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actions),
      });
      console.log("Actions sent:", actions);
      if (!res.ok) {
        console.error("Server error:", res.status, res.statusText);
        return;
      }
      const { items } = await res.json();
      console.log("Reconstructed items:", items);
      setActionItems(items);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  return (
    <>
      <div className="header">
        <div className="selection-info">
          <Button
            style={{ marginLeft: ".5rem" }}
            label={`${total} items total`}
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
          first={(pageInfo.page - 1) * pageInfo.pageSize}
          rows={pageInfo.pageSize}
          onPage={onPage}
          totalRecords={total}
          selectionMode="multiple"
          selection={selectedItems}
          onSelectionChange={onSelectionChange}
          dataKey="name"
          lazy
        >
          <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
          <Column field="name" header="Name" />
          <Column field="description" header="Description" />
          <Column field="status" header="Status" />
          <Column field="color" header="Color" />
          <Column field="assignee" header="Assignee" />
        </DataTable>
      </div>
      <Panel header={`${selectedItems.length ?? 0} selected`} toggleable>
        <div className="selected-info">
          {selectedItems.map((item) => (
            <p key={item.name}>{item.name}</p>
          ))}
        </div>
      </Panel>

      <Panel header="Actions" toggleable>
        <Button
          label="Reconstruct actions"
          onClick={reconstructSelection}
          severity="secondary"
          rounded
        />

        <div className="actions-info">
          {actions.map((action, index) => (
            <p key={index}>
              {action.action} - {action.items?.length ?? 0} items
            </p>
          ))}
        </div>

        <div className="selected-info">
          {actionItems.map((item) => (
            <p key={item.name}>{item.name}</p>
          ))}
        </div>
      </Panel>
    </>
  );
}
