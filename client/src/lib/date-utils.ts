/**
 * Utility functions for consistent date formatting across the application.
 * Standard format: DD-MM-YYYY (e.g., 05-02-2026)
 */

import { format, parse, isValid } from 'date-fns';

/**
 * Formats a date to DD-MM-YYYY string for display.
 * @param date - Date object, ISO string (YYYY-MM-DD), or null/undefined
 * @returns Formatted date string or empty string if invalid
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
    if (!date) return '';

    let dateObj: Date;

    if (typeof date === 'string') {
        // Try parsing ISO format (YYYY-MM-DD) first
        dateObj = parse(date, 'yyyy-MM-dd', new Date());
        if (!isValid(dateObj)) {
            // Fallback to Date constructor for other formats
            dateObj = new Date(date);
        }
    } else {
        dateObj = date;
    }

    if (!isValid(dateObj)) return '';

    return format(dateObj, 'dd-MM-yyyy');
}

/**
 * Parses a DD-MM-YYYY string to a Date object.
 * @param dateStr - Date string in DD-MM-YYYY format
 * @returns Date object or null if invalid
 */
export function parseDisplayDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const parsed = parse(dateStr, 'dd-MM-yyyy', new Date());
    return isValid(parsed) ? parsed : null;
}

/**
 * Converts a DD-MM-YYYY string to ISO format (YYYY-MM-DD) for database storage.
 * @param displayDate - Date string in DD-MM-YYYY format
 * @returns ISO date string or original string if parsing fails
 */
export function displayDateToISO(displayDate: string): string {
    const parsed = parseDisplayDate(displayDate);
    if (!parsed) return displayDate; // Return original if can't parse
    return format(parsed, 'yyyy-MM-dd');
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to display format (DD-MM-YYYY).
 * @param isoDate - Date string in YYYY-MM-DD format
 * @returns Display date string
 */
export function isoToDisplayDate(isoDate: string): string {
    return formatDisplayDate(isoDate);
}
