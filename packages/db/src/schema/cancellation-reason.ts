import { pgEnum } from "drizzle-orm/pg-core";

export const cancellationReasonEnum = pgEnum("cancellation_reason", [
	"customer_cancelled",
	"event_cancelled",
]);
