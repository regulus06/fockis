import { useCallback, useEffect, useState } from "react";

import {
  MessageSquare,
  PhoneOff,
  Radio,
  X,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./styles/app.scss";
import "./styles/viewer.scss";

import { useStudio } from "./hooks/useStudio";
import { sources } from "./data";

import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Stage } from "./components/Stage";
import { Toolbar } from "./components/Toolbar";
import { ActionBar } from "./components/ActionBar";
import { ChatPanel } from "./components/ChatPanel";
import { GuestManager } from "./components/GuestManager";
import { EndedScreen } from "./components/EndedScreen";
import { Drawer } from "./components/ui/Primitives";

import {
  GoLiveModal,
  EndLiveModal,
} from "./components/modals/Modals";

import {
  AnalyticsPanel,
  EffectsPanel,
  GiftsPanel,
  GuestInvitePanel,
  MusicPanel,
  PollsPanel,
  ProductsPanel,
  QnaPanel,
  SettingsPanel,
} from "./components/panels/Panels";

import LiveManagerPage from "./manager/LiveManagerPage";

import { LiveKitPublisher } from "./livekit/LiveKitPublisher";
import { LiveKitGuestPublisher } from "./livekit/LiveKitGuestPublisher";
import type { RemoteVideoTrack } from "livekit-client";
import type { Scene } from "./types";

export default function App() {
  const location = useLocation();

  /*
   * /my-live is the Live Manager.
   *
   * The Studio is reached through /my-live/studio, /live/studio and
   * /live/studio/:id — the main router points those routes here.
   */
  if (location.pathname === "/my-live") {
    return <LiveManagerPage />;
  }

  return <LiveStudio />;
}

function LiveStudio() {
  const studio = useStudio();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [remoteGuestTracks, setRemoteGuestTracks] =
    useState<Record<string, RemoteVideoTrack>>({});

  const handleRemoteGuestTrack = useCallback(
    (identity: string, track: RemoteVideoTrack) => {
      setRemoteGuestTracks((current) => ({
        ...current,
        [identity]: track,
      }));
    },
    [],
  );

  const handleRemoteGuestDisconnected = useCallback(
    (identity: string) => {
      setRemoteGuestTracks((current) => {
        const next = { ...current };
        delete next[identity];
        return next;
      });
    },
    [],
  );

  /* Close mobile drawers with Escape. */
  useEffect(() => {
    if (!sidebarOpen && !chatOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setChatOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen, chatOpen]);

  const closePanel = () => {
    studio.setActivePanel(null);
  };

  /*
   * Return to the Live Manager. This does NOT end a LIVE session —
   * ending is only done through the End live session confirmation.
   */
  const openLiveManager = () => {
    setSidebarOpen(false);
    setChatOpen(false);
    studio.setActivePanel(null);
    navigate("/my-live");
  };

  const openGuests = () => {
    setSidebarOpen(false);
    setChatOpen(false);
    studio.setActivePanel("guests");
  };

  /*
   * Screen sharing from the toolbar or the Screen source switches to the
   * Screen Share scene (which requests the browser picker through the
   * existing selectScene → toggleScreenShare flow). Stopping returns to
   * the Main Camera scene, which releases the screen stream.
   */
  const findScene = (match: (scene: Scene) => boolean) =>
    studio.scenes.find(match) ?? null;

  const handleScreenShare = () => {
    const screenScene = findScene((scene) =>
      scene.name.toLowerCase().includes("screen"),
    );
    const cameraScene =
      findScene((scene) => scene.id === "main-camera") ?? studio.scenes[0] ?? null;

    if (!studio.devices.screenShareEnabled) {
      if (screenScene) {
        studio.selectScene(screenScene);
      } else {
        void studio.toggleScreenShare();
      }
      return;
    }

    if (cameraScene) {
      studio.selectScene(cameraScene);
    } else {
      void studio.toggleScreenShare();
    }
  };

  const isLive = studio.phase === "live";
  const isBusy = studio.phase === "starting" || studio.phase === "ending";
  const username = studio.currentUsername || "you";

  const header = (
    <Header
      phase={studio.phase}
      connection={studio.connection}
      viewers={studio.analytics.currentViewers}
      elapsedSeconds={studio.elapsedSeconds}
      username={username}
      onOpenSettings={() => studio.setActivePanel("settings")}
      onShare={() => void studio.shareLive()}
      onInviteGuest={studio.phase === "ended" ? undefined : openGuests}
      onOpenManager={openLiveManager}
      onOpenMenu={
        studio.phase === "ended"
          ? undefined
          : () => {
              setChatOpen(false);
              setSidebarOpen(true);
            }
      }
    />
  );

  /*
   * --------------------------------------------------------------------------
   * ENDED SCREEN
   * --------------------------------------------------------------------------
   */

  if (studio.phase === "ended") {
    return (
      <div className="app fls fls--ended">
        {header}

        <EndedScreen
          sessionId={studio.sessionId}
          backToDashboardReset={studio.backToDashboardReset}
          analytics={studio.analytics}
          elapsedSeconds={studio.elapsedSeconds}
          saveReplay={studio.streamInfo.saveReplay}
          onViewAnalytics={() => studio.setActivePanel("analytics")}
        />

        {studio.activePanel === "settings" && (
          <Drawer onClose={closePanel} label="Stream settings">
            <SettingsPanel
              streamInfo={studio.streamInfo}
              setStreamInfo={studio.setStreamInfo}
              onClose={closePanel}
            />
          </Drawer>
        )}

        {studio.activePanel === "analytics" && (
          <Drawer onClose={closePanel} label="Analytics">
            <AnalyticsPanel
              analytics={studio.analytics}
              phase={studio.phase}
              onClose={closePanel}
            />
          </Drawer>
        )}
      </div>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * LIVE STUDIO
   * --------------------------------------------------------------------------
   */

  return (
    <div className="app fls">
      {header}

      <div className="fls-body">
        {/* ================================================================
            LEFT: scenes, sources, creator tools
        ================================================================ */}

        <div className={`sidebar-wrap ${sidebarOpen ? "sidebar-wrap--open" : ""}`}>
          {sidebarOpen && (
            <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          )}

          <div className="sidebar-panel">
            <button
              className="mobile-close"
              onClick={() => setSidebarOpen(false)}
              type="button"
              aria-label="Close studio tools"
            >
              <X size={18} />
            </button>

            {studio.activeScene && (
              <Sidebar
                scenes={studio.scenes}
                activeScene={studio.activeScene}
                onSelectScene={(scene) => {
                  studio.selectScene(scene);
                  setSidebarOpen(false);
                }}
                sources={sources}
                activePanel={studio.activePanel}
                onSelectPanel={(panel) => {
                  studio.setActivePanel(panel);
                  setSidebarOpen(false);
                }}
                guestCount={studio.guests.length + studio.guestInvitations.length}
                hasFeaturedProduct={!!studio.featuredProduct}
                onAddScene={studio.addScene}
                toggleCamera={studio.toggleCamera}
                toggleScreenShare={handleScreenShare}
                devices={studio.devices}
                sourceState={studio.sourceState}
                onAddImage={studio.addImageSource}
                onAddVideo={studio.addVideoSource}
                onAddText={studio.addTextSource}
                onAddBrowser={studio.addBrowserSource}
              />
            )}
          </div>
        </div>

        {/* ================================================================
            CENTER: stage
        ================================================================ */}

        <main className="center" aria-label="Live stage">
          <Stage
            phase={studio.phase}
            username={username}
            avatarUrl={studio.currentAvatarUrl}
            cameraStream={studio.cameraStream}
            mediaError={studio.mediaError}
            guestTracks={remoteGuestTracks}
            devices={studio.devices}
            connection={studio.connection}
            viewers={studio.analytics.currentViewers}
            likes={studio.analytics.likes}
            comments={Math.max(studio.analytics.comments, studio.chatMessages.length)}
            shares={studio.analytics.shares}
            chatMessages={studio.chatMessages}
            giftFeed={studio.giftFeed}
            featuredProduct={studio.featuredProduct}
            unfeatureProduct={studio.unfeatureProduct}
            streamInfo={studio.streamInfo}
            guests={studio.guests}
            guestLayout={studio.guestLayout}
            activeScene={studio.activeScene}
            screenStream={studio.screenStream}
            sourceState={studio.sourceState}
            onSendComment={studio.sendChatMessage}
            onShare={() => void studio.shareLive()}
            onOpenGifts={() => studio.setActivePanel("gifts")}
            onOpenSettings={() => studio.setActivePanel("settings")}
          />

          {/*
           * HOST PUBLISHER
           *
           * A guest must not publish through the host publisher. When
           * activeGuestSessionId exists, this browser is a LIVE guest /
           * co-host, so only the guest publisher connects to LiveKit.
           */}
          {studio.phase === "live" && !studio.activeGuestSessionId && (
            <LiveKitPublisher
              token={studio.liveKitToken}
              serverUrl={studio.liveKitServerUrl}
              cameraStream={studio.cameraStream}
              cameraEnabled={studio.devices.cameraEnabled}
              micEnabled={studio.devices.micEnabled}
              onRemoteVideoTrack={handleRemoteGuestTrack}
              onRemoteParticipantDisconnected={handleRemoteGuestDisconnected}
            />
          )}

          {/*
           * GUEST / CO-HOST PUBLISHER
           */}
          {studio.phase === "live" && studio.activeGuestSessionId && (
            <LiveKitGuestPublisher
              sessionId={studio.activeGuestSessionId}
              cameraStream={studio.cameraStream}
              cameraEnabled={studio.devices.cameraEnabled}
              micEnabled={studio.devices.micEnabled}
            />
          )}
        </main>

        {/* ================================================================
            RIGHT: chat / guests / viewers, guest management, end live
        ================================================================ */}

        <div className={`chat-wrap ${chatOpen ? "chat-wrap--open" : ""}`}>
          {chatOpen && (
            <div className="mobile-backdrop" onClick={() => setChatOpen(false)} aria-hidden="true" />
          )}

          <div className="chat-wrap__panel">
            <button
              className="mobile-close"
              onClick={() => setChatOpen(false)}
              type="button"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>

            <ChatPanel
              chatMessages={studio.chatMessages}
              sendChatMessage={studio.sendChatMessage}
              pinMessage={studio.pinMessage}
              deleteMessage={studio.deleteMessage}
              phase={studio.phase}
              viewers={studio.analytics.currentViewers}
              analytics={studio.analytics}
              guests={studio.guests}
              onOpenGuests={openGuests}
              mutedUsernames={studio.mutedUsernames}
              onMuteUser={studio.muteUser}
              onUnmuteUser={studio.unmuteUser}
            />

            <div className="right-stack">
              <GuestManager
                phase={studio.phase}
                guests={studio.guests}
                guestLayout={studio.guestLayout}
                setGuestLayout={studio.setGuestLayout}
                inviteGuest={studio.inviteGuest}
                removeGuest={studio.removeGuest}
                toggleMuteGuest={studio.toggleMuteGuest}
                onOpenGuestsPanel={openGuests}
                pendingInvitations={studio.guestInvitations.length}
              />

              <ActionBar
                streamInfo={studio.streamInfo}
                phase={studio.phase}
                openGoLiveModal={studio.openGoLiveModal}
                openEndLiveModal={studio.openEndLiveModal}
                devices={studio.devices}
              />
            </div>
          </div>
        </div>

        {/* ================================================================
            BOTTOM: production toolbar
        ================================================================ */}

        <div className="fls-toolbar-slot">
          <Toolbar
            devices={studio.devices}
            toggleMic={studio.toggleMic}
            toggleCamera={studio.toggleCamera}
            toggleScreenShare={handleScreenShare}
            activePanel={studio.activePanel}
            setActivePanel={studio.setActivePanel}
            guests={studio.guests}
            featuredProduct={studio.featuredProduct}
            onAddText={studio.addTextSource}
            sourceState={studio.sourceState}
          />
        </div>

        {/* ================================================================
            MOBILE / TABLET quick bar
        ================================================================ */}

        <div className="mobile-bar">
          <button
            className="mobile-bar__btn"
            onClick={() => setChatOpen(true)}
            type="button"
            aria-label="Open chat and guests"
          >
            <MessageSquare size={18} />
            <span>Chat{studio.chatMessages.length ? ` · ${studio.chatMessages.length}` : ""}</span>
          </button>

          {isLive ? (
            <button
              className="mobile-bar__btn mobile-bar__btn--primary"
              onClick={studio.openEndLiveModal}
              type="button"
            >
              <PhoneOff size={18} />
              <span>End live</span>
            </button>
          ) : (
            <button
              className="mobile-bar__btn mobile-bar__btn--primary"
              onClick={studio.openGoLiveModal}
              disabled={isBusy}
              type="button"
            >
              <Radio size={18} />
              <span>{studio.phase === "starting" ? "Connecting…" : studio.phase === "ending" ? "Ending…" : "Go live"}</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          DRAWERS
      ===================================================================== */}

      {studio.activePanel === "settings" && (
        <Drawer onClose={closePanel} label="Stream settings">
          <SettingsPanel
            streamInfo={studio.streamInfo}
            setStreamInfo={studio.setStreamInfo}
            onClose={closePanel}
          />
        </Drawer>
      )}

      {studio.activePanel === "guests" && (
        <Drawer onClose={closePanel} label="Guests">
          <GuestInvitePanel
            guests={studio.guests}
            availableFollowers={studio.availableFollowers}
            inviteGuest={studio.inviteGuest}
            removeGuest={studio.removeGuest}
            toggleMuteGuest={studio.toggleMuteGuest}
            guestLayout={studio.guestLayout}
            guestInvitations={studio.guestInvitations}
            acceptGuestInvitation={studio.acceptGuestInvitation}
            declineGuestInvitation={studio.declineGuestInvitation}
            setGuestLayout={studio.setGuestLayout}
            onClose={closePanel}
          />
        </Drawer>
      )}

      {studio.activePanel === "effects" && (
        <Drawer onClose={closePanel} label="Effects">
          <EffectsPanel onClose={closePanel} />
        </Drawer>
      )}

      {studio.activePanel === "music" && (
        <Drawer onClose={closePanel} label="Music">
          <MusicPanel onClose={closePanel} />
        </Drawer>
      )}

      {studio.activePanel === "products" && (
        <Drawer onClose={closePanel} label="Products">
          <ProductsPanel
            featuredProduct={studio.featuredProduct}
            featureProduct={studio.featureProduct}
            unfeatureProduct={studio.unfeatureProduct}
            onClose={closePanel}
          />
        </Drawer>
      )}

      {studio.activePanel === "gifts" && (
        <Drawer onClose={closePanel} label="Gifts">
          <GiftsPanel
            sendGift={studio.sendGift}
            giftFeed={studio.giftFeed}
            phase={studio.phase}
            onClose={closePanel}
          />
        </Drawer>
      )}

      {studio.activePanel === "analytics" && (
        <Drawer onClose={closePanel} label="Analytics">
          <AnalyticsPanel
            analytics={studio.analytics}
            phase={studio.phase}
            onClose={closePanel}
          />
        </Drawer>
      )}

      {studio.activePanel === "polls" && (
        <Drawer onClose={closePanel} label="Polls">
          <PollsPanel onClose={closePanel} />
        </Drawer>
      )}

      {studio.activePanel === "qna" && (
        <Drawer onClose={closePanel} label="Q&A">
          <QnaPanel onClose={closePanel} />
        </Drawer>
      )}

      {/* =====================================================================
          MODALS
      ===================================================================== */}

      {studio.showGoLiveModal && (
        <GoLiveModal
          closeGoLiveModal={studio.closeGoLiveModal}
          confirmGoLive={studio.confirmGoLive}
          devices={studio.devices}
          connection={studio.connection}
          streamInfo={studio.streamInfo}
          setStreamInfo={studio.setStreamInfo}
        />
      )}

      {studio.showEndLiveModal && (
        <EndLiveModal
          closeEndLiveModal={studio.closeEndLiveModal}
          confirmEndLive={studio.confirmEndLive}
          analytics={studio.analytics}
          elapsedSeconds={studio.elapsedSeconds}
          guestCount={
            studio.guests.filter(
              (guest) => guest.status === "connected" || guest.status === "muted",
            ).length
          }
        />
      )}
    </div>
  );
}
