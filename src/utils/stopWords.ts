const stopWords = ["stop", "unsubscribe", "cancel", "list"];

export function isStopWord(text: string): boolean {
  return stopWords.some(word => text.toLowerCase().includes(word));
}