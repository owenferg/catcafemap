import type { CatCafeFeature } from "./types";

type ParsedPrice = {
  prefix: string;
  amount: string;
  duration?: string;
};

function formatAmount(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value;
  }
  return Number.isInteger(number) ? String(number) : String(number);
}

function currencyPrefix(text: string, country?: string): string {
  if (/\bCAD\s?\$|\bC\$|\bCAD\b/i.test(text)) {
    return "CAD$";
  }
  return country === "CA" ? "CAD$" : "$";
}

function choosePriceSegment(priceText: string): string {
  const segments = priceText
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    return segments[0] ?? priceText;
  }

  const adult = segments.find((segment) => /adult/i.test(segment) && !/child/i.test(segment));
  if (adult) {
    return adult;
  }

  const primary = segments.find((segment) => !/child|senior|student|weekend/i.test(segment));
  return primary ?? segments[0];
}

function parseDuration(text: string): string | undefined {
  const hourMinuteMatch = text.match(/(\d+)\s*(?:hour|hr|hrs)\s*(\d+)\s*(?:min(?:ute)?s?)\b/i);
  if (hourMinuteMatch) {
    return `${hourMinuteMatch[1]}hr ${hourMinuteMatch[2]}min`;
  }

  const minuteMatch = text.match(/(\d+)\s*(?:min(?:ute)?s?)\b/i);
  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    if (minutes === 60) {
      return "hr";
    }
    return `${minutes}min`;
  }

  if (/\b(?:per\s+)?(?:hour|hr|hrs)\b|\/(?:hour|hr)\b|\d+\s*(?:hour|hr|hrs)\b/i.test(text)) {
    return "hr";
  }

  return undefined;
}

function parsePriceSegment(segment: string, country?: string): ParsedPrice | undefined {
  const text = segment.trim();
  const prefix = currencyPrefix(text, country);

  const amountMatch =
    text.match(/(?:CAD\s?\$|C\$|\$)\s*(\d+(?:\.\d{2})?)(?:\s*[-–—]\s*(?:CAD\s?\$|C\$|\$)?\s*(\d+(?:\.\d{2})?))?/i) ??
    text.match(/(?:admission|ticket|fee|price|visit)[^$\d]{0,20}(\d+(?:\.\d{2})?)/i) ??
    text.match(/\b(\d+(?:\.\d{2})?)\s*(?:dollars?|cad)\b/i);

  if (!amountMatch) {
    return undefined;
  }

  const lowAmount = formatAmount(amountMatch[1]);
  const highAmount = amountMatch[2] ? formatAmount(amountMatch[2]) : undefined;
  const amount = highAmount ? `${lowAmount}–${highAmount}` : lowAmount;
  const duration = parseDuration(text);

  return { prefix, amount, duration };
}

function formatParsedPrice(parsed: ParsedPrice): string {
  if (parsed.duration) {
    return `${parsed.prefix}${parsed.amount} / ${parsed.duration}`;
  }
  return `${parsed.prefix}${parsed.amount}`;
}

export function formatCafePrice(feature: CatCafeFeature): string | undefined {
  const priceText = feature.properties.price_text?.trim();
  if (!priceText || /^see website$/i.test(priceText)) {
    return undefined;
  }
  if (/^temporarily closed$/i.test(priceText)) {
    return "Temporarily closed";
  }

  const parsed = parsePriceSegment(choosePriceSegment(priceText), feature.properties.country);
  if (!parsed) {
    return undefined;
  }

  return formatParsedPrice(parsed);
}
