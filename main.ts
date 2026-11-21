import fs from"node:fs";
const I=process.env.MAKEFUN_INPUT_DIR||"/input",O=process.env.MAKEFUN_OUTPUT_DIR||"/output",D="udlr",U="UDLR",J=(a,b)=>a-b;
function P(t){let w=t.indexOf("\n")+1,n=t.length,A=new Uint8Array(n).fill(1),G=[],B=[],p=0;
for(let i=0;i<n;i++){let c=t[i];if(c!="#"&&c!="\n"){A[i]=0;if(".*+".includes(c))G.push(i);if("$*".includes(c))B.push(i);if("@+".includes(c))p=i}}
return{w,n,W:A,G,B,p,X:[-w,w,-1,1]}}
function C(l,o,s,a){let{W,X}=l,q=[s],m=s;a.fill(-1);a[s]=s;
for(let i=0;i<q.length;i++){let x=q[i];if(x<m)m=x;
for(let k=0;k<4;k++){let y=x+X[k];if(!W[y]&&!o[y]&&a[y]<0){a[y]=x;q.push(y)}}}
return m}
function S(l){let{n,W,G,B,p,X}=l,o=new Uint8Array(n),a=new Int32Array(n),e=new Int32Array(n);
let Q=[[B,p,""]],V=new Set(),h=0;
for(let x of B)o[x]=1;
V.add(B+":"+C(l,o,p,a));
while(h<Q.length){let[b,pl,m]=Q[h++];
if(b.every(x=>G.includes(x)))return{m,e:pl};
o.fill(0);for(let x of b)o[x]=1;
C(l,o,pl,a);
for(let i=0;i<b.length;i++){let b0=b[i];
for(let k=0;k<4;k++){let y=b0+X[k],c=b0-X[k];
if(a[c]<0||W[y]||o[y])continue;
let N2=[...b];N2[i]=y;N2.sort(J);
o[b0]=0;o[y]=1;
let ky=N2+":"+C(l,o,b0,e);
o[y]=0;o[b0]=1;
if(V.has(ky))continue;V.add(ky);
let s="";for(let x=c;x!=pl;x=a[x])s=D[X.indexOf(x-a[x])]+s;
Q.push([N2,b0,m+s+U[k]])}}}
return null}
function Y(t){let l=P(t),R=new Map(),r=l.p/l.w|0,m="",p=l.p;
let k=i=>((i%l.w-1)/7|0)*2+((i/l.w|0)>r?1:0);
for(let b of l.B){let q=k(b),z=R.get(q)||{b:[],g:[]};R.set(q,z);z.b.push(b)}
for(let g of l.G){let z=R.get(k(g));if(!z)return"";z.g.push(g)}
let A=[...R.values()],b=A.map(z=>[...z.b]);
for(let i=0;i<A.length;i++){let z=A[i],s={...l};
s.W=[...l.W];
for(let j=0;j<A.length;j++)if(j!=i)for(let x of b[j])s.W[x]=1;
s.G=z.g;s.B=b[i];s.p=p;
let v=S(s);if(!v)return"";
m+=v.m;p=v.e;b[i]=[...z.g]}
return m}
for(let k=1;k<6;k++){let i="i00"+k,m="";try{m=Y(fs.readFileSync(I+"/"+i+"/level.txt","utf8"))}catch{}let o=O+"/"+i;fs.mkdirSync(o,{recursive:!0});fs.writeFileSync(o+"/solution.txt",m)}
