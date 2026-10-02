import type { Participant } from '../types';

export const CURRENT_USER_ID = 'me';

const avatar = (seed: string) => `https://i.pravatar.cc/150?u=${seed}`;

export const mockUsers: Participant[] = [
  {
    id: CURRENT_USER_ID,
    name: 'You',
    username: 'you',
    avatar: avatar('fockis-me'),
    presence: 'online',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'u-john',
    name: 'John Smith',
    username: 'johnsmith',
    avatar: avatar('john-smith'),
    presence: 'online',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'u-sarah',
    name: 'Sarah Johnson',
    username: 'sarahj',
    avatar: avatar('sarah-johnson'),
    presence: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 'u-michael',
    name: 'Michael Brown',
    username: 'mikebrown',
    avatar: avatar('michael-brown'),
    presence: 'online',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'u-david',
    name: 'David Williams',
    username: 'davidw',
    avatar: avatar('david-williams'),
    presence: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'u-jessica',
    name: 'Jessica Wilson',
    username: 'jesswilson',
    avatar: avatar('jessica-wilson'),
    presence: 'online',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'u-daniel',
    name: 'Daniel Miller',
    username: 'danielm',
    avatar: avatar('daniel-miller'),
    presence: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const getUserById = (id: string): Participant | undefined =>
  mockUsers.find((u) => u.id === id);
