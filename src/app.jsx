import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Panel } from "primereact/panel";
import { Checkbox } from "primereact/checkbox";
import { Tag } from "primereact/tag";
import "./app.css";

// Constants
const stateOptions = [
  { label: "All", value: "all" },
  { label: "new", value: "new" },
  { label: "old", value: "old" },
];
const colorOptions = [
  { label: "All", value: "all" },
  { label: "blue", value: "blue" },
  { label: "yellow", value: "yellow" },
  { label: "red", value: "red" },
  { label: "green", value: "green" },
  { label: "purple", value: "purple" },
];
const assigneeOptions = [
  { label: "All", value: "all" },
  { label: "John", value: "john" },
  { label: "Anna", value: "anna" },
  { label: "Doug", value: "doug" },
  { label: "Mary", value: "mary" },
];

const tagSeverity = (action) =>
  action === "select_all"
    ? "success"
    : action === "deselect_all"
    ? "danger"
    : action === "partial_add"
    ? "info"
    : "warning";

export default function App() {
  const [filters, setFilters] = useState({
    status: null,
    color: null,
    assignee: null,
  });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  // Single selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Global selection
  const [globalSelect, setGlobalSelect] = useState(null);

  const [actionLog, setActionLog] = useState([]);
  const [reconstructed, setReconstructed] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 1,
    pageSize: 10,
  });

  // - Load data ----------
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

  // - Helpers ----------
  const snapshotFilters = () => ({ ...filters });
  const onFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const resetFilters = () =>
    setFilters({ status: null, color: null, assignee: null });

  const onPage = (e) => setPageInfo({ page: e.page + 1, pageSize: e.rows });

  // - Selection ----------
  const onSelectionChange = (e) => {
    const pageIds = new Set(data.map((r) => r.id));
    const newCheckedIds = new Set(e.value.map((r) => r.id));

    if (globalSelect) {
      // Virtual ALL mode
      const { deselected } = globalSelect;
      deselected.forEach((id) => {
        if (newCheckedIds.has(id)) deselected.delete(id);
      });
      pageIds.forEach((id) => {
        if (!newCheckedIds.has(id)) deselected.add(id);
      });

      // Action logs
      const adds = [...deselected].filter((id) => newCheckedIds.has(id));
      const removes = [...pageIds].filter((id) => !newCheckedIds.has(id));
      if (adds.length) pushAction({ action: "partial_add", ids: adds });
      if (removes.length)
        pushAction({ action: "partial_remove", ids: removes });

      setSelectedIds(newCheckedIds);
      setGlobalSelect({ ...globalSelect, deselected: new Set(deselected) });
      return;
    }

    // Normal mode
    const adds = [];
    const removes = [];
    pageIds.forEach((id) => {
      const wasChecked = selectedIds.has(id);
      const isChecked = newCheckedIds.has(id);
      if (!wasChecked && isChecked) adds.push(id);
      if (wasChecked && !isChecked) removes.push(id);
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      adds.forEach((id) => next.add(id));
      removes.forEach((id) => next.delete(id));
      return next;
    });
    if (adds.length) pushAction({ action: "partial_add", ids: adds });
    if (removes.length) pushAction({ action: "partial_remove", ids: removes });
  };

  const currentPageSelection = React.useMemo(() => {
    if (globalSelect) {
      // every row is selected except those explicitly removed
      return data.filter((r) => !globalSelect.deselected.has(r.id));
    }
    return data.filter((r) => selectedIds.has(r.id));
  }, [data, globalSelect, selectedIds]);

  const pushAction = (act) => setActionLog((prev) => [...prev, act]);

  const reconstructSelection = async () => {
    const res = await fetch("/api/items/selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionLog),
    });
    const { items } = await res.json();
    setReconstructed(items);
  };

  const selectedCount = React.useMemo(() => {
    if (globalSelect) {
      // virtual-all mode → every row minus those explicitly unticked
      return total - globalSelect.deselected.size;
    }
    // normal mode → just count the ids you’ve stored
    return selectedIds.size;
  }, [globalSelect, total, selectedIds]);

  const globalCheckbox = React.useMemo(() => {
    if (globalSelect) {
      const isFullySelected = globalSelect.deselected.size === 0;
      return {
        checked: isFullySelected,
        disabled: !isFullySelected,
      };
    }
    return {
      checked: false,
      disabled: selectedIds.size > 0,
    };
  }, [globalSelect, selectedIds]);

  return (
    <>
      <div className="header">
        <div className="selection-info">
          <Button
            style={{ marginLeft: ".5rem" }}
            label={`${selectedCount} items selected`}
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
        {/* VIRTUAL ALL MODE CHECKBOX */}
        <Checkbox
          checked={globalCheckbox.checked}
          disabled={globalCheckbox.disabled}
          onChange={() => {
            // guard: ignore clicks when disabled (extra safety)
            if (globalCheckbox.disabled) return;

            if (globalSelect) {
              pushAction({
                action: "deselect_all",
                filters: globalSelect.filters,
              });
              setGlobalSelect(null);
              setSelectedIds(new Set());
            } else {
              const snap = snapshotFilters();
              pushAction({ action: "select_all", filters: snap });
              setGlobalSelect({ filters: snap, deselected: new Set() });
            }
          }}
        />
        <span style={{ marginLeft: 8 }}>
          Select all&nbsp;
          <strong>{total}</strong>&nbsp;items that match this filter
        </span>

        <DataTable
          value={data}
          paginator
          first={(pageInfo.page - 1) * pageInfo.pageSize}
          rows={pageInfo.pageSize}
          onPage={onPage}
          totalRecords={total}
          selectionMode="multiple"
          dataKey="id"
          selection={currentPageSelection}
          onSelectionChange={onSelectionChange}
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

      <Panel header={`Action log (${actionLog.length})`} toggleable>
        <div className="p-fluid">
          {actionLog.slice(-10).map((act, idx) => (
            <div
              key={idx}
              className="p-d-flex p-ai-center p-mb-2"
              style={{ gap: ".5rem" }}
            >
              <Tag
                value={act.action.replace("_", " ")}
                severity={tagSeverity(act.action)}
              />
              <span style={{ fontFamily: "monospace", fontSize: ".75rem" }}>
                {act.action === "select_all" || act.action === "deselect_all"
                  ? Object.entries(act.filters)
                      .filter(([, v]) => v != null)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(", ") || "all"
                  : act.ids.join(", ")}
              </span>
            </div>
          ))}
        </div>

        <Button label="Send to backend" onClick={reconstructSelection} />
      </Panel>

      <Panel
        header={`Reconstructed selection (${reconstructed.length})`}
        toggleable
      >
        {reconstructed.length === 0 ? (
          <small>No data yet – click “Send to backend”.</small>
        ) : (
          <div style={{ paddingLeft: "1rem" }}>
            {reconstructed.map((it) => (
              <p key={it.id} style={{ margin: 0 }}>
                <strong>{it.name}</strong> — {it.status}, {it.color},{" "}
                {it.assignee}
              </p>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
