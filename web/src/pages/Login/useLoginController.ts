import { FormEvent, useEffect, useState } from "react";

import axios from "axios";

import { useNavigate } from "react-router-dom";

import { getLanguage, subscribeToLanguage, t } from "../../i18n";

import type { FockisLanguage } from "../../i18n/language";

import { setToken, setUserId } from "../../utils/auth";

import {
  loginRequest,
  mfaSetupRequest,
  mfaConfirmRequest,
  mfaVerifyRequest,
} from "./loginApi";

import type { AuthResponse, LoginUser, MfaMode } from "./loginTypes";

import {
  extractToken,
  extractUser,
  extractSetupToken,
  extractChallengeToken,
  extractQrCode,
  extractMfaSecret,
} from "./loginUtils";

export function useLoginController() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [language, setCurrentLanguage] =
    useState<FockisLanguage>(getLanguage());

  const [mfaMode, setMfaMode] = useState<MfaMode>("login");
  const [mfaCode, setMfaCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");

  useEffect(() => {
    return subscribeToLanguage((nextLanguage) => {
      setCurrentLanguage(nextLanguage);
    });
  }, []);

  void language;

  const establishSession = async (
    data: AuthResponse,
    fallbackUser?: LoginUser | null,
  ) => {
    const token = extractToken(data);
    const user = extractUser(data) || fallbackUser || null;

    if (!token) {
      throw new Error(
        "Authentication completed without a JWT token.",
      );
    }

    if (!user || typeof user !== "object") {
      throw new Error(t("login.alerts.backendUserError"));
    }

    const userId = user._id || user.id;

    if (typeof userId !== "string" || !userId.trim()) {
      throw new Error(t("login.alerts.userIdError"));
    }

    const cleanToken = token.trim();

    localStorage.removeItem("access_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");

    localStorage.setItem("access_token", cleanToken);
    setToken(cleanToken);
    setUserId(userId);

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", cleanToken);

    console.log(
      "[FOCKIS AUTH] Authentication established successfully.",
    );

    // Always send the user to the Fockis Feed after successful login.
    // This also applies after MFA verification/setup.
    navigate("/feed", { replace: true });
  };

  const startMfaSetup = async (token: string) => {
    const response = await mfaSetupRequest(token);
    const data = response.data;

    const nextSetupToken = extractSetupToken(data) || token;

    setSetupToken(nextSetupToken);
    setQrCode(extractQrCode(data) || "");
    setMfaSecret(extractMfaSecret(data) || "");
    setMfaCode("");
    setMfaMode("setup");
  };

  const authenticateForMfaChallenge = async () => {
    const response = await loginRequest(email, password);
    const data = response.data;

    const directToken = extractToken(data);
    const user = extractUser(data);

    if (
      directToken &&
      data.requiresMfa !== true &&
      data.mfaSetup !== true &&
      data.mfaSetupRequired !== true
    ) {
      await establishSession(data, user);
      return;
    }

    const nextChallenge = extractChallengeToken(data);

    if (nextChallenge) {
      setChallengeToken(nextChallenge);
      setMfaCode("");
      setMfaMode("verify");
      return;
    }

    if (
      data.mfaSetup ||
      data.mfaSetupRequired ||
      data.requiresMfa
    ) {
      const nextSetup = extractSetupToken(data);

      if (nextSetup) {
        await startMfaSetup(nextSetup);
        return;
      }
    }

    throw new Error(
      "The backend did not return an MFA challenge token.",
    );
  };

  const confirmMfaSetup = async () => {
    if (!setupToken || mfaCode.length !== 6) {
      alert("Enter the 6-digit authenticator code.");
      return;
    }

    try {
      setLoading(true);

      const response = await mfaConfirmRequest(
        setupToken,
        mfaCode,
      );

      const data = response.data;

      console.log("[FOCKIS AUTH] MFA setup confirmed.");

      const directToken = extractToken(data);

      if (directToken) {
        await establishSession(data);
        return;
      }

      await authenticateForMfaChallenge();
    } catch (err: unknown) {
      console.error("[FOCKIS AUTH] MFA SETUP ERROR:", err);

      const message =
        axios.isAxiosError(err) &&
        typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Unable to confirm MFA setup.";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyMfaLogin = async () => {
    if (!challengeToken || mfaCode.length !== 6) {
      alert("Enter the 6-digit authenticator code.");
      return;
    }

    try {
      setLoading(true);

      const response = await mfaVerifyRequest(
        challengeToken,
        mfaCode,
      );

      const data = response.data;
      const token = extractToken(data);

      if (!token) {
        throw new Error(
          "MFA was verified, but the backend did not return the final JWT token.",
        );
      }

      await establishSession(data, extractUser(data));
    } catch (err: unknown) {
      console.error("[FOCKIS AUTH] MFA LOGIN ERROR:", err);

      const message =
        axios.isAxiosError(err) &&
        typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Unable to verify MFA.";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (!email.trim() || !password) {
      alert(t("login.alerts.invalidCredentials"));
      return;
    }

    try {
      setLoading(true);

      const response = await loginRequest(email, password);
      const data = response.data;

      console.log(
        "[FOCKIS AUTH] LOGIN RESPONSE KEYS:",
        data && typeof data === "object"
          ? Object.keys(data)
          : [],
      );

      const token = extractToken(data);
      const user = extractUser(data);

      const setupRequired =
        data.mfaSetup === true ||
        data.mfaSetupRequired === true;

      if (setupRequired) {
        const nextSetupToken = extractSetupToken(data);

        if (!nextSetupToken) {
          throw new Error(
            "MFA setup is required, but the backend did not return a setup token.",
          );
        }

        await startMfaSetup(nextSetupToken);
        return;
      }

      if (data.requiresMfa === true) {
        const nextChallenge = extractChallengeToken(data);

        if (nextChallenge) {
          setChallengeToken(nextChallenge);
          setMfaCode("");
          setMfaMode("verify");
          return;
        }

        throw new Error(
          "MFA is required, but the backend did not return an MFA challenge token.",
        );
      }

      if (token) {
        await establishSession(data, user);
        return;
      }

      throw new Error("Backend did not return a JWT token.");
    } catch (err: unknown) {
      console.error("[FOCKIS AUTH] LOGIN ERROR:", err);

      if (axios.isAxiosError(err)) {
        console.error(
          "[FOCKIS AUTH] SERVER STATUS:",
          err.response?.status,
        );

        console.error(
          "[FOCKIS AUTH] SERVER RESPONSE KEYS:",
          err.response?.data &&
            typeof err.response.data === "object"
            ? Object.keys(err.response.data)
            : [],
        );
      }

      let message = t("login.alerts.invalidCredentials");

      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.message;

        if (Array.isArray(serverMessage)) {
          message = serverMessage.map(String).join(", ");
        } else if (
          typeof serverMessage === "string" &&
          serverMessage.trim()
        ) {
          message = serverMessage;
        } else if (err.response?.status === 401) {
          message = t("login.alerts.invalidCredentials");
        } else if (err.response?.status === 400) {
          message = t("login.alerts.checkCredentials");
        } else if (!err.response) {
          message = t("login.alerts.connectionError");
        }
      } else if (
        err instanceof Error &&
        err.message
      ) {
        message = err.message;
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaCodeChange = (value: string) => {
    setMfaCode(
      value.replace(/\D/g, "").slice(0, 6),
    );
  };

  const switchToMfaSetup = () => {
    setMfaMode("setup");
    setMfaCode("");
    setChallengeToken("");
  };

  return {
    email,
    password,
    showPassword,
    loading,
    mfaMode,
    mfaCode,
    qrCode,
    mfaSecret,
    setEmail,
    setPassword,
    setShowPassword,
    submit,
    handleMfaCodeChange,
    confirmMfaSetup,
    verifyMfaLogin,
    switchToMfaSetup,
  };
}