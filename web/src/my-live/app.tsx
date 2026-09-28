import { useCallback, useState } from "react";

import {
  Menu,
  MessageSquare,
  X,
  LayoutDashboard,
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

export default function App() {
  const location = useLocation();

  /*
   * Keep /my-live as the Live Manager.
   *
   * The actual Studio can still be reached through:
   * /my-live/studio
   * /live/studio
   * /live/studio/:id
   *
   * The main router already points those routes to this component.
   */
  if (location.pathname === "/my-live") {
    return <LiveManagerPage />;
  }

  return <LiveStudio />;
}

function LiveStudio() {
  const studio = useStudio();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [chatOpen, setChatOpen] =
    useState(false);

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

  /*
   * Close whichever drawer/panel is currently open.
   */
  const closePanel = () => {
    studio.setActivePanel(null);
  };

  /*
   * Return to the Live Manager.
   *
   * This does NOT end a LIVE session.
   * Ending a LIVE session is handled by the existing
   * End Live button/modal.
   */
  const openLiveManager = () => {
    setSidebarOpen(false);
    setChatOpen(false);
    studio.setActivePanel(null);

    navigate("/my-live");
  };

  /*
   * Open the Studio route explicitly.
   *
   * This is useful for buttons elsewhere in Fockis
   * that want to reopen the Studio.
   */
  const openStudio = () => {
    navigate("/my-live/studio");
  };

  /*
   * --------------------------------------------------------------------------
   * ENDED SCREEN
   * --------------------------------------------------------------------------
   */

  if (studio.phase === "ended") {
    return (
      <div className="app">
        <Header
          phase={studio.phase}
          connection={studio.connection}
          viewers={
            studio.analytics.currentViewers
          }
          elapsedSeconds={
            studio.elapsedSeconds
          }
          username={
            studio.currentUsername || "you"
          }
          onOpenSettings={() =>
            studio.setActivePanel("settings")
          }
        />

        <div className="live-manager-navigation">
          <button
            type="button"
            className="live-manager-navigation__button"
            onClick={openLiveManager}
          >
            <LayoutDashboard size={17} />

            <span>
              Live Manager
            </span>
          </button>
        </div>

        <EndedScreen
          sessionId={studio.sessionId}
          backToDashboardReset={
            studio.backToDashboardReset
          }
        />

        {studio.activePanel ===
          "settings" && (
          <Drawer onClose={closePanel}>
            <SettingsPanel
              streamInfo={
                studio.streamInfo
              }
              setStreamInfo={
                studio.setStreamInfo
              }
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
    <div className="app">
      <Header
        phase={studio.phase}
        connection={studio.connection}
        viewers={
          studio.analytics.currentViewers
        }
        elapsedSeconds={
          studio.elapsedSeconds
        }
        username={
          studio.currentUsername || "you"
        }
        onOpenSettings={() =>
          studio.setActivePanel("settings")
        }
      />

      {/*
       * Keep the existing Live Manager button.
       */}
      <div className="live-manager-navigation">
        <button
          type="button"
          className="live-manager-navigation__button"
          onClick={openLiveManager}
        >
          <LayoutDashboard size={17} />

          <span>
            Live Manager
          </span>
        </button>
      </div>

      <div className="app__body">
        {/*
         * --------------------------------------------------------------------
         * MOBILE STUDIO TOOLS
         * --------------------------------------------------------------------
         */}

        <button
          className="mobile-sidebar-toggle"
          onClick={() =>
            setSidebarOpen(true)
          }
          type="button"
          aria-label="Open studio tools"
        >
          <Menu size={16} />

          <span>
            Studio tools
          </span>
        </button>

        <div
          className={`sidebar-wrap ${
            sidebarOpen
              ? "sidebar-wrap--open"
              : ""
          }`}
        >
          {sidebarOpen && (
            <div
              className="mobile-backdrop"
              onClick={() =>
                setSidebarOpen(false)
              }
            />
          )}

          <div className="sidebar-panel">
            <button
              className="mobile-close"
              onClick={() =>
                setSidebarOpen(false)
              }
              type="button"
              aria-label="Close studio tools"
            >
              <X size={16} />
            </button>

            {studio.activeScene && (
              <Sidebar
                scenes={studio.scenes}
                activeScene={
                  studio.activeScene
                }
                onSelectScene={(scene) => {
                  studio.selectScene(
                    scene,
                  );

                  setSidebarOpen(false);
                }}
                sources={sources}
                activePanel={
                  studio.activePanel
                }
                onSelectPanel={(panel) => {
                  studio.setActivePanel(
                    panel,
                  );

                  setSidebarOpen(false);
                }}
                guestCount={
                  studio.guests.length
                }
                hasFeaturedProduct={
                  !!studio.featuredProduct
                }
                onAddScene={
                  studio.addScene
                }
                toggleCamera={
                  studio.toggleCamera
                }
                toggleScreenShare={
                  studio.toggleScreenShare
                }
                devices={
                  studio.devices
                }
                sourceState={studio.sourceState}
                onAddImage={studio.addImageSource}
                onAddVideo={studio.addVideoSource}
                onAddText={studio.addTextSource}
                onAddBrowser={studio.addBrowserSource}
              />
            )}
          </div>
        </div>

        {/*
         * --------------------------------------------------------------------
         * CENTER / STAGE
         * --------------------------------------------------------------------
         */}

        <main className="center">
          <Stage
            phase={studio.phase}
            username={
              studio.currentUsername || "you"
            }
            avatarUrl={
              studio.currentAvatarUrl
            }
            cameraStream={
              studio.cameraStream
            }
            mediaError={
              studio.mediaError
            }
            guestTracks={remoteGuestTracks}
            devices={studio.devices}
            connection={
              studio.connection
            }
            viewers={
              studio.analytics.currentViewers
            }
            likes={
              studio.analytics.likes
            }
            chatMessages={
              studio.chatMessages
            }
            giftFeed={
              studio.giftFeed
            }
            featuredProduct={
              studio.featuredProduct
            }
            unfeatureProduct={
              studio.unfeatureProduct
            }
            streamInfo={
              studio.streamInfo
            }
            guests={studio.guests}
            guestLayout={
              studio.guestLayout
            }
            activeScene={
              studio.activeScene
            }
            screenStream={
              studio.screenStream
            }
            sourceState={studio.sourceState}
          />

          {/*
           * ------------------------------------------------------------------
           * LIVEKIT PUBLISHER
           * ------------------------------------------------------------------
           */}

          {/*
           * HOST PUBLISHER
           *
           * A guest must not publish through the host publisher.
           * When activeGuestSessionId exists, this browser is acting
           * as a LIVE guest/co-host, so only the guest publisher should
           * connect to LiveKit.
           */}
          {studio.phase === "live" &&
            !studio.activeGuestSessionId && (
              <LiveKitPublisher
                token={
                  studio.liveKitToken
                }
                serverUrl={
                  studio.liveKitServerUrl
                }
                cameraStream={
                  studio.cameraStream
                }
                cameraEnabled={
                  studio.devices
                    .cameraEnabled
                }
                micEnabled={
                  studio.devices
                    .micEnabled
                }
                onRemoteVideoTrack={
                  handleRemoteGuestTrack
                }
                onRemoteParticipantDisconnected={
                  handleRemoteGuestDisconnected
                }
              />
            )}

          {/*
           * GUEST / CO-HOST PUBLISHER
           *
           * The guest gets its own LiveKit authorization and publishes
           * the local camera/microphone into the host's LIVE room.
           */}
          {studio.phase === "live" &&
            studio.activeGuestSessionId && (
              <LiveKitGuestPublisher
                sessionId={
                  studio.activeGuestSessionId
                }
                cameraStream={
                  studio.cameraStream
                }
                cameraEnabled={
                  studio.devices
                    .cameraEnabled
                }
                micEnabled={
                  studio.devices
                    .micEnabled
                }
              />
            )}

          {/*
           * ------------------------------------------------------------------
           * MOBILE CHAT
           * ------------------------------------------------------------------
           */}

          <button
            className="mobile-chat-toggle"
            onClick={() =>
              setChatOpen(true)
            }
            type="button"
            aria-label="Open live chat"
          >
            <MessageSquare size={15} />

            {studio.phase === "live"
              ? "View live chat"
              : "Chat"}
          </button>

          {/*
           * ------------------------------------------------------------------
           * TOOLBAR
           * ------------------------------------------------------------------
           */}

          <Toolbar
            devices={studio.devices}
            toggleMic={
              studio.toggleMic
            }
            toggleCamera={
              studio.toggleCamera
            }
            toggleScreenShare={
              studio.toggleScreenShare
            }
            activePanel={
              studio.activePanel
            }
            setActivePanel={
              studio.setActivePanel
            }
            guests={studio.guests}
            featuredProduct={
              studio.featuredProduct
            }
          />

          {/*
           * ------------------------------------------------------------------
           * ACTION BAR
           * ------------------------------------------------------------------
           */}

          <ActionBar
            streamInfo={
              studio.streamInfo
            }
            phase={studio.phase}
            openGoLiveModal={
              studio.openGoLiveModal
            }
            openEndLiveModal={
              studio.openEndLiveModal
            }
            devices={studio.devices}
          />
        </main>

        {/*
         * --------------------------------------------------------------------
         * CHAT
         * --------------------------------------------------------------------
         */}

        <div
          className={`chat-wrap ${
            chatOpen
              ? "chat-wrap--open"
              : ""
          }`}
        >
          {chatOpen && (
            <div
              className="mobile-backdrop"
              onClick={() =>
                setChatOpen(false)
              }
            />
          )}

          <div className="chat-wrap__panel">
            <button
              className="mobile-close"
              onClick={() =>
                setChatOpen(false)
              }
              type="button"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>

            <ChatPanel
              chatMessages={
                studio.chatMessages
              }
              chatTab={
                studio.chatTab
              }
              setChatTab={
                studio.setChatTab
              }
              sendChatMessage={
                studio.sendChatMessage
              }
              pinMessage={
                studio.pinMessage
              }
              deleteMessage={
                studio.deleteMessage
              }
              phase={studio.phase}
            />
          </div>
        </div>
      </div>

      {/*
       * =========================================================================
       * SETTINGS
       * =========================================================================
       */}

      {studio.activePanel ===
        "settings" && (
        <Drawer onClose={closePanel}>
          <SettingsPanel
            streamInfo={
              studio.streamInfo
            }
            setStreamInfo={
              studio.setStreamInfo
            }
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * GUESTS
       * =========================================================================
       */}

      {studio.activePanel ===
        "guests" && (
        <Drawer onClose={closePanel}>
          <GuestInvitePanel
            guests={studio.guests}
            availableFollowers={
              studio.availableFollowers
            }
            inviteGuest={
              studio.inviteGuest
            }
            removeGuest={
              studio.removeGuest
            }
            toggleMuteGuest={
              studio.toggleMuteGuest
            }
            guestLayout={
              studio.guestLayout
            }
            guestInvitations={studio.guestInvitations}
            acceptGuestInvitation={studio.acceptGuestInvitation}
            declineGuestInvitation={studio.declineGuestInvitation}
            setGuestLayout={
              studio.setGuestLayout
            }
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * EFFECTS
       * =========================================================================
       */}

      {studio.activePanel ===
        "effects" && (
        <Drawer onClose={closePanel}>
          <EffectsPanel
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * MUSIC
       * =========================================================================
       */}

      {studio.activePanel ===
        "music" && (
        <Drawer onClose={closePanel}>
          <MusicPanel
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * PRODUCTS
       * =========================================================================
       */}

      {studio.activePanel ===
        "products" && (
        <Drawer onClose={closePanel}>
          <ProductsPanel
            featuredProduct={
              studio.featuredProduct
            }
            featureProduct={
              studio.featureProduct
            }
            unfeatureProduct={
              studio.unfeatureProduct
            }
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * GIFTS
       * =========================================================================
       */}

      {studio.activePanel ===
        "gifts" && (
        <Drawer onClose={closePanel}>
          <GiftsPanel
            sendGift={
              studio.sendGift
            }
            giftFeed={
              studio.giftFeed
            }
            phase={
              studio.phase
            }
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * ANALYTICS
       * =========================================================================
       */}

      {studio.activePanel ===
        "analytics" && (
        <Drawer onClose={closePanel}>
          <AnalyticsPanel
            analytics={
              studio.analytics
            }
            phase={
              studio.phase
            }
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * POLLS
       * =========================================================================
       */}

      {studio.activePanel ===
        "polls" && (
        <Drawer onClose={closePanel}>
          <PollsPanel
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * Q&A
       * =========================================================================
       */}

      {studio.activePanel ===
        "qna" && (
        <Drawer onClose={closePanel}>
          <QnaPanel
            onClose={closePanel}
          />
        </Drawer>
      )}

      {/*
       * =========================================================================
       * GO LIVE
       * =========================================================================
       */}

      {studio.showGoLiveModal && (
        <GoLiveModal
          closeGoLiveModal={
            studio.closeGoLiveModal
          }
          confirmGoLive={
            studio.confirmGoLive
          }
          devices={
            studio.devices
          }
          connection={
            studio.connection
          }
          streamInfo={
            studio.streamInfo
          }
          setStreamInfo={
            studio.setStreamInfo
          }
        />
      )}

      {/*
       * =========================================================================
       * END LIVE
       * =========================================================================
       */}

      {studio.showEndLiveModal && (
        <EndLiveModal
          closeEndLiveModal={
            studio.closeEndLiveModal
          }
          confirmEndLive={
            studio.confirmEndLive
          }
          analytics={
            studio.analytics
          }
          elapsedSeconds={
            studio.elapsedSeconds
          }
        />
      )}
    </div>
  );
}