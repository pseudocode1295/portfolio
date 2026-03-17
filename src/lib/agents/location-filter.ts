// Allowed locations: India (any city) or Remote/Worldwide
// Rejects jobs explicitly tied to other countries.

const INDIA_TERMS = [
  "india", "bangalore", "bengaluru", "mumbai", "delhi", "new delhi",
  "hyderabad", "pune", "chennai", "gurugram", "gurgaon", "noida",
  "kolkata", "ahmedabad", "jaipur", "kochi", "cochin", "chandigarh",
  "indore", "bhubaneswar", "coimbatore", "trivandrum", "vizag",
];

const REMOTE_TERMS = [
  "remote", "worldwide", "work from home", "wfh", "anywhere",
  "distributed", "global", "fully remote", "100% remote",
];

// Countries/regions to explicitly reject
const REJECT_COUNTRIES = [
  "united states", "usa", "us only", "u.s.", "canada", "uk", "united kingdom",
  "australia", "germany", "france", "singapore", "netherlands", "spain",
  "new york", "san francisco", "london", "toronto", "sydney", "berlin",
  "new jersey", "new brunswick", "california", "texas", "seattle",
  "chicago", "boston", "washington", "vancouver", "melbourne",
  "amsterdam", "dubai", "europe", "apac", "latam",
];

export function isLocationAllowed(location: string): boolean {
  if (!location) return true; // no location = don't filter out
  const loc = location.toLowerCase();

  // Explicitly reject known non-India/non-remote locations
  if (REJECT_COUNTRIES.some(c => loc.includes(c))) return false;

  // Allow if India city or remote/worldwide
  if (INDIA_TERMS.some(t => loc.includes(t))) return true;
  if (REMOTE_TERMS.some(t => loc.includes(t))) return true;

  // If location is vague (e.g. just "Asia", "South Asia") — allow
  if (loc.length < 5) return true;

  // Default: if location doesn't match any known country, allow it
  // (better to include than miss valid India/remote jobs with unusual formatting)
  return true;
}
