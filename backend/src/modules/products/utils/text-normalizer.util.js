"use strict";
/**
 * Utility for clean, deterministic text normalization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeText = normalizeText;
exports.tokenizeText = tokenizeText;
/**
 * Normalizes input text:
 * 1. Trims leading & trailing whitespace
 * 2. Normalizes Unicode characters (NFKD) and strips diacritics
 * 3. Converts to lowercase
 * 4. Strips special/irrelevant punctuation, replacing with spaces
 * 5. Collapses multiple spaces into single space
 */
function normalizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    return text
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
        .replace(/\s+/g, ' ') // collapse multiple spaces
        .trim();
}
/**
 * Tokenizes a string into an array of distinct normalized words.
 */
function tokenizeText(text) {
    var normalized = normalizeText(text);
    if (!normalized)
        return [];
    return normalized.split(' ').filter(function (token) { return token.length > 0; });
}
