export const CITIES={Delhi:[28.61,77.21],Noida:[28.54,77.39],Ghaziabad:[28.67,77.44],Muzaffarnagar:[29.47,77.7],Meerut:[28.98,77.71],Lucknow:[26.85,80.95],Chandigarh:[30.73,76.78],Jaipur:[26.91,75.79],Mumbai:[19.08,72.88],Bangalore:[12.97,77.59]};
export const km=(a,b)=>{const A=CITIES[a],B=CITIES[b];if(!A||!B)return null;const R=Math.PI/180,x=Math.sin((B[0]-A[0])*R/2)**2+Math.cos(A[0]*R)*Math.cos(B[0]*R)*Math.sin((B[1]-A[1])*R/2)**2;return Math.round(12742*Math.asin(Math.sqrt(x)))};
const RETAIL={Hoodie:2500,Jeans:3000,Dress:2800,Jacket:4000,Shirt:1800,'T-shirt':1200,Sweater:2200,Kurta:1800,Sneakers:4500,Skirt:1800,Trousers:2500};
const BRAND={Nike:1.2,Adidas:1.2,Puma:1,"Levi's":1.1,Zara:1,'H&M':.9,Uniqlo:1.05,Mango:1,FabIndia:1.05,Biba:.95,W:.9,Other:.7};
const COND={New:.8,'Like new':.65,Good:.5,Fair:.3};
// value = retail price (given, or estimated from type x brand) x condition x age depreciation
export function calcValue({type,brand,condition,originalPrice,ageYears}){
  const retail=Number(originalPrice)>0?Number(originalPrice):(RETAIL[type]||2000)*(BRAND[brand]||.7);
  const v=retail*(COND[condition]||.4)*Math.max(.5,1-.08*(Number(ageYears)||0));
  return Math.max(100,Math.round(v/10)*10);
}
