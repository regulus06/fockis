export type MfaMode = "login" | "setup" | "verify";

export type LoginUser = {
  _id?: string;
  id?: string;
  role?: string;
  [key: string]: unknown;
};

export type AuthResponse = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  jwt?: string;
  user?: LoginUser;
  data?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    jwt?: string;
    user?: LoginUser;
    [key: string]: unknown;
  };
  result?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    jwt?: string;
    user?: LoginUser;
    [key: string]: unknown;
  };
  requiresMfa?: boolean;
  mfaSetup?: boolean;
  mfaSetupRequired?: boolean;
  mfaVerified?: boolean;
  setup_token?: string;
  setupToken?: string;
  challengeToken?: string;
  challenge_token?: string;
  qrCode?: string;
  qr_code?: string;
  qrCodeDataUrl?: string;
  qr_code_data_url?: string;
  otpAuthUrl?: string;
  otpauthUrl?: string;
  mfaSecret?: string;
  secret?: string;
  message?: string;
  [key: string]: unknown;
};
