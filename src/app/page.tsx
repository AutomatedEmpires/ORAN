import { publicResources } from '@/modules/catalog';
import { messages } from '@/server/language';
import { OutageState } from '@/ui/get-help-now';
import { ResourceCards } from '@/ui/resources';
import { quickExitScope,showsQuickExit } from '@/ui/safety';
export default async function Home(){
 const {text:t}=await messages();let resources:Awaited<ReturnType<typeof publicResources>>=[],available=true;
 try{resources=await publicResources();}catch{available=false;}
 return <section {...quickExitScope(showsQuickExit(...resources.map(r=>r.categories)))}><div className="hero"><p className="eyebrow">{t.eyebrow}</p><h1>{t.headline}</h1><p className="lede">{t.lede}</p></div>{!available?<OutageState text={t}/>:resources.length?<ResourceCards resources={resources}/>:<p className="notice">{t.empty}</p>}</section>;
}
