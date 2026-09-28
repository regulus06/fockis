import React,{useState} from "react";
import type {AiConversation} from "../types/fockisAi.types";
export default function AiConversationList({items,active,onSelect,onRename,onDelete}:{items:AiConversation[];active:string;onSelect:(id:string)=>void;onRename:(id:string,t:string)=>void;onDelete:(id:string)=>void}){
 const [q,setQ]=useState(""); const rows=items.filter(x=>x.title.toLowerCase().includes(q.toLowerCase()));
 return <div className="fai-history"><input placeholder="⌕  Search chats" value={q} onChange={e=>setQ(e.target.value)}/><label>Recent</label>{rows.map(x=><div className={`fai-chat-row ${x.id===active?"active":""}`} key={x.id}><button onClick={()=>onSelect(x.id)}>✦ <span>{x.title}<small>{x.messages.length} messages</small></span></button><aside><button onClick={()=>{const t=prompt("Rename conversation",x.title);if(t!==null)onRename(x.id,t)}}>✎</button><button onClick={()=>{if(confirm(`Delete "${x.title}"?`))onDelete(x.id)}}>×</button></aside></div>)}</div>
}
