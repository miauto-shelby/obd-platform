function redactSensitiveText(value) {
  return String(value || "")
    .replace(
      /(mongodb(?:\+srv)?:\/\/)([^@\s"']+)@/gi,
      "$1[redacted]@"
    )
    .replace(
      /\b(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/g,
      "[redacted-token]"
    )
    .replace(
      /\b(idToken|accessToken|refreshToken|jwtSecret|JWT_SECRET|MONGODB_URI)\s*[:=]\s*([^\s,;]+)/gi,
      "$1=[redacted]"
    )
    .replace(/([?&](?:password|pwd)=)[^&\s]+/gi, "$1[redacted]");
}

function safeErrorSummary(error) {
  const message = error?.message || error?.name || "Unknown error";
  return redactSensitiveText(message);
}

module.exports = { redactSensitiveText, safeErrorSummary };
