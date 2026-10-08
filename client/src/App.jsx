import {createContext,useContext,useEffect,useState,useCallback} from 'react';
import {BrowserRouter,Routes,Route,Link,NavLink,Navigate,useNavigate,useParams} from 'react-router-dom';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import {api,setAuthFail} from './api.js';

const CITIES=['Delhi','Noida','Ghaziabad','Muzaffarnagar','Meerut','Lucknow','Chandigarh','Jaipur','Mumbai','Bangalore'];
const TYPES=['Hoodie','Jeans','Dress','Jacket','Shirt','T-shirt','Sweater','Kurta','Sneakers','Skirt','Trousers'];
const BRANDS=['Nike','Adidas','Puma',"Levi's",'Zara','H&M','Uniqlo','Mango','FabIndia','Biba','W','Other'];
const CONDS=['New','Like new','Good','Fair'],CATS=['Men','Women','Unisex','Kids'],SIZES=['XS','S','M','L','XL','28','30','32','34','UK 7','UK 8','UK 9'];
const EMOJI={Hoodie:'🧥',Jeans:'👖',Dress:'👗',Jacket:'🧥',Shirt:'👔',Kurta:'🥻',Sneakers:'👟',Sweater:'🧶',Skirt:'👗','T-shirt':'👕',Trousers:'👖'};
const COL={PENDING:'bg-amber-100 text-amber-800',NEGOTIATING:'bg-sky-100 text-sky-800',ACCEPTED:'bg-emerald-100 text-emerald-800',COMPLETED:'bg-leaf text-white',REJECTED:'bg-rose-100 text-rose-800',CANCELLED:'bg-stone-200 text-stone-700',AVAILABLE:'bg-emerald-100 text-emerald-800',RESERVED:'bg-amber-100 text-amber-800',SWAPPED:'bg-stone-200 text-stone-700',OPEN:'bg-rose-100 text-rose-800',RESOLVED:'bg-emerald-100 text-emerald-800',DISMISSED:'bg-stone-200 text-stone-700'};
const inp='w-full rounded-lg border border-black/15 bg-white px-3 py-2 mb-3 focus:outline-2 focus:outline-leaf';
const btn='rounded-lg bg-leaf px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer';
const btn2='rounded-lg border border-black/20 px-4 py-2 font-semibold hover:bg-black/5 cursor-pointer';
const money=n=>'₹'+Number(n).toLocaleString('en-IN');
const when=d=>new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
function fairness(a,b){const d=Math.abs(a-b),r=d/Math.max(a,b,1);return r<=.15?['FAIR SWAP','bg-emerald-100 text-emerald-800',d]:r<=.35?['SLIGHTLY UNBALANCED','bg-amber-100 text-amber-800',d]:['SIGNIFICANTLY UNBALANCED','bg-rose-100 text-rose-800',d]}
const shrink=f=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,700/im.width),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.75))};im.src=fr.result};fr.readAsDataURL(f)});

const Ctx=createContext();const useApp=()=>useContext(Ctx);
function Provider({children}){const[user,setUser]=useState(null),[ready,setReady]=useState(false),[toasts,setT]=useState([]);
const toast=(m,bad)=>{const id=Math.random();setT(t=>[...t,{id,m,bad}]);setTimeout(()=>setT(t=>t.filter(x=>x.id!==id)),3500)};
const logout=useCallback(()=>{localStorage.removeItem('token');setUser(null)},[]);
useEffect(()=>{setAuthFail(()=>{logout();toast('Session expired. Please log in again.',1)});
if(localStorage.getItem('token'))api('/users/profile').then(d=>setUser(d.user)).catch(()=>logout()).finally(()=>setReady(true));else setReady(true)},[]);
const login=d=>{localStorage.setItem('token',d.token);setUser(d.user)};
return<Ctx.Provider value={{user,setUser,ready,toast,login,logout}}>{children}
<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">{toasts.map(t=><div key={t.id} className={`rounded-full px-5 py-2 text-white shadow-lg ${t.bad?'bg-pop':'bg-ink'}`}>{t.m}</div>)}</div></Ctx.Provider>}
const Guard=({admin,children})=>{const{user,ready}=useApp();if(!ready)return<Spin/>;if(!user)return<Navigate to="/login"/>;if(admin&&user.role!=='admin')return<Navigate to="/"/>;return children};
const Spin=()=><p className="p-10 text-center text-black/50">Loading…</p>;
const Empty=({children})=><p className="rounded-xl border border-dashed border-black/20 p-8 text-center text-black/60">{children}</p>;
const Badge=({s})=><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COL[s]||'bg-stone-100'}`}>{s}</span>;
const Tile=({i,h='h-52'})=>i.images?.[0]?<img src={i.images[0]} alt={i.title} className={`${h} w-full object-cover`}/>:<div className={`${h} flex w-full items-center justify-center text-6xl`} style={{background:`hsl(${(i.title.length*37)%360} 30% 85%)`}}>{EMOJI[i.type]||'👕'}</div>;
const Card=({i})=><Link to={`/items/${i._id}`} className="block overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-1 hover:shadow-lg"><Tile i={i}/>
<div className="p-3"><h3 className="font-semibold leading-tight">{i.title}</h3><p className="text-sm text-black/60">{i.brand} · {i.size} · {i.condition}</p><div className="mt-1 flex justify-between text-sm"><span>{i.city}{i.distance!=null&&` · ${i.distance} km`}</span><b>{money(i.value)}</b></div></div></Link>;
const Err=({e})=>e?<p className="mb-3 text-sm text-pop">{e}</p>:null;
const Page=({title,children,right})=><div className="mx-auto max-w-5xl px-4 py-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>{right}</div>{children}</div>;
function useLoad(path,deps=[]){const[d,setD]=useState(null),[e,setE]=useState('');const run=useCallback(()=>api(path).then(setD).catch(x=>setE(x.message)),[path]);useEffect(()=>{setD(null);setE('');run()},[path,...deps]);return[d,e,run]}

function Nav(){const{user,logout}=useApp();const nav=useNavigate();const L=({to,children})=><NavLink to={to} className={({isActive})=>`rounded-lg px-3 py-1.5 ${isActive?'bg-leaf text-white':'hover:bg-black/5'}`}>{children}</NavLink>;
return<header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur"><nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2">
<Link to="/" className="mr-auto text-2xl font-extrabold tracking-tight">swap<span className="text-pop">set</span></Link><L to="/market">Browse</L>
{user?<><L to="/items/new">List item</L><L to="/swaps">Swaps</L><L to="/dashboard">Dashboard</L><L to="/history">History</L><L to="/profile">Profile</L>{user.role==='admin'&&<L to="/admin">Admin</L>}<button className="rounded-lg px-3 py-1.5 hover:bg-black/5" onClick={()=>{logout();nav('/')}}>Log out</button></>:<><L to="/login">Log in</L><Link to="/register" className={btn}>Sign up</Link></>}</nav></header>}

function Landing(){const[items]=useLoad('/items?sort=newest');const{user}=useApp();
return<><section className="bg-leaf text-white"><div className="mx-auto max-w-5xl px-4 py-16"><h1 className="max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-tight">Swap what you've outgrown for what you'll actually wear.</h1>
<p className="mt-4 max-w-xl text-lg text-white/80">No money changes hands. List a piece, find something nearby, agree on the swap in chat.</p>
<div className="mt-6 flex gap-3"><Link to="/market" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-leaf">Browse clothes</Link><Link to={user?'/items/new':'/register'} className="rounded-lg border border-white/50 px-5 py-2.5 font-semibold">{user?'List an item':'Create account'}</Link></div></div></section>
<Page title="Just listed">{!items?<Spin/>:<div className="grid grid-cols-2 gap-4 md:grid-cols-4">{items.slice(0,8).map(i=><Card key={i._id} i={i}/>)}</div>}</Page>
<section className="mx-auto max-w-5xl px-4 pb-12"><h2 className="mb-3 text-2xl font-bold">How a swap works</h2><ol className="grid gap-3 md:grid-cols-4">{['List a piece you no longer wear','Find something you like nearby','Offer one of your items and chat','Both confirm and exchange it'].map((t,i)=><li key={i} className="rounded-xl bg-white p-4"><b className="text-leaf">Step {i+1}</b><p>{t}</p></li>)}</ol></section></>}

function Auth({reg}){const{login,toast}=useApp(),nav=useNavigate();const[f,setF]=useState({name:'',email:'',password:'',city:'Delhi'}),[e,setE]=useState(''),[b,setB]=useState(false);
const set=k=>x=>setF({...f,[k]:x.target.value});
const go=async ev=>{ev.preventDefault();setE('');setB(true);try{const d=await api(reg?'/auth/register':'/auth/login',{method:'POST',body:f});login(d);toast(reg?'Welcome to Swapset!':'Welcome back');nav(d.user.role==='admin'?'/admin':'/dashboard')}catch(x){setE(x.message)}setB(false)};
return<Page title={reg?'Create your account':'Log in'}><form onSubmit={go} className="max-w-sm rounded-2xl border border-black/10 bg-white p-5">{reg&&<><label>Name</label><input className={inp} value={f.name} onChange={set('name')} required/></>}
<label>Email</label><input className={inp} type="email" value={f.email} onChange={set('email')} required/><label>Password{reg&&' (min 8 characters)'}</label><input className={inp} type="password" value={f.password} onChange={set('password')} required/>
{reg&&<><label>City</label><select className={inp} value={f.city} onChange={set('city')}>{CITIES.map(c=><option key={c}>{c}</option>)}</select></>}<Err e={e}/><button className={btn} disabled={b}>{b?'Please wait…':reg?'Sign up':'Log in'}</button>
<p className="mt-3 text-sm text-black/60">{reg?<>Have an account? <Link className="underline" to="/login">Log in</Link></>:<>New here? <Link className="underline" to="/register">Create an account</Link></>}</p></form></Page>}

function Market(){const{user}=useApp();const[f,setF]=useState({search:'',category:'',size:'',condition:'',brand:'',city:'',sort:'newest'}),[q,setQ]=useState(f);
useEffect(()=>{const t=setTimeout(()=>setQ(f),300);return()=>clearTimeout(t)},[f]);
const qs=new URLSearchParams({...Object.fromEntries(Object.entries(q).filter(([,v])=>v)),...(user?{near:user.city}:{})}).toString();
const[items,err]=useLoad('/items?'+qs);const S=(k,label,opts)=><select aria-label={label} className={inp+' !mb-0 w-auto'} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}><option value="">{label}</option>{opts.map(o=><option key={o}>{o}</option>)}</select>;
return<Page title="Browse clothes"><div className="mb-5 flex flex-wrap gap-2"><input className={inp+' !mb-0 flex-1 min-w-48'} placeholder="Search brand, item or colour" value={f.search} onChange={e=>setF({...f,search:e.target.value})}/>
{S('category','Category',CATS)}{S('size','Size',SIZES)}{S('condition','Condition',CONDS)}{S('brand','Brand',BRANDS)}{S('city','City',CITIES)}
<select aria-label="Sort" className={inp+' !mb-0 w-auto'} value={f.sort} onChange={e=>setF({...f,sort:e.target.value})}><option value="newest">Newest</option><option value="value_desc">Value: high to low</option><option value="value_asc">Value: low to high</option>{user&&<option value="nearest">Nearest first</option>}</select></div>
<Err e={err}/>{!items?<Spin/>:items.length?<div className="grid grid-cols-2 gap-4 md:grid-cols-4">{items.map(i=><Card key={i._id} i={i}/>)}</div>:<Empty>No items match these filters. Clear a filter to see more.</Empty>}</Page>}

function Detail(){const{id}=useParams(),{user,toast}=useApp(),nav=useNavigate();const[i,err]=useLoad('/items/'+id);const[open,setOpen]=useState(false);
if(err)return<Page title="Listing unavailable"><Empty>{err}</Empty></Page>;if(!i)return<Spin/>;const mine=user&&i.owner._id===user.id;
const del=async()=>{if(!confirm('Remove this listing? Open requests for it will be cancelled.'))return;try{await api('/items/'+id,{method:'DELETE'});toast('Listing removed');nav('/dashboard')}catch(e){toast(e.message,1)}};
const report=async()=>{const reason=prompt('What is wrong with this listing?');if(!reason)return;try{await api('/reports',{method:'POST',body:{itemId:id,reason}});toast('Report sent to our team')}catch(e){toast(e.message,1)}};
return<Page title={i.title}><div className="grid gap-6 md:grid-cols-2"><div className="overflow-hidden rounded-2xl border border-black/10 bg-white"><Tile i={i} h="h-96"/></div><div>
<div className="mb-3 flex flex-wrap gap-2"><Badge s={i.status}/>{[i.type,i.category,i.brand,'Size '+i.size,i.condition,i.color].map(t=><span key={t} className="rounded-full border border-black/15 px-2.5 py-0.5 text-sm">{t}</span>)}</div>
<p className="text-black/70">{i.description}</p><p className="mt-4 text-sm text-black/60">Estimated value</p><p className="text-3xl font-extrabold">{money(i.value)}</p>
<p className="mt-3 text-sm text-black/60">Listed by {i.owner.name} · {i.city} · {new Date(i.createdAt).toLocaleDateString('en-IN')}</p>
<div className="mt-5 flex flex-wrap gap-2">{mine?<><Link className={btn} to={`/items/${id}/edit`}>Edit</Link><button className={btn2} onClick={del}>Remove</button></>:i.status!=='AVAILABLE'?<p className="text-black/60">This item is in a swap and can't be requested.</p>:user?<><button className={btn} onClick={()=>setOpen(true)}>Request swap</button><button className={btn2} onClick={report}>Report</button></>:<Link className={btn} to="/login">Log in to request a swap</Link>}</div></div></div>
{open&&<SwapModal target={i} close={()=>setOpen(false)}/>}</Page>}

function SwapModal({target,close}){const{user,toast}=useApp(),nav=useNavigate();const[mine]=useLoad(`/items?owner=${user.id}&status=AVAILABLE`);const[sel,setSel]=useState(''),[msg,setMsg]=useState("Hi! I'd love to swap for this."),[b,setB]=useState(false);
const o=mine?.find(x=>x._id===sel),F=o&&fairness(o.value,target.value);
const send=async()=>{setB(true);try{const w=await api('/swaps',{method:'POST',body:{offeredId:sel,requestedId:target._id,message:msg}});toast('Swap request sent');nav('/swaps/'+w._id)}catch(e){toast(e.message,1)}setB(false)};
return<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="max-h-full w-full max-w-lg overflow-auto rounded-2xl bg-white p-5">
<h2 className="mb-3 text-xl font-bold">Offer an item for {target.title}</h2>{!mine?<Spin/>:!mine.length?<Empty>You have no available items. <Link className="underline" to="/items/new">List one first</Link>.</Empty>:<>
<div className="mb-3 grid grid-cols-2 gap-2">{mine.map(m=><button key={m._id} onClick={()=>setSel(m._id)} className={`overflow-hidden rounded-xl border-2 text-left ${sel===m._id?'border-leaf':'border-transparent bg-stone-50'}`}><Tile i={m} h="h-24"/><div className="p-2 text-sm"><b>{m.title}</b><br/>{money(m.value)}</div></button>)}</div>
{F&&<div className="mb-3 rounded-xl bg-stone-50 p-3 text-sm"><p>Your item: <b>{money(o.value)}</b></p><p>Requested item: <b>{money(target.value)}</b></p><p>Difference: <b>{money(F[2])}</b></p><span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 font-semibold ${F[1]}`}>{F[0]}</span><p className="mt-1 text-black/60">No payment needed. You can negotiate in chat.</p></div>}
<textarea className={inp} rows={3} value={msg} onChange={e=>setMsg(e.target.value)}/></>}
<div className="flex gap-2"><button className={btn} disabled={!sel||b} onClick={send}>{b?'Sending…':'Send request'}</button><button className={btn2} onClick={close}>Cancel</button></div></div></div>}

function Form(){const{id}=useParams(),{user,toast}=useApp(),nav=useNavigate();const[f,setF]=useState({title:'',type:'Hoodie',category:'Unisex',brand:'Nike',size:'M',condition:'Good',color:'',description:'',city:user.city,originalPrice:'',ageYears:'',images:[]}),[val,setVal]=useState(null),[e,setE]=useState(''),[b,setB]=useState(false);
useEffect(()=>{if(id)api('/items/'+id).then(i=>setF({...i,originalPrice:i.originalPrice||'',ageYears:i.ageYears||''})).catch(x=>setE(x.message))},[id]);
useEffect(()=>{const t=setTimeout(()=>api('/value?'+new URLSearchParams({type:f.type,brand:f.brand,condition:f.condition,price:f.originalPrice||0,age:f.ageYears||0})).then(d=>setVal(d.value)).catch(()=>{}),250);return()=>clearTimeout(t)},[f.type,f.brand,f.condition,f.originalPrice,f.ageYears]);
const set=k=>x=>setF({...f,[k]:x.target.value});const S=(k,l,o)=><div><label>{l}</label><select className={inp} value={f[k]} onChange={set(k)}>{o.map(x=><option key={x}>{x}</option>)}</select></div>;
const pick=async ev=>setF({...f,images:[...f.images,...await Promise.all([...ev.target.files].slice(0,3).map(shrink))].slice(0,3)});
const save=async ev=>{ev.preventDefault();setE('');setB(true);try{const i=await api(id?'/items/'+id:'/items',{method:id?'PUT':'POST',body:f});toast('Listing saved');nav('/items/'+i._id)}catch(x){setE(x.message)}setB(false)};
return<Page title={id?'Edit listing':'List an item'}><form onSubmit={save} className="max-w-2xl rounded-2xl border border-black/10 bg-white p-5"><label>Title</label><input className={inp} value={f.title} onChange={set('title')} placeholder="e.g. Levi's 501 Jeans" required/>
<div className="grid grid-cols-2 gap-x-3 md:grid-cols-3">{S('type','Type',TYPES)}{S('category','Category',CATS)}{S('brand','Brand',BRANDS)}{S('size','Size',SIZES)}{S('condition','Condition',CONDS)}{S('city','City',CITIES)}</div>
<div className="grid grid-cols-3 gap-x-3"><div><label>Colour</label><input className={inp} value={f.color} onChange={set('color')} required/></div><div><label>Original price (₹)</label><input className={inp} type="number" min="0" value={f.originalPrice} onChange={set('originalPrice')}/></div><div><label>Age (years)</label><input className={inp} type="number" min="0" step=".5" value={f.ageYears} onChange={set('ageYears')}/></div></div>
<label>Description</label><textarea className={inp} rows={3} value={f.description} onChange={set('description')}/><label>Photos (up to 3)</label><input className={inp} type="file" accept="image/*" multiple onChange={pick}/>
<div className="mb-3 flex gap-2">{f.images.map((s,k)=><img key={k} src={s} alt="" className="h-16 w-16 rounded-lg object-cover"/>)}</div>
<p className="mb-3 rounded-lg bg-stone-50 p-3">Estimated value: <b className="text-xl">{val?money(val):'…'}</b></p><Err e={e}/><button className={btn} disabled={b}>{b?'Saving…':'Save listing'}</button></form></Page>}

function SwapList({title,filter}){const{user}=useApp();const[l,err]=useLoad('/swaps');const[tab,setTab]=useState('all');
const rows=(l||[]).filter(w=>filter?filter(w):tab==='in'?w.to._id===user.id:tab==='out'?w.from._id===user.id:true);
return<Page title={title} right={!filter&&<div className="flex gap-1">{[['all','All'],['in','Incoming'],['out','Sent']].map(([k,t])=><button key={k} onClick={()=>setTab(k)} className={tab===k?btn:btn2}>{t}</button>)}</div>}><Err e={err}/>
{!l?<Spin/>:!rows.length?<Empty>Nothing here yet. <Link className="underline" to="/market">Browse clothes</Link> to start a swap.</Empty>:<div className="space-y-3">{rows.map(w=><Link key={w._id} to={'/swaps/'+w._id} className="block rounded-2xl border border-black/10 bg-white p-4 hover:shadow-md"><div className="flex items-center justify-between"><b>{w.offered.title} ⇄ {w.requested.title}</b><Badge s={w.status}/></div>
<p className="text-sm text-black/60">{w.to._id===user.id?'From '+w.from.name:'To '+w.to.name} · {when(w.updatedAt)}</p></Link>)}</div>}</Page>}

function SwapDetail(){const{id}=useParams(),{user,toast}=useApp();const[w,setW]=useState(null),[m,setM]=useState([]),[e,setE]=useState(''),[t,setTx]=useState('');
const load=useCallback(()=>Promise.all([api('/swaps/'+id),api('/messages/'+id)]).then(([a,b])=>{setW(a);setM(b)}).catch(x=>setE(x.message)),[id]);
useEffect(()=>{load();const k=setInterval(load,4000);return()=>clearInterval(k)},[load]);
if(e)return<Page title="Swap"><Empty>{e}</Empty></Page>;if(!w)return<Spin/>;
const recv=w.to._id===user.id,part=recv||w.from._id===user.id,F=fairness(w.offered.value,w.requested.value),done=w.confirmedBy.includes(user.id);
const act=async(a,c)=>{if(c&&!confirm(c))return;try{await api(`/swaps/${id}/${a}`,{method:'PUT'});toast('Updated');load()}catch(x){toast(x.message,1)}};
const send=async ev=>{ev.preventDefault();if(!t.trim())return;try{await api('/messages/'+id,{method:'POST',body:{text:t}});setTx('');load()}catch(x){toast(x.message,1)}};
const dispute=async()=>{const reason=prompt('Describe the problem');if(!reason)return;try{await api('/reports',{method:'POST',body:{swapId:id,reason}});toast('Dispute sent to admin')}catch(x){toast(x.message,1)}};
const Box=({i,l})=><Link to={'/items/'+i._id} className="block overflow-hidden rounded-xl border border-black/10 bg-white"><Tile i={i} h="h-32"/><div className="p-2 text-sm"><span className="text-black/50">{l}</span><br/><b>{i.title}</b><br/>{money(i.value)}</div></Link>;
const open=['PENDING','NEGOTIATING','ACCEPTED'].includes(w.status);
return<Page title="Swap" right={<Badge s={w.status}/>}><div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><Box i={w.offered} l={w.from.name+' offers'}/><span className="text-2xl">⇄</span><Box i={w.requested} l={w.to.name+' gives'}/></div>
<p className="mb-4 text-sm"><span className={`rounded-full px-2.5 py-0.5 font-semibold ${F[1]}`}>{F[0]}</span> <span className="text-black/60">Difference {money(F[2])}. No payment needed.</span></p>
<div className="mb-4 flex flex-wrap gap-2">{part&&recv&&w.status==='PENDING'&&<button className={btn2} onClick={()=>act('negotiate')}>Start negotiation</button>}{recv&&['PENDING','NEGOTIATING'].includes(w.status)&&<><button className={btn} onClick={()=>act('accept','Accept this swap? Both items will be reserved.')}>Accept</button><button className={btn2} onClick={()=>act('reject','Reject this request?')}>Reject</button></>}
{!recv&&part&&['PENDING','NEGOTIATING'].includes(w.status)&&<button className={btn2} onClick={()=>act('cancel','Cancel your request?')}>Cancel request</button>}
{part&&w.status==='ACCEPTED'&&<><button className={btn} disabled={done} onClick={()=>act('complete','Confirm the exchange has happened?')}>{done?'Waiting for the other person':'Confirm swap completed'}</button><button className={btn2} onClick={()=>act('cancel','Cancel this accepted swap? Items return to the marketplace.')}>Cancel swap</button></>}
{part&&<button className={btn2} onClick={dispute}>Report a problem</button>}</div>
<div className="rounded-2xl border border-black/10 bg-white p-3"><div className="mb-3 h-72 space-y-2 overflow-auto rounded-xl bg-paper p-3">{w.message&&<p className="text-center text-sm text-black/50">Request: “{w.message}”</p>}
{m.map(x=>{const me=x.sender._id===user.id;return<div key={x._id} className={`max-w-[75%] rounded-2xl px-3 py-1.5 ${me?'ml-auto bg-leaf text-white':'bg-white'}`}><p>{x.text}</p><p className={`text-[11px] ${me?'text-white/70':'text-black/40'}`}>{x.sender.name} · {when(x.createdAt)}</p></div>})}{!m.length&&<p className="text-center text-black/40">No messages yet. Say hello and agree on details.</p>}</div>
{part&&open?<form onSubmit={send} className="flex gap-2"><input className={inp+' !mb-0'} value={t} onChange={x=>setTx(x.target.value)} placeholder="Type a message"/><button className={btn}>Send</button></form>:<p className="text-sm text-black/50">Chat is closed for this swap.</p>}</div></Page>}

function Dashboard(){const{user}=useApp();const[p]=useLoad('/users/profile');const[mine]=useLoad(`/items?owner=${user.id}&status=ALL`);const[sw]=useLoad('/swaps');
if(!p||!mine||!sw)return<Spin/>;const st=p.stats,L=(x)=>sw.filter(x),inc=L(w=>w.to._id===user.id&&['PENDING','NEGOTIATING'].includes(w.status)),out=L(w=>w.from._id===user.id&&['PENDING','NEGOTIATING'].includes(w.status)),acts=L(w=>w.status==='ACCEPTED');
const List=({t,l})=><section className="mb-6"><h2 className="mb-2 text-xl font-bold">{t}</h2>{l.length?l.map(w=><Link key={w._id} to={'/swaps/'+w._id} className="mb-2 block rounded-xl border border-black/10 bg-white p-3 hover:shadow">{w.offered.title} ⇄ {w.requested.title} <Badge s={w.status}/></Link>):<Empty>None right now.</Empty>}</section>;
return<Page title={`Hi, ${user.name.split(' ')[0]}`} right={<Link className={btn} to="/items/new">List an item</Link>}><div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Listings',st.listings],['Swap requests',st.requests],['Successful swaps',st.successfulSwaps],['Items exchanged',st.itemsExchanged]].map(([k,v])=><div key={k} className="rounded-2xl bg-white p-4"><p className="text-3xl font-extrabold text-leaf">{v}</p><p className="text-sm text-black/60">{k}</p></div>)}</div>
<List t="Incoming requests" l={inc}/><List t="Sent requests" l={out}/><List t="Active swaps" l={acts}/>
<h2 className="mb-2 text-xl font-bold">My listings</h2>{mine.length?<div className="grid grid-cols-2 gap-4 md:grid-cols-4">{mine.map(i=><div key={i._id}><Card i={i}/><div className="mt-1 flex justify-between"><Badge s={i.status}/>{i.status==='AVAILABLE'&&<Link className="text-sm underline" to={`/items/${i._id}/edit`}>Edit</Link>}</div></div>)}</div>:<Empty>You haven't listed anything yet.</Empty>}</Page>}

function Profile(){const{user,setUser,toast}=useApp();const[f,setF]=useState({name:user.name,city:user.city,bio:user.bio||''}),[e,setE]=useState('');
const save=async ev=>{ev.preventDefault();setE('');try{const d=await api('/users/profile',{method:'PUT',body:f});setUser(d.user);toast('Profile updated')}catch(x){setE(x.message)}};
return<Page title="Profile"><form onSubmit={save} className="max-w-md rounded-2xl border border-black/10 bg-white p-5"><label>Name</label><input className={inp} value={f.name} onChange={x=>setF({...f,name:x.target.value})}/><label>Email</label><input className={inp+' bg-stone-100'} value={user.email} disabled/>
<label>City (shown instead of your address)</label><select className={inp} value={f.city} onChange={x=>setF({...f,city:x.target.value})}>{CITIES.map(c=><option key={c}>{c}</option>)}</select><label>About you</label><textarea className={inp} rows={3} value={f.bio} onChange={x=>setF({...f,bio:x.target.value})}/><Err e={e}/><button className={btn}>Save profile</button></form></Page>}

function Admin(){const{toast}=useApp();const[tab,setTab]=useState('analytics');const[d,err,re]=useLoad('/admin/'+tab,[tab]);
const run=async(p,o,msg)=>{try{await api(p,o);toast(msg);re()}catch(x){toast(x.message,1)}};
const T=({h,rows})=><div className="overflow-x-auto rounded-xl bg-white"><table className="w-full text-left text-sm"><thead><tr>{h.map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-black/10">{r.map((c,j)=><td key={j} className="p-2">{c}</td>)}</tr>)}</tbody></table></div>;
const Ch=({data,t})=><div className="rounded-xl bg-white p-3"><p className="mb-1 font-semibold">{t}</p><ResponsiveContainer width="100%" height={200}><BarChart data={data}><XAxis dataKey="name" fontSize={11}/><YAxis allowDecimals={false} fontSize={11}/><Tooltip/><Bar dataKey="n" fill="#1F5C45"/></BarChart></ResponsiveContainer></div>;
let body=<Spin/>;if(err)body=<Err e={err}/>;else if(d){
if(tab==='analytics')body=<><div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">{[['Total users',d.users],['Active users (7d)',d.active],['Total listings',d.listings],['Pending swaps',d.pending],['Successful swaps',d.done],['Request conversion',d.conversion+'%']].map(([k,v])=><div key={k} className="rounded-2xl bg-white p-4"><p className="text-3xl font-extrabold text-leaf">{v}</p><p className="text-sm text-black/60">{k}</p></div>)}</div><div className="grid gap-3 md:grid-cols-2"><Ch data={d.byStatus} t="Swaps by status"/><Ch data={d.byCity} t="Listings by city"/></div></>;
if(tab==='users')body=<T h={['Name','Email','City','Status','']} rows={d.map(u=>[u.name,u.email,u.city,u.banned?'Suspended':u.role,u.role!=='admin'&&<button className={btn2} onClick={()=>confirm('Change this account?')&&run(`/admin/users/${u._id}/ban`,{method:'PUT'},'Updated')}>{u.banned?'Restore':'Suspend'}</button>])}/>;
if(tab==='items')body=<T h={['Item','Owner','City','Status','']} rows={d.map(i=>[<Link className="underline" to={'/items/'+i._id}>{i.title}</Link>,i.owner?.name,i.city,<Badge s={i.status}/>,i.status!=='SWAPPED'&&<button className={btn2} onClick={()=>confirm('Remove this listing?')&&run('/items/'+i._id,{method:'DELETE'},'Listing removed')}>Remove</button>])}/>;
if(tab==='swaps')body=<T h={['Swap','Status','Updated','']} rows={d.map(w=>[`${w.offered.title} ⇄ ${w.requested.title}`,<Badge s={w.status}/>,when(w.updatedAt),<Link className="underline" to={'/swaps/'+w._id}>View chat</Link>])}/>;
if(tab==='reports')body=d.length?<T h={['Type','Reason','By','Status','']} rows={d.map(r=>[r.kind,<>{r.reason}{r.item&&<> · <Link className="underline" to={'/items/'+r.item._id}>{r.item.title}</Link></>}{r.swap&&<> · <Link className="underline" to={'/swaps/'+r.swap}>swap</Link></>}</>,r.reporter?.name,<Badge s={r.status}/>,r.status==='OPEN'&&<span className="flex gap-1"><button className={btn2} onClick={()=>run('/admin/reports/'+r._id,{method:'PUT',body:{status:'RESOLVED',cancelSwap:r.kind==='dispute'}},'Resolved')}>{r.kind==='dispute'?'Cancel swap & resolve':'Resolve'}</button><button className={btn2} onClick={()=>run('/admin/reports/'+r._id,{method:'PUT',body:{status:'DISMISSED'}},'Dismissed')}>Dismiss</button></span>])}/>:<Empty>No reports.</Empty>}
return<Page title="Admin"><div className="mb-4 flex flex-wrap gap-1">{[['analytics','Overview'],['users','Users'],['items','Listings'],['swaps','Swap activity'],['reports','Reports & disputes']].map(([k,l])=><button key={k} className={tab===k?btn:btn2} onClick={()=>setTab(k)}>{l}</button>)}</div>{body}</Page>}

export default function App(){return<BrowserRouter><Provider><Nav/><Routes>
<Route path="/" element={<Landing/>}/><Route path="/login" element={<Auth/>}/><Route path="/register" element={<Auth reg/>}/><Route path="/market" element={<Market/>}/><Route path="/items/new" element={<Guard><Form/></Guard>}/><Route path="/items/:id" element={<Detail/>}/><Route path="/items/:id/edit" element={<Guard><Form/></Guard>}/>
<Route path="/swaps" element={<Guard><SwapList title="Swap requests"/></Guard>}/><Route path="/swaps/:id" element={<Guard><SwapDetail/></Guard>}/><Route path="/dashboard" element={<Guard><Dashboard/></Guard>}/><Route path="/history" element={<Guard><SwapList title="Swap history" filter={w=>['COMPLETED','REJECTED','CANCELLED'].includes(w.status)}/></Guard>}/>
<Route path="/profile" element={<Guard><Profile/></Guard>}/><Route path="/admin" element={<Guard admin><Admin/></Guard>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></Provider></BrowserRouter>}
