import React from "react";
export default function AiStatusBar({error,onRetry}:{error:string;onRetry:()=>void}){if(!error)return null;return <div className="fai-error">{error}<button onClick={onRetry}>Retry</button></div>}
