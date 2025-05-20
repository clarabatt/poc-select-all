import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import { Panel } from "primereact/panel";
import { Checkbox } from "primereact/checkbox";
import { Tag } from "primereact/tag";
import {
  colorOptions,
  stateOptions,
  assigneeOptions,
  defaultFilters,
  tagSeverity,
} from "./utils.js";
import "./app.css";

export default function App() {
  // Default state
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageInfo, setPageInfo] = useState({
    page: 1,
    pageSize: 10,
  });

  // Common Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Virtual selection
  const [globalSelect, setGlobalSelect] = useState(null);

  // Action log
  const [actionLog, setActionLog] = useState([]);
  const [reconstructed, setReconstructed] = useState([]);

  // - Load data ----------
  const load = async () => {
    const params = new URLSearchParams();
    (filters.status ?? []).forEach((v) => params.append("status", v));
    (filters.color ?? []).forEach((v) => params.append("color", v));
    (filters.assignee ?? []).forEach((v) => params.append("assignee", v));
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

  const reconstructSelection = async () => {
    const res = await fetch("/api/items/selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionLog),
    });
    const { items } = await res.json();
    setReconstructed(items);
  };

  async function fetchAllMatchingIds(filtersSnapshot, totalCount) {
    const params = new URLSearchParams();

    Object.entries(filtersSnapshot).forEach(([key, vals]) => {
      const arr = Array.isArray(vals) ? vals : [vals];
      arr.forEach((v) => {
        if (v != null && v !== "") {
          params.append(key, v);
        }
      });
    });

    params.append("page", 1);
    params.append("pageSize", totalCount);

    const res = await fetch(`/api/items?${params.toString()}`);
    if (!res.ok) {
      console.error("fetchAllMatchingIds error:", res.status, res.statusText);
      return [];
    }
    const { items } = await res.json();
    return items.map((i) => i.id);
  }

  useEffect(() => {
    load();
  }, [filters, pageInfo]);

  useEffect(() => {
    if (globalSelect) {
      setGlobalSelect(null);
      setSelectedIds(new Set());
      setActionLog([]);
    }
  }, [filters]);

  // - Helpers ----------
  const snapshotFilters = () => ({ ...filters });
  const onFilterChange = (e) => {
    setFilters((prev) => {
      return {
        ...prev,
        [e.target.name]: e.value,
      };
    });
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
    setGlobalSelect(null);
  };

  const onPage = (e) => setPageInfo({ page: e.page + 1, pageSize: e.rows });

  // - Selection ----------
  const onSelectionChange = (e) => {
    const pageIds = new Set(data.map((r) => r.id));
    const newCheckedIds = new Set(e.value.map((r) => r.id));

    if (globalSelect) {
      // Virtual ALL mode
      const { deselected } = globalSelect;
      const addedBack = [];

      deselected.forEach((id) => {
        if (newCheckedIds.has(id)) {
          addedBack.push(id);
          deselected.delete(id);
        }
      });

      const removedFromPage = [...pageIds].filter(
        (id) => !newCheckedIds.has(id)
      );
      removedFromPage.forEach((id) => deselected.add(id));

      // Log actions
      if (addedBack.length)
        pushAction({ action: "partial_add", ids: addedBack });
      if (removedFromPage.length)
        pushAction({ action: "partial_remove", ids: removedFromPage });

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

  function noFiltersActive(filtersSnapshot) {
    return Object.values(filtersSnapshot).every(
      (vals) => Array.isArray(vals) && vals.length === 0
    );
  }

  const onGlobalSelect = async () => {
    if (globalSelect) {
      pushAction({ action: "deselect_all", filters: globalSelect.filters });
      setGlobalSelect(null);
      setSelectedIds(new Set());
      setActionLog([]);
      return;
    }

    const snap = snapshotFilters();

    // If no filters are active, use virtual all mode
    if (noFiltersActive(snap)) {
      setActionLog([]);
      setSelectedIds(new Set());
      pushAction({
        action: "select_all",
        filters: snap,
      });
      setGlobalSelect({
        filters: snap,
        deselected: new Set(),
      });
      return;
    }

    // If filters are active, use virtual partial mode
    const allIds = await fetchAllMatchingIds(snap, total);
    setSelectedIds(new Set(allIds));
    setActionLog([]);
    pushAction({
      action: "partial_add",
      ids: allIds,
      filters: snap,
    });

    // setGlobalSelect(null); // drop virtual mode
  };

  const pushAction = (action) => {
    const filters = snapshotFilters();
    console.log("Filters:", filters);

    const actionWithFilters = {
      ...action,
      filters: filters,
    };

    setActionLog((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.action === action.action) {
        if (
          action.action === "partial_add" ||
          action.action === "partial_remove"
        ) {
          const mergedIds = Array.from(new Set([...last.ids, ...action.ids]));
          return [
            ...prev.slice(0, -1),
            { ...actionWithFilters, ids: mergedIds },
          ];
        }
        if (
          action.action === "select_all" ||
          action.action === "deselect_all"
        ) {
          return [...prev.slice(0, -1), actionWithFilters];
        }
      }
      return [...prev, actionWithFilters];
    });
  };

  const currentPageSelection = React.useMemo(() => {
    if (globalSelect) {
      // every row is selected except those explicitly removed
      return data.filter((r) => !globalSelect.deselected.has(r.id));
    }
    return data.filter((r) => selectedIds.has(r.id));
  }, [data, globalSelect, selectedIds]);

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
        // disabled: !isFullySelected,
      };
    }
    return {
      checked: false,
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
          <MultiSelect
            name="status"
            value={filters.status}
            options={stateOptions}
            onChange={onFilterChange}
            placeholder="Select status"
            display="chip"
          />
          <MultiSelect
            name="color"
            value={filters.color}
            options={colorOptions}
            onChange={onFilterChange}
            placeholder="Select color"
            display="chip"
          />
          <MultiSelect
            name="assignee"
            value={filters.assignee}
            options={assigneeOptions}
            onChange={onFilterChange}
            placeholder="Select Responsible"
            display="chip"
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
          onChange={onGlobalSelect}
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
