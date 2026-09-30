let transactions=[],currentView="all",liveMode=false;

const money=v=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0);
const normalizeDate=v=>{
  if(!v)return "";
  const s=String(v).trim();
  const direct=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if(direct)return direct[1]+"-"+String(direct[2]).padStart(2,"0")+"-"+String(direct[3]).padStart(2,"0");
  const parsed=s.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/);
  if(parsed){
    const months={Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12"};
    return parsed[2]+"-"+months[s.slice(4,7)]+"-"+String(parsed[1]).padStart(2,"0");
  }
  const d=new Date(s);
  return Number.isNaN(d.getTime())?s:d.toISOString().slice(0,10);
};
const formatDate=v=>{
  const d=new Date(normalizeDate(v)+"T00:00:00");
  return Number.isNaN(d.getTime())?String(v||""):d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
};
const formatModifiedDate=v=>{
  if(!v)return "";
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return String(v);
  return d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
};
const $=id=>document.getElementById(id);
const els={
  incomeTotal:$("incomeTotal"),expenseTotal:$("expenseTotal"),balanceTotal:$("balanceTotal"),
  viewTitle:$("viewTitle"),body:$("transactionBody"),empty:$("emptyState"),count:$("entryCount"),
  panelIncome:$("panelIncome"),panelExpense:$("panelExpense"),panelNet:$("panelNet"),
  from:$("fromDate"),to:$("toDate"),adminButton:$("adminButton"),backdrop:$("modalBackdrop")
};

function totals(list){
  const income=list.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  const expense=list.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  return{income,expense,balance:income-expense};
}
function filtered(){
  const from=els.from.value,to=els.to.value;
  return[...transactions]
    .filter(x=>currentView==="all"||x.type===currentView)
    .filter(x=>(!from||x.date>=from)&&(!to||x.date<=to))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
}
function esc(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function runningBalanceMap(){
  const chronological=[...transactions].sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
  let run=0;
  const map=new Map();
  chronological.forEach(x=>{
    run+=x.type==="income"?x.amount:-x.amount;
    map.set(x.id,run);
  });
  return map;
}
function render(){
  const list=filtered(),t=totals(list),map=runningBalanceMap();
  els.viewTitle.textContent=currentView==="income"?"Income Transactions":currentView==="expense"?"Expenditure Transactions":"Total Aggregation";
  els.count.textContent=list.length;
  els.panelIncome.textContent=money(t.income);
  els.panelExpense.textContent=money(t.expense);
  els.panelNet.textContent=money(t.balance);
  els.body.innerHTML="";
  list.forEach(x=>{
    const balance=x.runningBalance!==undefined&&x.runningBalance!==""?Number(x.runningBalance):map.get(x.id);
    const tr=document.createElement("tr");
    tr.innerHTML=
      "<td>"+esc(formatDate(x.date))+"</td>"+
      "<td>"+esc(x.occation||"")+"</td>"+
      "<td><span class=\"type-pill "+(x.type==="income"?"type-income":"type-expense")+"\">"+(x.type==="income"?"Income":"Expenditure")+"</span></td>"+
      "<td><strong>"+esc(x.description)+"</strong></td>"+
      "<td>"+esc(x.category)+"</td>"+
      "<td>"+esc(x.payment)+"</td>"+
      "<td class=\"amount "+(x.type==="income"?"text-income":"text-expense")+"\">"+(x.type==="income"?"+":"-")+" "+money(x.amount)+"</td>"+
      "<td class=\"balance-col "+(balance<0?"balance-negative":"balance-positive")+"\">"+money(balance)+"</td>"+
      "<td>"+esc(x.updatedBy||"")+"</td>"+
      "<td>"+esc(formatModifiedDate(x.modifiedDate))+"</td>";
    els.body.appendChild(tr);
  });
  els.empty.hidden=list.length!==0;
  const all=totals(transactions);
  els.incomeTotal.textContent=money(all.income);
  els.expenseTotal.textContent=money(all.expense);
  els.balanceTotal.textContent=money(all.balance);
}
function loadLiveData(){
  const url=window.APP_CONFIG&&window.APP_CONFIG.APPS_SCRIPT_URL;
  const cacheKey="durgamma_public_transactions_v2";
  const cached=localStorage.getItem(cacheKey);
  if(cached){
    try{
      const parsed=JSON.parse(cached);
      if(Array.isArray(parsed.transactions)){
        transactions=parsed.transactions;
        render();
      }
    }catch(error){}
  }
  if(!url){
    if(!cached)showLoadError();
    return;
  }

  const maxAttempts=3;
  let attempt=0;

  function request(){
    attempt++;
    const callback="templeFinanceCallback_"+Date.now()+"_"+attempt;
    let finished=false,timeout;
    const script=document.createElement("script");

    const cleanup=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timeout);
      try{delete window[callback];}catch(error){window[callback]=null;}
      script.remove();
    };

    window[callback]=payload=>{
      if(payload&&Array.isArray(payload.transactions)){
        transactions=payload.transactions.map(x=>{
          const rawType=String(x.type||"").trim().toLowerCase();
          const type=rawType==="expenditure"||rawType==="expense"?"expense":rawType==="income"?"income":rawType;
          return{
            ...x,
            id:Number(x.id)||0,
            date:normalizeDate(x.date),
            occation:String(x.occation||x.occasion||"").trim(),
            type,
            description:String(x.description||"").trim(),
            category:String(x.category||"").trim(),
            payment:String(x.payment||"").trim(),
            amount:Number(x.amount)||0,
            runningBalance:x.runningBalance,
            updatedBy:String(x.updatedBy||x.updatedByPerson||"").trim(),
            modifiedDate:x.modifiedDate||""
          };
        });
        try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),transactions:transactions}));}catch(error){}
        liveMode=true;
        render();
        cleanup();
        return;
      }
      cleanup();
      if(attempt<maxAttempts)setTimeout(request,700);
      else if(!cached)showLoadError();
    };

    script.onerror=()=>{
      cleanup();
      if(attempt<maxAttempts)setTimeout(request,700);
      else if(!cached)showLoadError();
    };

    script.src=url+"?prefix="+encodeURIComponent(callback)+"&_="+Date.now();
    document.head.appendChild(script);
    timeout=setTimeout(()=>{
      if(finished)return;
      cleanup();
      if(attempt<maxAttempts)setTimeout(request,700);
      else if(!cached)showLoadError();
    },7000);
  }

  request();
}
function showLoadError(){
  transactions=[];
  render();
  els.empty.hidden=false;
  els.empty.innerHTML="<div class=\"empty-icon\">!</div><h3>Finance data could not be loaded</h3><p>Please refresh the page and try again.</p>";
}
els.adminButton.onclick=()=>{
  const target=window.APP_CONFIG&&window.APP_CONFIG.ADMIN_APP_URL;
  if(target)window.open(target,"_blank","noopener");
  else alert("Admin portal is not configured yet.");
};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{
  currentView=b.dataset.view;
  render();
  document.querySelector(".toolbar").scrollIntoView({behavior:"smooth",block:"start"});
});
els.from.onchange=render;
els.to.onchange=render;
$("clearFilters").onclick=()=>{
  els.from.value="";
  els.to.value="";
  render();
};
const LOGO_DATA_URI="data:image/jpeg;base64,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";
const TEMPLE_NAME="శ్రీ లక్ష్మీ కనక దుర్గ ఆలయం - గోపయ్య చెరువుగట్టు, వేలివెన్ను";

function buildPublicPdfHtml(){
  const list=filtered();
  const all=totals(transactions);
  const generatedAt=new Date().toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});
  const rows=list.map((item,index)=>{
    const balance=item.runningBalance!==undefined&&item.runningBalance!==""?Number(item.runningBalance):runningBalanceMap().get(item.id)||0;
    const isIncome=item.type==="income";
    return "<tr class=\""+(index%2===0?"even":"odd")+"\">"+
      "<td>"+esc(formatDate(item.date))+"</td><td>"+esc(item.occation||"Others")+"</td>"+
      "<td><span class=\"type "+(isIncome?"income":"expense")+"\">"+(isIncome?"Income":"Expenditure")+"</span></td>"+
      "<td>"+esc(item.description)+"</td><td>"+esc(item.category)+"</td><td>"+esc(item.payment)+"</td>"+
      "<td class=\"num "+(isIncome?"income-text":"expense-text")+"\">"+(isIncome?"+ ":"- ")+money(item.amount)+"</td>"+
      "<td class=\"num balance\">"+money(balance)+"</td><td>"+esc(item.updatedBy||"")+"</td><td>"+esc(formatModifiedDate(item.modifiedDate))+"</td></tr>";
  }).join("");
  return "<!doctype html><html><head><meta charset=\"UTF-8\"><title>Temple Finance Report</title><style>"+
    "*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,'Noto Sans Telugu','Noto Sans',sans-serif;color:#2c1b15;padding:9mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}"+
    ".report{border:2px solid #b8860b;padding:5px;background:#fff}.inner{border:1px solid #7b1e12;padding:14px 16px 12px;min-height:250mm}.header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #b8860b;padding:4px 4px 13px}.logo{width:86px;height:86px;object-fit:cover;border-radius:50%;border:3px solid #d4a72c;flex:0 0 86px}.title{text-align:center;flex:1}.title h1{margin:0;color:#7b1e12;font-size:21px;line-height:1.45;font-weight:700}.title h2{margin:5px 0 0;color:#a36b00;font-size:14px;letter-spacing:1.8px;text-transform:uppercase}.title p{margin:6px 0 0;color:#6d5b52;font-size:10px}.om{width:86px;text-align:center;color:#b8860b;font-size:28px;font-weight:bold}"+
    ".summary-title{margin:14px 0 8px;text-align:center;color:#7b1e12;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 14px}.card{border:1px solid #d9c29a;border-top:4px solid #b8860b;border-radius:5px;padding:8px 9px;background:#fffaf0}.card:nth-child(2){border-top-color:#2e7d52}.card:nth-child(3){border-top-color:#a33a32}.card:nth-child(4){border-top-color:#7b1e12}.card span{display:block;font-size:8px;color:#76665d;text-transform:uppercase;letter-spacing:.6px}.card b{display:block;margin-top:4px;font-size:14px;color:#2c1b15}.card.income b{color:#267247}.card.expense b{color:#a33a32}.card.balance b{color:#7b1e12}"+
    ".table-title{background:#7b1e12;color:#fff;padding:7px 9px;font-size:10px;font-weight:bold;letter-spacing:.8px;border-radius:4px 4px 0 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5px}th,td{border:1px solid #d8cbb9;padding:5px 4px;text-align:left;vertical-align:middle;word-wrap:break-word}th{background:#d6a83a;color:#3c2418;font-size:7px;text-transform:uppercase;letter-spacing:.25px;font-weight:700}tr.even td{background:#fffdf8}tr.odd td{background:#fbf4e9}.num{text-align:right;white-space:nowrap}.balance{font-weight:700;color:#7b1e12}.income-text{color:#267247;font-weight:700}.expense-text{color:#a33a32;font-weight:700}.type{display:inline-block;padding:2px 4px;border-radius:8px;font-size:6.5px;font-weight:bold}.type.income{background:#e6f3eb;color:#267247}.type.expense{background:#f8e3e0;color:#a33a32}.footer{margin-top:13px;padding-top:8px;border-top:1px solid #d9c29a;display:flex;justify-content:space-between;gap:10px;color:#806f65;font-size:8px}.footer strong{color:#7b1e12}@page{size:A4 landscape;margin:5mm}@media print{body{padding:0}.report{min-height:195mm}.inner{min-height:185mm}}"+
    "</style></head><body><div class=\"report\"><div class=\"inner\"><div class=\"header\"><img class=\"logo\" src=\""+LOGO_DATA_URI+"\" alt=\"Temple Logo\"><div class=\"title\"><h1>"+esc(TEMPLE_NAME)+"</h1><h2>Temple Finance Report</h2><p>Public Finance Report • "+esc(generatedAt)+"</p></div><div class=\"om\">ॐ</div></div>"+
    "<div class=\"summary-title\">Financial Summary</div><div class=\"cards\"><div class=\"card\"><span>Total Entries</span><b>"+list.length+"</b></div><div class=\"card income\"><span>Total Income</span><b>"+money(all.income)+"</b></div><div class=\"card expense\"><span>Total Expenditure</span><b>"+money(all.expense)+"</b></div><div class=\"card balance\"><span>Remaining Balance</span><b>"+money(all.balance)+"</b></div></div>"+
    "<div class=\"table-title\">TRANSACTION DETAILS</div><table><thead><tr><th style=\"width:8%\">Transaction Date</th><th style=\"width:8%\">Occation</th><th style=\"width:7%\">Type</th><th style=\"width:15%\">Description</th><th style=\"width:11%\">Category</th><th style=\"width:9%\">Payment Mode</th><th style=\"width:9%\">Amount</th><th style=\"width:10%\">Running Balance</th><th style=\"width:10%\">Updated by Person</th><th style=\"width:13%\">Modified Date</th></tr></thead><tbody>"+rows+"</tbody></table>"+
    "<div class=\"footer\"><span><strong>"+esc(TEMPLE_NAME)+"</strong></span><span>Temple Finance Records • Official Report</span></div></div></div></body></html>";
}

$("exportPdf").onclick=()=>{
  if(!transactions.length){alert("There are no transactions to export.");return;}
  const win=window.open("","_blank");
  if(!win){alert("Please allow pop-ups for this site to export the PDF.");return;}
  win.document.open();win.document.write(buildPublicPdfHtml());win.document.close();win.focus();
  setTimeout(()=>win.print(),500);
};
els.backdrop.onclick=e=>{if(e.target===els.backdrop)els.backdrop.hidden=true};
$("modalClose").onclick=()=>els.backdrop.hidden=true;
render();
loadLiveData();