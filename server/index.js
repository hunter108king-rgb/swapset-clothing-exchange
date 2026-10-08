import 'dotenv/config';import express from 'express';import cors from 'cors';import helmet from 'helmet';import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import mongoose from 'mongoose';
import {User,Item,Swap,Message,Report} from './models.js';import {calcValue,km,CITIES} from './lib.js';
const {MONGODB_URI,JWT_SECRET,CLIENT_URL,PORT=5000}=process.env;
if(!MONGODB_URI||!JWT_SECRET){console.error('Set MONGODB_URI and JWT_SECRET in .env');process.exit(1)}
const app=express();app.set('trust proxy',1);app.use(helmet());
app.use(cors({origin:(CLIENT_URL||'http://localhost:5173').split(',').map(s=>s.trim())}));
app.use(express.json({limit:'4mb'}));app.use('/api',rateLimit({windowMs:60000,limit:300}));
const authLimit=rateLimit({windowMs:900000,limit:40,message:{error:'Too many attempts. Try again in a few minutes.'}});
const ACTIVE=['PENDING','NEGOTIATING','ACCEPTED'];
const wrap=f=>(q,s,n)=>Promise.resolve(f(q,s,n)).catch(n);
const fail=(m,c=400)=>{const e=new Error(m);e.status=c;throw e};
const need=(b,...k)=>{for(const x of k)if(b[x]===undefined||b[x]==='')fail(`${x} is required.`)};
const oid=id=>{if(!mongoose.isValidObjectId(id))fail('Invalid ID.')};
const S=x=>String(x??'');const same=(a,b)=>S(a?._id||a)===S(b?._id||b);
const sign=u=>jwt.sign({id:u._id},JWT_SECRET,{expiresIn:'7d'});
const pub=u=>({id:u._id,name:u.name,email:u.email,city:u.city,bio:u.bio,role:u.role});
const auth=wrap(async(q,s,n)=>{let p;try{p=jwt.verify(S(q.headers.authorization).slice(7),JWT_SECRET)}catch(e){fail(e.name==='TokenExpiredError'?'Session expired. Please log in again.':'Please log in.',401)}
const u=await User.findById(p.id);if(!u||u.banned)fail('Account unavailable.',401);q.user=u;User.updateOne({_id:u._id},{lastActive:new Date()}).exec();n()});
const admin=(q,s,n)=>q.user.role==='admin'?n():s.status(403).json({error:'Admins only.'});

app.get('/api/health',(q,s)=>s.json({ok:true}));
app.get('/api/cities',(q,s)=>s.json(Object.keys(CITIES)));
app.get('/api/value',(q,s)=>s.json({value:calcValue({type:S(q.query.type),brand:S(q.query.brand),condition:S(q.query.condition),originalPrice:q.query.price,ageYears:q.query.age})}));

// ---- auth
app.post('/api/auth/register',authLimit,wrap(async(q,s)=>{const{name,email,password,city}=q.body;need(q.body,'name','email','password','city');
if(!/^\S+@\S+\.\S+$/.test(S(email)))fail('Enter a valid email.');if(S(password).length<8)fail('Password needs at least 8 characters.');if(!CITIES[city])fail('Choose a supported city.');
if(await User.findOne({email:S(email).toLowerCase()}))fail('That email is already registered.',409);
const u=await User.create({name:S(name).trim().slice(0,60),email:S(email),city,password:await bcrypt.hash(S(password),10)});s.status(201).json({token:sign(u),user:pub(u)})}));
app.post('/api/auth/login',authLimit,wrap(async(q,s)=>{need(q.body,'email','password');const u=await User.findOne({email:S(q.body.email).toLowerCase()});
if(!u||!(await bcrypt.compare(S(q.body.password),u.password)))fail('Email or password is incorrect.',401);if(u.banned)fail('This account has been suspended.',403);s.json({token:sign(u),user:pub(u)})}));

// ---- profile
app.get('/api/users/profile',auth,wrap(async(q,s)=>{const id=q.user._id,mine={$or:[{from:id},{to:id}]};
const[listings,requests,done]=await Promise.all([Item.countDocuments({owner:id}),Swap.countDocuments(mine),Swap.countDocuments({...mine,status:'COMPLETED'})]);
s.json({user:pub(q.user),stats:{listings,requests,successfulSwaps:done,itemsExchanged:done}})}));
app.put('/api/users/profile',auth,wrap(async(q,s)=>{const{name,city,bio}=q.body;if(name!==undefined){if(S(name).trim().length<2)fail('Enter your name.');q.user.name=S(name).trim().slice(0,60)}
if(city!==undefined){if(!CITIES[city])fail('Choose a supported city.');q.user.city=city}if(bio!==undefined)q.user.bio=S(bio).slice(0,300);await q.user.save();s.json({user:pub(q.user)})}));

// ---- items
const esc=x=>S(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
app.get('/api/items',wrap(async(q,s)=>{const{search,category,size,condition,brand,city,sort,near,owner,status}=q.query,f={};
if(status!=='ALL')f.status=S(status||'AVAILABLE');if(owner){oid(owner);f.owner=owner}
if(search){const r=new RegExp(esc(search),'i');f.$or=[{title:r},{brand:r},{description:r},{color:r}]}
for(const[k,v]of Object.entries({category,size,condition,brand,city}))if(v)f[k]=S(v);
const so=sort==='value_asc'?{value:1}:sort==='value_desc'?{value:-1}:{createdAt:-1};
const l=await Item.find(f).populate('owner','name city').sort(so).limit(200).lean();
if(near)l.forEach(i=>i.distance=km(S(near),i.city));if(sort==='nearest')l.sort((a,b)=>(a.distance??1e9)-(b.distance??1e9));s.json(l)}));
app.get('/api/items/:id',wrap(async(q,s)=>{oid(q.params.id);const i=await Item.findById(q.params.id).populate('owner','name city bio').lean();if(!i)fail('This listing was removed or does not exist.',404);s.json(i)}));
async function pics(a){a=(Array.isArray(a)?a:[]).filter(x=>typeof x==='string').slice(0,4);if(!process.env.CLOUDINARY_URL)return a;
const{v2:c}=await import('cloudinary');return Promise.all(a.map(x=>x.startsWith('data:')?c.uploader.upload(x,{folder:'swapset'}).then(r=>r.secure_url):x))}
const fields=(b,u)=>{need(b,'title','type','category','brand','size','condition','color');const o={};
for(const k of['title','type','category','brand','size','condition','color','description','city'])if(b[k]!==undefined)o[k]=S(b[k]).trim().slice(0,500);
o.city=o.city||u.city;if(!CITIES[o.city])fail('Choose a supported city.');o.originalPrice=Number(b.originalPrice)||0;o.ageYears=Number(b.ageYears)||0;o.value=calcValue(o);return o};
app.post('/api/items',auth,wrap(async(q,s)=>{const o=fields(q.body,q.user);o.images=await pics(q.body.images);s.status(201).json(await Item.create({...o,owner:q.user._id}))}));
app.put('/api/items/:id',auth,wrap(async(q,s)=>{oid(q.params.id);const i=await Item.findById(q.params.id);if(!i)fail('Listing not found.',404);
if(!same(i.owner,q.user)&&q.user.role!=='admin')fail('Not your listing.',403);if(i.status!=='AVAILABLE')fail('Items in a swap cannot be edited.',409);
Object.assign(i,fields(q.body,q.user));if(q.body.images)i.images=await pics(q.body.images);await i.save();s.json(i)}));
const release=w=>Item.updateMany({_id:{$in:[w.offered._id||w.offered,w.requested._id||w.requested]}},{status:'AVAILABLE'});
app.delete('/api/items/:id',auth,wrap(async(q,s)=>{oid(q.params.id);const i=await Item.findById(q.params.id);if(!i)fail('Listing not found.',404);
if(!same(i.owner,q.user)&&q.user.role!=='admin')fail('Not your listing.',403);if(i.status==='SWAPPED')fail('Swapped items stay in swap history.',409);
for(const w of await Swap.find({status:{$in:ACTIVE},$or:[{offered:i._id},{requested:i._id}]})){w.status='CANCELLED';await w.save();await release(w)}
await i.deleteOne();s.json({ok:true})}));

// ---- swaps
const pop=x=>x.populate([{path:'from',select:'name city'},{path:'to',select:'name city'},{path:'offered'},{path:'requested'}]);
const load=async q=>{oid(q.params.id);const w=await Swap.findById(q.params.id);if(!w)fail('Swap not found.',404);if(!same(w.from,q.user)&&!same(w.to,q.user)&&q.user.role!=='admin')fail('This is not your swap.',403);return w};
app.post('/api/swaps',auth,wrap(async(q,s)=>{const{offeredId,requestedId,message}=q.body;oid(offeredId);oid(requestedId);
const[o,r]=await Promise.all([Item.findById(offeredId),Item.findById(requestedId)]);if(!o||!r)fail('One of the items no longer exists.',404);
if(!same(o.owner,q.user))fail('You can only offer your own items.',403);if(same(r.owner,q.user))fail('You cannot request your own item.');
if(o.status!=='AVAILABLE'||r.status!=='AVAILABLE')fail('One of these items is no longer available.',409);
if(await Swap.findOne({offered:o._id,requested:r._id,status:{$in:ACTIVE}}))fail('You already sent this request.',409);
const w=await Swap.create({from:q.user._id,to:r.owner,offered:o._id,requested:r._id,message:S(message).slice(0,500)});s.status(201).json(w)}));
app.get('/api/swaps',auth,wrap(async(q,s)=>s.json(await pop(Swap.find({$or:[{from:q.user._id},{to:q.user._id}]}).sort({updatedAt:-1}).limit(200)).lean())));
app.get('/api/swaps/:id',auth,wrap(async(q,s)=>{const w=await load(q);s.json(await pop(w).then(x=>x.toObject()))}));
const act=(name,fn)=>app.put('/api/swaps/:id/'+name,auth,wrap(async(q,s)=>{const w=await load(q);await fn(w,q.user);await w.save();s.json(await pop(w).then(x=>x.toObject()))}));
const recv=(w,u)=>{if(!same(w.to,u))fail('Only the receiver can do this.',403)};
act('accept',async(w,u)=>{recv(w,u);if(!['PENDING','NEGOTIATING'].includes(w.status))fail('This request can no longer be accepted.',409);
const its=await Item.find({_id:{$in:[w.offered,w.requested]}});if(its.length<2||its.some(i=>i.status!=='AVAILABLE'))fail('One of the items is no longer available.',409);
await Item.updateMany({_id:{$in:[w.offered,w.requested]}},{status:'RESERVED'});w.status='ACCEPTED';
await Swap.updateMany({_id:{$ne:w._id},status:{$in:['PENDING','NEGOTIATING']},$or:[{offered:{$in:[w.offered,w.requested]}},{requested:{$in:[w.offered,w.requested]}}]},{status:'CANCELLED'})});
act('reject',async(w,u)=>{recv(w,u);if(!['PENDING','NEGOTIATING'].includes(w.status))fail('This request can no longer be rejected.',409);w.status='REJECTED'});
act('negotiate',async(w,u)=>{recv(w,u);if(w.status!=='PENDING')fail('Negotiation can only start on a pending request.',409);w.status='NEGOTIATING'});
act('cancel',async(w,u)=>{if(w.status==='ACCEPTED'){if(!same(w.from,u)&&!same(w.to,u))fail('Not your swap.',403);await release(w)}
else if(['PENDING','NEGOTIATING'].includes(w.status)){if(!same(w.from,u))fail('Only the sender can cancel a request.',403)}else fail('This swap can no longer be cancelled.',409);w.status='CANCELLED'});
act('complete',async(w,u)=>{if(w.status!=='ACCEPTED')fail('Only accepted swaps can be completed.',409);if(!same(w.from,u)&&!same(w.to,u))fail('Not your swap.',403);
if(!w.confirmedBy.some(x=>same(x,u)))w.confirmedBy.push(u._id);
if(w.confirmedBy.length>=2){w.status='COMPLETED';w.completedAt=new Date();await Item.updateMany({_id:{$in:[w.offered,w.requested]}},{status:'SWAPPED'})}});

// ---- chat
app.get('/api/messages/:id',auth,wrap(async(q,s)=>{await load(q);s.json(await Message.find({swap:q.params.id}).sort({createdAt:1}).populate('sender','name').lean())}));
app.post('/api/messages/:id',auth,wrap(async(q,s)=>{const w=await load(q);const t=S(q.body.text).trim();if(!t)fail('Type a message first.');
if(!['PENDING','NEGOTIATING','ACCEPTED'].includes(w.status))fail('Chat is closed for this swap.',409);
if(q.user.role==='admin'&&!same(w.from,q.user)&&!same(w.to,q.user))fail('Admins can read but not post.',403);
const m=await Message.create({swap:w._id,sender:q.user._id,text:t.slice(0,1000)});s.status(201).json(m)}));

// ---- reports
app.post('/api/reports',auth,wrap(async(q,s)=>{const{itemId,swapId,reason}=q.body;need(q.body,'reason');if(!itemId&&!swapId)fail('Nothing to report.');
if(itemId)oid(itemId);if(swapId){oid(swapId);q.params.id=swapId;await load(q)}
s.status(201).json(await Report.create({reporter:q.user._id,kind:swapId?'dispute':'item',item:itemId,swap:swapId,reason:S(reason).slice(0,500)}))}));

// ---- admin
const A=[auth,admin];
app.get('/api/admin/users',...A,wrap(async(q,s)=>s.json(await User.find().select('-password').sort({createdAt:-1}).lean())));
app.put('/api/admin/users/:id/ban',...A,wrap(async(q,s)=>{oid(q.params.id);const u=await User.findById(q.params.id);if(!u||u.role==='admin')fail('Cannot change this user.');u.banned=!u.banned;await u.save();s.json({banned:u.banned})}));
app.get('/api/admin/items',...A,wrap(async(q,s)=>s.json(await Item.find().populate('owner','name').sort({createdAt:-1}).lean())));
app.get('/api/admin/swaps',...A,wrap(async(q,s)=>s.json(await pop(Swap.find().sort({updatedAt:-1}).limit(200)).lean())));
app.get('/api/admin/reports',...A,wrap(async(q,s)=>s.json(await Report.find().populate('reporter','name').populate('item','title').sort({createdAt:-1}).lean())));
app.put('/api/admin/reports/:id',...A,wrap(async(q,s)=>{oid(q.params.id);const r=await Report.findById(q.params.id);if(!r)fail('Report not found.',404);
if(!['RESOLVED','DISMISSED'].includes(q.body.status))fail('Invalid status.');
if(q.body.cancelSwap&&r.swap){const w=await Swap.findById(r.swap);if(w&&ACTIVE.includes(w.status)){await release(w);w.status='CANCELLED';await w.save()}}
r.status=q.body.status;r.resolution=S(q.body.resolution).slice(0,300);await r.save();s.json(r)}));
app.get('/api/admin/analytics',...A,wrap(async(q,s)=>{const wk=new Date(Date.now()-7*864e5);
const[users,active,listings,pending,done,total,accepted,byStatus,byCity]=await Promise.all([User.countDocuments(),User.countDocuments({lastActive:{$gt:wk}}),Item.countDocuments(),Swap.countDocuments({status:{$in:['PENDING','NEGOTIATING']}}),Swap.countDocuments({status:'COMPLETED'}),Swap.countDocuments(),Swap.countDocuments({status:{$in:['ACCEPTED','COMPLETED']}}),
Swap.aggregate([{$group:{_id:'$status',n:{$sum:1}}}]),Item.aggregate([{$group:{_id:'$city',n:{$sum:1}}},{$sort:{n:-1}}])]);
s.json({users,active,listings,pending,done,conversion:total?Math.round(100*accepted/total):0,byStatus:byStatus.map(x=>({name:x._id,n:x.n})),byCity:byCity.map(x=>({name:x._id,n:x.n}))})}));

app.use('/api',(q,s)=>s.status(404).json({error:'Not found.'}));
app.use((e,q,s,n)=>{if(e.name==='CastError')e.status=400;if(e.code===11000){e.status=409;e.message='That already exists.'}const c=e.status||500;if(c===500)console.error(e);s.status(c).json({error:c===500?'Something went wrong. Please try again.':e.message})});
mongoose.connect(MONGODB_URI).then(()=>app.listen(PORT,()=>console.log('API on '+PORT))).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1)});
