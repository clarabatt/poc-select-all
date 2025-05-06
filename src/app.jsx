import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Panel } from "primereact/panel";
import { Checkbox } from "primereact/checkbox";
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
  const [total, setTotal] = useState(0);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actionLog, setActionLog] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 1,
    pageSize: 10,
  });

  const [globalSelect, setGlobalSelect] = useState(null);

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

  /* ---------- filter helpers ---------- */
  const snapshotFilters = () => ({ ...filters });

  const onFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const resetFilters = () =>
    setFilters({ status: null, color: null, assignee: null });

  /* ---------- page change ---------- */
  const onPage = (e) => setPageInfo({ page: e.page + 1, pageSize: e.rows });

  const onSelectionChange = (e) => {
    const pageIds = new Set(data.map((r) => r.id));
    const newCheckedIds = new Set(e.value.map((r) => r.id));

    if (globalSelect) {
      /* --- we are in virtual-all mode --- */
      const { deselected } = globalSelect;

      /* restore any ids that were re-checked */
      deselected.forEach((id) => {
        if (newCheckedIds.has(id)) deselected.delete(id);
      });
      /* record any newly unchecked rows */
      pageIds.forEach((id) => {
        if (!newCheckedIds.has(id)) deselected.add(id);
      });

      /* emit partial-remove / partial-add for replay */
      const adds = [...deselected].filter((id) => newCheckedIds.has(id));
      const removes = [...pageIds].filter((id) => !newCheckedIds.has(id));

      if (adds.length) pushAction({ action: "partial_add", ids: adds });
      if (removes.length)
        pushAction({ action: "partial_remove", ids: removes });

      /* local UI selection set is just ids checked *on this page* */
      setSelectedIds(newCheckedIds);
      setGlobalSelect({ ...globalSelect, deselected: new Set(deselected) });
    } else {
      const pageItemIds = new Set(data.map((r) => r.id));
      const newChecked = new Set(e.value.map((r) => r.id)); // ids now checked

      const adds = [];
      const removes = [];

      /* derive delta vs previous page state */
      pageItemIds.forEach((id) => {
        const wasChecked = selectedIds.has(id);
        const isChecked = newChecked.has(id);
        if (!wasChecked && isChecked) adds.push(id);
        if (wasChecked && !isChecked) removes.push(id);
      });

      /* update local canonical set */
      setSelectedIds((prev) => {
        const next = new Set(prev);
        adds.forEach((id) => next.add(id));
        removes.forEach((id) => next.delete(id));
        return next;
      });

      /* bulk header logic */
      if (adds.length === pageItemIds.size) {
        // user ticked header: select *all* rows that match filter snapshot
        pushAction({ action: "select_all", filters: snapshotFilters() });
      } else if (removes.length === pageItemIds.size) {
        // header untick = deselect all for this filter
        pushAction({ action: "deselect_all", filters: snapshotFilters() });
      } else {
        if (adds.length) pushAction({ action: "partial_add", ids: adds });
        if (removes.length)
          pushAction({ action: "partial_remove", ids: removes });
      }
    }
  };

  const currentPageSelection = React.useMemo(() => {
    if (globalSelect) {
      /* every row is selected except those explicitly removed */
      return data.filter((r) => !globalSelect.deselected.has(r.id));
    }
    /* otherwise: normal page selection */
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
    console.log("Reconstructed:", items);
  };

  const selectedCount = React.useMemo(() => {
    if (globalSelect) {
      /* virtual-all mode → every row minus those explicitly unticked */
      return total - globalSelect.deselected.size;
    }
    /* normal mode → just count the ids you’ve stored */
    return selectedIds.size;
  }, [globalSelect, total, selectedIds]);

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
        <Checkbox
          checked={!!globalSelect}
          onChange={() => {
            if (globalSelect) {
              /* user cleared the global select */
              pushAction({
                action: "deselect_all",
                filters: globalSelect.filters,
              });
              setGlobalSelect(null);
              setSelectedIds(new Set()); // wipe page-level set
            } else {
              /* user wants every row in the filter */
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
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>
          {JSON.stringify(actionLog.slice(-10), null, 2)}
        </pre>
        <Button label="POST to backend" onClick={reconstructSelection} />
      </Panel>
    </>
  );
}
