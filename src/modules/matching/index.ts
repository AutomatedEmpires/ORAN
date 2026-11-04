export type Preferences = {postal_code:string;needs:readonly string[]};
// A listing matches when one of its categories is a need and its published area is a ZIP area that lists the profile's ZIP, or nationwide. City, county and state areas match no ZIP yet (D4).
export function explainMatch(resource:{service_area:{kind:string;postal_codes?:readonly string[]}|null;categories:readonly string[]}, profile:Preferences): {reasons:string[];unknowns:string[]}|null {
 const code = resource.categories.find(c=>profile.needs.includes(c)), area = resource.service_area;
 const coverage = area?.kind==='nationwide' ? 'Published coverage is nationwide' : area?.kind==='zip' && area.postal_codes?.includes(profile.postal_code) ? 'Published coverage includes your ZIP code' : null;
 if (coverage === null || code === undefined) return null;
 return { reasons:['Matches your selected '+code+' need',coverage], unknowns:['Eligibility has not been determined','Current intake capacity is unknown; contact the organization'] };
}
