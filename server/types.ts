export interface AuthUser {
  id: string;
  email: string;
  role: 'client' | 'coach' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
