
const TOKEN_KEY = "token";
const USER_KEY = "userId";

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setUserId = (id: string): void => {
  localStorage.setItem(USER_KEY, id);
};

export const getUserId = (): string | null => {
  return localStorage.getItem(USER_KEY);
};

export const isLoggedIn = (): boolean => {
  return Boolean(getToken());
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("user");
};
