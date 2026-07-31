"use client";

import { useEffect, useMemo, useState } from "react";
import { categories, dailyTasks, inventorySeed } from "@/lib/seed";
import { vyaparItems } from "@/lib/vyapar-items";
import type { ActivityEntry, DailyTask, InventoryItem, Shift, TaskCompletion, RentalAsset, OrderQueueEntry } from "@/lib/types";

type View = "today" | "inventory" | "orders" | "vyapar" | "rentals" | "documents" | "activity";
type Filter = "all" | "low" | "out";
const ITEM_KEY = "sam-inventory-v4";
const TASK_KEY = "sam-daily-tasks-v1";
const ACTIVITY_KEY = "sam-activity-v2";
const RENTAL_KEY = "sam-rentals-v1";
const ORDER_QUEUE_KEY = "sam-order-queue-v1";
const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (item: InventoryItem) => item.currentQty <= 0 ? "out" as const : item.currentQty < item.minimumQty ? "low" as const : "ok" as const;

export default function StoreApp() {
  const [view, setView] = useState<View>("today");
  const [shift, setShift] = useState<Shift>("morning");
  const [items, setItems] = useState<InventoryItem[]>(inventorySeed);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [rentals, setRentals] = useState<RentalAsset[]>([
    { id: "ladder-1", name: "Ladder 1", type: "Ladder", status: "available" },
    { id: "ladder-2", name: "Ladder 2", type: "Ladder", status: "available" },
    { id: "ladder-3", name: "Ladder 3", type: "Ladder", status: "available" },
    { id: "jhula-1", name: "Jhula 1", type: "Jhula", status: "available" },
    { id: "jhula-2", name: "Jhula 2", type: "Jhula", status: "available" }
  ]);
  const [orderQueue, setOrderQueue] = useState<OrderQueueEntry[]>([]);

  useEffect(() => {
    try {
      const savedItems = JSON.parse(localStorage.getItem(ITEM_KEY) || "[]") as InventoryItem[];
      const map = new Map(savedItems.map(x => [x.id, x]));
      if (savedItems.length) setItems(inventorySeed.map(x => ({ ...x, ...(map.get(x.id) || {}) })));
      setCompletions(JSON.parse(localStorage.getItem(TASK_KEY) || "[]"));
      setActivities(JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"));
      const savedRentals = JSON.parse(localStorage.getItem(RENTAL_KEY) || "[]");
      if (savedRentals.length) setRentals(savedRentals);
      setOrderQueue(JSON.parse(localStorage.getItem(ORDER_QUEUE_KEY) || "[]"));
    } catch { /* keep seed data */ }
  }, []);
  useEffect(() => localStorage.setItem(ITEM_KEY, JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem(TASK_KEY, JSON.stringify(completions)), [completions]);
  useEffect(() => localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities)), [activities]);
  useEffect(() => localStorage.setItem(RENTAL_KEY, JSON.stringify(rentals)), [rentals]);
  useEffect(() => localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(orderQueue)), [orderQueue]);

  const addActivity = (entry: Omit<ActivityEntry, "id" | "timestamp">) => setActivities(v => [{ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() }, ...v].slice(0, 250));
  const toast = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 1800); };
  const isDone = (id: string) => completions.some(x => x.taskId === id && x.date === today());
  const toggleTask = (task: DailyTask) => {
    if (isDone(task.id)) {
      setCompletions(v => v.filter(x => !(x.taskId === task.id && x.date === today())));
      addActivity({ type: "task", actor: "Current user", message: `Reopened: ${task.title}` });
    } else {
      setCompletions(v => [...v, { taskId: task.id, date: today(), completedAt: new Date().toISOString(), completedBy: "Current user" }]);
      addActivity({ type: "task", actor: "Current user", message: `Completed ${task.shift} task: ${task.title}` });
      toast(`${task.title} completed.`);
    }
  };
  const updateQty = (id: string, qty: number) => setItems(v => v.map(x => x.id === id ? { ...x, currentQty: Math.max(0, qty), lastCheckedAt: new Date().toISOString(), lastCheckedBy: "Current user" } : x));
  const checkItem = (item: InventoryItem) => { updateQty(item.id, item.currentQty); addActivity({ type: "stock-check", actor: "Current user", message: `${item.name} checked: ${item.currentQty} ${item.unit}` }); toast(`${item.name} checked.`); };
  const reorder = (item: InventoryItem) => {
    const qty = Math.max(0, item.targetQty - item.currentQty);
    setOrderQueue(q => q.some(x => x.itemId === item.id) ? q : [...q, { itemId: item.id, itemName: item.name, quantity: qty, estimatedValue: Math.max(0, qty * (item.estimatedUnitValue || 0)), addedAt: new Date().toISOString() }]);
    addActivity({ type: "reorder", actor: "Current user", message: `Added to held order queue: ${item.name} (${qty} ${item.unit})` });
    toast(`${item.name} added to order queue.`);
  };

  const progress = (s: Shift) => {
    const tasks = dailyTasks.filter(x => x.shift === s);
    const done = tasks.filter(x => isDone(x.id)).length;
    return { done, total: tasks.length, pct: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  };
  const metrics = useMemo(() => ({
    out: items.filter(x => statusOf(x) === "out").length,
    low: items.filter(x => statusOf(x) === "low").length,
    orderLines: items.filter(x => statusOf(x) !== "ok").length,
    pendingBills: items.filter(x => x.categoryId === "invoices").reduce((n, x) => n + x.currentQty, 0)
  }), [items]);
  const visible = useMemo(() => items.filter(item => {
    const q = query.toLowerCase().trim();
    return (selectedCategory === "all" || item.categoryId === selectedCategory) && (filter === "all" || statusOf(item) === filter) && (!q || `${item.name} ${item.location}`.toLowerCase().includes(q));
  }), [items, selectedCategory, filter, query]);

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">SOS</div><div className="brand-copy"><strong>Store Operations</strong><span>Accountability System</span></div>
      <nav>{(["today", "inventory", "orders", "vyapar", "rentals", "documents", "activity"] as View[]).map(v => <button key={v} className={view === v ? "nav-active" : ""} onClick={() => setView(v)}>{v === "today" ? "Today's work" : v === "vyapar" ? "Vyapar controls" : v}</button>)}</nav>
      <div className="sidebar-foot"><div className="role-pill">Store Manager</div><small>Node.js 24 · React</small></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">Daily control centre</p><h1>{view === "today" ? "Today’s store routine" : title(view)}</h1></div><div className="top-actions"><span className="date-chip">{new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date())}</span></div></header>
      {notice && <div className="notice">{notice}</div>}

      {view === "today" && <>
        <section className="metric-grid">
          <Metric label="Out of stock" value={metrics.out} tone="danger" helper="Immediate action" />
          <Metric label="Below minimum" value={metrics.low} tone="warning" helper="Order required" />
          <Metric label="Order lines" value={metrics.orderLines} tone="neutral" helper="To reach target" />
          <Metric label="Pending documents" value={metrics.pendingBills} tone="success" helper="Invoices and bills" />
        </section>
        <section className="shift-summary">
          {(["morning", "afternoon", "evening"] as Shift[]).map(s => { const p = progress(s); return <button key={s} className={`shift-card ${shift === s ? "selected" : ""}`} onClick={() => setShift(s)}><span className="shift-icon">{s === "morning" ? "☀" : s === "afternoon" ? "◐" : "☾"}</span><div><small>{s} routine</small><strong>{p.done}/{p.total} complete</strong><div className="progress-track"><i style={{ width: `${p.pct}%` }} /></div></div><b>{p.pct}%</b></button>; })}
        </section>
        <section className="routine-layout">
          <div className="panel routine-panel">
            <div className="section-head"><div><p className="eyebrow">{shift} checklist</p><h2>{shiftHeading(shift)}</h2></div><span className="owner-chip">Mandatory daily</span></div>
            <div className="task-list">{dailyTasks.filter(x => x.shift === shift).map(task => <TaskCard key={task.id} task={task} done={isDone(task.id)} onToggle={() => toggleTask(task)} onOpen={() => { if (task.categoryId) { setSelectedCategory(task.categoryId); setView("inventory"); } }} />)}</div>
          </div>
          <aside className="panel day-score"><p className="eyebrow">Daily accountability</p><h2>Today’s score</h2><div className="score-ring"><strong>{Math.round((["morning", "afternoon", "evening"] as Shift[]).reduce((n,s)=>n+progress(s).pct,0)/3)}</strong><span>/100</span></div><p>Complete every routine and resolve low-stock issues before closing.</p><div className="mini-stats"><div><b>{completions.filter(x => x.date === today()).length}</b><span>tasks complete</span></div><div><b>{metrics.orderLines}</b><span>stock issues</span></div></div></aside>
        </section>
      </>}

      {view === "inventory" && <section className="panel"><div className="section-head"><div><p className="eyebrow">Master stock register</p><h2>Stock, sorting and availability</h2></div></div><div className="filters"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search item or location…"/><select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}><option value="all">All sections</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="all">All status</option><option value="low">Below minimum</option><option value="out">Out of stock</option></select></div><div className="inventory-table"><div className="table-head"><span>Item</span><span>Current / minimum</span><span>Responsibility</span><span>Action</span></div>{visible.map(item=><InventoryRow key={item.id} item={item} onQty={updateQty} onCheck={()=>checkItem(item)} onReorder={()=>reorder(item)}/>)}</div></section>}
      {view === "orders" && <Orders items={items} queue={orderQueue} setQueue={setOrderQueue} onReorder={reorder} addActivity={addActivity}/>} 
      {view === "vyapar" && <VyaparControls addActivity={addActivity}/>}
      {view === "rentals" && <Rentals rentals={rentals} setRentals={setRentals} addActivity={addActivity}/>} 
      {view === "documents" && <Documents addActivity={addActivity}/>} 
      {view === "activity" && <section className="panel"><div className="section-head"><div><p className="eyebrow">Audit trail</p><h2>Accountability history</h2></div></div><div className="timeline">{activities.length ? activities.map(a=><div className="timeline-row" key={a.id}><div className={`activity-icon ${a.type}`}>{a.type[0].toUpperCase()}</div><div><b>{a.message}</b><p>{a.actor} · {new Intl.DateTimeFormat("en-IN", { dateStyle:"medium", timeStyle:"short" }).format(new Date(a.timestamp))}</p></div></div>) : <div className="empty-state">No activity recorded yet.</div>}</div></section>}
    </section>
  </main>;
}

function TaskCard({task,done,onToggle,onOpen}:{task:DailyTask;done:boolean;onToggle:()=>void;onOpen:()=>void}) { return <article className={`task-card ${done ? "done" : ""}`}><button className="check-button" onClick={onToggle}>{done ? "✓" : ""}</button><div className="task-copy"><div><h3>{task.title}</h3><span className="owner-chip">{task.owner}</span></div><p>{task.description}</p><small>{task.evidenceRequired ? "Photo evidence required" : "Checklist confirmation"}</small></div>{task.categoryId && <button className="secondary" onClick={onOpen}>Check stock</button>}</article> }
function Metric({label,value,tone,helper}:{label:string;value:number|string;tone:string;helper:string}) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{helper}</small></article> }
function InventoryRow({item,onQty,onCheck,onReorder}:{item:InventoryItem;onQty:(id:string,q:number)=>void;onCheck:()=>void;onReorder:()=>void}) { const status=statusOf(item); return <div className="inventory-row"><div className="item-main"><span className={`status-dot ${status}`}/><div><b>{item.name}</b><small>{item.location} · target {item.targetQty} {item.unit}</small></div></div><div className="qty-control"><button onClick={()=>onQty(item.id,item.currentQty-1)}>−</button><input type="number" min="0" value={item.currentQty} onChange={e=>onQty(item.id,Number(e.target.value))}/><button onClick={()=>onQty(item.id,item.currentQty+1)}>+</button><span>/ min {item.minimumQty}</span></div><div><span className="owner-chip">{item.responsible}</span><small className="last-check">{item.lastCheckedAt ? "Checked today" : "Not checked"}</small></div><div className="row-actions"><button className="secondary" onClick={onCheck}>Checked</button>{status!=="ok"&&<button className="danger-button" onClick={onReorder}>Order {Math.max(0,item.targetQty-item.currentQty)}</button>}</div></div> }
function Orders({items,queue,setQueue,onReorder,addActivity}:{items:InventoryItem[];queue:OrderQueueEntry[];setQueue:React.Dispatch<React.SetStateAction<OrderQueueEntry[]>>;onReorder:(i:InventoryItem)=>void;addActivity:(a:Omit<ActivityEntry,"id"|"timestamp">)=>void}) {
  const low=items.filter(i=>statusOf(i)!=="ok");
  const total=queue.reduce((n,x)=>n+x.estimatedValue,0);
  const ready=total>=50000;
  const process=()=>{ if(!ready)return; addActivity({type:"reorder",actor:"Current user",message:`Purchase order processed for ₹${total.toLocaleString("en-IN")}; ${queue.length} queued lines cleared.`}); setQueue([]); };
  return <section className="panel"><div className="section-head"><div><p className="eyebrow">Held purchase queue</p><h2>Transport threshold ordering</h2><p>Low-stock articles stay in the queue until estimated order value reaches ₹50,000. Processing the order clears the queue.</p></div><div><b>₹{total.toLocaleString("en-IN")}</b><small className="last-check"> / ₹50,000</small></div></div>
  <div className="progress-track"><i style={{width:`${Math.min(100,total/500)}%`}}/></div>
  <div className="queue-actions"><span className={`owner-chip ${ready?"":"muted"}`}>{ready?"Ready to order":"Hold order"}</span><button className="primary" disabled={!ready||!queue.length} onClick={process}>Process purchase order</button></div>
  <h3>Order queue</h3><div className="order-grid">{queue.map(q=><article className="order-card" key={q.itemId}><div><small>Queued item</small><h3>{q.itemName}</h3><p>Quantity {q.quantity}</p><label>Estimated line value<input type="number" min="0" value={q.estimatedValue} onChange={e=>setQueue(v=>v.map(x=>x.itemId===q.itemId?{...x,estimatedValue:Number(e.target.value)}:x))}/></label></div><button className="secondary" onClick={()=>setQueue(v=>v.filter(x=>x.itemId!==q.itemId))}>Remove</button></article>)}</div>
  <h3>Low-stock suggestions</h3><div className="order-grid">{low.filter(i=>!queue.some(q=>q.itemId===i.id)).map(i=><article className="order-card" key={i.id}><div><small>{categories.find(c=>c.id===i.categoryId)?.name}</small><h3>{i.name}</h3><p>Current {i.currentQty} · Minimum {i.minimumQty} · Target {i.targetQty}</p></div><strong>Add {Math.max(0,i.targetQty-i.currentQty)} {i.unit}</strong><button className="primary" onClick={()=>onReorder(i)}>Add to queue</button></article>)}</div></section>
}

function VyaparControls({addActivity}:{addActivity:(a:Omit<ActivityEntry,"id"|"timestamp">)=>void}) {
  const [item,setItem]=useState(""); const [canonical,setCanonical]=useState(""); const [party,setParty]=useState(""); const [previous,setPrevious]=useState("");
  const [masterQuery,setMasterQuery]=useState(""); const [stockFilter,setStockFilter]=useState<"all"|"positive"|"zero"|"negative">("all");
  const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g," ").trim();
  const duplicateGroups=useMemo(()=>{
    const groups=new Map<string,typeof vyaparItems>();
    for(const entry of vyaparItems){
      const key=normalize(entry.name).replace(/\b(full|small|size|inch|in|no|number)\b/g,"").replace(/\s+/g," ").trim();
      if(!key) continue;
      groups.set(key,[...(groups.get(key)||[]),entry]);
    }
    return [...groups.values()].filter(group=>group.length>1);
  },[]);
  const visibleMaster=useMemo(()=>vyaparItems.filter(entry=>{
    const q=masterQuery.trim().toLowerCase();
    const matches=!q || `${entry.itemCode} ${entry.name} ${entry.hsn}`.toLowerCase().includes(q);
    const stock=stockFilter==="all" || (stockFilter==="positive"&&entry.currentStock>0) || (stockFilter==="zero"&&entry.currentStock===0) || (stockFilter==="negative"&&entry.currentStock<0);
    return matches&&stock;
  }).slice(0,200),[masterQuery,stockFilter]);
  const saveItem=(e:React.FormEvent)=>{e.preventDefault();addActivity({type:"stock-check",actor:"Current user",message:`Vyapar item check: attempted “${item}”; selected existing/correct item “${canonical}”. Duplicate creation avoided.`});setItem("");setCanonical("");};
  const saveParty=(e:React.FormEvent)=>{e.preventDefault();addActivity({type:"cash-token",actor:"Current user",message:`Vyapar party verified: customer ${party}; previous billing name ${previous}. Family-member duplicate avoided.`});setParty("");setPrevious("");};
  return <section>
    <div className="metric-grid">
      <Metric label="Imported Vyapar items" value={vyaparItems.length} helper="From uploaded item export"/>
      <Metric label="Positive stock" value={vyaparItems.filter(x=>x.currentStock>0).length} tone="success" helper="Available in Vyapar"/>
      <Metric label="Zero stock" value={vyaparItems.filter(x=>x.currentStock===0).length} tone="warning" helper="Review before billing"/>
      <Metric label="Negative stock" value={vyaparItems.filter(x=>x.currentStock<0).length} tone="danger" helper="Requires correction"/>
    </div>
    <section className="two-column documents-layout"><div className="panel"><p className="eyebrow">Vyapar item master</p><h2>Do not create duplicate items</h2><div className="workflow"><div><span>1</span><b>Search before creating</b><p>Search spelling, pack size, standard name and local name.</p></div><div><span>2</span><b>Use one canonical name</b><p>“Dhoti”, “Dhoti full size” and misspellings must not become accidental duplicates.</p></div><div><span>3</span><b>Map local terminology</b><p>Blade and patti may describe the same article; select the approved master item.</p></div></div><form className="form-panel" onSubmit={saveItem}><label>Name typed during invoice<input required value={item} onChange={e=>setItem(e.target.value)} placeholder="e.g. patti"/></label><label>Correct existing Vyapar item<input required value={canonical} onChange={e=>setCanonical(e.target.value)} placeholder="Search the item master below"/></label><button className="primary full">Record duplicate prevented</button></form></div>
    <div className="panel"><p className="eyebrow">Vyapar party master</p><h2>Keep one customer account</h2><p>Ask: “Kya aap isse pehle samaan leke gaye hain? Agar haan, kis naam se bill bana tha?” This protects price history and prevents family-member duplicates.</p><form className="form-panel" onSubmit={saveParty}><label>Person currently purchasing<input required value={party} onChange={e=>setParty(e.target.value)}/></label><label>Existing party/billing name<input required value={previous} onChange={e=>setPrevious(e.target.value)}/></label><button className="primary full">Confirm existing party</button></form><div className="warning-box"><b>Price consistency control</b><p>Always review the existing party’s previous sale price before changing the rate or discount.</p></div></div></section>
    <section className="panel">
      <div className="section-head"><div><p className="eyebrow">Uploaded Vyapar export</p><h2>Complete item master and stock snapshot</h2><p>Search by item code, product name or HSN. The table shows the first 200 matching records for fast performance.</p></div></div>
      <div className="filters"><input value={masterQuery} onChange={e=>setMasterQuery(e.target.value)} placeholder="Search code, item or HSN…"/><select value={stockFilter} onChange={e=>setStockFilter(e.target.value as typeof stockFilter)}><option value="all">All stock</option><option value="positive">Positive stock</option><option value="zero">Zero stock</option><option value="negative">Negative stock</option></select></div>
      <div className="inventory-table vyapar-master-table">
        <div className="table-head"><span>Code / item</span><span>Stock</span><span>Prices</span><span>Tax</span></div>
        {visibleMaster.map(entry=><div className="inventory-row" key={entry.id}><div className="item-main"><span className={`status-dot ${entry.currentStock<0?"out":entry.currentStock===0?"low":"ok"}`}/><div><b>{entry.name}</b><small>{entry.itemCode||"No item code"}{entry.hsn?` · HSN ${entry.hsn}`:""}</small></div></div><div><b>{entry.currentStock}</b><small className="last-check">Minimum {entry.minimumStock}</small></div><div><b>Sale ₹{entry.salePrice}</b><small className="last-check">Purchase ₹{entry.purchasePrice} · MRP ₹{entry.mrp}</small></div><div><span className="owner-chip">{entry.taxRate||"Tax not set"}</span><small className="last-check">Inclusive: {entry.taxInclusive||"—"}</small></div></div>)}
      </div>
      <p className="table-note">Showing {visibleMaster.length} of {vyaparItems.length} imported items.</p>
    </section>
    <section className="panel">
      <p className="eyebrow">Duplicate review queue</p><h2>Likely duplicate names found in the export</h2>
      <p>These groups are generated using simplified spelling comparison. Staff should verify them in Vyapar before merging or renaming anything.</p>
      <div className="order-grid">{duplicateGroups.slice(0,24).map((group,index)=><article className="order-card" key={index}><div><small>{group.length} similar entries</small><h3>{group[0].name}</h3><p>{group.slice(1,4).map(x=>x.name).join(" · ")}</p></div></article>)}</div>
    </section>
  </section>
}
function Rentals({rentals,setRentals,addActivity}:{rentals:RentalAsset[];setRentals:React.Dispatch<React.SetStateAction<RentalAsset[]>>;addActivity:(a:Omit<ActivityEntry,"id"|"timestamp">)=>void}) {
  const [selected,setSelected]=useState(""); const [customer,setCustomer]=useState(""); const [phone,setPhone]=useState(""); const [rate,setRate]=useState("90"); const [days,setDays]=useState("1"); const [advance,setAdvance]=useState("0");
  const rent=(e:React.FormEvent)=>{e.preventDefault();const now=new Date();const due=new Date(now.getTime()+Number(days)*86400000);setRentals(v=>v.map(x=>x.id===selected?{...x,status:"rented",customerName:customer,phone,dailyRate:Number(rate),rentedAt:now.toISOString(),dueAt:due.toISOString(),advancePaid:Number(advance)}:x));addActivity({type:"task",actor:"Current user",message:`${rentals.find(x=>x.id===selected)?.name} rented to ${customer} at ₹${rate}/day for ${days} day(s).`});setSelected("");setCustomer("");setPhone("");};
  const returned=(asset:RentalAsset)=>{const start=new Date(asset.rentedAt||Date.now()).getTime();const daysUsed=Math.max(1,Math.ceil((Date.now()-start)/86400000));const total=daysUsed*(asset.dailyRate||0);const due=Math.max(0,total-(asset.advancePaid||0));addActivity({type:"task",actor:"Current user",message:`${asset.name} returned by ${asset.customerName}. ${daysUsed} day(s), total ₹${total}, balance ₹${due}.`});setRentals(v=>v.map(x=>x.id===asset.id?{id:x.id,name:x.name,type:x.type,status:"available"}:x));};
  return <section><div className="metric-grid"><Metric label="Ladders available" value={rentals.filter(x=>x.type==="Ladder"&&x.status==="available").length} tone="success" helper="Out of 3"/><Metric label="Jhulas available" value={rentals.filter(x=>x.type==="Jhula"&&x.status==="available").length} tone="success" helper="Out of 2"/><Metric label="Currently rented" value={rentals.filter(x=>x.status==="rented").length} tone="warning" helper="Track customer and dues"/></div><section className="two-column documents-layout"><form className="panel form-panel" onSubmit={rent}><p className="eyebrow">New rental</p><h2>Issue ladder or jhula</h2><label>Available asset<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select</option>{rentals.filter(x=>x.status==="available").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Customer name<input required value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label>Phone<input required value={phone} onChange={e=>setPhone(e.target.value)}/></label><div className="form-grid"><label>Daily rate<input type="number" required value={rate} onChange={e=>setRate(e.target.value)}/></label><label>Expected days<input type="number" min="1" required value={days} onChange={e=>setDays(e.target.value)}/></label></div><label>Advance paid<input type="number" min="0" value={advance} onChange={e=>setAdvance(e.target.value)}/></label><button className="primary full">Issue asset</button></form><div className="panel"><p className="eyebrow">Live rental register</p><h2>Who has what</h2><div className="task-list">{rentals.map(a=><article className={`task-card ${a.status==="available"?"done":""}`} key={a.id}><div className="task-copy"><div><h3>{a.name}</h3><span className="owner-chip">{a.status}</span></div>{a.status==="rented"?<p>{a.customerName} · {a.phone}<br/>₹{a.dailyRate}/day · advance ₹{a.advancePaid||0}<br/>Due {a.dueAt?new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(a.dueAt)):"—"}</p>:<p>Ready to issue</p>}</div>{a.status==="rented"&&<button className="primary" onClick={()=>returned(a)}>Return & calculate</button>}</article>)}</div></div></section></section>
}

function Documents({addActivity}:{addActivity:(a:Omit<ActivityEntry,"id"|"timestamp">)=>void}) { const [form,setForm]=useState({type:"GST invoice",vendor:"",date:today(),articles:"",amount:"",payment:"Cash",reference:""}); const submit=(e:React.FormEvent)=>{e.preventDefault();addActivity({type:"invoice",actor:"Current user",message:`${form.type} recorded for ${form.vendor}: ₹${form.amount}`});setForm({...form,vendor:"",articles:"",amount:"",reference:""});}; return <section className="two-column documents-layout"><form className="panel form-panel" onSubmit={submit}><div className="section-head"><div><p className="eyebrow">Purchase evidence</p><h2>Add invoice or kachha bill</h2></div></div><label>Document type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>GST invoice</option><option>Temporary / kachha invoice</option><option>Self-created purchase record</option></select></label><div className="form-grid"><label>Vendor<input required value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/></label><label>Date<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label></div><label>Articles<textarea rows={4} required value={form.articles} onChange={e=>setForm({...form,articles:e.target.value})}/></label><div className="form-grid"><label>Amount<input type="number" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Payment<select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}><option>Cash</option><option>Bank transfer</option><option>UPI</option><option>Card</option></select></label></div><label>Account / transaction reference<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></label><button className="primary full">Save record</button></form><div className="panel"><p className="eyebrow">Required workflow</p><h2>No purchase without an entry</h2><div className="workflow"><div><span>1</span><b>Purchase happens</b><p>Record every cash, bank, UPI or card purchase.</p></div><div><span>2</span><b>Collect GST invoice</b><p>Use the GST document whenever available.</p></div><div><span>3</span><b>Create temporary record</b><p>When missing, record vendor, date, articles, amount and payment source.</p></div><div><span>4</span><b>Enter then file</b><p>Pending bills stay in the drawer; entered bills move to the correct file.</p></div></div></div></section> }
function title(v:View){return ({inventory:"Inventory register",orders:"Reorder centre",vyapar:"Vyapar controls",rentals:"Rental management",documents:"Invoice control",activity:"Accountability log",today:"Today’s work"} as const)[v]}
function shiftHeading(s:Shift){return s==="morning"?"Opening and counter readiness":s==="afternoon"?"Paint display and stock management":"Closing and handover checks"}
