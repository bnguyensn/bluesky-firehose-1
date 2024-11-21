export function wordToColor(word) {
  let sum = 0;
  for (let i = 0; i < word.length; i++) {
    sum += word.charCodeAt(i);
  }
  const r = sum % 256;
  const g = Math.floor(sum / 256) % 256;
  const b = Math.floor(sum / (256 * 256)) % 256;
  return `rgb(${r}, ${g}, ${b})`; // Return as an RGB string
}
