
import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("Brainly API error handling", () => {
    it("returns 404 for an unknown route", async () => {
        const response = await request(app)
            .get("/this-route-does-not-exist");

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            message: "Route not found",
        });
    });

    it("returns 400 for malformed JSON", async () => {
        const response = await request(app)
            .post("/api/v1/signin")
            .set("Content-Type", "application/json")
            .send('{"username":');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: "Invalid JSON in request body",
        });
    });
});
