/**
 * Event query building utilities
 */

/**
 * Build WHERE clause for event queries
 */
export function buildEventWhereClause(input: {
	calendarId: string;
	cursor?: string;
	filterDateFrom?: Date;
	filterDateTo?: Date;
	filterKeyword?: string;
}) {
	const where: {
		calendarId: string;
		id?: { gt: string };
		startDate?: { gte?: Date; lte?: Date };
		OR?: Array<{
			title?: { contains: string; mode: "insensitive" };
			description?: { contains: string; mode: "insensitive" };
			location?: { contains: string; mode: "insensitive" };
		}>;
	} = {
		calendarId: input.calendarId,
	};

	if (input.cursor) {
		where.id = { gt: input.cursor };
	}

	if (input.filterDateFrom || input.filterDateTo) {
		where.startDate = {};
		if (input.filterDateFrom) {
			where.startDate.gte = input.filterDateFrom;
		}
		if (input.filterDateTo) {
			where.startDate.lte = input.filterDateTo;
		}
	}

	const trimmedKeyword = input.filterKeyword?.trim();
	if (trimmedKeyword) {
		where.OR = [
			{ title: { contains: trimmedKeyword, mode: "insensitive" } },
			{ description: { contains: trimmedKeyword, mode: "insensitive" } },
			{ location: { contains: trimmedKeyword, mode: "insensitive" } },
		];
	}

	return { where, trimmedKeyword };
}

/**
 * Build orderBy clause for event list query
 */
export function buildEventOrderBy(
	sortBy: "date" | "name" | "duration",
	sortDirection: "asc" | "desc",
): { title?: "asc" | "desc"; startDate?: "asc" | "desc" } {
	switch (sortBy) {
		case "name":
			return { title: "asc" }; // Always A-Z, sortDirection is ignored
		case "duration":
			// For duration with keyword, we'll sort in memory after fetching
			return { startDate: "asc" }; // Temporary order, will be overridden
		default: // date
			// Use sortDirection for date sorting (asc = future first, desc = past first)
			return { startDate: sortDirection || "asc" };
	}
}
