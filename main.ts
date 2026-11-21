import{readdirSync as a,readFileSync as b,mkdirSync as c,writeFileSync as d}from"node:fs";
const I=process.env.MAKEFUN_INPUT_DIR||"/input",O=process.env.MAKEFUN_OUTPUT_DIR||"/output",u="udlr",U="UDLR",J=(x,y)=>x-y;
function P(t){let r=t.split("\n").filter(e=>e),w=0;
for(let e of r)if(e.length>w)w=e.length;
let n=w*r.length,W=new Uint8Array(n).fill(1),G=[],B=[],p=-1;
r.forEach((e,y)=>{for(let x=0;x<e.length;x++){let i=y*w+x,q=e[x];if(q!="#"){W[i]=0;if(".*+".includes(q))G.push(i);if("$*".includes(q))B.push(i);if("@+".includes(q))p=i}}});
for(let i=0;i<n;i++)if(i<w||i>=n-w||i%w==0||i%w==w-1)W[i]=1;
B.sort(J);G.sort(J);return{w,n,W,G,B,p,X:[-w,w,-1,1]}}
function V(l){let{W,G,n,X}=l,v=new Uint8Array(n),q=[];
for(let g of G)v[g]=1,q.push(g)
for(let i=0;i<q.length;i++){let x=q[i];
for(let e of X){let y=x-e;
if(y>=0&&y<n&&!W[y]&&!W[y-e]&&!v[y]){v[y]=1;q.push(y)}}}
return v}
function R(l,o,f,s,t,k){let{W,X}=l,a=f,n=0;k[n++]=f;s[f]=t;
while(n>0){let p=k[--n];if(p<a)a=p;
for(let e of X){let y=p+e;
if(!W[y]&&!o[y]&&s[y]!=t){s[y]=t;k[n++]=y}}}
return a}
function Z(l,o,g,t){let{w,W}=l;
for(let a of[t,t-1,t-w,t-w-1]){let s=0,f=0;
for(let e of[a,a+1,a+w,a+w+1]){if(!(W[e]|o[e])){s=1;break}if(o[e]&&!g[e])f=1}
if(!s&&f)return 1}
return 0}
function K(l,o,f,t){let{W,n,X}=l;
if(f==t)return"";
let v=new Int32Array(n).fill(-1),h=[],q=[f];v[f]=f;
for(let i=0;i<q.length;i++){let p=q[i];
if(p==t)break;
for(let k=0;k<4;k++){let y=p+X[k];
if(W[y]||o[y]||v[y]!=-1)continue;v[y]=p;h[y]=u[k];q.push(y)}}
if(v[t]==-1)throw 0;
let s="";for(let p=t;p!=f;p=v[p])s=h[p]+s;return s}
function S(l,m,k){let{n,W,G,B,p,X}=l,N=B.length,g=new Uint8Array(n);
let v=V(l);
if(B.some(b=>!v[b]))return null;
let z=b=>b.every(x=>g[x]);
if(z(B))return{p:0,m:"",e:p};
let D=[];
for(let x of G){g[x]=1;let e=new Int32Array(n).fill(-1),q=[x];e[x]=0;
for(let i=0;i<q.length;i++){let y=q[i];
for(let d of X){let t=y+d;
if(!W[t]&&e[t]<0){e[t]=e[y]+1;q.push(t)}}}
D.push(e)}
let H=b=>{let s=0;
if(N>5){for(let x of b){let e=1/0;
for(let d of D)e=d[x]>=0&&d[x]<e?d[x]:e;
if(e==1/0)return 1/0;s+=e}
return s}
let d=new Array(1<<N).fill(1/0);d[0]=0;
for(let m2=0;m2<1<<N;m2++){let i=0;
for(let j=0;j<N;j++)i+=m2>>j&1;
for(let j=0;j<N;j++)if(!(m2>>j&1)){let t=D[j][b[i]];
if(t>=0&&d[m2]+t<d[m2|1<<j])d[m2|1<<j]=d[m2]+t}}
return d[(1<<N)-1]};
let o=new Uint8Array(n),s=new Int32Array(n),a=new Int32Array(n),t=new Int32Array(n),c=0;
let O2=(b,v)=>b.forEach(j=>o[j]=v);
O2(B,1);
let f=R(l,o,p,s,++c,t);
O2(B,0);
let y0=(b,q)=>{if(n**(N+1)<9e15){let x=q;for(let y of b)x=x*n+y;return x}return q+":"+b};
let A=[[...B]],E=[p],F=[-1],Y=[-1],G2=[0],J2=[y0(B,f)],T=new Map([[J2[0],0]]);
let Bk=[],Bi=[],mn=0,Bc=0;
let Hp=(f,i)=>{(Bk[f]=Bk[f]||[]).push([f,i]);Bi[f]=Bi[f]|0;if(f<mn)mn=f;Bc++};
let Ho=()=>{while(!Bk[mn]||Bi[mn]>=Bk[mn].length)mn++;Bc--;return Bk[mn][Bi[mn]++]};
let h0=H(B);
if(h0==1/0)return null;
Hp(k?k==1/0?h0:k*h0:0,0);
let fd=-1,e=0;
while(Bc>0){let[,u2]=Ho(),b=A[u2],x=G2[u2];
if(T.get(J2[u2])!=x)continue;
if(z(b)){fd=u2;break}
if(e>=m)return null;e++;
O2(b,1);
R(l,o,E[u2],s,++c,t);
let h=c;
for(let i=0;i<b.length;i++){let B2=b[i];
for(let j=0;j<4;j++){let y=B2+X[j];
if(s[B2-X[j]]!=h||W[y]||o[y]||!v[y])continue;
o[B2]=0;o[y]=1;
let N2=[...b];N2[i]=y;N2.sort(J);
let K3=y0(N2,R(l,o,B2,a,++c,t)),x3=x+1,r=T.get(K3);
if(!Z(l,o,g,y)&&(r==null||x3<r)){let h2=H(N2);
if(h2<1/0){if(A.length>=m)return null;
T.set(K3,x3);
let idx=A.length;
A.push(N2);E.push(B2);F.push(u2);Y.push(j);G2.push(x3);J2.push(K3);
Hp(k?k==1/0?h2:x3+k*h2:x3,idx)}}
o[y]=0;o[B2]=1}}
O2(b,0)}
if(fd<0)return null;
let P2=[];
for(let u2=fd;u2>0;u2=F[u2])P2.unshift(u2);
let m2="",pl=p,b2=[...B];
for(let u2 of P2){let N2=A[u2],fr=b2.find(x=>!N2.includes(x)),di=Y[u2];
O2(b2,1);
m2+=K(l,o,pl,fr-X[di]);
O2(b2,0);
m2+=U[di];pl=fr;b2=N2}
return{p:P2.length,m:m2,e:pl}}
function H(l){let{w,W,G,B,p,n,X}=l,v=V(l),r=p/w|0,x=new Uint8Array(n);
for(let i=r*w;i<(r+1)*w;i++)if(!W[i]&&!v[i])x[i]=1;
if(B.some(b=>x[b]))return null;
let q=new Int32Array(n).fill(-1),R=[];
for(let s=0;s<n;s++){if(W[s]||x[s]||q[s]>=0)continue;
let y=[s];q[s]=R.length;
for(let i=0;i<y.length;i++)for(let k=0;k<4;k++){let t=y[i]+X[k];
if(!W[t]&&!x[t]&&q[t]<0){q[t]=R.length;y.push(t)}}
R.push({b:[],g:[]})}
for(let b of B)R[q[b]].b.push(b);
for(let g of G){if(q[g]<0)return null;R[q[g]].g.push(g)}
if(R.some(r=>r.b.length!=r.g.length))return null;
return R.filter(r=>r.b.length>0)}
function T(s){return S(s,25e4,1)||S(s,25e4,0)||S(s,15e4,4)||S(s,15e4,1/0)}
function Y(t){let l=P(t),g=new Set(l.G);
if(l.B.every(b=>g.has(b)))return"";
let R=H(l);
if(R){let b=R.map(r=>[...r.b]),p=l.p,m="",k=1,s={...l};
for(let i=0;i<R.length;i++){let r=R[i];s.W=[...l.W];
for(let j=0;j<R.length;j++)if(j!=i)for(let x of b[j])s.W[x]=1;
s.G=r.g;s.B=r.b;s.p=p;
let o=T(s);
if(!o){k=0;break}
m+=o.m;p=o.e;
b[i]=[...r.g]}
if(k)return m}
let o=T(l);
return o?o.m:""}
for(let i of a(I)){let m=Y(b(I+"/"+i+"/level.txt","utf8")),o=O+"/"+i;c(o,{recursive:!0});d(o+"/solution.txt",m+"\n")}
