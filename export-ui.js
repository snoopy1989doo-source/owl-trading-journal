/* Prepared exports keep browser sharing inside a fresh user click. */
let preparedExport = null;
let exportNotice = '';
let exportBusy = false;
let nativeFiles;
function owlNativeFiles() {
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return nativeFiles ||= window.Capacitor.registerPlugin('OwlFiles');
}
function clearPreparedExport() {
  if (preparedExport?.url) URL.revokeObjectURL(preparedExport.url);
  preparedExport = null; exportNotice = ''; exportBusy = false;
}
function reportData() { return {trades:state.trades,cfs:state.cfs,balances:state.balances}; }
function legacyBackup(){try{const trades=JSON.parse(localStorage.getItem(KEY.TRADES)||'[]'),cfs=JSON.parse(localStorage.getItem(KEY.CFS)||'[]');if(!trades.length&&!cfs.length)return null;return {trades,cfs,balances:JSON.parse(localStorage.getItem(KEY.BALANCES)||'{}'),version:'legacy-local',exportedAt:new Date().toISOString()};}catch{return null;}}
function buildReports() {
  const account=state.reportAccount ||= state.f.account || 'Demo';
  const month=state.reportMonth ||= today().slice(0,7);
  const r=OwlCore.report(reportData(),account,month);
  const f=preparedExport;
  return `<section class="card reports-page"><div class="section-heading"><div><span class="eyebrow">YOUR JOURNAL, EVERY MONTH</span><h2>รายงานและสำรองข้อมูล</h2></div></div>
    <p class="helper">เลือกบัญชีและเดือน ดูยอดก่อนส่งออก แล้วเลือกตำแหน่งบันทึกหรือแชร์ไฟล์</p>
    <div class="manage-grid"><div><label for="export-account">บัญชีรายงาน</label><select id="export-account">${[...getAccountList(),'ALL'].map(a=>`<option value="${escapeHtml(a)}" ${a===account?'selected':''}>${a==='ALL'?'รวมทุกบัญชี':escapeHtml(a)}</option>`).join('')}</select></div><div><label for="export-month">เดือนรายงาน · เวลาไทย</label><input type="month" id="export-month" value="${month}"></div></div>
    <div class="report-metrics">${[['ต้นเดือน',r.opening],['ฝาก',r.deposits],['ถอน',r.withdrawals],['P&L รับรู้',r.pnl],['ปลายเดือน',r.ending]].map(([label,value])=>`<div><span>${label}</span><strong>${OwlCore.money(value)}</strong></div>`).join('')}</div>
    <p class="helper">ปิดครบ ${r.completed.length} ไม้ · มีแบ่งปิดและยังถือ ${r.partialOpen} ไม้<br>ยอดรับรู้รวมการแบ่งปิดตามวันที่ปิดแต่ละส่วน ไม่รวมกำไรลอยตัว</p>
    <button class="btn btn-green" id="btn-export-monthly-md" ${exportBusy?'disabled':''}>สร้างรายงาน ${escapeHtml(account)} · ${month} (.md)</button>
    <details class="report-preview"><summary>ดูตัวอย่างรายงานสำหรับ Obsidian</summary><pre>${escapeHtml(OwlCore.markdown(reportData(),account,month))}</pre></details>
    <div class="export-ready" ${f?'':'hidden'}><span class="eyebrow">ไฟล์พร้อมให้บันทึก</span><strong>${escapeHtml(f?.filename||'')}</strong><p>${f?`${(f.blob.size/1024).toFixed(1)} KB · `:''}การสร้างไฟล์ยังไม่ได้บันทึกลงเครื่อง</p><div class="manage-grid"><button class="btn btn-green" id="export-save">บันทึกไฟล์…</button><button class="btn" id="export-share">แชร์ไฟล์…</button></div>${f?.text?'<button class="btn" id="export-copy">คัดลอกข้อความรายงาน</button>':''}</div>
    <div id="export-status" role="status" class="export-status">${escapeHtml(exportNotice)}</div>
    <details class="export-help"><summary>ไฟล์อยู่ที่ไหน? / ส่งเข้า Obsidian</summary><p>APK รุ่นนี้: กดบันทึกไฟล์ แล้วเลือก Downloads หรือ Documents ในหน้าต่างของ Android ตำแหน่งที่คุณเลือกคือที่เก็บไฟล์</p><p>บนเว็บ: ดูเมนู Downloads / ดาวน์โหลดของเบราว์เซอร์ หากไม่รองรับการแชร์ไฟล์ ให้บันทึกก่อน แล้วแชร์จากแอป Files หรือคัดลอกข้อความรายงานไปวางใน Obsidian</p><p>ไฟล์ .md เปิดเป็นโน้ตใน Obsidian ได้ ส่วน .zip ใช้กู้คืนข้อมูลพร้อมรูป ไม่ใช่ไฟล์รายงาน</p></details>
    <div class="divider"></div><h3>สำรองและย้ายข้อมูล</h3><p class="helper">Backup ZIP รวมทุกบัญชีและรูปภาพ ส่วน JSON เก็บข้อมูลกับลิงก์รูปเท่านั้น</p>
    <div class="export-actions"><button class="btn btn-green" id="btn-backup" ${exportBusy?'disabled':''}>สร้าง Backup พร้อมรูป (.zip)</button><button class="btn" id="btn-import-trigger">นำเข้า Backup (.zip / .json)</button></div>
    <details><summary>รูปแบบส่งออกอื่น</summary><div class="export-actions"><button class="btn" id="btn-export-raw-json">ข้อมูลดิบ (.json)</button><button class="btn" id="btn-export-all-csv">รายการเทรด (.csv)</button><button class="btn" id="btn-export-portfolio-all-md">สรุปทุกบัญชี / ทุกเดือน (.md)</button></div></details>
    ${legacyBackup()?'<details><summary>พบข้อมูลในเครื่องจากแอปรุ่นก่อน</summary><p>ข้อมูลเก่ายังไม่ได้แยกตามผู้ใช้ สามารถสำรองออกมาตรวจสอบก่อนนำเข้าในบัญชีที่ถูกต้อง</p><button class="btn" id="export-legacy">สำรองข้อมูลรุ่นก่อน (.json)</button></details>':''}
    <input type="file" id="btn-import" accept=".json,.zip,application/zip" hidden></section>`;
}
async function prepareExport(blob, filename) {
  const owner=currentUser?.uid;
  const safeName=OwlCore.filename(filename);
  const text=/\.md$/i.test(safeName)?await blob.text():'';
  const base64=owlNativeFiles()?await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('เตรียมไฟล์ไม่สำเร็จ'));reader.readAsDataURL(blob);}):null;
  if(currentUser?.uid!==owner)return;
  clearPreparedExport();
  preparedExport={blob,filename:safeName,text,base64,url:URL.createObjectURL(blob),file:new File([blob],safeName,{type:blob.type||'application/octet-stream'})};
  exportNotice='เตรียมไฟล์แล้ว เลือก “บันทึกไฟล์” หรือ “แชร์ไฟล์” ด้านบน';
  state.page='REPORTS';render();document.querySelector('.export-ready')?.scrollIntoView({block:'center',behavior:'smooth'});
}
function setExportNotice(message){exportNotice=message;const el=document.getElementById('export-status');if(el)el.textContent=message;}
function attachReportEvents() {
  document.getElementById('export-legacy')?.addEventListener('click',()=>{const data=legacyBackup();if(data)prepareExport(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),`owl-legacy-local-${today()}.json`);});
  document.getElementById('export-account')?.addEventListener('change',e=>{state.reportAccount=e.target.value;clearPreparedExport();render();});
  document.getElementById('export-month')?.addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){state.reportMonth=e.target.value;clearPreparedExport();render();}});
  document.getElementById('export-save')?.addEventListener('click',async()=>{
    const f=preparedExport;if(!f)return;
    try{
      const native=owlNativeFiles();
      if(native){const result=await native.saveFile({filename:f.filename,mimeType:f.blob.type.split(';')[0],base64:f.base64});setExportNotice(result.saved?`บันทึก ${result.filename} สำเร็จในโฟลเดอร์ที่คุณเลือกใน Android`:'ยกเลิกการบันทึก ไฟล์ยังพร้อมให้บันทึกใหม่');}
      else if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:f.filename});const writable=await handle.createWritable();await writable.write(f.blob);await writable.close();setExportNotice(`บันทึก ${handle.name} สำเร็จในตำแหน่งที่เลือก`);}
      else{const link=document.createElement('a');link.href=f.url;link.download=f.filename;document.body.appendChild(link);link.click();link.remove();setExportNotice(`ส่งคำขอดาวน์โหลด ${f.filename} แล้ว ตรวจเมนู Downloads ของเบราว์เซอร์ — เว็บไม่สามารถยืนยันว่าไฟล์ถูกบันทึกแล้วได้`);}
    }catch(error){setExportNotice(error.name==='AbortError'?'ยกเลิกการบันทึก':`บันทึกไม่สำเร็จ: ${error.message}`);}
  });
  document.getElementById('export-share')?.addEventListener('click',async()=>{
    const f=preparedExport;if(!f)return;
    try{const native=owlNativeFiles();if(native){await native.shareFile({filename:f.filename,mimeType:f.blob.type.split(';')[0],base64:f.base64});setExportNotice('เปิดเมนูแชร์แล้ว เลือกแอปปลายทางเพื่อส่งไฟล์');}
    else if(navigator.canShare?.({files:[f.file]})){await navigator.share({files:[f.file],title:f.filename});setExportNotice('ส่งไฟล์ให้ระบบแชร์แล้ว ตรวจผลในแอปปลายทาง');}
    else setExportNotice('เบราว์เซอร์นี้ไม่รองรับแชร์ไฟล์โดยตรง กรุณาบันทึกแล้วแชร์จากแอป Files หรือคัดลอกข้อความรายงาน');}
    catch(error){setExportNotice(error.name==='AbortError'?'ยกเลิกการแชร์':`แชร์ไม่สำเร็จ: ${error.message}`);}
  });
  document.getElementById('export-copy')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(preparedExport.text);setExportNotice('คัดลอกแล้ว เปิดโน้ตใน Obsidian และวางข้อความได้เลย');}catch{setExportNotice('คัดลอกอัตโนมัติไม่ได้ เปิดตัวอย่างรายงานแล้วเลือกข้อความเพื่อคัดลอก');}});
}
