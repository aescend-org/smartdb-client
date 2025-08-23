

/** make sure the url starts with http:// or https:// and ends without `/` */
export function validUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}
