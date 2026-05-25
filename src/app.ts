import { OpenAPIHono } from "@hono/zod-openapi";
import attachmentRoutes from "@/routes/attachmentRoutes";
import emailRoutes from "@/routes/emailRoutes";
import { setupDocumentation } from "@/utils/docs";
import { logError } from "@/utils/logger";
import corsMiddleware from "./middlewares/cors";
import healthRoutes from "./routes/healthRoutes";
import { ERR } from "./utils/http";

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>();
const NAME_PARTS = {
	first: [
		"alex",
		"ava",
		"ben",
		"chloe",
		"daniel",
		"ella",
		"ethan",
		"grace",
		"henry",
		"ivy",
		"jack",
		"leo",
		"liam",
		"lily",
		"lucas",
		"mia",
		"nora",
		"olivia",
		"owen",
		"zoe",
	],
	last: [
		"allen",
		"baker",
		"carter",
		"cooper",
		"davis",
		"evans",
		"foster",
		"gray",
		"hall",
		"james",
		"king",
		"lee",
		"miller",
		"parker",
		"reed",
		"scott",
		"taylor",
		"walker",
		"ward",
		"young",
	],
};

function randomItem<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmailLocalPart(): string {
	const first = randomItem(NAME_PARTS.first);
	const last = randomItem(NAME_PARTS.last);
	const number = randomNumber(10, 9999);
	return `${first}${last}${number}`;
}

// --- Middlewares ---
app.use(corsMiddleware);

// --- Error handling ---
app.onError((err, c) => {
	logError(`Unhandled error: ${err.message}`, err);
	return c.json(ERR(err.name, err.message), 500);
});

// --- Routes ---
// Generate readable email address
app.post("/api/emails/generate", async (c) => {
	const email = `${generateEmailLocalPart()}@admintest.shop`;
	return c.json({ success: true, email });
});
// Get config
app.get("/api/config", async (c) => {
  return c.json({
    success: true,
    domains: ["admintest.shop"]
  });
});
// Email Routes
app.route("/", emailRoutes);
// Attachment Routes
app.route("/", attachmentRoutes);
// Health Check
app.route("/", healthRoutes);

// --- OpenAPI Documentation ---
setupDocumentation(app);

export default app;
