/**
 * Spotify API Client and PKCE Authentication Utilities
 */

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  description: string;
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  release_date: string;
  duration_ms: number;
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
  show: SpotifyShow;
}

/**
 * Generates a random code verifier for PKCE flow.
 */
export function generateCodeVerifier(length = 64): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join("");
}

/**
 * Generates a code challenge from a code verifier.
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  
  // Base64url encoding
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Redirects the user to Spotify Authorization Center.
 */
export async function redirectToSpotifyAuth() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("Missing Spotify environment variables.");
    return;
  }

  const verifier = generateCodeVerifier();
  localStorage.setItem("spotify_code_verifier", verifier);

  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: "user-read-private user-read-email",
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Handles authorization code callback and exchanges it for tokens.
 */
export async function handleAuthCallback(code: string): Promise<TokenResponse | null> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  const codeVerifier = localStorage.getItem("spotify_code_verifier");

  if (!clientId || !redirectUri || !codeVerifier) {
    console.error("Missing config or verifier during token exchange.");
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data: TokenResponse = await response.json();
    
    // Save tokens in session/local storage
    saveTokens(data);

    // Clean up code verifier
    localStorage.removeItem("spotify_code_verifier");

    return data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return null;
  }
}

/**
 * Refreshes the access token using the refresh token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const refreshToken = localStorage.getItem("spotify_refresh_token");

  if (!clientId || !refreshToken) {
    console.warn("Cannot refresh token: missing clientId or refreshToken.");
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem(
      "spotify_token_expires_at",
      (Date.now() + data.expires_in * 1000).toString()
    );
    if (data.refresh_token) {
      localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
}

function saveTokens(data: TokenResponse) {
  localStorage.setItem("spotify_access_token", data.access_token);
  localStorage.setItem("spotify_refresh_token", data.refresh_token);
  localStorage.setItem(
    "spotify_token_expires_at",
    (Date.now() + data.expires_in * 1000).toString()
  );
}

/**
 * Gets a valid access token, refreshing it if expired.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_token_expires_at");

  if (!token || !expiresAt) {
    return null;
  }

  // If token is within 5 minutes of expiring, refresh it
  if (Date.now() > parseInt(expiresAt) - 300 * 1000) {
    return await refreshAccessToken();
  }

  return token;
}

/**
 * Search Spotify for show episodes based on query.
 */
export async function searchSpotifyEpisodes(
  query: string,
  limit = 10,
  offset = 0
): Promise<SpotifyEpisode[]> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error("No authenticated session. Please login.");
  }

  // Spotify search API expects type=episode
  const params = new URLSearchParams({
    q: query,
    type: "episode",
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`${SPOTIFY_API_BASE}/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Attempt one-time retry after refreshing token
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryResponse = await fetch(`${SPOTIFY_API_BASE}/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        return data.episodes.items || [];
      } else {
        let errMsg = `Status ${retryResponse.status}`;
        try {
          const errData = await retryResponse.json();
          if (errData.error?.message) {
            errMsg += `: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(`Search retry failed: ${errMsg}`);
      }
    }
    throw new Error("Unauthorized. Please log in again.");
  }

  if (!response.ok) {
    let errMsg = `Status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error?.message) {
        errMsg += `: ${errData.error.message}`;
      }
    } catch (_) {}
    throw new Error(`Search request failed: ${errMsg}`);
  }

  const data = await response.json();
  return data.episodes.items || [];
}

/**
 * Log out user by removing local tokens.
 */
export function logoutSpotify() {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_expires_at");
}
