(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OwlCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const list = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const closed = t => (t.lifecycle || 'CLOSED') === 'CLOSED';
  const money = value => `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`;
  const md = value => String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const filename = value => String(value).replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 160) || 'owl-export';
  function dateAt(value, fallback = '') {
    if (!value) return fallback;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return fallback;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date).map(p => [p.type,p.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function closeDate(t) {
    const events = list(t.exits);
    const dates = events.map(e => dateAt(e.at, t.date)).filter(Boolean).sort();
    return dates.at(-1) || dateAt(t.closedAt, t.date || '');
  }
  // Every realized cash movement belongs to its own Thailand date, including partial exits.
  // A manually corrected trade total is reconciled once on the last exit date.
  function ledger(trades) {
    return list(trades).flatMap(t => {
      if (!t || !['OPEN','CLOSED'].includes(t.lifecycle || 'CLOSED')) return [];
      const base = {tradeId:t.id, account:t.account || 'Demo', symbol:t.symbol || '', session:t.session || 'Unknown', dir:t.dir || 'Buy'};
      const events = list(t.exits).map(e => ({...base,id:e.id,date:dateAt(e.at,closeDate(t)),pnl:num(e.pnl),lot:num(e.lot),price:num(e.price),reason:e.reason || 'Manual Close',kind:'exit'}));
      if (!events.length && closed(t)) return [{...base,date:closeDate(t),pnl:num(t.pnl),lot:num(t.lot),price:num(t.exit),reason:t.exitReason || 'Manual Close',kind:'legacy'}];
      const delta = num(t.pnl) - events.reduce((s,e) => s+e.pnl, 0);
      if (events.length && t.pnlMode === 'manual' && Math.abs(delta)>1e-8) events.push({...base,date:closeDate(t),pnl:delta,lot:0,price:0,reason:'ปรับยอด P&L ด้วยมือ',kind:'correction'});
      return events;
    }).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).sort((a,b) => a.date.localeCompare(b.date));
  }
  function report(data, account, month) {
    if (month !== 'ALL' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('เลือกเดือนรายงานให้ถูกต้อง');
    const match = record => account === 'ALL' || (record.account || 'Demo') === account;
    const inPeriod = date => month === 'ALL' || String(date).startsWith(month);
    const allTrades = list(data.trades).filter(match);
    const entries = ledger(allTrades);
    const selected = entries.filter(e => inPeriod(e.date));
    const cash = list(data.cfs).filter(match).map(c => ({...c,net:(c.type === 'Deposit'?1:-1)*num(c.amount)}));
    const cf = cash.filter(c => inPeriod(c.date));
    const balances = data.balances || {};
    const initial = account === 'ALL' ? Object.values(balances).reduce((s,v)=>s+num(v),0) : num(balances[account]);
    const opening = initial + (month === 'ALL' ? 0 : entries.filter(e=>e.date.slice(0,7)<month).reduce((s,e)=>s+e.pnl,0) + cash.filter(c=>c.date.slice(0,7)<month).reduce((s,c)=>s+c.net,0));
    const pnl = selected.reduce((s,e)=>s+e.pnl,0);
    const deposits = cf.filter(c=>c.type==='Deposit').reduce((s,c)=>s+num(c.amount),0);
    const withdrawals = cf.filter(c=>c.type!=='Deposit').reduce((s,c)=>s+num(c.amount),0);
    const completed = allTrades.filter(t=>closed(t)&&inPeriod(closeDate(t)));
    const wins = completed.filter(t=>num(t.pnl)>0).length;
    const losses = completed.filter(t=>num(t.pnl)<0).length;
    const grossWin=selected.filter(e=>e.pnl>0).reduce((s,e)=>s+e.pnl,0),grossLoss=-selected.filter(e=>e.pnl<0).reduce((s,e)=>s+e.pnl,0);
    const daily = new Map();selected.forEach(e=>daily.set(e.date,(daily.get(e.date)||0)+e.pnl));
    let peak=0,running=0,maxDrawdown=0; [...daily].sort(([a],[b])=>a.localeCompare(b)).forEach(([,value])=>{running+=value;peak=Math.max(peak,running);maxDrawdown=Math.max(maxDrawdown,peak-running);});
    const moves=allTrades.flatMap(t=>list(t.slHistory).filter(e=>['breakEven','trailing','manual'].includes(e.type)&&inPeriod(dateAt(e.timestamp||e.at))).map(e=>({...e,tradeId:t.id})));
    return {account,month,entries:selected,completed,wins,losses,breakeven:completed.length-wins-losses,pnl,opening,ending:opening+pnl+deposits-withdrawals,deposits,withdrawals,maxDrawdown,moves,profitFactor:grossLoss? (grossWin/grossLoss).toFixed(2):grossWin?'∞':'—',winRate:completed.length?(100*wins/completed.length).toFixed(1):'—',partialOpen: new Set(selected.filter(e=>allTrades.some(t=>t.id===e.tradeId&&!closed(t))).map(e=>e.tradeId)).size};
  }
  function markdown(data, account, month) {
    const r=report(data,account,month);
    const aggregate = key => [...new Set(r.entries.map(e=>e[key]))].map(value=>{const entries=r.entries.filter(e=>e[key]===value);return `| ${md(value)} | ${entries.filter(e=>e.kind!=='correction').length} | ${money(entries.reduce((s,e)=>s+e.pnl,0))} |`;}).join('\n') || '| — | 0 | $0.00 |';
    const rows=r.entries.map(e=>`| ${e.date} | ${md(e.account)} | ${md(e.symbol)} | ${md(e.dir)} | ${e.lot || '—'} | ${e.price || '—'} | ${money(e.pnl)} | ${md(e.reason)} |`).join('\n') || '| — | — | — | — | — | — | $0.00 | ไม่มีรายการ |';
    return `# OWL Trader · ${month==='ALL'?'Portfolio report':'Monthly portfolio report'}\n\n- บัญชี: ${md(account)}\n- เดือน: ${month}\n- เขตเวลา: Asia/Bangkok (UTC+7)\n- ยอดต้นงวด: ${money(r.opening)}\n- ฝาก: ${money(r.deposits)}\n- ถอน: ${money(r.withdrawals)}\n- กำไร/ขาดทุนรับรู้ในงวด: ${money(r.pnl)}\n- ยอดปลายงวด: ${money(r.ending)}\n\n> ยอดตามสมุดบัญชี ไม่รวมกำไรลอยตัว ใช้วันที่ปิดแต่ละส่วนเป็นวันที่รับรู้กำไร การแก้ P&L รวมด้วยมือแสดงเป็นรายการปรับยอดในวันปิดส่วนสุดท้าย\n\n## ผลการเทรด\n\n- เทรดที่ปิดครบในงวด: ${r.completed.length}\n- ชนะ / แพ้ / เสมอ: ${r.wins} / ${r.losses} / ${r.breakeven}\n- Win rate ของเทรดที่ปิดครบ: ${r.winRate}${r.winRate==='—'?'':'%'}\n- ไม้ที่แบ่งปิดในงวดและยัง OPEN: ${r.partialOpen}\n- Profit factor จากยอดรับรู้ในงวด: ${r.profitFactor}\n- Max drawdown จาก P&L รับรู้รายวัน: ${money(r.maxDrawdown)}\n- จำนวนครั้งขยับ SL ในงวด: ${r.moves.length}\n- จำนวนไม้ที่ขยับ Break Even ในงวด: ${new Set(r.moves.filter(e=>e.type==='breakEven').map(e=>e.tradeId)).size}\n\n## แยกตามบัญชี\n\n| บัญชี | รายการปิด | P&L |\n|---|---:|---:|\n${aggregate('account')}\n\n## แยกตาม Session\n\n| Session | รายการปิด | P&L |\n|---|---:|---:|\n${aggregate('session')}\n\n## แยกตามสินทรัพย์\n\n| สินทรัพย์ | รายการปิด | P&L |\n|---|---:|---:|\n${aggregate('symbol')}\n\n## รายการรับรู้กำไร/ขาดทุน\n\n| วันที่ไทย | บัญชี | สินทรัพย์ | ทิศทาง | Lot ปิด | ราคาออก | Net P&L | เหตุผล |\n|---|---|---|---|---:|---:|---:|---|\n${rows}\n`;
  }
  function validateTrade(t) {
    const entry=num(t.actualEntry ?? t.entry),stop=num(t.initialSl ?? t.initialSL ?? t.sl),lot=num(t.lot),target=num(t.plannedTp);
    if (!(entry>0 && stop>0 && lot>0) || !['Buy','Sell'].includes(t.dir)) throw new Error('Entry, SL และ Lot ต้องเป็นค่าบวก และเลือก BUY/SELL');
    if(t.dir==='Buy'?(stop>=entry || (target && target<=entry)):(stop<=entry || (target && target>=entry))) throw new Error('Initial SL / Take Profit อยู่ผิดด้านของ Entry');
    const exits=list(t.exits); let amount=0;
    for(const e of exits){if(!(num(e.price)>0 && num(e.lot)>0) || e.pnl==='' || !Number.isFinite(Number(e.pnl)))throw new Error('ตรวจสอบราคา Lot และ P&L ของรายการปิด');amount+=num(e.lot);if(e.at&&!Number.isFinite(Date.parse(e.at)))throw new Error('วันเวลาปิดไม่ถูกต้อง');}
    if(amount>lot+1e-7)throw new Error('Lot ที่ปิดรวมกันต้องไม่เกิน Lot เริ่มต้น');
    if(closed(t)&&exits.length&&Math.abs(amount-lot)>1e-7)throw new Error('เทรด CLOSED ต้องมี Lot ปิดรวมเท่ากับ Lot เริ่มต้น');
    if(!closed(t)&&exits.length&&amount>=lot-1e-7)throw new Error('ออเดอร์ OPEN ต้องเหลือ Lot มากกว่า 0');
    return true;
  }
  function parseBackup(data) {
    if(!data||typeof data!=='object')throw new Error('โครงสร้าง Backup ไม่ถูกต้อง');
    const copied=JSON.parse(JSON.stringify(data),(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw new Error('Backup มีชื่อฟิลด์ที่ไม่รองรับ');return value;});
    if(!Array.isArray(copied)&&!Object.prototype.hasOwnProperty.call(copied,'trades'))throw new Error('ไม่พบรายการ trades ใน Backup');
    const records=Array.isArray(copied)?copied:list(copied.trades);
    if(records.some(t=>!t||typeof t!=='object'||Array.isArray(t)))throw new Error('รายการเทรดไม่ถูกต้อง');
    const cfs=list(copied.cfs);
    if(cfs.some(c=>!c||!['Deposit','Withdraw','Withdrawal'].includes(c.type)||!Number.isFinite(Number(c.amount))||Number(c.amount)<0||!/^\d{4}-\d{2}-\d{2}$/.test(c.date||'')))throw new Error('รายการฝากถอนใน Backup ไม่ถูกต้อง');
    if(copied.balances && (Array.isArray(copied.balances)||typeof copied.balances!=='object'||Object.values(copied.balances).some(v=>!Number.isFinite(Number(v)))))throw new Error('ยอดเริ่มต้นใน Backup ไม่ถูกต้อง');
    return {...(Array.isArray(copied)?{}:copied),trades:records,cfs};
  }
  return {list,dateAt,closeDate,ledger,report,markdown,validateTrade,parseBackup,filename,money};
});
