import styles from "../styles/ResourceCard.module.scss";

export interface CareerResource {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
}

interface ResourceCardProps {
  resource: CareerResource;
  onOpen: (resource: CareerResource) => void;
}

export function ResourceCard({
  resource,
  onOpen,
}: ResourceCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onOpen(resource)}
    >
      <div className={styles.icon}>
        {resource.icon}
      </div>

      <div className={styles.title}>
        {resource.title}
      </div>

      <div className={styles.desc}>
        {resource.description}
      </div>
    </button>
  );
}