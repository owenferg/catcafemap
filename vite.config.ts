import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig({
  plugins: [cloudflare()],
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
});