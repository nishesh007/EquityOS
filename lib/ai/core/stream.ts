/**
 * Client-side streaming utilities with retry support.
 */

export interface StreamOptions {
  retries?: number;
  retryDelayMs?: number;
}

export async function readTextStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (!response.body) {
    throw new Error("Response stream is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      content += chunk;
      onChunk(chunk);
    }
  }

  return content;
}

export async function postStream(
  url: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  options: StreamOptions = {}
): Promise<string> {
  const retries = options.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      return await readTextStream(response, onChunk);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, (options.retryDelayMs ?? 600) * (attempt + 1))
        );
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Stream request failed");
}
