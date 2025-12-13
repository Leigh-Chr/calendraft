/**
 * Test setup file for jsdom environment
 * Ensures document and window are available for React Testing Library
 */

import { JSDOM } from "jsdom";

// Setup DOM before tests run
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
	url: "http://localhost",
	pretendToBeVisual: true,
});

global.document = dom.window.document;
// biome-ignore lint/suspicious/noExplicitAny: jsdom types don't match global types
global.window = dom.window as any;
global.navigator = dom.window.navigator;

// Mock window.matchMedia for media query hooks (useMediaQuery, useIsMobile, etc.)
// biome-ignore lint/suspicious/noExplicitAny: jsdom types don't match global types
(global.window as any).matchMedia = (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: () => {},
	removeListener: () => {},
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => true,
});
