import fs from"node:fs";
const e=process.env,I=e.MAKEFUN_INPUT_DIR||"/input",O=e.MAKEFUN_OUTPUT_DIR||"/output",D="UDLRudlr",v=n=>new Int32Array(n),P=t=>{let w=t.search("\n")+1,n=t.length,W=new Uint8Array(n),G=[],B=[],p=0;
for(let i in t){let c=t.charCodeAt(i);if(c<11||c==35)continue;W[i]=1;c>41&&c<47&&G.push(+i);c>35&&c<43&&B.push(+i);(c==43||c==64)&&(p=+i)}
return{w,n,W,G,B,p,X:[-w,w,-1,1]}},C=({W,X},o,s,a)=>{let q=[s],m=s;a.fill(-1);a[s]=s;
for(let x of q){m=x<m?x:m;
for(let d of X){let y=x+d;if(W[y]&&o.indexOf(y)<0&&a[y]<0){a[y]=x;q.push(y)}}}
return m},S=l=>{let{n,W,G,B,p,X}=l,a=v(n),e=v(n),Q=[[B,p,""]],V={};
for(let q of Q){let[b,p,m]=q;
if(b+""==G)return{m,e:p};
C(l,b,p,a);
for(let i in b){let f=b[i];
for(let k in X){let y=f+X[k],c=f-X[k];
if(a[c]<0||!W[y]||b.includes(y))continue;
let N=[...b];N[i]=y;N.sort((x,y)=>x-y);
let v=N+":"+C(l,N,f,e);
if(V[v])continue;V[v]=1;
let s="";for(let x=c;x!=p;x=a[x])s=D[4+X.indexOf(x-a[x])]+s;
Q.push([N,f,m+s+D[k]])}}}
},Y=t=>{let l=P(t),{p,w}=l,R=[],m="";
let k=i=>((i%w-1)/7|0)*2+((i/w|0)>(p/w|0));
for(let b of l.B){let z=R[k(b)]||{b:[],g:[]};R[k(b)]=z;z.b.push(b)}
for(let g of l.G){let z=R[k(g)];if(!z)return"";z.g.push(g)}
for(let i in R){let z=R[i],s={...l,W:[...l.W],G:z.g,B:z.b,p};
for(let j in R)if(j-i)R[j].b.map(x=>s.W[x]=0);
let v=S(s);if(!v)return"";
m+=v.m;p=v.e;z.b=z.g}
return m};
for(let k=0;k++<5;){let i="i00"+k,m="";try{m=Y(fs.readFileSync(I+"/"+i+"/level.txt","utf8"))}catch{}fs.mkdirSync(O+"/"+i,{recursive:!0});fs.writeFileSync(O+"/"+i+"/solution.txt",m)}
