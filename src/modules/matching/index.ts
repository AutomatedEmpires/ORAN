export type Preferences = {postal_code:string;needs:readonly string[]};
export function explainMatch(resource:{postal_code:string;category:string}, profile:Preferences) {
 if (resource.postal_code !== profile.postal_code || !profile.needs.includes(resource.category)) return null;
 return { reasons:['Matches your selected '+resource.category+' need','Published coverage includes your ZIP code'], unknowns:['Eligibility has not been determined','Current intake capacity is unknown; contact the organization'] };
}
