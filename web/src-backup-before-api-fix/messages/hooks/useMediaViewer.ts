import { useCallback, useState } from 'react';
import type { Attachment } from '../types';

export function useMediaViewer() {
  const [items, setItems] = useState<Attachment[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const openViewer = useCallback((attachments: Attachment[], startIndex = 0) => {
    setItems(attachments);
    setIndex(startIndex);
    setZoom(1);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
  }, []);

  const next = useCallback(() => {
    setZoom(1);
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setZoom(1);
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const toggleZoom = useCallback(() => setZoom((z) => (z === 1 ? 2 : 1)), []);

  return {
    open,
    items,
    index,
    current: items[index],
    zoom,
    openViewer,
    close,
    next,
    prev,
    toggleZoom,
  };
}
