class AuthResponse {
  static fromToken(userId, accessToken) {
    return { userId, accessToken };
  }

  static fromSession(session) {
    return {
      userId: session.userId,
      sessionId: session.sessionId,
      refreshExpiresAt: session.refreshExpiresAt
    };
  }
}

module.exports = { AuthResponse };
