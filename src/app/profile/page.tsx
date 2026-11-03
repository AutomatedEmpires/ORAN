import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { profileFor } from '@/modules/profiles';
import { listCategories,publicResources } from '@/modules/catalog';
import { explainMatch } from '@/modules/matching';
import { eraseProfileAction } from '@/server/actions';
import { ProfileForm } from '@/ui/forms';
import { ResourceCards } from '@/ui/resources';
export default async function Profile(){
 const actor=await requireActor(),{text:t,locale}=await messages(),categories=await listCategories(locale),profile=await profileFor(actor.user_id);
 const resources=profile?(await publicResources({postal_code:profile.postal_code,needs:profile.needs})).filter(r=>explainMatch(r,profile)):[];
 return <section><p className="eyebrow">{t.profile}</p><h1>{t.preferences}</h1><p>{t.profileIntro}</p><ProfileForm categories={categories} key={profile?.updated_at.toISOString()??'empty'} profile={profile}/>{profile?<form action={eraseProfileAction}><button className="secondary">{t.deleteProfile}</button></form>:null}<h2>{t.matches}</h2>{resources.length?<><p>{t.needReason} {t.zipReason}</p><ResourceCards resources={resources}/></>:<p>{t.noMatches}</p>}</section>;
}
