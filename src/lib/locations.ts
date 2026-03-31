// src/lib/locations.ts
// Location lookup helpers using built-in CBSA/MSA code mapping
// Free, no external API needed

export interface LocationInfo {
  city: string
  state: string
  cbsaCode: string
  oewsAreaCode: string
  displayName: string
  areaType: 'msa' | 'state'
}

// Major US metropolitan areas with CBSA codes and O*NET area codes
// Source: https://www.census.gov/geographies/reference-files/time-series/demo/metro-micro/delineation-files.html
export const LOCATIONS: LocationInfo[] = [
  { city: 'New York', state: 'NY', cbsaCode: '35620', oewsAreaCode: '35620', displayName: 'New York-Newark-Jersey City, NY-NJ-PA', areaType: 'msa' },
  { city: 'Los Angeles', state: 'CA', cbsaCode: '31080', oewsAreaCode: '31080', displayName: 'Los Angeles-Long Beach-Anaheim, CA', areaType: 'msa' },
  { city: 'Chicago', state: 'IL', cbsaCode: '16980', oewsAreaCode: '16980', displayName: 'Chicago-Naperville-Elgin, IL-IN-WI', areaType: 'msa' },
  { city: 'Houston', state: 'TX', cbsaCode: '26420', oewsAreaCode: '26420', displayName: 'Houston-The Woodlands-Sugar Land, TX', areaType: 'msa' },
  { city: 'Phoenix', state: 'AZ', cbsaCode: '38060', oewsAreaCode: '38060', displayName: 'Phoenix-Mesa-Chandler, AZ', areaType: 'msa' },
  { city: 'Philadelphia', state: 'PA', cbsaCode: '37980', oewsAreaCode: '37980', displayName: 'Philadelphia-Camden-Wilmington, PA-NJ-DE-MD', areaType: 'msa' },
  { city: 'San Antonio', state: 'TX', cbsaCode: '41700', oewsAreaCode: '41700', displayName: 'San Antonio-New Braunfels, TX', areaType: 'msa' },
  { city: 'San Diego', state: 'CA', cbsaCode: '41740', oewsAreaCode: '41740', displayName: 'San Diego-Chula Vista-Carlsbad, CA', areaType: 'msa' },
  { city: 'Dallas', state: 'TX', cbsaCode: '19100', oewsAreaCode: '19100', displayName: 'Dallas-Fort Worth-Arlington, TX', areaType: 'msa' },
  { city: 'San Francisco', state: 'CA', cbsaCode: '41860', oewsAreaCode: '41860', displayName: 'San Francisco-Oakland-Berkeley, CA', areaType: 'msa' },
  { city: 'Austin', state: 'TX', cbsaCode: '12420', oewsAreaCode: '12420', displayName: 'Austin-Round Rock-Georgetown, TX', areaType: 'msa' },
  { city: 'Jacksonville', state: 'FL', cbsaCode: '27260', oewsAreaCode: '27260', displayName: 'Jacksonville, FL', areaType: 'msa' },
  { city: 'Fort Worth', state: 'TX', cbsaCode: '19100', oewsAreaCode: '19100', displayName: 'Dallas-Fort Worth-Arlington, TX', areaType: 'msa' },
  { city: 'Columbus', state: 'OH', cbsaCode: '18140', oewsAreaCode: '18140', displayName: 'Columbus, OH', areaType: 'msa' },
  { city: 'Charlotte', state: 'NC', cbsaCode: '16740', oewsAreaCode: '16740', displayName: 'Charlotte-Concord-Gastonia, NC-SC', areaType: 'msa' },
  { city: 'Indianapolis', state: 'IN', cbsaCode: '26900', oewsAreaCode: '26900', displayName: 'Indianapolis-Carmel-Anderson, IN', areaType: 'msa' },
  { city: 'Seattle', state: 'WA', cbsaCode: '42660', oewsAreaCode: '42660', displayName: 'Seattle-Tacoma-Bellevue, WA', areaType: 'msa' },
  { city: 'Denver', state: 'CO', cbsaCode: '19740', oewsAreaCode: '19740', displayName: 'Denver-Aurora-Lakewood, CO', areaType: 'msa' },
  { city: 'Boston', state: 'MA', cbsaCode: '14460', oewsAreaCode: '14460', displayName: 'Boston-Cambridge-Newton, MA-NH', areaType: 'msa' },
  { city: 'Nashville', state: 'TN', cbsaCode: '34980', oewsAreaCode: '34980', displayName: 'Nashville-Davidson--Murfreesboro--Franklin, TN', areaType: 'msa' },
  { city: 'Detroit', state: 'MI', cbsaCode: '19820', oewsAreaCode: '19820', displayName: 'Detroit-Warren-Dearborn, MI', areaType: 'msa' },
  { city: 'Portland', state: 'OR', cbsaCode: '38900', oewsAreaCode: '38900', displayName: 'Portland-Vancouver-Hillsboro, OR-WA', areaType: 'msa' },
  { city: 'Las Vegas', state: 'NV', cbsaCode: '29820', oewsAreaCode: '29820', displayName: 'Las Vegas-Henderson-Paradise, NV', areaType: 'msa' },
  { city: 'Memphis', state: 'TN', cbsaCode: '32820', oewsAreaCode: '32820', displayName: 'Memphis, TN-MS-AR', areaType: 'msa' },
  { city: 'Louisville', state: 'KY', cbsaCode: '31140', oewsAreaCode: '31140', displayName: 'Louisville/Jefferson County, KY-IN', areaType: 'msa' },
  { city: 'Baltimore', state: 'MD', cbsaCode: '12580', oewsAreaCode: '12580', displayName: 'Baltimore-Columbia-Towson, MD', areaType: 'msa' },
  { city: 'Milwaukee', state: 'WI', cbsaCode: '33340', oewsAreaCode: '33340', displayName: 'Milwaukee-Waukesha, WI', areaType: 'msa' },
  { city: 'Albuquerque', state: 'NM', cbsaCode: '10740', oewsAreaCode: '10740', displayName: 'Albuquerque, NM', areaType: 'msa' },
  { city: 'Tucson', state: 'AZ', cbsaCode: '46060', oewsAreaCode: '46060', displayName: 'Tucson, AZ', areaType: 'msa' },
  { city: 'Fresno', state: 'CA', cbsaCode: '23420', oewsAreaCode: '23420', displayName: 'Fresno, CA', areaType: 'msa' },
  { city: 'Sacramento', state: 'CA', cbsaCode: '40900', oewsAreaCode: '40900', displayName: 'Sacramento-Roseville-Folsom, CA', areaType: 'msa' },
  { city: 'Kansas City', state: 'MO', cbsaCode: '28140', oewsAreaCode: '28140', displayName: 'Kansas City, MO-KS', areaType: 'msa' },
  { city: 'Atlanta', state: 'GA', cbsaCode: '12060', oewsAreaCode: '12060', displayName: 'Atlanta-Sandy Springs-Alpharetta, GA', areaType: 'msa' },
  { city: 'Miami', state: 'FL', cbsaCode: '33100', oewsAreaCode: '33100', displayName: 'Miami-Fort Lauderdale-Pompano Beach, FL', areaType: 'msa' },
  { city: 'Tampa', state: 'FL', cbsaCode: '45300', oewsAreaCode: '45300', displayName: 'Tampa-St. Petersburg-Clearwater, FL', areaType: 'msa' },
  { city: 'Orlando', state: 'FL', cbsaCode: '36740', oewsAreaCode: '36740', displayName: 'Orlando-Kissimmee-Sanford, FL', areaType: 'msa' },
  { city: 'Raleigh', state: 'NC', cbsaCode: '39580', oewsAreaCode: '39580', displayName: 'Raleigh-Cary, NC', areaType: 'msa' },
  { city: 'Minneapolis', state: 'MN', cbsaCode: '33460', oewsAreaCode: '33460', displayName: 'Minneapolis-St. Paul-Bloomington, MN-WI', areaType: 'msa' },
  { city: 'Cleveland', state: 'OH', cbsaCode: '17460', oewsAreaCode: '17460', displayName: 'Cleveland-Elyria, OH', areaType: 'msa' },
  { city: 'Pittsburgh', state: 'PA', cbsaCode: '38300', oewsAreaCode: '38300', displayName: 'Pittsburgh, PA', areaType: 'msa' },
  { city: 'Cincinnati', state: 'OH', cbsaCode: '17140', oewsAreaCode: '17140', displayName: 'Cincinnati, OH-KY-IN', areaType: 'msa' },
  { city: 'St. Louis', state: 'MO', cbsaCode: '41180', oewsAreaCode: '41180', displayName: 'St. Louis, MO-IL', areaType: 'msa' },
  { city: 'Salt Lake City', state: 'UT', cbsaCode: '41620', oewsAreaCode: '41620', displayName: 'Salt Lake City, UT', areaType: 'msa' },
  { city: 'San Jose', state: 'CA', cbsaCode: '41940', oewsAreaCode: '41940', displayName: 'San Jose-Sunnyvale-Santa Clara, CA', areaType: 'msa' },
  { city: 'Washington', state: 'DC', cbsaCode: '47900', oewsAreaCode: '47900', displayName: 'Washington-Arlington-Alexandria, DC-VA-MD-WV', areaType: 'msa' },
  { city: 'Richmond', state: 'VA', cbsaCode: '40060', oewsAreaCode: '40060', displayName: 'Richmond, VA', areaType: 'msa' },
  { city: 'Hartford', state: 'CT', cbsaCode: '25540', oewsAreaCode: '25540', displayName: 'Hartford-East Hartford-Middletown, CT', areaType: 'msa' },
  { city: 'Buffalo', state: 'NY', cbsaCode: '15380', oewsAreaCode: '15380', displayName: 'Buffalo-Cheektowaga, NY', areaType: 'msa' },
  { city: 'Rochester', state: 'NY', cbsaCode: '40380', oewsAreaCode: '40380', displayName: 'Rochester, NY', areaType: 'msa' },
  { city: 'Birmingham', state: 'AL', cbsaCode: '13820', oewsAreaCode: '13820', displayName: 'Birmingham-Hoover, AL', areaType: 'msa' },
]

// State-level fallback codes
export const STATE_CODES: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17',
  IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24',
  MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31',
  NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46',
  TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56', PR: '72'
}

// Search locations by city name or state abbreviation
export function searchLocations(query: string): LocationInfo[] {
  if (!query || query.length < 2) return []

  const q = query.toLowerCase().trim()

  return LOCATIONS.filter(loc =>
    loc.city.toLowerCase().includes(q) ||
    loc.state.toLowerCase().includes(q) ||
    loc.displayName.toLowerCase().includes(q)
  ).slice(0, 10)
}

// Find a location by city, state string (e.g., "San Francisco, CA")
export function findLocation(cityState: string): LocationInfo | null {
  const parts = cityState.split(',').map(s => s.trim())
  if (parts.length < 2) return null

  const city = parts[0].toLowerCase()
  const state = parts[1].toUpperCase()

  // Try exact match first
  const exact = LOCATIONS.find(l =>
    l.city.toLowerCase() === city && l.state === state
  )
  if (exact) return exact

  // Try partial city match
  const partial = LOCATIONS.find(l =>
    l.city.toLowerCase().includes(city) && l.state === state
  )
  if (partial) return partial

  // Fallback to state-level
  const stateCode = STATE_CODES[state]
  if (stateCode) {
    return {
      city: parts[0],
      state,
      cbsaCode: stateCode,
      oewsAreaCode: stateCode,
      displayName: state,
      areaType: 'state'
    }
  }

  return null
}
