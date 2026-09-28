import React,{useState} from "react";
export default function AiChatComposer({disabled,onSend,onVoice,voiceActive}:{disabled?:boolean;onSend:(x:string)=>void;onVoice:()=>void;voiceActive:boolean}){
 const [v,setV]=useState("");
 const submit=()=>{if(!v.trim()||disabled)return;onSend(v.trim());setV("")};
 return <form className="fai-composer-wrap" onSubmit={e=>{e.preventDefault();submit()}}><div className="fai-composer">
  <textarea value={v} disabled={disabled} rows={1} placeholder="Message Fockis AI…" onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit()}}}/>
  <button type="button" className={voiceActive?"active":""} onClick={onVoice}>{voiceActive?"■":"🎙"}</button><button className="fai-send" disabled={disabled||!v.trim()}>↑</button>
 </div><div className="fai-hint">Enter to send · Shift + Enter for a new line · 🎙 voice</div></form>
}
