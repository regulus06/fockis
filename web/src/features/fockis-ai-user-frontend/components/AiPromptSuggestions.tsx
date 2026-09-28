import React from "react";
const prompts=["Help me create a Fockis post.","Help me debug React and TypeScript.","Teach me a cybersecurity concept.","Help me plan my next project."];
export default function AiPromptSuggestions({onSelect}:{onSelect:(x:string)=>void}){return <div className="fai-prompts">{prompts.map((x,i)=><button key={x} onClick={()=>onSelect(x)}><b>{["✦","⌘","◈","↗"][i]}</b><strong>{x}</strong><small>Ask Fockis AI</small></button>)}</div>}
