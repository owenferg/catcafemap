import { formatCafePrice } from "./price";
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
  onDeselect: () => void;
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
  const imageUrl = cafeImageUrl(feature);
  if (imageUrl) {
    element.classList.add("has-image");
    element.style.backgroundImage = cssUrl(imageUrl);
  } else {
    element.textContent = cafeInitials(feature);
  }
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

function shareIcon(): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "share-icon");
  icon.setAttribute("viewBox", "0 0 448 512");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M352 224c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145.4 170.2 121.9 160 96 160c-53 0-96 43-96 96s43 96 96 96c25.9 0 49.4-10.2 66.6-26.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-25.9 0-49.4 10.2-66.6 26.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C302.6 213.8 326.1 224 352 224z",
  );
  path.setAttribute("fill", "currentColor");
  icon.append(path);
  return icon;
}

function closeIcon(): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "close-icon");
  icon.setAttribute("viewBox", "0 0 384 512");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z",
  );
  path.setAttribute("fill", "currentColor");
  icon.append(path);
  return icon;
}

function appendPrice(titleRow: HTMLElement, feature: CatCafeFeature): void {
  const priceText = formatCafePrice(feature);
  if (!priceText) {
    return;
  }

  const price = document.createElement("span");
  price.className = "price";
  if (/^temporarily closed$/i.test(feature.properties.price_text?.trim() ?? "")) {
    price.classList.add("temporarily-closed");
  }
  price.textContent = priceText;
  titleRow.append(price);
}

function mapLink(label: string, url: string | undefined): HTMLAnchorElement | HTMLButtonElement {
  if (!url) {
    const button = document.createElement("button");
    button.className = "secondary-button";
    button.type = "button";
    button.disabled = true;
    button.textContent = label;
    return button;
  }

  const link = document.createElement("a");
  link.className = "secondary-button";
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  link.append(externalLinkIcon());
  return link;
}

function cafeShareUrl(feature: CatCafeFeature): string {
  const url = new URL(window.location.href);
  url.searchParams.set("cafe", cafeKey(feature));
  return url.toString();
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for local/http contexts where Clipboard API is present but blocked.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function canUseNativeShare(): boolean {
  return window.matchMedia("(pointer: coarse)").matches && Boolean(navigator.share);
}

export function createSidePanel(options: SidePanelOptions): SidePanel {
  const { searchInput, resultsPanel, cafeInfoPanel, panelStatus, onSelect, onDeselect } = options;
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

      titleRow.append(name);
      appendPrice(titleRow, feature);

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

    title.append(name);
    appendPrice(title, selectedCafe);

    const location = document.createElement("p");
    location.className = "muted";
    location.textContent = locationText(selectedCafe) || "Location unavailable";

    const address = document.createElement("p");
    address.textContent = addressText(selectedCafe) || "Address unavailable";

    const hero = document.createElement("div");
    hero.className = "cafe-info-hero";
    hero.dataset.initials = cafeInitials(selectedCafe);

    const closeButton = document.createElement("button");
    closeButton.className = "cafe-info-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close cafe details");
    closeButton.append(closeIcon());
    closeButton.addEventListener("click", closeCafeInfo);

    const imageUrl = cafeImageUrl(selectedCafe);
    if (imageUrl) {
      hero.classList.add("has-image");
      hero.style.setProperty("--cafe-image", cssUrl(imageUrl));
    }

    hero.append(closeButton, title, location);
    cafeInfoPanel.append(hero, address);

    const actions = document.createElement("div");
    actions.className = "panel-actions";

    if (props.website) {
      const website = document.createElement("a");
      website.className = "secondary-button";
      website.href = props.website;
      website.target = "_blank";
      website.rel = "noreferrer";
      website.textContent = "Visit website";
      website.append(externalLinkIcon());
      actions.append(website);
    }

    const share = document.createElement("button");
    share.className = "secondary-button share-button";
    share.type = "button";
    share.textContent = "Share";
    share.append(shareIcon());
    share.addEventListener("click", async () => {
      if (!selectedCafe) {
        return;
      }

      const url = cafeShareUrl(selectedCafe);
      if (canUseNativeShare()) {
        await navigator.share({
          title: selectedCafe.properties.name || "Cat cafe",
          url,
        });
        return;
      }

      await copyText(url);
      share.dataset.copied = "true";
      window.setTimeout(() => delete share.dataset.copied, 1800);
    });

    actions.append(
      share,
      mapLink("View on Google Maps", props.google_maps_url),
      mapLink("View on Apple Maps", props.apple_maps_url),
    );
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

  function closeCafeInfo(): void {
    selectedCafe = undefined;
    onDeselect();
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
