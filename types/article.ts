export interface Article {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
  thumbnail?: string;
}

export interface ArticleWithReadState extends Article {
  isRead: boolean;
}

export interface FaceTexture {
  faceIndex: number;
  imageUrl: string;
  title: string;
}

export interface CompletedCube {
  id: string;
  faceTextures: FaceTexture[];
  completedAt: Date;
}
