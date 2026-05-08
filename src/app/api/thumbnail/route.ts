const allowedImageHosts = ["cdninstagram.com", "fbcdn.net"];

const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 16"><rect width="9" height="16" fill="#edf3f0"/><path d="M2 8.2 3.8 6l1.4 1.7L6.4 6 7.2 7.2v4H1.8v-2z" fill="#b8c9c5"/><circle cx="3" cy="4.5" r=".7" fill="#b8c9c5"/></svg>`;

const fallbackResponse = () =>
  new Response(fallbackSvg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });

const isAllowedImageUrl = (url: URL) =>
  url.protocol === "https:" && allowedImageHosts.some((host) => url.hostname.endsWith(host));

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing thumbnail URL", { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return new Response("Invalid thumbnail URL", { status: 400 });
  }

  if (!isAllowedImageUrl(imageUrl)) {
    return new Response("Unsupported thumbnail host", { status: 400 });
  }

  const imageResponse = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
    next: { revalidate: 60 * 60 * 6 },
  }).catch(() => null);

  if (!imageResponse?.ok || !imageResponse.body) return fallbackResponse();

  return new Response(imageResponse.body, {
    status: 200,
    headers: {
      "Content-Type": imageResponse.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=21600, s-maxage=21600",
    },
  });
}
