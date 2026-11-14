import { H, waterLevel, robinHood, harmonicEntropy, harmonicEntropySeries, marginalGainCheck } from '../js/math-core.js';

const fr = (a,b)=>a/b;
const show = (x)=>'('+x.map(v=>v.toFixed(4)).join(', ')+')';
let fails = 0;
const chk = (name, got, want, tol=1e-9) => {
  const ok = Math.abs(got-want) < tol;
  if (!ok) fails++;
  console.log(`${ok?'PASS':'FAIL'}  ${name}: got ${got}  want ${want}`);
};

console.log('--- Figure 3: x = (1/2, 1/3, 1/6), successive water levels ---');
let x = [fr(1,2), fr(1,3), fr(1,6)];
const wantT = [fr(5,18), fr(5,24), fr(1,6), fr(1,7)];
for (let s=0; s<4; s++) {
  const { t, next } = robinHood(x, 1);
  chk(`t_${s+1}`, t, wantT[s]);
  console.log(`      rho^${s+1}(x) = ${show(next)}`);
  x = next;
}

console.log('--- F(1/2,1/3,1/6) = 467/360 ---');
const F = harmonicEntropy([fr(1,2), fr(1,3), fr(1,6)]);
chk('F recursion', F.value, 467/360);
chk('F series (L=20000)', harmonicEntropySeries([fr(1,2),fr(1,3),fr(1,6)], 20000), 467/360, 1e-4);
console.log(`      steps=${F.steps.length}  uniformAt=${F.uniformAt}  base=H_${F.uniformAt-1}=${F.base}`);

console.log('--- F(uniform on d) = H_{d-1} ---');
for (const d of [1,2,3,5,8]) {
  chk(`F(unif_${d})`, harmonicEntropy(new Array(d).fill(1/d)).value, H(d-1));
}

console.log('--- Figure 4: F(1/3,1/3,1/3) = 3/2 ---');
chk('F at barycentre', harmonicEntropy([1/3,1/3,1/3]).value, 1.5);

console.log('--- marginal gain F(rho x) = F(x) + max(x) ---');
for (const t of [[0.5,0.3,0.2],[0.7,0.2,0.1],[0.4,0.4,0.1,0.1],[0.9,0.1],[0.3,0.25,0.25,0.2]]) {
  const r = marginalGainCheck(t);
  chk(`gain ${show(t)}`, r.residual, 0, 1e-8);
}

console.log('--- invariance: zeros and permutation ---');
chk('zeros', harmonicEntropy([0.5,0.3,0.2,0,0]).value, harmonicEntropy([0.5,0.3,0.2]).value);
chk('perm',  harmonicEntropy([0.2,0.5,0.3]).value, harmonicEntropy([0.5,0.3,0.2]).value);

console.log('--- concavity spot-check: F(unif) is the max on the simplex ---');
let worst = 0;
for (let i=0;i<4000;i++){
  const d=3; let v=Array.from({length:d},()=>Math.random()); const s=v.reduce((a,b)=>a+b,0); v=v.map(z=>z/s);
  worst = Math.max(worst, harmonicEntropy(v).value - 1.5);
}
chk('max violation over 4000 random pts', worst<=1e-9?0:worst, 0, 1e-9);

console.log(fails===0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
