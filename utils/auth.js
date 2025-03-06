import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "Please define the JWT_SECRET environment variable inside .env"
  );
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "24h",
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getTokenFromHeader(req) {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
}
