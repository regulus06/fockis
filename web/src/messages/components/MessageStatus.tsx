import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import type { MessageStatus as MessageStatusType } from '../types';

interface MessageStatusProps {
  status: MessageStatusType;
}

export default function MessageStatus({ status }: MessageStatusProps) {
  if (status === 'sending') return <Clock size={14} className="msg-status msg-status--sending" />;
  if (status === 'failed') return <AlertCircle size={14} className="msg-status msg-status--failed" />;
  if (status === 'sent') return <Check size={15} className="msg-status msg-status--sent" />;
  if (status === 'delivered') return <CheckCheck size={15} className="msg-status msg-status--delivered" />;
  return <CheckCheck size={15} className="msg-status msg-status--read" />;
}
