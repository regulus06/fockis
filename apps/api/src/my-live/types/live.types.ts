export interface LiveUser {
  id: string;
  _id?: string;
  sub?: string;
  username?: string;
  name?: string;
  avatar?: string;
}

export interface LiveSocketUser {
  id: string;
  username?: string;
  name?: string;
  avatar?: string;
}

export interface LiveProduct {
  productId: string;
  name: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
}

export interface LiveCommentPayload {
  streamId: string;
  message: string;
}

export interface LiveLikePayload {
  streamId: string;
  liked: boolean;
}

export interface LiveViewerPayload {
  streamId: string;
}