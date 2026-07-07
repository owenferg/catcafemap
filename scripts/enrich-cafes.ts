import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";

const INPUT_PATH = "data/manual/cat-cafes.csv";
const IMAGE_DIR = "public/images/cafes";
const TODAY = "2026-07-07";
const USER_AGENT = "catcafemap-enrichment/0.1 (local data verification)";
const PRICE_FALLBACK = "See website";
const IMAGE_FALLBACK = "/images/cafes/placeholder.png";
const PRICE_OVERRIDES: Record<string, string> = {
  "KitTea Cat Lounge": "$30 for 55 min",
  "Meow Parlour": "$23+tax for 50 min",
  "The Casual Cat Cafe": "$15",
  "El Gato Coffeehouse": "$18",
  "Kitty Brew Cat Cafe": "$13 for 50 min",
  "Regal Cat Cafe": "$12 weekdays / $14 weekends for 30 min",
  "Tally Cat Cafe": "$15",
  "Denver Cat Company": "$15",
  "Catfe Lounge": "$18",
  "My Kitty Cafe": "$13",
  "A Sanctuary Cafe": "$10 credit per person",
  "Catfeine Cat Cafe": "$12 for 1 hr",
  "Patriot Pawsabilities": "$19 adults/teens; $13 children",
  "Shabby Tabby": "$18.47 for 1 hr",
  "El Jefe Cat Lounge": "$14/person/hour",
  "Mew Haven Cat Cafe": "$14 per person",
  "Purrmaid Cafe and Adoption Center": "$6 per half hour",
  "Kitty Pause Kitty Cafe": "$15 per hour per guest",
  "Gatos and Beans": "$15 admission pass",
  "The Region Cat Café": "$13 for 50 min",
  "Black Forest Cat Café": "$10 cat lounge admission",
  "Espurresso Cat Cafe": "$10 for 30 min or $15 for 1 hr",
  "Second Cup Cat Cafe": "$15 ages 11+; $10 ages 4-10",
  "Kitty Cat Cafe and Adoption Lounge": "$14 for 50 min",
  "Playful Paws Cat Café": "$20 for 50 min",
  "Central Purrk Cat Cafe": "$12 admission fee",
  "Meow Cat Lounge": "$12 per person",
  "Cups & Claws Cat Cafe": "$10-$15 depending on day",
  "Cat Lounge Meows Corner": "Weekday $18; weekend $21",
  "don't stress meowt Cat Cafe": "$15 per hour",
  "All the Single Kitties Cat Cafe": "$15 for 25 min; $25 for 50 min",
  "Perk and Paws Cat Cafe": "$17 adult; $14 children 13 and under",
  "Tiny Lions Lounge & Adoption Center": "$10/hour; $6/half hour",
  "Orlando Cat Cafe": "$13 adult; $11 child",
  "Karma Kat Cafe": "$10 or less per person",
  "Catloops": "Admission $15",
  "Cara's Cat Café": "$18 per hour per person",
  "Cat Daddy Cat Café": "$10 for 30 min; $15 for 60 min",
  "Avocato Catfe & Adoption Center": "$15 adult/hour; $10 child/hour",
  "Catfé Montclair": "$15 for 30 min; $28 for 60 min",
  "The Cat's Brew": "$10 per person plus tax for 1 hr",
  "Cat Café MOFF Ala Moana Center": "$23 for 30 min; $28 for 60 min",
  "Cat Café MOFF International Market Place": "$23 for 30 min; $28 for 60 min",
  "Cat Café MOFF Pearlridge Center": "$23 for 30 min; $28 for 60 min",
  "Crumbs & Whiskers Los Angeles": "2x 70-min: $80; 2x 30-min: $50",
  "NEKO Cat Cafe Seattle": "$25/person for 45 min",
  "NEKO Cat Cafe Bellingham": "$20/person for 45 min",
  "The Catcade": "$20/person/hour",
  "Pounce Cat Cafe Charleston": "$17/person for 1 hr",
  "Pounce Cat Cafe Savannah": "$17/person for 1 hr",
  "Gem City Catfe": "$10 non-members; $5 members",
  "The Whole Cat and Kaboodle": "$15/person",
  "Mauhaus Cat Cafe": "$15 age 13+; $11 age 65+; $9.50 ages 2-12",
  "Crumbs & Whiskers DC": "2x 70-min: $90; 2x 30-min: $55",
  "Cat Cafe Kokomo Humane Society": "Free admission",
  "Rescued Treasures Cat Café": "$10/hr Mon-Tue; $12/hr Fri-Sun",
  "The Pawsitive Cafe": "$9 for 30 min; $13 for 60 min",
  "Scruffy's Cafe": "$10.92 weekday; $13.11 weekend for 1 hr",
  "Naughty Cat Cafe": "$17/person for up to 1 hr",
  "Mount Purrnon Cat Café + Wine Bar": "$25 adult/$20 child for 1 hr; $17 for 30 min",
  "Ziggy's Cat Lounge": "$15/person for 45 min",
  "Vintage Cat Cafe Toronto": "$29.95 for 1 hr",
  "Pawsific Northwest Cafe": "$15/person",
  "Purr Cup Cafe": "$10/hour plus tax",
  "Coffee Cats": "$10/hour plus tax",
  "Mac Tabby Cat Cafe Salisbury": "$12 weekday/$14 weekend for 60 min; $8/$10 walk-in 30 min",
  "Daily Mews Cat Cafe": "$12 weekdays; $15 weekends for 50 min",
  "The Purrfect Cup Cat Café": "$10 adult; $7 child plus tax",
  "Cat Cafe on Whyte": "$16.99-$18.99/hour age 13+",
  "Catoro Cafe": "$18/guest for 50 min",
  "Starry Night Cat Café": "$10-$12 age 13+; $8-$10 ages 3-12",
  "Kokoro Cat Café": "$20/person for 40 min",
  "Eugene Springfield Cat Lounge": "$15 for 60 min; $10 for 30 min",
  "The Alaska Cat Cafe": "$10 for 30 min",
  "River Kitty Cafe": "$12 for 60 min; $6 for 30 min",
  "Black Cat Market": "$9/person for 30 min",
  "Santa Fe Cat Cafe": "$10/person for 50 min",
  "Cat Tales Cat Cafe": "$13 weekdays; $15 weekends",
  "Mad Catter Cafe": "$10+tax for 50 min",
  "Fur Babies Cat Café": "$14 for 60 min",
  "The Scratching Post": "$15 for 50 min",
  "The Kitty Beautiful": "$15+tax for 1 hr; $8+tax for 30 min",
  "Felius Cat Cafe": "$10 for 30 min; $18 for 1 hr",
  "Btown Meow Cat Cafe": "$7 for 30 min; $10 for 60 min",
  "Catelowna Cat Cafe": "$16/person for 1 hr",
  "Central Purr": "$10 for 1 hr",
  "Coastal Cat Cafe": "$15.53 for 45 min",
  "Comfort and Joy Cat Cafe": "From $12 for 50 min; $10 walk-in 30 min",
  "Meow Dyer Cat Cafe": "$12-$15 for 25 min; $18-$24 for 55 min",
  "Purrfect Café": "$25 CAD for 60 min",
  "River Kitty Cat Café": "$10 for 60 min; $8 walk-in 30 min",
  "RubyCats": "$15/person",
  "Salty Cat Cafe": "$10 for 1 hr",
  "The Purrfect Pour Cat Cafe": "$12 weekdays; $15 weekends for 1 hr",
  "Whiskerwood Haven": "$25/person for 60 min; $15/person for 30 min",
  "The Cafe Meow Roseville": "$10.50 weekdays; $15-$17.25 weekends",
  "The Cafe Meow New Hope": "$10.50 weekdays; $15-$17.25 weekends",
  "Mac Tabby Cat Cafe Charlotte": "$12 weekday/$14 weekend for 60 min; $8/$10 walk-in 30 min",
  "Mac Tabby Cat Cafe Concord": "$12 weekday/$14 weekend for 60 min; $8/$10 walk-in 30 min",
  "Gibson's Cat Cafe": "$6 for 15 min; $8 for 30 min; $10 for 60 min",
  "Cats Show Cat Café": "$9 day pass",
  "Cats & Crystals": "$15-$20 for 30 min; $20-$25 for 70 min",
  "Cattyshack, Inc.": "$14 donation/person",
  "Catzen Coffee": "Free for 1-4 guests; $5/person for 5+ guests",
  "Tabby Tea Cat Lounge": "$10/person/hour",
  "Tail Town Cat Cafe": "$20/person for 60 min",
  "The Cat House Lounge & Boutique": "$15/person for 45 min",
  "The Kitty Crib": "$5 deposit/person",
  "The Charming Cat Corner": "$14 for 30 min; $17 for 60 min",
  "Alley Cat": "C$10.50/hour adult; C$6/hour children 3-12",
  "Toe Beans Cat Cafe": "C$10+HST/person for 55 min",
  "Marcies Angels Cat Cafe": "$17.02 for 50 min",
  "Cattfeinated Cat Cafe": "$10 for 45 min",
  "Cats N'At": "$10 for 30 min; $20 for 1 hr",
  "Kzoo Cat Cafe and Rescue": "$15 regular; $10 student/under 18",
  "Cat Nook Cafe": "$6 for 15 min; $8 for 30 min; $12 for 1 hr",
  "Le Cat Cafe": "$17 for 60 min",
  "don't stress meowt Cat Cafe Tulsa": "$15/hr per person",
  "Alley Cat Cafe": "$5/person for 30 min",
  "Annie's Attic Thrift Shop & Cat Cafe": "Minimum $5 donation",
  "Biscuit Factory Cat Lounge": "$11 for 1 hr",
  "Boops & Beans Cat Cafe": "$12 standard; $10 discount; $6 kids 9 and under",
  "Cat Cafe Maui": "$22 for 50 min",
};
const PRICE_SOURCE_OVERRIDES: Record<string, string> = {
  "KitTea Cat Lounge": "https://kitteasf.org/book-now",
  "Meow Parlour": "https://www.meowparlour.com/faq",
  "The Casual Cat Cafe": "https://www.thecasualcatcafe.com",
  "El Gato Coffeehouse": "https://www.elgatocoffeehouse.com/faq",
  "Kitty Brew Cat Cafe": "https://kittybrew.com/visit/",
  "Regal Cat Cafe": "https://www.regalcatcafe.com/",
  "Tally Cat Cafe": "https://www.tallycatcafe.com",
  "Denver Cat Company": "https://www.denvercatco.com/",
  "Catfe Lounge": "https://ferndalecatshelter.org/catfe-lounge/",
  "My Kitty Cafe": "https://mykittycafe.com/book",
  "A Sanctuary Cafe": "https://www.asanctuarycafe.com/visit",
  "Catfeine Cat Cafe": "https://www.catfeine.net/book",
  "Patriot Pawsabilities": "https://www.patriotpawsabilities.com/visits",
  "Shabby Tabby": "https://www.theshabbytabbyli.com/book-online",
  "El Jefe Cat Lounge": "https://www.eljefecatlounge.com/",
  "Mew Haven Cat Cafe": "https://www.mewhavencatcafe.com/faq",
  "Purrmaid Cafe and Adoption Center": "https://www.purrmaidcatcafe.com/",
  "Kitty Pause Kitty Cafe": "https://kittypausecafe.com/faq",
  "Gatos and Beans": "https://gatosandbeans.com/",
  "The Region Cat Café": "https://theregioncatcafe.com/visiting-kitties",
  "Black Forest Cat Café": "https://blackforestcatcafe.com/faq/",
  "Espurresso Cat Cafe": "https://www.espurressocatcafe.com/faqs",
  "Second Cup Cat Cafe": "https://secondcupcatcafe.com/",
  "Kitty Cat Cafe and Adoption Lounge": "https://www.kittycatcafema.com/book-your-visit",
  "Playful Paws Cat Café": "https://www.playfulpawscatcafe.com/faqs",
  "Central Purrk Cat Cafe": "https://www.centralpurrkcafe.com/faqs",
  "Meow Cat Lounge": "https://www.meowcatlounge.com/faqs",
  "Cups & Claws Cat Cafe": "https://www.cupsandclaws.com/pricing",
  "Cat Lounge Meows Corner": "https://www.meowscorner.com/book-online",
  "don't stress meowt Cat Cafe": "https://dontstressmeowt-catcafe.com/faqs",
  "All the Single Kitties Cat Cafe": "https://allthesinglekitties.org/",
  "Perk and Paws Cat Cafe": "https://perkandpawscatcafe.com/tickets",
  "Tiny Lions Lounge & Adoption Center": "https://www.tinylions.org/",
  "Orlando Cat Cafe": "https://www.orlandocatcafe.com/",
  "Karma Kat Cafe": "https://www.karmakatcafe.com/reservations",
  "Catloops": "https://www.catloops.ca/",
  "Cara's Cat Café": "https://carascatcafe.com/",
  "Cat Daddy Cat Café": "https://catdaddyscatcafe.com/",
  "Avocato Catfe & Adoption Center": "https://avocato.org/",
  "Catfé Montclair": "https://www.catfemontclair.com/visit-us/catlounge",
  "The Cat's Brew": "https://www.thecatsbrew.com/reservations",
  "Cat Café MOFF Ala Moana Center": "https://moff-usa.com/locations/amc/",
  "Cat Café MOFF International Market Place": "https://moff-usa.com/locations/imp/",
  "Cat Café MOFF Pearlridge Center": "https://moff-usa.com/locations/prc/",
  "Crumbs & Whiskers Los Angeles": "https://crumbsandwhiskers.com/appointments-la",
  "NEKO Cat Cafe Seattle": "https://www.nekocatcafe.com/reservations-seattle",
  "NEKO Cat Cafe Bellingham": "https://www.nekocatcafe.com/reservations-bellingham",
  "The Catcade": "https://www.thecatcade.org/visitourcatcafe",
  "Pounce Cat Cafe Charleston": "https://www.pouncecatcafe.com/faq",
  "Pounce Cat Cafe Savannah": "https://www.pouncecatcafe.com/faq",
  "Gem City Catfe": "https://www.gemcitycatfe.com/visit",
  "The Whole Cat and Kaboodle": "https://www.wholecatandkaboodle.com/cat-lounge",
  "Mauhaus Cat Cafe": "https://mauhauscafe.com/faqs/",
  "Crumbs & Whiskers DC": "https://crumbsandwhiskers.com/appointments-dc",
  "Cat Cafe Kokomo Humane Society": "https://kokomohumane.org/cat-cafe/",
  "Rescued Treasures Cat Café": "https://www.palnv.org/visit",
  "The Pawsitive Cafe": "https://www.pawsitivecatcafe.com/",
  "Scruffy's Cafe": "https://www.scruffyscafeknox.com/book-online",
  "Naughty Cat Cafe": "https://www.naughtycatcafe.com/visit-us",
  "Mount Purrnon Cat Café + Wine Bar": "https://www.mtpurrnoncatcafe.com/",
  "Ziggy's Cat Lounge": "https://ziggyscatlounge.com/book-meow",
  "Vintage Cat Cafe Toronto": "https://booking.cojilio.com/vintagecatcafe",
  "Pawsific Northwest Cafe": "https://www.pawsnwcafe.com/",
  "Purr Cup Cafe": "https://purrcupcafe.com/make-a-reservation",
  "Coffee Cats": "https://www.coffeecatscafe.com/make-a-reservation",
  "Mac Tabby Cat Cafe Salisbury": "https://www.mactabby.com/what-to-expect-1/",
  "Daily Mews Cat Cafe": "https://www.dailymewscharlotte.com/",
  "The Purrfect Cup Cat Café": "https://purrfectcup.ca/",
  "Cat Cafe on Whyte": "https://www.catcafeonwhyte.com/blank-page-1",
  "Catoro Cafe": "https://catoropets.com/products/cat-forest-visit",
  "Starry Night Cat Café": "https://www.starrynightcatcafe.com/visit",
  "Kokoro Cat Café": "https://www.kokorocatcafe.com/reservations",
  "Eugene Springfield Cat Lounge": "https://www.eugenespringfieldcatlounge.com/",
  "The Alaska Cat Cafe": "https://booking.cojilio.com/thealaskacatcafe/location/TheAlaskaCatCafe",
  "River Kitty Cafe": "https://www.riverkittycafe.com/book-online",
  "Black Cat Market": "https://blackcatmarketpgh.com/",
  "Santa Fe Cat Cafe": "https://www.santafecatcafe.com/",
  "Cat Tales Cat Cafe": "https://cattalescatcafe.com/",
  "Mad Catter Cafe": "https://www.madcattercafe.com/",
  "Fur Babies Cat Café": "https://app.squarespacescheduling.com/schedule.php?owner=22232198&appointmentType=20919309",
  "The Scratching Post": "https://scratchingpostcu.com/cat-cafe-reservations/",
  "The Kitty Beautiful": "https://www.thekittybeautiful.com/",
  "Felius Cat Cafe": "https://felius.org/",
  "Btown Meow Cat Cafe": "https://app.acuityscheduling.com/schedule.php?owner=30023042",
  "Catelowna Cat Cafe": "https://catelowna.com/book-a-visit",
  "Central Purr": "https://www.centralpurrofpcb.com/book-online",
  "Coastal Cat Cafe": "https://www.coastalcatpcola.com/book",
  "Comfort and Joy Cat Cafe": "https://www.comfortandjoycatcafe.com/book-online",
  "Meow Dyer Cat Cafe": "https://app.acuityscheduling.com/schedule/a7a7f3a4",
  "Purrfect Café": "https://www.purrfectcafe.ca/book-online",
  "River Kitty Cat Café": "https://www.riverkittycatcafe.org/reservations",
  "RubyCats": "https://www.rubycats.org/book",
  "Salty Cat Cafe": "https://www.saltycatsrescue.org/book-online",
  "The Purrfect Pour Cat Cafe": "https://www.thepurrfectpourcatcafe.com/what-to-expect/",
  "Whiskerwood Haven": "https://www.whiskerwoodhaven.com/bookonline",
  "The Cafe Meow Roseville": "https://thecafemeow.com/about/faq/",
  "The Cafe Meow New Hope": "https://thecafemeow.com/about/faq/",
  "Mac Tabby Cat Cafe Charlotte": "https://www.mactabby.com/what-to-expect/",
  "Mac Tabby Cat Cafe Concord": "https://www.mactabby.com/what-to-expect/",
  "Gibson's Cat Cafe": "https://catsandcoffee.dudasites.com/new-page",
  "Cats Show Cat Café": "https://catshowcatcafe.com/plan-your-visit",
  "Cats & Crystals": "https://www.catsandcrystals.com/book-online",
  "Cattyshack, Inc.": "https://cattyshackhuntsville.org/",
  "Catzen Coffee": "https://www.catzencoffee.com/",
  "Tabby Tea Cat Lounge": "https://cattalesdavis.com/cat-lounge-adoptions/",
  "Tail Town Cat Cafe": "https://www.tailtowncats.com/",
  "The Cat House Lounge & Boutique": "https://www.thecathouselounge.com/appointments",
  "The Kitty Crib": "https://mooresrescueranch.org/the-kitty-crib/",
  "The Charming Cat Corner": "https://thecharmingcatcafe.com/visiting/",
  "Alley Cat": "https://www.alleycatcafe.ca/faq",
  "Toe Beans Cat Cafe": "https://toe-beans-cat-cafe.square.site/",
  "Marcies Angels Cat Cafe": "https://marciesangelscatcafe.as.me/schedule/56ba3105",
  "Cattfeinated Cat Cafe": "https://app.acuityscheduling.com/schedule/c608a58d",
  "Cats N'At": "https://www.catspgh.com/book-online",
  "Kzoo Cat Cafe and Rescue": "https://www.kzoocatcafe.com/cat-cafe-infofaq.html",
  "Cat Nook Cafe": "https://catnookcafe.com/",
  "Le Cat Cafe": "https://lecatcafe.org/scheduling/",
  "don't stress meowt Cat Cafe Tulsa": "https://dontstressmeowt-catcafe.com/tulsa",
  "Alley Cat Cafe": "https://www.alleycatithaca.com/book-cat-time",
  "Annie's Attic Thrift Shop & Cat Cafe": "https://anniesattic.ca/cat-cafe/",
  "Biscuit Factory Cat Lounge": "https://thebiscuitfactorycatcafe.as.me/schedule/3cc73597",
  "Boops & Beans Cat Cafe": "https://www.boopsandbeanscatcafe.com/pricing",
  "Cat Cafe Maui": "https://catcafemaui.com/experiences/",
};

type Row = Record<string, string>;

type CandidatePage = {
  url: string;
  html: string;
  text: string;
};

const PRICE_LINK_PATTERN =
  /admission|book|booking|cat-room|catroom|cat-lounge|catlounge|faq|fee|hours|lounge|pricing|price|rate|reservation|reserve|ticket|visit/i;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function parseCsv(content: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) {
    return [];
  }

  return dataRows
    .filter((dataRow) => dataRow.some((value) => value.trim().length > 0))
    .map((dataRow) =>
      Object.fromEntries(
        headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ""]),
      ),
    );
}

function writeCsv(rows: Row[]): string {
  const columns = [
    "name",
    "address",
    "city",
    "region",
    "country",
    "website",
    "source_url",
    "image_url",
    "image_source_url",
    "price_text",
    "price_source_url",
    "enriched_at",
    "lat",
    "lon",
    "status",
    "verified_at",
    "notes",
  ];
  const lines = rows.map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(","));
  return `${[columns.join(","), ...lines].join("\n")}\n`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pageText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#36;/g, "$")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1]?.replace(/&amp;/g, "&");
}

function absoluteUrl(base: string, value: string | undefined): string | undefined {
  if (!value || value.startsWith("data:")) {
    return undefined;
  }

  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

function sameHost(left: string, right: string): boolean {
  try {
    const a = new URL(left).hostname.replace(/^www\./, "");
    const b = new URL(right).hostname.replace(/^www\./, "");
    return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
  } catch {
    return false;
  }
}

async function fetchText(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !/html|text/i.test(contentType)) {
      return undefined;
    }
    return await response.text();
  } catch {
    return undefined;
  }
}

function candidateUrls(website: string): string[] {
  const paths = [
    "",
    "admission",
    "admissions",
    "visit",
    "visit-us",
    "visiting",
    "visits",
    "reserve",
    "reservation",
    "reservations",
    "booking",
    "book",
    "book-now",
    "book-online",
    "book-your-visit",
    "tickets",
    "ticket",
    "pricing",
    "prices",
    "rates",
    "cat-lounge",
    "cat-room",
    "catcafe",
    "cat-cafe",
    "hours",
    "faqs",
    "faq",
  ];

  try {
    const base = new URL(website);
    return [...new Set(paths.map((path) => new URL(path, base).toString()))];
  } catch {
    return [];
  }
}

function internalPriceLinks(page: CandidatePage, website: string): string[] {
  const links: string[] = [];
  const pattern = /<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(page.html))) {
    const [, href, label] = match;
    const url = absoluteUrl(page.url, href);
    if (!url || !sameHost(url, website)) {
      continue;
    }

    const haystack = `${url} ${pageText(label)}`;
    if (PRICE_LINK_PATTERN.test(haystack)) {
      links.push(url);
    }
  }

  return links;
}

async function pagesFor(row: Row): Promise<CandidatePage[]> {
  const website = row.website || row.source_url;
  const firstUrls = candidateUrls(website);
  const firstPages = await Promise.all(
    firstUrls.map(async (url) => {
      const html = await fetchText(url);
      return html ? { url, html, text: pageText(html) } : undefined;
    }),
  );
  const first = firstPages.filter((page): page is CandidatePage => Boolean(page));
  const secondUrls = [
    ...new Set(
      first
        .flatMap((page) => internalPriceLinks(page, website))
        .filter((url) => !firstUrls.includes(url))
        .slice(0, 24),
    ),
  ];
  const secondPages = await Promise.all(
    secondUrls.map(async (url) => {
      const html = await fetchText(url);
      return html ? { url, html, text: pageText(html) } : undefined;
    }),
  );

  return [
    ...first,
    ...secondPages.filter((page): page is CandidatePage => Boolean(page)),
  ];
}

function priceSearchText(page: CandidatePage): string {
  return pageText(
    page.html
      .replace(/\\u0024/g, "$")
      .replace(/\\u003c/g, "<")
      .replace(/\\u003e/g, ">")
      .replace(/\\"/g, '"'),
  );
}

function scorePriceContext(context: string): number {
  let score = 0;
  if (/admission|book|booking|cat room|cat lounge|cat cafe|cat visit|entry|hour|lounge|reservation|reserve|ticket|visit/i.test(context)) {
    score += 3;
  }
  if (/adult|child|children|guest|kids|person|people|pp|session/i.test(context)) {
    score += 1;
  }
  if (/adoption|apparel|beverage|coffee|donation|drink|espresso|food|gift card|merch|menu|retail|shirt|tea/i.test(context)) {
    score -= 4;
  }
  if (/birthday|event|membership|monthly|party|private|rental|subscription/i.test(context)) {
    score -= 4;
  }
  return score;
}

function bestPriceCandidate(page: CandidatePage): string | undefined {
  const text = priceSearchText(page);
  const prices: Array<{ price: string; score: number; index: number }> = [];
  const pattern = /\$\s?\d+(?:\.\d{2})?(?:\s?[-–]\s?\$?\d+(?:\.\d{2})?)?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const price = match[0].replace(/\s+/g, " ").trim();
    const amount = Number(price.match(/\d+(?:\.\d{2})?/)?.[0]);
    if (!Number.isFinite(amount) || amount > 60 || amount < 5) {
      continue;
    }

    const start = Math.max(0, match.index - 100);
    const end = Math.min(text.length, match.index + 130);
    const context = text.slice(start, end);
    const score = scorePriceContext(context);
    if (score > 0) {
      prices.push({ price: context.replace(/\s+/g, " ").trim(), score, index: match.index });
    }
  }

  const best = prices.sort((a, b) => b.score - a.score || a.index - b.index)[0];
  if (!best) {
    return undefined;
  }

  return summarizePrice(best.price);
}

function summarizePrice(context: string): string | undefined {
  const clean = context.replace(/\s+/g, " ").trim();
  const hourly = clean.match(/\$\s?\d+(?:\.\d{2})?(?:\s?[-–]\s?\$?\d+(?:\.\d{2})?)?[^.]{0,45}(?:30|45|50|55|60|half|one|1)[^.]{0,20}(?:min|minute|minutes|hour|hr|hrs)/i)?.[0];
  const perPerson = clean.match(/\$\s?\d+(?:\.\d{2})?(?:\s?[-–]\s?\$?\d+(?:\.\d{2})?)?[^.]{0,45}(?:adult|admission|entry|guest|person|pp|ticket|visit)/i)?.[0];
  const reverse = clean.match(/(?:adult|admission|entry|guest|person|pp|ticket|visit)[^.]{0,45}\$\s?\d+(?:\.\d{2})?(?:\s?[-–]\s?\$?\d+(?:\.\d{2})?)?/i)?.[0];
  const value = hourly ?? perPerson ?? reverse;

  if (!value || isSuspiciousPrice(value)) {
    return undefined;
  }

  return value
    .replace(/\b(?:click|here|now|online|purchase|select|ticket pricing)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[^\w$]+|[^\w.)]+$/g, "")
    .trim();
}

function imageFromPage(page: CandidatePage, website: string): string | undefined {
  const candidates = [
    attr(page.html, /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i),
    attr(page.html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i),
    attr(page.html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i),
    attr(page.html, /<img[^>]+src=["']([^"']+)["']/i),
  ]
    .map((value) => absoluteUrl(page.url, value))
    .filter((value): value is string => Boolean(value));

  return candidates.find((url) => sameHost(url, website)) ?? candidates[0];
}

function priceFromPage(page: CandidatePage): string | undefined {
  const best = bestPriceCandidate(page);
  if (best) {
    return best;
  }

  const keywordIndex = page.text.search(
    /admission|reservation|reserve|booking|visit|cat room|cat lounge|ticket|pricing|price|rate/i,
  );
  const text = keywordIndex === -1 ? page.text : page.text.slice(Math.max(0, keywordIndex - 120));
  const patterns = [
    /\$\s?\d+(?:\.\d{2})?\s*(?:\/|per|for)\s*(?:person\s*)?(?:\d+\s*)?(?:min|mins|minutes|hour|hr|hrs|session|visit)/i,
    /\$\s?\d+(?:\.\d{2})?\s*(?:adult|child|student|senior|admission|reservation|ticket|visit)/i,
    /(?:adult|child|student|senior|admission|reservation|ticket|visit)[^$.]{0,40}\$\s?\d+(?:\.\d{2})?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[0];
    const price = match?.replace(/\s+/g, " ").trim();
    if (price && !isSuspiciousPrice(price)) {
      return price;
    }
  }

  return undefined;
}

function isSuspiciousPrice(value: string): boolean {
  return (
    /\$\s?(?:[6-9]\d|1\d\d|2\d\d|3\d\d)/.test(value) ||
    /\?|comes with|reservations are required|tab to|tickets!|additional|additonal|adult and|birthday|child|children|event|from|gift|monthly|party|plan|private|rental|senior|student|visitors/i.test(
      value,
    ) ||
    value === "$1/hour"
  );
}

function extensionFrom(contentType: string, url: string): string {
  if (/png/i.test(contentType)) {
    return ".png";
  }
  if (/webp/i.test(contentType)) {
    return ".webp";
  }
  const ext = extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
}

async function downloadImage(url: string, slug: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/*,*/*" },
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\//i.test(contentType)) {
      return undefined;
    }

    const ext = extensionFrom(contentType, response.url);
    const path = `${IMAGE_DIR}/${slug}${ext}`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
    return `/${path.replace(/^public\//, "")}`;
  } catch {
    return undefined;
  }
}

async function enrich(row: Row): Promise<Row> {
  if ((row.status || "active") !== "active") {
    return row;
  }

  const pages = await pagesFor(row);
  const pricePage = pages.find((page) => priceFromPage(page)) ?? pages[0];
  const currentImage = row.image_url === "/images/cafes/placeholder.jpg" ? "" : row.image_url;
  const imagePage = currentImage ? undefined : pages.find((page) => imageFromPage(page, row.website)) ?? pages[0];
  const imageSource = imagePage ? imageFromPage(imagePage, row.website) : undefined;
  const slug = slugify(`${row.name}-${row.city}-${row.region}`);
  const imageUrl = imageSource && !currentImage ? await downloadImage(imageSource, slug) : undefined;
  const priceOverride = PRICE_OVERRIDES[row.name];
  const currentPrice = row.price_text && !isSuspiciousPrice(row.price_text) ? row.price_text : "";
  const currentPriceSource = currentPrice ? row.price_source_url : "";

  return {
    ...row,
    image_url: currentImage || imageUrl || IMAGE_FALLBACK,
    image_source_url: row.image_source_url || imageSource || row.website || row.source_url,
    price_text:
      priceOverride || currentPrice || (pricePage ? priceFromPage(pricePage) : undefined) || PRICE_FALLBACK,
    price_source_url:
      PRICE_SOURCE_OVERRIDES[row.name] || currentPriceSource || pricePage?.url || row.website || row.source_url,
    enriched_at: row.enriched_at || TODAY,
  };
}

async function main(): Promise<void> {
  const rows = parseCsv(await readFile(INPUT_PATH, "utf8"));
  const enriched: Row[] = Array.from({ length: rows.length });
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      const next = await enrich(rows[index]);
      enriched[index] = next;
      if ((next.status || "active") === "active") {
        console.log(`${index + 1}/${rows.length} ${next.name}: ${next.price_text}`);
      }
    }
  }

  await Promise.all(Array.from({ length: 8 }, () => worker()));

  await writeFile(INPUT_PATH, writeCsv(enriched));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
