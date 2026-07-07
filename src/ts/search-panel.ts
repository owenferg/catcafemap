type SearchPanelOptions = {
  input: HTMLInputElement | null;
  onQueryChange: (hasQuery: boolean) => void;
  onFocusWithQuery: () => void;
};

export function setupSearchPanel({
  input,
  onQueryChange,
  onFocusWithQuery,
}: SearchPanelOptions): void {
  const updateSearch = () => onQueryChange(Boolean(input?.value.trim()));

  input?.addEventListener("input", updateSearch);
  input?.addEventListener("search", updateSearch);
  input?.form?.addEventListener("submit", (event) => event.preventDefault());
  input?.addEventListener("focus", () => {
    if (input.value.trim()) {
      onFocusWithQuery();
    }
  });
}
