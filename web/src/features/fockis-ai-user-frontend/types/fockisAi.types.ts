export type AiRole = "user" | "assistant" | "system";
export interface AiMessage {
  id:string; role:AiRole; content:string; createdAt:string;
  status?:"sending"|"sent"|"error";
}
export interface AiConversation {
  id:string; title:string; updatedAt:string; messages:AiMessage[];
}
export type AiConnection = "offline"|"ready"|"connecting"|"connected"|"error";
export type AiVoiceStatus = "idle"|"connecting"|"listening"|"speaking"|"ended"|"error";
