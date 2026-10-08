const BASE=import.meta.env.VITE_API_URL||'http://localhost:5000';
let onAuthFail=()=>{};export const setAuthFail=f=>{onAuthFail=f};
export async function api(path,{method='GET',body}={}){const t=localStorage.getItem('token');let r;
try{r=await fetch(BASE+'/api'+path,{method,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:body?JSON.stringify(body):undefined})}
catch{throw new Error('Cannot reach the server. Check your connection and try again.')}
const d=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401&&t)onAuthFail();throw new Error(d.error||'Request failed.')}return d}
