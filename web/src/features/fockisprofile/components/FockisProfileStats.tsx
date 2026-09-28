import type {
  FockisProfileStats as Stats,
} from "../types/fockisprofiletypes";

import "../../../styles/FockisProfileStats.scss";

interface Props {
  stats: Stats;
}

export default function FockisProfileStats({
  stats,
}: Props) {
  return (
    <div className="fk-profile-stats">
      <div className="fk-profile-stat">
        <strong>{stats.posts ?? 0}</strong>
        <span>Posts</span>
      </div>

      <div className="fk-profile-stat">
        <strong>{stats.friends ?? 0}</strong>
        <span>Friends</span>
      </div>

      <div className="fk-profile-stat">
        <strong>{stats.followers ?? 0}</strong>
        <span>Followers</span>
      </div>

      <div className="fk-profile-stat">
        <strong>{stats.following ?? 0}</strong>
        <span>Following</span>
      </div>
    </div>
  );
}