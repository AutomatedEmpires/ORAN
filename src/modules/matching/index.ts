export type Preferences = {postal_code:string;needs:readonly string[]};
export function explainMatch(resource:{postal_code:string;categories:readonly string[]}, profile:Preferences): {reasons:string[];unknowns:string[]}|null {
 const code = resource.categories.find(c=>profile.needs.includes(c));
 if (resource.postal_code !== profile.postal_code || code === undefined) return null;
 return { reasons:['Matches your selected '+code+' need','Published coverage includes your ZIP code'], unknowns:['Eligibility has not been determined','Current intake capacity is unknown; contact the organization'] };
}
