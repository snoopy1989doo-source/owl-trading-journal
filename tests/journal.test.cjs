const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const core=require('../journal-core');const fixture=require('./fixtures.cjs');
test('monthly report books partial exits in their Thailand month, including OPEN trades',()=>{const r=core.report(fixture,'Demo','2026-09');assert.equal(r.opening,1500);assert.equal(r.pnl,1250);assert.equal(r.deposits,200);assert.equal(r.withdrawals,50);assert.equal(r.ending,2900);assert.equal(r.completed.length,1);assert.equal(r.partialOpen,1);assert.equal(r.winRate,'100.0');});
test('manual total correction reconciles once without double counting earlier month',()=>{const data=structuredClone(fixture);data.trades[0].pnlMode='manual';data.trades[0].pnl=1400;assert.equal(core.report(data,'Demo','2026-08').pnl,500);const r=core.report(data,'Demo','2026-09');assert.equal(r.pnl,1150);assert.equal(r.entries.filter(e=>e.kind==='correction').length,1);});
test('Thai date crosses UTC day and month correctly',()=>{assert.equal(core.dateAt('2026-08-31T18:00:00Z'),'2026-09-01');assert.equal(core.dateAt('bad','fallback'),'fallback');});
test('reports isolate accounts and escape Markdown table content',()=>{const data=structuredClone(fixture);data.trades[1].account='Other';data.trades[0].symbol='GOLD|test\nline';assert.equal(core.report(data,'Demo','2026-09').pnl,1000);assert.match(core.markdown(data,'Demo','2026-09'),/GOLD\\\|test line/);});
test('empty reports remain finite',()=>{const r=core.report({trades:[],balances:{Demo:0}},'Demo','2026-09');assert.equal(r.ending,0);assert.equal(r.winRate,'—');assert.throws(()=>core.report({},'Demo','2026-13'));});
test('invalid edit quantities are rejected without touching the original',()=>{const t=structuredClone(fixture.trades[0]);t.exits[0].lot=2;assert.throws(()=>core.validateTrade(t),/ไม่เกิน/);assert.equal(fixture.trades[0].exits[0].lot,.5);t.exits[0].lot=.2;assert.throws(()=>core.validateTrade(t),/เท่ากับ/);});
test('BUY and SELL validation and negative inputs',()=>{assert.equal(core.validateTrade(fixture.trades[0]),true);assert.equal(core.validateTrade(fixture.trades[1]),true);assert.throws(()=>core.validateTrade({...fixture.trades[0],actualEntry:-1}));assert.throws(()=>core.validateTrade({...fixture.trades[1],initialSl:190}));});
test('backup parsing is detached, accepts record maps and rejects invalid cash or prototype keys',()=>{const data=core.parseBackup(fixture);data.trades[0].entry=99;assert.equal(fixture.trades[0].entry,200);assert.equal(core.parseBackup({trades:{a:fixture.trades[0]}}).trades.length,1);assert.throws(()=>core.parseBackup({trades:[],cfs:[{amount:'NaN'}]}));assert.throws(()=>core.parseBackup(JSON.parse('{"trades":[],"__proto__":{}}')));});
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
test('all production JavaScript parses',()=>{new vm.Script(script);new vm.Script(fs.readFileSync(require.resolve('../export-ui.js'),'utf8'));});
function extract(name){let start=script.indexOf('function '+name+'(');assert.notEqual(start,-1);if(script.slice(start-6,start)==='async ')start-=6;const rest=script.slice(start);const next=rest.slice(1).search(/\n(?:async )?function /);return rest.slice(0,next<0?undefined:next+1);}
test('Firebase sync handles the boolean committed callback and abort',async()=>{
  for(const committed of [true,false]){const state={trades:[],syncStatus:'offline'};const context={state,isCloudActive:true,authReady:true,cloudLoaded:true,currentUser:{uid:'test'},cloudDataRef:{transaction(update,done){update(null);done(null,committed,{val:()=>({})});}},uploadTradeImages:async()=>{},save:()=>{},KEY:{TRADES:'t'},cloudPayload:()=>({trades:{}}),updateSyncBadge:()=>{},console,Promise};vm.createContext(context);vm.runInContext(extract('syncToCloud'),context);context.syncToCloud();await new Promise(r=>setImmediate(r));assert.equal(state.syncStatus,committed?'synced':'offline');}
});
test('ZIP backup round trips its JSON and an image byte-for-byte; corruption rejects',async()=>{
 const image=Buffer.from('test image bytes').toString('base64');const data=structuredClone(fixture);data.trades[0].entryImage='data:image/jpeg;base64,'+image;
 const context={state:data,TextEncoder,TextDecoder,Uint8Array,DataView,Blob,Buffer,atob,btoa,firebaseStorage:null,exitEvents:t=>core.list(t.exits),fetch};vm.createContext(context);
 for(const name of ['crc32','zipStore','unzipStore','bytesToDataUrl','dataUrlBlob','imageBytes','createBackupZip','parseBackupFile'])vm.runInContext(extract(name),context);
 const blob=await context.createBackupZip(),buffer=await blob.arrayBuffer(),files=context.unzipStore(buffer);assert.equal(Buffer.from(files['images/closed-buy/entry.jpg']).toString(),'test image bytes');
 const restored=await context.parseBackupFile({name:'test.zip',arrayBuffer:()=>Promise.resolve(buffer)});assert.equal(restored.trades[0].entryImage,data.trades[0].entryImage);assert.equal(restored.trades.length,3);
 const corrupt=new Uint8Array(buffer.slice(0));corrupt[50]^=1;assert.throws(()=>context.unzipStore(corrupt.buffer));assert.throws(()=>context.unzipStore(buffer.slice(0,50)));
});
test('SL moves preserve initial risk, reject wrong directions and create one event',()=>{
 const context={state:{contractValues:{}},firebaseDb:null,uid:()=> 'event',Date,Number,Math};vm.createContext(context);
 for(const name of ['tradeLifecycle','initialStop','currentStop','actualEntry','directionMove','validateSLMove','addSLMove'])vm.runInContext(extract(name),context);
 const buy={...fixture.trades[2],currentSl:190,currentSL:190};const updated=context.addSLMove(buy,200,'breakEven',210).updated;assert.equal(updated.initialSl,190);assert.equal(updated.slHistory.length,1);assert.equal(updated.slHistory[0].rAtAdjustment,1);assert.throws(()=>context.addSLMove(updated,195,'trailing',210));
 const sell=fixture.trades[1];assert.equal(context.addSLMove(sell,200,'breakEven',190).updated.currentSL,200);assert.throws(()=>context.addSLMove(sell,208,'trailing',190));assert.throws(()=>context.addSLMove({...buy,lifecycle:'CLOSED'},200,'breakEven',210));
});
test('trade merge retains newer corrected exit and SL values in either merge order',()=>{
 const context={exitEvents:t=>core.list(t.exits),currentStop:t=>t.currentSL||t.currentSl||t.initialSl};vm.createContext(context);vm.runInContext(extract('mergeTradeRecord'),context);
 const old=structuredClone(fixture.trades[0]),edited=structuredClone(old);old.updatedAt='2026-09-01';edited.updatedAt='2026-09-21';edited.exits[0].pnl=450;
 assert.equal(context.mergeTradeRecord(old,edited).exits[0].pnl,450);assert.equal(context.mergeTradeRecord(edited,old).exits[0].pnl,450);
});
test('native export sends base64 to document picker and distinguishes saved from cancelled',async()=>{
 const elements=new Map();for(const id of ['export-save','export-status'])elements.set(id,{textContent:'',addEventListener(type,handler){this.handler=handler;}});
 let saved=true,received;const plugin={saveFile:async args=>{received=args;return saved?{saved:true,filename:args.filename}:{cancelled:true};}};
 const context={window:{Capacitor:{isNativePlatform:()=>true,registerPlugin:()=>plugin}},document:{getElementById:id=>elements.get(id)},navigator:{},URL,Blob,File,console};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../export-ui.js'),'utf8'),context);
 vm.runInContext("preparedExport={filename:'monthly.md',base64:'dGVzdA==',blob:new Blob(['test'],{type:'text/markdown;charset=utf-8'})};attachReportEvents();",context);
 await elements.get('export-save').handler();assert.equal(received.base64,'dGVzdA==');assert.equal(received.mimeType,'text/markdown');assert.match(elements.get('export-status').textContent,/สำเร็จ/);
 saved=false;await elements.get('export-save').handler();assert.match(elements.get('export-status').textContent,/ยกเลิก/);
});
test('switching auth user while photo upload is pending cannot sync old data to new user',async()=>{
 let resume,calls=0;const context={state:{trades:[]},isCloudActive:true,authReady:true,cloudLoaded:true,currentUser:{uid:'first'},cloudDataRef:{transaction(){calls++;}},uploadTradeImages:()=>new Promise(resolve=>resume=resolve),save:()=>{},KEY:{TRADES:'t'},updateSyncBadge:()=>{},cloudPayload:()=>({}),console,Promise};vm.createContext(context);vm.runInContext(extract('syncToCloud'),context);context.syncToCloud();await Promise.resolve();context.currentUser={uid:'second'};resume();await new Promise(r=>setImmediate(r));assert.equal(calls,0);
});
