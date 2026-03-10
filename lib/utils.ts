import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Enhanced profanity filter for English and Tagalog
 * Replaces matched words and their variations with asterisks (*)
 */
export function filterProfanity(text: string): string {
  if (!text) return text;
  
  // Comprehensive list including variations and common extensions
  const badWords = [
    // English
    "fuck", "shit", "bitch", "asshole", "dick", "pussy", "faggot", "nigger", "nigga", "cunt", 
    "bastard", "slut", "whore", "dumbass", "cum", "sex", "porn", "rape",
    // Filipino / Tagalog
    "puta", "tangina", "putangina", "pucha", "gago", "tarantado", "ulol", "hayop", "bobo", 
    "kantot", "kupal", "bayag", "pekpek", "tite", "etits", "leche", "hindot", "burat",
    "puke", "puking", "shunga", "engot", "buwisit", "bwisit", "punyeta", "hudas"
  ];

  let filtered = text;
  
  // Sort by length descending to catch longer phrases first (e.g., "putangina" before "puta")
  const sortedWords = [...badWords].sort((a, b) => b.length - a.length);

  sortedWords.forEach(word => {
    // This regex looks for the word as a whole OR as a prefix with common extensions
    // It captures "fuck", "fucking", "fucker", etc.
    const regex = new RegExp(`\\b${word}[a-z]*\\b`, 'gi');
    filtered = filtered.replace(regex, (match) => '*'.repeat(match.length));
  });

  return filtered;
}
