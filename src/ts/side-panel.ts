import type { CatCafeFeature } from "./types";
import { cafeKey } from "./types";

type SidePanel = {
  renderCafeInfo: () => void;
  renderResults: () => void;
  selectCafe: (feature: CatCafeFeature, closeResults: boolean) => void;
  setCafes: (features: CatCafeFeature[]) => void;
  setResultsOpen: (open: boolean) => void;
};

type SidePanelOptions = {
  searchInput: HTMLInputElement | null;
  resultsPanel: HTMLDivElement | null;
  cafeInfoPanel: HTMLDivElement | null;
  panelStatus: HTMLDivElement | null;
  onSelect: (feature: CatCafeFeature) => void;
};

function setText(element: HTMLElement, value: string): void {
  element.textContent = value;
}

function locationText(feature: CatCafeFeature): string {
  const props = feature.properties;
  return [props.city, props.region].filter(Boolean).join(", ");
}

function addressText(feature: CatCafeFeature): string {
  const props = feature.properties;
  return [props.address, props.city, props.region, props.country]
    .filter(Boolean)
    .join(", ");
}

function searchText(feature: CatCafeFeature): string {
  const props = feature.properties;
  return [props.name, props.city, props.region, props.country, props.address]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function cafeInitials(feature: CatCafeFeature): string {
  const name = feature.properties.name || "Cat Cafe";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase())
    .join("");
}

function cafeImageUrl(feature: CatCafeFeature): string | undefined {
  const imageUrl = feature.properties.image_url?.trim();
  return imageUrl || undefined;
}

function cssUrl(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\n\r\f]/g, "");
  return `url("${escaped}")`;
}

function thumb(feature: CatCafeFeature): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "cafe-thumb";
  element.setAttribute("aria-hidden", "true");
  element.textContent = cafeInitials(feature);
  return element;
}

function externalLinkIcon(): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "external-link-icon");
  icon.setAttribute("viewBox", "0 0 512 512");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32h82.7L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3V192c0 17.7 14.3 32 32 32s32-14.3 32-32V32c0-17.7-14.3-32-32-32H320zM80 32C35.8 32 0 67.8 0 112V432c0 44.2 35.8 80 80 80H400c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32V432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16H192c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z",
  );
  path.setAttribute("fill", "currentColor");
  icon.append(path);
  return icon;
}

function placeholderButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "secondary-button";
  button.type = "button";
  button.disabled = true;
  button.textContent = label;
  return button;
}

export function createSidePanel(options: SidePanelOptions): SidePanel {
  const { searchInput, resultsPanel, cafeInfoPanel, panelStatus, onSelect } = options;
  let cafes: CatCafeFeature[] = [];
  let selectedCafe: CatCafeFeature | undefined;
  let resultsOpen = false;

  function renderResults(): void {
    if (!resultsPanel) {
      return;
    }

    const query = searchInput?.value.trim().toLocaleLowerCase() || "";
    resultsPanel.replaceChildren();
    resultsPanel.hidden = !resultsOpen || !query;

    if (!query) {
      if (panelStatus) {
        panelStatus.textContent = "";
      }
      return;
    }

    const matches = cafes.filter((feature) => searchText(feature).includes(query));
    if (panelStatus) {
      panelStatus.textContent =
        matches.length === 0
          ? "No cat cafes found"
          : `${matches.length} cat cafe${matches.length === 1 ? "" : "s"} found`;
    }

    if (matches.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No cat cafes found.";
      resultsPanel.append(empty);
      return;
    }

    for (const feature of matches) {
      const button = document.createElement("button");
      button.className = "result-card";
      button.type = "button";
      if (selectedCafe && cafeKey(selectedCafe) === cafeKey(feature)) {
        button.classList.add("selected");
      }
      button.append(thumb(feature));

      const body = document.createElement("span");
      body.className = "result-card-body";

      const titleRow = document.createElement("span");
      titleRow.className = "cafe-title";

      const name = document.createElement("strong");
      setText(name, feature.properties.name || "Unnamed cat cafe");

      const price = document.createElement("span");
      price.className = "price";
      price.textContent = "$$";

      titleRow.append(name, price);

      const location = document.createElement("span");
      location.className = "muted";
      setText(location, locationText(feature) || "Location unavailable");

      body.append(titleRow, location);
      button.append(body);
      button.addEventListener("click", () => selectCafe(feature, true));
      resultsPanel.append(button);
    }
  }

  function renderCafeInfo(): void {
    if (!cafeInfoPanel) {
      return;
    }

    cafeInfoPanel.replaceChildren();
    cafeInfoPanel.hidden = !selectedCafe;

    if (!selectedCafe) {
      return;
    }

    const props = selectedCafe.properties;

    const title = document.createElement("h2");
    title.className = "cafe-title";

    const name = document.createElement("span");
    name.className = "cafe-name";
    name.textContent = props.name || "Unnamed cat cafe";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = "$$";

    title.append(name, price);

    const location = document.createElement("p");
    location.className = "muted";
    location.textContent = locationText(selectedCafe) || "Location unavailable";

    const address = document.createElement("p");
    address.textContent = addressText(selectedCafe) || "Address unavailable";

    const hero = document.createElement("div");
    hero.className = "cafe-info-hero";
    hero.dataset.initials = cafeInitials(selectedCafe);

    const imageUrl = cafeImageUrl(selectedCafe);
    if (imageUrl) {
      hero.classList.add("has-image");
      hero.style.setProperty("--cafe-image", cssUrl(imageUrl));
    }

    hero.append(title, location);
    cafeInfoPanel.append(hero, address);

    if (props.website) {
      const website = document.createElement("a");
      website.className = "website-link";
      website.href = props.website;
      website.target = "_blank";
      website.rel = "noreferrer";
      website.textContent = "Visit website";
      website.append(externalLinkIcon());
      cafeInfoPanel.append(website);
    }

    const actions = document.createElement("div");
    actions.className = "panel-actions";
    actions.append(placeholderButton("View on Google Maps"), placeholderButton("View on Apple Maps"));
    cafeInfoPanel.append(actions);
  }

  function selectCafe(feature: CatCafeFeature, closeResults: boolean): void {
    selectedCafe = feature;
    if (closeResults) {
      resultsOpen = false;
    }
    onSelect(feature);
    renderCafeInfo();
    renderResults();
  }

  return {
    renderCafeInfo,
    renderResults,
    selectCafe,
    setCafes(features: CatCafeFeature[]) {
      cafes = features;
    },
    setResultsOpen(open: boolean) {
      resultsOpen = open;
    },
  };
}
