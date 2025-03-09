export type Template = {
  title: string;
  category: string;
  description: string;
  image: string;
  owner: string;
  isFavorite: boolean;
  duration?: number;
  goals_id: string[];
};
