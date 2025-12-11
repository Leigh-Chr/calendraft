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
