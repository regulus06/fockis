import { NewsItem } from '../../types/academy';

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="card news-card">
      <div className="thumb"></div>
      <div className="body">
        <small>{item.tag} · {item.date}</small>
        <h3>{item.title}</h3>
      </div>
    </div>
  );
}
