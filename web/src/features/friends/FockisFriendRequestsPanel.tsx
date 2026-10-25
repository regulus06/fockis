import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  UserRound,
  UserX,
  Ban,
} from "lucide-react";
import { fockisFriendsApi } from "../fockisprofile/service/fockisFriendsApi";
import "./FockisFriendRequestsPanel.scss";

interface FriendRequestUser {
  id?: string;
  _id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  profilePicture?: string;
  avatar?: string;
  [key: string]: unknown;
}

interface FriendRequest {
  id: string;
  requester?: FriendRequestUser | null;
  receiver?: FriendRequestUser | null;
  status?: string;
  [key: string]: unknown;
}

interface Props {
  onChanged?: () => void | Promise<void>;
}

function userId(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const user = value as Record<string, unknown>;

  return String(
    user.id ||
      user._id ||
      "",
  );
}

function displayName(value: FriendRequestUser | null | undefined): string {
  if (!value) return "Fockis user";

  const full =
    `${value.firstName || ""} ${value.lastName || ""}`.trim();

  return (
    full ||
    value.username ||
    value.name ||
    "Fockis user"
  );
}

function avatar(
  value: FriendRequestUser | null | undefined,
): string | null {
  if (!value) return null;

  const image =
    value.profilePicture ||
    value.avatar ||
    null;

  return typeof image === "string" && image.trim()
    ? image
    : null;
}

function extractRequestId(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const item = value as Record<string, unknown>;

  const id =
    item.id ||
    item._id ||
    item.requestId ||
    item.friendshipId;

  return id ? String(id) : "";
}

function normalizeRequests(payload: unknown): FriendRequest[] {
  let rows: unknown[] = [];

  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;

    if (Array.isArray(data.requests)) {
      rows = data.requests;
    } else if (Array.isArray(data.data)) {
      rows = data.data;
    } else if (Array.isArray(data.results)) {
      rows = data.results;
    } else if (Array.isArray(data.items)) {
      rows = data.items;
    }
  }

  return rows
    .map((row): FriendRequest | null => {
      if (!row || typeof row !== "object") return null;

      const item = row as Record<string, unknown>;
      const id = extractRequestId(item);

      if (!id) return null;

      const requester =
        item.requester &&
        typeof item.requester === "object"
          ? (item.requester as FriendRequestUser)
          : item.sender &&
              typeof item.sender === "object"
            ? (item.sender as FriendRequestUser)
            : null;

      const receiver =
        item.receiver &&
        typeof item.receiver === "object"
          ? (item.receiver as FriendRequestUser)
          : null;

      return {
        ...item,
        id,
        requester,
        receiver,
      } as FriendRequest;
    })
    .filter(
      (item): item is FriendRequest => item !== null,
    );
}

export default function FockisFriendRequestsPanel({
  onChanged,
}: Props) {
  const [requests, setRequests] =
    useState<FriendRequest[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [busyId, setBusyId] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload =
        await fockisFriendsApi.getIncomingRequests();

      setRequests(normalizeRequests(payload));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load friend requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (
    requestId: string,
  ) => {
    if (busyId) return;

    setBusyId(requestId);
    setError(null);

    try {
      await fockisFriendsApi.acceptRequest(
        requestId,
      );

      setRequests((current) =>
        current.filter(
          (item) => item.id !== requestId,
        ),
      );

      await onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to accept request.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (
    requestId: string,
  ) => {
    if (busyId) return;

    setBusyId(requestId);
    setError(null);

    try {
      await fockisFriendsApi.rejectRequest(
        requestId,
      );

      setRequests((current) =>
        current.filter(
          (item) => item.id !== requestId,
        ),
      );

      await onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject request.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const block = async (
    request: FriendRequest,
  ) => {
    const id = userId(request.requester);

    if (!id || busyId) return;

    if (
      !window.confirm(
        `Block ${displayName(request.requester)}?`,
      )
    ) {
      return;
    }

    setBusyId(request.id);
    setError(null);

    try {
      await fockisFriendsApi.blockUser(id);

      setRequests((current) =>
        current.filter(
          (item) => item.id !== request.id,
        ),
      );

      await onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to block user.",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <section className="fk-friend-requests">
        <div className="fk-friend-requests__loading">
          <Loader2 size={22} className="fk-spin" />
          Loading friend requests…
        </div>
      </section>
    );
  }

  return (
    <section className="fk-friend-requests">
      <div className="fk-friend-requests__header">
        <div>
          <h2>Friend requests</h2>
          <p>
            People who want to connect with you.
          </p>
        </div>

        <span className="fk-friend-requests__count">
          {requests.length}
        </span>
      </div>

      {error && (
        <div className="fk-friend-requests__error">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="fk-friend-requests__empty">
          <UserRound size={30} />
          <strong>No friend requests</strong>
          <span>
            New requests will appear here.
          </span>
        </div>
      ) : (
        <div className="fk-friend-requests__list">
          {requests.map((request) => {
            const person =
              request.requester;
            const image =
              avatar(person);
            const busy =
              busyId === request.id;

            return (
              <article
                key={request.id}
                className="fk-friend-request"
              >
                <div className="fk-friend-request__avatar">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                    />
                  ) : (
                    <UserRound size={25} />
                  )}
                </div>

                <div className="fk-friend-request__body">
                  <strong>
                    {displayName(person)}
                  </strong>

                  {person?.username && (
                    <span>
                      @{person.username}
                    </span>
                  )}
                </div>

                <div className="fk-friend-request__actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void accept(request.id)
                    }
                    className="fk-friend-request__accept"
                  >
                    {busy ? (
                      <Loader2
                        size={16}
                        className="fk-spin"
                      />
                    ) : (
                      <Check size={16} />
                    )}
                    Accept
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void reject(request.id)
                    }
                    className="fk-friend-request__reject"
                  >
                    <UserX size={16} />
                    Reject
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void block(request)
                    }
                    className="fk-friend-request__block"
                  >
                    <Ban size={16} />
                    Block
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
