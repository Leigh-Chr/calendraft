/**
 * GlobalFeatures - Raccourcis clavier globaux pour l'application
 *
 * Raccourcis disponibles:
 * - N : Nouveau calendrier
 * - I : Importer un fichier .ics
 * - H : Retour à l'accueil
 * - C : Liste des calendriers
 */

import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Check if an element is an input/textarea/contenteditable
 */
function isEditableElement(element: Element | null): boolean {
	if (!element) return false;
	const tagName = element.tagName.toLowerCase();
	if (tagName === "input" || tagName === "textarea") return true;
	if (element.getAttribute("contenteditable") === "true") return true;
	return false;
}

export function GlobalFeatures() {
	const navigate = useNavigate();

	// Global keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't trigger shortcuts when typing in inputs
			if (isEditableElement(document.activeElement)) return;

			// Don't trigger if modifier keys are pressed (except for Cmd+K)
			if (e.altKey) return;

			// Cmd+K or Ctrl+K could open command palette in the future
			// For now, just handle simple shortcuts
			if (e.metaKey || e.ctrlKey) return;

			switch (e.key.toLowerCase()) {
				case "n":
					e.preventDefault();
					navigate({ to: "/calendars/new" });
					break;
				case "i":
					e.preventDefault();
					navigate({ to: "/calendars/import" });
					break;
				case "h":
					e.preventDefault();
					navigate({ to: "/" });
					break;
				case "c":
					e.preventDefault();
					navigate({ to: "/calendars" });
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [navigate]);

	// This component only handles keyboard shortcuts, no UI
	return null;
}
