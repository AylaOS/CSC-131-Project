// Login and role checks for the API.

const store = require("./store");

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status; 
  }
}

function requireRole(...allowed) {
  return async (req, res, next) => {
    try {
      const header = req.get("authorization") || "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (!token) throw new AuthError(401, "Please log in.");

      const user = await store.getUserFromToken(token);
      if (!user) throw new AuthError(401, "Your session has expired. Please log in again.");

      const profile = await store.getProfile(user.id);
      if (!profile || !profile.active) {
        throw new AuthError(403, "Your account isn't active. Ask a supervisor to set it up.");
      }
      if (allowed.length && !allowed.includes(profile.role)) {
        throw new AuthError(403, "Your role doesn't have access to this.");
      }

      req.user = { id: user.id, email: user.email, name: profile.full_name, role: profile.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, AuthError };