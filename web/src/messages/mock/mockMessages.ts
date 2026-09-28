import type { Message, Reaction } from '../types';
import { CURRENT_USER_ID } from './mockUsers';
import {
  mockImageAttachment,
  mockVideoAttachment,
  mockDocumentAttachment,
  mockAudioAttachment,
} from './mockAttachments';

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}`;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const reaction = (emoji: Reaction['emoji'], userIds: string[]): Reaction => ({ emoji, userIds });

function text(
  conversationId: string,
  senderId: string,
  body: string,
  minsAgo: number,
  extra: Partial<Message> = {},
): Message {
  return {
    id: nextId(),
    conversationId,
    senderId,
    type: 'text',
    text: body,
    status: senderId === CURRENT_USER_ID ? 'read' : 'read',
    createdAt: minutesAgo(minsAgo),
    ...extra,
  };
}

// --- Conversation: John Smith ---
const cJohn = 'conv-john';
const johnMessages: Message[] = [
  text(cJohn, 'u-john', 'Hey! Are you coming to the game night on Friday?', 240),
  text(cJohn, CURRENT_USER_ID, 'Yeah, wouldn\'t miss it 😄', 235),
  text(cJohn, 'u-john', 'Awesome, bringing snacks or should I handle it?', 233),
  text(cJohn, CURRENT_USER_ID, 'I\'ll grab drinks and chips', 230, {
    reactions: [reaction('👍', ['u-john'])],
  }),
  {
    id: nextId(),
    conversationId: cJohn,
    senderId: 'u-john',
    type: 'image',
    attachments: [mockImageAttachment('john-setup', 'New desk setup, finally done!')],
    status: 'read',
    createdAt: minutesAgo(180),
  },
  text(cJohn, CURRENT_USER_ID, 'That looks incredible, love the lighting', 178, {
    reactions: [reaction('😮', ['u-john'])],
  }),
  text(cJohn, 'u-john', 'Thanks man, took forever to route the cables', 175),
  text(cJohn, 'u-john', 'Hey, are you coming?', 60, {
    replyTo: undefined,
  }),
  text(cJohn, CURRENT_USER_ID, 'Yes! Leaving in 10 minutes', 58, {
    replyTo: { messageId: '', senderName: 'John Smith', preview: 'Hey, are you coming?', type: 'text' },
  }),
  text(cJohn, 'u-john', 'Perfect, see you soon 🎉', 55, { status: 'delivered' }),
];
// wire the reply id properly
johnMessages[8].replyTo!.messageId = johnMessages[7].id;

// --- Conversation: Sarah Johnson ---
const cSarah = 'conv-sarah';
const sarahMessages: Message[] = [
  text(cSarah, 'u-sarah', 'Did you get a chance to review the proposal doc?', 1440),
  {
    id: nextId(),
    conversationId: cSarah,
    senderId: 'u-sarah',
    type: 'document',
    attachments: [mockDocumentAttachment('Q3-Marketing-Proposal.pdf', 'application/pdf', 2_150_000)],
    status: 'read',
    createdAt: minutesAgo(1438),
  },
  text(cSarah, CURRENT_USER_ID, 'Looking now, give me a few minutes', 1400),
  text(cSarah, CURRENT_USER_ID, 'This is really solid work. Loved the section on channel mix.', 1350, {
    reactions: [reaction('❤️', ['u-sarah'])],
  }),
  text(cSarah, 'u-sarah', 'Thank you!! I reworked the budget slide too', 1340),
  text(cSarah, 'u-sarah', 'Can we hop on a call tomorrow to finalize?', 20),
];

// --- Conversation: Michael Brown ---
const cMichael = 'conv-michael';
const michaelMessages: Message[] = [
  text(cMichael, 'u-michael', 'Bro check this out 😂', 720),
  {
    id: nextId(),
    conversationId: cMichael,
    senderId: 'u-michael',
    type: 'video',
    attachments: [mockVideoAttachment('michael-clip')],
    status: 'read',
    createdAt: minutesAgo(718),
    reactions: [reaction('😂', [CURRENT_USER_ID])],
  },
  text(cMichael, CURRENT_USER_ID, 'LMAOOO where did you find this', 715),
  text(cMichael, 'u-michael', 'my algorithm is unhinged at this point', 710),
  text(cMichael, 'u-michael', 'wyd this weekend', 5),
];

// --- Conversation: David Williams ---
const cDavid = 'conv-david';
const davidMessages: Message[] = [
  text(cDavid, 'u-david', 'Thanks for the referral, got the interview scheduled', 5000),
  text(cDavid, CURRENT_USER_ID, 'That\'s great news! Good luck 🙌', 4990),
  text(cDavid, 'u-david', 'Appreciate it, I\'ll let you know how it goes', 4980),
];

// --- Conversation: Jessica Wilson ---
const cJessica = 'conv-jessica';
const jessicaMessages: Message[] = [
  text(cJessica, 'u-jessica', 'Voice memo incoming, easier to explain out loud', 90),
  {
    id: nextId(),
    conversationId: cJessica,
    senderId: 'u-jessica',
    type: 'audio',
    attachments: [mockAudioAttachment(18)],
    status: 'read',
    createdAt: minutesAgo(89),
  },
  text(cJessica, CURRENT_USER_ID, 'Got it, that makes sense now', 80),
  text(cJessica, 'u-jessica', 'Sending the final files over 📎', 15),
  {
    id: nextId(),
    conversationId: cJessica,
    senderId: 'u-jessica',
    type: 'image',
    attachments: [
      mockImageAttachment('jessica-1'),
      mockImageAttachment('jessica-2'),
      mockImageAttachment('jessica-3'),
    ],
    status: 'delivered',
    createdAt: minutesAgo(14),
  },
];

// --- Conversation: Daniel Miller ---
const cDaniel = 'conv-daniel';
const danielMessages: Message[] = [
  text(cDaniel, 'u-daniel', 'Welcome to Fockis! Let me know if you need anything 🎉', 10080),
  text(cDaniel, CURRENT_USER_ID, 'Thanks Daniel, appreciate the warm welcome!', 10070),
];

export const mockMessagesByConversation: Record<string, Message[]> = {
  [cJohn]: johnMessages,
  [cSarah]: sarahMessages,
  [cMichael]: michaelMessages,
  [cDavid]: davidMessages,
  [cJessica]: jessicaMessages,
  [cDaniel]: danielMessages,
};

export const conversationIds = {
  john: cJohn,
  sarah: cSarah,
  michael: cMichael,
  david: cDavid,
  jessica: cJessica,
  daniel: cDaniel,
};

export const allMockMessages: Message[] = Object.values(mockMessagesByConversation).flat();
