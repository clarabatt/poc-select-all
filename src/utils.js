// Constants
export const stateOptions = [
  { label: "new", value: "new" },
  { label: "old", value: "old" },
];
export const colorOptions = [
  { label: "blue", value: "blue" },
  { label: "yellow", value: "yellow" },
  { label: "red", value: "red" },
  { label: "green", value: "green" },
  { label: "purple", value: "purple" },
];
export const assigneeOptions = [
  { label: "John", value: "john" },
  { label: "Anna", value: "anna" },
  { label: "Doug", value: "doug" },
  { label: "Mary", value: "mary" },
];

export const defaultFilters =
{
  status: [],
  color: [],
  assignee: [],
};

export const tagSeverity = (action) =>
  action === "select_all"
    ? "success"
    : action === "deselect_all"
      ? "danger"
      : action === "partial_add"
        ? "info"
        : "warning";

