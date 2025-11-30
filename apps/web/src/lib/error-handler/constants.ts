/**
 * Error message constants
 */

import type { ErrorInfo } from "./types";

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
	UNAUTHORIZED: {
		title: "Authentification requise",
		description: "Vous devez être connecté pour effectuer cette action.",
	},
	FORBIDDEN: {
		title: "Accès refusé",
		description: "Vous n'avez pas les permissions nécessaires.",
	},
	NOT_FOUND: {
		title: "Ressource introuvable",
		description: "La ressource demandée n'existe pas ou a été supprimée.",
	},
	BAD_REQUEST: {
		title: "Requête invalide",
		description: "Les données fournies sont incorrectes.",
	},
	INTERNAL_SERVER_ERROR: {
		title: "Erreur serveur",
		description:
			"Une erreur est survenue côté serveur. Veuillez réessayer plus tard.",
	},
	TIMEOUT: {
		title: "Délai d'attente dépassé",
		description: "La requête a pris trop de temps. Vérifiez votre connexion.",
	},
	NETWORK_ERROR: {
		title: "Erreur réseau",
		description:
			"Impossible de contacter le serveur. Vérifiez votre connexion et que le serveur est démarré.",
	},
};

export const NETWORK_ERROR_PATTERNS = ["fetch", "network", "failed to fetch"];
