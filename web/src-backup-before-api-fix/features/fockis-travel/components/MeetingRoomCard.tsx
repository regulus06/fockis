import { useState } from 'react';
import { Projector, Wifi, Video, PenSquare } from 'lucide-react';

export interface MeetingRoomTime {
  time: string;
  taken?: boolean;
}

export interface MeetingRoomCardProps {
  id: string;
  name: string;
  image: string;
  capacity: number;
  layouts: string[];
  amenities?: string[];
  hourlyPrice: number;
  halfDayPrice: number;
  fullDayPrice: number;
  times: MeetingRoomTime[];
  currency?: string;
  onReserve?: (id: string, time: string | null) => void;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  Projector: <Projector size={13} aria-hidden="true" />,
  'Wi-Fi': <Wifi size={13} aria-hidden="true" />,
  'Video conf.': <Video size={13} aria-hidden="true" />,
  Whiteboard: <PenSquare size={13} aria-hidden="true" />,
};

/** Meeting / conference room card used on the homepage and TravelMeetingsPage. */
export default function MeetingRoomCard({
  id,
  name,
  image,
  capacity,
  layouts,
  amenities = [],
  hourlyPrice,
  halfDayPrice,
  fullDayPrice,
  times,
  currency = '$',
  onReserve,
}: MeetingRoomCardProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <article className="meeting-card">
      <div className="thumb" style={{ backgroundImage: `url('${image}')` }} />
      <div className="body">
        <h4>{name}</h4>
        <div className="cap">CAPACITY · {capacity} PEOPLE</div>

        <div className="pill-row">
          {layouts.map((l) => (
            <span key={l} className="ft-pill">{l}</span>
          ))}
        </div>

        {amenities.length > 0 && (
          <div className="pill-row">
            {amenities.map((a) => (
              <span key={a} className="ft-pill">{AMENITY_ICONS[a]} {a}</span>
            ))}
          </div>
        )}

        <div className="price-tiers">
          <div className="tier"><div className="amt">{currency}{hourlyPrice}</div><div className="lbl">per hour</div></div>
          <div className="tier"><div className="amt">{currency}{halfDayPrice}</div><div className="lbl">half day</div></div>
          <div className="tier"><div className="amt">{currency}{fullDayPrice}</div><div className="lbl">full day</div></div>
        </div>

        <div className="time-row">
          {times.map((t) => (
            <button
              key={t.time}
              type="button"
              disabled={t.taken}
              className={`time-chip${t.taken ? ' is-taken' : ''}${t.time === selectedTime ? ' is-selected' : ''}`}
              onClick={() => setSelectedTime(t.time)}
            >
              {t.time}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 18 }}
          onClick={() => onReserve?.(id, selectedTime)}
        >
          Reserve meeting room →
        </button>
      </div>
    </article>
  );
}
