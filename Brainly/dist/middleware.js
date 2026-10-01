import jwt, {} from "jsonwebtoken";
import { JWT_PASSWORD } from "./config.js";
export const userMiddleware = (req, res, next) => {
    const header = req.headers["authorization"];
    if (!header) {
        return res.status(403).json({
            message: "No token"
        });
    }
    const decoded = jwt.verify(header, JWT_PASSWORD);
    if (typeof decoded === "string") {
        return res.status(403).json({
            message: "You are not logged in"
        });
    }
    req.userId = decoded.id;
    next();
};
//# sourceMappingURL=middleware.js.map