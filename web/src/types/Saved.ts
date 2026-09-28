export interface SavedItem {
  _id: string;

  postId: {
    _id: string;
    content?: string;
    image?: string;
    author?: {
      username: string;
      avatar?: string;
    };
  };

  createdAt: string;
}