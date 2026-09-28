export type Post = {
  _id: string;
  content: string;
  user: any;
  username?: string;
  userPhoto?: string;
  likes: number;
  dislikes?: number;
  shares: number;
  views?: number;
  comments: any[];
  type?: string;
  media?: string;
  products?: any[];
  createdAt?: string;
};