import React from "react";
export default function AiChatHeader({title,connection,onMenu,onNew}:{title:string;connection:string;onMenu:()=>void;onNew:()=>void}){
 return <header className="fai-header"><button className="fai-mobile" onClick={onMenu}>☰</button><div className="fai-header-title"><span>✦</span><div><b>{title||"Fockis AI"}</b><small><i className={connection}/>{connection==="connected"?"AI is live":connection==="connecting"?"Connecting…":"Fockis AI"}</small></div></div><button className="fai-new" onClick={onNew}>＋ <em>New chat</em></button></header>
}
