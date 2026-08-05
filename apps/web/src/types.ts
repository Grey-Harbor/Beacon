export interface Session {
  authenticated: boolean;
  user: { username: string } | null;
}
