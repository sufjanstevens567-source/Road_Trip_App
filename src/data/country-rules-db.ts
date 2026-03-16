import type { CountryRule, CountryRuleItem } from "@/types/trip";

type SeededCountryRule = Omit<CountryRule, "id" | "tripId">;

function item(
  id: string,
  label: string,
  detail: string,
  dueBy?: string
): CountryRuleItem {
  return { id, label, detail, status: "todo", seeded: true, dueBy };
}

const SEEDED_RULES: SeededCountryRule[] = [
  {
    country: "Luxembourg",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate", "Roadside assistance card"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "No tolls.",
    borderNotes: "No special border controls expected for EU travel.",
    commonMistakes: [
      "Leaving without a complete safety kit (triangle, vests, first-aid)",
      "Not carrying physical insurance documents",
    ],
    items: [
      item("lu-docs", "Document folder packed", "Licence, registration, insurance, assistance card, and booking confirmations together."),
      item("lu-safety", "Safety kit checked", "Triangle, reflective vests, first-aid kit, and emergency basics."),
      item("lu-offline", "Offline maps downloaded", "Download maps for all countries before departure."),
    ],
  },
  {
    country: "Germany",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "Munich and other major cities have Umweltzonen (low-emission zones). Vehicles need an emissions sticker (Umweltplakette) to enter. Check your vehicle's Euro emission standard before driving into restricted central areas.",
    speedLimitNotes: "No general motorway limit (advisory 130 km/h). 100 km/h rural. 50 km/h urban.",
    tollNotes: "No general road toll for passenger cars. Some tunnels and bridges have tolls.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Booking a central Munich hotel without checking low-emission zone access",
      "Driving into a restricted zone without an emissions sticker",
      "Assuming all motorway sections are unlimited — some have permanent limits",
    ],
    items: [
      item("de-zone", "Munich low-emission zone strategy confirmed", "Either stay outside the restricted core or verify your vehicle has a valid Umweltplakette (green sticker, Euro 4+).", "Before Day 1"),
      item("de-parking", "Munich parking pre-booked", "Hotel with private parking or a confirmed P+R garage only."),
    ],
  },
  {
    country: "Austria",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: true,
    vignetteUrl: "https://www.asfinag.at/en/toll/vignette/",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 100 km/h rural, 50 km/h urban.",
    tollNotes: "Motorway vignette (Autobahnvignette) required. Available digitally. Some mountain roads and tunnels carry additional tolls.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Driving on a motorway without a valid vignette",
      "Not carrying the vignette confirmation if using the digital option",
    ],
    items: [
      item("at-vignette", "Austria e-vignette purchased", "Required before using motorways. Buy online and save proof.", "Before entering Austria"),
    ],
  },
  {
    country: "Switzerland",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: true,
    vignetteUrl: "https://www.bazg.admin.ch/bazg/en/home/information-individuals/travel-and-purchases-abroad--customs-and-duty-free-limits/motorway-vignette.html",
    emissionZoneNotes: "",
    speedLimitNotes: "120 km/h motorway, 80 km/h rural, 50 km/h urban.",
    tollNotes: "Annual vignette required for motorways (valid calendar year). No daily or weekly option. Tunnel surcharges apply on some routes.",
    borderNotes: "Switzerland is not in the Schengen Area — passport or ID check at the border.",
    commonMistakes: [
      "Buying a vignette only to find it is a calendar-year sticker (not worth it for a transit drive)",
      "Forgetting passport for the Swiss border",
    ],
    items: [
      item("ch-vignette", "Switzerland vignette decision made", "If transiting, consider an alternative route to avoid the annual vignette cost.", "Before entering Switzerland"),
      item("ch-passport", "Passport or national ID accessible for Swiss border", "Switzerland is outside Schengen."),
    ],
  },
  {
    country: "France",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "Paris and some other cities have Crit'Air zones requiring an emissions sticker.",
    speedLimitNotes: "130 km/h motorway (110 in rain), 80 km/h rural, 50 km/h urban.",
    tollNotes: "Extensive toll motorway network. Keep a card or cash accessible. Telepass / télépéage badge works if you have one.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Not having a payment method ready at toll plazas",
      "Underestimating toll costs on long motorway routes",
    ],
    items: [
      item("fr-tolls", "Toll payment method confirmed", "Card or cash accessible at the driver's seat before motorway sections."),
    ],
  },
  {
    country: "Belgium",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "Brussels, Antwerp, and Ghent have Low Emission Zones (LEZ). Registration required online before entry.",
    speedLimitNotes: "120 km/h motorway, 90/70 km/h rural depending on region, 50 km/h urban.",
    tollNotes: "No general motorway toll for passenger cars. Heavy vehicles pay a km charge.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Driving into Ghent or Antwerp LEZ without registering the vehicle",
    ],
    items: [
      item("be-lez", "Belgium LEZ registration done if entering Brussels/Antwerp/Ghent", "Register at least 48h before entry."),
    ],
  },
  {
    country: "Netherlands",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "Amsterdam and other cities are introducing ZTL zones. Check the specific city's current rules.",
    speedLimitNotes: "100 km/h motorway (130 km/h on some sections at night), 80 km/h rural, 50 km/h urban.",
    tollNotes: "No general road toll. Some tunnels have tolls.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [],
    items: [],
  },
  {
    country: "Italy",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "Most Italian cities have ZTL (Zona Traffico Limitato) zones with camera enforcement. Entering without a permit generates automatic fines that arrive weeks later. Park outside and use transit.",
    speedLimitNotes: "130 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "Extensive toll motorway network (autostrada). Keep a card accessible.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Driving into a ZTL zone without a permit — fines are automatic and arrive by post",
      "Not having a payment method for toll plazas",
    ],
    items: [
      item("it-ztl", "ZTL strategy confirmed for any Italian city stops", "Park outside the ZTL and use transit or walk in."),
      item("it-tolls", "Toll payment method confirmed", "Card accessible for autostrada."),
    ],
  },
  {
    country: "Slovenia",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: true,
    vignetteUrl: "https://evinjeta.dars.si/",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "Motorway e-vignette required (weekly, monthly, or annual). Buy online before use. Confirmation is electronic — no sticker.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Driving on a Slovenian motorway before purchasing the e-vignette",
      "Not saving the confirmation — enforcement is camera-based",
      "Turning Ljubljana into an unplanned parking hunt",
    ],
    items: [
      item("si-vignette", "Slovenia e-vignette purchased", "Buy at evinjeta.dars.si before entering a Slovenian motorway. Save the confirmation.", "Before Day 3"),
      item("si-vignette-saved", "Slovenia e-vignette confirmation saved", "Screenshot or email — camera enforcement means no grace period."),
      item("si-parking", "Ljubljana stop parking plan confirmed", "If stopping with the car, use a formal garage. Keep the stop compact."),
    ],
  },
  {
    country: "Croatia",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "Toll motorway network. Payment by card or cash at booths. ENC/ETC transponders also accepted.",
    borderNotes: "Croatia joined Schengen in January 2023 — no routine border checks from EU/Schengen countries.",
    commonMistakes: [
      "Not having cash or a card ready at Croatian toll booths",
    ],
    items: [
      item("hr-tolls", "Croatian toll payment method ready", "Card or cash accessible for toll booths."),
    ],
  },
  {
    country: "Hungary",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: true,
    vignetteUrl: "https://ematrica.nemzetiutdij.hu/",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "E-vignette (e-matrica) required for motorways. Buy online, available by vehicle registration plate. No physical sticker.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Not registering the correct vehicle plate when purchasing the e-matrica",
    ],
    items: [
      item("hu-vignette", "Hungary e-matrica purchased", "Buy at ematrica.nemzetiutdij.hu before using motorways.", "Before entering Hungary"),
    ],
  },
  {
    country: "Czech Republic",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: true,
    vignetteUrl: "https://edalnice.cz/en/",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "Digital motorway vignette required (eNállepka). Buy online. Annual, monthly, or 10-day options.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [
      "Purchasing the wrong duration vignette",
    ],
    items: [
      item("cz-vignette", "Czech Republic e-vignette purchased", "10-day option usually sufficient for transit.", "Before entering Czech Republic"),
    ],
  },
  {
    country: "Serbia",
    seeded: true,
    documents: ["Passport or national ID", "Driving licence", "Vehicle registration", "Insurance certificate (Green Card required)"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "",
    speedLimitNotes: "130 km/h motorway, 80 km/h rural, 50 km/h urban.",
    tollNotes: "Toll motorway network. Payment by cash (RSD) or card. Keep cash available as some booths are cash-only.",
    borderNotes: "Serbia is not in the EU or Schengen. Passport or ID required at the border. Green Card (international motor insurance) required. Entry stamp issued — keep the receipt until exit.",
    commonMistakes: [
      "Arriving without a Green Card — standard EU insurance may not be valid in Serbia",
      "Not having cash for some toll booths",
      "Treating Novi Sad as a throwaway stop rather than a worthwhile stay",
      "Arriving in Belgrade without a confirmed parking plan",
    ],
    items: [
      item("rs-greencard", "Green Card (international insurance) confirmed for Serbia", "Check with your insurer — not all EU policies automatically cover Serbia.", "Before departure"),
      item("rs-passport", "Passport accessible for Serbian border crossing", "Keep it at the front with documents."),
      item("rs-cash", "Cash (EUR or RSD) available for Serbia tolls", "Some booths are cash-only."),
      item("rs-novi-sad", "Novi Sad stay with confirmed parking booked", "Pick a place near Petrovaradin and the river with on-site parking."),
      item("rs-belgrade", "Belgrade parking strategy confirmed", "Private parking or a real garage only. Save the garage entry route.", "Before Day 7"),
    ],
  },
  {
    country: "Bulgaria",
    seeded: true,
    documents: ["Passport or national ID", "Driving licence", "Vehicle registration", "Insurance certificate (Green Card)"],
    vignetteRequired: true,
    vignetteUrl: "https://bgtoll.bg/",
    emissionZoneNotes: "",
    speedLimitNotes: "140 km/h motorway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "E-vignette required for motorways and some main roads. Buy online at bgtoll.bg or at border petrol stations. Time-based: 1-week, 1-month, annual.",
    borderNotes: "Bulgaria is not in Schengen (as of early 2024, partial accession). Passport or ID at the border. Green Card required.",
    commonMistakes: [
      "Buying the Bulgaria vignette too late — buy it during Belgrade day",
      "Arriving in Sofia without saved parking instructions",
      "Assuming a central Sofia arrival will be frictionless",
    ],
    items: [
      item("bg-vignette", "Bulgaria e-vignette purchased", "Buy at bgtoll.bg before the Belgrade → Sofia leg.", "Before Day 9"),
      item("bg-vignette-saved", "Bulgaria e-vignette confirmation saved", "Keep the email or screenshot accessible."),
      item("bg-sofia-parking", "Sofia parking instructions saved", "Go straight to accommodation parking. Save the garage entry route offline.", "Before Day 9"),
      item("bg-greencard", "Green Card confirmed valid for Bulgaria", "Check with insurer if not already done for Serbia."),
    ],
  },
  {
    country: "Poland",
    seeded: true,
    documents: ["Driving licence", "Vehicle registration", "Insurance certificate"],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "",
    speedLimitNotes: "140 km/h motorway, 100 km/h expressway, 90 km/h rural, 50 km/h urban.",
    tollNotes: "Some motorways and expressways have tolls (A1, A2, A4). Payment by cash, card, or e-TOLL app.",
    borderNotes: "No routine border control within Schengen.",
    commonMistakes: [],
    items: [
      item("pl-tolls", "Polish toll payment method ready", "Card or e-TOLL app for motorway sections."),
    ],
  },
];

export function getSeededCountryRule(country: string): SeededCountryRule | null {
  return (
    SEEDED_RULES.find(
      (r) => r.country.toLowerCase() === country.toLowerCase()
    ) ?? null
  );
}

export function listSeededCountries(): string[] {
  return SEEDED_RULES.map((r) => r.country);
}

export function buildCountryRule(
  tripId: string,
  country: string,
  overrides: Partial<SeededCountryRule> = {}
): Omit<import("@/types/trip").CountryRule, "id"> {
  const seeded = getSeededCountryRule(country);
  const base: SeededCountryRule = seeded ?? {
    country,
    seeded: false,
    documents: [],
    vignetteRequired: false,
    vignetteUrl: "",
    emissionZoneNotes: "",
    speedLimitNotes: "",
    tollNotes: "",
    borderNotes: "",
    commonMistakes: [],
    items: [],
  };
  return { tripId, ...base, ...overrides };
}
